import React, { useEffect } from 'react';
import { googleWebClientId, loginWithGoogleIdToken } from '../../config/firebase';
import { useApp } from '../../context/AppContext';

function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gis="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google script failed'));
    document.head.appendChild(script);
  });
}

export const GoogleOneTap: React.FC = () => {
  const { isAuthenticated, login } = useApp();

  useEffect(() => {
    if (isAuthenticated || !googleWebClientId) return;
    let cancelled = false;

    const run = async () => {
      try {
        await loadGis();
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: googleWebClientId,
          auto_select: true,
          cancel_on_tap_outside: false,
          context: 'signin',
          ux_mode: 'popup',
          callback: async (response) => {
            if (!response.credential) return;
            const res = await loginWithGoogleIdToken(response.credential);
            if (!res.success || !res.user) return;
            const email = res.user.email || '';
            const name = res.user.displayName || 'Google User';
            const avatarUrl = res.user.photoURL || '';
            try {
              const backendRes = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, avatarUrl }),
              });
              const backendData = await backendRes.json();
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
              }
            } catch {
              /* ignore; user can use the button */
            }
          },
        });
        window.google.accounts.id.prompt();
      } catch {
        /* One Tap is optional */
      }
    };

    void run();
    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel();
    };
  }, [isAuthenticated, login]);

  return null;
};
