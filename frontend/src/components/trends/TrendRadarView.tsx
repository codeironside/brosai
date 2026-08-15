import React from 'react';
import { useApp } from '../../context/AppContext';
import { TrendingUp, Sparkles, ArrowRight, Flame } from 'lucide-react';

export const TrendRadarView: React.FC = () => {
  const { trends, createPostFromTrend } = useApp();

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            <span>AI Industry Radar</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Trend Intelligence & Strategic Opportunity Scanner
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            The AI constantly scans industry conversations, filtering out noise to surface high-converting topics.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {trends.map(tr => (
          <div key={tr.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-bold font-mono">
                  {tr.relevanceScore}% Relevance Match
                </span>
                <h3 className="text-base font-bold text-white mt-1.5">{tr.topic}</h3>
              </div>

              <button
                onClick={() => createPostFromTrend(tr)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-subtle"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Content From Trend</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Why It Matters</span>
                {tr.whyItMatters}
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] font-semibold text-brand-400 uppercase block mb-1">AI Content Angle</span>
                {tr.suggestedAngle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
