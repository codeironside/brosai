import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT, CARD, MUTED } from '../theme';
import { API_URL } from '../config';
import { useSession } from '../session';
import {
  ensurePushPermissions,
  getCachedPushToken,
  isExpoGo,
  syncPushTokenWithBackend,
} from '../api/push';

export function YouScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, signOut, busy, user, error } = useSession();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNote, setPushNote] = useState(
    isExpoGo()
      ? 'Push needs a development build — Expo Go cannot receive remote notifications on SDK 53+.'
      : '',
  );

  useEffect(() => {
    setPushOn(Boolean(getCachedPushToken()));
  }, [signedIn]);

  const togglePush = async (value: boolean) => {
    if (!signedIn) return;
    if (isExpoGo()) {
      setPushOn(false);
      setPushNote(
        'Push needs a development build — Expo Go cannot receive remote notifications on SDK 53+.',
      );
      return;
    }
    setPushBusy(true);
    setPushNote('');
    try {
      if (!value) {
        setPushOn(false);
        setPushNote('Push stays registered until you sign out.');
        return;
      }
      const ok = await ensurePushPermissions();
      if (!ok) {
        setPushOn(false);
        setPushNote('Notifications permission was denied.');
        return;
      }
      const token = await syncPushTokenWithBackend();
      setPushOn(Boolean(token));
      setPushNote(
        token
          ? 'Device registered for push.'
          : 'Could not get an Expo push token. Add an EAS projectId for production push.',
      );
    } catch (err: any) {
      setPushOn(false);
      setPushNote(err?.message || 'Push setup failed');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>You</Text>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {signedIn ? (user?.name?.[0] || 'Y').toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.name}>{signedIn ? user?.name || 'Signed in' : 'Not signed in'}</Text>
        <Text style={styles.body}>
          {signedIn
            ? user?.email || 'Connected to the Vamvamvam API'
            : 'Sign in with Google to sync stats, chat, and push alerts.'}
        </Text>
        <Text style={styles.api}>API · {API_URL.replace(/^https?:\/\//, '')}</Text>

        {signedIn ? (
          <View style={styles.pushRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pushTitle}>Push notifications</Text>
              <Text style={styles.pushBody}>
                {isExpoGo()
                  ? 'Unavailable in Expo Go. Use a development build for push.'
                  : 'Approvals and clarifying questions from your workers.'}
              </Text>
            </View>
            <Switch
              value={pushOn}
              onValueChange={togglePush}
              disabled={pushBusy || isExpoGo()}
              trackColor={{ false: '#3f3f46', true: ACCENT }}
              thumbColor="#fff"
            />
          </View>
        ) : null}

        {pushNote ? <Text style={styles.note}>{pushNote}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => {
            (signedIn ? signOut() : signIn()).catch(() => {});
          }}
          style={styles.cta}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#082f49" />
          ) : (
            <Text style={styles.ctaText}>{signedIn ? 'Sign out' : 'Sign in with Google'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingHorizontal: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  card: {
    marginTop: 20,
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#102027',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: ACCENT, fontSize: 22, fontWeight: '700' },
  name: { marginTop: 14, color: '#fff', fontSize: 20, fontWeight: '700' },
  body: { marginTop: 6, color: MUTED, fontSize: 15, lineHeight: 21 },
  api: { marginTop: 8, color: '#71717a', fontSize: 12 },
  pushRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2e',
  },
  pushTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pushBody: { marginTop: 2, color: MUTED, fontSize: 12, lineHeight: 16 },
  note: { marginTop: 10, color: MUTED, fontSize: 12 },
  error: { marginTop: 10, color: '#f87171', fontSize: 13 },
  cta: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaText: { color: '#082f49', fontWeight: '700' },
});
