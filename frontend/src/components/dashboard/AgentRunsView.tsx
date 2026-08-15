import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Search, Play, Square, Sparkles, Check, X, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRunTime } from '../../utils/time';

interface AgentRunItem {
  id: string;
  runId: string;
  agentName: string;
  status: 'awaiting' | 'publishing' | 'succeeded' | 'failed';
  tokens: string;
  cost: string;
  started: string;
  createdAt?: string;
  draft?: string;
  platforms?: string[];
  note?: string;
}

interface HiredManager {
  id: string;
  name: string;
  role: string;
  postingFrequency?: string;
  isActive?: boolean;
  brandId?: string;
  brandName?: string;
  postTo?: string[];
}

interface CronState {
  running: boolean;
  managerId: string | null;
  managerName: string | null;
  postingFrequency: string | null;
}

export const AgentRunsView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [runs, setRuns] = useState<AgentRunItem[]>([]);
  const [managers, setManagers] = useState<HiredManager[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const selectedIdRef = useRef('');
  const [cron, setCron] = useState<CronState | null>(null);
  const [cronBusy, setCronBusy] = useState(false);
  const [dryBusy, setDryBusy] = useState(false);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewRun, setPreviewRun] = useState<AgentRunItem | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; brandName: string }>>([]);
  const [stats, setStats] = useState({
    totalRuns: 0,
    successRate: '0.0%',
    errorRate: 0,
    totalCost: '$0.00'
  });

  const applyPayload = useCallback((data: any, lockSelection: boolean) => {
    setStats({
      totalRuns: data.totalRuns,
      successRate: data.successRate,
      errorRate: data.errorRate,
      totalCost: data.totalCost
    });
    setRuns(Array.isArray(data.runs) ? data.runs : []);
    const hired = Array.isArray(data.managers) ? data.managers : [];
    setManagers(hired);
    setBrands(Array.isArray(data.brands) ? data.brands : []);
    setConnectedPlatforms(Array.isArray(data.connectedPlatforms) ? data.connectedPlatforms : []);
    setCron(data.cron || null);
    if (!lockSelection && !selectedIdRef.current) {
      const nextId = data.cron?.managerId || hired.find((item: HiredManager) => item.isActive)?.id || hired[0]?.id || '';
      selectedIdRef.current = nextId;
      setSelectedId(nextId);
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    const res = await authenticatedFetch('/api/auth/dashboard-stats');
    const json = await res.json();
    if (!json.success || !json.data) return;
    applyPayload(json.data, silent);
  }, [authenticatedFetch, applyPayload]);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        setLoading(true);
        await load(false);
      } catch (err) {
        console.warn('Dashboard load warning:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    boot();
    const timer = window.setInterval(() => {
      load(true).catch(() => undefined);
    }, 12000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [load]);

  const pickManager = (id: string) => {
    selectedIdRef.current = id;
    setSelectedId(id);
  };

  const selected = managers.find((item) => item.id === selectedId);
  const blockers = [
    !brands.length ? 'Save at least one Brand Brain.' : null,
    selected && !selected.brandId ? 'Link this AI to a brand in Hire Your AI.' : null,
    !connectedPlatforms.length ? 'Connect at least one social media account.' : null,
    selected && !(selected.postTo || []).length ? 'Choose where this AI should post in Hire Your AI.' : null,
    selected && (selected.postTo || []).length && !(selected.postTo || []).some((p) => connectedPlatforms.includes(p))
      ? 'The posting destinations for this AI are not connected.'
      : null,
  ].filter(Boolean) as string[];

  const canStart = Boolean(selectedId && managers.length && !blockers.length);

  const startCron = async () => {
    if (blockers.length) {
      setNotice(blockers[0]);
      return;
    }
    setNotice(null);
    try {
      setCronBusy(true);
      const res = await authenticatedFetch('/api/auth/ai-cron/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: selectedId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice(blockers[0] || 'Could not start the AI right now.');
        return;
      }
      setCron(json.data);
      await load(true);
    } catch {
      setNotice('Could not start the AI right now.');
    } finally {
      setCronBusy(false);
    }
  };

  const runDryRun = async () => {
    if (blockers.length) {
      setNotice(blockers[0]);
      return;
    }
    setNotice(null);
    try {
      setDryBusy(true);
      const res = await authenticatedFetch('/api/auth/runs/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: selectedId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNotice('Connect a social account and try the dry run again.');
        return;
      }
      await load(true);
      setNotice('Dry run drafted a post. Open it in the run feed to publish.');
    } catch {
      setNotice('Could not complete the dry run. Try again.');
    } finally {
      setDryBusy(false);
    }
  };

  const resolveRun = async (id: string, approve: boolean) => {
    if (busyRunId) return;
    setBusyRunId(id);
    setNotice(approve ? 'Publishing…' : 'Updating…');
    if (approve) {
      setPreviewRun((prev) => (prev && prev.id === id ? { ...prev, status: 'publishing' } : prev));
      setRuns((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'publishing' } : item)));
    }
    try {
      const res = await authenticatedFetch(`/api/auth/runs/${id}/${approve ? 'approve' : 'reject'}`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setNotice(approve ? 'Could not publish that post.' : 'Could not update that run.');
        return;
      }
      setPreviewRun(null);
      await load(true);
      setNotice(approve ? 'Posted.' : 'Draft discarded.');
    } catch {
      setNotice('Could not update that run.');
    } finally {
      setBusyRunId(null);
    }
  };

  const stopRun = async (run: AgentRunItem) => {
    if (busyRunId) return;
    setBusyRunId(run.id);
    try {
      const res = await authenticatedFetch(`/api/auth/runs/${run.id}/stop`, { method: 'POST' });
      if (!res.ok) {
        setNotice('Could not stop that run.');
        return;
      }
      setPreviewRun(null);
      await load(true);
      setNotice('Run stopped.');
    } finally {
      setBusyRunId(null);
    }
  };

  const restartRun = async (run: AgentRunItem) => {
    if (busyRunId) return;
    setBusyRunId(run.id);
    try {
      const res = await authenticatedFetch(`/api/auth/runs/${run.id}/restart`, { method: 'POST' });
      if (!res.ok) {
        setNotice('Could not restart that run.');
        return;
      }
      await load(true);
      setNotice('Run restarted. Open the draft to publish.');
    } finally {
      setBusyRunId(null);
    }
  };

  const regenerateDraft = async (run: AgentRunItem) => {
    if (busyRunId) return;
    setBusyRunId(run.id);
    setNotice('Writing a new draft…');
    try {
      const res = await authenticatedFetch(`/api/auth/runs/${run.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: selectedId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setNotice('Could not regenerate that draft.');
        return;
      }
      const next = { ...run, draft: json.data.draft, platforms: json.data.platforms };
      setPreviewRun(next);
      setRuns((prev) => prev.map((item) => (item.id === run.id ? { ...item, ...next } : item)));
      setNotice('New draft ready.');
    } catch {
      setNotice('Could not regenerate that draft.');
    } finally {
      setBusyRunId(null);
    }
  };

  const filteredRuns = runs.filter((r) =>
    r.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.runId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
            <Bot className="w-4 h-4 text-white" />
            <span>Employed AI</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow">Agent Runs</h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1">
            Choose a hired AI, start a dry run or the schedule, then manage each run in the feed.
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full border text-xs backdrop-blur-md ${
          cron?.running ? 'bg-white/15 border-white/30 text-white' : 'bg-black/30 border-white/15 text-white/70'
        }`}>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${cron?.running ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
          {cron?.running ? `${cron.managerName || 'AI'} scheduled` : 'Schedule idle'}
        </span>
      </div>

      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4">
        <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider">Hired AI to run</label>
        {managers.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {managers.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickManager(item.id)}
                  className={`text-left px-3.5 py-3 rounded-xl border backdrop-blur-md transition-all ${
                    active
                      ? 'bg-white/20 border-white/35 text-white'
                      : 'bg-white/10 border-white/15 text-white/80 hover:bg-white/15'
                  }`}
                >
                  <div className="text-sm font-semibold">{item.name}</div>
                  <div className="text-[11px] text-white/60 mt-0.5">
                    {item.role}{item.isActive ? ' · active' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-white/60">No AI hired yet. Go to Hire Your AI, save a job, then start here.</p>
        )}
        {selected && (
          <p className="text-[11px] text-white/55">
            Brand: {selected.brandName || 'not linked'} · Posts to: {(selected.postTo || []).join(', ') || 'none'} · {selected.postingFrequency || 'no schedule'}
          </p>
        )}
        {blockers.length > 0 && (
          <ul className="text-[11px] text-white/70 space-y-1 list-disc pl-4">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={dryBusy || !canStart}
            onClick={() => void runDryRun()}
            className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {dryBusy ? 'Drafting…' : 'Dry run'}
          </button>
          <button
            type="button"
            disabled={cronBusy || !canStart || cron?.running}
            onClick={() => void startCron()}
            className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5" />
            {cronBusy ? 'Starting…' : 'Start AI'}
          </button>
        </div>
        {notice && <p className="text-xs text-white/70">{notice}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Total runs', stats.totalRuns.toLocaleString()],
          ['Success rate', stats.successRate],
          ['Failed', String(stats.errorRate)],
          ['LLM cost', stats.totalCost],
        ].map(([label, value]) => (
          <div key={label} className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
            <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
            <div className="font-silkscreen text-xl sm:text-2xl text-white mt-2">{value}</div>
          </div>
        ))}
      </div>

      <div className="p-3.5 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 space-y-3 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Run feed</h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search runs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-8 pr-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white placeholder-white/50 focus:outline-none focus:border-white"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredRuns.length ? filteredRuns.map((run) => {
            const live = run.status === 'awaiting' || run.status === 'publishing';
            return (
              <div key={run.id} className="rounded-xl bg-black/30 border border-white/15 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{run.agentName}</div>
                    <div className="text-[11px] text-white/50 font-mono mt-0.5">{run.runId} · {run.status} · {formatRunTime(run.createdAt, run.started)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {run.draft && (
                      <button type="button" onClick={() => setPreviewRun(run)} className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[11px] text-white">
                        View draft
                      </button>
                    )}
                    {run.status === 'awaiting' && run.draft && (
                      <button type="button" disabled={Boolean(busyRunId)} onClick={() => void resolveRun(run.id, true)} className="px-2.5 py-1 rounded-lg bg-white text-black text-[11px] font-semibold disabled:opacity-40">
                        <Check className="w-3 h-3 inline mr-1" />Publish
                      </button>
                    )}
                    {live && (
                      <button type="button" disabled={Boolean(busyRunId)} onClick={() => void stopRun(run)} className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[11px] text-white disabled:opacity-40">
                        <Square className="w-3 h-3 inline mr-1" />Stop
                      </button>
                    )}
                    {!live && (
                      <button type="button" disabled={Boolean(busyRunId)} onClick={() => void restartRun(run)} className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[11px] text-white disabled:opacity-40">
                        <RotateCcw className="w-3 h-3 inline mr-1" />Restart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <p className="py-8 text-center text-white/50 text-xs">
              {loading ? 'Loading…' : 'No runs yet. Start a dry run or Start AI.'}
            </p>
          )}
        </div>
      </div>

      {previewRun?.draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Draft post</h2>
                <p className="text-[11px] text-white/55 mt-1">
                  {previewRun.agentName}
                  {previewRun.platforms?.length ? ` · ${(previewRun.platforms || []).join(', ')}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setPreviewRun(null)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-xl bg-black/40 border border-white/15 p-4">
              <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{previewRun.draft}</p>
            </div>
            {previewRun.status === 'awaiting' && (
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" disabled={Boolean(busyRunId)} onClick={() => void regenerateDraft(previewRun)} className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white disabled:opacity-40">
                  Regenerate
                </button>
                <button type="button" disabled={Boolean(busyRunId)} onClick={() => void stopRun(previewRun)} className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white disabled:opacity-40">
                  Stop
                </button>
                <button type="button" disabled={Boolean(busyRunId)} onClick={() => void resolveRun(previewRun.id, true)} className="px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-semibold disabled:opacity-40">
                  {busyRunId === previewRun.id ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
