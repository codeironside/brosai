import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CARD, MUTED } from '../theme';

const TRANSCRIPT =
  'Pull the three designs from the shared folder and tell me which one has the strongest contrast in dark mode.';

const START_BARS = [
  10, 18, 28, 14, 36, 22, 16, 32, 12, 26, 40, 18, 24, 14, 34, 20, 12, 30, 16, 38, 22, 14, 28, 18, 36, 12, 24, 16,
];

type FileItem = {
  id: string;
  name: string;
  kind: 'image' | 'file';
};

const START_FILES: FileItem[] = [
  { id: 'a', name: 'hero-option-a.png', kind: 'image' },
  { id: 'b', name: 'hero-option-b.png', kind: 'image' },
  { id: 'c', name: 'brand-guidelines.pdf', kind: 'file' },
];

function formatClock(total: number) {
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [listening, setListening] = useState(true);
  const [seconds, setSeconds] = useState(109);
  const [files, setFiles] = useState(START_FILES);
  const [sent, setSent] = useState(false);
  const bars = useRef(START_BARS.map(() => new Animated.Value(0.45))).current;

  useEffect(() => {
    if (!listening) return undefined;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [listening]);

  useEffect(() => {
    if (!listening) {
      bars.forEach((bar) => bar.setValue(0.35));
      return undefined;
    }
    const loops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 260 + (index % 5) * 50,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.28,
            duration: 260 + (index % 7) * 40,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [bars, listening]);

  const status = sent ? 'Sent' : listening ? 'Listening' : 'Paused';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice message</Text>
        <View style={styles.status}>
          <View style={[styles.dot, !listening && styles.dotOff]} />
          <Text style={styles.statusText}>
            {status} · {formatClock(seconds)}
          </Text>
        </View>
      </View>

      <Text style={styles.transcript}>{TRANSCRIPT}</Text>

      <View style={styles.waveWrap}>
        {START_BARS.map((height, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height,
                transform: [{ scaleY: bars[index] }],
              },
            ]}
          />
        ))}
      </View>

      {files.length > 0 && (
        <View style={styles.files}>
          {files.map((file) => (
            <View key={file.id} style={styles.fileRow}>
              <View style={styles.fileIcon}>
                <Ionicons
                  name={file.kind === 'image' ? 'image-outline' : 'link-outline'}
                  size={16}
                  color="#d4d4d8"
                />
              </View>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
              >
                <Ionicons name="close" size={16} color="#a1a1aa" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          onPress={() => {
            setSent(false);
            setListening((value) => !value);
          }}
          style={styles.stop}
        >
          <View style={styles.stopMark} />
        </Pressable>
        <Text style={styles.stopLabel}>{listening ? 'Tap to stop' : sent ? 'Sent to your worker' : 'Tap to listen'}</Text>
        <Pressable
          onPress={() => {
            setListening(false);
            setSent(true);
          }}
          style={styles.send}
        >
          <Ionicons name="arrow-up" size={22} color="#fff" />
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
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#a1a1aa',
  },
  dotOff: {
    backgroundColor: '#3f3f46',
  },
  statusText: {
    color: MUTED,
    fontSize: 13,
  },
  transcript: {
    marginTop: 28,
    color: '#fff',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '500',
  },
  waveWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 72,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#6b6b70',
  },
  files: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 2,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  fileIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2a2a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 15,
  },
  controls: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stop: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMark: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#111',
  },
  stopLabel: {
    flex: 1,
    color: MUTED,
    fontSize: 16,
  },
  send: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3a3a3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
