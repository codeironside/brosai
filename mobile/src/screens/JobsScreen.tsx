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
import { ACCENT, JOBS_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import { fetchCronStatus, fetchDashboardStats, stopCron } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';
import { JobsIcon } from '../components/JobsIcon';

function formatRunTime(run: any) {
  const raw = run?.createdAt || run?.started || run?.startedAt || null;
  if (!raw) return 'Time unknown';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'Time unknown';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTraceTime(at: any) {
  if (!at) return '';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function platformTone(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('fail') || lower.includes('could not') || lower.includes('error')) {
    return { bg: 'rgba(127,29,29,0.55)', accent: '#f87171', icon: 'alert-circle' as const };
  }
  if (lower.includes('linkedin')) return { bg: 'rgba(10,102,194,0.25)', accent: '#60a5fa', icon: 'logo-linkedin' as const };
  if (lower.includes('facebook')) return { bg: 'rgba(24,119,242,0.22)', accent: '#93c5fd', icon: 'logo-facebook' as const };
  if (lower.includes('twitter') || lower.includes(' x ')) return { bg: 'rgba(255,255,255,0.08)', accent: '#e4e4e7', icon: 'logo-twitter' as const };
  if (lower.includes('thread')) return { bg: 'rgba(255,255,255,0.1)', accent: '#fafafa', icon: 'chatbubbles-outline' as const };
  if (lower.includes('cron') || lower.includes('finish')) return { bg: 'rgba(22,101,52,0.35)', accent: '#86efac', icon: 'checkmark-circle' as const };
  return { bg: 'rgba(28,28,30,0.92)', accent: ACCENT, icon: 'pulse-outline' as const };
}

type Props = {
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
  onOpenSearch?: () => void;
  onStartJob?: () => void;
};

export function JobsScreen({ onOpenChat, onOpenProfile, onOpenSearch, onStartJob }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cron, setCron] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [cronData, stats] = await Promise.all([fetchCronStatus(), fetchDashboardStats()]);
      setCron(cronData);
      const nextRuns = Array.isArray(stats?.runs) ? stats.runs : [];
      setRuns(nextRuns);
      setSelected((prev: any | null) => {
        if (!prev) return null;
        return nextRuns.find((r: any) => (r.id || r.runId) === (prev.id || prev.runId)) || prev;
      });
    } catch (err: any) {
      setError(err?.message || 'Could not load jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) load();
  }, [load, signedIn]);

  if (selected) {
    const traces = Array.isArray(selected.traces) ? selected.traces : [];
    const posts = Array.isArray(selected.publishedPosts) ? selected.publishedPosts : [];
    const statusColor =
      selected.status === 'succeeded'
        ? '#86efac'
        : selected.status === 'failed'
          ? '#f87171'
          : selected.status === 'awaiting'
            ? '#fbbf24'
            : ACCENT;

    return (
      <View style={styles.root}>
        <ScreenVideo uri={JOBS_VIDEO} shade={0.72} />
        <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 110 }]}>
          <View style={styles.detailTop}>
            <Pressable onPress={() => setSelected(null)} style={styles.back} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailKicker}>Run history</Text>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {selected.agentName || selected.runId || 'Worker'}
              </Text>
            </View>
            {onOpenSearch ? (
              <Pressable onPress={onOpenSearch} style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="search-outline" size={18} color="#fff" />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
            }
          >
            <Text style={styles.hint}>Pull down to refresh</Text>

            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={styles.heroIcon}>
                  <JobsIcon color={ACCENT} active size={28} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroStatus, { color: statusColor }]}>
                    {(selected.status || 'unknown').toUpperCase()}
                  </Text>
                  <Text style={styles.heroMeta}>{formatRunTime(selected)}</Text>
                </View>
              </View>
              {Array.isArray(selected.platforms) && selected.platforms.length ? (
                <View style={styles.platformRow}>
                  {selected.platforms.map((p: string) => (
                    <View key={p} style={styles.platformChip}>
                      <Text style={styles.platformText}>{p}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {selected.note ? <Text style={styles.note}>{selected.note}</Text> : null}
            </View>

            {selected.draft ? (
              <View style={styles.draftCard}>
                <Text style={styles.cardLabel}>Draft copy</Text>
                <Text style={styles.draft}>{selected.draft}</Text>
              </View>
            ) : null}

            <Text style={styles.section}>Activity</Text>
            {traces.length === 0 ? <Text style={styles.empty}>No timeline events yet.</Text> : null}
            <View style={styles.timeline}>
              {traces.map((trace: any, idx: number) => {
                const tone = platformTone(String(trace.label || ''));
                const last = idx === traces.length - 1;
                return (
                  <View key={`${trace.at}-${idx}`} style={styles.timelineItem}>
                    <View style={styles.rail}>
                      <View style={[styles.railDot, { backgroundColor: tone.accent }]} />
                      {!last ? <View style={styles.railLine} /> : null}
                    </View>
                    <View style={[styles.eventCard, { backgroundColor: tone.bg }]}>
                      <View style={styles.eventHead}>
                        <Ionicons name={tone.icon} size={16} color={tone.accent} />
                        <Text style={styles.eventTitle}>{trace.label || 'Event'}</Text>
                      </View>
                      <Text style={styles.eventTime}>{formatTraceTime(trace.at) || '—'}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {posts.length > 0 ? (
              <>
                <Text style={styles.section}>Published destinations</Text>
                {posts.map((post: any, idx: number) => {
                  const tone = platformTone(String(post.label || post.platform || ''));
                  return (
                    <View key={`${post.postId || post.url}-${idx}`} style={[styles.destCard, { borderColor: tone.accent }]}>
                      <View style={[styles.destBadge, { backgroundColor: tone.bg }]}>
                        <Ionicons name={tone.icon} size={16} color={tone.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.destTitle}>{post.label || post.platform || 'Post'}</Text>
                        <Text style={styles.destMeta} numberOfLines={2}>
                          {post.url || post.postId || ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenVideo uri={JOBS_VIDEO} />
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 110 }]}>
        <ProfileHeader onOpenChat={onOpenChat} onOpenProfile={onOpenProfile} />
        <View style={styles.listTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Jobs</Text>
            <Text style={styles.hint}>Pull down to refresh</Text>
          </View>
          {onOpenSearch ? (
            <Pressable onPress={onOpenSearch} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="search-outline" size={18} color="#fff" />
            </Pressable>
          ) : null}
        </View>

        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={styles.guestTitle}>Your worker jobs live here</Text>
            <Text style={styles.guestBody}>Sign in to see automation status and recent runs.</Text>
            <Pressable onPress={() => { signIn().catch(() => {}); }} style={styles.cta} disabled={authBusy}>
              {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
            }
          >
            {loading && !refreshing ? <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Automation</Text>
              <Text style={styles.cardTitle}>
                {cron?.enabled || cron?.running ? 'Job is running' : 'No active job'}
              </Text>
              <Text style={styles.cardBody}>
                {cron?.lastPhase ? `Phase · ${cron.lastPhase}` : 'Start a new job to keep workers posting.'}
              </Text>
              <View style={styles.rowBtns}>
                <Pressable onPress={onStartJob} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>Start new job</Text>
                </Pressable>
                {(cron?.enabled || cron?.running) && (
                  <Pressable
                    onPress={() => {
                      stopCron().then(() => load(true)).catch((err: any) => setError(err?.message || 'Stop failed'));
                    }}
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryText}>Stop</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={styles.section}>Recent runs</Text>
            {runs.length === 0 && !loading ? <Text style={styles.empty}>No jobs yet.</Text> : null}
            {runs.slice(0, 40).map((run) => (
              <Pressable key={run.id || run.runId} onPress={() => setSelected(run)} style={styles.run}>
                <View style={styles.runIcon}>
                  <JobsIcon color={ACCENT} size={18} active />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runTitle}>{run.agentName || run.runId || 'Worker run'}</Text>
                  <Text style={styles.runMeta}>
                    {[
                      formatRunTime(run),
                      run.status,
                      Array.isArray(run.platforms) ? run.platforms.join(', ') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={MUTED} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 20 },
  listTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  hint: { color: MUTED, fontSize: 12, marginTop: 4, marginBottom: 12 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  detailTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailKicker: { color: ACCENT, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  detailTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  heroCard: {
    backgroundColor: 'rgba(18,18,20,0.92)',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.25)',
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(125,211,252,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatus: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.6 },
  heroMeta: { color: MUTED, marginTop: 4, fontSize: 13 },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  platformChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  platformText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  note: { color: '#d4d4d8', marginTop: 12, fontSize: 13, lineHeight: 18 },
  draftCard: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: { color: ACCENT, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 6 },
  cardBody: { color: MUTED, marginTop: 6, fontSize: 14 },
  draft: { color: '#e4e4e7', marginTop: 8, fontSize: 14, lineHeight: 21 },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryText: { color: '#082f49', fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryText: { color: '#fff', fontWeight: '600' },
  section: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  timeline: { marginBottom: 8 },
  timelineItem: { flexDirection: 'row', gap: 12, minHeight: 64 },
  rail: { width: 16, alignItems: 'center' },
  railDot: { width: 10, height: 10, borderRadius: 5, marginTop: 14 },
  railLine: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 4 },
  eventCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventTitle: { color: '#fff', fontWeight: '700', flex: 1, fontSize: 14 },
  eventTime: { color: MUTED, fontSize: 12, marginTop: 6 },
  destCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  destBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destTitle: { color: '#fff', fontWeight: '700' },
  destMeta: { color: MUTED, fontSize: 12, marginTop: 3 },
  run: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(28,28,30,0.9)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  runIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(125,211,252,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runTitle: { color: '#fff', fontWeight: '600' },
  runMeta: { color: MUTED, fontSize: 12, marginTop: 3 },
  empty: { color: MUTED, marginBottom: 10 },
  error: { color: '#f87171', marginBottom: 8 },
  guest: { flex: 1, justifyContent: 'center', gap: 8 },
  guestTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  guestBody: { color: MUTED, fontSize: 15, lineHeight: 21 },
  cta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaText: { color: '#082f49', fontWeight: '700' },
});
