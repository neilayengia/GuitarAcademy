/**
 * scales.ts — Scale types, building, and chord-scale relationships
 *
 * All modes, exotic scales, pentatonics, and blues scales.
 * Includes chord-scale theory for jazz improvisation.
 */

import { pitchClass, noteNameFromPitchClass, spellNote, intervalLabelToDegreeOffset } from './notes';
import { applyInterval } from './intervals';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScaleType {
    name: string;           // e.g. 'dorian'
    displayName: string;    // e.g. 'Dorian'
    intervals: number[];    // semitones from root, e.g. [0, 2, 3, 5, 7, 9, 10]
    degrees: string[];      // e.g. ['R', '2', 'b3', '4', '5', '6', 'b7']
    category: ScaleCategory;
    parentScale?: string;   // e.g. 'major' for modes
    modeNumber?: number;    // e.g. 2 for dorian
}

export type ScaleCategory =
    | 'major_modes'
    | 'melodic_minor_modes'
    | 'harmonic_minor_modes'
    | 'harmonic_major_modes'
    | 'pentatonic'
    | 'symmetric'
    | 'blues'
    | 'other';

export interface Scale {
    root: string;
    type: ScaleType;
    notes: string[];
}

// ── Scale Database ───────────────────────────────────────────────────────────

export const SCALE_TYPES: ScaleType[] = [
    // ── Major Modes ──
    {
        name: 'ionian', displayName: 'Ionian (Major)',
        intervals: [0, 2, 4, 5, 7, 9, 11],
        degrees: ['R', '2', '3', '4', '5', '6', '7'],
        category: 'major_modes', parentScale: 'major', modeNumber: 1,
    },
    {
        name: 'dorian', displayName: 'Dorian',
        intervals: [0, 2, 3, 5, 7, 9, 10],
        degrees: ['R', '2', 'b3', '4', '5', '6', 'b7'],
        category: 'major_modes', parentScale: 'major', modeNumber: 2,
    },
    {
        name: 'phrygian', displayName: 'Phrygian',
        intervals: [0, 1, 3, 5, 7, 8, 10],
        degrees: ['R', 'b2', 'b3', '4', '5', 'b6', 'b7'],
        category: 'major_modes', parentScale: 'major', modeNumber: 3,
    },
    {
        name: 'lydian', displayName: 'Lydian',
        intervals: [0, 2, 4, 6, 7, 9, 11],
        degrees: ['R', '2', '3', '#4', '5', '6', '7'],
        category: 'major_modes', parentScale: 'major', modeNumber: 4,
    },
    {
        name: 'mixolydian', displayName: 'Mixolydian',
        intervals: [0, 2, 4, 5, 7, 9, 10],
        degrees: ['R', '2', '3', '4', '5', '6', 'b7'],
        category: 'major_modes', parentScale: 'major', modeNumber: 5,
    },
    {
        name: 'aeolian', displayName: 'Aeolian (Natural Minor)',
        intervals: [0, 2, 3, 5, 7, 8, 10],
        degrees: ['R', '2', 'b3', '4', '5', 'b6', 'b7'],
        category: 'major_modes', parentScale: 'major', modeNumber: 6,
    },
    {
        name: 'locrian', displayName: 'Locrian',
        intervals: [0, 1, 3, 5, 6, 8, 10],
        degrees: ['R', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
        category: 'major_modes', parentScale: 'major', modeNumber: 7,
    },

    // ── Melodic Minor Modes ──
    {
        name: 'melodic_minor', displayName: 'Melodic Minor',
        intervals: [0, 2, 3, 5, 7, 9, 11],
        degrees: ['R', '2', 'b3', '4', '5', '6', '7'],
        category: 'melodic_minor_modes', modeNumber: 1,
    },
    {
        name: 'dorian_b2', displayName: 'Dorian b2',
        intervals: [0, 1, 3, 5, 7, 9, 10],
        degrees: ['R', 'b2', 'b3', '4', '5', '6', 'b7'],
        category: 'melodic_minor_modes', parentScale: 'melodic_minor', modeNumber: 2,
    },
    {
        name: 'lydian_augmented', displayName: 'Lydian Augmented',
        intervals: [0, 2, 4, 6, 8, 9, 11],
        degrees: ['R', '2', '3', '#4', '#5', '6', '7'],
        category: 'melodic_minor_modes', parentScale: 'melodic_minor', modeNumber: 3,
    },
    {
        name: 'lydian_dominant', displayName: 'Lydian Dominant',
        intervals: [0, 2, 4, 6, 7, 9, 10],
        degrees: ['R', '2', '3', '#4', '5', '6', 'b7'],
        category: 'melodic_minor_modes', parentScale: 'melodic_minor', modeNumber: 4,
    },
    {
        name: 'mixolydian_b6', displayName: 'Mixolydian b6',
        intervals: [0, 2, 4, 5, 7, 8, 10],
        degrees: ['R', '2', '3', '4', '5', 'b6', 'b7'],
        category: 'melodic_minor_modes', parentScale: 'melodic_minor', modeNumber: 5,
    },
    {
        name: 'locrian_natural2', displayName: 'Locrian ♮2 (Half-Diminished)',
        intervals: [0, 2, 3, 5, 6, 8, 10],
        degrees: ['R', '2', 'b3', '4', 'b5', 'b6', 'b7'],
        category: 'melodic_minor_modes', parentScale: 'melodic_minor', modeNumber: 6,
    },
    {
        name: 'altered', displayName: 'Altered (Super Locrian)',
        intervals: [0, 1, 3, 4, 6, 8, 10],
        degrees: ['R', 'b2', '#9', '3', 'b5', '#5', 'b7'],
        category: 'melodic_minor_modes', parentScale: 'melodic_minor', modeNumber: 7,
    },

    // ── Harmonic Minor Modes (all 7) ──
    {
        name: 'harmonic_minor', displayName: 'Harmonic Minor',
        intervals: [0, 2, 3, 5, 7, 8, 11],
        degrees: ['R', '2', 'b3', '4', '5', 'b6', '7'],
        category: 'harmonic_minor_modes', modeNumber: 1,
    },
    {
        name: 'locrian_natural6', displayName: 'Locrian ♮6',
        intervals: [0, 1, 3, 5, 6, 9, 10],
        degrees: ['R', 'b2', 'b3', '4', 'b5', '6', 'b7'],
        category: 'harmonic_minor_modes', parentScale: 'harmonic_minor', modeNumber: 2,
    },
    {
        name: 'ionian_augmented', displayName: 'Ionian Augmented',
        intervals: [0, 2, 4, 5, 8, 9, 11],
        degrees: ['R', '2', '3', '4', '#5', '6', '7'],
        category: 'harmonic_minor_modes', parentScale: 'harmonic_minor', modeNumber: 3,
    },
    {
        name: 'dorian_sharp4', displayName: 'Dorian #4',
        intervals: [0, 2, 3, 6, 7, 9, 10],
        degrees: ['R', '2', 'b3', '#4', '5', '6', 'b7'],
        category: 'harmonic_minor_modes', parentScale: 'harmonic_minor', modeNumber: 4,
    },
    {
        name: 'phrygian_dominant', displayName: 'Phrygian Dominant',
        intervals: [0, 1, 4, 5, 7, 8, 10],
        degrees: ['R', 'b2', '3', '4', '5', 'b6', 'b7'],
        category: 'harmonic_minor_modes', parentScale: 'harmonic_minor', modeNumber: 5,
    },
    {
        name: 'lydian_sharp2', displayName: 'Lydian #2',
        intervals: [0, 3, 4, 6, 7, 9, 11],
        degrees: ['R', '#2', '3', '#4', '5', '6', '7'],
        category: 'harmonic_minor_modes', parentScale: 'harmonic_minor', modeNumber: 6,
    },
    {
        name: 'altered_dominant_bb7', displayName: 'Altered Dominant bb7',
        intervals: [0, 1, 3, 4, 6, 8, 9],
        degrees: ['R', 'b2', 'b3', 'b4', 'b5', 'b6', 'bb7'],
        category: 'harmonic_minor_modes', parentScale: 'harmonic_minor', modeNumber: 7,
    },

    // ── Harmonic Major Modes ──
    {
        name: 'harmonic_major', displayName: 'Harmonic Major (Ionian b6)',
        intervals: [0, 2, 4, 5, 7, 8, 11],
        degrees: ['R', '2', '3', '4', '5', 'b6', '7'],
        category: 'harmonic_major_modes', modeNumber: 1,
    },
    {
        name: 'dorian_b5', displayName: 'Dorian b5',
        intervals: [0, 2, 3, 5, 6, 9, 10],
        degrees: ['R', '2', 'b3', '4', 'b5', '6', 'b7'],
        category: 'harmonic_major_modes', parentScale: 'harmonic_major', modeNumber: 2,
    },
    {
        name: 'phrygian_b4', displayName: 'Phrygian b4',
        intervals: [0, 1, 3, 4, 7, 8, 10],
        degrees: ['R', 'b2', 'b3', 'b4', '5', 'b6', 'b7'],
        category: 'harmonic_major_modes', parentScale: 'harmonic_major', modeNumber: 3,
    },
    {
        name: 'lydian_b3', displayName: 'Lydian b3 (Melodic Minor #4)',
        intervals: [0, 2, 3, 6, 7, 9, 11],
        degrees: ['R', '2', 'b3', '#4', '5', '6', '7'],
        category: 'harmonic_major_modes', parentScale: 'harmonic_major', modeNumber: 4,
    },
    {
        name: 'mixolydian_b2', displayName: 'Mixolydian b2',
        intervals: [0, 1, 4, 5, 7, 9, 10],
        degrees: ['R', 'b2', '3', '4', '5', '6', 'b7'],
        category: 'harmonic_major_modes', parentScale: 'harmonic_major', modeNumber: 5,
    },
    {
        name: 'lydian_augmented_sharp2', displayName: 'Lydian Augmented #2',
        intervals: [0, 3, 4, 6, 8, 9, 11],
        degrees: ['R', '#2', '3', '#4', '#5', '6', '7'],
        category: 'harmonic_major_modes', parentScale: 'harmonic_major', modeNumber: 6,
    },
    {
        name: 'locrian_bb7', displayName: 'Locrian bb7',
        intervals: [0, 1, 3, 5, 6, 8, 9],
        degrees: ['R', 'b2', 'b3', '4', 'b5', 'b6', 'bb7'],
        category: 'harmonic_major_modes', parentScale: 'harmonic_major', modeNumber: 7,
    },

    // ── Pentatonic & Blues ──
    {
        name: 'major_pentatonic', displayName: 'Major Pentatonic',
        intervals: [0, 2, 4, 7, 9],
        degrees: ['R', '2', '3', '5', '6'],
        category: 'pentatonic',
    },
    {
        name: 'minor_pentatonic', displayName: 'Minor Pentatonic',
        intervals: [0, 3, 5, 7, 10],
        degrees: ['R', 'b3', '4', '5', 'b7'],
        category: 'pentatonic',
    },
    {
        name: 'blues', displayName: 'Blues Scale',
        intervals: [0, 3, 5, 6, 7, 10],
        degrees: ['R', 'b3', '4', 'b5', '5', 'b7'],
        category: 'blues',
    },
    {
        name: 'major_blues', displayName: 'Major Blues Scale',
        intervals: [0, 2, 3, 4, 7, 9],
        degrees: ['R', '2', 'b3', '3', '5', '6'],
        category: 'blues',
    },

    // ── Symmetric Scales ──
    {
        name: 'whole_tone', displayName: 'Whole Tone',
        intervals: [0, 2, 4, 6, 8, 10],
        degrees: ['R', '2', '3', '#4', '#5', 'b7'],
        category: 'symmetric',
    },
    {
        name: 'diminished_hw', displayName: 'Diminished (Half-Whole)',
        intervals: [0, 1, 3, 4, 6, 7, 9, 10],
        degrees: ['R', 'b2', '#2', '3', 'b5', '5', '6', 'b7'],
        category: 'symmetric',
    },
    {
        name: 'diminished_wh', displayName: 'Diminished (Whole-Half)',
        intervals: [0, 2, 3, 5, 6, 8, 9, 11],
        degrees: ['R', '2', 'b3', '4', 'b5', '#5', '6', '7'],
        category: 'symmetric',
    },
    {
        name: 'chromatic', displayName: 'Chromatic',
        intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        degrees: ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'],
        category: 'symmetric',
    },
    {
        name: 'augmented_scale', displayName: 'Augmented Scale',
        intervals: [0, 3, 4, 7, 8, 11],
        degrees: ['R', '#2', '3', '5', '#5', '7'],
        category: 'symmetric',
    },

    // ── Other / Exotic ──
    {
        name: 'double_harmonic_major', displayName: 'Double Harmonic Major',
        intervals: [0, 1, 4, 5, 7, 8, 11],
        degrees: ['R', 'b2', '3', '4', '5', 'b6', '7'],
        category: 'other',
    },
    {
        name: 'bebop_dominant', displayName: 'Bebop Dominant',
        intervals: [0, 2, 4, 5, 7, 9, 10, 11],
        degrees: ['R', '2', '3', '4', '5', '6', 'b7', '7'],
        category: 'other',
    },
    {
        name: 'bebop_major', displayName: 'Bebop Major',
        intervals: [0, 2, 4, 5, 7, 8, 9, 11],
        degrees: ['R', '2', '3', '4', '5', '#5', '6', '7'],
        category: 'other',
    },
];

// ── Lookup ───────────────────────────────────────────────────────────────────

const scaleByName = new Map<string, ScaleType>();
SCALE_TYPES.forEach(s => scaleByName.set(s.name, s));

// Also register common aliases
scaleByName.set('major', SCALE_TYPES.find(s => s.name === 'ionian')!);
scaleByName.set('minor', SCALE_TYPES.find(s => s.name === 'aeolian')!);
scaleByName.set('natural_minor', SCALE_TYPES.find(s => s.name === 'aeolian')!);

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Look up a scale type by name.
 */
export function getScaleType(name: string): ScaleType | undefined {
    return scaleByName.get(name.toLowerCase().replace(/\s+/g, '_'));
}

/**
 * Build a scale: given root + scale name, return all notes.
 * Uses correct enharmonic spelling — each scale degree gets its own letter name.
 * e.g. buildScale('Db', 'major') → ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']
 */
export function buildScale(root: string, scaleName: string, preferFlats = false): Scale {
    const scaleType = getScaleType(scaleName);
    if (!scaleType) throw new Error(`Unknown scale: ${scaleName}`);

    const rootPC = pitchClass(root);

    const notes = scaleType.intervals.map((semitones, idx) => {
        const targetPC = ((rootPC + semitones) % 12 + 12) % 12;
        const label = scaleType.degrees[idx];
        const degreeOffset = intervalLabelToDegreeOffset(label);
        return spellNote(root, degreeOffset, targetPC);
    });

    return { root, type: scaleType, notes };
}

/**
 * Chord-Scale Theory: which scales work over a given chord type.
 * Returns scale names ordered from most to least common usage.
 */
export function getChordScales(chordSymbol: string): string[] {
    const chordScaleMap: Record<string, string[]> = {
        // ── Major family (Beato: Maj7 Type) ──
        'maj': ['ionian', 'lydian', 'major_pentatonic'],
        'maj7': ['ionian', 'lydian', 'major_pentatonic', 'bebop_major', 'lydian_augmented', 'ionian_augmented', 'augmented_scale', 'major_blues'],
        'maj9': ['ionian', 'lydian'],
        '6': ['ionian', 'lydian', 'major_pentatonic'],
        '6/9': ['ionian', 'lydian', 'major_pentatonic'],

        // ── Minor family (Beato: Min7 Type) ──
        'm': ['dorian', 'aeolian', 'minor_pentatonic', 'phrygian'],
        'm7': ['dorian', 'aeolian', 'minor_pentatonic', 'phrygian', 'melodic_minor', 'dorian_b2', 'harmonic_minor', 'dorian_sharp4'],
        'm9': ['dorian', 'aeolian', 'melodic_minor'],
        'm11': ['dorian', 'aeolian', 'phrygian'],
        'm6': ['dorian', 'melodic_minor'],
        'm13': ['dorian', 'melodic_minor'],
        'mMaj7': ['melodic_minor', 'harmonic_minor'],
        'mMaj9': ['melodic_minor', 'harmonic_minor'],

        // ── Dominant family (Beato: Dom7 Type) ──
        '7': ['mixolydian', 'lydian_dominant', 'blues', 'bebop_dominant', 'diminished_hw', 'mixolydian_b6', 'phrygian_dominant', 'major_pentatonic', 'minor_pentatonic', 'major_blues'],
        '9': ['mixolydian', 'lydian_dominant', 'bebop_dominant'],
        '13': ['mixolydian', 'lydian_dominant', 'diminished_hw'],
        '7sus4': ['mixolydian', 'dorian'],
        '7b9': ['diminished_hw', 'phrygian_dominant', 'altered', 'harmonic_minor'],
        '7#9': ['altered', 'diminished_hw', 'blues'],
        '7#11': ['lydian_dominant'],
        '7b5': ['lydian_dominant', 'whole_tone', 'altered'],
        '7alt': ['altered'],
        '7#5': ['whole_tone', 'altered', 'lydian_augmented'],
        '13b9': ['diminished_hw'],
        '9#11': ['lydian_dominant'],
        '11': ['mixolydian', 'dorian', 'aeolian'],

        // ── Half-diminished family (Beato: Min7b5 Type) ──
        'dim': ['diminished_wh', 'locrian'],
        'dim7': ['diminished_wh', 'altered_dominant_bb7'],
        'm7b5': ['locrian', 'locrian_natural2', 'locrian_natural6'],

        // ── Suspended ──
        'sus2': ['mixolydian', 'dorian', 'ionian', 'lydian'],
        'sus4': ['mixolydian', 'dorian'],

        // ── Augmented (Beato: Aug Type) ──
        'aug': ['whole_tone', 'lydian_augmented'],
        'maj7#5': ['lydian_augmented', 'ionian_augmented'],
    };

    return chordScaleMap[chordSymbol] || ['ionian'];
}

/**
 * Get "avoid notes" for a chord-scale combination.
 * These are notes that clash with chord tones (a half-step above a chord tone).
 */
export function getAvoidNotes(root: string, scaleName: string, chordIntervals: number[]): string[] {
    const scale = buildScale(root, scaleName);
    const avoid: string[] = [];

    // A note is "avoid" if it's a half step above a chord tone (on a strong beat)
    const chordPCs = new Set(chordIntervals.map(i => (pitchClass(root) + i) % 12));

    for (const note of scale.notes) {
        const notePc = pitchClass(note);
        // Check if this note is a half-step above any chord tone
        const belowPC = ((notePc - 1) % 12 + 12) % 12;
        if (chordPCs.has(belowPC) && !chordPCs.has(notePc)) {
            avoid.push(note);
        }
    }

    return avoid;
}

/**
 * Get all scales in a given category.
 */
export function getScalesByCategory(category: ScaleCategory): ScaleType[] {
    return SCALE_TYPES.filter(s => s.category === category);
}

/**
 * Get the relative major/minor of a scale.
 * e.g. A minor → C major, C major → A minor
 */
export function getRelativeScale(root: string, fromScale: 'major' | 'minor'): { root: string; scale: string } {
    if (fromScale === 'major') {
        // Relative minor is 3 semitones below (or 9 above)
        return { root: applyInterval(root, 9), scale: 'minor' };
    } else {
        // Relative major is 3 semitones above
        return { root: applyInterval(root, 3), scale: 'major' };
    }
}
