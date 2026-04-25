/**
 * chords.ts — Chord types, building, and identification
 *
 * Comprehensive chord library covering everything from basic triads
 * to extended altered chords used in jazz harmony.
 */

import { pitchClass, noteNameFromPitchClass, semitoneDist, normalizeNoteName, SHARP_NOTES, spellNote, intervalLabelToDegreeOffset, prefersFlats } from './notes';
import { applyInterval } from './intervals';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChordType {
    name: string;           // e.g. 'major 7th'
    symbol: string;         // e.g. 'maj7'
    aliases: string[];      // e.g. ['Δ7', 'M7']
    intervals: number[];    // semitones from root, e.g. [0, 4, 7, 11]
    intervalLabels: string[]; // e.g. ['R', '3', '5', '7']
    category: ChordCategory;
}

export type ChordCategory =
    | 'triad'
    | 'seventh'
    | 'extended'
    | 'altered'
    | 'suspended'
    | 'added'
    | 'power';

export interface Chord {
    root: string;           // e.g. 'C'
    type: ChordType;        // Full chord type info
    notes: string[];        // e.g. ['C', 'E', 'G', 'B']
    symbol: string;         // e.g. 'Cmaj7'
}

// ── Chord Type Database ──────────────────────────────────────────────────────

export const CHORD_TYPES: ChordType[] = [
    // ── Triads ──
    {
        name: 'major', symbol: 'maj', aliases: ['M', ''],
        intervals: [0, 4, 7], intervalLabels: ['R', '3', '5'],
        category: 'triad',
    },
    {
        name: 'minor', symbol: 'm', aliases: ['min', '-'],
        intervals: [0, 3, 7], intervalLabels: ['R', 'b3', '5'],
        category: 'triad',
    },
    {
        name: 'diminished', symbol: 'dim', aliases: ['°'],
        intervals: [0, 3, 6], intervalLabels: ['R', 'b3', 'b5'],
        category: 'triad',
    },
    {
        name: 'augmented', symbol: 'aug', aliases: ['+'],
        intervals: [0, 4, 8], intervalLabels: ['R', '3', '#5'],
        category: 'triad',
    },

    // ── Seventh Chords ──
    {
        name: 'major 7th', symbol: 'maj7', aliases: ['Δ7', 'M7'],
        intervals: [0, 4, 7, 11], intervalLabels: ['R', '3', '5', '7'],
        category: 'seventh',
    },
    {
        name: 'minor 7th', symbol: 'm7', aliases: ['min7', '-7'],
        intervals: [0, 3, 7, 10], intervalLabels: ['R', 'b3', '5', 'b7'],
        category: 'seventh',
    },
    {
        name: 'dominant 7th', symbol: '7', aliases: ['dom7'],
        intervals: [0, 4, 7, 10], intervalLabels: ['R', '3', '5', 'b7'],
        category: 'seventh',
    },
    {
        name: 'half-diminished 7th', symbol: 'm7b5', aliases: ['ø7', 'ø'],
        intervals: [0, 3, 6, 10], intervalLabels: ['R', 'b3', 'b5', 'b7'],
        category: 'seventh',
    },
    {
        name: 'diminished 7th', symbol: 'dim7', aliases: ['°7'],
        intervals: [0, 3, 6, 9], intervalLabels: ['R', 'b3', 'b5', 'bb7'],
        category: 'seventh',
    },
    {
        name: 'minor-major 7th', symbol: 'mMaj7', aliases: ['m(Δ7)', '-(Δ7)'],
        intervals: [0, 3, 7, 11], intervalLabels: ['R', 'b3', '5', '7'],
        category: 'seventh',
    },
    {
        name: 'augmented major 7th', symbol: 'maj7#5', aliases: ['Δ7+', '+Δ7'],
        intervals: [0, 4, 8, 11], intervalLabels: ['R', '3', '#5', '7'],
        category: 'seventh',
    },

    // ── Extended Chords ──
    {
        name: 'major 9th', symbol: 'maj9', aliases: ['Δ9'],
        intervals: [0, 4, 7, 11, 14], intervalLabels: ['R', '3', '5', '7', '9'],
        category: 'extended',
    },
    {
        name: 'minor 9th', symbol: 'm9', aliases: ['min9', '-9'],
        intervals: [0, 3, 7, 10, 14], intervalLabels: ['R', 'b3', '5', 'b7', '9'],
        category: 'extended',
    },
    {
        name: 'dominant 9th', symbol: '9', aliases: ['dom9'],
        intervals: [0, 4, 7, 10, 14], intervalLabels: ['R', '3', '5', 'b7', '9'],
        category: 'extended',
    },
    {
        name: 'dominant 11th', symbol: '11', aliases: [],
        intervals: [0, 4, 7, 10, 14, 17], intervalLabels: ['R', '3', '5', 'b7', '9', '11'],
        category: 'extended',
    },
    {
        name: 'minor 11th', symbol: 'm11', aliases: ['min11', '-11'],
        intervals: [0, 3, 7, 10, 14, 17], intervalLabels: ['R', 'b3', '5', 'b7', '9', '11'],
        category: 'extended',
    },
    {
        name: 'dominant 13th', symbol: '13', aliases: [],
        intervals: [0, 4, 7, 10, 14, 21], intervalLabels: ['R', '3', '5', 'b7', '9', '13'],
        category: 'extended',
    },
    {
        name: 'minor 13th', symbol: 'm13', aliases: ['min13'],
        intervals: [0, 3, 7, 10, 14, 17, 21], intervalLabels: ['R', 'b3', '5', 'b7', '9', '11', '13'],
        category: 'extended',
    },

    // ── Altered Dominants ──
    {
        name: 'dominant 7 sharp 9', symbol: '7#9', aliases: ['7(#9)', 'hendrix'],
        intervals: [0, 4, 7, 10, 15], intervalLabels: ['R', '3', '5', 'b7', '#9'],
        category: 'altered',
    },
    {
        name: 'dominant 7 flat 9', symbol: '7b9', aliases: ['7(b9)'],
        intervals: [0, 4, 7, 10, 13], intervalLabels: ['R', '3', '5', 'b7', 'b9'],
        category: 'altered',
    },
    {
        name: 'dominant 7 sharp 11', symbol: '7#11', aliases: ['7(#11)'],
        intervals: [0, 4, 7, 10, 18], intervalLabels: ['R', '3', '5', 'b7', '#11'],
        category: 'altered',
    },
    {
        name: 'dominant 7 flat 5', symbol: '7b5', aliases: [],
        intervals: [0, 4, 6, 10], intervalLabels: ['R', '3', 'b5', 'b7'],
        category: 'altered',
    },
    {
        name: 'altered dominant', symbol: '7alt', aliases: ['alt'],
        intervals: [0, 4, 6, 10, 13, 15], intervalLabels: ['R', '3', 'b5', 'b7', 'b9', '#9'],
        category: 'altered',
    },
    {
        name: 'augmented 7th', symbol: '7#5', aliases: ['aug7', '7+'],
        intervals: [0, 4, 8, 10], intervalLabels: ['R', '3', '#5', 'b7'],
        category: 'altered',
    },
    {
        name: 'dominant 13 flat 9', symbol: '13b9', aliases: [],
        intervals: [0, 4, 7, 10, 13, 21], intervalLabels: ['R', '3', '5', 'b7', 'b9', '13'],
        category: 'altered',
    },
    {
        name: 'dominant 9 sharp 11', symbol: '9#11', aliases: [],
        intervals: [0, 4, 7, 10, 14, 18], intervalLabels: ['R', '3', '5', 'b7', '9', '#11'],
        category: 'altered',
    },
    {
        name: 'minor-major 9th', symbol: 'mMaj9', aliases: ['m(Δ9)', '-(Δ9)'],
        intervals: [0, 3, 7, 11, 14], intervalLabels: ['R', 'b3', '5', '7', '9'],
        category: 'extended',
    },

    // ── Suspended ──
    {
        name: 'suspended 2nd', symbol: 'sus2', aliases: [],
        intervals: [0, 2, 7], intervalLabels: ['R', '2', '5'],
        category: 'suspended',
    },
    {
        name: 'suspended 4th', symbol: 'sus4', aliases: ['sus'],
        intervals: [0, 5, 7], intervalLabels: ['R', '4', '5'],
        category: 'suspended',
    },
    {
        name: 'dominant 7 sus4', symbol: '7sus4', aliases: ['7sus'],
        intervals: [0, 5, 7, 10], intervalLabels: ['R', '4', '5', 'b7'],
        category: 'suspended',
    },

    // ── Added Tone ──
    {
        name: 'add 9', symbol: 'add9', aliases: ['add2'],
        intervals: [0, 4, 7, 14], intervalLabels: ['R', '3', '5', '9'],
        category: 'added',
    },
    {
        name: 'minor add 9', symbol: 'madd9', aliases: ['m(add9)'],
        intervals: [0, 3, 7, 14], intervalLabels: ['R', 'b3', '5', '9'],
        category: 'added',
    },
    {
        name: 'major 6th', symbol: '6', aliases: ['maj6'],
        intervals: [0, 4, 7, 9], intervalLabels: ['R', '3', '5', '6'],
        category: 'added',
    },
    {
        name: 'minor 6th', symbol: 'm6', aliases: ['min6'],
        intervals: [0, 3, 7, 9], intervalLabels: ['R', 'b3', '5', '6'],
        category: 'added',
    },
    {
        name: '6/9', symbol: '6/9', aliases: ['69'],
        intervals: [0, 4, 7, 9, 14], intervalLabels: ['R', '3', '5', '6', '9'],
        category: 'added',
    },

    // ── Power ──
    {
        name: 'power chord', symbol: '5', aliases: ['(no3)'],
        intervals: [0, 7], intervalLabels: ['R', '5'],
        category: 'power',
    },
];

// ── Lookup Maps ──────────────────────────────────────────────────────────────

const chordBySymbol = new Map<string, ChordType>();
CHORD_TYPES.forEach(ct => {
    chordBySymbol.set(ct.symbol.toLowerCase(), ct);
    ct.aliases.forEach(alias => chordBySymbol.set(alias.toLowerCase(), ct));
});

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Look up a chord type by its symbol or alias.
 * e.g. 'maj7', 'Δ7', 'm7b5', 'ø7'
 */
export function getChordType(symbol: string): ChordType | undefined {
    return chordBySymbol.get(symbol.toLowerCase());
}

/**
 * Build a chord: given root + type symbol, return all note names.
 * Uses correct enharmonic spelling — each chord tone gets its own letter name.
 * e.g. buildChord('Db', 'maj7') → { root: 'Db', notes: ['Db', 'F', 'Ab', 'C'], ... }
 */
export function buildChord(root: string, typeSymbol: string, preferFlats = false): Chord {
    const chordType = getChordType(typeSymbol);
    if (!chordType) throw new Error(`Unknown chord type: ${typeSymbol}`);

    const rootPC = pitchClass(root);

    const notes = chordType.intervals.map((semitones, idx) => {
        const targetPC = ((rootPC + semitones) % 12 + 12) % 12;
        const label = chordType.intervalLabels[idx];
        const degreeOffset = intervalLabelToDegreeOffset(label);
        return spellNote(root, degreeOffset, targetPC);
    });

    return {
        root,
        type: chordType,
        notes,
        symbol: `${root}${chordType.symbol === 'maj' ? '' : chordType.symbol}`,
    };
}

/**
 * Identify a chord from a set of note names.
 * Tries all possible roots and matches against known chord types.
 * Returns the best match(es).
 */
export function identifyChord(noteNames: string[]): Chord[] {
    if (noteNames.length < 2) return [];

    const normalized = noteNames.map(n => normalizeNoteName(n));
    const uniquePCs = [...new Set(normalized.map(n => pitchClass(n)))];

    if (uniquePCs.length < 2) return [];

    const results: Chord[] = [];

    // Try each note as a potential root
    for (const rootPC of uniquePCs) {
        const rootName = noteNameFromPitchClass(rootPC);

        // Calculate interval set from this root
        const intervalSet = uniquePCs
            .map(pc => ((pc - rootPC) % 12 + 12) % 12)
            .sort((a, b) => a - b);

        // Match against chord types
        for (const chordType of CHORD_TYPES) {
            // Reduce chord intervals to pitch classes (mod 12)
            const chordPCs = chordType.intervals.map(i => i % 12).sort((a, b) => a - b);

            // Check if input intervals match this chord type
            if (arraysEqual(intervalSet, chordPCs)) {
                results.push({
                    root: rootName,
                    type: chordType,
                    notes: chordType.intervals.map(s => applyInterval(rootName, s)),
                    symbol: `${rootName}${chordType.symbol === 'maj' ? '' : chordType.symbol}`,
                });
            }
        }
    }

    // Sort by category priority (triads first, then sevenths, etc.)
    const categoryOrder: ChordCategory[] = ['triad', 'seventh', 'suspended', 'added', 'power', 'extended', 'altered'];
    results.sort((a, b) =>
        categoryOrder.indexOf(a.type.category) - categoryOrder.indexOf(b.type.category)
    );

    return results;
}

/**
 * Get all chord types in a given category.
 */
export function getChordsByCategory(category: ChordCategory): ChordType[] {
    return CHORD_TYPES.filter(ct => ct.category === category);
}

/**
 * Get the interval label for a note within a chord.
 * e.g. for Cmaj7, the note 'E' returns '3'
 */
export function getChordToneLabel(root: string, note: string, chordType: ChordType): string | undefined {
    const semitones = semitoneDist(root, note);
    const idx = chordType.intervals.findIndex(i => i % 12 === semitones);
    return idx !== -1 ? chordType.intervalLabels[idx] : undefined;
}

/**
 * Generate a slash chord representation.
 * e.g. Cmaj7 with bass note E → 'Cmaj7/E'
 */
export function slashChord(chord: Chord, bassNote: string): string {
    return `${chord.symbol}/${normalizeNoteName(bassNote)}`;
}

/**
 * Check if two notes are enharmonically equivalent.
 */
export function enharmonicEqual(note1: string, note2: string): boolean {
    return pitchClass(note1) === pitchClass(note2);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
}
