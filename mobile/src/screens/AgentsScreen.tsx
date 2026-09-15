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
import { ACCENT, AGENTS_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import { fetchManagers } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';

type Props = {
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
  onOpenSearch?: () => void;
  onCreateAgent?: () => void;
};

export function AgentsScreen({ onOpenChat, onOpenProfile, onOpenSearch, onCreateAgent }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchManagers();
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setAgents(items);
      setActiveId(data?.activeId || items.find((a: any) => a.isActive)?.id || null);
    } catch (err: any) {
      setError(err?.message || 'Could not load agents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) load();
  }, [load, signedIn]);

  return (
    <View style={styles.root}>
      <ScreenVideo uri={AGENTS_VIDEO} />
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 110 }]}>
        <ProfileHeader onOpenChat={onOpenChat} onOpenProfile={onOpenProfile} />
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Agents</Text>
            <Text style={styles.hint}>Pull down to refresh</Text>
          </View>
          {onOpenSearch ? (
            <Pressable onPress={onOpenSearch} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="search-outline" size={18} color="#fff" />
            </Pressable>
          ) : null}
          {signedIn ? (
            <Pressable onPress={onCreateAgent} style={styles.addBtn}>
              <Text style={styles.addText}>New</Text>
            </Pressable>
          ) : null}
        </View>

        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={styles.guestTitle}>Your AI managers</Text>
            <Text style={styles.guestBody}>Sign in to hire agents and set how often they post.</Text>
            <Pressable onPress={() => { signIn().catch(() => {}); }} style={styles.cta} disabled={authBusy}>
              {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
            }
          >
            {loading && !refreshing ? <ActivityIndicator color={ACCENT} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!loading && agents.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.empty}>No agents yet.</Text>
                <Pressable onPress={onCreateAgent} style={styles.cta}>
                  <Text style={styles.ctaText}>Create agent</Text>
                </Pressable>
              </View>
            ) : null}
            {agents.map((agent) => {
              const id = String(agent.id || '');
              const on = activeId === id || agent.isActive;
              return (
                <View key={id || agent.name} style={[styles.card, on && styles.cardOn]}>
                  <Text style={styles.name}>{agent.name || 'AI Manager'}</Text>
                  <Text style={styles.meta}>
                    {[agent.role, agent.brandName, on ? 'Active' : null].filter(Boolean).join(' · ')}
                  </Text>
                  {agent.postingFrequency ? (
                    <Text style={styles.freq}>Posts · {agent.postingFrequency}</Text>
                  ) : null}
                  {agent.goal ? (
                    <Text style={styles.body} numberOfLines={3}>
                      {agent.goal}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  hint: { color: MUTED, fontSize: 12, marginTop: 4 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  addBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  addText: { color: '#082f49', fontWeight: '700' },
  card: {
    backgroundColor: 'rgba(28,28,30,0.9)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardOn: { borderWidth: 1, borderColor: ACCENT },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  meta: { color: MUTED, marginTop: 4, fontSize: 12 },
  freq: { color: ACCENT, marginTop: 8, fontSize: 12, fontWeight: '700' },
  body: { color: '#d4d4d8', marginTop: 8, fontSize: 13, lineHeight: 18 },
  emptyWrap: { marginTop: 16, gap: 12 },
  empty: { color: MUTED },
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
