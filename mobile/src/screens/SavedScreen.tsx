import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, CARD, MUTED } from '../theme';
import { useSession } from '../session';

const SAVED = [
  { name: 'hero-option-a.png', meta: 'Design' },
  { name: 'hero-option-b.png', meta: 'Design' },
  { name: 'brand-guidelines.pdf', meta: 'Brand Brain' },
];

export function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn } = useSession();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Saved</Text>
      {signedIn ? (
        <View style={styles.list}>
          {SAVED.map((item) => (
            <View key={item.name} style={styles.row}>
              <View style={styles.icon}>
                <Ionicons
                  name={item.name.endsWith('.pdf') ? 'document-outline' : 'image-outline'}
                  size={18}
                  color="#e4e4e7"
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.meta}</Text>
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
          <Pressable onPress={signIn} style={styles.cta}>
            <Text style={styles.ctaText}>Sign in</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  list: {
    marginTop: 18,
    gap: 10,
  },
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
  copy: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    marginTop: 2,
    color: MUTED,
    fontSize: 13,
  },
  guest: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  guestTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  guestBody: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 21,
  },
  cta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaText: {
    color: '#082f49',
    fontWeight: '700',
  },
});
