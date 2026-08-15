import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar as CalendarIcon, Sparkles, Plus, Video, CheckCircle2, Clock, Copy } from 'lucide-react';
import { PostItem } from '../../types';

export const ContentFactoryView: React.FC = () => {
  const { posts, setPosts, approvePost, repurposeVideo, addLog } = useApp();
  const [videoInput, setVideoInput] = useState('');
  const [isRepurposing, setIsRepurposing] = useState(false);

  const handleRepurposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;
    setIsRepurposing(true);
    setTimeout(() => {
      repurposeVideo(videoInput.trim());
      setIsRepurposing(false);
      setVideoInput('');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4 text-brand-400" />
            <span>AI Content Factory & Calendar</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            30-Day Content Strategy & Multi-Platform Pipeline
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            The AI automatically adapts core concepts for LinkedIn, Instagram, X, Facebook, YouTube, and TikTok.
          </p>
        </div>

        <button
          onClick={() => {
            const newPost: PostItem = {
              id: `p_new_${Date.now()}`,
              title: 'New AI Strategic Concept',
              coreConcept: 'Custom content concept tailored to brand pillars',
              category: 'educational',
              status: 'awaiting_approval',
              scheduledTime: 'Aug 14 at 10:00 AM',
              variants: [
                { platform: 'linkedin', text: 'Here is how modern business leaders scale without burnout using intelligent automation systems.', hashtags: ['#Leadership'], characterCount: 160 },
                { platform: 'twitter', text: '3 burnout-prevention rules every tech founder needs in 2026 🧵', hashtags: ['#TechFounders'], characterCount: 110 }
              ],
              createdAt: new Date().toISOString()
            };
            setPosts(prev => [newPost, ...prev]);
            addLog('AI Social Manager', 'CREATE_DRAFT_POST', 'Generated new draft post candidate', 'success');
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-subtle flex items-center space-x-2 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Concept</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center space-x-2">
          <Video className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Repurpose Engine: 1 Video / Article → 10 Social Posts</h2>
        </div>
        <form onSubmit={handleRepurposeSubmit} className="flex items-center space-x-3">
          <input
            type="text"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            placeholder='e.g. "How AI Automation Replaced 20 Hours of Weekly Admin Work"'
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={isRepurposing}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-brand-400 ${isRepurposing ? 'animate-spin' : ''}`} />
            <span>{isRepurposing ? 'Extracting Campaign...' : 'Repurpose Content'}</span>
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-semibold uppercase">
                  {post.status.replace('_', ' ')}
                </span>
                <h3 className="text-sm font-semibold text-white mt-1">{post.title}</h3>
              </div>

              {post.status === 'awaiting_approval' && (
                <button
                  onClick={() => approvePost(post.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Schedule</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {post.variants.map((v, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                  <div className="text-xs font-semibold text-brand-400 uppercase font-mono">{v.platform} Variant</div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
