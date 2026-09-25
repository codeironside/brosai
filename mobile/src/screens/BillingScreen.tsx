import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { ACCENT, BRAND_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import {
  fetchBillingMe,
  fetchBillingTiers,
  fetchCreditPacks,
  startBillingCheckout,
  startCreditPackCheckout,
  type BillingTier,
} from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';

type Props = {
  onBack?: () => void;
};

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <View style={styles.meter}>
      <View style={styles.meterRow}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterVal}>
          {used}/{max}
        </Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${pct}%` as any }]} />
      </View>
    </View>
  );
}

export function BillingScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [tiers, setTiers] = useState<BillingTier[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setError(null);
    const [tierList, billing, packList] = await Promise.all([
      fetchBillingTiers(),
      fetchBillingMe(),
      fetchCreditPacks(),
    ]);
    setTiers(tierList);
    setMe(billing);
    setPacks(packList);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    setLoading(true);
    load()
      .catch((err: any) => setError(err?.message || 'Could not load billing'))
      .finally(() => setLoading(false));
  }, [load, signedIn]);

  const checkout = async (slug: string) => {
    setBusySlug(slug);
    setError(null);
    try {
      const result = await startBillingCheckout(slug);
      if (result.link) {
        await WebBrowser.openBrowserAsync(result.link);
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Checkout failed');
    } finally {
      setBusySlug(null);
    }
  };

  const buyCredits = async (slug: string) => {
    setBusySlug(`pack:${slug}`);
    setError(null);
    try {
      const result = await startCreditPackCheckout(slug);
      if (result.link) {
        await WebBrowser.openBrowserAsync(result.link);
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Credit top-up failed');
    } finally {
      setBusySlug(null);
    }
  };

  const shareReferral = async () => {
    if (!me?.referralShareUrl) return;
    try {
      await Share.share({
        message: `Join me on Vamvamvam AI: ${me.referralShareUrl}`,
        url: me.referralShareUrl,
      });
    } catch {
      Linking.openURL(me.referralShareUrl).catch(() => {});
    }
  };

  const credits = me?.credits;
  const caps = me?.caps;
  const creditsExhausted =
    Boolean(credits) &&
    (Number(credits.remaining) <= 0 ||
      (Number(credits.monthlyAllowance) > 0 &&
        Number(credits.monthlyUsed) >= Number(credits.monthlyAllowance) &&
        Number(credits.purchasedBalance) <= 0));

  return (
    <View style={styles.root}>
      <ScreenVideo uri={BRAND_VIDEO} shade={0.65} />
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 100 }]}>
        <View style={styles.top}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          <Text style={styles.title}>Billing</Text>
          <View style={styles.back} />
        </View>

        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={styles.sub}>Sign in to manage your plan and referral earnings.</Text>
            <Pressable
              onPress={() => {
                signIn().catch(() => {});
              }}
              style={styles.cta}
              disabled={authBusy}
            >
              {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                tintColor={ACCENT}
                onRefresh={() => {
                  setLoading(true);
                  load()
                    .catch((err: any) => setError(err?.message || 'Refresh failed'))
                    .finally(() => setLoading(false));
                }}
              />
            }
          >
            <Text style={styles.sub}>
              Plan: {me?.subscriptionTierSlug || 'none'} · {me?.subscriptionStatus || 'inactive'}
              {me?.subscriptionBypass ? ' · bypass' : ''}
            </Text>
            {!me?.hasAccess ? (
              <Text style={styles.warn}>Subscribe to Starter or higher to unlock AI & publishing.</Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {credits ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Your usage</Text>
                <Meter
                  label={`AI credits (${credits.percentUsed ?? 0}% of monthly)`}
                  used={Number(credits.monthlyUsed || 0)}
                  max={Number(credits.monthlyAllowance || 0)}
                />
                <Text style={styles.cardBody}>
                  Remaining this month: {credits.monthlyRemaining ?? 0} · Purchased:{' '}
                  {credits.purchasedBalance ?? 0} · Total available: {credits.remaining ?? 0}
                </Text>
                {caps ? (
                  <>
                    <Meter
                      label="Social accounts"
                      used={caps.socialAccounts.used}
                      max={caps.socialAccounts.max}
                    />
                    <Meter label="AI posts" used={caps.aiPosts.used} max={caps.aiPosts.max} />
                    <Meter label="AI videos" used={caps.aiVideos.used} max={caps.aiVideos.max} />
                    <Meter label="AI replies" used={caps.aiReplies.used} max={caps.aiReplies.max} />
                    <Text style={styles.cardBody}>
                      Scheduling window: {caps.schedulingDays ?? '—'} days
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}

            {tiers.map((tier) => {
              const current = me?.subscriptionTierSlug === tier.slug && me?.hasAccess;
              const contactSales = Boolean((tier as any).contactSales);
              const features: string[] =
                Array.isArray((tier as any).features) && (tier as any).features.length > 0
                  ? (tier as any).features
                  : [
                      `${tier.limits?.maxAiPostsPerMonth ?? '—'} AI posts`,
                      `${tier.limits?.maxSocialAccounts ?? '—'} social accounts`,
                      `${tier.limits?.maxAiVideosPerMonth ?? '—'} AI videos`,
                      `${tier.limits?.monthlyCredits ?? '—'} AI credits`,
                      `${tier.limits?.schedulingDays ?? '—'}-day scheduling`,
                    ];
              return (
                <View key={tier.slug} style={[styles.card, current && styles.cardOn]}>
                  {(tier as any).badge ? (
                    <Text style={styles.badge}>{(tier as any).badge}</Text>
                  ) : null}
                  <Text style={styles.cardTitle}>{tier.name}</Text>
                  <Text style={styles.cardBody}>{tier.description}</Text>
                  <Text style={styles.price}>
                    {contactSales
                      ? `${tier.currency} ${Number(tier.price).toLocaleString()}+`
                      : `${tier.currency} ${Number(tier.price).toLocaleString()} / ${tier.interval}`}
                  </Text>
                  {features.slice(0, 6).map((f) => (
                    <Text key={f} style={styles.feature}>
                      · {f}
                    </Text>
                  ))}
                  {contactSales ? (
                    <Pressable
                      onPress={() =>
                        Linking.openURL('mailto:support@vamvamvam.ai?subject=Agency%20plan')
                      }
                      style={styles.cta}
                    >
                      <Text style={styles.ctaText}>Talk to sales</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => checkout(tier.slug)}
                      disabled={Boolean(current) || busySlug === tier.slug}
                      style={[styles.cta, (current || busySlug === tier.slug) && styles.ctaBusy]}
                    >
                      {busySlug === tier.slug ? (
                        <ActivityIndicator color="#082f49" />
                      ) : (
                        <Text style={styles.ctaText}>
                          {current ? 'Current' : tier.slug === 'starter' ? 'Get started' : 'Upgrade'}
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })}

            {packs.length > 0 && creditsExhausted ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Buy extra AI credits</Text>
                <Text style={styles.cardBody}>
                  You've used your monthly AI allowance. Top up to keep creating, or upgrade your plan.
                </Text>
                {packs.map((pack) => (
                  <View key={pack.slug} style={styles.packRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pushTitle}>{pack.name}</Text>
                      <Text style={styles.cardBody}>
                        ₦{Number(pack.price).toLocaleString()} · {pack.credits} credits
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => buyCredits(pack.slug)}
                      style={styles.cta}
                      disabled={busySlug === `pack:${pack.slug}`}
                    >
                      {busySlug === `pack:${pack.slug}` ? (
                        <ActivityIndicator color="#082f49" />
                      ) : (
                        <Text style={styles.ctaText}>Buy</Text>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Referrals</Text>
              <Text style={styles.cardBody}>
                Share your link. Earn commission when referred users subscribe.
              </Text>
              <Text style={styles.referralUrl} selectable>
                {me?.referralShareUrl || '—'}
              </Text>
              {me?.referralCode ? (
                <Text style={styles.stats}>Code: {me.referralCode}</Text>
              ) : null}
              <Text style={styles.stats}>
                {me?.referral?.referredCount ?? 0} referrals · {me?.referral?.currency || 'NGN'}{' '}
                {Number(me?.referral?.totalCommission || 0).toLocaleString()} earned
              </Text>
              <Pressable onPress={shareReferral} style={styles.cta} disabled={!me?.referralShareUrl}>
                <Text style={styles.ctaText}>Share referral link</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 22, fontWeight: '700' },
  guest: { marginTop: 40, gap: 12 },
  sub: { color: MUTED, fontSize: 14, marginBottom: 10 },
  warn: { color: '#fcd34d', fontSize: 13, marginBottom: 8 },
  error: { color: '#f87171', fontSize: 13, marginBottom: 8 },
  card: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardOn: { borderWidth: 1, borderColor: ACCENT },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cardBody: { color: MUTED, fontSize: 13, marginTop: 4, lineHeight: 18 },
  price: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 10 },
  feature: { color: MUTED, fontSize: 12, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    color: '#082f49',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 8,
    overflow: 'hidden',
  },
  code: { color: ACCENT, fontSize: 16, fontWeight: '700', marginTop: 10 },
  referralUrl: {
    color: '#e4e4e7',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  stats: { color: MUTED, fontSize: 12, marginTop: 6 },
  cta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaBusy: { opacity: 0.6 },
  ctaText: { color: '#082f49', fontWeight: '700' },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2e',
  },
  pushTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  meter: { marginTop: 10 },
  meterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meterLabel: { color: MUTED, fontSize: 12 },
  meterVal: { color: '#fff', fontSize: 12, fontWeight: '600' },
  meterTrack: {
    marginTop: 4,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1f1f22',
    overflow: 'hidden',
  },
  meterFill: { height: 6, backgroundColor: ACCENT, borderRadius: 3 },
});
