import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Brain,
  Pause,
  Play,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Sparkles,
  Share2,
  Calendar,
  Sliders,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Mail,
  Users,
  ShieldCheck,
  Building2
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    autopilot,
    togglePauseAI,
    activeTab,
    setActiveTab,
    workspaces,
    currentWorkspace,
    setCurrentWorkspace
  } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'brand', label: 'Brand Brain 🧠', icon: Sparkles },
    { id: 'connections', label: 'Connected Accounts', icon: Share2 },
    { id: 'calendar', label: 'Content Calendar', icon: Calendar },
    { id: 'autopilot', label: 'Autopilot & Rules', icon: Sliders },
    { id: 'inbox', label: 'Unified Inbox', icon: MessageSquare, badge: 2 },
    { id: 'trends', label: 'Trend Radar', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics & ROI', icon: BarChart3 },
    { id: 'notifications', label: 'WhatsApp & Email', icon: Mail },
    { id: 'team', label: 'Team & Workspaces', icon: Users },
    { id: 'admin', label: 'Admin Logs', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Brain Badge */}
        <div className="flex items-center space-x-4">
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-500 shadow-subtle group-hover:border-brand-500 transition-colors">
              <Brain className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-bold tracking-tight text-white">Bros</span>
                <span className="text-xl font-bold tracking-tight text-brand-500">AI</span>
                <span className="text-[10px] font-pixel px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase">
                  Agent v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Your AI Social Media Manager</p>
            </div>
          </div>

          {/* Workspace Switcher */}
          <div className="hidden md:flex items-center">
            <div className="h-5 w-px bg-slate-800 mx-3" />
            <div className="relative group">
              <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700/60 transition-colors">
                <Building2 className="w-3.5 h-3.5 text-brand-400" />
                <span className="max-w-[140px] truncate">{currentWorkspace.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              
              <div className="absolute left-0 mt-1 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-modal p-1.5 hidden group-hover:block z-50">
                <div className="text-[10px] font-semibold text-slate-400 uppercase px-2 py-1">Workspaces</div>
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => setCurrentWorkspace(ws)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between ${
                      ws.id === currentWorkspace.id ? 'bg-brand-500/10 text-brand-400 font-medium' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{ws.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">{ws.category}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Emergency Toggle */}
        <div className="flex items-center space-x-3">
          
          <button
            onClick={togglePauseAI}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-subtle ${
              autopilot.isPaused
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
            title="Click to toggle emergency AI pause"
          >
            {autopilot.isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>AI MANAGER: PAUSED ⏸</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-subtle" />
                <span className="font-mono">AI MANAGER: ACTIVE 🟢</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inbox')}
            className="relative p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500" />
          </button>

          <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-800">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
            />
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{user.role} • {user.authProvider} OAuth</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="bg-slate-950/60 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 py-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-subtle'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
