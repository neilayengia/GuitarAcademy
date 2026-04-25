import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchUserData, mergeData, pushFullStateToSupabase } from '../lib/supabaseSync';
import { useAppStore } from '../store/useAppStore';

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  subscription_tier: string;
  subscription_status: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInAsDevUser: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

async function hydrateStoreFromRemote(userId: string) {
  const store = useAppStore.getState();
  const remoteData = await fetchUserData(userId);
  if (!remoteData) return;

  const localData = {
    lessonProgress: store.lessonProgress,
    modulesUnlocked: store.modulesUnlocked,
    currentStreak: store.currentStreak,
    lastPracticeDate: store.lastPracticeDate,
    totalPracticeMinutes: store.totalPracticeMinutes,
    overallAccuracy: store.overallAccuracy,
    sessionsCompleted: store.sessionsCompleted,
    recentSessions: store.recentSessions,
    settings: store.settings,
  };

  const merged = mergeData(localData, remoteData);

  // Hydrate the Zustand store
  useAppStore.setState({
    ...merged,
    _userId: userId,
  });

  // Push merged state back to Supabase
  await pushFullStateToSupabase(userId, merged);
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, subscription_tier, subscription_status')
    .eq('id', userId)
    .single();
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle session on mount + auth state changes
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    }).catch((err) => {
      console.error('Failed to read auth session:', err);
      setUser(null);
      setProfile(null);
      useAppStore.setState({ _userId: null });
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function handleSession(session: Session | null) {
    try {
      if (session?.user) {
        setUser(session.user);
        useAppStore.setState({ _userId: session.user.id });

        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
        await hydrateStoreFromRemote(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        useAppStore.setState({ _userId: null });
      }
    } catch (err) {
      console.error('Failed to hydrate auth session:', err);
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
        useAppStore.setState({ _userId: null });
      }
    } finally {
      setLoading(false);
    }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  };

  const signInAsDevUser = () => {
    if (!import.meta.env.DEV) return;

    const devUser = {
      id: 'dev-local-user',
      email: 'dev@rubato.local',
      user_metadata: { display_name: 'Dev Player' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;

    setUser(devUser);
    setProfile({
      id: devUser.id,
      email: devUser.email ?? 'dev@rubato.local',
      display_name: 'Dev Player',
      subscription_tier: 'pro',
      subscription_status: 'active',
    });
    setLoading(false);
    useAppStore.setState({ _userId: null });
  };

  const signOut = async () => {
    if (user?.id !== 'dev-local-user') {
      await supabase.auth.signOut();
    }
    useAppStore.getState().resetProgress();
    setUser(null);
    setProfile(null);
    useAppStore.setState({ _userId: null });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, signInAsDevUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
