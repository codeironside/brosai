import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Activity, Terminal, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

export const AdminView: React.FC = () => {
  const { logs } = useApp();

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span>System Health & Audit Logs</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Admin Console & Action Audit Trails
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time multi-level logging of every AI action, user override, and OAuth API request for security and compliance.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
          <Database className="w-3.5 h-3.5" />
          <span>MongoDB Status: Connected</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Live Execution Logs</h2>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2.5 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-3 text-slate-300 border-b border-slate-900 pb-2">
              <span className="text-slate-500 text-[11px] shrink-0">[{log.timestamp}]</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${
                log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                log.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-brand-500/10 text-brand-400 border border-brand-500/20'
              }`}>
                {log.actor}
              </span>
              <div className="flex-1">
                <span className="font-semibold text-white">{log.action}: </span>
                <span className="text-slate-300">{log.details}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
