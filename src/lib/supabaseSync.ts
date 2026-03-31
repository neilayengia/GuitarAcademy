/**
 * supabaseSync.ts — Bidirectional sync between Zustand (localStorage) and Supabase
 *
 * Strategy: localStorage is the fast, offline-first read source.
 * Supabase is the durable, cross-device source of truth.
 * On login: fetch remote → merge with local → hydrate store → push merged state back.
 * On mutation: update local instantly → debounced write to Supabase.
 */

import { supabase } from './supabase';
import type { AppState, LessonProgress, PracticeSession, UserSettings } from '../store/useAppStore';

// ── Fetch all user data from Supabase ───────────────────────

export async function fetchUserData(userId: string): Promise<Partial<AppState> | null> {
  const [settingsRes, progressRes, lessonsRes, sessionsRes] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    supabase.from('user_progress').select('*').eq('user_id', userId).single(),
    supabase.from('lesson_progress').select('*').eq('user_id', userId),
    supabase.from('practice_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
  ]);

  if (progressRes.error && progressRes.error.code !== 'PGRST116') {
    console.error('Failed to fetch user progress:', progressRes.error);
    return null;
  }

  const settings = settingsRes.data;
  const progress = progressRes.data;
  const lessons = lessonsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];

  // Build lessonProgress record
  const lessonProgress: Record<string, LessonProgress> = {};
  for (const l of lessons) {
    lessonProgress[l.lesson_key] = {
      completed: l.completed,
      accuracy: l.accuracy ?? undefined,
      practiceTime: l.practice_time ?? undefined,
      lastAccessed: l.last_accessed ? new Date(l.last_accessed).getTime() : undefined,
    };
  }

  // Build recentSessions array
  const recentSessions: PracticeSession[] = sessions.map(s => ({
    date: new Date(s.created_at).getTime(),
    durationMinutes: s.duration_minutes,
    accuracy: s.accuracy,
    chordsPracticed: s.chords_practiced ?? [],
    bpm: s.bpm,
  }));

  return {
    lessonProgress,
    modulesUnlocked: progress?.modules_unlocked ?? [1, 2],
    currentStreak: progress?.current_streak ?? 0,
    lastPracticeDate: progress?.last_practice_date ?? null,
    totalPracticeMinutes: progress?.total_practice_minutes ?? 0,
    overallAccuracy: progress?.overall_accuracy ?? 0,
    sessionsCompleted: progress?.sessions_completed ?? 0,
    recentSessions,
    settings: settings ? {
      preferredRoot: settings.preferred_root,
      preferredVoicingType: settings.preferred_voicing_type,
      showIntervals: settings.show_intervals,
      metronomeVolume: settings.metronome_volume,
      defaultBpm: settings.default_bpm,
      theme: settings.theme,
    } : undefined,
  };
}

// ── Merge local + remote (take the "best" of each) ─────────

export function mergeData(local: Partial<AppState>, remote: Partial<AppState>): Partial<AppState> {
  // Merge lesson progress: take the most advanced state per lesson
  const mergedLessons: Record<string, LessonProgress> = { ...remote.lessonProgress };
  for (const [key, localLesson] of Object.entries(local.lessonProgress ?? {})) {
    const remoteLesson = mergedLessons[key];
    if (!remoteLesson) {
      mergedLessons[key] = localLesson;
    } else {
      mergedLessons[key] = {
        completed: localLesson.completed || remoteLesson.completed,
        accuracy: Math.max(localLesson.accuracy ?? 0, remoteLesson.accuracy ?? 0) || undefined,
        practiceTime: Math.max(localLesson.practiceTime ?? 0, remoteLesson.practiceTime ?? 0) || undefined,
        lastAccessed: Math.max(localLesson.lastAccessed ?? 0, remoteLesson.lastAccessed ?? 0) || undefined,
      };
    }
  }

  // Merge modules: union
  const mergedModules = [...new Set([
    ...(local.modulesUnlocked ?? []),
    ...(remote.modulesUnlocked ?? []),
  ])].sort();

  return {
    lessonProgress: mergedLessons,
    modulesUnlocked: mergedModules,
    currentStreak: Math.max(local.currentStreak ?? 0, remote.currentStreak ?? 0),
    lastPracticeDate: [local.lastPracticeDate, remote.lastPracticeDate]
      .filter(Boolean)
      .sort()
      .pop() ?? null,
    totalPracticeMinutes: Math.max(local.totalPracticeMinutes ?? 0, remote.totalPracticeMinutes ?? 0),
    overallAccuracy: Math.max(local.overallAccuracy ?? 0, remote.overallAccuracy ?? 0),
    sessionsCompleted: Math.max(local.sessionsCompleted ?? 0, remote.sessionsCompleted ?? 0),
    recentSessions: remote.recentSessions ?? local.recentSessions ?? [],
    settings: remote.settings ?? local.settings,
  };
}

// ── Sync progress to Supabase (debounced) ───────────────────

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSyncProgress(userId: string, state: AppState) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncProgressToSupabase(userId, state), 800);
}

async function syncProgressToSupabase(userId: string, state: AppState) {
  try {
    await supabase.from('user_progress').upsert({
      user_id: userId,
      modules_unlocked: state.modulesUnlocked,
      current_streak: state.currentStreak,
      last_practice_date: state.lastPracticeDate,
      total_practice_minutes: state.totalPracticeMinutes,
      overall_accuracy: state.overallAccuracy,
      sessions_completed: state.sessionsCompleted,
    });
  } catch (err) {
    console.error('Failed to sync progress:', err);
  }
}

// ── Sync a single lesson ────────────────────────────────────

export async function syncLessonToSupabase(userId: string, lessonKey: string, lesson: LessonProgress) {
  try {
    await supabase.from('lesson_progress').upsert({
      user_id: userId,
      lesson_key: lessonKey,
      completed: lesson.completed,
      accuracy: lesson.accuracy ?? null,
      practice_time: lesson.practiceTime ?? null,
      last_accessed: lesson.lastAccessed ? new Date(lesson.lastAccessed).toISOString() : null,
    }, { onConflict: 'user_id,lesson_key' });
  } catch (err) {
    console.error('Failed to sync lesson:', err);
  }
}

// ── Record a practice session ───────────────────────────────

export async function recordSessionToSupabase(userId: string, session: PracticeSession) {
  try {
    await supabase.from('practice_sessions').insert({
      user_id: userId,
      duration_minutes: session.durationMinutes,
      accuracy: session.accuracy,
      chords_practiced: session.chordsPracticed,
      bpm: session.bpm,
    });
  } catch (err) {
    console.error('Failed to record session:', err);
  }
}

// ── Sync settings ───────────────────────────────────────────

export async function syncSettingsToSupabase(userId: string, settings: UserSettings) {
  try {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      preferred_root: settings.preferredRoot,
      preferred_voicing_type: settings.preferredVoicingType,
      show_intervals: settings.showIntervals,
      metronome_volume: settings.metronomeVolume,
      default_bpm: settings.defaultBpm,
      theme: settings.theme,
    });
  } catch (err) {
    console.error('Failed to sync settings:', err);
  }
}

// ── Push full local state to Supabase (after merge on login) ─

export async function pushFullStateToSupabase(userId: string, state: Partial<AppState>) {
  // Progress
  await supabase.from('user_progress').upsert({
    user_id: userId,
    modules_unlocked: state.modulesUnlocked ?? [1, 2],
    current_streak: state.currentStreak ?? 0,
    last_practice_date: state.lastPracticeDate ?? null,
    total_practice_minutes: state.totalPracticeMinutes ?? 0,
    overall_accuracy: state.overallAccuracy ?? 0,
    sessions_completed: state.sessionsCompleted ?? 0,
  });

  // Settings
  if (state.settings) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      preferred_root: state.settings.preferredRoot,
      preferred_voicing_type: state.settings.preferredVoicingType,
      show_intervals: state.settings.showIntervals,
      metronome_volume: state.settings.metronomeVolume,
      default_bpm: state.settings.defaultBpm,
      theme: state.settings.theme,
    });
  }

  // Lessons
  for (const [key, lesson] of Object.entries(state.lessonProgress ?? {})) {
    await supabase.from('lesson_progress').upsert({
      user_id: userId,
      lesson_key: key,
      completed: lesson.completed,
      accuracy: lesson.accuracy ?? null,
      practice_time: lesson.practiceTime ?? null,
      last_accessed: lesson.lastAccessed ? new Date(lesson.lastAccessed).toISOString() : null,
    }, { onConflict: 'user_id,lesson_key' });
  }
}

// ── Reset remote data ───────────────────────────────────────

export async function resetRemoteProgress(userId: string) {
  await Promise.all([
    supabase.from('user_progress').upsert({
      user_id: userId,
      modules_unlocked: [1, 2],
      current_streak: 0,
      last_practice_date: null,
      total_practice_minutes: 0,
      overall_accuracy: 0,
      sessions_completed: 0,
    }),
    supabase.from('lesson_progress').delete().eq('user_id', userId),
    supabase.from('practice_sessions').delete().eq('user_id', userId),
  ]);
}
