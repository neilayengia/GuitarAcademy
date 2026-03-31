/**
 * fretboardMapping.ts — Maps notes, scales, and chords onto the guitar fretboard
 *
 * The bridge between music theory and the visual fretboard display.
 * Every position on the neck has a note; this module maps them all.
 */

import {
    pitchClass, noteNameFromPitchClass, noteToMidi, parseNoteString,
    STANDARD_TUNING, TOTAL_FRETS, normalizeNoteName
} from './notes';
import { semitoneDist } from './notes';
import { buildScale, getScaleType } from './scales';
import { buildChord, getChordType } from './chords';
import type { ScaleType } from './scales';
import type { ChordType } from './chords';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FretPosition {
    string: number;     // 1–6 (1 = high E, 6 = low E)
    fret: number;       // 0–22
    note: string;       // Note name, e.g. 'C'
    octave: number;     // e.g. 4
    midi: number;       // MIDI note number
    interval?: string;  // Interval label if relative to a root, e.g. 'R', '3', 'b7'
    isRoot?: boolean;   // True if this is the root note
    color?: string;     // Optional color for rendering
}

// The string MIDIs for standard tuning (E2=40, A2=45, D3=50, G3=55, B3=59, E4=64)
// Index 0 = string 6 (low E), index 5 = string 1 (high E)
const OPEN_STRING_MIDI: number[] = STANDARD_TUNING.map(s => {
    const { name, octave } = parseNoteString(s);
    return noteToMidi(name, octave);
});

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get the note at a specific string and fret.
 * Strings: 1 (high E) to 6 (low E). Frets: 0 (open) to TOTAL_FRETS.
 */
export function getNoteAtPosition(string: number, fret: number): FretPosition {
    if (string < 1 || string > 6) throw new Error(`Invalid string: ${string}`);
    if (fret < 0 || fret > TOTAL_FRETS) throw new Error(`Invalid fret: ${fret}`);

    // Convert string number (1=high, 6=low) to array index (0=low, 5=high)
    const stringIdx = 6 - string;
    const midi = OPEN_STRING_MIDI[stringIdx] + fret;
    const pc = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    const note = noteNameFromPitchClass(pc);

    return { string, fret, note, octave, midi };
}

/**
 * Get all positions on the fretboard for a given note name.
 * Optionally constrain to a fret range.
 */
export function getPositionsForNote(
    noteName: string,
    minFret = 0,
    maxFret = TOTAL_FRETS
): FretPosition[] {
    const targetPC = pitchClass(noteName);
    const positions: FretPosition[] = [];

    for (let str = 1; str <= 6; str++) {
        for (let fret = minFret; fret <= maxFret; fret++) {
            const pos = getNoteAtPosition(str, fret);
            if (pitchClass(pos.note) === targetPC) {
                positions.push(pos);
            }
        }
    }

    return positions;
}

/**
 * Get all fretboard positions for a scale, with interval labels.
 * Optionally constrain to a fret range for position-based practice.
 */
export function getScalePositions(
    root: string,
    scaleName: string,
    minFret = 0,
    maxFret = TOTAL_FRETS,
    preferFlats = false
): FretPosition[] {
    const scaleType = getScaleType(scaleName);
    if (!scaleType) throw new Error(`Unknown scale: ${scaleName}`);

    const rootPC = pitchClass(root);
    const scalePCs = new Set(scaleType.intervals.map(i => (rootPC + i) % 12));

    // Build a map from pitch class to interval label
    const pcToLabel = new Map<number, string>();
    scaleType.intervals.forEach((interval, idx) => {
        pcToLabel.set((rootPC + interval) % 12, scaleType.degrees[idx]);
    });

    const positions: FretPosition[] = [];

    for (let str = 1; str <= 6; str++) {
        for (let fret = minFret; fret <= maxFret; fret++) {
            const pos = getNoteAtPosition(str, fret);
            const notePc = pitchClass(pos.note);
            if (scalePCs.has(notePc)) {
                positions.push({
                    ...pos,
                    interval: pcToLabel.get(notePc),
                    isRoot: notePc === rootPC,
                });
            }
        }
    }

    return positions;
}

/**
 * Get all fretboard positions for a chord, with interval labels.
 */
export function getChordPositions(
    root: string,
    chordSymbol: string,
    minFret = 0,
    maxFret = TOTAL_FRETS,
    preferFlats = false
): FretPosition[] {
    const chordType = getChordType(chordSymbol);
    if (!chordType) throw new Error(`Unknown chord: ${chordSymbol}`);

    const rootPC = pitchClass(root);
    const chordPCs = new Set(chordType.intervals.map(i => (rootPC + i) % 12));

    const pcToLabel = new Map<number, string>();
    chordType.intervals.forEach((interval, idx) => {
        pcToLabel.set((rootPC + interval) % 12, chordType.intervalLabels[idx]);
    });

    const positions: FretPosition[] = [];

    for (let str = 1; str <= 6; str++) {
        for (let fret = minFret; fret <= maxFret; fret++) {
            const pos = getNoteAtPosition(str, fret);
            const notePc = pitchClass(pos.note);
            if (chordPCs.has(notePc)) {
                positions.push({
                    ...pos,
                    interval: pcToLabel.get(notePc),
                    isRoot: notePc === rootPC,
                });
            }
        }
    }

    return positions;
}

/**
 * Get scale positions grouped by CAGED position.
 * Each position covers roughly 4-5 frets.
 */
export function getCAGEDPositions(
    root: string,
    scaleName: string
): { shape: string; startFret: number; endFret: number; positions: FretPosition[] }[] {
    const cagedShapes = ['C', 'A', 'G', 'E', 'D'];
    const rootPC = pitchClass(root);

    // Base fret offsets for each CAGED shape relative to C
    // Each shape covers the fret range where that open chord shape maps to
    const baseOffsets: Record<string, { start: number; span: number }> = {
        'C': { start: 0, span: 4 },
        'A': { start: 3, span: 4 },
        'G': { start: 5, span: 5 },  // G shape is wider
        'E': { start: 7, span: 4 },
        'D': { start: 10, span: 4 },
    };

    return cagedShapes.map(shape => {
        const base = baseOffsets[shape];
        const startFret = (base.start + rootPC) % 12;
        const endFret = startFret + base.span;

        return {
            shape,
            startFret,
            endFret,
            positions: getScalePositions(root, scaleName, startFret, endFret),
        };
    });
}

/**
 * Get the complete fretboard map — every note on every position.
 * Useful for rendering the entire fretboard with optional overlays.
 */
export function getFullFretboard(maxFret = TOTAL_FRETS): FretPosition[][] {
    const board: FretPosition[][] = [];
    for (let str = 1; str <= 6; str++) {
        const stringNotes: FretPosition[] = [];
        for (let fret = 0; fret <= maxFret; fret++) {
            stringNotes.push(getNoteAtPosition(str, fret));
        }
        board.push(stringNotes);
    }
    return board;
}

/**
 * Find the closest fret position for a given note on a given string.
 * Useful for voice leading — finding the nearest voicing of a note.
 */
export function closestPositionOnString(
    string: number,
    targetNote: string,
    nearFret: number
): FretPosition | null {
    const positions = getPositionsForNote(targetNote).filter(p => p.string === string);
    if (positions.length === 0) return null;

    positions.sort((a, b) => Math.abs(a.fret - nearFret) - Math.abs(b.fret - nearFret));
    return positions[0];
}

/**
 * Highlight chord tones vs scale tones.
 * Returns positions colored differently for chord tones, tensions, and avoid notes.
 */
export function getChordScaleOverlay(
    root: string,
    chordSymbol: string,
    scaleName: string,
    minFret = 0,
    maxFret = TOTAL_FRETS
): FretPosition[] {
    const chordType = getChordType(chordSymbol);
    const scaleType = getScaleType(scaleName);
    if (!chordType || !scaleType) return [];

    const rootPC = pitchClass(root);
    const chordPCs = new Set(chordType.intervals.map(i => (rootPC + i) % 12));
    const scalePCs = new Set(scaleType.intervals.map(i => (rootPC + i) % 12));

    const pcToChordLabel = new Map<number, string>();
    chordType.intervals.forEach((interval, idx) => {
        pcToChordLabel.set((rootPC + interval) % 12, chordType.intervalLabels[idx]);
    });

    const pcToScaleLabel = new Map<number, string>();
    scaleType.intervals.forEach((interval, idx) => {
        pcToScaleLabel.set((rootPC + interval) % 12, scaleType.degrees[idx]);
    });

    const positions: FretPosition[] = [];

    for (let str = 1; str <= 6; str++) {
        for (let fret = minFret; fret <= maxFret; fret++) {
            const pos = getNoteAtPosition(str, fret);
            const notePc = pitchClass(pos.note);

            if (chordPCs.has(notePc)) {
                // Chord tone — primary color
                positions.push({
                    ...pos,
                    interval: pcToChordLabel.get(notePc),
                    isRoot: notePc === rootPC,
                    color: notePc === rootPC ? '#d4a44a' : '#e8e8e8', // Gold for root, white for chord tones
                });
            } else if (scalePCs.has(notePc)) {
                // Available tension — secondary color
                positions.push({
                    ...pos,
                    interval: pcToScaleLabel.get(notePc),
                    isRoot: false,
                    color: '#5b9bd5', // Blue for available scale tensions
                });
            }
        }
    }

    return positions;
}
