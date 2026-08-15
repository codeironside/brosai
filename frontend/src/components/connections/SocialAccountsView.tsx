import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Share2, CheckCircle2, Lock, ExternalLink, Trash2, ShieldCheck, UserCheck, X } from 'lucide-react';
import { PlatformId } from '../../types';

export interface SocialPlatformItem {
  platform: PlatformId;
  name: string;
  connected: boolean;
  handle?: string;
  avatarUrl?: string;
  lastSync?: string;
  accountId?: string;
  tokenStatus?: 'active' | 'expired' | 'missing';
}

const HIDDEN_PLATFORMS: PlatformId[] = ['instagram', 'youtube', 'tiktok'];

const INITIAL_PLATFORMS: SocialPlatformItem[] = [
  { platform: 'linkedin', name: 'LinkedIn Organization Page', connected: false },
  { platform: 'twitter', name: 'X (Twitter)', connected: false },
  { platform: 'facebook', name: 'Facebook Page', connected: false },
  { platform: 'threads', name: 'Threads', connected: false },
];

const OAUTH_MESSAGE_TYPE = 'brosai-social-oauth';

function isAllowedOAuthOrigin(origin: string): boolean {
  if (origin === window.location.origin) return true;
  if (origin.endsWith('.trycloudflare.com')) return true;
  const allowed = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5173',
    'https://evidence-documented-syndication-maryland.trycloudflare.com',
    'https://poker-featured-very-tons.trycloudflare.com',
  ]);
  return allowed.has(origin);
}

export const SocialAccountsView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [platforms, setPlatforms] = useState<SocialPlatformItem[]>(INITIAL_PLATFORMS);
  const [loading, setLoading] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [oauthModal, setOauthModal] = useState<{ platform: PlatformId; name: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const oauthPopupRef = React.useRef<Window | null>(null);

  const applyAccounts = useCallback((accounts: SocialPlatformItem[]) => {
    const visible = accounts.filter((item) => !HIDDEN_PLATFORMS.includes(item.platform));
    setPlatforms((prev) => prev.map((p) => {
      const found = visible.find((item) => item.platform === p.platform);
      return found ? {
        ...p,
        connected: Boolean(found.connected),
        handle: found.handle,
        lastSync: found.lastSync,
        accountId: found.accountId,
        avatarUrl: found.avatarUrl,
        tokenStatus: found.tokenStatus,
      } : p;
    }));
  }, []);

  const fetchSocialAccounts = useCallback(async () => {
    const res = await authenticatedFetch('/api/auth/social-accounts');
    if (!res.ok) return;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;

    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      applyAccounts(json.data);
    }
  }, [authenticatedFetch, applyAccounts]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await fetchSocialAccounts();
        const params = new URLSearchParams(window.location.search);
        const oauth = params.get('oauth');
        if (oauth === 'success') {
          setStatusMessage(`${params.get('platform') || 'Account'} connected`);
        } else if (oauth === 'error') {
          console.warn('OAuth did not complete');
        }
        if (oauth) {
          params.delete('oauth');
          params.delete('platform');
          params.delete('oauth_error');
          const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
          window.history.replaceState({}, '', next);
        }
      } catch (err) {
        console.warn('Failed to load social accounts from backend:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchSocialAccounts]);

  const closeOAuthModal = () => {
    try {
      oauthPopupRef.current?.close();
    } catch {
      /* ignore */
    }
    oauthPopupRef.current = null;
    setOauthModal(null);
    setConnectingPlatform(null);
  };

  const startOAuth = async (platform: PlatformId, isReconnect = false) => {
    const name = platforms.find((item) => item.platform === platform)?.name || platform;
    setStatusMessage(null);
    setConnectingPlatform(platform);
    setOauthModal({ platform, name });

    const popup = window.open('', 'brosai-oauth', 'popup=yes,width=620,height=780,noopener=no');
    oauthPopupRef.current = popup;
    if (popup) {
      popup.document.write(
        '<p style="font-family:system-ui,sans-serif;padding:24px;background:#0b0b0b;color:#fff;margin:0;min-height:100vh">Opening sign-in…</p>'
      );
    }

    try {
      const urlRes = await authenticatedFetch(`/api/auth/social-accounts/oauth-url?platform=${platform}`);
      const urlJson = await urlRes.json().catch(() => ({}));

      if (!urlRes.ok || !urlJson.success || !urlJson.oauthUrl) {
        popup?.close();
        throw new Error(urlJson.error || `Could not start ${platform} OAuth`);
      }

      if (!popup || popup.closed) {
        throw new Error('The sign-in popup was blocked. Allow popups for this site and try again.');
      }

      popup.location.href = urlJson.oauthUrl;
      setStatusMessage(isReconnect
        ? `Finish signing in to ${name} in the popup.`
        : `Authorize ${name} in the popup to finish linking.`);

      await waitForOAuthResult(popup, platform);
      await fetchSocialAccounts();
      setOauthModal(null);
    } catch (e: any) {
      popup?.close();
      console.warn('OAuth authorization failed', e);
      setOauthModal(null);
    } finally {
      oauthPopupRef.current = null;
      setConnectingPlatform(null);
    }
  };

  const waitForOAuthResult = (popup: Window, platform: PlatformId) => new Promise<void>((resolve, reject) => {
    const timeoutMs = 5 * 60 * 1000;
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
    };

    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) {
        console.warn('OAuth did not complete', error);
        reject(new Error(error));
        return;
      }
      setStatusMessage(`${platform} connected`);
      resolve();
    };

    const onMessage = (event: MessageEvent) => {
      if (!isAllowedOAuthOrigin(event.origin)) return;
      const data = event.data;
      if (!data || data.type !== OAUTH_MESSAGE_TYPE) return;
      if (data.platform && data.platform !== platform) return;

      if (data.success) {
        finish();
      } else {
        finish(data.error || 'Authorization was denied');
      }
    };

    const pollId = window.setInterval(async () => {
      let closed = false;
      try {
        closed = popup.closed;
      } catch {
        closed = false;
      }
      if (!closed || settled) return;

      try {
        const res = await authenticatedFetch('/api/auth/social-accounts');
        const json = await res.json();
        const found = Array.isArray(json.data)
          ? json.data.find((item: SocialPlatformItem) => item.platform === platform && item.connected)
          : null;
        if (found) {
          applyAccounts(json.data);
          finish();
        } else {
          finish('The authorization window was closed before linking completed.');
        }
      } catch {
        finish('The authorization window was closed before linking completed.');
      }
    }, 1500);

    const timeoutId = window.setTimeout(() => {
      if (!popup.closed) popup.close();
      finish('Authorization timed out. Please try again.');
    }, timeoutMs);

    window.addEventListener('message', onMessage);
  });

  const disconnectAccount = async (platform: PlatformId) => {
    try {
      const res = await authenticatedFetch(`/api/auth/social-accounts/${platform}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to disconnect ${platform}`);
      }
      if (Array.isArray(json.data)) {
        applyAccounts(json.data);
      } else {
        await fetchSocialAccounts();
      }
      setStatusMessage(`${platform} disconnected`);
    } catch (err: any) {
      console.warn('Disconnect failed', err);
    }
  };

  const connectedCount = platforms.filter(p => p.connected).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>Official OAuth 2.0 Integration Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow flex items-center gap-3">
            <span>Social Accounts & API Matrix</span>
            <span className="text-xs px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white font-mono font-normal">
              {connectedCount} / {platforms.length} Authorized
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-0.5 sm:mt-1 max-w-2xl">
            Connect OAuth opens the official platform login. The account is marked connected only after tokens are stored.
          </p>
          {statusMessage && (
            <p className="text-xs text-white mt-2">{statusMessage}</p>
          )}
          {loading && (
            <p className="text-xs text-white/50 mt-2">Loading linked accounts…</p>
          )}
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-black/40 border border-white/20 text-xs font-medium text-white backdrop-blur-md self-start md:self-auto">
          <Lock className="w-3.5 h-3.5 text-white" />
          <span>Encrypted OAuth Token Vault</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

        {platforms.map(p => (
          <div key={p.platform} className={`p-4 sm:p-5 rounded-2xl backdrop-blur-xl border transition-all shadow-2xl space-y-4 ${
            p.connected ? 'bg-white/15 border-white/30 shadow-white/5' : 'bg-white/10 border-white/20'
          }`}>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center font-bold text-white uppercase text-xs shadow-md shrink-0 overflow-hidden">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    p.platform.slice(0, 2)
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <span>{p.name}</span>
                    {p.connected && <ShieldCheck className="w-4 h-4 text-white" />}
                  </h3>
                  <div className="text-xs text-white/70 font-mono">
                    {p.connected ? (p.handle || 'Authorized Page') : 'Not Connected'}
                  </div>
                </div>
              </div>

              {p.connected ? (
                <button
                  onClick={() => disconnectAccount(p.platform)}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-black/40 text-white border border-white/30 text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md transition-all shadow"
                  title="Click to Disconnect"
                >
                  <UserCheck className="w-3.5 h-3.5 text-white" />
                  <span>Authorized</span>
                </button>
              ) : (
                <button
                  onClick={() => startOAuth(p.platform)}
                  disabled={connectingPlatform === p.platform}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xl disabled:opacity-60"
                >
                  <span>{connectingPlatform === p.platform ? 'Opening…' : 'Connect OAuth'}</span>
                  <ExternalLink className="w-3 h-3 text-black" />
                </button>
              )}
            </div>

            {p.connected ? (
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/20 space-y-2.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-semibold text-white border-b border-white/15 pb-2">
                  <span className="flex items-center gap-1.5 text-white">
                    <UserCheck className="w-3.5 h-3.5 text-white" />
                    Authorized Page Details
                  </span>
                  <span className="text-[10px] font-mono text-white/70">
                    {p.accountId || 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-white/90 font-mono">
                  <div>
                    <span className="text-white/60 block text-[10px]">Handle / Page:</span>
                    <span className="font-semibold text-white">{p.handle || '@authorized_page'}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[10px]">OAuth Token:</span>
                    <span className="text-white font-semibold">
                      {p.tokenStatus === 'active' ? 'Active • Encrypted' : p.tokenStatus === 'expired' ? 'Expired' : 'Missing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[10px]">Last Sync:</span>
                    <span className="text-white">{p.lastSync ? new Date(p.lastSync).toLocaleString() : 'Just now'}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[10px]">Publishing Permission:</span>
                    <span className="text-white">{p.tokenStatus === 'active' ? 'Granted' : 'Reconnect required'}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => startOAuth(p.platform, true)}
                    disabled={connectingPlatform === p.platform}
                    className="text-[11px] text-white/80 hover:text-white font-medium flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3 text-white" />
                    <span>Re-authorize OAuth</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => disconnectAccount(p.platform)}
                    className="text-[11px] text-white/70 hover:text-white font-medium flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-black/30 border border-white/15 space-y-2 backdrop-blur-md">
                <div className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">API Capability Matrix</div>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-white/90">
                  <div className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-white" /><span>Publish Posts</span></div>
                  <div className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-white" /><span>Read Comments</span></div>
                  <div className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-white" /><span>Reply Comments</span></div>
                  <div className="flex items-center space-x-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-white" /><span>Analytics</span></div>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

      {oauthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Connect {oauthModal.name}</h2>
                <p className="text-xs text-white/70 mt-1">
                  Sign in in the popup window. This page stays here until you finish or cancel.
                </p>
              </div>
              <button
                type="button"
                onClick={closeOAuthModal}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/80">
              {statusMessage || 'Waiting for authorization…'}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeOAuthModal}
                className="px-3.5 py-1.5 rounded-xl bg-white/15 border border-white/25 text-xs text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
