import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT, CHAT_VIDEO, MUTED } from '../theme';
import { useSession } from '../session';
import { askAi, createAiChatThread, fetchAiChat } from '../api/endpoints';
import { ScreenVideo } from '../components/ScreenVideo';
import { ProfileHeader } from '../components/ProfileHeader';

const START_BARS = [
  10, 18, 28, 14, 36, 22, 16, 32, 12, 26, 40, 18, 24, 14, 34, 20, 12, 30, 16, 38, 22, 14, 28, 18, 36, 12, 24, 16,
];

function formatClock(total: number) {
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatWhen(raw?: string) {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Thread = { id: string; title: string; preview?: string; updatedAt?: string };
type Message = { id: string; role: string; content: string; createdAt?: string };

type Props = {
  onBack?: () => void;
  onOpenProfile?: () => void;
  listening?: boolean;
  onListeningChange?: (value: boolean) => void;
};

export function ChatScreen({ onBack, onOpenProfile, listening = false, onListeningChange }: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, signIn, busy: authBusy } = useSession();
  const setListening = (value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(listening) : value;
    onListeningChange?.(next);
  };
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bars = useRef(START_BARS.map(() => new Animated.Value(0.45))).current;
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const applyChat = useCallback(
    (data: {
      threads?: Thread[];
      threadId?: string | null;
      messages?: Message[];
    }) => {
      setThreads(data.threads || []);
      setThreadId(data.threadId ?? null);
      setMessages(data.messages || []);
    },
    [],
  );

  const load = useCallback(
    async (soft = false, id?: string | null) => {
      if (soft) setRefreshing(true);
      setError(null);
      try {
        const data = await fetchAiChat('hireAi', id === undefined ? threadId : id);
        applyChat(data);
      } catch (err: any) {
        setError(err?.message || 'Could not load chats');
      } finally {
        setRefreshing(false);
      }
    },
    [applyChat, threadId],
  );

  useEffect(() => {
    if (!signedIn) return;
    load(false, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

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

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const openThread = async (id: string) => {
    setShowHistory(false);
    await load(false, id);
  };

  const newChat = async () => {
    setError(null);
    try {
      const data = await createAiChatThread('hireAi');
      applyChat(data);
      setShowHistory(false);
    } catch (err: any) {
      setError(err?.message || 'Could not start chat');
    }
  };

  const send = async () => {
    const message = draft.trim();
    if (!message || sending) return;
    setListening(false);
    setSending(true);
    setError(null);
    const optimistic: Message = {
      id: `local_${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    try {
      const result = await askAi(message, { channel: 'hireAi', threadId });
      setThreadId(result.threadId || threadId);
      if (Array.isArray(result.messages) && result.messages.length) {
        setMessages(result.messages);
      } else if (result.reply) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimistic.id),
          optimistic,
          {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: result.reply,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      const refreshed = await fetchAiChat('hireAi', result.threadId || threadId);
      applyChat(refreshed);
    } catch (err: any) {
      setError(err?.message || 'Could not reach your AI');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(message);
    } finally {
      setSending(false);
    }
  };

  if (!signedIn) {
    return (
      <View style={styles.root}>
        <ScreenVideo uri={CHAT_VIDEO} />
        <View style={[styles.content, styles.center, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.guestTitle}>Talk to your AI</Text>
          <Text style={styles.guestBody}>Sign in so messages go to Hire AI on the backend.</Text>
          <Pressable onPress={() => { signIn().catch(() => {}); }} style={styles.cta} disabled={authBusy}>
            {authBusy ? <ActivityIndicator color="#082f49" /> : <Text style={styles.ctaText}>Sign in with Google</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  const status = sending ? 'Sending' : listening ? 'Listening' : 'Ready';
  const activeTitle = threads.find((t) => t.id === threadId)?.title || 'Hire AI';

  return (
    <View style={styles.root}>
      <ScreenVideo uri={CHAT_VIDEO} shade={0.62} />
      <KeyboardAvoidingView
        style={[styles.content, { paddingTop: insets.top + 8 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ProfileHeader onOpenProfile={onOpenProfile} />
        <View style={styles.header}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {activeTitle}
            </Text>
            <Text style={styles.statusText}>
              {status} · {formatClock(seconds)}
            </Text>
          </View>
          <Pressable onPress={() => setShowHistory((v) => !v)} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="time-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={newChat} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        {showHistory ? (
          <ScrollView
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
            }
          >
            <Text style={styles.hint}>Pull down to refresh · tap a chat to open</Text>
            {threads.length === 0 ? <Text style={styles.empty}>No chat history yet.</Text> : null}
            {threads.map((thread) => (
              <Pressable
                key={thread.id}
                onPress={() => openThread(thread.id)}
                style={[styles.thread, thread.id === threadId && styles.threadOn]}
              >
                <Text style={styles.threadTitle} numberOfLines={1}>
                  {thread.title || 'Chat'}
                </Text>
                <Text style={styles.threadMeta} numberOfLines={2}>
                  {[formatWhen(thread.updatedAt), thread.preview].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <>
            {listening ? (
              <View style={styles.waveWrap}>
                {START_BARS.map((height, index) => (
                  <Animated.View
                    key={index}
                    style={[styles.bar, { height, transform: [{ scaleY: bars[index] }] }]}
                  />
                ))}
              </View>
            ) : null}

            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />
              }
            >
              <Text style={styles.hint}>Pull down to refresh</Text>
              {messages.length === 0 ? (
                <Text style={styles.empty}>Ask Hire AI to draft, schedule, or check your workers.</Text>
              ) : null}
              {messages.map((msg) => {
                const mine = msg.role === 'user';
                return (
                  <View key={msg.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAi]}>
                    <Text style={styles.bubbleRole}>{mine ? 'You' : 'Hire AI'}</Text>
                    <Text style={styles.bubbleText}>{msg.content}</Text>
                    {msg.createdAt ? <Text style={styles.bubbleTime}>{formatWhen(msg.createdAt)}</Text> : null}
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!showHistory ? (
          <View style={styles.composer}>
            {!listening ? (
              <Pressable
                onPress={() => {
                  setSeconds(0);
                  setListening(true);
                }}
                style={styles.micStart}
                hitSlop={6}
              >
                <Ionicons name="mic-outline" size={22} color="#fff" />
              </Pressable>
            ) : null}
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder={listening ? 'Listening… tap mic in the footer to stop' : 'Message Hire AI'}
              placeholderTextColor="#71717a"
              style={styles.input}
              editable={!sending && !listening}
              returnKeyType="send"
              onSubmitEditing={send}
              blurOnSubmit={false}
            />
            <Pressable onPress={send} style={styles.send} disabled={sending || !draft.trim() || listening}>
              {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-up" size={22} color="#fff" />}
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 12 },
  center: { justifyContent: 'center', gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28,28,30,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statusText: { color: MUTED, fontSize: 12, marginTop: 2 },
  hint: { color: MUTED, fontSize: 12, marginBottom: 10 },
  empty: { color: MUTED, fontSize: 14, marginBottom: 12 },
  historyList: { flex: 1 },
  thread: {
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  threadOn: { borderWidth: 1, borderColor: ACCENT },
  threadTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  threadMeta: { color: MUTED, fontSize: 12, marginTop: 4, lineHeight: 16 },
  messages: { flex: 1 },
  bubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    maxWidth: '92%',
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(125,211,252,0.18)',
  },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(28,28,30,0.95)',
  },
  bubbleRole: { color: ACCENT, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bubbleText: { color: '#e4e4e7', fontSize: 14, lineHeight: 20 },
  bubbleTime: { color: MUTED, fontSize: 11, marginTop: 6 },
  waveWrap: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 8,
  },
  bar: { width: 3, borderRadius: 2, backgroundColor: '#6b6b70' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(28,28,30,0.95)',
    borderRadius: 18,
    padding: 8,
  },
  micStart: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3a3a3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3a3a3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  guestBody: { color: MUTED, fontSize: 15, lineHeight: 21 },
  cta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaText: { color: '#082f49', fontWeight: '700' },
  error: { color: '#f87171', marginBottom: 8 },
});
