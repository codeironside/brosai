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
  badge?: string;
  contactSales?: boolean;
  features?: string[];
  limits?: Record<string, number | boolean>;
};

type CreditPack = {
  slug: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  credits: number;
};

type BillingMe = {
  subscriptionTierSlug: string;
  subscriptionStatus: string;
  subscriptionBypass?: boolean;
  hasAccess?: boolean;
  currentPeriodEnd: string | null;
  limits: Record<string, number | boolean>;
  credits?: {
    monthlyAllowance: number;
    monthlyUsed: number;
    monthlyRemaining: number;
    purchasedBalance: number;
    remaining: number;
    percentUsed: number;
  };
  caps?: {
    socialAccounts: { used: number; max: number };
    aiPosts: { used: number; max: number };
    aiVideos: { used: number; max: number };
    aiReplies: { used: number; max: number };
    schedulingDays: number;
  };
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

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/70">
        <span>{label}</span>
        <span>
          {used} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-black/40 overflow-hidden">
        <div className="h-full rounded-full bg-sky-400/80" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const BillingView: React.FC = () => {
  const { authenticatedFetch } = useApp();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [me, setMe] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tiersRes, meRes, packsRes] = await Promise.all([
        authenticatedFetch('/api/billing/tiers'),
        authenticatedFetch('/api/billing/me'),
        authenticatedFetch('/api/billing/credit-packs'),
      ]);
      const tiersJson = await tiersRes.json();
      const meJson = await meRes.json();
      const packsJson = await packsRes.json();
      if (!tiersJson.success) throw new Error(tiersJson.error || 'Could not load tiers');
      if (!meJson.success) throw new Error(meJson.error || 'Could not load billing');
      setTiers(Array.isArray(tiersJson.data?.tiers) ? tiersJson.data.tiers : []);
      setMe(meJson.data);
      setPacks(Array.isArray(packsJson.data?.packs) ? packsJson.data.packs : []);
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

  const checkoutCredits = async (slug: string) => {
    setBusySlug(`pack:${slug}`);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/billing/checkout/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSlug: slug }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Checkout failed');
      if (json.data?.link) {
        window.location.href = json.data.link;
        return;
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Credit top-up failed');
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

  const credits = me?.credits;
  const caps = me?.caps;
  /** Only after an active plan's credits are fully used (not for inactive / zero-allowance users). */
  const creditsExhausted =
    Boolean(me?.hasAccess) &&
    Boolean(credits) &&
    Number(credits!.monthlyAllowance) > 0 &&
    Number(credits!.remaining) <= 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/10 border border-white/20 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
          <CreditCard className="w-4 h-4" /> Subscription
        </div>
        <h2 className="text-xl font-bold text-white">Plans & usage</h2>
        <p className="text-sm text-white/65 mt-1">
          Current plan:{' '}
          <span className="text-white font-semibold capitalize">
            {me?.subscriptionTierSlug || 'none'}
          </span>
          {' · '}
          <span className="capitalize">{me?.subscriptionStatus || 'inactive'}</span>
          {me?.subscriptionBypass ? ' · bypass' : ''}
          {me?.currentPeriodEnd
            ? ` · renews ${new Date(me.currentPeriodEnd).toLocaleDateString()}`
            : ''}
        </p>
        {!me?.hasAccess ? (
          <p className="text-sm text-amber-200 mt-2">
            Subscribe to Starter or higher to unlock AI and publishing. Super Admin can bypass for selected users.
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-300 mt-2">{error}</p> : null}
      </div>

      {credits ? (
        <div className="rounded-2xl bg-white/10 border border-white/20 p-5 backdrop-blur-xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Your usage</h3>
          <Meter
            label={`AI Credits (${credits.percentUsed}% of monthly)`}
            used={credits.monthlyUsed}
            max={credits.monthlyAllowance}
          />
          <p className="text-xs text-white/55">
            Remaining this month: {credits.monthlyRemaining} · Purchased balance: {credits.purchasedBalance} ·
            Total available: {credits.remaining}
          </p>
          {caps ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Meter label="Social accounts" used={caps.socialAccounts.used} max={caps.socialAccounts.max} />
              <Meter label="AI posts" used={caps.aiPosts.used} max={caps.aiPosts.max} />
              <Meter label="AI videos" used={caps.aiVideos.used} max={caps.aiVideos.max} />
              <Meter label="AI replies" used={caps.aiReplies.used} max={caps.aiReplies.max} />
            </div>
          ) : null}
          <p className="text-xs text-white/50">Scheduling window: {caps?.schedulingDays ?? '—'} days</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {tiers.map((tier) => {
          const current = me?.subscriptionTierSlug === tier.slug && me?.hasAccess;
          const features =
            Array.isArray(tier.features) && tier.features.length > 0
              ? tier.features
              : [
                  `${tier.limits?.maxAiPostsPerMonth ?? '—'} AI posts`,
                  `${tier.limits?.maxSocialAccounts ?? '—'} social accounts`,
                  `${tier.limits?.maxAiVideosPerMonth ?? '—'} AI videos`,
                  `${tier.limits?.monthlyCredits ?? '—'} AI credits`,
                  `${tier.limits?.schedulingDays ?? '—'}-day scheduling`,
                ];
          return (
            <div
              key={tier.slug}
              className={`rounded-2xl border p-4 backdrop-blur-xl relative ${
                current ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20'
              }`}
            >
              {tier.badge ? (
                <span className="absolute -top-2 right-3 text-[10px] font-bold tracking-wide bg-sky-400 text-black px-2 py-0.5 rounded-full">
                  {tier.badge}
                </span>
              ) : null}
              <div className="flex items-center gap-2 text-white font-semibold">
                <Sparkles className="w-4 h-4" />
                {tier.name}
              </div>
              <p className="text-xs text-white/60 mt-1 min-h-[32px]">{tier.description}</p>
              <div className="mt-3 text-2xl font-bold text-white">
                {tier.contactSales
                  ? `${tier.currency} ${Number(tier.price).toLocaleString()}+`
                  : `${tier.currency} ${Number(tier.price).toLocaleString()}`}
                <span className="text-xs font-normal text-white/55"> / {tier.interval}</span>
              </div>
              <ul className="mt-3 space-y-1 text-[11px] text-white/70">
                {features.slice(0, 8).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {tier.contactSales ? (
                <a
                  href="mailto:support@vamvamvam.ai?subject=Agency%20plan"
                  className="mt-4 block w-full text-center rounded-xl px-3 py-2 text-xs font-semibold bg-white text-black hover:bg-white/90"
                >
                  Talk to sales
                </a>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(current) || busySlug === tier.slug}
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
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      {tier.slug === 'starter' ? 'Get started' : 'Upgrade'}{' '}
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {packs.length > 0 && creditsExhausted ? (
        <div className="rounded-2xl bg-white/10 border border-white/20 p-5 backdrop-blur-xl space-y-3">
          <h3 className="text-sm font-semibold text-white">Buy extra AI credits</h3>
          <p className="text-xs text-white/60">
            You&apos;ve used your monthly AI allowance. Top up to keep creating, or upgrade your plan.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {packs.map((pack) => (
              <div key={pack.slug} className="rounded-xl bg-black/30 border border-white/10 p-3">
                <div className="text-sm font-semibold text-white">{pack.name}</div>
                <div className="text-xs text-white/55 mt-1">{pack.description}</div>
                <div className="text-lg font-bold text-white mt-2">
                  ₦{Number(pack.price).toLocaleString()}
                </div>
                <button
                  type="button"
                  disabled={busySlug === `pack:${pack.slug}`}
                  onClick={() => checkoutCredits(pack.slug)}
                  className="mt-3 w-full rounded-xl bg-white text-black text-xs font-semibold py-2"
                >
                  {busySlug === `pack:${pack.slug}` ? 'Opening…' : 'Buy credits'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
      </div>
    </div>
  );
};
