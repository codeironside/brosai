import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT, AGENTS_VIDEO, MUTED, POSTING_FREQUENCIES } from '../theme';
import { useSession } from '../session';
import { fetchBrandBrains, saveManager } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';

type Props = {
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
  onCreated?: () => void;
};

export function NewAgentScreen({ onOpenChat, onOpenProfile, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const [name, setName] = useState('Alex');
  const [role, setRole] = useState('AI Social Manager');
  const [goal, setGoal] = useState('');
  const [frequency, setFrequency] = useState<string>(POSTING_FREQUENCIES[2]);
  const [brands, setBrands] = useState<any[]>([]);
  const [brandId, setBrandId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const loadBrands = useCallback(async () => {
    try {
      const data = await fetchBrandBrains();
      const items = Array.isArray(data.items) ? data.items : [];
      setBrands(items);
      setBrandId(data.activeId || items[0]?.id || '');
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (signedIn) loadBrands();
  }, [loadBrands, signedIn]);

  const save = async () => {
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }
    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      const data = await saveManager({
        name: name.trim(),
        role: role.trim(),
        goal: goal.trim() || 'Generate Leads & Build Brand Presence',
        postingFrequency: frequency,
        workingHours: '24/7 Autopilot',
        brandId,
        postTo: [],
      });
      if (Array.isArray(data?.warnings) && data.warnings.length) {
        setWarnings(data.warnings);
      }
      onCreated?.();
    } catch (err: any) {
      setError(err?.message || 'Could not create agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenVideo uri={AGENTS_VIDEO} />
      <KeyboardAvoidingView
        style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 100 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProfileHeader onOpenChat={onOpenChat} onOpenProfile={onOpenProfile} />
        <Text style={styles.title}>New agent</Text>
        <Text style={styles.sub}>Name the worker and choose how often it should post.</Text>

        {!signedIn ? (
          <View style={styles.guest}>
            <Text style={styles.guestBody}>Sign in to hire an agent.</Text>
            <Pressable onPress={() => { signIn().catch(() => {}); }} style={styles.cta} disabled={authBusy}>
              {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </Pressable>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alex"
              placeholderTextColor="#71717a"
              style={styles.input}
            />
            <Text style={styles.label}>Role</Text>
            <TextInput
              value={role}
              onChangeText={setRole}
              placeholder="AI Social Manager"
              placeholderTextColor="#71717a"
              style={styles.input}
            />
            <Text style={styles.label}>Goal</Text>
            <TextInput
              value={goal}
              onChangeText={setGoal}
              placeholder="What should this agent optimize for?"
              placeholderTextColor="#71717a"
              style={[styles.input, styles.area]}
              multiline
            />

            <Text style={styles.label}>Posting frequency</Text>
            <View style={styles.chips}>
              {POSTING_FREQUENCIES.map((item) => {
                const on = frequency === item;
                return (
                  <Pressable key={item} onPress={() => setFrequency(item)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            {brands.length > 0 ? (
              <>
                <Text style={styles.label}>Brand</Text>
                <View style={styles.chips}>
                  {brands.map((brand) => {
                    const id = String(brand.id || '');
                    const on = brandId === id;
                    return (
                      <Pressable key={id} onPress={() => setBrandId(id)} style={[styles.chip, on && styles.chipOn]}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>
                          {brand.brandName || 'Brand'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {warnings.map((w) => (
              <Text key={w} style={styles.warn}>
                {w}
              </Text>
            ))}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable onPress={save} style={[styles.cta, saving && styles.ctaBusy]} disabled={saving}>
              {saving ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Create agent</Text>}
            </Pressable>
          </ScrollView>
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
  label: { color: ACCENT, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 14,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  area: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipOn: { backgroundColor: ACCENT },
  chipText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: '#082f49' },
  warn: { color: '#fbbf24', marginTop: 8, fontSize: 12 },
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
