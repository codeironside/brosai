import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT, CARD, MUTED } from '../theme';
import { useSession } from '../session';

export function YouScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, signOut } = useSession();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>You</Text>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{signedIn ? 'Y' : '?'}</Text>
        </View>
        <Text style={styles.name}>{signedIn ? 'Signed in' : 'Not signed in'}</Text>
        <Text style={styles.body}>
          {signedIn
            ? 'Your home shows today’s worker stats. Sign out to see the product pitch again.'
            : 'Sign in to see published posts, replies, and what still needs you.'}
        </Text>
        <Pressable onPress={signedIn ? signOut : signIn} style={styles.cta}>
          <Text style={styles.ctaText}>{signedIn ? 'Sign out' : 'Sign in'}</Text>
        </Pressable>
      </View>
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
  avatarText: {
    color: ACCENT,
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    marginTop: 14,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    marginTop: 6,
    color: MUTED,
    fontSize: 15,
    lineHeight: 21,
  },
  cta: {
    marginTop: 16,
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
