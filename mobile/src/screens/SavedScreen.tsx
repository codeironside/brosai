import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, CARD, MUTED } from '../theme';
import { useSession } from '../session';
import { fetchKnowledgeBase } from '../api/endpoints';

type Doc = { id?: string; title?: string; category?: string; sourceType?: string };

export function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchKnowledgeBase();
      setDocs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Could not load saved items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) load();
  }, [load, signedIn]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.top}>
        <Text style={styles.title}>Saved</Text>
        {signedIn ? (
          <Pressable onPress={load} hitSlop={8}>
            <Ionicons name="refresh" size={18} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {signedIn ? (
        <View style={styles.list}>
          {loading ? <ActivityIndicator color={ACCENT} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !error && docs.length === 0 ? (
            <Text style={styles.empty}>No Brand Brain documents yet.</Text>
          ) : null}
          {docs.map((item, index) => (
            <View key={item.id || `${item.title}-${index}`} style={styles.row}>
              <View style={styles.icon}>
                <Ionicons
                  name={String(item.sourceType || '').includes('web') ? 'globe-outline' : 'document-outline'}
                  size={18}
                  color="#e4e4e7"
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>{item.title || 'Untitled'}</Text>
                <Text style={styles.meta}>{item.category || item.sourceType || 'Brand Brain'}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.guest}>
          <Text style={styles.guestTitle}>Nothing saved yet</Text>
          <Text style={styles.guestBody}>
            Sign in to keep designs, brand files, and copy you want the workers to reuse.
          </Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  list: { marginTop: 18, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2a2a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  meta: { marginTop: 2, color: MUTED, fontSize: 13 },
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
