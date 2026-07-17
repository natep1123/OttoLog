import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Profile = {
  id: string;
  username: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until first session restore finishes */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (args: {
    username: string;
    email: string;
    password: string;
  }) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to load profile:', error.message);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  /** True until session restore + profile fetch (when logged in) finish */
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(userId));
  }, []);

  useEffect(() => {
    let mounted = true;

    const applySession = async (next: Session | null) => {
      setSession(next);
      if (next?.user) {
        const p = await fetchProfile(next.user.id);
        if (mounted) setProfile(p);
      } else if (mounted) {
        setProfile(null);
      }
    };

    // Hold the blank shell until profile is loaded so Home never flashes email first
    supabase.auth.getSession().then(async ({ data }) => {
      await applySession(data.session);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // getSession already handled the cold start
      if (event === 'INITIAL_SESSION') return;

      (async () => {
        if (mounted) setLoading(true);
        await applySession(next);
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(
    async ({
      username,
      email,
      password,
    }: {
      username: string;
      email: string;
      password: string;
    }) => {
      const trimmed = username.trim();
      if (!trimmed) {
        return { error: 'Username is required.' };
      }

      const { data: taken } = await supabase
        .from('users')
        .select('id')
        .ilike('username', trimmed)
        .maybeSingle();

      if (taken) {
        return { error: 'That username is already taken.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: trimmed },
        },
      });
      if (error) {
        return { error: error.message };
      }

      const userId = data.user?.id;
      if (!userId) {
        return { error: 'Could not create account. Try again.' };
      }

      // Trigger usually inserts the profile; upsert covers projects without the trigger yet
      const { error: profileError } = await supabase.from('users').upsert(
        { id: userId, username: trimmed },
        { onConflict: 'id' },
      );

      if (profileError) {
        // If no session yet (email confirm), trigger should have written the row
        const stillMissing = !(await fetchProfile(userId));
        if (stillMissing && data.session) {
          const msg = profileError.message.toLowerCase();
          return {
            error:
              msg.includes('duplicate') || msg.includes('unique')
                ? 'That username is already taken.'
                : `Signed up, but profile failed: ${profileError.message}`,
          };
        }
      }

      if (!data.session) {
        return { error: null, needsEmailConfirmation: true };
      }

      await refreshProfile();
      return { error: null };
    },
    [refreshProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_own_account', {});
    if (error) {
      const missingRpc =
        error.code === 'PGRST202' ||
        error.message.toLowerCase().includes('schema cache');

      return {
        error: missingRpc
          ? 'Account deletion is not set up yet. Run sql/002_delete_own_account.sql in Supabase, then try again.'
          : error.message,
      };
    }
    // Auth user is gone; clear local session without calling signOut against a deleted user
    setProfile(null);
    setSession(null);
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
