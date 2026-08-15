import React from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Layers, Shield, Briefcase } from 'lucide-react';

export const TeamAgencyView: React.FC = () => {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useApp();

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-brand-400" />
            <span>Organization & Agency Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Team Permissions & Agency Client Workspaces
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-brand-400" />
            <span>Client Workspaces ({workspaces.length})</span>
          </h2>
          <div className="space-y-3">
            {workspaces.map(ws => (
              <div key={ws.id} onClick={() => setCurrentWorkspace(ws)} className="bg-slate-950 p-4 rounded-xl border border-slate-800 cursor-pointer flex justify-between">
                <span className="text-xs font-bold text-white">{ws.name}</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{ws.healthScore}/100</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
