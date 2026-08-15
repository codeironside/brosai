import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquare, CheckCircle2, Zap, Edit } from 'lucide-react';
import { InboxMessage } from '../../types';

export const UnifiedInboxView: React.FC = () => {
  const { inbox, setInbox, approveReply, addLog } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState<string>('');

  const handleSaveEditAndSend = (id: string) => {
    setInbox(prev => prev.map(m => m.id === id ? { ...m, suggestedReply: editReplyText, replyStatus: 'replied' } : m));
    setEditingId(null);
    addLog('User (Jeremiah)', 'EDIT_AND_SEND_REPLY', `Edited & dispatched reply for conversation #${id}`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4 text-brand-400" />
            <span>Aggregated Conversation Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Unified Social Inbox & Lead Detector
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            The AI automatically classifies incoming comments and DMs, flags customer leads, and drafts brand-aware replies.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {inbox.map(msg => (
          <div key={msg.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <img src={msg.senderAvatar} alt={msg.senderName} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                <div>
                  <span className="text-xs font-bold text-white">{msg.senderName}</span>
                  <div className="text-[10px] text-slate-500">{msg.platform} • {msg.timestamp}</div>
                </div>
              </div>

              {msg.isLead && (
                <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/15 text-brand-400 border border-brand-500/30 text-xs font-bold flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-brand-400" />
                  <span>Potential Customer Lead</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800 font-medium">
              "{msg.content}"
            </p>

            <div className="bg-slate-950/80 border border-brand-500/20 rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-semibold text-brand-400 uppercase">AI Suggested Reply</div>
              <p className="text-xs text-slate-300 italic">{msg.suggestedReply}</p>

              {msg.replyStatus !== 'replied' && (
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-900">
                  <button
                    onClick={() => approveReply(msg.id)}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Send</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
