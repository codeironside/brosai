import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { API_URL } from '../config';
import { apiFetch, saveSession, type ApiUser } from './client';

WebBrowser.maybeCompleteAuthSession();

type ExchangeRes = {
  success: boolean;
  data: {
    user: ApiUser;
    accessToken: string;
    refreshToken: string;
  };
};

function ticketFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      ticket: parsed.searchParams.get('ticket') || '',
      error: parsed.searchParams.get('error') || '',
    };
  } catch {
    const ticket = /[?&]ticket=([^&]+)/.exec(url)?.[1];
    const error = /[?&]error=([^&]+)/.exec(url)?.[1];
    return {
      ticket: ticket ? decodeURIComponent(ticket) : '',
      error: error ? decodeURIComponent(error) : '',
    };
  }
}

async function exchangeTicket(ticket: string) {
  const json = await apiFetch<ExchangeRes>(
    '/api/auth/google/mobile/exchange',
    {
      method: 'POST',
      body: JSON.stringify({ ticket }),
    },
    { auth: false },
  );
  if (!json?.data?.user || !json.data.accessToken) {
    throw new Error('Could not complete Google sign-in');
  }
  await saveSession(json.data.user, {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
  });
  return json.data.user;
}

function dismissAuthUi() {
  try {
    WebBrowser.dismissBrowser();
  } catch {
    /* ignore */
  }
}

/**
 * Backend HTTPS Google login. Closes the browser as soon as the ticket is ready
 * (poll / deep link / auth-session) so users never sit on an intermediate page.
 */
export async function signInWithGoogle() {
  const deepLinkBase = Linking.createURL('auth');
  const clientSession = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`,
  );

  const startUrl =
    `${API_URL}/api/auth/google/mobile/start` +
    `?app_redirect=${encodeURIComponent(deepLinkBase)}` +
    `&client_session=${encodeURIComponent(clientSession)}`;

  const stop = { stopped: false };
  let settled = false;
  let rejectAuth: ((err: Error) => void) | null = null;

  const ticket = await new Promise<string>((resolve, reject) => {
    rejectAuth = reject;

    const finish = (value: string) => {
      if (settled || !value) return;
      settled = true;
      stop.stopped = true;
      dismissAuthUi();
      resolve(value);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      stop.stopped = true;
      dismissAuthUi();
      reject(new Error(message));
    };

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      const parsed = ticketFromUrl(url);
      if (parsed.error) fail(decodeURIComponent(parsed.error));
      else if (parsed.ticket) finish(parsed.ticket);
    });

    const poll = (async () => {
      for (let i = 0; i < 100 && !stop.stopped; i++) {
        try {
          const res = await fetch(
            `${API_URL}/api/auth/google/mobile/poll?client_session=${encodeURIComponent(clientSession)}`,
          );
          if (res.status === 200) {
            const json = await res.json();
            const found = String(json?.data?.ticket || '');
            if (found) {
              finish(found);
              return;
            }
          }
        } catch {
          /* keep polling */
        }
        await new Promise((r) => setTimeout(r, 700));
      }
    })();

    WebBrowser.openAuthSessionAsync(startUrl, deepLinkBase)
      .then((result) => {
        if (result.type === 'success' && result.url) {
          const parsed = ticketFromUrl(result.url);
          if (parsed.error) fail(decodeURIComponent(parsed.error));
          else if (parsed.ticket) finish(parsed.ticket);
        }
        // cancel/dismiss: keep polling — auth may already be done server-side
      })
      .catch(() => {
        /* poll may still succeed */
      })
      .finally(() => {
        void poll;
      });

    setTimeout(() => {
      linkSub.remove();
      if (!settled) fail('Google sign-in timed out. Try again.');
    }, 90_000);

    const clearLink = setInterval(() => {
      if (settled || stop.stopped) {
        clearInterval(clearLink);
        linkSub.remove();
      }
    }, 500);
  }).catch((err) => {
    if (rejectAuth) {
      /* already rejected */
    }
    throw err;
  });

  return exchangeTicket(ticket);
}
