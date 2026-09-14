import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, CARD, MUTED } from '../theme';
import { useSession } from '../session';

const RESULTS = [
  { title: 'Dark mode contrast', meta: 'Voice · just now' },
  { title: 'Brand Brain · Vamvamvam', meta: 'Voice, colors, rules' },
  { title: 'Copy Desk drafts', meta: '3 waiting for approval' },
];

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn } = useSession();
  const [query, setQuery] = useState('');
  const shown = RESULTS.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Search</Text>
      <View style={styles.field}>
        <Ionicons name="search-outline" size={18} color={MUTED} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={signedIn ? 'Chats, brands, copy' : 'Sign in to search your work'}
          placeholderTextColor="#71717a"
          style={styles.input}
          editable={signedIn}
        />
      </View>

      {signedIn ? (
        <View style={styles.list}>
          {shown.map((item) => (
            <View key={item.title} style={styles.row}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.meta}</Text>
            </View>
          ))}
          {shown.length === 0 && <Text style={styles.empty}>Nothing matches that.</Text>}
        </View>
      ) : (
        <View style={styles.guest}>
          <Text style={styles.guestTitle}>Your library stays private</Text>
          <Text style={styles.guestBody}>Sign in to search chats, Brand Brain, and saved copy.</Text>
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
  field: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  list: {
    marginTop: 16,
    gap: 10,
  },
  row: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rowMeta: {
    marginTop: 4,
    color: MUTED,
    fontSize: 13,
  },
  empty: {
    color: MUTED,
    fontSize: 15,
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
