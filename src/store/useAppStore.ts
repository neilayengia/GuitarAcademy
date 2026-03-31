/**
 * useAppStore.ts — Global state management with Zustand
 *
 * Persists user progress, settings, and practice statistics
 * to localStorage so nothing is lost on page refresh.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { debouncedSyncProgress, syncLessonToSupabase, recordSessionToSupabase, syncSettingsToSupabase, resetRemoteProgress } from '../lib/supabaseSync';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LessonProgress {
    completed: boolean;
    lastAccessed?: number; // timestamp
    accuracy?: number;     // 0-100
    practiceTime?: number; // minutes spent
}

export interface PracticeSession {
    date: number;          // timestamp
    durationMinutes: number;
    accuracy: number;
    chordsPracticed: string[];
    bpm: number;
}

export interface UserSettings {
    preferredRoot: string;
    preferredVoicingType: string;
    showIntervals: boolean;
    metronomeVolume: number;
    defaultBpm: number;
    theme: 'dark' | 'light';
}

export interface AppState {
    // ── Auth ──
    _userId: string | null;

    // ── User Progress ──
    lessonProgress: Record<string, LessonProgress>; // keyed by lessonId
    modulesUnlocked: number[];                       // module IDs
    currentStreak: number;                            // days
    lastPracticeDate: string | null;                  // ISO date string

    // ── Practice Stats ──
    totalPracticeMinutes: number;
    overallAccuracy: number;
    sessionsCompleted: number;
    recentSessions: PracticeSession[];

    // ── Settings ──
    settings: UserSettings;

    // ── Actions ──
    completeLesson: (moduleId: number, lessonIndex: number) => void;
    updateLessonAccuracy: (moduleId: number, lessonIndex: number, accuracy: number) => void;
    recordPracticeSession: (session: Omit<PracticeSession, 'date'>) => void;
    unlockModule: (moduleId: number) => void;
    updateSettings: (partial: Partial<UserSettings>) => void;
    resetProgress: () => void;
    setUserId: (id: string | null) => void;
    setUserState: (state: Partial<AppState>) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLessonKey(moduleId: number, lessonIndex: number): string {
    return `mod${moduleId}_lesson${lessonIndex}`;
}

function getToday(): string {
    return new Date().toISOString().slice(0, 10);
}

function calculateStreak(lastDate: string | null, currentStreak: number): number {
    if (!lastDate) return 1;
    const today = getToday();
    if (lastDate === today) return currentStreak; // already practiced today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastDate === yesterday.toISOString().slice(0, 10)) return currentStreak + 1;
    return 1; // streak broken
}

// ── Default Settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
    preferredRoot: 'C',
    preferredVoicingType: 'all',
    showIntervals: true,
    metronomeVolume: 0.5,
    defaultBpm: 120,
    theme: 'dark',
};

// ── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // ── Initial State ──
            _userId: null,
            lessonProgress: {},
            modulesUnlocked: [1, 2], // First two modules unlocked by default
            currentStreak: 0,
            lastPracticeDate: null,
            totalPracticeMinutes: 0,
            overallAccuracy: 0,
            sessionsCompleted: 0,
            recentSessions: [],
            settings: DEFAULT_SETTINGS,

            // ── Actions ──

            completeLesson: (moduleId, lessonIndex) => {
                const key = getLessonKey(moduleId, lessonIndex);
                set(state => ({
                    lessonProgress: {
                        ...state.lessonProgress,
                        [key]: {
                            ...state.lessonProgress[key],
                            completed: true,
                            lastAccessed: Date.now(),
                        },
                    },
                }));
                // Sync to Supabase
                const userId = get()._userId;
                if (userId) {
                    syncLessonToSupabase(userId, key, get().lessonProgress[key]);
                    debouncedSyncProgress(userId, get());
                }
            },

            updateLessonAccuracy: (moduleId, lessonIndex, accuracy) => {
                const key = getLessonKey(moduleId, lessonIndex);
                set(state => ({
                    lessonProgress: {
                        ...state.lessonProgress,
                        [key]: {
                            ...state.lessonProgress[key],
                            accuracy: Math.max(
                                state.lessonProgress[key]?.accuracy ?? 0,
                                accuracy
                            ),
                            lastAccessed: Date.now(),
                        },
                    },
                }));
                const userId = get()._userId;
                if (userId) syncLessonToSupabase(userId, key, get().lessonProgress[key]);
            },

            recordPracticeSession: (session) => {
                const fullSession: PracticeSession = { ...session, date: Date.now() };
                const state = get();
                const newStreak = calculateStreak(state.lastPracticeDate, state.currentStreak);
                const totalSessions = state.sessionsCompleted + 1;
                const newAccuracy = Math.round(
                    ((state.overallAccuracy * state.sessionsCompleted) + session.accuracy) / totalSessions
                );

                set({
                    recentSessions: [fullSession, ...state.recentSessions].slice(0, 50),
                    totalPracticeMinutes: state.totalPracticeMinutes + session.durationMinutes,
                    overallAccuracy: newAccuracy,
                    sessionsCompleted: totalSessions,
                    currentStreak: newStreak,
                    lastPracticeDate: getToday(),
                });
                // Sync to Supabase
                const userId = get()._userId;
                if (userId) {
                    recordSessionToSupabase(userId, fullSession);
                    debouncedSyncProgress(userId, get());
                }
            },

            unlockModule: (moduleId) => {
                set(state => ({
                    modulesUnlocked: state.modulesUnlocked.includes(moduleId)
                        ? state.modulesUnlocked
                        : [...state.modulesUnlocked, moduleId],
                }));
                const userId = get()._userId;
                if (userId) debouncedSyncProgress(userId, get());
            },

            updateSettings: (partial) => {
                set(state => ({
                    settings: { ...state.settings, ...partial },
                }));
                const userId = get()._userId;
                if (userId) syncSettingsToSupabase(userId, get().settings);
            },

            resetProgress: () => {
                const userId = get()._userId;
                set({
                    lessonProgress: {},
                    modulesUnlocked: [1, 2],
                    currentStreak: 0,
                    lastPracticeDate: null,
                    totalPracticeMinutes: 0,
                    overallAccuracy: 0,
                    sessionsCompleted: 0,
                    recentSessions: [],
                });
                if (userId) resetRemoteProgress(userId);
            },

            setUserId: (id) => set({ _userId: id }),
            setUserState: (newState) => set(newState),
        }),
        {
            name: 'rubato-academy-storage',
            storage: createJSONStorage(() => localStorage),
            version: 1,
            // Only persist what we need (not functions)
            partialize: (state) => ({
                lessonProgress: state.lessonProgress,
                modulesUnlocked: state.modulesUnlocked,
                currentStreak: state.currentStreak,
                lastPracticeDate: state.lastPracticeDate,
                totalPracticeMinutes: state.totalPracticeMinutes,
                overallAccuracy: state.overallAccuracy,
                sessionsCompleted: state.sessionsCompleted,
                recentSessions: state.recentSessions,
                settings: state.settings,
            }),
        }
    )
);
