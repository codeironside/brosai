import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, MUTED, SEARCH_VIDEO } from '../theme';
import { useSession } from '../session';
import { searchKnowledge } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';

type Hit = { id?: string; title: string; category?: string; score?: number; content?: string };

type Props = {
  onBack?: () => void;
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
};

export function SearchScreen({ onBack, onOpenChat, onOpenProfile }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (value: string) => {
    const q = value.trim();
    if (!q) {
      setHits([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchKnowledge(q);
      setHits(
        data.map((item: any) => ({
          id: item.id,
          title: item.title || 'Untitled',
          category: item.category,
          score: item.score,
          content: item.content,
        })),
      );
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    const timer = setTimeout(() => {
      runSearch(query).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [query, runSearch, signedIn]);

  return (
    <View style={styles.root}>
      <ScreenVideo uri={SEARCH_VIDEO} />
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 110 }]}>
        <ProfileHeader onOpenChat={onOpenChat} onOpenProfile={onOpenProfile} />
        <View style={styles.titleRow}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          ) : null}
          <Text style={styles.title}>Search</Text>
        </View>
        <View style={styles.field}>
          <Ionicons name="search-outline" size={18} color={MUTED} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={signedIn ? 'Search Brand Brain memory' : 'Sign in to search your work'}
            placeholderTextColor="#71717a"
            style={styles.input}
            editable={signedIn}
            autoCorrect={false}
          />
        </View>

        {signedIn ? (
          <View style={styles.list}>
            {loading ? <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!loading && !error && query.trim() && hits.length === 0 ? (
              <Text style={styles.empty}>Nothing matches that.</Text>
            ) : null}
            {hits.map((item) => (
              <View key={`${item.id}-${item.title}`} style={styles.row}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  {[item.category, typeof item.score === 'number' ? `score ${item.score.toFixed?.(2) ?? item.score}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {item.content ? (
                  <Text style={styles.rowBody} numberOfLines={2}>
                    {item.content}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.guest}>
            <Text style={styles.guestTitle}>Your library stays private</Text>
            <Text style={styles.guestBody}>Sign in to search chats, Brand Brain, and saved copy.</Text>
            <Pressable onPress={() => { signIn().catch(() => {}); }} style={styles.cta} disabled={authBusy}>
              {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 32, fontWeight: '700', flex: 1 },
  field: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  list: { marginTop: 16, gap: 10, flex: 1 },
  row: { backgroundColor: 'rgba(28,28,30,0.9)', borderRadius: 16, padding: 14 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rowMeta: { marginTop: 4, color: MUTED, fontSize: 13 },
  rowBody: { marginTop: 6, color: '#d4d4d8', fontSize: 13, lineHeight: 18 },
  empty: { color: MUTED, fontSize: 15 },
  error: { color: '#f87171', fontSize: 14 },
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
