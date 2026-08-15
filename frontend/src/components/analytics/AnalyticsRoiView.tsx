import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart3, Award, Target, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const AnalyticsRoiView: React.FC = () => {
  const { addLog } = useApp();
  const [showMeetingReport, setShowMeetingReport] = useState(false);

  const engagementData = [
    { day: 'Mon', engagement: 1200, leads: 5 },
    { day: 'Tue', engagement: 1900, leads: 8 },
    { day: 'Wed', engagement: 2400, leads: 12 },
    { day: 'Thu', engagement: 2100, leads: 9 },
    { day: 'Fri', engagement: 3100, leads: 15 },
    { day: 'Sat', engagement: 1800, leads: 6 },
    { day: 'Sun', engagement: 1500, leads: 4 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4 text-brand-400" />
            <span>Business Impact & Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Social Health & ROI Intelligence Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            We track reach, engagement, qualified customer leads, and business conversion impact.
          </p>
        </div>

        <button
          onClick={() => {
            setShowMeetingReport(true);
            addLog('AI Social Manager', 'GENERATE_WEEKLY_STRATEGY', 'Compiled Weekly Strategy Report', 'success');
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-subtle flex items-center space-x-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Run Weekly Strategy Meeting</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Social Health Score</h2>
            <Award className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-center py-2">
            <div className="text-5xl font-black text-white font-mono">88/100</div>
            <div className="text-xs font-semibold text-emerald-400 mt-1">Excellent Social Standing</div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Business Conversion & Lead Pipeline</h2>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-950 p-3 rounded-xl"><div className="text-xs text-slate-400">Reach</div><div className="text-xl font-bold text-white">182.4K</div></div>
            <div className="bg-slate-950 p-3 rounded-xl border border-brand-500/30"><div className="text-xs text-brand-400">Qualified Leads</div><div className="text-xl font-bold text-brand-400">47</div></div>
            <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30"><div className="text-xs text-emerald-400">Conversions</div><div className="text-xl font-bold text-emerald-400">18</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
