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
import * as WebBrowser from 'expo-web-browser';
import { ACCENT, BRAND_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import {
  disconnectSocialAccount,
  fetchSocialAccounts,
  fetchSocialOAuthUrl,
  type SocialAccount,
} from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';

const NETWORKS = [
  { platform: 'linkedin', name: 'LinkedIn' },
  { platform: 'twitter', name: 'X (Twitter)' },
  { platform: 'facebook', name: 'Facebook' },
  { platform: 'threads', name: 'Threads' },
];

type Props = {
  onBack?: () => void;
};

export function ConnectionsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setError(null);
    try {
      const items = await fetchSocialAccounts();
      setAccounts(items.filter((a) => a.connected));
    } catch (err: any) {
      setError(err?.message || 'Could not load accounts');
    }
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, signedIn]);

  const connect = async (platform: string) => {
    setBusyId(platform);
    setError(null);
    setNote(null);
    try {
      const { oauthUrl } = await fetchSocialOAuthUrl(platform);
      await WebBrowser.openBrowserAsync(oauthUrl);
      setNote('If you finished linking, pull to refresh.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not start connect');
    } finally {
      setBusyId(null);
    }
  };

  const disconnect = async (account: SocialAccount) => {
    if (!account.id) return;
    setBusyId(account.id);
    setError(null);
    try {
      await disconnectSocialAccount(account.id);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not disconnect');
    } finally {
      setBusyId(null);
    }
  };

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
          <Text style={styles.title}>Connections</Text>
          <View style={styles.back} />
        </View>

        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={styles.sub}>Sign in to link LinkedIn, X, Facebook, and Threads.</Text>
            <Pressable onPress={() => { signIn().catch(() => {}); }} style={styles.cta} disabled={authBusy}>
              {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor={ACCENT}
                onRefresh={async () => {
                  setRefreshing(true);
                  await load();
                  setRefreshing(false);
                }}
              />
            }
          >
            <Text style={styles.sub}>Link multiple accounts per network. Pick them when creating an agent.</Text>

            {loading ? <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {note ? <Text style={styles.note}>{note}</Text> : null}

            <Text style={styles.section}>Linked accounts</Text>
            {accounts.length === 0 && !loading ? (
              <Text style={styles.empty}>No accounts linked yet.</Text>
            ) : (
              accounts.map((item) => (
                <View key={item.id || `${item.platform}-${item.handle}`} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {NETWORKS.find((n) => n.platform === item.platform)?.name || item.platform}
                    </Text>
                    <Text style={styles.rowBody}>{item.handle || item.accountId || 'Connected'}</Text>
                  </View>
                  <Pressable
                    onPress={() => disconnect(item)}
                    disabled={busyId === item.id}
                    style={styles.danger}
                  >
                    {busyId === item.id ? (
                      <ActivityIndicator color="#fecaca" size="small" />
                    ) : (
                      <Text style={styles.dangerText}>Disconnect</Text>
                    )}
                  </Pressable>
                </View>
              ))
            )}

            <Text style={[styles.section, { marginTop: 18 }]}>Add another</Text>
            {NETWORKS.map((net) => (
              <Pressable
                key={net.platform}
                onPress={() => connect(net.platform)}
                disabled={busyId === net.platform}
                style={styles.addRow}
              >
                <Text style={styles.rowTitle}>{net.name}</Text>
                {busyId === net.platform ? (
                  <ActivityIndicator color={ACCENT} size="small" />
                ) : (
                  <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
                )}
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
  sub: { color: MUTED, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  section: { color: ACCENT, fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  empty: { color: MUTED, fontSize: 13, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowBody: { color: MUTED, fontSize: 12, marginTop: 2 },
  danger: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(127,29,29,0.45)',
  },
  dangerText: { color: '#fecaca', fontSize: 12, fontWeight: '600' },
  error: { color: '#f87171', marginBottom: 8, fontSize: 13 },
  note: { color: '#86efac', marginBottom: 8, fontSize: 13 },
  guest: { flex: 1, justifyContent: 'center', gap: 10 },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaText: { color: '#082f49', fontWeight: '700' },
});
