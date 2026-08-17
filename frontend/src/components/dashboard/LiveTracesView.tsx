import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRunTime } from '../../utils/time';

interface TraceItem {
  at?: string;
  label: string;
}

interface PostTrace {
  id: string;
  runId: string;
  agentName: string;
  status: string;
  started: string;
  createdAt?: string;
  draft?: string;
  platforms?: string[];
  traces?: TraceItem[];
  analytics?: { impressions?: number; likes?: number; comments?: number; shares?: number };
  analyticsByPlatform?: Record<string, { impressions?: number; likes?: number; comments?: number; shares?: number }>;
}

interface SocialAccount {
  platform: string;
  name: string;
  connected?: boolean;
  handle?: string;
}

const PAGE_SIZE = 4;
const ACCOUNT_ORDER = ['linkedin', 'twitter', 'facebook', 'threads'];
const HIDDEN = new Set(['instagram', 'youtube', 'tiktok']);
const LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  facebook: 'Facebook Page',
  threads: 'Threads'
};
const ALIASES: Record<string, string[]> = {
  twitter: ['twitter', 'x'],
  facebook: ['facebook'],
  linkedin: ['linkedin'],
  threads: ['threads']
};

function tracesForAccount(traces: TraceItem[], platform: string): TraceItem[] {
  const mine = (ALIASES[platform] || [platform]).map((item) => item.toLowerCase());
  const others = Object.entries(ALIASES)
    .filter(([key]) => key !== platform)
    .flatMap(([, names]) => names);

  return traces.filter((item) => {
    const line = String(item.label || '').toLowerCase();
    const hitsMine = mine.some((name) => line.includes(name));
    const hitsOther = others.some((name) => line.includes(name));
    if (hitsMine) return true;
    if (hitsOther) return false;
    return true;
  });
}

function glance(status: string, analytics: PostTrace['analytics']) {
  if (status === 'failed') return { label: 'Needs attention', className: 'bg-white/10 text-white' };
  if (status === 'awaiting') return { label: 'Draft waiting', className: 'bg-white/10 text-white/80' };
  if (status === 'publishing') return { label: 'Going live', className: 'bg-white text-black' };
  const likes = analytics?.likes || 0;
  const impressions = analytics?.impressions || 0;
  if (likes > 0) return { label: 'Getting engagement', className: 'bg-white text-black' };
  if (impressions > 0) return { label: 'Reaching people', className: 'bg-white/20 text-white' };
  return { label: 'Posted · waiting on reach', className: 'bg-white/10 text-white/80' };
}

function shortTrace(label: string) {
  const line = label.toLowerCase();
  if (line.includes('draft')) return 'Drafted';
  if (line.includes('publishing started') || line.includes('going live')) return 'Publishing';
  if (line.includes('paused')) return 'Paused';
  if (line.includes('stopped')) return 'Stopped';
  if (line.includes('restart')) return 'Restarted';
  if (line.includes('finished') || line.includes('posted') || line.includes('cron finished')) return 'Live';
  return label.replace(/^[^:]+:\s*/, '').slice(0, 48);
}

export const LiveTracesView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostTrace[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [activePlatform, setActivePlatform] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const res = await authenticatedFetch('/api/auth/dashboard-stats');
    const json = await res.json();
    if (!json.success || !json.data) return;
    const runs = Array.isArray(json.data.runs) ? json.data.runs : [];
    setPosts(runs.filter((item: PostTrace) => item.draft));
    setAccounts(Array.isArray(json.data.socialAccounts) ? json.data.socialAccounts : []);
  }, [authenticatedFetch]);

  const refreshReach = useCallback(async () => {
    try {
      await authenticatedFetch('/api/auth/post-analytics/refresh', { method: 'POST' });
    } catch {
      /* keep last cached numbers */
    }
    await load();
  }, [authenticatedFetch, load]);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        setLoading(true);
        await refreshReach();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    boot();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshReach().catch(() => undefined);
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshReach().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshReach]);

  const grouped = useMemo(() => {
    const fromAccounts = accounts.filter((item) => !HIDDEN.has(item.platform)).map((item) => item.platform);
    const fromPosts = posts.flatMap((item) => item.platforms || []);
    const platforms = [...new Set([...ACCOUNT_ORDER, ...fromAccounts, ...fromPosts])].filter((platform) => !HIDDEN.has(platform));

    return platforms.map((platform) => {
      const account = accounts.find((item) => item.platform === platform);
      const items = posts.filter((post) => (post.platforms || []).includes(platform));
      const totals = items.reduce((sum, post) => {
        const slice = post.analyticsByPlatform?.[platform] || (post.platforms?.length === 1 ? post.analytics : undefined);
        return {
          impressions: sum.impressions + Number(slice?.impressions || 0),
          likes: sum.likes + Number(slice?.likes || 0),
          comments: sum.comments + Number(slice?.comments || 0),
          shares: sum.shares + Number(slice?.shares || 0)
        };
      }, { impressions: 0, likes: 0, comments: 0, shares: 0 });
      return {
        platform,
        label: account?.name || LABELS[platform] || platform,
        handle: account?.handle || '',
        connected: Boolean(account?.connected),
        totals,
        items
      };
    }).filter((group) => group.connected || group.items.length);
  }, [accounts, posts]);

  useEffect(() => {
    if (!activePlatform && grouped[0]) setActivePlatform(grouped[0].platform);
    if (activePlatform && grouped.length && !grouped.some((item) => item.platform === activePlatform)) {
      setActivePlatform(grouped[0].platform);
      setPage(1);
    }
  }, [grouped, activePlatform]);

  const active = grouped.find((item) => item.platform === activePlatform) || grouped[0];
  const totalPages = Math.max(1, Math.ceil((active?.items.length || 0) / PAGE_SIZE));
  const pageItems = (active?.items || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectAccount = (platform: string) => {
    setActivePlatform(platform);
    setPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
          <Activity className="w-4 h-4 text-white" />
          <span>By account</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow">Live Traces</h1>
        <p className="text-xs sm:text-sm text-white/70 mt-1">
          Glance the status chip, then the numbers, then the timeline.
        </p>
      </div>

      {grouped.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {grouped.map((group) => {
            const selected = group.platform === active?.platform;
            return (
              <button
                key={group.platform}
                type="button"
                onClick={() => selectAccount(group.platform)}
                className={`px-3.5 py-2 rounded-xl border text-left text-xs transition-all ${
                  selected ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                }`}
              >
                <div className="font-semibold">{group.label}</div>
                <div className={selected ? 'text-black/60' : 'text-white/50'}>
                  {group.items.length} posts · {group.totals.impressions} imp
                </div>
              </button>
            );
          })}
        </div>
      )}

      {loading && !grouped.length ? (
        <div className="p-8 rounded-2xl bg-white/10 border border-white/20 text-center text-xs text-white/55">Loading…</div>
      ) : active ? (
        <section className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">{active.label}</h2>
              <p className="text-[11px] text-white/50 mt-0.5">
                {active.handle ? `@${String(active.handle).replace(/^@/, '')}` : active.platform}
                {active.connected ? ' · connected' : ''}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['Imp', active.totals.impressions],
                ['Likes', active.totals.likes],
                ['Comments', active.totals.comments],
                ['Shares', active.totals.shares],
              ].map(([label, value]) => (
                <div key={String(label)} className="min-w-[56px]">
                  <div className="text-sm font-semibold text-white">{Number(value).toLocaleString()}</div>
                  <div className="text-[10px] text-white/45">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {pageItems.length ? pageItems.map((post) => {
            const analytics = post.analyticsByPlatform?.[active.platform]
              || (post.platforms?.length === 1 ? post.analytics : {})
              || {};
            const traces = tracesForAccount(post.traces || [], active.platform);
            const pulse = glance(post.status, analytics);
            return (
              <article key={`${active.platform}-${post.id}`} className="rounded-xl bg-black/30 border border-white/15 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${pulse.className}`}>{pulse.label}</span>
                  <span className="text-[11px] text-white/50">{formatRunTime(post.createdAt, post.started)}</span>
                </div>
                <p className="text-sm text-white/90 whitespace-pre-wrap line-clamp-3">{post.draft}</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Impressions', analytics.impressions || 0],
                    ['Likes', analytics.likes || 0],
                    ['Comments', analytics.comments || 0],
                    ['Shares', analytics.shares || 0],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg bg-white/5 border border-white/10 py-2">
                      <div className="text-sm text-white font-semibold">{value}</div>
                      <div className="text-[10px] text-white/45">{label}</div>
                    </div>
                  ))}
                </div>
                <ol className="flex flex-wrap gap-2">
                  {(traces.length ? traces : [{ label: 'Waiting' }]).map((item, index) => (
                    <li key={`${item.label}-${index}`} className="flex items-center gap-2 text-[11px] text-white/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                      <span>{shortTrace(item.label)}</span>
                    </li>
                  ))}
                </ol>
              </article>
            );
          }) : (
            <p className="text-xs text-white/45">No posts on this account yet.</p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="text-[11px] text-white/55">Page {page} of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>
      ) : (
        <div className="p-8 rounded-2xl bg-white/10 border border-white/20 text-center text-xs text-white/55">
          Connect a social account, then run a dry run or Start AI. Posts show here per account.
        </div>
      )}
    </div>
  );
};
