import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  ApiUser,
  clearSession,
  getAccessToken,
  loadStoredSession,
  saveSession,
  setUnauthorizedHandler,
} from './api/client';
import { fetchMe } from './api/endpoints';
import { signInWithGoogle } from './api/googleAuth';
import { clearPushTokenFromBackend, syncPushTokenWithBackend } from './api/push';

type Session = {
  ready: boolean;
  signedIn: boolean;
  user: ApiUser | null;
  busy: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
};

const SessionContext = createContext<Session | null>(null);

function toUser(me: Record<string, unknown>, fallback?: ApiUser | null): ApiUser {
  return {
    id: String(me.id || fallback?.id || ''),
    name: String(me.name || fallback?.name || 'You'),
    email: String(me.email || fallback?.email || ''),
    avatarUrl: me.avatarUrl ? String(me.avatarUrl) : fallback?.avatarUrl,
    role: me.role ? String(me.role) : fallback?.role,
    category: me.category ? String(me.category) : fallback?.category,
    organizationName: me.organizationName
      ? String(me.organizationName)
      : fallback?.organizationName,
    autopilotMode: me.autopilotMode ? String(me.autopilotMode) : fallback?.autopilotMode,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    await clearPushTokenFromBackend().catch(() => {});
    await clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      try {
        const stored = await loadStoredSession();
        if (!stored.accessToken || !stored.user) return;
        setUser(stored.user);
        try {
          const me = await fetchMe();
          const next = toUser(me as Record<string, unknown>, stored.user);
          setUser(next);
          const refresh = (await SecureStore.getItemAsync('brosai_refresh_token')) || '';
          if (getAccessToken() && refresh) {
            await saveSession(next, { accessToken: getAccessToken(), refreshToken: refresh });
          }
          await syncPushTokenWithBackend().catch(() => {});
        } catch {
          await clearSession();
          setUser(null);
        }
      } finally {
        setReady(true);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await signInWithGoogle();
      setUser(next);
      await syncPushTokenWithBackend().catch(() => {});
    } catch (err: any) {
      const message = err?.message || 'Sign-in failed';
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) return;
    const me = await fetchMe();
    const next = toUser(me as Record<string, unknown>, user);
    setUser(next);
    const refresh = (await SecureStore.getItemAsync('brosai_refresh_token')) || '';
    if (getAccessToken() && refresh) {
      await saveSession(next, { accessToken: getAccessToken(), refreshToken: refresh });
    }
  }, [user]);

  const value = useMemo<Session>(
    () => ({
      ready,
      signedIn: Boolean(user),
      user,
      busy,
      error,
      signIn,
      signOut,
      refreshProfile,
      clearError: () => setError(null),
    }),
    [busy, error, ready, refreshProfile, signIn, signOut, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
