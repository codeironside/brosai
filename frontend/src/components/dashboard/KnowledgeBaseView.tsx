import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Brain, Globe, Upload, Sparkles, Check, FileText, Plus, Trash2, Save, Pencil } from 'lucide-react';
import { GlassSelect } from '../common/GlassSelect';
import { WhatsAppChat } from '../common/WhatsAppChat';

const TONE_PRESETS = [
  'Professional yet conversational',
  'Friendly and warm',
  'Bold and direct',
  'Educational and calm',
  'Faith-forward and welcoming',
];

const PILLAR_SUGGESTIONS = ['Educational', 'Promotional', 'Community', 'Behind the scenes', 'Testimonials', 'Product updates'];
const RULE_SUGGESTIONS = ['Never discuss politics', 'Never use profanity', 'Do not mention unverified prices', 'Never respond to complaints automatically'];
const GOAL_SUGGESTIONS = ['Generate leads', 'Build trust', 'Educate the audience', 'Promote products', 'Grow community'];

function ChipEditor({
  label,
  hint,
  values,
  suggestions,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = (value: string) => {
    const next = value.trim();
    if (!next || values.includes(next)) return;
    onChange([...values, next]);
    setDraft('');
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">{label}</label>
      <p className="text-[11px] text-white/50 mb-2">{hint}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((item) => (
          <span key={item} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] text-white">
            {item}
            <button type="button" onClick={() => onChange(values.filter((v) => v !== item))} className="text-white/50 hover:text-white">
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add your own…"
          className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white flex items-center justify-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {suggestions.filter((item) => !values.includes(item)).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => add(item)}
            className="px-2 py-1 rounded-full bg-black/30 border border-white/15 text-[10px] text-white/70 hover:text-white"
          >
            + {item}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SavedBrand {
  id: string;
  brandName: string;
  industry: string;
  description: string;
  productsServices: string;
  targetAudience: string;
  goals: string[];
  topics: string[];
  voiceTone: string;
  differentiator: string;
  contentPillars: string[];
  restrictions: string[];
  website: string;
  customNotes: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const KnowledgeBaseView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [brands, setBrands] = useState<SavedBrand[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'form'>('form');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [productsServices, setProductsServices] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [voiceTone, setVoiceTone] = useState(TONE_PRESETS[0]);
  const [customTone, setCustomTone] = useState(false);
  const [differentiator, setDifferentiator] = useState('');
  const [contentPillars, setContentPillars] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selected = brands.find((item) => item.id === selectedId) || null;

  const applyBrand = (brain: SavedBrand) => {
    setBrandName(brain.brandName || '');
    setIndustry(brain.industry || '');
    setDescription(brain.description || '');
    setProductsServices(brain.productsServices || '');
    setTargetAudience(brain.targetAudience || '');
    setGoals(Array.isArray(brain.goals) ? brain.goals : []);
    setTopics(Array.isArray(brain.topics) ? brain.topics : []);
    setVoiceTone(brain.voiceTone || TONE_PRESETS[0]);
    setCustomTone(Boolean(brain.voiceTone && !TONE_PRESETS.includes(brain.voiceTone)));
    setDifferentiator(brain.differentiator || '');
    setContentPillars(Array.isArray(brain.contentPillars) ? brain.contentPillars : []);
    setRestrictions(Array.isArray(brain.restrictions) ? brain.restrictions : []);
    setWebsiteUrl(brain.website || '');
    setCustomNotes(brain.customNotes || '');
  };

  const resetBrandForm = () => {
    setEditingId(null);
    setBrandName('');
    setIndustry('');
    setDescription('');
    setProductsServices('');
    setTargetAudience('');
    setGoals([]);
    setTopics([]);
    setVoiceTone(TONE_PRESETS[0]);
    setCustomTone(false);
    setDifferentiator('');
    setContentPillars([]);
    setRestrictions([]);
    setWebsiteUrl('');
    setCustomNotes('');
    setMode('form');
  };

  const applyList = (items: SavedBrand[], nextId?: string | null) => {
    setBrands(items);
    const pick = items.find((item) => item.id === nextId)
      || items.find((item) => item.isActive)
      || items[0]
      || null;
    setSelectedId(pick?.id || null);
    if (pick) {
      applyBrand(pick);
      setEditingId(pick.id);
      setMode('view');
    } else {
      resetBrandForm();
    }
  };

  const [analyzingWeb, setAnalyzingWeb] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [indexing, setIndexing] = useState(false);
  const [indexedSuccess, setIndexedSuccess] = useState(false);
  const [memories, setMemories] = useState<Array<{ id: string; title: string; category: string; sourceType: string; preview: string }>>([]);

  const loadMemories = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/knowledge-base');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setMemories(json.data);
    } catch (err) {
      console.warn('Failed to load brand memory:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await authenticatedFetch('/api/auth/brand-brain');
        const json = await res.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        applyList(items, json?.data?.activeId);
      } catch (err) {
        console.warn('Failed to load brand brain:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    loadMemories();
  }, [authenticatedFetch]);

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      setSaving(true);
      const res = await authenticatedFetch('/api/auth/brand-brain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          brandName,
          industry,
          description,
          productsServices,
          targetAudience,
          goals,
          topics,
          voiceTone,
          differentiator,
          contentPillars,
          restrictions,
          website: websiteUrl,
          customNotes
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not save Brand Brain to the database');
      }
      applyList(json.data.items || [], json.data.item?.id || json.data.activeId);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      await loadMemories();
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save Brand Brain');
    } finally {
      setSaving(false);
    }
  };

  const handleWebsiteAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl) return;
    try {
      setAnalyzingWeb(true);
      const res = await authenticatedFetch('/api/auth/website-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, brandId: editingId || selectedId })
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.voiceTone) {
          setVoiceTone(json.data.voiceTone);
          setCustomTone(!TONE_PRESETS.includes(json.data.voiceTone));
        }
        if (json.data.targetAudience) setTargetAudience(json.data.targetAudience);
        if (Array.isArray(json.data.contentPillars)) setContentPillars(json.data.contentPillars);
      }
    } catch (err) {
      console.warn('Website intelligence analysis warning:', err);
    } finally {
      setAnalyzingWeb(false);
    }
  };

  const handleIndexDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docContent) return;
    try {
      setIndexing(true);
      const res = await authenticatedFetch('/api/auth/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle, content: docContent, category: 'Company Document' })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save document');
      }
      setIndexedSuccess(true);
      setDocTitle('');
      setDocContent('');
      setTimeout(() => setIndexedSuccess(false), 3000);
      await loadMemories();
    } catch (err) {
      console.warn('Document indexing warning:', err);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl w-full min-w-0">
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-[11px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
            <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            <span>Brand memory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow">
            {brands.length ? 'Your Brand Brains' : 'Tell the AI about your brand'}
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-0.5 sm:mt-1">
            Save more than one brand. Switch which one the AI uses, then edit or delete anytime.
          </p>
        </div>
      </div>

      {loading && <p className="text-xs text-white/50">Loading saved brands…</p>}

      {!loading && brands.length > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Active brand
              </label>
              <GlassSelect
                options={brands.map((item) => ({ value: item.id, label: `${item.brandName || 'Untitled brand'}${item.isActive ? ' (Active)' : ''}` }))}
                value={selectedId || ''}
                onChange={async (id) => {
                  setSelectedId(id);
                  const brain = brands.find((item) => item.id === id);
                  if (brain) {
                    applyBrand(brain);
                    setEditingId(brain.id);
                    setMode('view');
                  }
                  try {
                    const res = await authenticatedFetch(`/api/auth/brand-brain/${id}/activate`, { method: 'PATCH' });
                    const json = await res.json();
                    if (json.success && Array.isArray(json.data.items)) {
                      applyList(json.data.items, id);
                    }
                  } catch (err) {
                    console.warn('Failed to set active brand:', err);
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={resetBrandForm}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs text-white font-semibold flex items-center justify-center gap-1.5 backdrop-blur-md"
            >
              <Plus className="w-3.5 h-3.5" />
              Add another brand
            </button>
          </div>
          <div className="space-y-2">
            {brands.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={async () => {
                  setSelectedId(item.id);
                  applyBrand(item);
                  setEditingId(item.id);
                  setMode('view');
                  try {
                    const res = await authenticatedFetch(`/api/auth/brand-brain/${item.id}/activate`, { method: 'PATCH' });
                    const json = await res.json();
                    if (json.success && Array.isArray(json.data.items)) {
                      applyList(json.data.items, item.id);
                    }
                  } catch (err) {
                    console.warn('Failed to set active brand:', err);
                  }
                }}
                className={`w-full text-left p-3.5 rounded-xl border backdrop-blur-md transition-all ${
                  selectedId === item.id
                    ? 'bg-white/20 border-white/40 shadow-lg'
                    : 'bg-black/30 border-white/15 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate">{item.brandName || 'Untitled brand'}</span>
                  {item.isActive && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white/80">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/65 mt-0.5 truncate">
                  {item.industry || 'No category'}{item.targetAudience ? ` · ${item.targetAudience}` : ''}
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
              <div className="text-lg font-semibold text-white">{selected.brandName || 'Untitled brand'}</div>
              <div className="text-sm text-white/70">{selected.industry || 'No category yet'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  applyBrand(selected);
                  setEditingId(selected.id);
                  setMode('form');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white hover:bg-white/15 flex items-center gap-1.5 backdrop-blur-md"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!window.confirm('Delete this Brand Brain? You can add another later.')) return;
                  try {
                    setDeleting(true);
                    const res = await authenticatedFetch(`/api/auth/brand-brain/${selected.id}`, { method: 'DELETE' });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok || !json.success) throw new Error(json.error || 'Could not delete Brand Brain');
                    applyList(json.data.items || [], json.data.activeId);
                    await loadMemories();
                  } catch (err: any) {
                    setSaveError(err?.message || 'Failed to delete');
                  } finally {
                    setDeleting(false);
                  }
                }}
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
              Brand Brain saved to your account
            </span>
          )}
          {saveError && <p className="text-xs text-red-300">{saveError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['What you do', selected.description],
              ['Audience', selected.targetAudience],
              ['Tone', selected.voiceTone],
              ['Offerings', selected.productsServices],
            ].filter(([, value]) => value).map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl bg-black/30 border border-white/15 backdrop-blur-md">
                <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
                <div className="text-sm text-white mt-1">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && mode === 'form' && (
      <form onSubmit={handleSaveBrand} className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-5">
        {brands.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/60">
              {editingId ? 'Editing this Brand Brain.' : 'Adding another brand.'}
            </p>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  applyBrand(selected);
                  setEditingId(selected.id);
                  setMode('view');
                }}
                className="text-xs text-white/70 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Brand / name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Northstar Studio"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">What kind of account is this?</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Business, creator, church, school, other…"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">What do you do?</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="In plain language, what should the AI understand about you or your organization?"
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Products, services, or offerings</label>
          <textarea
            rows={2}
            value={productsServices}
            onChange={(e) => setProductsServices(e.target.value)}
            placeholder="What do you sell, offer, or talk about?"
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Who is your audience?</label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. Small business owners, church members, students…"
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
        </div>

        <ChipEditor
          label="Goals"
          hint="Pick suggestions or type your own."
          values={goals}
          suggestions={GOAL_SUGGESTIONS}
          onChange={setGoals}
        />

        <ChipEditor
          label="Topics you normally talk about"
          hint="The AI will stay around these themes unless you add more."
          values={topics}
          suggestions={PILLAR_SUGGESTIONS}
          onChange={setTopics}
        />

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Tone of voice</label>
          <GlassSelect
            options={[...TONE_PRESETS, 'Other…']}
            value={customTone ? 'Other…' : voiceTone}
            onChange={(val) => {
              if (val === 'Other…') {
                setCustomTone(true);
                if (TONE_PRESETS.includes(voiceTone)) setVoiceTone('');
              } else {
                setCustomTone(false);
                setVoiceTone(val);
              }
            }}
          />
          {customTone && (
            <input
              type="text"
              value={voiceTone}
              onChange={(e) => setVoiceTone(e.target.value)}
              placeholder="Describe the tone in your own words"
              className="mt-2 w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">What makes you different?</label>
          <textarea
            rows={2}
            value={differentiator}
            onChange={(e) => setDifferentiator(e.target.value)}
            placeholder="Anything the AI should emphasize that competitors don’t."
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
        </div>

        <ChipEditor
          label="Content mix"
          hint="How the calendar should feel. Add any mix you want."
          values={contentPillars}
          suggestions={PILLAR_SUGGESTIONS}
          onChange={setContentPillars}
        />

        <ChipEditor
          label="What the AI must never say or do"
          hint="These rules are saved and enforced before posting or replying."
          values={restrictions}
          suggestions={RULE_SUGGESTIONS}
          onChange={setRestrictions}
        />

        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">Anything else?</label>
          <textarea
            rows={3}
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Other instructions, seasonal notes, campaign focus, or things that don’t fit the fields above."
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
      </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {saved && (
            <span className="text-xs font-semibold text-white flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
              <Check className="w-4 h-4 text-white" />
              <span>Brand Brain saved to your account</span>
            </span>
          )}
          {saveError && <span className="text-xs text-red-300">{saveError}</span>}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-6 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-semibold flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-black" />
            <span>{saving ? 'Saving…' : editingId ? 'Update Brand Brain' : 'Save Brand Brain'}</span>
          </button>
        </div>
      </form>
      )}

      {!loading && mode === 'form' && (
      <>
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-3 sm:space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-white uppercase tracking-wider">
          <Globe className="w-4 h-4 text-white" />
          <span>Learn from your website (optional)</span>
        </div>
        <form onSubmit={handleWebsiteAnalyze} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://www.yourcompany.com"
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={analyzingWeb}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>{analyzingWeb ? 'Reading site…' : 'Fill from website'}</span>
          </button>
        </form>
      </div>

      <form onSubmit={handleIndexDocument} className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-white uppercase tracking-wider">
          <Upload className="w-4 h-4 text-white" />
          <span>Add examples or documents (optional)</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">Title</label>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="e.g. Brand voice examples"
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">Paste text, FAQs, or past posts</label>
          <textarea
            rows={4}
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder="The AI will use this as extra brand memory."
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-white"
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          {indexedSuccess && (
            <span className="text-xs font-semibold text-white flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
              <Check className="w-4 h-4 text-white" />
              <span>Saved to brand memory</span>
            </span>
          )}
          <button
            type="submit"
            disabled={indexing}
            className="ml-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-semibold flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-black" />
            <span>{indexing ? 'Saving…' : 'Save document'}</span>
          </button>
        </div>
      </form>
      </>
      )}

      {memories.length > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-3">
          <div className="text-xs font-semibold text-white uppercase tracking-wider">Saved brand memory</div>
          <div className="space-y-2">
            {memories.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-black/30 border border-white/15">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">{item.category}</div>
                  <p className="text-[11px] text-white/70 mt-1 line-clamp-2">{item.preview}</p>
                </div>
                {item.sourceType !== 'brand_profile' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await authenticatedFetch(`/api/auth/knowledge-base/${item.id}`, { method: 'DELETE' });
                      await loadMemories();
                    }}
                    className="text-white/50 hover:text-white shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <WhatsAppChat
        channel="brand-brain"
        title={selected?.brandName || 'Brand Brain'}
        placeholder="Ask about your brand…"
        brandId={selected?.id}
      />
    </div>
  );
};
