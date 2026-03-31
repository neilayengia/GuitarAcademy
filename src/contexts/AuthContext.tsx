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
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSession(session: Session | null) {
    if (session?.user) {
      setUser(session.user);
      const prof = await fetchProfile(session.user.id);
      setProfile(prof);
      await hydrateStoreFromRemote(session.user.id);
    } else {
      setUser(null);
      setProfile(null);
      useAppStore.setState({ _userId: null });
    }
    setLoading(false);
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

  const signOut = async () => {
    await supabase.auth.signOut();
    useAppStore.getState().resetProgress();
    useAppStore.setState({ _userId: null });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
