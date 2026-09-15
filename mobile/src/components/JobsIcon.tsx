import { StyleSheet, View } from 'react-native';
import { ACCENT } from '../theme';

/** Distinct jobs glyph — stacked pulse / workflow lanes (not a briefcase). */
export function JobsIcon({ color = '#8e8e93', size = 22, active = false }: { color?: string; size?: number; active?: boolean }) {
  const lane = Math.max(2, Math.round(size * 0.12));
  const gap = Math.max(2, Math.round(size * 0.14));
  const mark = active ? ACCENT : color;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.lane, { height: lane, backgroundColor: mark, opacity: 1, borderRadius: lane }]} />
      <View style={[styles.lane, { height: lane, width: '72%', backgroundColor: mark, opacity: 0.75, borderRadius: lane, marginTop: gap }]} />
      <View style={[styles.lane, { height: lane, width: '48%', backgroundColor: mark, opacity: 0.5, borderRadius: lane, marginTop: gap }]} />
      <View
        style={[
          styles.dot,
          {
            width: lane + 2,
            height: lane + 2,
            borderRadius: (lane + 2) / 2,
            backgroundColor: mark,
            right: 0,
            top: 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  lane: { width: '100%', alignSelf: 'flex-start' },
  dot: { position: 'absolute' },
});
