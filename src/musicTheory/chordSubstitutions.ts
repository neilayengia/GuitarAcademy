/**
 * chordSubstitutions.ts — Chord substitution engine
 *
 * Implements Rick Beato's chord substitution rules from The Beato Book 2.0.
 * Covers functional harmony classification, diatonic harmonization,
 * tritone substitution, secondary dominants, and reharmonization.
 */

import { pitchClass, noteNameFromPitchClass, prefersFlats } from './notes';
import { buildChord, getChordType, type Chord, type ChordType } from './chords';
import { applyInterval } from './intervals';

// ── Types ────────────────────────────────────────────────────────────────────

export type HarmonicFunction = 'tonic' | 'pre_dominant' | 'dominant';

export interface DiatonicChord {
    degree: number;          // 1–7
    roman: string;           // e.g. 'ii7', 'V7', 'Imaj7'
    root: string;            // e.g. 'D'
    chordSymbol: string;     // e.g. 'm7'
    fullName: string;        // e.g. 'Dm7'
    harmonicFunction: HarmonicFunction;
    mode: string;            // e.g. 'dorian'
}

export interface ChordSubstitution {
    chord: string;           // e.g. 'Db7'
    rule: string;            // e.g. 'Tritone Substitution (Rule V)'
    description: string;     // Human-readable explanation
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Scale degree names (Beato Ex. 26) */
export const DEGREE_NAMES = [
    '', 'Tonic', 'Supertonic', 'Mediant', 'Subdominant',
    'Dominant', 'Submediant', 'Leading Tone',
];

/** Major scale diatonic seventh chord qualities by degree */
const MAJOR_SEVENTHS: [string, string, string][] = [
    // [chordSymbol, romanPrefix, mode]
    ['maj7', 'I', 'ionian'],
    ['m7', 'ii', 'dorian'],
    ['m7', 'iii', 'phrygian'],
    ['maj7', 'IV', 'lydian'],
    ['7', 'V', 'mixolydian'],
    ['m7', 'vi', 'aeolian'],
    ['m7b5', 'vii', 'locrian'],
];

/** Natural minor scale diatonic seventh chord qualities */
const MINOR_SEVENTHS: [string, string, string][] = [
    ['m7', 'i', 'aeolian'],
    ['m7b5', 'ii', 'locrian'],
    ['maj7', 'III', 'ionian'],
    ['m7', 'iv', 'dorian'],
    ['m7', 'v', 'phrygian'],
    ['maj7', 'VI', 'lydian'],
    ['7', 'VII', 'mixolydian'],
];

/** Melodic minor scale diatonic seventh chord qualities (Beato Ex. 15) */
const MELODIC_MINOR_SEVENTHS: [string, string, string][] = [
    ['mMaj7', 'i', 'melodic_minor'],
    ['m7', 'ii', 'dorian_b2'],
    ['maj7#5', 'III+', 'lydian_augmented'],
    ['7', 'IV', 'lydian_dominant'],
    ['7', 'V', 'mixolydian_b6'],
    ['m7b5', 'vi', 'locrian_natural2'],
    ['m7b5', 'vii', 'altered'],
];

/** Harmonic minor scale diatonic seventh chord qualities (Beato Ex. 16) */
const HARMONIC_MINOR_SEVENTHS: [string, string, string][] = [
    ['mMaj7', 'i', 'harmonic_minor'],
    ['m7b5', 'ii', 'locrian_natural6'],
    ['maj7#5', 'III+', 'ionian_augmented'],
    ['m7', 'iv', 'dorian_sharp4'],
    ['7', 'V', 'phrygian_dominant'],
    ['maj7', 'VI', 'lydian_sharp2'],
    ['dim7', 'vii°', 'altered_dominant_bb7'],
];

/** Major scale intervals in semitones */
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/** Natural minor scale intervals */
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

/** Melodic minor scale intervals */
const MELODIC_MINOR_INTERVALS = [0, 2, 3, 5, 7, 9, 11];

/** Harmonic minor scale intervals */
const HARMONIC_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 11];

// ── Functional Harmony ───────────────────────────────────────────────────────

/**
 * Classify a chord's harmonic function within a key (Beato Ex. 35).
 *
 * Tonic: I, iii, vi  — chords that do NOT contain the 4th degree
 * Pre-Dominant: IV, ii  — chords that contain the 4th but NOT 7th degree
 * Dominant: V, vii°  — chords that contain BOTH the 4th AND 7th degree
 */
export function classifyChordFunction(
    chordSymbol: string,
    key: string
): HarmonicFunction {
    const diatonics = getDiatonicChords(key, 'major');
    const rootPC = pitchClass(parseRoot(chordSymbol));

    for (const dc of diatonics) {
        if (pitchClass(dc.root) === rootPC) {
            return dc.harmonicFunction;
        }
    }

    // If not diatonic, classify by common usage
    const chord = buildChord(parseRoot(chordSymbol), parseType(chordSymbol));
    const keyPC = pitchClass(key);
    const fourthPC = (keyPC + 5) % 12;
    const seventhPC = (keyPC + 11) % 12;

    const chordPCs = new Set(chord.notes.map(n => pitchClass(n)));
    const hasFourth = chordPCs.has(fourthPC);
    const hasSeventh = chordPCs.has(seventhPC);

    if (hasFourth && hasSeventh) return 'dominant';
    if (hasFourth) return 'pre_dominant';
    return 'tonic';
}

// ── Diatonic Harmonization ───────────────────────────────────────────────────

/**
 * Build diatonic seventh chords for any key from a parent scale.
 * Implements Beato's Ex. 14-17.
 */
export function getDiatonicChords(
    key: string,
    scaleType: 'major' | 'minor' | 'melodic_minor' | 'harmonic_minor' = 'major'
): DiatonicChord[] {
    const useFlats = prefersFlats(key);

    let intervals: number[];
    let chordQualities: [string, string, string][];

    switch (scaleType) {
        case 'major':
            intervals = MAJOR_INTERVALS;
            chordQualities = MAJOR_SEVENTHS;
            break;
        case 'minor':
            intervals = MINOR_INTERVALS;
            chordQualities = MINOR_SEVENTHS;
            break;
        case 'melodic_minor':
            intervals = MELODIC_MINOR_INTERVALS;
            chordQualities = MELODIC_MINOR_SEVENTHS;
            break;
        case 'harmonic_minor':
            intervals = HARMONIC_MINOR_INTERVALS;
            chordQualities = HARMONIC_MINOR_SEVENTHS;
            break;
    }

    // Functional harmony classification
    const functionMap: Record<string, HarmonicFunction> = {
        'major': {
            1: 'tonic', 2: 'pre_dominant', 3: 'tonic', 4: 'pre_dominant',
            5: 'dominant', 6: 'tonic', 7: 'dominant',
        } as any,
        'minor': {
            1: 'tonic', 2: 'pre_dominant', 3: 'tonic', 4: 'pre_dominant',
            5: 'dominant', 6: 'tonic', 7: 'dominant',
        } as any,
    };

    return intervals.map((semitones, i) => {
        const root = applyInterval(key, semitones, useFlats);
        const [chordSymbol, roman, mode] = chordQualities[i];
        const degree = i + 1;
        const romanWithQuality = `${roman}${chordSymbol === 'maj7' ? 'maj7' : chordSymbol === '7' ? '7' : chordSymbol === 'm7' ? '7' : chordSymbol === 'm7b5' ? '7b5' : chordSymbol === 'dim7' ? 'o7' : chordSymbol === 'mMaj7' ? 'maj7' : chordSymbol === 'maj7#5' ? '+maj7' : ''}`;

        // Determine harmonic function
        let harmonicFunction: HarmonicFunction;
        if (scaleType === 'major' || scaleType === 'minor') {
            const funcs = scaleType === 'major'
                ? ['tonic', 'pre_dominant', 'tonic', 'pre_dominant', 'dominant', 'tonic', 'dominant'] as HarmonicFunction[]
                : ['tonic', 'pre_dominant', 'tonic', 'pre_dominant', 'dominant', 'tonic', 'dominant'] as HarmonicFunction[];
            harmonicFunction = funcs[i];
        } else {
            // For melodic/harmonic minor, V is dominant, iv is pre-dominant, i is tonic
            harmonicFunction = degree === 5 ? 'dominant' : degree === 1 || degree === 3 || degree === 6 ? 'tonic' : 'pre_dominant';
        }

        return {
            degree,
            roman: romanWithQuality,
            root,
            chordSymbol,
            fullName: `${root}${chordSymbol === 'maj' ? '' : chordSymbol}`,
            harmonicFunction,
            mode,
        };
    });
}

// ── Substitution Rules ───────────────────────────────────────────────────────

/**
 * Get chord substitutions based on Beato's rules.
 * Returns an array of possible substitutions with rule explanations.
 */
export function getSubstitutions(
    chordSymbol: string,
    key = 'C',
    options?: { includeAdvanced?: boolean }
): ChordSubstitution[] {
    const root = parseRoot(chordSymbol);
    const type = parseType(chordSymbol);
    const rootPC = pitchClass(root);
    const useFlats = prefersFlats(key);
    const subs: ChordSubstitution[] = [];

    // ── Rule V: Tritone Substitution ──
    const tritoneRoot = noteNameFromPitchClass((rootPC + 6) % 12, useFlats);
    if (type === '7' || type === 'dom7' || type === '7alt' || type === '7b9' || type === '7#9') {
        subs.push({
            chord: `${tritoneRoot}7`,
            rule: 'Tritone Substitution (Rule V)',
            description: `Replace ${chordSymbol} with ${tritoneRoot}7 — shares the same tritone (3rd/7th)`,
        });
    }

    // ── Rule II: Major → Mediant/Submediant ──
    if (type === 'maj7' || type === 'maj' || type === 'maj9') {
        const mediant = noteNameFromPitchClass((rootPC + 4) % 12, useFlats);
        const submediant = noteNameFromPitchClass((rootPC + 9) % 12, useFlats);
        subs.push({
            chord: `${mediant}m7`,
            rule: 'Mediant Substitution (Rule II)',
            description: `${mediant}m7 = ${root}maj9 without root`,
        });
        subs.push({
            chord: `${submediant}m7`,
            rule: 'Submediant Substitution (Rule II)',
            description: `${submediant}m7 = ${root}6 (relative minor)`,
        });
    }

    // ── Rule III: Minor → Relative Major / Dominant Minor ──
    if (type === 'm7' || type === 'm' || type === 'm9') {
        const relMajor = noteNameFromPitchClass((rootPC + 3) % 12, useFlats);
        const domMinor = noteNameFromPitchClass((rootPC + 7) % 12, useFlats);
        subs.push({
            chord: `${relMajor}maj7`,
            rule: 'Relative Major (Rule III)',
            description: `${relMajor}maj7 — relative major of ${root}m`,
        });
        subs.push({
            chord: `${domMinor}m7`,
            rule: 'Dominant Minor (Rule III)',
            description: `${domMinor}m7 = ${root}m9/11 sound`,
        });
    }

    // ── Rule IV: "Two the Five" — insert ii before V ──
    if (type === '7' || type === 'dom7') {
        const ii = noteNameFromPitchClass((rootPC + 5) % 12, useFlats);
        subs.push({
            chord: `${ii}m7 → ${chordSymbol}`,
            rule: '"Two the Five" (Rule IV)',
            description: `Insert ${ii}m7 before ${chordSymbol} for ii-V motion`,
        });
    }

    // ── Rule VIII: Substitute Dim7 for Dom7 ──
    if (type === '7' || type === '7b9') {
        // Build dim7 on bII of the dom7 chord
        const bII = noteNameFromPitchClass((rootPC + 1) % 12, useFlats);
        subs.push({
            chord: `${bII}dim7`,
            rule: 'Diminished Substitution (Rule VIII)',
            description: `${bII}dim7 contains the same b9 tension as ${chordSymbol}`,
        });
        // Symmetric dim7s (Rule XX)
        const dim1 = noteNameFromPitchClass((rootPC + 4) % 12, useFlats);
        const dim2 = noteNameFromPitchClass((rootPC + 7) % 12, useFlats);
        const dim3 = noteNameFromPitchClass((rootPC + 10) % 12, useFlats);
        subs.push({
            chord: `${dim1}dim7, ${dim2}dim7, ${dim3}dim7`,
            rule: 'Symmetric Diminished (Rule XX)',
            description: 'Any dim7 a minor 3rd apart is enharmonically equivalent',
        });
    }

    // ── Rule VI: Sub Maj7b5 for V7 ──
    if ((type === '7' || type === 'dom7') && options?.includeAdvanced) {
        const bVII = noteNameFromPitchClass((rootPC + 10) % 12, useFlats);
        subs.push({
            chord: `${bVII}maj7#5`,
            rule: 'Subtonic Maj7#5 (Rule VI)',
            description: `Voice in upper register as color sub for ${chordSymbol}`,
        });
    }

    // ── Rule VII: Sub m7b5 for V7 ──
    if ((type === '7' || type === 'dom7') && options?.includeAdvanced) {
        const mediant = noteNameFromPitchClass((rootPC + 4) % 12, useFlats);
        subs.push({
            chord: `${mediant}m7b5`,
            rule: 'Mediant m7b5 (Rule VII)',
            description: `${mediant}m7b5 contains the guide tones of ${chordSymbol}`,
        });
    }

    // ── Rule XIV: Insert m7b5 before V7 ──
    if (type === '7' || type === 'dom7') {
        const target = noteNameFromPitchClass((rootPC + 5) % 12, useFlats);
        const ii = noteNameFromPitchClass((rootPC + 5) % 12, useFlats);
        subs.push({
            chord: `${ii}m7b5 → ${chordSymbol}`,
            rule: 'Insert m7b5 (Rule XIV)',
            description: `Half-diminished approach from the minor key`,
        });
    }

    return subs;
}

// ── Secondary Dominants ──────────────────────────────────────────────────────

/**
 * Generate secondary dominant chords for a key (Beato Ex. 38).
 * V7/ii, V7/iii, V7/IV, V7/V, V7/vi
 */
export function getSecondaryDominants(key: string): { target: string; chord: string; roman: string }[] {
    const useFlats = prefersFlats(key);
    const diatonics = getDiatonicChords(key, 'major');
    const results: { target: string; chord: string; roman: string }[] = [];

    // Can build secondary dominants for ii, iii, IV, V, vi (not viio — too unstable)
    const targets = [1, 2, 3, 4, 5]; // degrees 2-6 (0-indexed: 1-5)

    for (const idx of targets) {
        const targetChord = diatonics[idx];
        // V7 of this chord = dom7 built a P5 above (or P4 below) the target root
        const v7Root = noteNameFromPitchClass((pitchClass(targetChord.root) + 7) % 12, useFlats);
        results.push({
            target: targetChord.fullName,
            chord: `${v7Root}7`,
            roman: `V7/${targetChord.roman.replace(/maj7|7b5|7|o7|\+maj7/g, '')}`,
        });
    }

    return results;
}

/**
 * Generate secondary diminished seventh chords for a key (Beato Ex. 41).
 * vii°7/ii, vii°7/iii, vii°7/IV, vii°7/V, vii°7/vi
 */
export function getSecondaryDiminished(key: string): { target: string; chord: string; roman: string }[] {
    const useFlats = prefersFlats(key);
    const diatonics = getDiatonicChords(key, 'major');
    const results: { target: string; chord: string; roman: string }[] = [];

    const targets = [1, 2, 3, 4, 5]; // degrees 2-6

    for (const idx of targets) {
        const targetChord = diatonics[idx];
        // vii°7 = dim7 built a half-step below the target root
        const dim7Root = noteNameFromPitchClass((pitchClass(targetChord.root) + 11) % 12, useFlats);
        results.push({
            target: targetChord.fullName,
            chord: `${dim7Root}dim7`,
            roman: `vii°7/${targetChord.roman.replace(/maj7|7b5|7|o7|\+maj7/g, '')}`,
        });
    }

    return results;
}

// ── Tritone Substitution ─────────────────────────────────────────────────────

/**
 * Get the tritone substitute for a dominant chord (Beato Rule V).
 * Works because both chords share the same tritone (3rd ↔ 7th).
 */
export function getTritoneSubstitute(chordSymbol: string): string {
    const root = parseRoot(chordSymbol);
    const type = parseType(chordSymbol);
    const useFlats = prefersFlats(root);
    const tritoneRoot = noteNameFromPitchClass((pitchClass(root) + 6) % 12, useFlats);
    return `${tritoneRoot}${type}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseRoot(symbol: string): string {
    const match = symbol.match(/^([A-G][#b]?)/);
    return match ? match[1] : symbol;
}

function parseType(symbol: string): string {
    const match = symbol.match(/^[A-G][#b]?(.*)/);
    return match && match[1] ? match[1] : 'maj';
}
