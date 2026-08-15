import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sliders, Eye, Bot, Zap, Lock, Play, Pause } from 'lucide-react';
import { AutopilotMode } from '../../types';

export const AutopilotRulesView: React.FC = () => {
  const { autopilot, setAutopilot, togglePauseAI, addLog } = useApp();

  const setMode = (mode: AutopilotMode) => {
    setAutopilot(prev => ({ ...prev, mode }));
    addLog('User (Jeremiah)', 'CHANGE_AUTOPILOT_MODE', `Switched AI Autopilot Mode to "${mode.toUpperCase()}"`, 'info');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4 text-brand-400" />
            <span>AI Manager Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Autopilot Modes & Human Control Rules
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Choose how much autonomy to delegate to your AI Social Manager. Pause operations instantly at any time.
          </p>
        </div>

        <button
          onClick={togglePauseAI}
          className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center space-x-2 transition-all shadow-subtle ${
            autopilot.isPaused
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
        >
          {autopilot.isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 text-emerald-400 fill-current" />}
          <span>{autopilot.isPaused ? 'Resume AI Manager' : 'Emergency PAUSE AI'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => setMode('approval')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-card cursor-pointer space-y-4 ${
            autopilot.mode === 'approval' ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-800'
          }`}
        >
          <Eye className="w-6 h-6 text-amber-400" />
          <h3 className="text-base font-bold text-white">Mode 1 — Approval Mode</h3>
          <p className="text-xs text-slate-400">AI creates content; User must approve every item before publication.</p>
        </div>

        <div
          onClick={() => setMode('assisted')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-card cursor-pointer space-y-4 ${
            autopilot.mode === 'assisted' ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-800'
          }`}
        >
          <Bot className="w-6 h-6 text-brand-400" />
          <h3 className="text-base font-bold text-white">Mode 2 — Assisted Autopilot</h3>
          <p className="text-xs text-slate-400">AI publishes routine content automatically; sensitive posts require approval.</p>
        </div>

        <div
          onClick={() => setMode('autonomous')}
          className={`bg-slate-900 border rounded-2xl p-5 shadow-card cursor-pointer space-y-4 ${
            autopilot.mode === 'autonomous' ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-800'
          }`}
        >
          <Zap className="w-6 h-6 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Mode 3 — Autonomous Manager</h3>
          <p className="text-xs text-slate-400">AI manages posts, schedules, and replies completely autonomously within brand rules.</p>
        </div>
      </div>
    </div>
  );
};
