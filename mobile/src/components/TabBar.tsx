import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BAR, MUTED, type TabId } from '../theme';

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'search', label: 'Search', icon: 'search-outline' },
  { id: 'chat', label: '', icon: 'add' },
  { id: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { id: 'you', label: 'You', icon: 'person-outline' },
];

type Props = {
  active: TabId;
  onChange: (id: TabId) => void;
};

export function TabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          if (tab.id === 'chat') {
            return (
              <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={styles.slot} hitSlop={8}>
                <View style={[styles.plus, active === 'chat' && styles.plusOn]}>
                  <Ionicons name="add" size={28} color={active === 'chat' ? '#fff' : '#111'} />
                </View>
              </Pressable>
            );
          }

          const on = active === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={styles.slot} hitSlop={6}>
              <View style={[styles.item, on && styles.itemOn]}>
                <Ionicons name={tab.icon} size={22} color={on ? '#fff' : MUTED} />
                <Text style={[styles.label, on && styles.labelOn]}>{tab.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BAR,
    borderRadius: 32,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 58,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 18,
  },
  itemOn: {
    backgroundColor: '#2c2c2e',
  },
  label: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '500',
  },
  labelOn: {
    color: '#fff',
  },
  plus: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOn: {
    backgroundColor: '#3a3a3c',
  },
});
