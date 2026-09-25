import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MUTED, expoOut, type TabId } from '../theme';
import { JobsIcon } from './JobsIcon';

/** Footer order: Home · Brands · + · Agents · Jobs */
const NAV_TABS: { id: TabId; label: string; icon?: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'brand', label: 'Brands', icon: 'diamond-outline' },
  { id: 'agents', label: 'Agents', icon: 'people-outline' },
  { id: 'jobs', label: 'Jobs' },
];

type Props = {
  active: TabId;
  onChange: (id: TabId) => void;
  recording?: boolean;
  onStopRecording?: () => void;
};

function resolveHighlight(active: TabId): TabId {
  if (active === 'chat' || active === 'jobStart' || active === 'search') return 'home';
  if (active === 'profile' || active === 'connections' || active === 'billing') return 'home';
  if (active === 'brandCreate') return 'brand';
  if (active === 'agentCreate') return 'agents';
  return active;
}

export function TabBar({ active, onChange, recording = false, onStopRecording }: Props) {
  const insets = useSafeAreaInsets();
  const highlight = resolveHighlight(active);
  const plusOn = active === 'brandCreate' && !recording;
  const [slotWidth, setSlotWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;

  const leftTabs = useMemo(() => NAV_TABS.slice(0, 2), []);
  const rightTabs = useMemo(() => NAV_TABS.slice(2), []);

  const highlightIndex = useMemo(() => {
    const idx = NAV_TABS.findIndex((tab) => tab.id === highlight);
    return idx >= 0 ? idx : 0;
  }, [highlight]);

  useEffect(() => {
    if (slotWidth <= 0) return;
    const slotIndex = highlightIndex <= 1 ? highlightIndex : highlightIndex + 1;
    Animated.parallel([
      Animated.timing(indicatorX, {
        toValue: slotIndex * slotWidth + (slotWidth - 58) / 2,
        duration: 280,
        easing: expoOut,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [highlightIndex, indicatorOpacity, indicatorX, slotWidth]);

  const onBarLayout = (event: LayoutChangeEvent) => {
    setSlotWidth(event.nativeEvent.layout.width / 5);
  };

  const renderTab = (tab: (typeof NAV_TABS)[number]) => {
    const on = highlight === tab.id;
    return (
      <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={styles.slot} hitSlop={6}>
        <View style={styles.item}>
          {tab.id === 'jobs' ? (
            <JobsIcon color={on ? '#fff' : MUTED} active={on} size={22} />
          ) : (
            <Ionicons name={tab.icon!} size={22} color={on ? '#fff' : MUTED} />
          )}
          <Text style={[styles.label, on && styles.labelOn]}>{tab.label}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.bar} onLayout={onBarLayout}>
        {slotWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                opacity: indicatorOpacity,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        ) : null}

        {leftTabs.map(renderTab)}

        <Pressable
          onPress={() => {
            if (recording) {
              onStopRecording?.();
              return;
            }
            onChange('brandCreate');
          }}
          style={styles.slot}
          hitSlop={8}
        >
          <View style={[styles.plus, (plusOn || recording) && styles.plusOn, recording && styles.micOn]}>
            <Ionicons
              name={recording ? 'mic' : 'add'}
              size={recording ? 26 : 28}
              color={plusOn || recording ? '#fff' : '#111'}
            />
          </View>
        </Pressable>

        {rightTabs.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingTop: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,20,0.55)',
    borderRadius: 32,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    width: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 58,
    paddingVertical: 6,
    paddingHorizontal: 8,
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
  micOn: {
    backgroundColor: '#ef4444',
  },
});
