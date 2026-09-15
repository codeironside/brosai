import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT, CRON_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import { fetchCronStatus, fetchManagers, startCron } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';

type Props = {
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
  onOpened?: () => void;
};

export function CronScreen({ onOpenChat, onOpenProfile, onOpened }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [managers, setManagers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [cron, setCron] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [managerData, cronData] = await Promise.all([fetchManagers(), fetchCronStatus()]);
      const items = Array.isArray(managerData?.items)
        ? managerData.items
        : Array.isArray(managerData)
          ? managerData
          : [];
      setManagers(items);
      const active =
        items.find((item: any) => item.id === managerData?.activeId) ||
        items.find((item: any) => item.isActive) ||
        items[0];
      setSelected(String(active?.id || ''));
      setCron(cronData);
    } catch (err: any) {
      setError(err?.message || 'Could not load managers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) load();
  }, [load, signedIn]);

  const create = async () => {
    setStarting(true);
    setError(null);
    setMessage(null);
    try {
      const data = await startCron(selected || undefined);
      setCron(data);
      setMessage('Job started. Your worker will keep posting on schedule.');
      onOpened?.();
    } catch (err: any) {
      setError(err?.message || 'Could not start job');
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenVideo uri={CRON_VIDEO} />
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        <ProfileHeader onOpenChat={onOpenChat} onOpenProfile={onOpenProfile} />
        <Text style={styles.title}>Start new job</Text>
        <Text style={styles.sub}>Start an AI worker that drafts and posts while you sleep.</Text>

        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={styles.guestBody}>Sign in to start a new job.</Text>
            <Pressable onPress={() => { signIn().catch(() => {}); }} style={styles.cta} disabled={authBusy}>
              {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </Pressable>
          </View>
        ) : (
          <View style={styles.fill}>
            {loading ? <ActivityIndicator color={ACCENT} /> : null}
            <Text style={styles.label}>AI manager</Text>
            {managers.length === 0 && !loading ? (
              <Text style={styles.empty}>Hire an AI on the web dashboard first, then come back.</Text>
            ) : null}
            {managers.map((manager) => {
              const id = String(manager.id || '');
              const on = selected === id;
              return (
                <Pressable key={id} onPress={() => setSelected(id)} style={[styles.option, on && styles.optionOn]}>
                  <Text style={styles.optionTitle}>{manager.name || 'AI Manager'}</Text>
                  <Text style={styles.optionBody}>
                    {[manager.role, manager.brandName].filter(Boolean).join(' · ') || 'Worker'}
                  </Text>
                </Pressable>
              );
            })}

            {cron?.enabled || cron?.running ? (
              <Text style={styles.note}>A job is already active. Starting again will keep using your worker.</Text>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.ok}>{message}</Text> : null}

            <Pressable
              onPress={create}
              style={[styles.cta, starting && styles.ctaBusy]}
              disabled={starting || (!selected && managers.length > 0)}
            >
              {starting ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Start job</Text>}
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
  fill: { flex: 1, marginTop: 8 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  sub: { color: MUTED, marginTop: 8, fontSize: 15, lineHeight: 21, marginBottom: 16 },
  label: { color: ACCENT, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  option: {
    backgroundColor: 'rgba(28,28,30,0.9)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  optionOn: { borderWidth: 1, borderColor: ACCENT },
  optionTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  optionBody: { color: MUTED, marginTop: 4, fontSize: 13 },
  empty: { color: MUTED, marginBottom: 12 },
  note: { color: MUTED, marginTop: 8, fontSize: 13 },
  error: { color: '#f87171', marginTop: 10 },
  ok: { color: '#86efac', marginTop: 10 },
  guest: { flex: 1, justifyContent: 'center', gap: 8 },
  guestBody: { color: MUTED, fontSize: 15 },
  cta: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { color: '#082f49', fontWeight: '700' },
});
