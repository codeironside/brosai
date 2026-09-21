import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Square,
  Trash2,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Tier = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  providerPlanId?: string;
  active: boolean;
  sortOrder?: number;
  limits: Record<string, number | boolean>;
};

type AdminTab = 'overview' | 'provider' | 'tiers' | 'users' | 'brands' | 'jobs' | 'earnings';
type PageMeta = { page: number; totalPages: number; total: number; limit: number };

const PAGE_SIZE = 10;

const blankLimits = () => ({
  maxBrands: 0,
  maxAgents: 0,
  maxSocialAccounts: 0,
  maxJobsPerDay: 0,
  maxAiMessagesPerDay: 0,
  cronEnabled: true,
  imagesEnabled: true,
});

function statusTone(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'succeeded' || s === 'success' || s === 'credited' || s === 'active') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30';
  }
  if (s === 'failed' || s === 'cancelled' || s === 'past_due') {
    return 'bg-red-500/15 text-red-300 border-red-400/30';
  }
  if (s === 'awaiting' || s === 'publishing' || s === 'pending') {
    return 'bg-amber-500/15 text-amber-200 border-amber-400/30';
  }
  return 'bg-white/10 text-white/70 border-white/20';
}

function PaginationBar({
  meta,
  onPage,
  busy,
}: {
  meta: PageMeta;
  onPage: (page: number) => void;
  busy?: boolean;
}) {
  if (meta.totalPages <= 1 && meta.total <= meta.limit) return null;
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 mt-3">
      <div className="text-[11px] text-white/55">
        Showing {from}–{to} of {meta.total}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 border border-white/20 px-2.5 py-1.5 text-[11px] text-white disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <span className="text-[11px] text-white/70 min-w-[4.5rem] text-center">
          {meta.page} / {meta.totalPages}
        </span>
        <button
          type="button"
          disabled={busy || meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 border border-white/20 px-2.5 py-1.5 text-[11px] text-white disabled:opacity-40"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export const AdminView: React.FC = () => {
  const { authenticatedFetch, user } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [commission, setCommission] = useState(0);
  const [paymentProvider, setPaymentProvider] = useState<'monnify' | 'paystack'>('monnify');
  const [providers, setProviders] = useState<Array<{ id: string; configured: boolean }>>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [listBusy, setListBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Tier> | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [jobsPage, setJobsPage] = useState(1);
  const [earningsPage, setEarningsPage] = useState(1);
  const [usersMeta, setUsersMeta] = useState<PageMeta>({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [jobsMeta, setJobsMeta] = useState<PageMeta>({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [earningsMeta, setEarningsMeta] = useState<PageMeta>({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settingsRes = await authenticatedFetch('/api/billing/admin/settings');
      const settingsJson = await settingsRes.json();
      if (!settingsJson.success) throw new Error(settingsJson.error || 'Admin access denied');
      setCommission(Number(settingsJson.data?.referralCommissionPercent ?? 0));
      setPaymentProvider(settingsJson.data?.paymentProvider === 'paystack' ? 'paystack' : 'monnify');
      setProviders(Array.isArray(settingsJson.data?.paymentProviders) ? settingsJson.data.paymentProviders : []);
      setTiers(Array.isArray(settingsJson.data?.tiers) ? settingsJson.data.tiers : []);
      setMetrics(settingsJson.data?.metrics || null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  const loadUsers = useCallback(async (page = 1) => {
    setListBusy(true);
    try {
      const res = await authenticatedFetch(`/api/billing/admin/users?page=${page}&limit=${PAGE_SIZE}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load users');
      setUsers(Array.isArray(json.data?.users) ? json.data.users : []);
      setUsersMeta({
        page: Number(json.data?.page) || page,
        totalPages: Number(json.data?.totalPages) || 1,
        total: Number(json.data?.total) || 0,
        limit: Number(json.data?.limit) || PAGE_SIZE,
      });
      setUsersPage(Number(json.data?.page) || page);
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setListBusy(false);
    }
  }, [authenticatedFetch]);

  const loadJobs = useCallback(async (page = 1) => {
    setListBusy(true);
    try {
      const res = await authenticatedFetch(`/api/billing/admin/jobs?page=${page}&limit=${PAGE_SIZE}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load jobs');
      setJobs(Array.isArray(json.data?.jobs) ? json.data.jobs : []);
      setJobsMeta({
        page: Number(json.data?.page) || page,
        totalPages: Number(json.data?.totalPages) || 1,
        total: Number(json.data?.total) || 0,
        limit: Number(json.data?.limit) || PAGE_SIZE,
      });
      setJobsPage(Number(json.data?.page) || page);
    } catch (err: any) {
      setError(err?.message || 'Failed to load jobs');
    } finally {
      setListBusy(false);
    }
  }, [authenticatedFetch]);

  const loadEarnings = useCallback(async (page = 1) => {
    setListBusy(true);
    try {
      const res = await authenticatedFetch(`/api/billing/admin/earnings?page=${page}&limit=${PAGE_SIZE}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load commissions');
      setEarnings(Array.isArray(json.data?.earnings) ? json.data.earnings : []);
      setEarningsMeta({
        page: Number(json.data?.page) || page,
        totalPages: Number(json.data?.totalPages) || 1,
        total: Number(json.data?.total) || 0,
        limit: Number(json.data?.limit) || PAGE_SIZE,
      });
      setEarningsPage(Number(json.data?.page) || page);
    } catch (err: any) {
      setError(err?.message || 'Failed to load commissions');
    } finally {
      setListBusy(false);
    }
  }, [authenticatedFetch]);

  const loadBrands = useCallback(async () => {
    const res = await authenticatedFetch('/api/billing/admin/brands?limit=300');
    const json = await res.json();
    if (json.success) setBrands(json.data?.brands || []);
  }, [authenticatedFetch]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (tab === 'brands') loadBrands().catch(() => {});
    if (tab === 'users') loadUsers(usersPage).catch(() => {});
    if (tab === 'jobs') loadJobs(jobsPage).catch(() => {});
    if (tab === 'earnings') loadEarnings(earningsPage).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const saveSettings = async (extra?: { paymentProvider?: string; referralCommissionPercent?: number }) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/billing/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCommissionPercent: extra?.referralCommissionPercent ?? commission,
          paymentProvider: extra?.paymentProvider ?? paymentProvider,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Save failed');
      setPaymentProvider(json.data?.paymentProvider === 'paystack' ? 'paystack' : 'monnify');
      setCommission(Number(json.data?.referralCommissionPercent ?? commission));
      setMessage('Settings saved');
      await loadCore();
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveTier = async (tier: Partial<Tier>) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const path = tier._id ? `/api/billing/admin/tiers/${tier._id}` : '/api/billing/admin/tiers';
      const method = tier._id ? 'PUT' : 'POST';
      const res = await authenticatedFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tier, currency: tier.currency || 'NGN' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Tier save failed');
      setDraft(null);
      setMessage('Tier saved');
      await loadCore();
    } catch (err: any) {
      setError(err?.message || 'Tier save failed');
    } finally {
      setSaving(false);
    }
  };

  const deactivateTier = async (id: string) => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(`/api/billing/admin/tiers/${id}/deactivate`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Deactivate failed');
      setMessage('Tier deactivated (hidden from pricing; not deleted)');
      await loadCore();
    } catch (err: any) {
      setError(err?.message || 'Deactivate failed');
    } finally {
      setSaving(false);
    }
  };

  const openUser = async (id: string) => {
    setError(null);
    const res = await authenticatedFetch(`/api/billing/admin/users/${id}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error || 'Could not load user');
      return;
    }
    setSelectedUser(json.data);
    setTab('users');
  };

  const forceTier = async (userId: string, tierSlug: string) => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(`/api/billing/admin/users/${userId}/force-tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierSlug }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Force tier failed');
      setMessage(`Assigned ${tierSlug}`);
      await openUser(userId);
      await loadCore();
    } catch (err: any) {
      setError(err?.message || 'Force tier failed');
    } finally {
      setSaving(false);
    }
  };

  const stopJobs = async (userId: string) => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(`/api/billing/admin/users/${userId}/stop-jobs`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Stop failed');
      setMessage('Jobs stopped for user');
      if (selectedUser?.id === userId) await openUser(userId);
      await loadJobs(jobsPage);
    } catch (err: any) {
      setError(err?.message || 'Stop failed');
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async (userId: string, accountId: string) => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(
        `/api/billing/admin/users/${userId}/social-accounts/${encodeURIComponent(accountId)}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Remove failed');
      setMessage('Social account removed');
      await openUser(userId);
    } catch (err: any) {
      setError(err?.message || 'Remove failed');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin' && String(user?.email || '').toLowerCase() !== 'fury25423@gmail.com') {
    return (
      <div className="p-6 rounded-2xl bg-white/10 border border-white/20 text-sm text-white/70">
        Super-admin access required. Sign out, then sign in again as fury25423@gmail.com so your role refreshes.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/70 text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading Super Admin…
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'provider', label: 'Payments', icon: CreditCard },
    { id: 'tiers', label: 'Tiers', icon: ShieldCheck },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'brands', label: 'All brands', icon: Building2 },
    { id: 'jobs', label: 'All jobs', icon: Briefcase },
    { id: 'earnings', label: 'Commissions', icon: CreditCard },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white/10 border border-white/20 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
          <ShieldCheck className="w-4 h-4" /> Super Admin
        </div>
        <h2 className="text-xl font-bold text-white">Control plane</h2>
        <p className="text-sm text-white/60 mt-1">
          Create tiers, switch Monnify/Paystack, manage users, brands, and jobs. Currency default ₦ NGN.
        </p>
        {error ? <p className="text-sm text-red-300 mt-2">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300 mt-2">{message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          const on = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                on ? 'bg-white text-black border-white' : 'bg-white/10 text-white/80 border-white/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['Users', metrics?.users],
            ['Brands', metrics?.brands],
            ['Agents', metrics?.agents],
            ['Social accounts', metrics?.socialAccounts],
            ['Jobs (runs)', metrics?.jobs],
            ['Crons running', metrics?.cronsRunning],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-white/10 border border-white/15 p-4">
              <div className="text-[10px] uppercase text-white/50">{label}</div>
              <div className="text-2xl font-bold text-white mt-1">{value ?? '—'}</div>
            </div>
          ))}
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4 md:col-span-3">
            <div className="text-[10px] uppercase text-white/50">Active payment provider</div>
            <div className="text-lg font-semibold text-white capitalize mt-1">{paymentProvider}</div>
          </div>
        </div>
      )}

      {tab === 'provider' && (
        <div className="rounded-2xl bg-white/10 border border-white/20 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Payment provider</h3>
          <p className="text-xs text-white/55">
            One-time checkout that renews the subscription period. Switch anytime — new checkouts use the selected provider.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['monnify', 'paystack'] as const).map((id) => {
              const info = providers.find((p) => p.id === id);
              const on = paymentProvider === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentProvider(id)}
                  className={`rounded-xl px-4 py-3 text-left border min-w-[140px] ${
                    on ? 'bg-white text-black border-white' : 'bg-black/30 text-white border-white/20'
                  }`}
                >
                  <div className="text-sm font-semibold capitalize">{id}</div>
                  <div className={`text-[10px] mt-1 ${on ? 'text-black/60' : 'text-white/50'}`}>
                    {info?.configured ? 'Keys configured' : 'Keys missing in env'}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveSettings({ paymentProvider })}
            className="inline-flex items-center gap-1 rounded-xl bg-white text-black px-3 py-2 text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5" /> Save provider
          </button>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <h4 className="text-sm font-semibold text-white">Referral commission %</h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
                className="w-28 rounded-xl bg-black/40 border border-white/20 px-3 py-2 text-white text-sm"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => saveSettings({ referralCommissionPercent: commission })}
                className="inline-flex items-center gap-1 rounded-xl bg-white/20 border border-white/30 px-3 py-2 text-xs font-semibold text-white"
              >
                Save %
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'tiers' && (
        <div className="rounded-2xl bg-white/10 border border-white/20 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Subscription tiers</h3>
              <p className="text-[11px] text-white/50 mt-0.5">
                Deactivate hides a plan from pricing (soft). It is not permanently deleted.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  slug: '',
                  name: '',
                  description: '',
                  price: 0,
                  currency: 'NGN',
                  interval: 'monthly',
                  providerPlanId: '',
                  active: true,
                  sortOrder: tiers.length,
                  limits: blankLimits(),
                })
              }
              className="inline-flex items-center gap-1 rounded-xl bg-white text-black px-3 py-1.5 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> New tier
            </button>
          </div>

          <div className="space-y-3">
            {tiers.map((tier) => (
              <div key={tier._id} className="rounded-xl bg-black/30 border border-white/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {tier.name} <span className="text-white/50 font-normal">({tier.slug})</span>
                      {!tier.active ? <span className="ml-2 text-amber-300 text-[10px]">inactive</span> : null}
                    </div>
                    <div className="text-xs text-white/60">
                      {Number(tier.price) <= 0
                        ? 'Free'
                        : `₦ ${Number(tier.price).toLocaleString()} / ${tier.interval}`}
                    </div>
                    <div className="text-[11px] text-white/50 mt-1">
                      brands {String(tier.limits?.maxBrands)} · agents {String(tier.limits?.maxAgents)} · social{' '}
                      {String(tier.limits?.maxSocialAccounts)} · jobs/day {String(tier.limits?.maxJobsPerDay)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft({ ...tier, limits: { ...blankLimits(), ...tier.limits } })}
                      className="text-xs font-semibold text-white/80 underline"
                    >
                      Edit
                    </button>
                    {tier.active && tier.slug !== 'free' ? (
                      <button
                        type="button"
                        onClick={() => deactivateTier(tier._id)}
                        className="text-xs font-semibold text-amber-300/90 underline"
                      >
                        Deactivate
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {draft ? (
            <div className="rounded-xl border border-white/25 bg-white/10 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase text-white/70">
                {draft._id ? 'Edit tier' : 'Create tier'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  ['slug', 'Slug'],
                  ['name', 'Name'],
                  ['description', 'Description'],
                  ['price', 'Price (₦)'],
                  ['providerPlanId', 'Provider plan id (optional)'],
                ].map(([key, label]) => (
                  <label key={key} className="text-[11px] text-white/60 space-y-1">
                    <span>{label}</span>
                    <input
                      value={String((draft as any)[key] ?? '')}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [key]: key === 'price' ? Number(e.target.value) : e.target.value,
                          currency: 'NGN',
                        }))
                      }
                      className="w-full rounded-lg bg-black/40 border border-white/20 px-2 py-1.5 text-sm text-white"
                    />
                  </label>
                ))}
                <label className="text-[11px] text-white/60 space-y-1">
                  <span>Interval</span>
                  <select
                    value={draft.interval || 'monthly'}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        interval: e.target.value as 'monthly' | 'yearly',
                      }))
                    }
                    className="w-full rounded-lg bg-black/40 border border-white/20 px-2 py-1.5 text-sm text-white"
                  >
                    <option value="monthly">monthly</option>
                    <option value="yearly">yearly</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(
                  [
                    ['maxBrands', 'Max brands'],
                    ['maxAgents', 'Max agents'],
                    ['maxSocialAccounts', 'Max social'],
                    ['maxJobsPerDay', 'Jobs / day'],
                    ['maxAiMessagesPerDay', 'AI msgs / day'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-[11px] text-white/60 space-y-1">
                    <span>{label}</span>
                    <input
                      type="number"
                      value={Number(draft.limits?.[key] ?? 0)}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          limits: { ...blankLimits(), ...prev?.limits, [key]: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-lg bg-black/40 border border-white/20 px-2 py-1.5 text-sm text-white"
                    />
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveTier({ ...draft, currency: 'NGN' })}
                  className="rounded-xl bg-white text-black px-3 py-2 text-xs font-semibold"
                >
                  Save tier
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-xs text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 flex flex-col max-h-[72vh]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Users</h3>
              <span className="text-[11px] text-white/50">{usersMeta.total} total</span>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
              {listBusy && users.length === 0 ? (
                <div className="flex items-center gap-2 text-white/60 text-xs py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-white/50 py-6 text-center">No users yet.</p>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => openUser(u.id)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${
                      selectedUser?.id === u.id
                        ? 'bg-white/20 border-white/40'
                        : 'bg-black/30 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium truncate">{u.name}</div>
                        <div className="text-[11px] text-white/55 truncate">{u.email}</div>
                      </div>
                      <span className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusTone(u.subscriptionStatus)}`}>
                        {u.subscriptionTierSlug || 'free'}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/60 mt-1.5">
                      {u.metrics?.brands || 0} brands · {u.metrics?.jobsTotal || 0} jobs
                      {u.metrics?.jobsRunning ? ' · cron on' : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
            <PaginationBar
              meta={usersMeta}
              busy={listBusy}
              onPage={(p) => {
                setUsersPage(p);
                loadUsers(p);
              }}
            />
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 space-y-3 max-h-[72vh] overflow-y-auto">
            {!selectedUser ? (
              <p className="text-sm text-white/50 py-10 text-center">Select a user to see brands, accounts, jobs, and controls.</p>
            ) : (
              <>
                <div>
                  <div className="text-lg font-semibold text-white">{selectedUser.name}</div>
                  <div className="text-xs text-white/60">{selectedUser.email}</div>
                  <div className="text-xs text-white/70 mt-1 capitalize">
                    Plan {selectedUser.subscriptionTierSlug} · {selectedUser.subscriptionStatus}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tiers.filter((t) => t.active).map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      disabled={saving}
                      onClick={() => forceTier(selectedUser.id, t.slug)}
                      className="rounded-lg bg-white/15 border border-white/20 px-2 py-1 text-[11px] text-white"
                    >
                      Force {t.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => stopJobs(selectedUser.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-400/30 px-2 py-1 text-[11px] text-red-200"
                  >
                    <Square className="w-3 h-3" /> Stop jobs
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-white/80 uppercase mb-1">Brands</h4>
                  {(selectedUser.brands || []).length === 0 ? (
                    <p className="text-[11px] text-white/45">No brands</p>
                  ) : (
                    (selectedUser.brands || []).map((b: any) => (
                      <div key={b.id} className="text-xs text-white/75 border-b border-white/10 py-1">
                        {b.brandName || 'Untitled brand'} · {b.industry || '—'}
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-white/80 uppercase mb-1">Social accounts</h4>
                  {(selectedUser.socialAccounts || []).filter((a: any) => a.connected).length === 0 ? (
                    <p className="text-[11px] text-white/45">No connected accounts</p>
                  ) : (
                    (selectedUser.socialAccounts || [])
                      .filter((a: any) => a.connected)
                      .map((a: any) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2 text-xs text-white/75 border-b border-white/10 py-1.5"
                        >
                          <span>
                            {a.platform} · {a.handle || a.accountId}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAccount(selectedUser.id, a.id)}
                            className="inline-flex items-center gap-1 text-red-300"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-white/80 uppercase mb-1">Jobs</h4>
                  <div className="text-[11px] text-white/50 mb-1">
                    Cron: {selectedUser.cron?.running ? 'running' : 'stopped'} · phase{' '}
                    {selectedUser.cron?.lastPhase || 'idle'}
                  </div>
                  {(selectedUser.jobs || []).slice(0, 30).map((j: any) => (
                    <div key={j.id || j.runId} className="text-xs text-white/75 border-b border-white/10 py-1">
                      {j.agentName || 'Agent'} · {j.status} ·{' '}
                      {j.createdAt ? new Date(j.createdAt).toLocaleString() : '—'}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'brands' && (
        <div className="rounded-2xl bg-white/10 border border-white/20 p-4 max-h-[70vh] overflow-y-auto space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">All brands across users</h3>
            <span className="text-[11px] text-white/50">{brands.length} brand{brands.length === 1 ? '' : 's'}</span>
          </div>
          {brands.length === 0 ? (
            <p className="text-sm text-white/50">No brands found for any user yet.</p>
          ) : (
            brands.map((b) => (
              <div
                key={`${b.userId}-${b.id || b.brandName}`}
                className="rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-xs text-white/80"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-white font-semibold">
                    {b.brandName || 'Untitled brand'}
                    {b.isActive ? (
                      <span className="ml-2 text-[10px] text-emerald-300 font-normal">active</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openUser(b.userId)}
                    className="text-[11px] text-white/60 underline"
                  >
                    Open user
                  </button>
                </div>
                <div className="text-white/55 mt-0.5">
                  {b.userName || 'User'} · {b.userEmail}
                </div>
                <div className="text-white/55 mt-1">
                  {[b.industry, b.website].filter(Boolean).join(' · ') || 'No industry / website set'}
                </div>
                {b.description ? (
                  <div className="text-white/45 mt-1 line-clamp-2">{b.description}</div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="rounded-2xl bg-white/10 border border-white/20 p-4 flex flex-col max-h-[72vh]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">All jobs</h3>
              <p className="text-[11px] text-white/50 mt-0.5">Agent runs across every user</p>
            </div>
            <span className="text-[11px] text-white/50">{jobsMeta.total} total</span>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 space-y-2">
            {listBusy && jobs.length === 0 ? (
              <div className="flex items-center gap-2 text-white/60 text-xs py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading jobs…
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-white/50 py-8 text-center">No jobs yet.</p>
            ) : (
              jobs.map((j) => (
                <div
                  key={`${j.userId}-${j.id || j.runId}-${j.createdAt}`}
                  className="rounded-xl bg-black/35 border border-white/10 px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-white font-semibold">{j.agentName || 'Agent'}</span>
                        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusTone(j.status)}`}>
                          {j.status || 'unknown'}
                        </span>
                        {j.cronRunning ? (
                          <span className="text-[10px] text-amber-300 border border-amber-400/30 rounded-full px-2 py-0.5">
                            cron on
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-white/55 mt-1 truncate">
                        {j.userName || 'User'} · {j.userEmail}
                      </div>
                      {Array.isArray(j.platforms) && j.platforms.length > 0 ? (
                        <div className="text-[11px] text-white/45 mt-1">
                          Platforms: {j.platforms.join(', ')}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-[11px] text-white/55">
                        {j.createdAt ? new Date(j.createdAt).toLocaleString() : '—'}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openUser(j.userId)}
                          className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-1 text-[11px] text-white/80"
                        >
                          View user
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => stopJobs(j.userId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-400/30 px-2.5 py-1 text-[11px] text-red-200"
                        >
                          <Square className="w-3 h-3" /> Stop jobs
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <PaginationBar
            meta={jobsMeta}
            busy={listBusy}
            onPage={(p) => {
              setJobsPage(p);
              loadJobs(p);
            }}
          />
        </div>
      )}

      {tab === 'earnings' && (
        <div className="rounded-2xl bg-white/10 border border-white/20 p-4 flex flex-col max-h-[72vh]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Referral commissions</h3>
              <p className="text-[11px] text-white/50 mt-0.5">Ledger of commissions from subscription payments</p>
            </div>
            <span className="text-[11px] text-white/50">{earningsMeta.total} total</span>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 space-y-2">
            {listBusy && earnings.length === 0 ? (
              <div className="flex items-center gap-2 text-white/60 text-xs py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading commissions…
              </div>
            ) : earnings.length === 0 ? (
              <p className="text-sm text-white/50 py-8 text-center">No commission ledger entries yet.</p>
            ) : (
              earnings.map((row) => (
                <div
                  key={row._id || row.paymentTxRef}
                  className="rounded-xl bg-black/35 border border-white/10 px-3 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-white font-semibold capitalize">
                        {row.tierSlug || 'plan'}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusTone(row.status)}`}>
                        {row.status || 'credited'}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/55 mt-1">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      {row.paymentTxRef ? ` · ${row.paymentTxRef}` : ''}
                    </div>
                    <div className="text-[11px] text-white/45 mt-0.5">
                      Payment ₦ {Number(row.paymentAmount || 0).toLocaleString()} · {row.commissionPercent}%
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-white">
                      ₦ {Number(row.commissionAmount || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/50">commission</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <PaginationBar
            meta={earningsMeta}
            busy={listBusy}
            onPage={(p) => {
              setEarningsPage(p);
              loadEarnings(p);
            }}
          />
        </div>
      )}
    </div>
  );
};
