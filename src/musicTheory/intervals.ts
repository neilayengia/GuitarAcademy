/**
 * intervals.ts — Interval types, calculation, and application
 *
 * Intervals are the building blocks of chords and scales.
 * Everything measured in semitones from a root note.
 */

import { pitchClass, noteNameFromPitchClass, semitoneDist, normalizeNoteName } from './notes';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Interval {
    name: string;        // e.g. 'minor 3rd'
    shortName: string;   // e.g. 'm3'
    semitones: number;   // e.g. 3
    degree: number;      // e.g. 3 (scale degree)
    quality: string;     // e.g. 'minor'
}

// ── Interval Database ────────────────────────────────────────────────────────

export const INTERVALS: Interval[] = [
    { name: 'unison', shortName: 'P1', semitones: 0, degree: 1, quality: 'perfect' },
    { name: 'minor 2nd', shortName: 'b2', semitones: 1, degree: 2, quality: 'minor' },
    { name: 'major 2nd', shortName: '2', semitones: 2, degree: 2, quality: 'major' },
    { name: 'minor 3rd', shortName: 'b3', semitones: 3, degree: 3, quality: 'minor' },
    { name: 'major 3rd', shortName: '3', semitones: 4, degree: 3, quality: 'major' },
    { name: 'perfect 4th', shortName: '4', semitones: 5, degree: 4, quality: 'perfect' },
    { name: 'tritone', shortName: 'b5', semitones: 6, degree: 5, quality: 'diminished' },
    { name: 'perfect 5th', shortName: '5', semitones: 7, degree: 5, quality: 'perfect' },
    { name: 'minor 6th', shortName: 'b6', semitones: 8, degree: 6, quality: 'minor' },
    { name: 'major 6th', shortName: '6', semitones: 9, degree: 6, quality: 'major' },
    { name: 'minor 7th', shortName: 'b7', semitones: 10, degree: 7, quality: 'minor' },
    { name: 'major 7th', shortName: '7', semitones: 11, degree: 7, quality: 'major' },
];

// Extended intervals (compound — above octave)
export const EXTENDED_INTERVALS: Interval[] = [
    { name: 'minor 9th', shortName: 'b9', semitones: 13, degree: 9, quality: 'minor' },
    { name: 'major 9th', shortName: '9', semitones: 14, degree: 9, quality: 'major' },
    { name: 'augmented 9th', shortName: '#9', semitones: 15, degree: 9, quality: 'augmented' },
    { name: 'perfect 11th', shortName: '11', semitones: 17, degree: 11, quality: 'perfect' },
    { name: 'augmented 11th', shortName: '#11', semitones: 18, degree: 11, quality: 'augmented' },
    { name: 'minor 13th', shortName: 'b13', semitones: 20, degree: 13, quality: 'minor' },
    { name: 'major 13th', shortName: '13', semitones: 21, degree: 13, quality: 'major' },
];

export const ALL_INTERVALS = [...INTERVALS, ...EXTENDED_INTERVALS];

// ── Lookup Maps ──────────────────────────────────────────────────────────────

/** Lookup interval by semitone distance (0–11 only) */
const bySemitone = new Map<number, Interval>();
INTERVALS.forEach(iv => bySemitone.set(iv.semitones, iv));

/** Lookup interval by short name */
const byShortName = new Map<string, Interval>();
ALL_INTERVALS.forEach(iv => byShortName.set(iv.shortName, iv));

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the interval between two note names.
 * Returns the ascending interval (0–11 semitones).
 */
export function getInterval(from: string, to: string): Interval {
    const semitones = semitoneDist(from, to);
    const interval = bySemitone.get(semitones);
    if (!interval) throw new Error(`No interval for ${semitones} semitones`);
    return interval;
}

/**
 * Apply an interval (by semitones) to a root note name.
 * Returns the resulting note name.
 */
export function applyInterval(root: string, semitones: number, preferFlats = false): string {
    const pc = pitchClass(root);
    const newPc = ((pc + semitones) % 12 + 12) % 12;
    return noteNameFromPitchClass(newPc, preferFlats);
}

/**
 * Apply an interval by its short name to a root note.
 */
export function applyIntervalByName(root: string, shortName: string, preferFlats = false): string {
    const interval = byShortName.get(shortName);
    if (!interval) throw new Error(`Unknown interval: ${shortName}`);
    return applyInterval(root, interval.semitones, preferFlats);
}

/**
 * Get interval by short name (e.g. 'b3', '7', '#11')
 */
export function getIntervalByName(shortName: string): Interval {
    const interval = byShortName.get(shortName);
    if (!interval) throw new Error(`Unknown interval: ${shortName}`);
    return interval;
}

/**
 * Get interval by semitone count (0–11)
 */
export function getIntervalBySemitones(semitones: number): Interval {
    const normalized = ((semitones % 12) + 12) % 12;
    const interval = bySemitone.get(normalized);
    if (!interval) throw new Error(`No interval for ${semitones} semitones`);
    return interval;
}

/**
 * Get the inversion of an interval.
 * e.g. major 3rd (4st) → minor 6th (8st)
 */
export function invertInterval(interval: Interval): Interval {
    if (interval.semitones === 0) return interval;
    const inverted = 12 - interval.semitones;
    return getIntervalBySemitones(inverted);
}

/**
 * Get all interval names between a root and a set of notes.
 * Useful for labeling chord tones on the fretboard.
 */
export function getIntervalLabels(root: string, notes: string[]): { note: string; interval: Interval }[] {
    return notes.map(note => ({
        note,
        interval: getInterval(root, note),
    }));
}
