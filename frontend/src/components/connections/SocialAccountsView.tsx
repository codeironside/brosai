import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Share2, CheckCircle2, Lock, Trash2, ShieldCheck, X, Plus } from 'lucide-react';
import { PlatformId } from '../../types';

export interface SocialPlatformItem {
  id?: string;
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
const OAUTH_MESSAGE_TYPE = 'brosai-social-oauth';

const NETWORKS: { platform: PlatformId; name: string }[] = [
  { platform: 'linkedin', name: 'LinkedIn' },
  { platform: 'twitter', name: 'X (Twitter)' },
  { platform: 'facebook', name: 'Facebook Page' },
  { platform: 'threads', name: 'Threads' },
];

function displayAvatar(url?: string, platform?: PlatformId) {
  if (!url) return '';
  let src = url;
  if (platform === 'twitter') {
    src = url.replace('_normal.', '_400x400.').replace('_bigger.', '_400x400.');
  }
  return `/api/social/avatar?url=${encodeURIComponent(src)}`;
}

function isAllowedOAuthOrigin(origin: string): boolean {
  if (origin === window.location.origin) return true;
  if (origin.endsWith('.trycloudflare.com')) return true;
  const allowed = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5173',
    'https://vamvamvamai.com',
    'https://www.vamvamvamai.com',
    'https://api.vamvamvamai.com',
  ]);
  return allowed.has(origin);
}

export const SocialAccountsView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [accounts, setAccounts] = useState<SocialPlatformItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [oauthModal, setOauthModal] = useState<{ platform: PlatformId; name: string } | null>(null);
  const [pagePicker, setPagePicker] = useState<{
    pages: Array<{ id: string; name: string; avatarUrl?: string }>;
    state?: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const oauthPopupRef = React.useRef<Window | null>(null);

  const connectedAccounts = useMemo(
    () => accounts.filter((a) => a.connected && !HIDDEN_PLATFORMS.includes(a.platform)),
    [accounts],
  );

  const fetchSocialAccounts = useCallback(async () => {
    const res = await authenticatedFetch('/api/auth/social-accounts');
    if (!res.ok) return;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      setAccounts(
        json.data
          .filter((item: SocialPlatformItem) => !HIDDEN_PLATFORMS.includes(item.platform))
          .map((item: SocialPlatformItem) => ({
            ...item,
            id: item.id || `${item.platform}:${item.accountId || item.handle || 'unknown'}`,
          })),
      );
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await fetchSocialAccounts();
        const params = new URLSearchParams(window.location.search);
        const oauth = params.get('oauth');
        if (oauth === 'success') {
          setStatusMessage(`${params.get('platform') || 'Account'} connected`);
        }
        if (oauth) {
          params.delete('oauth');
          params.delete('platform');
          params.delete('oauth_error');
          const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
          window.history.replaceState({}, '', next);
        }
      } catch (err) {
        console.warn('Failed to load social accounts', err);
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

  const startOAuth = async (platform: PlatformId) => {
    const name = NETWORKS.find((n) => n.platform === platform)?.name || platform;
    setStatusMessage(null);
    setConnectingPlatform(platform);
    setOauthModal({ platform, name });

    const popup = window.open('', 'brosai-oauth', 'popup=yes,width=620,height=780,noopener=no');
    oauthPopupRef.current = popup;
    if (popup) {
      popup.document.write(
        '<p style="font-family:system-ui,sans-serif;padding:24px;background:#0b0b0b;color:#fff;margin:0;min-height:100vh">Opening sign-in…</p>',
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
      setStatusMessage(`Authorize ${name} in the popup to finish linking.`);
      await waitForOAuthResult(popup, platform);
      await fetchSocialAccounts();
      setOauthModal(null);
    } catch (e) {
      popup?.close();
      setOauthModal(null);
    } finally {
      oauthPopupRef.current = null;
      setConnectingPlatform(null);
    }
  };

  const waitForOAuthResult = (popup: Window, platform: PlatformId) =>
    new Promise<void>((resolve, reject) => {
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
        if (data.needsPageSelection && Array.isArray(data.pages)) {
          setPagePicker({ pages: data.pages, state: data.state });
          finish();
          return;
        }
        if (data.platform && data.platform !== platform) return;
        if (data.ok) finish();
        else finish(data.error || 'OAuth failed');
      };
      window.addEventListener('message', onMessage);
      const pollId = window.setInterval(() => {
        if (popup.closed) finish('Popup closed before linking finished');
      }, 800);
      const timeoutId = window.setTimeout(() => finish('Timed out waiting for OAuth'), timeoutMs);
    });

  const disconnectAccount = async (account: SocialPlatformItem) => {
    const key = account.id || account.accountId || account.platform;
    try {
      const res = await authenticatedFetch(`/api/auth/social-accounts/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to disconnect');
      if (Array.isArray(json.data)) {
        setAccounts(
          json.data
            .filter((item: SocialPlatformItem) => !HIDDEN_PLATFORMS.includes(item.platform))
            .map((item: SocialPlatformItem) => ({
              ...item,
              id: item.id || `${item.platform}:${item.accountId || item.handle || 'unknown'}`,
            })),
        );
      } else {
        await fetchSocialAccounts();
      }
      setStatusMessage('Account disconnected');
    } catch (e: any) {
      setStatusMessage(e?.message || 'Disconnect failed');
    }
  };

  const selectPage = async (pageId: string) => {
    if (!pagePicker) return;
    try {
      const res = await authenticatedFetch('/api/auth/social-accounts/select-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, state: pagePicker.state }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not link page');
      await fetchSocialAccounts();
      const remaining = pagePicker.pages.filter((p) => p.id !== pageId);
      if (remaining.length) {
        setPagePicker({ ...pagePicker, pages: remaining });
        setStatusMessage('Page linked. You can add another Facebook Page.');
      } else {
        setPagePicker(null);
        setStatusMessage('Facebook Page linked');
      }
    } catch (e: any) {
      setStatusMessage(e?.message || 'Page selection failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6" /> Connections
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Link multiple accounts per network. Agents pick which ones to post to.
          </p>
        </div>
        <div className="text-xs text-white/50">
          {connectedAccounts.length} linked
          {loading ? ' · Loading…' : ''}
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 flex items-center justify-between gap-3">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {NETWORKS.map((net) => (
          <button
            key={net.platform}
            type="button"
            disabled={connectingPlatform === net.platform}
            onClick={() => startOAuth(net.platform)}
            className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-3 text-left transition-colors disabled:opacity-60"
          >
            <div className="flex items-center gap-2 text-white text-sm font-semibold">
              <Plus className="w-4 h-4" />
              Add {net.name}
            </div>
            <div className="text-[11px] text-white/50 mt-1">
              {connectingPlatform === net.platform ? 'Opening…' : 'Connect another account'}
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {connectedAccounts.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/50 text-sm">
            No accounts linked yet. Use Add above to connect LinkedIn, X, Facebook, or Threads.
          </div>
        ) : null}

        {connectedAccounts.map((account) => (
          <div
            key={account.id || `${account.platform}-${account.accountId}`}
            className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {account.avatarUrl ? (
                <img
                  src={displayAvatar(account.avatarUrl, account.platform)}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover bg-black/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white font-bold uppercase">
                  {(account.handle || account.platform || '?').slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold truncate">{account.handle || account.name}</span>
                  {account.tokenStatus === 'active' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {NETWORKS.find((n) => n.platform === account.platform)?.name || account.platform}
                  {account.accountId ? ` · ${account.accountId}` : ''}
                  {account.lastSync ? ` · synced ${new Date(account.lastSync).toLocaleString()}` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-2 py-1">
                <ShieldCheck className="w-3 h-3" /> Linked
              </span>
              <button
                type="button"
                onClick={() => disconnectAccount(account)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                <Trash2 className="w-3.5 h-3.5" /> Disconnect
              </button>
            </div>
          </div>
        ))}
      </div>

      {oauthModal ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121214] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Connecting {oauthModal.name}</h3>
              <button type="button" onClick={closeOAuthModal} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-white/60">Complete sign-in in the popup window, then this page will refresh.</p>
          </div>
        </div>
      ) : null}

      {pagePicker ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#121214] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Choose Facebook Pages</h3>
              <button type="button" onClick={() => setPagePicker(null)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-white/60">Select each page you want to link. You can add more than one.</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pagePicker.pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectPage(page.id)}
                  className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-3 text-left"
                >
                  {page.avatarUrl ? (
                    <img src={displayAvatar(page.avatarUrl, 'facebook')} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                  )}
                  <span className="text-white text-sm font-medium">{page.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
