import React, { useEffect, useState } from 'react';
import { Bot, Search, Play, Square } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassSelect } from '../common/GlassSelect';

interface AgentRunItem {
  id: string;
  runId: string;
  agentName: string;
  status: 'awaiting' | 'succeeded' | 'failed';
  toolsCount: number;
  latencyPercent: number;
  tokens: string;
  cost: string;
  started: string;
  approvalMode: 'manual' | 'auto';
  approved?: boolean;
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
  tickCount: number;
  startedAt: string | null;
  lastTickAt: string | null;
}

export const AgentRunsView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [runs, setRuns] = useState<AgentRunItem[]>([]);
  const [managers, setManagers] = useState<HiredManager[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [cron, setCron] = useState<CronState | null>(null);
  const [cronBusy, setCronBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [brands, setBrands] = useState<Array<{ id: string; brandName: string }>>([]);
  const [stats, setStats] = useState({
    totalRuns: 0,
    successRate: '0.0%',
    errorRate: 0,
    totalCost: '$0.00',
    successRateDelta: '0 succeeded',
    errorRateDelta: '0 failed',
  });

  const load = async () => {
    const res = await authenticatedFetch('/api/auth/dashboard-stats');
    const json = await res.json();
    if (!json.success || !json.data) return;
    setStats({
      totalRuns: json.data.totalRuns,
      successRate: json.data.successRate,
      errorRate: json.data.errorRate,
      totalCost: json.data.totalCost,
      successRateDelta: json.data.successRateDelta,
      errorRateDelta: json.data.errorRateDelta,
    });
    setRuns(Array.isArray(json.data.runs) ? json.data.runs : []);
    const hired = Array.isArray(json.data.managers) ? json.data.managers : [];
    setManagers(hired);
    setBrands(Array.isArray(json.data.brands) ? json.data.brands : []);
    setConnectedPlatforms(Array.isArray(json.data.connectedPlatforms) ? json.data.connectedPlatforms : []);
    setCron(json.data.cron || null);
    const nextId = json.data.cron?.managerId || hired.find((item: HiredManager) => item.isActive)?.id || hired[0]?.id || '';
    setSelectedId(nextId);
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        setLoading(true);
        await load();
      } catch (err) {
        console.warn('Dashboard load warning:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    boot();
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [authenticatedFetch]);

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

  const toggleCron = async (start: boolean) => {
    if (start && blockers.length) {
      setError(blockers[0]);
      return;
    }
    setError(null);
    try {
      setCronBusy(true);
      const res = await authenticatedFetch(start ? '/api/auth/ai-cron/start' : '/api/auth/ai-cron/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: selectedId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not update cron');
      setCron(json.data);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not update cron');
    } finally {
      setCronBusy(false);
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
            Start or stop the hired AI cron and watch posting activity here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full border text-xs backdrop-blur-md ${
            cron?.running ? 'bg-white/15 border-white/30 text-white' : 'bg-black/30 border-white/15 text-white/70'
          }`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${cron?.running ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
            {cron?.running ? `${cron.managerName || 'AI'} running` : 'Cron idle'}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-3">
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider">Hired AI to run</label>
            {managers.length ? (
              <GlassSelect
                options={managers.map((item) => ({
                  value: item.id,
                  label: `${item.name} — ${item.role}${item.isActive ? ' (active)' : ''}`
                }))}
                value={selectedId}
                onChange={setSelectedId}
              />
            ) : (
              <p className="text-xs text-white/60">No AI hired yet. Go to Hire Your AI, save a job, then start the cron here.</p>
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
          </div>
          <div className="lg:col-span-5 flex flex-wrap items-end gap-2">
            <button
              type="button"
              disabled={cronBusy || !canStart || cron?.running}
              onClick={() => toggleCron(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              {cronBusy && !cron?.running ? 'Starting…' : 'Start AI'}
            </button>
            <button
              type="button"
              disabled={cronBusy || !cron?.running}
              onClick={() => toggleCron(false)}
              className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Square className="w-3.5 h-3.5" />
              {cronBusy && cron?.running ? 'Stopping…' : 'Stop AI'}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/90 min-w-[640px]">
            <thead>
              <tr className="border-b border-white/15 text-white/60 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-2">Run</th>
                <th className="py-2.5 px-2">Agent</th>
                <th className="py-2.5 px-2">Status</th>
                <th className="py-2.5 px-2">Tokens</th>
                <th className="py-2.5 px-2">Cost</th>
                <th className="py-2.5 px-2">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredRuns.length ? filteredRuns.map((run) => (
                <tr key={run.id} className="hover:bg-white/10">
                  <td className="py-3 px-2 font-mono text-[11px]">{run.runId}</td>
                  <td className="py-3 px-2">{run.agentName}</td>
                  <td className="py-3 px-2 capitalize text-white/80">{run.status}</td>
                  <td className="py-3 px-2 font-mono">{run.tokens}</td>
                  <td className="py-3 px-2 font-mono">{run.cost}</td>
                  <td className="py-3 px-2 text-white/60">{run.started}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/50">
                    {loading ? 'Loading…' : 'No runs yet. Start an employed AI to begin the cron.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
