import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, CARD, HOME_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import { fetchDashboardStats } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';

type StatCard = { label: string; value: string; hint: string };

const CAN = [
  {
    title: 'Hire AI',
    body: 'Workers post, reply, and keep your accounts moving while you sleep.',
    icon: 'flash-outline' as const,
  },
  {
    title: 'Brand Brain',
    body: 'Voice, colors, and rules stay in memory so nothing goes off-brand.',
    icon: 'sparkles-outline' as const,
  },
  {
    title: 'Copy Desk',
    body: 'Drafts wait for your approval before they go live.',
    icon: 'create-outline' as const,
  },
];

function buildStats(data: any): { cards: StatCard[]; attention: number } {
  const analytics = data?.totalAnalytics || {};
  const runs = Array.isArray(data?.runs) ? data.runs : [];
  const awaiting = runs.filter((r: any) => r.status === 'awaiting').length;
  const succeeded = runs.filter((r: any) => r.status === 'succeeded').length;
  const cards: StatCard[] = [
    { label: 'Runs', value: String(data?.totalRuns ?? runs.length ?? 0), hint: data?.totalRunsDelta || 'total' },
    { label: 'Success', value: String(data?.successRate ?? '0%'), hint: data?.successRateDelta || 'rate' },
    { label: 'Likes', value: String(analytics.likes ?? 0), hint: 'analytics' },
    { label: 'Comments', value: String(analytics.comments ?? 0), hint: 'analytics' },
    { label: 'Published', value: String(succeeded), hint: 'succeeded' },
    {
      label: 'Engagement',
      value: String((analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0)),
      hint: 'likes+comments',
    },
  ];
  return { cards, attention: awaiting };
}

type Props = {
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
  onOpenSearch?: () => void;
};

export function HomeScreen({ onOpenChat, onOpenProfile, onOpenSearch }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy, error, user } = useSession();

  return (
    <View style={styles.root}>
      <ScreenVideo uri={HOME_VIDEO} />
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 110 }]}>
        <ProfileHeader onOpenChat={onOpenChat} onOpenProfile={onOpenProfile} />
        {signedIn ? (
          <SignedIn
            name={user?.name?.split(' ')[0] || 'there'}
            onOpenChat={onOpenChat}
            onOpenSearch={onOpenSearch}
          />
        ) : (
          <SignedOut onSignIn={signIn} busy={busy} error={error} />
        )}
      </View>
    </View>
  );
}

function SignedIn({
  name,
  onOpenChat,
  onOpenSearch,
}: {
  name: string;
  onOpenChat?: () => void;
  onOpenSearch?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<StatCard[]>([]);
  const [attention, setAttention] = useState(0);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardStats();
      const next = buildStats(data);
      setCards(next.cards);
      setAttention(next.attention);
    } catch (err: any) {
      setError(err?.message || 'Could not load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
      }
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>AI WORKERS</Text>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.sub}>
            {name}, here is what your workers have done across runs and analytics.
          </Text>
          <Text style={styles.pullHint}>Pull down to refresh</Text>
        </View>
        {onOpenSearch ? (
          <Pressable onPress={onOpenSearch} hitSlop={10} style={styles.searchBtn}>
            <Ionicons name="search-outline" size={18} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => load()} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.row}>
                {cards.slice(row * 2, row * 2 + 2).map((stat) => (
                  <View key={stat.label} style={styles.stat}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statHint}>{stat.hint}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
          <View style={styles.attention}>
            <Ionicons name="alert-circle-outline" size={18} color="#fbbf24" />
            <Text style={styles.attentionText}>
              {attention} item{attention === 1 ? '' : 's'} need you
            </Text>
          </View>
          <Pressable onPress={onOpenChat} style={styles.askBtn}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#082f49" />
            <Text style={styles.askText}>Talk to Hire AI</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function SignedOut({
  onSignIn,
  busy,
  error,
}: {
  onSignIn: () => Promise<void>;
  busy: boolean;
  error: string | null;
}) {
  return (
    <View style={styles.fill}>
      <Text style={styles.kicker}>VAMVAMVAM AI</Text>
      <Text style={styles.title}>Ship AI workers while you sleep</Text>
      <Text style={styles.sub}>Sign in to see your live stats. Until then, this is what the app does.</Text>

      <View style={styles.canList}>
        {CAN.map((item) => (
          <View key={item.title} style={styles.can}>
            <View style={styles.canIcon}>
              <Ionicons name={item.icon} size={18} color={ACCENT} />
            </View>
            <View style={styles.canCopy}>
              <Text style={styles.canTitle}>{item.title}</Text>
              <Text style={styles.canBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={() => {
          onSignIn().catch(() => {});
        }}
        style={[styles.cta, busy && styles.ctaBusy]}
        disabled={busy}
      >
        {busy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in with Google</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 8 },
  fill: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pullHint: { marginTop: 8, color: MUTED, fontSize: 12 },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28,28,30,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  kicker: {
    color: ACCENT,
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  title: {
    marginTop: 8,
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
  },
  sub: {
    marginTop: 8,
    color: '#d4d4d8',
    fontSize: 15,
    lineHeight: 21,
  },
  grid: { flex: 1, marginTop: 16, gap: 10, minHeight: 280 },
  row: { flex: 1, flexDirection: 'row', gap: 10, minHeight: 88 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(28,28,30,0.88)',
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
  },
  statLabel: { color: MUTED, fontSize: 12 },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '700' },
  statHint: { color: '#a1a1aa', fontSize: 12 },
  attention: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(28,23,8,0.92)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  attentionText: { color: '#fbbf24', fontSize: 15, fontWeight: '600' },
  askBtn: {
    marginTop: 10,
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  askText: { color: '#082f49', fontWeight: '700', fontSize: 15 },
  canList: { flex: 1, marginTop: 16, gap: 10, justifyContent: 'center' },
  can: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(28,28,30,0.88)',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },
  canIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#102027',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canCopy: { flex: 1 },
  canTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  canBody: { marginTop: 3, color: MUTED, fontSize: 13, lineHeight: 18 },
  cta: {
    marginTop: 12,
    backgroundColor: ACCENT,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 16,
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { color: '#082f49', fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 160 },
  error: { color: '#f87171', fontSize: 14, marginTop: 8 },
  retry: {
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
});
