import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GlassSelect } from '../common/GlassSelect';
import {
  Brain,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Globe,
  BookOpen,
  Volume2,
  Target,
  Sliders,
  Languages,
  ShieldAlert
} from 'lucide-react';

const INDUSTRY_OPTIONS = [
  'B2B SaaS & Enterprise Tech',
  'E-Commerce & DTC Retail',
  'Digital Marketing & Growth Agency',
  'Fintech, Banking & Crypto',
  'Health, Wellness & Fitness',
  'Creator, Media & Personal Brand',
  'Professional Services & Consulting',
  'Other...'
];

const VOICE_TONE_OPTIONS = [
  'Professional & Authoritative',
  'Friendly, Warm & Approachable',
  'Bold, Punchy & Disruptive',
  'Educational & Data-Driven',
  'Witty, Humor-Infused & Casual',
  'Inspirational & Motivational',
  'Other...'
];

const TARGET_AUDIENCE_OPTIONS = [
  'B2B Founders, CEOs & Executives',
  'Marketing & Growth Managers',
  'Software Engineers & Tech Leaders',
  'Small Business Owners & Entrepreneurs',
  'Gen Z & Millennial Consumers',
  'Freelancers & Independent Creators',
  'Other...'
];

const PRIMARY_GOAL_OPTIONS = [
  'Lead Generation & Inbound Inquiries',
  'Brand Awareness & Industry Reach',
  'Community Engagement & High Comments',
  'Thought Leadership & Domain Authority',
  'Customer Education & Product Adoption'
];

const LANGUAGE_OPTIONS = [
  'English (US)',
  'English (UK)',
  'Spanish (Español)',
  'French (Français)',
  'German (Deutsch)',
  'Portuguese (Português)'
];

const FORBIDDEN_PRESETS = [
  'Never make unverified pricing or discount promises',
  'Never guarantee specific financial ROI or revenue numbers',
  'Never mention or criticize direct competitor brands',
  'Never discuss political, religious, or controversial topics',
  'Never post content without prior fact verification'
];

export const BrandBrainView: React.FC = () => {
  const { brandBrain, setBrandBrain, addLog } = useApp();

  const [newRule, setNewRule] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState(brandBrain.websiteUrl || 'https://brandbuilder.io');
  const [isScanningWebsite, setIsScanningWebsite] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [customIndustry, setCustomIndustry] = useState(!INDUSTRY_OPTIONS.includes(brandBrain.industry));
  const [customTone, setCustomTone] = useState(!VOICE_TONE_OPTIONS.includes(brandBrain.voiceTone));
  const [customAudience, setCustomAudience] = useState(!TARGET_AUDIENCE_OPTIONS.includes(brandBrain.targetAudience));

  const handleScanWebsite = () => {
    setIsScanningWebsite(true);
    setTimeout(() => {
      setIsScanningWebsite(false);
      setBrandBrain(prev => ({
        ...prev,
        description: 'Empowering business owners to save 20+ hours weekly with AI automation.',
        contentPillars: Array.from(new Set([...prev.contentPillars, 'AI Workflows', 'Business Operations']))
      }));
      addLog('AI Social Manager', 'WEBSITE_INGESTION', `Scanned and learned brand context from ${websiteUrl}`, 'success');
    }, 1200);
  };

  const handleAddRule = (ruleToAdd?: string) => {
    const rule = ruleToAdd || newRule;
    if (!rule.trim()) return;
    if (brandBrain.forbiddenRules.includes(rule.trim())) return;
    setBrandBrain(prev => ({ ...prev, forbiddenRules: [...prev.forbiddenRules, rule.trim()] }));
    if (!ruleToAdd) setNewRule('');
    addLog('User (Jeremiah)', 'ADD_FORBIDDEN_RULE', `Added forbidden AI rule: "${rule.trim()}"`, 'warning');
  };

  const handleRemoveRule = (index: number) => {
    setBrandBrain(prev => ({ ...prev, forbiddenRules: prev.forbiddenRules.filter((_, i) => i !== index) }));
  };

  const handleSaveBrandBrain = () => {
    setSaveSuccess(true);
    addLog('User (Jeremiah)', 'SAVE_BRAND_BRAIN', 'Updated persistent AI Brand Memory profile', 'success');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            <Brain className="w-4 h-4 text-brand-400" />
            <span>Persistent Brand Memory</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Brand Brain 🧠
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            The AI continuously understands who you are, what you sell, who you serve, how you speak, and what it must never say.
          </p>
        </div>

        <button
          onClick={handleSaveBrandBrain}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 flex items-center space-x-2 backdrop-blur-md transition-all self-start md:self-auto"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Brand Profile</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center space-x-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Brand Brain profile successfully saved and deployed to AI Manager memory!</span>
        </div>
      )}

      {/* Website Scanner Card */}
      <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 shadow-2xl space-y-3">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Website & Ingestion Scanner</h2>
        </div>
        <p className="text-xs text-slate-300">
          Enter your website URL. The AI Social Manager will crawl and extract key offerings, value props, and positioning.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="flex-1 bg-slate-950/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 shadow-inner"
            placeholder="https://yourbrand.com"
          />
          <button
            onClick={handleScanWebsite}
            disabled={isScanningWebsite}
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 flex items-center justify-center space-x-2 backdrop-blur-md transition-all disabled:opacity-50 shadow"
          >
            <Sparkles className={`w-3.5 h-3.5 text-brand-400 ${isScanningWebsite ? 'animate-spin' : ''}`} />
            <span>{isScanningWebsite ? 'Scanning Site...' : 'Learn From Site'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Brand Positioning & Glass Dropdowns */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 sm:p-6 shadow-2xl space-y-5">
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2 border-b border-white/10 pb-3">
              <BookOpen className="w-4 h-4 text-brand-400" />
              <span>Brand Identity & Positioning</span>
            </h2>

            {/* Brand Name Input */}
            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1.5 uppercase tracking-wider">Brand Name</label>
              <input
                type="text"
                value={brandBrain.brandName}
                onChange={(e) => setBrandBrain(prev => ({ ...prev, brandName: e.target.value }))}
                className="w-full bg-slate-950/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 shadow-inner transition-all"
              />
            </div>

            {/* Industry Glass Dropdown */}
            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1.5 uppercase tracking-wider">Industry & Category</label>
              <GlassSelect
                options={INDUSTRY_OPTIONS}
                value={customIndustry ? 'Other...' : (brandBrain.industry || INDUSTRY_OPTIONS[0])}
                onChange={(val) => {
                  if (val === 'Other...') {
                    setCustomIndustry(true);
                    if (INDUSTRY_OPTIONS.includes(brandBrain.industry)) setBrandBrain(prev => ({ ...prev, industry: '' }));
                  } else {
                    setCustomIndustry(false);
                    setBrandBrain(prev => ({ ...prev, industry: val }));
                  }
                }}
              />
              {customIndustry && (
                <input
                  type="text"
                  value={brandBrain.industry}
                  onChange={(e) => setBrandBrain(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="Specify custom industry..."
                  className="mt-2 w-full bg-slate-950/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              )}
            </div>

            {/* Voice & Tone Glass Dropdown */}
            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-brand-400" />
                  Personality & Voice Tone
                </span>
              </label>
              <GlassSelect
                options={VOICE_TONE_OPTIONS}
                value={customTone ? 'Other...' : (brandBrain.voiceTone || VOICE_TONE_OPTIONS[0])}
                onChange={(val) => {
                  if (val === 'Other...') {
                    setCustomTone(true);
                    if (VOICE_TONE_OPTIONS.includes(brandBrain.voiceTone)) setBrandBrain(prev => ({ ...prev, voiceTone: '' }));
                  } else {
                    setCustomTone(false);
                    setBrandBrain(prev => ({ ...prev, voiceTone: val }));
                  }
                }}
              />
              {customTone && (
                <input
                  type="text"
                  value={brandBrain.voiceTone}
                  onChange={(e) => setBrandBrain(prev => ({ ...prev, voiceTone: e.target.value }))}
                  placeholder="Describe your brand voice tone..."
                  className="mt-2 w-full bg-slate-950/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              )}
            </div>

            {/* Target Audience Glass Dropdown */}
            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-brand-400" />
                Target Audience & ICP
              </label>
              <GlassSelect
                options={TARGET_AUDIENCE_OPTIONS}
                value={customAudience ? 'Other...' : (brandBrain.targetAudience || TARGET_AUDIENCE_OPTIONS[0])}
                onChange={(val) => {
                  if (val === 'Other...') {
                    setCustomAudience(true);
                    if (TARGET_AUDIENCE_OPTIONS.includes(brandBrain.targetAudience)) setBrandBrain(prev => ({ ...prev, targetAudience: '' }));
                  } else {
                    setCustomAudience(false);
                    setBrandBrain(prev => ({ ...prev, targetAudience: val }));
                  }
                }}
              />
              {customAudience && (
                <input
                  type="text"
                  value={brandBrain.targetAudience}
                  onChange={(e) => setBrandBrain(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="Describe target audience..."
                  className="mt-2 w-full bg-slate-950/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              )}
            </div>

            {/* Primary Goal & Language Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-brand-400" />
                  Primary Objective
                </label>
                <GlassSelect
                  compact
                  options={PRIMARY_GOAL_OPTIONS}
                  value={PRIMARY_GOAL_OPTIONS[0]}
                  onChange={() => {}}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-brand-400" />
                  Brand Language
                </label>
                <GlassSelect
                  compact
                  options={LANGUAGE_OPTIONS}
                  value={LANGUAGE_OPTIONS[0]}
                  onChange={() => {}}
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1.5 uppercase tracking-wider">What does your brand do?</label>
              <textarea
                rows={3}
                value={brandBrain.description}
                onChange={(e) => setBrandBrain(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-slate-950/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Negative Constraints & Presets */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-2 text-rose-400 border-b border-white/10 pb-3">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-white">Negative Constraints ("What AI Must NEVER Say")</h2>
            </div>
            <p className="text-xs text-slate-300">
              Rules strictly enforced by the AI guardrails before any social post or reply is published.
            </p>

            {/* Add Rule Form */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
                placeholder="e.g. Never make pricing promises without approval"
                className="flex-1 bg-slate-950/70 backdrop-blur-md border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 shadow-inner"
              />
              <button
                onClick={() => handleAddRule()}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md transition-all shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Quick Preset Guardrails</span>
              <div className="flex flex-wrap gap-2">
                {FORBIDDEN_PRESETS.map((preset, idx) => {
                  const exists = brandBrain.forbiddenRules.includes(preset);
                  return (
                    <button
                      key={idx}
                      onClick={() => !exists && handleAddRule(preset)}
                      disabled={exists}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border text-left backdrop-blur-md transition-all flex items-center gap-1.5 ${
                        exists
                          ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                          : 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/40'
                      }`}
                    >
                      <span>+ {preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Rules List */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">Enforced Guardrails ({brandBrain.forbiddenRules.length})</span>
              {brandBrain.forbiddenRules.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No rules added yet.</p>
              ) : (
                brandBrain.forbiddenRules.map((rule, idx) => (
                  <div key={idx} className="bg-slate-950/80 backdrop-blur-md border border-rose-500/30 rounded-xl p-3 flex items-center justify-between text-xs shadow">
                    <span className="text-rose-200 font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                      {rule}
                    </span>
                    <button onClick={() => handleRemoveRule(idx)} className="text-slate-400 hover:text-rose-400 p-1 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

