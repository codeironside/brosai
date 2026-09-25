import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ACCENT, BRAND_VIDEO, MUTED, SUPPORT_EMAIL, SUPPORT_URL } from '../theme';
import { useSession } from '../session';
import { getAccessToken, saveSession, type ApiUser } from '../api/client';
import { fetchBillingMe, updateProfile } from '../api/endpoints';
import {
  ensurePushPermissions,
  getCachedPushToken,
  isExpoGo,
  syncPushTokenWithBackend,
} from '../api/push';
import { ScreenVideo } from '../components/ScreenVideo';

const CATEGORIES = ['personal', 'creator', 'business', 'church', 'organization', 'school', 'agency'];

type Props = {
  onBack?: () => void;
  onOpenChat?: () => void;
  onOpenConnections?: () => void;
  onOpenBilling?: () => void;
};

export function ProfileScreen({ onBack, onOpenChat, onOpenConnections, onOpenBilling }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, signOut, busy, user, error, refreshProfile } = useSession();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNote, setPushNote] = useState(
    isExpoGo()
      ? 'Push needs a development build — Expo Go cannot receive remote notifications on SDK 53+.'
      : '',
  );
  const [name, setName] = useState(user?.name || '');
  const [organizationName, setOrganizationName] = useState(user?.organizationName || '');
  const [category, setCategory] = useState(user?.category || 'personal');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [referralShareUrl, setReferralShareUrl] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);

  const loadReferral = useCallback(async () => {
    if (!signedIn) {
      setReferralShareUrl('');
      setReferralCode('');
      return;
    }
    setReferralLoading(true);
    try {
      const billing = await fetchBillingMe();
      setReferralShareUrl(String(billing?.referralShareUrl || ''));
      setReferralCode(String(billing?.referralCode || ''));
    } catch {
      setReferralShareUrl('');
      setReferralCode('');
    } finally {
      setReferralLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    setPushOn(Boolean(getCachedPushToken()));
  }, [signedIn]);

  useEffect(() => {
    loadReferral().catch(() => {});
  }, [loadReferral]);

  useEffect(() => {
    setName(user?.name || '');
    setOrganizationName(user?.organizationName || '');
    setCategory(user?.category || 'personal');
    setAvatarUrl(user?.avatarUrl || '');
  }, [user]);

  const shareReferral = async () => {
    if (!referralShareUrl) return;
    try {
      await Share.share({
        message: `Join me on Vamvamvam AI: ${referralShareUrl}`,
        url: referralShareUrl,
      });
    } catch {
      Linking.openURL(referralShareUrl).catch(() => {});
    }
  };

  const togglePush = async (value: boolean) => {
    if (!signedIn || isExpoGo()) {
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
      setPushNote(token ? 'Device registered for push.' : 'Could not get an Expo push token.');
    } catch (err: any) {
      setPushOn(false);
      setPushNote(err?.message || 'Push setup failed');
    } finally {
      setPushBusy(false);
    }
  };

  const save = async () => {
    if (!signedIn) return;
    setSaving(true);
    setSaveError(null);
    setSaveNote(null);
    try {
      const data = await updateProfile({
        name: name.trim(),
        organizationName: organizationName.trim(),
        category,
        avatarUrl: avatarUrl.trim(),
      });
      const next: ApiUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        category: data.category,
        organizationName: data.organizationName,
        role: data.role,
      };
      const refresh = (await SecureStore.getItemAsync('brosai_refresh_token')) || '';
      if (getAccessToken() && refresh) {
        await saveSession(next, { accessToken: getAccessToken(), refreshToken: refresh });
      }
      await refreshProfile();
      setSaveNote('Profile saved.');
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenVideo uri={BRAND_VIDEO} shade={0.65} />
      <KeyboardAvoidingView
        style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 110 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.top}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          <Text style={styles.title}>Profile</Text>
          {onOpenChat ? (
            <Pressable onPress={onOpenChat} style={styles.chat} hitSlop={8}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
            </Pressable>
          ) : (
            <View style={styles.chat} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.card}>
            {!signedIn ? (
              <>
                <Text style={styles.cardTitle}>Not signed in</Text>
                <Text style={styles.cardBody}>Sign in to sync jobs, brands, and push alerts.</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.email}>{user?.email || '—'}</Text>
                <Text style={styles.emailHint}>Email can’t be changed here.</Text>

                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#71717a"
                  style={styles.input}
                />

                <Text style={styles.label}>Organization</Text>
                <TextInput
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  placeholder="Company or org"
                  placeholderTextColor="#71717a"
                  style={styles.input}
                />

                <Text style={styles.label}>Avatar URL</Text>
                <TextInput
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  placeholder="https://"
                  placeholderTextColor="#71717a"
                  style={styles.input}
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Category</Text>
                <View style={styles.chips}>
                  {CATEGORIES.map((item) => {
                    const on = category === item;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => setCategory(item)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{item}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {saveNote ? <Text style={styles.ok}>{saveNote}</Text> : null}
                {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

                <Pressable onPress={save} style={[styles.cta, saving && styles.ctaBusy]} disabled={saving}>
                  {saving ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Save profile</Text>}
                </Pressable>

                <View style={styles.pushRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pushTitle}>Push notifications</Text>
                    <Text style={styles.pushBody}>Approvals and clarifying questions.</Text>
                  </View>
                  <Switch
                    value={pushOn}
                    onValueChange={togglePush}
                    disabled={pushBusy || isExpoGo()}
                    trackColor={{ false: '#3f3f46', true: ACCENT }}
                    thumbColor="#fff"
                  />
                </View>
                {pushNote ? <Text style={styles.note}>{pushNote}</Text> : null}

                <View style={styles.referralBlock}>
                  <Text style={styles.label}>Referral link</Text>
                  {referralLoading ? (
                    <ActivityIndicator color={ACCENT} style={{ marginVertical: 8 }} />
                  ) : (
                    <>
                      <Text style={styles.referralUrl} selectable>
                        {referralShareUrl || '—'}
                      </Text>
                      {referralCode ? (
                        <Text style={styles.emailHint}>Code: {referralCode}</Text>
                      ) : null}
                      <Pressable
                        onPress={shareReferral}
                        style={[styles.cta, !referralShareUrl && styles.ctaBusy]}
                        disabled={!referralShareUrl}
                      >
                        <Text style={styles.ctaText}>Share referral link</Text>
                      </Pressable>
                    </>
                  )}
                </View>

                <Pressable onPress={onOpenConnections} style={styles.supportRow}>
                  <View style={styles.supportIcon}>
                    <Ionicons name="share-social-outline" size={18} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pushTitle}>Connections</Text>
                    <Text style={styles.pushBody}>Link LinkedIn, X, Facebook, Threads</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </Pressable>

                <Pressable onPress={onOpenBilling} style={styles.supportRow}>
                  <View style={styles.supportIcon}>
                    <Ionicons name="card-outline" size={18} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pushTitle}>Billing & referrals</Text>
                    <Text style={styles.pushBody}>Plans, upgrades, share your referral link</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={MUTED} />
                </Pressable>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={() => {
                Linking.openURL(SUPPORT_URL).catch(() => {});
              }}
              style={styles.supportRow}
            >
              <View style={styles.supportIcon}>
                <Ionicons name="headset-outline" size={18} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pushTitle}>Contact support</Text>
                <Text style={styles.pushBody}>{SUPPORT_EMAIL}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={MUTED} />
            </Pressable>

            <Pressable
              onPress={() => {
                (signedIn ? signOut() : signIn()).catch(() => {});
              }}
              style={[styles.cta, styles.secondaryCta]}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#082f49" />
              ) : (
                <Text style={styles.ctaText}>{signedIn ? 'Sign out' : 'Sign in with Google'}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chat: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 22, fontWeight: '700' },
  card: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 20,
    padding: 18,
  },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardBody: { marginTop: 6, color: MUTED, fontSize: 15, lineHeight: 21 },
  label: { color: ACCENT, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  email: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emailHint: { color: MUTED, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: '#111113',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#111113',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: ACCENT },
  chipText: { color: MUTED, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  chipTextOn: { color: '#082f49' },
  pushRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2e',
  },
  pushTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pushBody: { marginTop: 2, color: MUTED, fontSize: 12 },
  supportRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2e',
  },
  supportIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#102027',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: 10, color: MUTED, fontSize: 12 },
  referralBlock: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a2e',
  },
  referralUrl: {
    color: '#e4e4e7',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  ok: { marginTop: 10, color: '#86efac', fontSize: 13 },
  error: { marginTop: 10, color: '#f87171', fontSize: 13 },
  cta: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryCta: { marginTop: 12 },
  ctaBusy: { opacity: 0.7 },
  ctaText: { color: '#082f49', fontWeight: '700' },
});
