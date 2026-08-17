import React, { useState } from 'react';
import { 
  Bot, 
  Activity, 
  AlertTriangle, 
  DollarSign, 
  Brain, 
  Share2,
  Sparkles,
  User,
  LayoutDashboard,
  PenLine
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HLSVideo } from '../common/HLSVideo';
import { SocialAccountsView } from '../connections/SocialAccountsView';
import { AiManagerConfigView } from '../dashboard/AiManagerConfigView';
import { KnowledgeBaseView } from '../dashboard/KnowledgeBaseView';
import { ProfileSettingsView } from '../dashboard/ProfileSettingsView';
import { AgentRunsView } from '../dashboard/AgentRunsView';
import { LiveTracesView } from '../dashboard/LiveTracesView';
import { DashboardOverviewView } from '../dashboard/DashboardOverviewView';
import { CopyDeskView } from '../dashboard/CopyDeskView';

export const DashboardPageView: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'runs' | 'social' | 'hire-ai' | 'brain' | 'traces' | 'copy-desk' | 'errors' | 'usage' | 'settings'>(() => {
    if (typeof window === 'undefined') return 'overview';
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') || sessionStorage.getItem('brosai_return_social') === '1') {
      sessionStorage.removeItem('brosai_return_social');
      sessionStorage.removeItem('brosai_return_dashboard');
      return 'social';
    }
    return 'overview';
  });

  const dashboardVideoUrl = ((import.meta as any).env?.VITE_DASHBOARD_VIDEO_URL as string) || 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_112712_da9d53df-6d27-4b12-bdf6-aa9dc2622bdf.mp4';

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'social', label: 'Social Accounts', icon: Share2 },
    { id: 'brain', label: 'Brand Brain', icon: Brain },
    { id: 'hire-ai', label: 'Hire Your AI', icon: Sparkles },
    { id: 'runs', label: 'Agent Runs', icon: Bot },
    { id: 'traces', label: 'Live Traces', icon: Activity },
    { id: 'copy-desk', label: 'Copy Desk', icon: PenLine },
    { id: 'errors', label: 'Errors', icon: AlertTriangle },
    { id: 'usage', label: 'Cost & Usage', icon: DollarSign },
    { id: 'settings', label: 'Profile Settings', icon: User },
  ];

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans flex flex-col lg:flex-row overflow-x-hidden pt-16 sm:pt-20">
      <HLSVideo src={dashboardVideoUrl} />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0 pointer-events-none" />

      <div className="lg:hidden relative z-20 w-full px-3 py-2 border-b border-white/15 bg-black/50 backdrop-blur-2xl flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <aside className="hidden lg:flex relative z-10 w-64 bg-black/30 backdrop-blur-2xl border-r border-white/15 flex-col justify-between shrink-0 p-4 space-y-6 shadow-2xl">
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="w-full p-3.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center gap-3 shadow-lg text-left hover:bg-white/15 transition-all"
          >
            <div className="relative">
              <img 
                src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'} 
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/60 shadow-md"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-white border-2 border-black" />
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-sm font-semibold text-white truncate drop-shadow">
                {user.name || 'Vamvamvam User'}
              </div>
              <div className="text-[10px] text-white/70 truncate mt-0.5">
                {user.organizationName || user.email || 'Edit profile'}
              </div>
            </div>
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-white/20 text-white border border-white/30 font-semibold shadow-lg backdrop-blur-xl'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/60'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-[11px] text-white/80">
            <span>Autopilot Engine</span>
            <span className="text-white font-mono font-semibold">ASSISTED</span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
            <div className="bg-white h-full w-[78%]" />
          </div>
          <p className="text-[10px] text-white/70 leading-tight">
            High-confidence actions executing automatically. Sensitive actions require approval.
          </p>
        </div>
      </aside>

      <main className="relative z-10 flex-1 min-w-0 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto overflow-x-hidden max-w-7xl mx-auto w-full">
        {activeTab === 'overview' && <DashboardOverviewView />}
        {activeTab === 'social' && <SocialAccountsView />}
        {activeTab === 'brain' && <KnowledgeBaseView />}
        {activeTab === 'hire-ai' && <AiManagerConfigView />}
        {activeTab === 'settings' && <ProfileSettingsView />}
        {activeTab === 'runs' && <AgentRunsView />}
        {activeTab === 'traces' && <LiveTracesView />}
        {activeTab === 'copy-desk' && <CopyDeskView />}
        {['errors', 'usage'].includes(activeTab) && (
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-sm text-white/70">
            This panel is coming next. Use Agent Runs to start and stop your hired AI.
            </div>
        )}
      </main>
    </div>
  );
};
