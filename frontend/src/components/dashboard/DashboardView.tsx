import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Zap,
  Play,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    user,
    autopilot,
    posts,
    inbox,
    brandBrain,
    sendChatMessage,
    chatMessages,
    setActiveTab,
    approvePost,
    approveReply,
    togglePauseAI
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;
    sendChatMessage(inputPrompt);
    setInputPrompt('');
  };

  const quickPrompts = [
    'Plan my content for the next 30 days',
    'Post something about our new product feature',
    'Turn our latest video into 10 social posts',
    'Why did engagement rise 18% this week?'
  ];

  const pendingApprovals = posts.filter(p => p.status === 'awaiting_approval');
  const leadMessages = inbox.filter(i => i.isLead && i.replyStatus === 'ai_draft');

  return (
    <div className="space-y-6">
      
      {/* Top Banner Greeting */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>AI Employee Workday Overview</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Good morning, {user.name.split(' ')[0]}. Here’s what your AI Social Manager has done today.
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Brand Brain is aligned to <span className="text-slate-200 font-medium">{brandBrain.brandName}</span> ({brandBrain.industry}). Autopilot Mode is currently <span className="text-brand-400 font-semibold uppercase">{autopilot.mode}</span>.
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('calendar')}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-subtle flex items-center space-x-2 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Create Content</span>
            </button>
            <button
              onClick={togglePauseAI}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
                autopilot.isPaused
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {autopilot.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{autopilot.isPaused ? 'Resume AI' : 'Manager Status: Active'}</span>
            </button>
          </div>
        </div>

        {/* Activity Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-center">
            <div className="text-[11px] font-medium text-slate-400">Published</div>
            <div className="text-2xl font-bold text-white mt-1">4 <span className="text-xs font-normal text-emerald-400">posts</span></div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-center">
            <div className="text-[11px] font-medium text-slate-400">Scheduled</div>
            <div className="text-2xl font-bold text-white mt-1">12 <span className="text-xs font-normal text-brand-400">posts</span></div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-center">
            <div className="text-[11px] font-medium text-slate-400">Comments Received</div>
            <div className="text-2xl font-bold text-white mt-1">27</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-center">
            <div className="text-[11px] font-medium text-slate-400">Replies Handled</div>
            <div className="text-2xl font-bold text-white mt-1">19</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-center">
            <div className="text-[11px] font-medium text-slate-400">New Messages</div>
            <div className="text-2xl font-bold text-white mt-1">8</div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-center">
            <div className="text-[11px] font-medium text-slate-400">Engagement</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center justify-center space-x-1">
              <TrendingUp className="w-4 h-4" />
              <span>↑ 18.4%</span>
            </div>
          </div>
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5 text-center bg-amber-500/5">
            <div className="text-[11px] font-medium text-amber-400">Attention Required</div>
            <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center justify-center space-x-1">
              <AlertTriangle className="w-4 h-4" />
              <span>{pendingApprovals.length + leadMessages.length} items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Central Conversational AI Command Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">Ask your AI Social Manager</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-pixel">Natural Language Execution</span>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder='Say something like: "Plan my content for the next month" or "Post twice tomorrow on LinkedIn"'
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 pr-12 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-2.5 p-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 mr-1 font-medium">Quick Suggestions:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => { setInputPrompt(prompt); }}
              className="text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-lg px-2.5 py-1 transition-colors text-left"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* AI Chat History Response Card */}
        {chatMessages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latest Agent Log</div>
            {chatMessages.slice(-2).map(msg => (
              <div
                key={msg.id}
                className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                  msg.sender === 'ai'
                    ? 'bg-slate-950/80 border border-brand-500/20 text-slate-200'
                    : 'bg-brand-600/10 border border-brand-500/30 text-brand-300'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center space-x-1.5">
                    {msg.sender === 'ai' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                        <span className="text-brand-400">AI Social Manager</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-300">Jeremiah</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>
                <p className="leading-relaxed">{msg.text}</p>
                
                {msg.actionCard && (
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium flex items-center space-x-1.5"
                    >
                      <span>View Generated Calendar</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Attention Required & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attention Required Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Attention Required ({pendingApprovals.length + leadMessages.length})</h2>
            </div>
            <button
              onClick={() => setActiveTab('inbox')}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center space-x-1"
            >
              <span>View All Inbox</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingApprovals.map(post => (
              <div key={post.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Post Approval Required
                  </span>
                  <span className="text-slate-400 text-[11px]">{post.scheduledTime}</span>
                </div>
                <h3 className="text-xs font-semibold text-white">{post.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{post.variants[0]?.text}</p>
                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => approvePost(post.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Schedule</span>
                  </button>
                </div>
              </div>
            ))}

            {leadMessages.map(msg => (
              <div key={msg.id} className="bg-slate-950 border border-brand-500/20 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-brand-400" />
                    <span>Potential Customer Lead ({msg.platform})</span>
                  </span>
                  <span className="text-slate-400 text-[11px]">{msg.timestamp}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <img src={msg.senderAvatar} alt={msg.senderName} className="w-6 h-6 rounded-full" />
                  <span className="text-xs font-semibold text-white">{msg.senderName}:</span>
                </div>
                <p className="text-xs text-slate-300 italic">"{msg.content}"</p>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300">
                  <span className="text-[10px] text-brand-400 font-semibold uppercase block mb-1">AI Suggested Reply:</span>
                  {msg.suggestedReply}
                </div>
                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => approveReply(msg.id)}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Reply</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Content Schedule */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-white">Upcoming Content Pipeline</h2>
            </div>
            <button
              onClick={() => setActiveTab('calendar')}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center space-x-1"
            >
              <span>Full Calendar</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex items-start justify-between">
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      post.status === 'scheduled' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {post.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">{post.scheduledTime}</span>
                  </div>
                  <h3 className="text-xs font-semibold text-white">{post.title}</h3>
                  <div className="flex items-center space-x-1.5 pt-1">
                    {post.variants.map(v => (
                      <span key={v.platform} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-medium text-slate-300 uppercase">
                        {v.platform}
                      </span>
                    ))}
                  </div>
                </div>

                {post.status === 'awaiting_approval' && (
                  <button
                    onClick={() => approvePost(post.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium"
                  >
                    Approve
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
