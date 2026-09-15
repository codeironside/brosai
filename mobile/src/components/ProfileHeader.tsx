import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, MUTED } from '../theme';
import { useSession } from '../session';

type Props = {
  onOpenChat?: () => void;
  onOpenProfile?: () => void;
};

export function ProfileHeader({ onOpenChat, onOpenProfile }: Props) {
  const { signedIn, user, signIn, busy } = useSession();
  const initial = (user?.name?.[0] || '?').toUpperCase();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={signedIn ? onOpenProfile : () => { signIn().catch(() => {}); }}
        style={styles.identity}
      >
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{signedIn ? initial : '?'}</Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>
            {signedIn ? user?.name || 'You' : 'Sign in'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {signedIn ? user?.email || 'Profile' : busy ? 'Opening Google…' : 'Tap to continue'}
          </Text>
        </View>
      </Pressable>

      {onOpenChat ? (
        <Pressable onPress={onOpenChat} style={styles.chatBtn} hitSlop={8}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1c1c1e',
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#102027',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: ACCENT, fontWeight: '700', fontSize: 18 },
  copy: { flex: 1 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  meta: { marginTop: 2, color: MUTED, fontSize: 12 },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
