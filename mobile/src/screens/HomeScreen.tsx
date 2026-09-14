import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, CARD, MUTED } from '../theme';
import { useSession } from '../session';

const STATS = [
  { label: 'Published', value: '4', hint: 'posts' },
  { label: 'Scheduled', value: '12', hint: 'queued' },
  { label: 'Comments', value: '27', hint: 'today' },
  { label: 'Replies', value: '19', hint: 'handled' },
  { label: 'Messages', value: '8', hint: 'new' },
  { label: 'Engagement', value: '18%', hint: 'this week' },
];

const CAN = [
  {
    title: 'Hire AI',
    body: 'Workers post, reply, and keep your accounts moving while you sleep.',
    icon: 'flash-outline' as const,
  },
  {
    title: 'Brand Brain',
    body: 'Voice, colors, and rules stay in memory so nothing goes off-brand.',
    icon: 'sparkles-outline' as const,
  },
  {
    title: 'Copy Desk',
    body: 'Drafts wait for your approval before they go live.',
    icon: 'create-outline' as const,
  },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn } = useSession();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      {signedIn ? <SignedIn /> : <SignedOut onSignIn={signIn} />}
    </View>
  );
}

function SignedIn() {
  return (
    <View style={styles.fill}>
      <Text style={styles.kicker}>AI WORKERS</Text>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.sub}>Your workers kept posting, replying, and watching the inbox.</Text>

      <View style={styles.grid}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.row}>
            {STATS.slice(row * 2, row * 2 + 2).map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statHint}>{stat.hint}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.attention}>
        <Ionicons name="alert-circle-outline" size={18} color="#fbbf24" />
        <Text style={styles.attentionText}>3 items need you</Text>
      </View>
    </View>
  );
}

function SignedOut({ onSignIn }: { onSignIn: () => void }) {
  return (
    <View style={styles.fill}>
      <Text style={styles.kicker}>VAMVAMVAM AI</Text>
      <Text style={styles.title}>Ship AI workers while you sleep</Text>
      <Text style={styles.sub}>Sign in to see your stats. Until then, this is what the app does.</Text>

      <View style={styles.canList}>
        {CAN.map((item) => (
          <View key={item.title} style={styles.can}>
            <View style={styles.canIcon}>
              <Ionicons name={item.icon} size={18} color={ACCENT} />
            </View>
            <View style={styles.canCopy}>
              <Text style={styles.canTitle}>{item.title}</Text>
              <Text style={styles.canBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable onPress={onSignIn} style={styles.cta}>
        <Text style={styles.ctaText}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  fill: {
    flex: 1,
  },
  kicker: {
    color: ACCENT,
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  title: {
    marginTop: 8,
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
  },
  sub: {
    marginTop: 8,
    color: MUTED,
    fontSize: 15,
    lineHeight: 21,
  },
  grid: {
    flex: 1,
    marginTop: 16,
    gap: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
  },
  statLabel: {
    color: MUTED,
    fontSize: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  statHint: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  attention: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1c1708',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  attentionText: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: '600',
  },
  canList: {
    flex: 1,
    marginTop: 16,
    gap: 10,
    justifyContent: 'center',
  },
  can: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },
  canIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#102027',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canCopy: {
    flex: 1,
  },
  canTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  canBody: {
    marginTop: 3,
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    marginTop: 12,
    backgroundColor: ACCENT,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 16,
  },
  ctaText: {
    color: '#082f49',
    fontSize: 16,
    fontWeight: '700',
  },
});
