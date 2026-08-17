import { loginWithGoogleOAuth } from '../config/firebase';
import type { UserProfile } from '../types';

type LoginFn = (userData: Partial<UserProfile>, accessToken: string, refreshToken: string) => void;

export async function establishGoogleSession(login: LoginFn): Promise<{ ok: boolean; error?: string }> {
  try {
        window.google?.accounts?.id?.cancel();
  } catch {
    /* GIS may not be loaded */
  }

  const res = await loginWithGoogleOAuth();
  if (!res.success || !res.user) {
    return { ok: false, error: res.error || 'Google sign-in failed' };
  }

  const email = res.user.email || 'user@vamvamvam.ai';
  const name = res.user.displayName || 'Vamvamvam User';
  const avatarUrl = res.user.photoURL || '';

  let lastBackendError = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const backendRes = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, avatarUrl }),
      });
      const backendData = await backendRes.json().catch(() => ({}));
      if (backendData.success && backendData.data?.user) {
        const dbUser = backendData.data.user;
        login(
          {
            id: dbUser.id || res.user.uid,
            name: dbUser.name || name,
            email: dbUser.email || email,
            avatarUrl: dbUser.avatarUrl || avatarUrl,
            role: dbUser.role || 'user',
            category: dbUser.category || 'business',
            organizationName: dbUser.organizationName || 'Vamvamvam Brand Account',
            authProvider: 'google',
          },
          backendData.data.accessToken || `acc_tok_${Date.now()}`,
          backendData.data.refreshToken || `ref_tok_${Date.now()}`
        );
        return { ok: true };
      }

      lastBackendError = backendData.error || `Server returned ${backendRes.status}`;
      const starting = backendRes.status === 503 || /starting|closing|closed|not connected/i.test(lastBackendError);
      if (starting && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
      break;
    } catch {
      lastBackendError = 'Could not reach the server';
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
    }
  }

  return {
    ok: false,
    error: /starting|closing|closed/i.test(lastBackendError)
      ? 'The server is still starting. Try signing in again in a moment.'
      : lastBackendError || 'Could not reach the server',
  };
}
