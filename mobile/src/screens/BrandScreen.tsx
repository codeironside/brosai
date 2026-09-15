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
import { ACCENT, BRAND_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import { fetchBrandBrains } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';

type Props = {
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
  onCreateBrand?: () => void;
};

export function BrandScreen({ onOpenChat, onOpenProfile, onCreateBrand }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchBrandBrains();
      setBrands(Array.isArray(data.items) ? data.items : []);
      setActiveId(data.activeId);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load brands');
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
      <ScreenVideo uri={BRAND_VIDEO} />
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 110 }]}>
        <ProfileHeader onOpenChat={onOpenChat} onOpenProfile={onOpenProfile} />
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Brands</Text>
            <Text style={styles.hint}>Pull down to refresh</Text>
          </View>
          {signedIn ? (
            <Pressable onPress={onCreateBrand} style={styles.addBtn}>
              <Text style={styles.addText}>New</Text>
            </Pressable>
          ) : null}
        </View>

        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={styles.guestTitle}>Brand Brain</Text>
            <Text style={styles.guestBody}>Sign in to see and manage your brands.</Text>
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
            {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
            {!loading && brands.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.empty}>No brands yet.</Text>
                <Pressable onPress={onCreateBrand} style={styles.cta}>
                  <Text style={styles.ctaText}>Create brand</Text>
                </Pressable>
              </View>
            ) : null}
            {brands.map((brand) => (
              <View
                key={brand.id || brand.brandName}
                style={[styles.brand, activeId === brand.id && styles.brandActive]}
              >
                <Text style={styles.brandName}>{brand.brandName || 'Untitled brand'}</Text>
                <Text style={styles.brandMeta}>
                  {[brand.industry, activeId === brand.id ? 'Active' : null].filter(Boolean).join(' · ')}
                </Text>
                {brand.description ? (
                  <Text style={styles.brandBody} numberOfLines={4}>
                    {brand.description}
                  </Text>
                ) : null}
              </View>
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
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  hint: { color: MUTED, fontSize: 12, marginTop: 4 },
  addBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 6,
  },
  addText: { color: '#082f49', fontWeight: '700' },
  brand: {
    backgroundColor: 'rgba(28,28,30,0.9)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  brandActive: { borderWidth: 1, borderColor: ACCENT },
  brandName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  brandMeta: { color: MUTED, marginTop: 4, fontSize: 12 },
  brandBody: { color: '#d4d4d8', marginTop: 8, fontSize: 13, lineHeight: 18 },
  emptyCard: { marginTop: 20, gap: 12 },
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
