import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Session = {
  signedIn: boolean;
  name: string;
  signIn: () => void;
  signOut: () => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);

  const value = useMemo<Session>(
    () => ({
      signedIn,
      name: 'You',
      signIn: () => setSignedIn(true),
      signOut: () => setSignedIn(false),
    }),
    [signedIn],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
