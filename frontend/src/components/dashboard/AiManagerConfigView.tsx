import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bot, Sparkles, Check, Save, Clock, Pencil, Trash2, Plus } from 'lucide-react';
import { GlassSelect } from '../common/GlassSelect';
import { WhatsAppChat } from '../common/WhatsAppChat';

const FREQUENCY_PRESETS = [
  { id: '1 post / day', label: '1 post / day', desc: 'One post each day' },
  { id: '2 posts / day', label: '2 posts / day', desc: 'Morning and afternoon' },
  { id: '3 posts / day', label: '3 posts / day', desc: 'Steady daily cadence' },
  { id: '5 posts / day', label: '5 posts / day', desc: 'High-volume presence' },
  { id: '3 posts / week', label: '3 posts / week', desc: 'Mon / Wed / Fri' },
  { id: '1 post / week', label: '1 post / week', desc: 'Light weekly publishing' },
] as const;

const WORKING_HOURS = [
  '24/7 Autopilot',
  'Weekdays 9:00–17:00',
  'Weekdays 8:00–20:00',
  'Evenings 18:00–22:00',
  'Weekends only',
];

const PERSONALITY_PRESETS = [
  'Professional & Authoritative',
  'Friendly & Conversational',
  'Bold, Energetic & Direct',
  'Educational & Empathetic',
];

const GOAL_PRESETS = [
  'Generate Leads & Build Brand Presence',
  'Drive Website Traffic',
  'Community Growth & Engagement',
  'Customer Education & Thought Leadership',
];

const MODE_LABELS: Record<string, string> = {
  approval: 'Approval required',
  assisted: 'Assisted autopilot',
  autonomous: 'Autonomous manager',
};

interface HiredManager {
  id: string;
  name: string;
  role: string;
  personality: string;
  goal: string;
  workingHours: string;
  postingFrequency: string;
  autopilotMode: 'approval' | 'assisted' | 'autonomous';
  hiredAt?: string;
  isActive?: boolean;
  brandId?: string;
  brandName?: string;
  postTo?: string[];
}

const PLATFORM_OPTIONS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'X (Twitter)' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'threads', label: 'Threads' },
];

function isPresetFrequency(value: string): boolean {
  return FREQUENCY_PRESETS.some((item) => item.id === value);
}

const EMPTY_FORM = {
  aiName: 'Alex',
  role: 'Social Media Manager',
  personality: 'Professional & Authoritative',
  goal: 'Generate Leads & Build Brand Presence',
  workingHours: '24/7 Autopilot',
  postingFrequency: '3 posts / day',
  autopilotMode: 'assisted' as HiredManager['autopilotMode'],
};

export const AiManagerConfigView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [mode, setMode] = useState<'view' | 'form'>('form');
  const [managers, setManagers] = useState<HiredManager[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [aiName, setAiName] = useState(EMPTY_FORM.aiName);
  const [role, setRole] = useState(EMPTY_FORM.role);
  const [personality, setPersonality] = useState(EMPTY_FORM.personality);
  const [goal, setGoal] = useState(EMPTY_FORM.goal);
  const [workingHours, setWorkingHours] = useState(EMPTY_FORM.workingHours);
  const [postingFrequency, setPostingFrequency] = useState(EMPTY_FORM.postingFrequency);
  const [customCount, setCustomCount] = useState(3);
  const [customPeriod, setCustomPeriod] = useState<'day' | 'week'>('day');
  const [useCustomFrequency, setUseCustomFrequency] = useState(false);
  const [autopilotMode, setAutopilotMode] = useState<HiredManager['autopilotMode']>('assisted');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [customPersonality, setCustomPersonality] = useState(false);
  const [customGoal, setCustomGoal] = useState(false);
  const [customHours, setCustomHours] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [brands, setBrands] = useState<Array<{ id: string; brandName: string }>>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [brandId, setBrandId] = useState('');
  const [postTo, setPostTo] = useState<string[]>([]);

  const selected = managers.find((item) => item.id === selectedId) || null;

  const applyForm = (manager: HiredManager) => {
    setAiName(manager.name);
    setRole(manager.role);
    setPersonality(manager.personality);
    setCustomPersonality(!PERSONALITY_PRESETS.includes(manager.personality));
    setGoal(manager.goal);
    setCustomGoal(!GOAL_PRESETS.includes(manager.goal));
    setWorkingHours(manager.workingHours);
    setCustomHours(!WORKING_HOURS.includes(manager.workingHours));
    setAutopilotMode(manager.autopilotMode || 'assisted');
    setBrandId(manager.brandId || '');
    setPostTo(Array.isArray(manager.postTo) ? manager.postTo : []);
    if (isPresetFrequency(manager.postingFrequency)) {
      setPostingFrequency(manager.postingFrequency);
      setUseCustomFrequency(false);
    } else {
      setUseCustomFrequency(true);
      setPostingFrequency(manager.postingFrequency);
      const match = String(manager.postingFrequency).match(/(\d+)\s*posts?\s*\/\s*(day|week)/i);
      if (match) {
        setCustomCount(Number(match[1]));
        setCustomPeriod(match[2].toLowerCase() === 'week' ? 'week' : 'day');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setAiName(EMPTY_FORM.aiName);
    setRole(EMPTY_FORM.role);
    setPersonality(EMPTY_FORM.personality);
    setGoal(EMPTY_FORM.goal);
    setWorkingHours(EMPTY_FORM.workingHours);
    setPostingFrequency(EMPTY_FORM.postingFrequency);
    setAutopilotMode(EMPTY_FORM.autopilotMode);
    setUseCustomFrequency(false);
    setCustomPersonality(false);
    setCustomGoal(false);
    setCustomHours(false);
    setBrandId(brands[0]?.id || '');
    setPostTo([]);
    setMode('form');
  };

  const applyList = (items: HiredManager[], nextId?: string | null) => {
    setManagers(items);
    const pick = items.find((item) => item.id === nextId)
      || items.find((item) => item.isActive)
      || items[0]
      || null;
    setSelectedId(pick?.id || null);
    if (pick) {
      applyForm(pick);
      setMode('view');
    } else {
      resetForm();
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await authenticatedFetch('/api/auth/ai-manager');
        const json = await res.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        const nextBrands = Array.isArray(json?.data?.brands) ? json.data.brands : [];
        setBrands(nextBrands);
        const socials = Array.isArray(json?.data?.socialAccounts) ? json.data.socialAccounts : [];
        setConnectedPlatforms(socials.filter((item: any) => item.connected).map((item: any) => item.platform));
        applyList(items, json?.data?.activeId);
      } catch (err) {
        console.warn('Failed to load AI manager config:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authenticatedFetch]);

  const resolvedFrequency = useCustomFrequency
    ? `${customCount} post${customCount === 1 ? '' : 's'} / ${customPeriod}`
    : postingFrequency;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveWarning(null);
    try {
      setSaving(true);
      const res = await authenticatedFetch('/api/auth/ai-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          name: aiName,
          role,
          personality,
          goal,
          workingHours,
          postingFrequency: resolvedFrequency,
          autopilotMode,
          brandId,
          postTo
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not save AI job description to the database');
      }
      applyList(json.data.items || [], json.data.item?.id || json.data.activeId);
      const warns = Array.isArray(json.data?.warnings) ? json.data.warnings : [];
      setSaveWarning(warns.length ? warns.join(' ') : null);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save AI manager setup');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this AI job description? You can hire another anytime.')) return;
    setSaveError(null);
    try {
      setDeleting(true);
      const res = await authenticatedFetch(`/api/auth/ai-manager/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not delete AI job description');
      }
      applyList(json.data.items || [], json.data.activeId);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleActivate = async (id: string) => {
    setSelectedId(id);
    const manager = managers.find((item) => item.id === id);
    if (manager) applyForm(manager);
    setMode('view');
    try {
      const res = await authenticatedFetch(`/api/auth/ai-manager/${id}/activate`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data.items)) {
        applyList(json.data.items, id);
      }
    } catch (err) {
      console.warn('Failed to set active AI:', err);
    }
  };

  const startHireAnother = () => {
    resetForm();
  };

  const startEdit = (manager: HiredManager) => {
    setEditingId(manager.id);
    applyForm(manager);
    setMode('form');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl w-full min-w-0">
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-[11px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
            <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>AI Employee</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow">
            {managers.length ? 'Your hired AI managers' : 'Hire Your AI Social Manager'}
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-0.5 sm:mt-1">
            Hire more than one AI, switch who is working, and edit or delete any job description.
          </p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-lg shrink-0">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>

      {loading && (
        <p className="text-xs text-white/50">Loading saved job descriptions…</p>
      )}

      {!loading && managers.length > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Working AI
              </label>
              <GlassSelect
                options={managers.map((item) => ({
                  value: item.id,
                  label: `${item.name} — ${item.role}${item.isActive ? ' (active)' : ''}`
                }))}
                value={selectedId || ''}
                onChange={(val) => handleActivate(val)}
              />
            </div>
            <button
              type="button"
              onClick={startHireAnother}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs text-white font-semibold flex items-center justify-center gap-1.5 backdrop-blur-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Hire another
            </button>
          </div>

          <div className="space-y-2">
            {managers.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleActivate(item.id)}
                className={`w-full text-left p-3.5 rounded-xl border backdrop-blur-md transition-all ${
                  selectedId === item.id
                    ? 'bg-white/20 border-white/40 shadow-lg'
                    : 'bg-black/30 border-white/15 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{item.name}</span>
                      {item.isActive && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white/80">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/65 mt-0.5">{item.role} · {item.postingFrequency}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && selected && mode === 'view' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-white">{selected.name}</div>
              <div className="text-sm text-white/70">{selected.role}</div>
              {selected.hiredAt && (
                <div className="text-[11px] text-white/45 mt-1">
                  Hired {new Date(selected.hiredAt).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startEdit(selected)}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white hover:bg-white/15 flex items-center gap-1.5 backdrop-blur-md"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selected.id)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white hover:bg-white/15 flex items-center gap-1.5 backdrop-blur-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>

          {saved && (
            <span className="inline-flex text-xs font-semibold text-white items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
              <Check className="w-4 h-4 text-white" />
              Saved to your account
            </span>
          )}
          {saveError && <p className="text-xs text-red-300">{saveError}</p>}
          {saveWarning && <p className="text-xs text-white/70">{saveWarning} Start/stop lives in Agent Runs.</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['Voice', selected.personality],
              ['Goal', selected.goal],
              ['Brand', selected.brandName || 'Not linked'],
              ['Posts to', (selected.postTo || []).map((id) => PLATFORM_OPTIONS.find((p) => p.id === id)?.label || id).join(', ') || 'Not set'],
              ['Posting frequency', selected.postingFrequency],
              ['Working hours', selected.workingHours],
              ['Control level', MODE_LABELS[selected.autopilotMode] || selected.autopilotMode],
            ].map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl bg-black/30 border border-white/15 backdrop-blur-md">
                <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
                <div className="text-sm text-white mt-1">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && mode === 'form' && (
      <form onSubmit={handleSave} className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/60">
            {editingId ? 'Editing this job description.' : managers.length ? 'Hiring another AI manager.' : 'Set the job, voice, and posting rhythm.'}
          </p>
          {managers.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (selected) {
                  applyForm(selected);
                  setMode('view');
                }
              }}
              className="text-xs text-white/70 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">AI Manager Name</label>
            <input
              type="text"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-sm text-white focus:outline-none focus:border-white shadow-inner"
              placeholder="e.g. Alex"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Primary Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-sm text-white focus:outline-none focus:border-white shadow-inner"
              placeholder="e.g. Social Media Manager"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Personality & Voice</label>
            <GlassSelect
              options={[...PERSONALITY_PRESETS, 'Other…']}
              value={customPersonality ? 'Other…' : personality}
              onChange={(val) => {
                if (val === 'Other…') {
                  setCustomPersonality(true);
                  if (PERSONALITY_PRESETS.includes(personality)) setPersonality('');
                } else {
                  setCustomPersonality(false);
                  setPersonality(val);
                }
              }}
            />
            {customPersonality && (
              <input
                type="text"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Describe the voice you want"
                className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-sm text-white focus:outline-none focus:border-white"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Primary Goal</label>
            <GlassSelect
              options={[...GOAL_PRESETS, 'Other…']}
              value={customGoal ? 'Other…' : goal}
              onChange={(val) => {
                if (val === 'Other…') {
                  setCustomGoal(true);
                  if (GOAL_PRESETS.includes(goal)) setGoal('');
                } else {
                  setCustomGoal(false);
                  setGoal(val);
                }
              }}
            />
            {customGoal && (
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What should this AI optimize for?"
                className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-sm text-white focus:outline-none focus:border-white"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Brand this AI works for</label>
          {brands.length ? (
            <GlassSelect
              options={brands.map((item) => ({ value: item.id, label: item.brandName || 'Untitled brand' }))}
              value={brandId}
              onChange={setBrandId}
            />
          ) : (
            <p className="text-xs text-white/60">Save a Brand Brain first. This AI must be linked to a brand before it can run.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Where should this AI post?</label>
          <p className="text-[11px] text-white/55 mb-2">Pick where this AI should post. Unconnected accounts can still be saved — the AI will not run until they are linked.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PLATFORM_OPTIONS.map((item) => {
              const connected = connectedPlatforms.includes(item.id);
              const selectedDest = postTo.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPostTo((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]);
                  }}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    selectedDest
                      ? 'bg-white/20 border-white/40 text-white'
                      : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                  }`}
                >
                  <div className="text-xs font-semibold">{item.label}</div>
                  <div className="text-[10px] mt-0.5">{connected ? (selectedDest ? 'Selected' : 'Connected') : 'Not connected yet'}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider">
              Posting Frequency
            </label>
            <span className="text-[11px] font-mono text-white/70">{resolvedFrequency}</span>
          </div>
          <p className="text-xs text-white/60 -mt-1">
            How often the agentic AI should publish on your connected accounts.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {FREQUENCY_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setUseCustomFrequency(false);
                  setPostingFrequency(item.id);
                }}
                className={`p-4 rounded-xl text-left border transition-all ${
                  !useCustomFrequency && postingFrequency === item.id
                    ? 'bg-white/20 border-white/40 text-white shadow-lg backdrop-blur-md'
                    : 'bg-black/30 border-white/15 text-white/70 hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <div className="text-xs font-bold text-white mb-1">{item.label}</div>
                <div className="text-[11px] leading-relaxed text-white/70">{item.desc}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCustomFrequency(true)}
              className={`p-4 rounded-xl text-left border transition-all ${
                useCustomFrequency
                  ? 'bg-white/20 border-white/40 text-white shadow-lg backdrop-blur-md'
                  : 'bg-black/30 border-white/15 text-white/70 hover:bg-white/10 backdrop-blur-sm'
              }`}
            >
              <div className="text-xs font-bold text-white mb-1">Custom</div>
              <div className="text-[11px] leading-relaxed text-white/70">Set your own count and interval</div>
            </button>
          </div>

          {useCustomFrequency && (
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/20">
              <span className="text-xs text-white/70">Publish</span>
              <input
                type="number"
                min={1}
                max={24}
                value={customCount}
                onChange={(e) => setCustomCount(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                className="w-20 px-3 py-2 rounded-xl bg-slate-950/70 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
              />
              <span className="text-xs text-white/70">post{customCount === 1 ? '' : 's'} per</span>
              <GlassSelect
                compact
                className="w-28"
                options={['day', 'week']}
                value={customPeriod}
                onChange={(val) => setCustomPeriod(val as 'day' | 'week')}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Working Hours
            </span>
          </label>
          <GlassSelect
            options={[...WORKING_HOURS, 'Other…']}
            value={customHours ? 'Other…' : workingHours}
            onChange={(val) => {
              if (val === 'Other…') {
                setCustomHours(true);
                if (WORKING_HOURS.includes(workingHours)) setWorkingHours('');
              } else {
                setCustomHours(false);
                setWorkingHours(val);
              }
            }}
          />
          {customHours && (
            <input
              type="text"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              placeholder="e.g. Tue–Thu 10:00–16:00"
              className="mt-2 w-full px-4 py-2.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/20 text-sm text-white focus:outline-none focus:border-white"
            />
          )}
        </div>

        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider">Autopilot Control Level</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'approval', label: 'Mode 1: Approval Required', desc: 'AI generates drafts; human approval required before publishing.' },
              { id: 'assisted', label: 'Mode 2: Assisted Autopilot', desc: 'High-confidence actions publish automatically; sensitive actions prompt approval.' },
              { id: 'autonomous', label: 'Mode 3: Autonomous Manager', desc: 'AI creates, schedules, publishes, and engages independently based on rules.' }
            ].map(item => (
              <div
                key={item.id}
                onClick={() => setAutopilotMode(item.id as HiredManager['autopilotMode'])}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  autopilotMode === item.id 
                    ? 'bg-white/20 border-white/40 text-white shadow-lg backdrop-blur-md' 
                    : 'bg-black/30 border-white/15 text-white/70 hover:bg-white/10 backdrop-blur-sm'
                }`}
              >
                <div className="text-xs font-bold text-white mb-1">{item.label}</div>
                <div className="text-[11px] leading-relaxed text-white/70">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {saveError && (
            <span className="text-xs text-red-300">{saveError}</span>
          )}
          {saveWarning && !saveError && (
            <span className="text-xs text-white/70">{saveWarning}</span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-6 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-semibold flex items-center gap-2 transition-all shadow-xl"
          >
            <Save className="w-4 h-4 text-black" />
            <span>{saving ? 'Saving…' : editingId ? 'Update job description' : 'Save AI Job Description'}</span>
          </button>
        </div>
      </form>
      )}

      {!loading && (
        <WhatsAppChat
          channel="hire-ai"
          title={selected?.name || 'Hired AI'}
          placeholder="Ask your hired AI…"
          managerId={selected?.id}
          brandId={selected?.brandId}
        />
      )}
    </div>
  );
};
