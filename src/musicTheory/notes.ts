/**
 * notes.ts — Fundamental note representation and chromatic utilities
 *
 * All music theory in Virtuoso is built on this module.
 * Notes are represented both as human-readable names and as MIDI numbers
 * for easy transposition and frequency calculation.
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** The 12 chromatic note names using sharps */
export const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** The 12 chromatic note names using flats */
export const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Map from flat/sharp equivalents to a canonical sharp name */
export const ENHARMONIC_MAP: Record<string, string> = {
  'C': 'C', 'B#': 'C',
  'C#': 'C#', 'Db': 'C#',
  'D': 'D',
  'D#': 'D#', 'Eb': 'D#',
  'E': 'E', 'Fb': 'E',
  'F': 'F', 'E#': 'F',
  'F#': 'F#', 'Gb': 'F#',
  'G': 'G',
  'G#': 'G#', 'Ab': 'G#',
  'A': 'A',
  'A#': 'A#', 'Bb': 'A#',
  'B': 'B', 'Cb': 'B',
};

/** Standard guitar tuning (string 6 to string 1, low to high) */
export const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const;

/** Number of frets on a standard guitar */
export const TOTAL_FRETS = 22;

/** A4 reference frequency in Hz */
const A4_FREQ = 440;

/** MIDI number for A4 */
const A4_MIDI = 69;

// ── Types ────────────────────────────────────────────────────────────────────

export type NoteName = typeof SHARP_NOTES[number] | typeof FLAT_NOTES[number];
export type Accidental = 'sharp' | 'flat' | 'natural';

export interface Note {
  name: string;       // e.g. 'C#'
  octave: number;     // e.g. 4
  midi: number;       // MIDI note number (C4 = 60)
  frequency: number;  // Hz
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Normalize a note name to its canonical sharp representation.
 * e.g. 'Bb' → 'A#', 'Gb' → 'F#', 'C' → 'C'
 */
export function normalizeNoteName(name: string): string {
  const canonical = ENHARMONIC_MAP[name];
  if (!canonical) {
    throw new Error(`Unknown note name: ${name}`);
  }
  return canonical;
}

/**
 * Get the pitch class index (0–11) for a note name.
 * C=0, C#=1, D=2, ... B=11
 */
export function pitchClass(name: string): number {
  const normalized = normalizeNoteName(name);
  const idx = SHARP_NOTES.indexOf(normalized as any);
  if (idx === -1) throw new Error(`Unknown note: ${name}`);
  return idx;
}

/**
 * Get the note name from a pitch class index (0–11).
 * Defaults to sharp names. Set `preferFlats` for flat spelling.
 */
export function noteNameFromPitchClass(pc: number, preferFlats = false): string {
  const idx = ((pc % 12) + 12) % 12;
  return preferFlats ? FLAT_NOTES[idx] : SHARP_NOTES[idx];
}

/**
 * Parse a note string like 'C4', 'F#3', 'Bb5' into name + octave.
 */
export function parseNoteString(noteStr: string): { name: string; octave: number } {
  const match = noteStr.match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!match) throw new Error(`Invalid note string: ${noteStr}`);
  const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const octave = parseInt(match[2], 10);
  return { name, octave };
}

/**
 * Convert a note name + octave to a MIDI note number.
 * C4 = 60, A4 = 69
 */
export function noteToMidi(name: string, octave: number): number {
  return pitchClass(name) + (octave + 1) * 12;
}

/**
 * Convert a MIDI note number to a note name + octave.
 */
export function midiToNote(midi: number, preferFlats = false): { name: string; octave: number } {
  const octave = Math.floor(midi / 12) - 1;
  const pc = midi % 12;
  return { name: noteNameFromPitchClass(pc, preferFlats), octave };
}

/**
 * Convert a MIDI note number to frequency in Hz.
 * Uses equal temperament: f = 440 * 2^((midi - 69) / 12)
 */
export function midiToFrequency(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Convert a frequency in Hz to the nearest MIDI note number.
 */
export function frequencyToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / A4_FREQ) + A4_MIDI);
}

/**
 * Convert a frequency to a note name + octave + cents offset.
 */
export function frequencyToNote(freq: number): { name: string; octave: number; cents: number } {
  const exactMidi = 12 * Math.log2(freq / A4_FREQ) + A4_MIDI;
  const roundedMidi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - roundedMidi) * 100);
  const { name, octave } = midiToNote(roundedMidi);
  return { name, octave, cents };
}

/**
 * Create a full Note object from a note string like 'C4' or 'Bb3'.
 */
export function createNote(noteStr: string): Note {
  const { name, octave } = parseNoteString(noteStr);
  const midi = noteToMidi(name, octave);
  return {
    name: normalizeNoteName(name),
    octave,
    midi,
    frequency: midiToFrequency(midi),
  };
}

/**
 * Create a Note object from a MIDI number.
 */
export function createNoteFromMidi(midi: number, preferFlats = false): Note {
  const { name, octave } = midiToNote(midi, preferFlats);
  return {
    name,
    octave,
    midi,
    frequency: midiToFrequency(midi),
  };
}

/**
 * Calculate the semitone distance between two note names (pitch classes only).
 * Always returns 0–11 (ascending).
 */
export function semitoneDist(from: string, to: string): number {
  const diff = pitchClass(to) - pitchClass(from);
  return ((diff % 12) + 12) % 12;
}

/**
 * Transpose a note name by a number of semitones.
 */
export function transpose(name: string, semitones: number, preferFlats = false): string {
  const pc = pitchClass(name);
  const newPc = ((pc + semitones) % 12 + 12) % 12;
  return noteNameFromPitchClass(newPc, preferFlats);
}

/**
 * Get the MIDI note for each open string in standard tuning.
 */
export function getOpenStringMidi(): number[] {
  return STANDARD_TUNING.map(s => {
    const { name, octave } = parseNoteString(s);
    return noteToMidi(name, octave);
  });
}

/**
 * Determine if a key signature typically uses flats or sharps.
 * Keys like F, Bb, Eb, Ab, Db, Gb prefer flats.
 */
export function prefersFlats(key: string): boolean {
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
                     'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'];
  return flatKeys.includes(key);
}

// ── Enharmonic Spelling Engine ──────────────────────────────────────────────
// Proper music theory: each scale degree gets its own letter name.
// Db major = Db-F-Ab-C, never C#-F-G#-C.

/** Letter names in order */
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

/** Natural pitch class for each letter (C=0, D=2, E=4, F=5, G=7, A=9, B=11) */
const LETTER_PC: Record<string, number> = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
};

/**
 * Get the letter index (0-6) for a note name.
 * C=0, D=1, E=2, F=3, G=4, A=5, B=6
 */
function letterIndex(name: string): number {
  const letter = name.charAt(0).toUpperCase();
  const idx = LETTERS.indexOf(letter as any);
  if (idx === -1) throw new Error(`Invalid note letter: ${letter}`);
  return idx;
}

/**
 * Map an interval label to its scale degree offset (0-indexed).
 * 'R' → 0, '2'/'b2'/'#2' → 1, '3'/'b3' → 2, etc.
 * Compound intervals (9,11,13) map back to their simple degree.
 */
export function intervalLabelToDegreeOffset(label: string): number {
  const cleaned = label.replace(/[#b]+/g, '');
  const map: Record<string, number> = {
    'R': 0, '1': 0,
    '2': 1, '9': 1,
    '3': 2,
    '4': 3, '11': 3,
    '5': 4,
    '6': 5, '13': 5,
    '7': 6,
  };
  return map[cleaned] ?? 0;
}

/**
 * Spell a note correctly given a root and a target degree + pitch class.
 *
 * Uses music theory rules: each degree gets its own letter name.
 * The accidental (sharp/flat/natural/double) is computed to hit the
 * target pitch class on the correct letter.
 *
 * Example: spellNote('Db', 2, 4) → 'F' (major 3rd of Db)
 * Example: spellNote('Db', 4, 8) → 'Ab' (perfect 5th of Db)
 */
export function spellNote(rootName: string, degreeOffset: number, targetPC: number): string {
  const rootLetter = letterIndex(rootName);
  const targetLetterIdx = (rootLetter + degreeOffset) % 7;
  const targetLetter = LETTERS[targetLetterIdx];
  const naturalPC = LETTER_PC[targetLetter];

  // How many semitones do we need to adjust the natural letter?
  let diff = ((targetPC - naturalPC) % 12 + 12) % 12;

  // Choose the simplest accidental (prefer closer to 0)
  // diff: 0=natural, 1=sharp, 2=double-sharp, 10=double-flat, 11=flat
  if (diff === 0) return targetLetter;
  if (diff === 1) return `${targetLetter}#`;
  if (diff === 11) return `${targetLetter}b`;
  if (diff === 2) return `${targetLetter}##`;
  if (diff === 10) return `${targetLetter}bb`;

  // Fallback for unusual intervals — use sharp/flat lookup
  return noteNameFromPitchClass(targetPC, diff > 6);
}
