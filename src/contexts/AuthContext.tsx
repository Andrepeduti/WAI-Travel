import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  refreshOnboardingStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const fetchSeqRef = useRef(0);

  const fetchOnboardingStatus = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setOnboardingCompleted(null);
      return;
    }
    const seq = ++fetchSeqRef.current;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, username, name')
        .eq('user_id', userId)
        .maybeSingle();
      if (seq !== fetchSeqRef.current) return; // stale
      if (error) {
        console.error('[Auth] failed to load profile onboarding status:', error);
        setOnboardingCompleted(null);
        return;
      }
      const complete = !!data?.onboarding_completed && !!data?.username && !!data?.name;
      setOnboardingCompleted(complete);
    } catch (e) {
      if (seq !== fetchSeqRef.current) return;
      console.error('[Auth] threw loading profile onboarding status:', e);
      setOnboardingCompleted(null);
    }
  }, []);

  const refreshOnboardingStatus = useCallback(async () => {
    await fetchOnboardingStatus(session?.user?.id);
  }, [fetchOnboardingStatus, session?.user?.id]);

  useEffect(() => {
    // 1. Subscribe FIRST so we never miss an event
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    // 2. Then read existing session and verify it
    const verifySession = async () => {
      const { data } = await supabase.auth.getSession();
      let activeSession = data.session;

      if (activeSession) {
        // Validate user against the auth server
        const { error } = await supabase.auth.getUser();
        
        if (error) {
          console.warn('[Auth] User validation failed. Session invalid or user deleted.', error);
          // Force logout if user is deleted or token is invalid
          try { await supabase.auth.signOut(); } catch { /* noop */ }
          try {
            Object.keys(localStorage)
              .filter((k) => k.startsWith('sb-') || k.includes('supabase.auth'))
              .forEach((k) => localStorage.removeItem(k));
          } catch { /* noop */ }
          activeSession = null;
        }
      }

      setSession(activeSession);
      setLoading(false);
    };

    verifySession();

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Sempre que a sessão mudar, recalcule o status de onboarding.
  useEffect(() => {
    if (!session?.user?.id) {
      setOnboardingCompleted(null);
      return;
    }
    fetchOnboardingStatus(session.user.id);
  }, [session?.user?.id, fetchOnboardingStatus]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('[Auth] signOut error:', error);
    } catch (e) {
      console.error('[Auth] signOut threw:', e);
    } finally {
      // Limpa qualquer cache local que possa restaurar a sessão
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sb-') || k.includes('supabase.auth'))
          .forEach((k) => localStorage.removeItem(k));
      } catch { /* noop */ }
      setSession(null);
      setOnboardingCompleted(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        onboardingCompleted,
        refreshOnboardingStatus,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
