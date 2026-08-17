import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, MessageSquarePlus, PanelLeft, Pencil, Pin, PinOff, Send, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  edited?: boolean;
  images?: Array<{ id: string; mimeType?: string }>;
  imageNote?: string;
}

interface ChatThread {
  id: string;
  title: string;
  preview?: string;
  updatedAt?: string;
  pinned?: boolean;
}

interface WhatsAppChatProps {
  channel: 'hire-ai' | 'brand-brain' | 'composer';
  title?: string;
  placeholder?: string;
  managerId?: string;
  brandId?: string;
  emptyHint?: string;
  copyReplies?: boolean;
  extraBody?: Record<string, unknown>;
  className?: string;
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
  const text = String(content || '').replace(/\r/g, '');
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let fence: string[] | null = null;

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

  for (const line of text.split('\n')) {
    if (fence) {
      if (line.trim().startsWith('```')) {
        const code = fence.join('\n');
        fence = null;
        blocks.push(
          <pre key={`pre-${blocks.length}`} className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap break-words font-sans">
            {code}
          </pre>
        );
        continue;
      }
      fence.push(line);
      continue;
    }
    if (line.trim().startsWith('```')) {
      flushBullets();
      fence = [];
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();
    if (!line.trim()) {
      blocks.push(<div key={`sp-${blocks.length}`} className="h-2" />);
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      blocks.push(
        <p key={`h-${blocks.length}`} className="text-sm font-semibold text-white mt-2">
          {renderInline(heading[1])}
        </p>
      );
      continue;
    }
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-sm leading-relaxed text-white/90">
        {renderInline(line)}
      </p>
    );
  }
  if (fence && fence.length) {
    blocks.push(
      <pre key={`pre-${blocks.length}`} className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap break-words font-sans">
        {fence.join('\n')}
      </pre>
    );
  }
  flushBullets();

  return <div className="space-y-0.5">{blocks}</div>;
};

function isHashtagLine(line: string) {
  return /^(#\w+)(\s+#\w+)*$/.test(line.trim());
}

function isMetaLine(line: string) {
  const text = line.trim();
  if (!text) return false;
  if (/^(\*|-|•)\s/.test(text)) return true;
  if (/^\d+\.\s/.test(text)) return true;
  if (/^(copy desk|one \w+ post only|char(?:acter)? count|total:|recounting|plain text|constraints|platform:|voice:|hook:|paragraph|para\s*\d|hashtags:|brand:|core value|user'?s request|output format|new total|wait,|note:)/i.test(text)) return true;
  if (/^(x|twitter|linkedin|facebook|threads|instagram)\s*·/i.test(text)) return true;
  if (/^\\n/.test(text)) return true;
  if (/\btotal:\s*\d/i.test(text)) return true;
  if (/too close|dangerous|under 280|max 2 hashtags/i.test(text)) return true;
  if (/\(\d+\)\s*$/.test(text) && text.length < 90) return true;
  return false;
}

const COPY_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  facebook: 5000,
  threads: 500
};

function platformCharCount(text: string, platform?: string) {
  const key = String(platform || '').toLowerCase() === 'x' ? 'twitter' : String(platform || '').toLowerCase();
  const weighted = key === 'twitter' || key === 'threads';
  let n = 0;
  for (const ch of String(text || '')) {
    const cp = ch.codePointAt(0) || 0;
    n += weighted && cp > 0x10ff ? 2 : 1;
  }
  return n;
}

function clipToCount(text: string, budget: number, platform?: string) {
  const points = Array.from(String(text || ''));
  if (platformCharCount(points.join(''), platform) <= budget) return points.join('').trimEnd();
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (platformCharCount(points.slice(0, mid).join(''), platform) <= budget) lo = mid;
    else hi = mid - 1;
  }
  let cut = points.slice(0, lo).join('').trimEnd();
  const space = cut.lastIndexOf(' ');
  const newline = cut.lastIndexOf('\n');
  const breakAt = Math.max(space, newline);
  if (breakAt > cut.length * 0.5) cut = cut.slice(0, breakAt).trimEnd();
  while (cut && platformCharCount(cut, platform) > budget) {
    const next = Array.from(cut);
    next.pop();
    cut = next.join('').trimEnd();
  }
  return cut;
}

function fitToLimit(text: string, limit: number, platform?: string) {
  const clean = String(text || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean || !limit) return clean;
  if (platformCharCount(clean, platform) <= limit) return clean;
  const lines = clean.split('\n');
  let tags = '';
  if (isHashtagLine(lines[lines.length - 1] || '')) {
    tags = (lines.pop() || '').trim();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  }
  const body = lines.join('\n').trim();
  const suffix = tags ? `\n\n${tags}` : '';
  const suffixCount = platformCharCount(suffix, platform);
  if (suffix && suffixCount < limit) {
    const fitted = `${clipToCount(body, limit - suffixCount, platform)}${suffix}`.trim();
    if (platformCharCount(fitted, platform) <= limit) return fitted;
  }
  return clipToCount(body || clean, limit, platform);
}

function pasteReady(content: string, platform?: string) {
  let text = String(content || '').replace(/\r\n/g, '\n');
  const fences = [...text.matchAll(/```(?:[\w-]*)\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  if (fences.length) text = fences[fences.length - 1];
  const blocks = text
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return false;
      if (isHashtagLine(block) && lines.length === 1) return true;
      const metaHits = lines.filter((line) => isMetaLine(line)).length;
      return metaHits < Math.ceil(lines.length * 0.6);
    });
  const hashIndex = [...blocks].reverse().findIndex((block) => isHashtagLine(block.split('\n').pop() || ''));
  const picked = hashIndex >= 0
    ? blocks.slice(Math.max(0, blocks.length - 1 - hashIndex - 3), blocks.length - hashIndex)
    : blocks.slice(-3);
  const post = picked
    .join('\n\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n+I could not generate the image[\s\S]*$/i, '')
    .trim();
  const key = String(platform || '').toLowerCase() === 'x' ? 'twitter' : String(platform || '').toLowerCase();
  const limit = COPY_LIMITS[key];
  return limit ? fitToLimit(post, limit, key) : post;
}

const ComposerImage: React.FC<{ imageId: string; mimeType?: string }> = ({ imageId }) => {
  const { authenticatedFetch } = useApp();
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    let objectUrl = '';
    const load = async () => {
      try {
        const res = await authenticatedFetch(`/api/auth/composer-images/${encodeURIComponent(imageId)}`);
        if (!res.ok) return;
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (alive) setSrc(objectUrl);
      } catch {
        /* keep caption usable without the visual */
      }
    };
    load();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [authenticatedFetch, imageId]);

  if (!src) {
    return <div className="mt-2 h-36 rounded-xl bg-white/5 border border-white/10 animate-pulse" />;
  }

  const download = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${imageId}.png`;
    link.click();
  };

  return (
    <div className="mt-2 space-y-1.5">
      <img src={src} alt="Generated for this post" className="w-full rounded-xl border border-white/15 object-cover" />
      <button
        type="button"
        onClick={download}
        className="inline-flex items-center gap-1 text-[10px] text-white/55 hover:text-white"
      >
        <Download className="w-3 h-3" />
        Download image
      </button>
    </div>
  );
};

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({
  channel,
  title,
  placeholder = 'Type a message',
  managerId,
  brandId,
  emptyHint,
  copyReplies = false,
  extraBody,
  className = ''
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
  const [copiedId, setCopiedId] = useState('');
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
    setMessages((prev) => {
      if (!shouldReplace) {
        return [...prev, { role: 'user', content: text, createdAt: new Date().toISOString() }];
      }
      const next = [...prev];
      if (next[next.length - 1]?.role === 'assistant') next.pop();
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === 'user') {
          next[i] = { ...next[i], content: text, edited: true };
          break;
        }
      }
      return next;
    });
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
          replaceLast: shouldReplace,
          ...extraBody
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
    <div className={`rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden flex h-[min(70vh,560px)] min-h-[320px] ${className}`}>
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
              {emptyHint || 'Teach the AI about your brand here. Facts you share are saved and used later.'}
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
                    <>
                      {copyReplies ? (
                        <p className="text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
                          {pasteReady(item.content, String((extraBody?.platforms as string[] | undefined)?.[0] || ''))}
                        </p>
                      ) : (
                        <ChatMarkdown content={item.content} />
                      )}
                      {(item.images || []).map((image) => (
                        <ComposerImage key={image.id} imageId={image.id} mimeType={image.mimeType} />
                      ))}
                      {item.imageNote && (
                        <p className="mt-2 text-[11px] leading-relaxed text-white/55">{item.imageNote}</p>
                      )}
                      {copyReplies && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-white/45">
                            {(() => {
                              const key = String((extraBody?.platforms as string[] | undefined)?.[0] || '');
                              const post = pasteReady(item.content, key);
                              const limit = COPY_LIMITS[key === 'x' ? 'twitter' : key];
                              const count = platformCharCount(post, key);
                              return limit ? `${count} / ${limit} characters` : `${count} characters`;
                            })()}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const key = String((extraBody?.platforms as string[] | undefined)?.[0] || '');
                                await navigator.clipboard.writeText(pasteReady(item.content, key));
                                setCopiedId(item.id || `${idx}`);
                                window.setTimeout(() => setCopiedId(''), 1600);
                              } catch {
                                /* ignore clipboard denial */
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-black text-[11px] font-medium"
                            aria-label="Copy post"
                          >
                            {copiedId === (item.id || `${idx}`) ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === (item.id || `${idx}`) ? 'Copied' : 'Copy post'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {!copyReplies || mine ? (
                    <div className={`text-[9px] mt-1 ${mine ? 'text-white/70 text-right' : 'text-white/45'}`}>
                      {formatTime(item.createdAt)}
                      {item.edited ? ' · Edited' : ''}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 text-white/70 px-3 py-2 rounded-2xl rounded-bl-md inline-flex items-center gap-2">
                <span className="text-[11px]">thinking</span>
                <span className="inline-flex items-center gap-1" aria-hidden="true">
                  <span className="wa-thinking-dot" />
                  <span className="wa-thinking-dot" />
                  <span className="wa-thinking-dot" />
                </span>
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
