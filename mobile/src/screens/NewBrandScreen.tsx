import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT, CRON_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import { saveBrandBrain } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';

type Props = {
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
  onCreated?: () => void;
};

export function NewBrandScreen({ onOpenChat, onOpenProfile, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!brandName.trim()) {
      setError('Brand name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBrandBrain({
        brandName: brandName.trim(),
        industry: industry.trim(),
        description: description.trim(),
        website: website.trim(),
      });
      onCreated?.();
    } catch (err: any) {
      setError(err?.message || 'Could not save brand');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenVideo uri={CRON_VIDEO} />
      <KeyboardAvoidingView
        style={[styles.content, { paddingTop: insets.top + 8 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProfileHeader onOpenChat={onOpenChat} onOpenProfile={onOpenProfile} />
        <Text style={styles.title}>New brand</Text>
        <Text style={styles.sub}>Add a Brand Brain so your workers stay on-voice.</Text>

        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={styles.guestBody}>Sign in to create a brand.</Text>
            <Pressable onPress={() => { signIn().catch(() => {}); }} style={styles.cta} disabled={authBusy}>
              {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Brand name</Text>
            <TextInput
              value={brandName}
              onChangeText={setBrandName}
              placeholder="e.g. Ajeoba"
              placeholderTextColor="#71717a"
              style={styles.input}
            />
            <Text style={styles.label}>Industry</Text>
            <TextInput
              value={industry}
              onChangeText={setIndustry}
              placeholder="e.g. agriculture"
              placeholderTextColor="#71717a"
              style={styles.input}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What this brand is about"
              placeholderTextColor="#71717a"
              style={[styles.input, styles.area]}
              multiline
            />
            <Text style={styles.label}>Website</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholder="https://"
              placeholderTextColor="#71717a"
              style={styles.input}
              autoCapitalize="none"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable onPress={save} style={[styles.cta, saving && styles.ctaBusy]} disabled={saving}>
              {saving ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Create brand</Text>}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700' },
  sub: { color: MUTED, marginTop: 8, marginBottom: 16, fontSize: 15, lineHeight: 21 },
  form: { flex: 1 },
  label: { color: ACCENT, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 14,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  area: { minHeight: 90, textAlignVertical: 'top' },
  error: { color: '#f87171', marginTop: 10 },
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
