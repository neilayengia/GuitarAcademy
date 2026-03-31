/**
 * voiceLeading.ts — Voice leading algorithms and guide tone logic
 *
 * The heart of jazz harmony: finding the smoothest path between chords.
 * Minimizes finger movement while preserving common tones and resolving
 * guide tones (3rds and 7ths) properly.
 */

import { pitchClass, semitoneDist, noteNameFromPitchClass } from './notes';
import { getChordType, buildChord } from './chords';
import { getVoicingsForChord, getClosestVoicing, resolveVoicing, type GuitarVoicing } from './voicings';
import type { FretPosition } from './fretboardMapping';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VoiceLeadingStep {
    chord: string;            // e.g. 'Dm7'
    root: string;             // e.g. 'D'
    chordSymbol: string;      // e.g. 'm7'
    voicing: GuitarVoicing;   // The voicing shape used
    positions: FretPosition[]; // Actual positions on the fretboard
}

export interface VoiceLeadingPath {
    steps: VoiceLeadingStep[];
    totalMovement: number;    // Sum of all finger movements
    commonTones: number;      // Total common tones across all transitions
}

export interface VoiceMotion {
    from: FretPosition;
    to: FretPosition;
    type: 'common' | 'step' | 'leap' | 'contrary' | 'new';
    semitones: number;  // How far the voice moved
}

export interface GuideTone {
    note: string;
    intervalLabel: string; // '3' or 'b7' etc.
    position?: FretPosition;
}

export interface GuideToneLine {
    chordName: string;
    third: GuideTone;
    seventh: GuideTone;
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Parse a chord symbol like 'Dm7' into root + type.
 */
export function parseChordSymbol(symbol: string): { root: string; typeSymbol: string } {
    // Match root note (with optional accidental) + chord type
    const match = symbol.match(/^([A-G][#b]?)(.*)/);
    if (!match) throw new Error(`Invalid chord symbol: ${symbol}`);

    const root = match[1];
    let typeSymbol = match[2] || 'maj';

    // Normalize common spellings
    if (typeSymbol === '') typeSymbol = 'maj';
    if (typeSymbol === 'M7') typeSymbol = 'maj7';
    if (typeSymbol === 'Δ7') typeSymbol = 'maj7';
    if (typeSymbol === '-7') typeSymbol = 'm7';
    if (typeSymbol === 'ø' || typeSymbol === 'ø7') typeSymbol = 'm7b5';
    if (typeSymbol === '°' || typeSymbol === '°7') typeSymbol = 'dim7';

    return { root, typeSymbol };
}

/**
 * Find the optimal voice leading path through a chord progression.
 *
 * Given a sequence of chord symbols (e.g. ['Dm7', 'G7', 'Cmaj7']),
 * finds voicings that minimize total finger movement.
 *
 * @param chordSymbols - Array of chord symbols
 * @param options - Configuration options
 * @returns The optimal voice leading path
 */
export function getVoiceLeadingPath(
    chordSymbols: string[],
    options?: {
        startFret?: number;       // Preferred starting position (default: 5)
        voicingType?: string;     // Filter to a specific voicing type
        stringSet?: number[];     // Preferred string set
    }
): VoiceLeadingPath {
    if (chordSymbols.length === 0) return { steps: [], totalMovement: 0, commonTones: 0 };

    const startFret = options?.startFret ?? 5;
    const steps: VoiceLeadingStep[] = [];
    let totalMovement = 0;
    let commonTones = 0;

    // Get a good starting voicing for the first chord
    const first = parseChordSymbol(chordSymbols[0]);
    const firstVoicings = getVoicingsForChord(first.root, first.typeSymbol, {
        nearFret: startFret,
        voicingType: options?.voicingType as any,
        stringSet: options?.stringSet,
    });

    if (firstVoicings.length === 0) {
        // Fallback: return empty path
        return { steps: [], totalMovement: 0, commonTones: 0 };
    }

    steps.push({
        chord: chordSymbols[0],
        root: first.root,
        chordSymbol: first.typeSymbol,
        voicing: firstVoicings[0].voicing,
        positions: firstVoicings[0].positions,
    });

    // For each subsequent chord, find the closest voicing
    for (let i = 1; i < chordSymbols.length; i++) {
        const parsed = parseChordSymbol(chordSymbols[i]);
        const prevPositions = steps[i - 1].positions;

        const closest = getClosestVoicing(prevPositions, parsed.root, parsed.typeSymbol);

        if (closest) {
            // Count common tones
            const prevNotes = new Set(prevPositions.map(p => pitchClass(p.note)));
            const newNotes = closest.positions.map(p => pitchClass(p.note));
            const commons = newNotes.filter(n => prevNotes.has(n)).length;
            commonTones += commons;

            totalMovement += closest.totalMovement;
            steps.push({
                chord: chordSymbols[i],
                root: parsed.root,
                chordSymbol: parsed.typeSymbol,
                voicing: closest.voicing,
                positions: closest.positions,
            });
        } else {
            // Fallback: use any available voicing near current position
            const avgFret = prevPositions.reduce((s, p) => s + p.fret, 0) / prevPositions.length;
            const fallback = getVoicingsForChord(parsed.root, parsed.typeSymbol, { nearFret: avgFret });

            if (fallback.length > 0) {
                steps.push({
                    chord: chordSymbols[i],
                    root: parsed.root,
                    chordSymbol: parsed.typeSymbol,
                    voicing: fallback[0].voicing,
                    positions: fallback[0].positions,
                });
            }
        }
    }

    return { steps, totalMovement, commonTones };
}

/**
 * Analyze the voice motion between two voicings.
 * Shows how each voice moves (common tone, step, leap, etc.)
 */
export function analyzeVoiceMotion(
    fromPositions: FretPosition[],
    toPositions: FretPosition[]
): VoiceMotion[] {
    const motions: VoiceMotion[] = [];

    for (const toPos of toPositions) {
        // Find matching voice on same string from the previous voicing
        const fromPos = fromPositions.find(p => p.string === toPos.string);

        if (!fromPos) {
            motions.push({
                from: toPos,
                to: toPos,
                type: 'new',
                semitones: 0,
            });
            continue;
        }

        const semitones = Math.abs(toPos.midi - fromPos.midi);

        let type: VoiceMotion['type'];
        if (semitones === 0) {
            type = 'common';
        } else if (semitones <= 2) {
            type = 'step';
        } else {
            type = 'leap';
        }

        motions.push({ from: fromPos, to: toPos, type, semitones });
    }

    return motions;
}

/**
 * Get common tones between two chords.
 * These are notes that appear in both chords and should ideally be held.
 */
export function getCommonTones(chord1: string, chord2: string): string[] {
    const c1 = parseChordSymbol(chord1);
    const c2 = parseChordSymbol(chord2);

    const notes1 = buildChord(c1.root, c1.typeSymbol).notes;
    const notes2 = buildChord(c2.root, c2.typeSymbol).notes;

    const pcs1 = new Set(notes1.map(n => pitchClass(n)));

    return notes2.filter(n => pcs1.has(pitchClass(n)));
}

/**
 * Extract the guide tone line (3rds and 7ths) through a progression.
 * Guide tones are the essential chord tones that define harmony and
 * should move by step (half or whole step) between chords.
 */
export function getGuidetoneLine(chordSymbols: string[]): GuideToneLine[] {
    return chordSymbols.map(symbol => {
        const { root, typeSymbol } = parseChordSymbol(symbol);
        const chordType = getChordType(typeSymbol);

        if (!chordType) {
            return {
                chordName: symbol,
                third: { note: '', intervalLabel: '' },
                seventh: { note: '', intervalLabel: '' },
            };
        }

        // Find the 3rd (or b3) — the interval at degree 3
        const thirdInterval = chordType.intervals.find((_, i) =>
            chordType.intervalLabels[i] === '3' ||
            chordType.intervalLabels[i] === 'b3'
        );
        const thirdLabel = chordType.intervalLabels[
            chordType.intervals.indexOf(thirdInterval ?? -1)
        ] || '';

        // Find the 7th (or b7) — the interval at degree 7
        const seventhInterval = chordType.intervals.find((_, i) =>
            chordType.intervalLabels[i] === '7' ||
            chordType.intervalLabels[i] === 'b7' ||
            chordType.intervalLabels[i] === 'bb7'
        );
        const seventhLabel = chordType.intervalLabels[
            chordType.intervals.indexOf(seventhInterval ?? -1)
        ] || '';

        const thirdNote = thirdInterval !== undefined
            ? noteNameFromPitchClass((pitchClass(root) + thirdInterval) % 12)
            : '';

        const seventhNote = seventhInterval !== undefined
            ? noteNameFromPitchClass((pitchClass(root) + seventhInterval) % 12)
            : '';

        return {
            chordName: symbol,
            third: { note: thirdNote, intervalLabel: thirdLabel },
            seventh: { note: seventhNote, intervalLabel: seventhLabel },
        };
    });
}

/**
 * Suggest voice leading targets: for a given current chord,
 * what are the most common next chords and their closest voicings?
 *
 * Implements Beato's functional harmony movement patterns:
 * - Tonic → Pre-Dominant → Dominant → Tonic (strongest cadence)
 * - Tonic chains: I → iii → vi
 * - Pre-dominant: ii → V, IV → V
 * - Tritone substitution: V7 → bII7
 * - Back-cycling (descending 5ths)
 */
export function suggestNextChords(
    currentChord: string,
    currentPositions: FretPosition[],
    key = 'C'
): { chord: string; movement: number; commonTones: string[] }[] {
    const { root, typeSymbol } = parseChordSymbol(currentChord);

    const suggestions: string[] = [];
    const currentPC = pitchClass(root);

    // ── Dominant Resolution (V7 → I) ──
    if (typeSymbol === '7' || typeSymbol === 'dom7' || typeSymbol === '7alt' || typeSymbol === '7b9' || typeSymbol === '7#9') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}maj7`);  // up P4 (strongest)
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}m7`);    // up P4 minor
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}`);       // up P4 triad
    }

    // ── Tritone Sub (Rule V) ──
    if (typeSymbol === '7' || typeSymbol === 'dom7') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 6) % 12)}7`);     // tritone sub
    }

    // ── ii → V (Pre-Dominant to Dominant) ──
    if (typeSymbol === 'm7' || typeSymbol === 'm9' || typeSymbol === 'm11') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}7`);     // up P4 to dom7
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}7alt`);  // altered dominant
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}7b9`);   // dom7b9
    }

    // ── I → vi (Tonic to Submediant) ──
    if (typeSymbol === 'maj7' || typeSymbol === 'maj' || typeSymbol === 'maj9') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 9) % 12)}m7`);    // down m3 → vi
        suggestions.push(`${noteNameFromPitchClass((currentPC + 4) % 12)}m7`);    // up M3 → iii
    }

    // ── vi → ii (Submediant to Supertonic) ──
    if (typeSymbol === 'm7') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}m7`);    // up P4 → ii of relative
    }

    // ── Back-cycling: Descending 5th cycle (Beato pp. 34) ──
    if (typeSymbol === '7') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 7) % 12)}7`);     // V7 of current
    }

    // ── Half-diminished approach (ii7b5 → V7 → i) ──
    if (typeSymbol === 'm7b5') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}7`);     // V7 of minor
        suggestions.push(`${noteNameFromPitchClass((currentPC + 5) % 12)}7b9`);   // V7b9
    }

    // ── IV → V (Pre-Dominant to Dominant) ──
    if (typeSymbol === 'maj7') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 2) % 12)}7`);     // up M2 → V7
    }

    // ── Diminished approach (viio7 → I) ──
    if (typeSymbol === 'dim7') {
        suggestions.push(`${noteNameFromPitchClass((currentPC + 1) % 12)}maj7`);  // up m2
        suggestions.push(`${noteNameFromPitchClass((currentPC + 1) % 12)}m7`);    // up m2 minor
    }

    // Remove duplicates
    const unique = [...new Set(suggestions)];

    // Score each suggestion
    return unique.map(chordSuggestion => {
        const parsed = parseChordSymbol(chordSuggestion);
        const closest = getClosestVoicing(
            currentPositions,
            parsed.root,
            parsed.typeSymbol
        );

        return {
            chord: chordSuggestion,
            movement: closest?.totalMovement ?? 99,
            commonTones: getCommonTones(currentChord, chordSuggestion),
        };
    }).sort((a, b) => a.movement - b.movement);
}

// ── Resolution Tendencies (Beato Ex. 131) ────────────────────────────────────

/**
 * V7 → Imaj7 resolution tendencies from The Beato Book 2.0.
 * Shows which chord tones of V7 resolve to which tones of Imaj7.
 * Half-step resolution should be used whenever possible.
 */
export const V7_RESOLUTION_TENDENCIES: Record<string, string[]> = {
    'R': ['#5', '#4', '6'],     // Root of V7 can go to these Imaj7 tones
    '3': ['R', '6'],            // 3rd resolves to root (strongest) or 6th
    '5': ['R', '3'],            // 5th resolves to root or 3rd
    'b7': ['3', '#4'],           // b7th resolves down to 3rd (strongest)
    '9': ['#5', '7', '5'],      // 9th resolves to several options
    '11': ['9', '7'],            // 11th resolves to 9th or 7th (both weak)
    '13': ['9', '#4'],           // 13th resolves to 9th or #4
    'b9': ['5', '6'],            // b9 resolves down to 5th (strong)
    '#9': ['7', '6'],            // #9 resolves up to 7th
    'b5': ['R', '9'],            // b5 resolves to root or 9th
    '#5': ['9', '3'],            // #5 resolves to 9th or 3rd
};

