import React, { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, PanelLeft, Pencil, Pin, PinOff, Send, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface ChatThread {
  id: string;
  title: string;
  preview?: string;
  updatedAt?: string;
  pinned?: boolean;
}

interface WhatsAppChatProps {
  channel: 'hire-ai' | 'brand-brain';
  title?: string;
  placeholder?: string;
  managerId?: string;
  brandId?: string;
}

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-semibold text-white">
          {bold[1]}
        </strong>
      );
    }
    const code = part.match(/^`([^`]+)`$/);
    if (code) {
      return (
        <span key={index} className="font-mono text-[12px] text-white/90">
          {code[1]}
        </span>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

const ChatMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-2 my-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed text-white/90">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
  };

  lines.forEach((line) => {
    const bullet = line.match(/^\s*[-*]\s+(.+)/);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flushBullets();
    if (!line.trim()) return;
    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      blocks.push(
        <p key={`h-${blocks.length}`} className="text-sm font-semibold text-white mt-2">
          {renderInline(heading[1])}
        </p>
      );
      return;
    }
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-sm leading-relaxed text-white/90">
        {renderInline(line)}
      </p>
    );
  });
  flushBullets();

  return <div className="space-y-2">{blocks}</div>;
};

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({
  channel,
  title,
  placeholder = 'Type a message',
  managerId,
  brandId
}) => {
  const { authenticatedFetch } = useApp();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [learnedNote, setLearnedNote] = useState('');
  const [usedWeb, setUsedWeb] = useState(false);
  const [replaceLast, setReplaceLast] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const applyPayload = (data: any) => {
    if (Array.isArray(data?.threads)) setThreads(data.threads);
    if (data?.threadId !== undefined) setThreadId(data.threadId || null);
    if (Array.isArray(data?.messages)) setMessages(data.messages);
  };

  const scrollToBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authenticatedFetch(`/api/auth/ai-chat?channel=${channel}`);
        const json = await res.json();
        if (json.success) applyPayload(json.data);
      } catch (err) {
        console.warn('Failed to load chat history:', err);
      }
    };
    load();
  }, [authenticatedFetch, channel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const openThread = async (id: string) => {
    const res = await authenticatedFetch(`/api/auth/ai-chat?channel=${channel}&threadId=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (json.success) applyPayload(json.data);
  };

  const newChat = async () => {
    const res = await authenticatedFetch('/api/auth/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel })
    });
    const json = await res.json();
    if (json.success) applyPayload(json.data);
  };

  const deleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await authenticatedFetch(`/api/auth/ai-chat?channel=${channel}&threadId=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.success) applyPayload(json.data);
  };

  const togglePin = async (id: string, pinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await authenticatedFetch('/api/auth/ai-chat', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, threadId: id, pinned: !pinned })
    });
    const json = await res.json();
    if (json.success) applyPayload(json.data);
  };

  const lastUserIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') return i;
    }
    return -1;
  })();

  const startEditLast = () => {
    if (sending || lastUserIndex < 0) return;
    setInput(messages[lastUserIndex].content);
    setMessages(messages.slice(0, lastUserIndex));
    setReplaceLast(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const send = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const text = input.trim();
    if (!text || sending) return;
    const shouldReplace = replaceLast;
    setReplaceLast(false);
    setInput('');
    const activeId = threadId || `thread_${Date.now()}`;
    if (!threadId) {
      setThreadId(activeId);
      setThreads((prev) => {
        if (prev.some((item) => item.id === activeId)) return prev;
        return [{ id: activeId, title: text.slice(0, 48), preview: text, pinned: false }, ...prev];
      });
    } else {
      setThreads((prev) =>
        prev.map((item) => (item.id === activeId ? { ...item, preview: text } : item))
      );
    }
    setMessages((prev) => [...prev, { role: 'user', content: text, createdAt: new Date().toISOString() }]);
    try {
      setSending(true);
      const res = await authenticatedFetch('/api/auth/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          channel,
          threadId: activeId,
          managerId,
          brandId,
          replaceLast: shouldReplace
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Ask AI failed');
      if (json.threadId) setThreadId(json.threadId);
      if (Array.isArray(json.threads)) setThreads(json.threads);
      if (Array.isArray(json.messages) && json.messages.length) {
        setMessages(json.messages);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: json.reply || '', createdAt: new Date().toISOString() }]);
      }
      if (json.learned > 0) {
        setLearnedNote(`Saved ${json.learned} brand fact${json.learned === 1 ? '' : 's'} to memory`);
        window.setTimeout(() => setLearnedNote(''), 3500);
      }
      setUsedWeb(Boolean(json.usedWeb));
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err?.message || 'Ask AI failed' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden flex h-[min(70vh,560px)] min-h-[320px]">
      {sidebarOpen && (
        <aside className="w-[42%] sm:w-56 md:w-64 shrink-0 min-h-0 border-r border-white/20 bg-white/10 backdrop-blur-xl flex flex-col p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-white">History</span>
            <button
              type="button"
              onClick={newChat}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[11px] text-white inline-flex items-center gap-1 border border-white/20 backdrop-blur-md"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-1.5 pr-1 glass-scrollbar">
            {threads.length === 0 && (
              <p className="px-2 py-6 text-[11px] text-white/40 text-center">No chats yet</p>
            )}
            {threads.map((item) => {
              const active = item.id === threadId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openThread(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl group transition-all backdrop-blur-md ${
                    active
                      ? 'bg-white/20 text-white border border-white/30 font-semibold shadow-lg'
                      : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white border border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs truncate flex items-center gap-1.5">
                        {item.pinned && <Pin className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{item.title || 'New chat'}</span>
                      </div>
                      {item.preview && (
                        <div className="text-[10px] text-white/45 truncate mt-0.5 font-normal">{item.preview}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => togglePin(item.id, Boolean(item.pinned), e)}
                        className="text-white/40 hover:text-white p-0.5"
                        aria-label={item.pinned ? 'Unpin chat' : 'Pin chat'}
                      >
                        {item.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => deleteThread(item.id, e)}
                        className="text-white/40 hover:text-white p-0.5"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 sm:px-4 py-3 border-b border-white/20 bg-white/5 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="text-white/70 hover:text-white p-1"
              aria-label="Toggle chat history"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-semibold text-white truncate">
              {title || 'AI chat'}
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-3 py-3 space-y-2 bg-transparent glass-scrollbar"
        >
          {messages.length === 0 && (
            <p className="text-center text-[11px] text-white/45 py-8 px-4">
              Teach the AI about your brand here. Facts you share are saved and used later.
            </p>
          )}
          {messages.map((item, idx) => {
            const mine = item.role === 'user';
            const canEdit = mine && idx === lastUserIndex && !sending && !replaceLast;
            return (
              <div key={item.id || `${item.role}-${idx}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`relative max-w-[88%] sm:max-w-[75%] px-3 py-2 rounded-2xl border backdrop-blur-xl ${
                    mine
                      ? 'bg-white/15 border-white/25 text-white rounded-br-md'
                      : 'bg-white/10 border-white/20 text-white rounded-bl-md'
                  }`}
                >
                  {canEdit && (
                    <button
                      type="button"
                      onClick={startEditLast}
                      className="absolute -left-8 top-1.5 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10"
                      aria-label="Edit last prompt"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {mine ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {item.content}
                    </p>
                  ) : (
                    <ChatMarkdown content={item.content} />
                  )}
                  <div className={`text-[9px] mt-1 ${mine ? 'text-white/70 text-right' : 'text-white/45'}`}>
                    {formatTime(item.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 text-white/60 text-[11px] px-3 py-2 rounded-2xl rounded-bl-md">
                Typing…
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 p-2 sm:p-3 border-t border-white/20 bg-white/10 backdrop-blur-xl">
          {learnedNote && (
            <p className="text-[10px] text-white/55 px-1 pb-1.5">{learnedNote}</p>
          )}
          {usedWeb && !learnedNote && (
            <p className="text-[10px] text-white/55 px-1 pb-1.5">Looked up the live web for that answer</p>
          )}
          {replaceLast && (
            <p className="text-[10px] text-white/55 px-1 pb-1.5">Editing your last prompt — Enter sends the replacement</p>
          )}
          <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return;
              e.preventDefault();
              e.stopPropagation();
              void send(e);
            }}
            placeholder={replaceLast ? 'Edit your last prompt…' : messages.length ? 'Reply…' : placeholder}
            className="flex-1 min-h-[40px] max-h-28 resize-none px-3 py-2.5 rounded-2xl bg-zinc-950 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
          <button
            type="button"
            disabled={sending || !input.trim()}
            onClick={() => void send()}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white text-black flex items-center justify-center shrink-0 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};
