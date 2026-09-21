import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, ExternalLink, Gift, Loader2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Tier = {
  _id?: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: string;
  limits?: Record<string, number | boolean>;
};

type BillingMe = {
  subscriptionTierSlug: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  limits: Record<string, number | boolean>;
  referralCode: string;
  referralShareUrl: string;
  referral: {
    referredCount: number;
    totalCommission: number;
    currency: string;
    earnings: Array<{
      paymentAmount: number;
      commissionAmount: number;
      commissionPercent: number;
      currency: string;
      createdAt: string;
      tierSlug?: string;
    }>;
  };
};

export const BillingView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [me, setMe] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tiersRes, meRes] = await Promise.all([
        authenticatedFetch('/api/billing/tiers'),
        authenticatedFetch('/api/billing/me'),
      ]);
      const tiersJson = await tiersRes.json();
      const meJson = await meRes.json();
      if (!tiersJson.success) throw new Error(tiersJson.error || 'Could not load tiers');
      if (!meJson.success) throw new Error(meJson.error || 'Could not load billing');
      setTiers(Array.isArray(tiersJson.data?.tiers) ? tiersJson.data.tiers : []);
      setMe(meJson.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const checkout = async (slug: string) => {
    setBusySlug(slug);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierSlug: slug }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Checkout failed');
      if (json.data?.link) {
        window.location.href = json.data.link;
        return;
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Checkout failed');
    } finally {
      setBusySlug(null);
    }
  };

  const copyShare = async () => {
    if (!me?.referralShareUrl) return;
    try {
      await navigator.clipboard.writeText(me.referralShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/70 text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading billing…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/10 border border-white/20 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
          <CreditCard className="w-4 h-4" /> Subscription
        </div>
        <h2 className="text-xl font-bold text-white">Plans & referrals</h2>
        <p className="text-sm text-white/65 mt-1">
          Current plan:{' '}
          <span className="text-white font-semibold capitalize">{me?.subscriptionTierSlug || 'free'}</span>
          {' · '}
          <span className="capitalize">{me?.subscriptionStatus || 'free'}</span>
          {me?.currentPeriodEnd
            ? ` · renews ${new Date(me.currentPeriodEnd).toLocaleDateString()}`
            : ''}
        </p>
        {error ? <p className="text-sm text-red-300 mt-2">{error}</p> : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiers.map((tier) => {
          const current = me?.subscriptionTierSlug === tier.slug;
          return (
            <div
              key={tier.slug}
              className={`rounded-2xl border p-4 backdrop-blur-xl ${
                current ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 text-white font-semibold">
                <Sparkles className="w-4 h-4" />
                {tier.name}
              </div>
              <p className="text-xs text-white/60 mt-1 min-h-[32px]">{tier.description}</p>
              <div className="mt-3 text-2xl font-bold text-white">
                {Number(tier.price) <= 0
                  ? 'Free'
                  : `${tier.currency} ${Number(tier.price).toLocaleString()}`}
                {Number(tier.price) > 0 ? (
                  <span className="text-xs font-normal text-white/55"> / {tier.interval}</span>
                ) : null}
              </div>
              <ul className="mt-3 space-y-1 text-[11px] text-white/70">
                <li>{String(tier.limits?.maxBrands ?? '—')} brands</li>
                <li>{String(tier.limits?.maxAgents ?? '—')} agents</li>
                <li>{String(tier.limits?.maxSocialAccounts ?? '—')} social accounts</li>
                <li>{String(tier.limits?.maxJobsPerDay ?? '—')} jobs / day</li>
              </ul>
              <button
                type="button"
                disabled={current || busySlug === tier.slug}
                onClick={() => checkout(tier.slug)}
                className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  current
                    ? 'bg-white/10 text-white/50 cursor-default'
                    : 'bg-white text-black hover:bg-white/90'
                }`}
              >
                {busySlug === tier.slug ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Opening…
                  </span>
                ) : current ? (
                  'Current plan'
                ) : Number(tier.price) <= 0 ? (
                  'Switch to Free'
                ) : (
                  <span className="inline-flex items-center gap-1">
                    Upgrade <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white/10 border border-white/20 p-5 backdrop-blur-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
          <Gift className="w-4 h-4" /> Refer friends
        </div>
        <p className="text-sm text-white/70">
          Share your link. When someone you referred pays for a subscription, you earn a commission.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <code className="flex-1 text-xs bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white/90 break-all">
            {me?.referralShareUrl || '—'}
          </code>
          <button
            type="button"
            onClick={copyShare}
            className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold"
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <div className="text-[10px] uppercase text-white/50">Referrals</div>
            <div className="text-lg font-semibold">{me?.referral?.referredCount ?? 0}</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <div className="text-[10px] uppercase text-white/50">Commission earned</div>
            <div className="text-lg font-semibold">
              {me?.referral?.currency || 'NGN'}{' '}
              {Number(me?.referral?.totalCommission || 0).toLocaleString()}
            </div>
          </div>
        </div>
        {(me?.referral?.earnings || []).length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {me!.referral.earnings.map((row, idx) => (
              <div
                key={`${row.createdAt}-${idx}`}
                className="flex justify-between text-xs text-white/70 border-b border-white/10 pb-2"
              >
                <span>
                  {row.tierSlug || 'plan'} · {new Date(row.createdAt).toLocaleDateString()}
                </span>
                <span className="text-white font-medium">
                  +{row.currency} {Number(row.commissionAmount).toLocaleString()} ({row.commissionPercent}%)
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/50">No referral earnings yet.</p>
        )}
      </div>
    </div>
  );
};
