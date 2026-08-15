import React, { useEffect, useState } from 'react';
import { Bot, Search, SlidersHorizontal, Download, BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
}

export const DashboardOverviewView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [runs, setRuns] = useState<AgentRunItem[]>([]);
  const [cronLabel, setCronLabel] = useState('Idle');
  const [stats, setStats] = useState({
    totalRuns: 0,
    totalRunsDelta: 'No runs logged yet',
    successRate: '0.0%',
    successRateDelta: '0 succeeded',
    p95Latency: '0.0s',
    p95LatencyDelta: 'Idle',
    errorRate: 0,
    errorRateDelta: '0 failed',
    totalCost: '$0.00',
    chartPoints: [] as Array<{ time: string; completion: number; cacheWrite: number; prompt: number; toolTokens: number }>
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await authenticatedFetch('/api/auth/dashboard-stats');
        const json = await res.json();
        if (!json.success || !json.data || !mounted) return;
        setStats({
          totalRuns: json.data.totalRuns,
          totalRunsDelta: json.data.totalRunsDelta,
          successRate: json.data.successRate,
          successRateDelta: json.data.successRateDelta,
          p95Latency: json.data.p95Latency,
          p95LatencyDelta: json.data.p95LatencyDelta,
          errorRate: json.data.errorRate,
          errorRateDelta: json.data.errorRateDelta,
          totalCost: json.data.totalCost,
          chartPoints: json.data.chartPoints || []
        });
        setRuns(Array.isArray(json.data.runs) ? json.data.runs : []);
        const cron = json.data.cron;
        setCronLabel(cron?.running ? `${cron.managerName || 'AI'} running` : 'Idle');
      } catch (err) {
        console.warn('Overview load warning:', err);
      }
    };
    load();
    const timer = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [authenticatedFetch]);

  const filteredRuns = runs.filter((r) =>
    r.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.runId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-white/15">
        <div>
          <h1 className="text-lg sm:text-2xl font-semibold text-white tracking-tight flex items-center gap-2 drop-shadow">
            <span>Dashboard Overview</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-normal">
              Workspace
            </span>
          </h1>
          <p className="text-[11px] sm:text-xs text-white/70 mt-0.5 sm:mt-1">
            Stats for your hired AIs, brands, and posting activity
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs text-white">
          <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 align-middle" />
          {cronLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5">
        <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {[
            ['Total runs', stats.totalRuns.toLocaleString(), stats.totalRunsDelta],
            ['Success rate', stats.successRate, stats.successRateDelta],
            ['P95 latency', stats.p95Latency, stats.p95LatencyDelta],
            ['Error rate', String(stats.errorRate), stats.errorRateDelta],
          ].map(([label, value, delta]) => (
            <div key={label} className="p-3 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex flex-col justify-between space-y-2 sm:space-y-3 shadow-xl">
              <div className="text-[11px] sm:text-xs font-medium text-white/80">{label}</div>
              <div className="font-silkscreen text-xl sm:text-3xl text-white font-normal drop-shadow">{value}</div>
              <div className="text-[10px] sm:text-[11px] text-white/70">{delta}</div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-7 p-3.5 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex flex-col justify-between space-y-3 sm:space-y-4 shadow-xl">
          <div>
            <h3 className="text-sm font-semibold text-white drop-shadow">Total LLMs Cost</h3>
            <p className="text-[10px] sm:text-[11px] text-white/70">Token spend across recent windows</p>
          </div>
          <div className="h-36 sm:h-44 w-full flex items-end justify-between gap-2 sm:gap-3 pt-4 sm:pt-6 px-1 border-b border-white/15 pb-2 overflow-x-auto">
            {stats.chartPoints.length > 0 ? (
              stats.chartPoints.map((pt) => (
                <div key={pt.time} className="flex-1 flex flex-col justify-end items-center h-full min-w-[28px]">
                  <div className="w-full max-w-[32px] flex flex-col-reverse rounded-t overflow-hidden">
                    <div style={{ height: `${(pt.toolTokens / 4) * 12}px` }} className="bg-slate-300" />
                    <div style={{ height: `${(pt.prompt / 300) * 38}px` }} className="bg-slate-500" />
                    <div style={{ height: `${(pt.cacheWrite / 300) * 32}px` }} className="bg-slate-400" />
                    <div style={{ height: `${(pt.completion / 300) * 55}px` }} className="bg-white" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-white/70 font-mono mt-2">{pt.time}</span>
                </div>
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                No token metrics yet
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="font-mono text-white/80">
              <span className="text-white/60 text-[11px] mr-2">Total</span>
              <span className="font-silkscreen text-white">{stats.totalCost}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3.5 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 space-y-3 sm:space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-semibold text-white">Recent runs</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-mono">
              {runs.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search runs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-white/20 text-xs text-white placeholder-white/50 focus:outline-none focus:border-white sm:w-48 lg:w-56"
              />
            </div>
            <button type="button" className="p-1.5 sm:p-2 rounded-xl bg-zinc-950 border border-white/20 text-white">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-medium text-white flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/90 min-w-[600px]">
            <thead>
              <tr className="border-b border-white/15 text-white/60 text-[10px] sm:text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-2">Run ID</th>
                <th className="py-2.5 px-2">Agent</th>
                <th className="py-2.5 px-2">Status</th>
                <th className="py-2.5 px-2">Tools</th>
                <th className="py-2.5 px-2">Tokens</th>
                <th className="py-2.5 px-2">Cost</th>
                <th className="py-2.5 px-2">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredRuns.length ? filteredRuns.map((run) => (
                <tr key={run.id} className="hover:bg-white/10">
                  <td className="py-3 px-2 font-mono text-[11px]">{run.runId}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      {run.agentName}
                    </div>
                  </td>
                  <td className="py-3 px-2 capitalize">{run.status}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1 font-mono">
                      <BarChart3 className="w-3 h-3" />
                      {run.toolsCount}
                    </div>
                  </td>
                  <td className="py-3 px-2 font-mono">{run.tokens}</td>
                  <td className="py-3 px-2 font-mono">{run.cost}</td>
                  <td className="py-3 px-2 text-white/70 font-mono text-[10px]">{run.started}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/50">
                    No agent runs yet. Start an employed AI from Agent Runs.
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
