/**
 * progressionGenerator.ts — Musically intelligent chord progression generator
 *
 * Generates 4-chord progressions in a given style by picking a random key,
 * selecting a template, and mapping roman numerals to real chords.
 */

import type { ChordQuality } from '../utils/chordAudioMap';

type ProgressionStyle = 'jazz' | 'blues' | 'pop' | 'modal';

interface ChordSlot {
  root: string;
  quality: ChordQuality;
}

// All 12 roots using flat notation to match audio files
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Semitone offsets for each root
const ROOT_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11,
};

function rootFromSemitone(s: number): string {
  return ROOTS[((s % 12) + 12) % 12];
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// A template chord defined by interval from key root + quality
interface TemplateChord {
  interval: number; // semitones from key root
  quality: ChordQuality;
}

type Template = [TemplateChord, TemplateChord, TemplateChord, TemplateChord];

// ── Jazz Templates ──────────────────────────────────────────────────────────

const JAZZ_TEMPLATES: Template[] = [
  // ii-V-I-vi
  [{ interval: 2, quality: 'min7' }, { interval: 7, quality: '7' }, { interval: 0, quality: 'Maj7' }, { interval: 9, quality: 'min7' }],
  // iii-vi-ii-V
  [{ interval: 4, quality: 'min7' }, { interval: 9, quality: 'min7' }, { interval: 2, quality: 'min7' }, { interval: 7, quality: '7' }],
  // I-vi-ii-V (turnaround)
  [{ interval: 0, quality: 'Maj7' }, { interval: 9, quality: 'min7' }, { interval: 2, quality: 'min7' }, { interval: 7, quality: '7' }],
  // ii-V-I-IV
  [{ interval: 2, quality: 'min7' }, { interval: 7, quality: '7' }, { interval: 0, quality: 'Maj7' }, { interval: 5, quality: 'Maj7' }],
  // minor ii-V-i-iv
  [{ interval: 2, quality: 'min7b5' }, { interval: 7, quality: '7b913' }, { interval: 0, quality: 'min7' }, { interval: 5, quality: 'min7' }],
  // minor ii-V-i-VI
  [{ interval: 2, quality: 'min7b5' }, { interval: 7, quality: '7b9b13' }, { interval: 0, quality: 'min7' }, { interval: 8, quality: 'Maj7' }],
  // tritone sub: ii-bII7-I-vi
  [{ interval: 2, quality: 'min7' }, { interval: 1, quality: '7' }, { interval: 0, quality: 'Maj7' }, { interval: 9, quality: 'min7' }],
  // Rhythm changes bridge: III7-VI7-II7-V7
  [{ interval: 4, quality: '7' }, { interval: 9, quality: '7' }, { interval: 2, quality: '7' }, { interval: 7, quality: '7' }],
  // Coltrane changes: I-bIII7-bVI-VII7
  [{ interval: 0, quality: 'Maj7' }, { interval: 3, quality: '7' }, { interval: 8, quality: 'Maj7' }, { interval: 11, quality: '7' }],
  // backdoor ii-V: iv-bVII7-I-I
  [{ interval: 5, quality: 'min7' }, { interval: 10, quality: '7' }, { interval: 0, quality: 'Maj7' }, { interval: 0, quality: 'Maj7' }],
  // Lady Bird: I-bIII-bVI-bII
  [{ interval: 0, quality: 'Maj7' }, { interval: 3, quality: 'Maj7' }, { interval: 8, quality: 'Maj7' }, { interval: 1, quality: 'Maj7' }],
];

// ── Blues Templates ──────────────────────────────────────────────────────────

const BLUES_TEMPLATES: Template[] = [
  // I7-IV7-I7-V7
  [{ interval: 0, quality: '7' }, { interval: 5, quality: '7' }, { interval: 0, quality: '7' }, { interval: 7, quality: '7' }],
  // I7-IV7-V7-IV7
  [{ interval: 0, quality: '7' }, { interval: 5, quality: '7' }, { interval: 7, quality: '7' }, { interval: 5, quality: '7' }],
  // Minor blues: i7-iv7-V7-i7
  [{ interval: 0, quality: 'min7' }, { interval: 5, quality: 'min7' }, { interval: 7, quality: '7b913' }, { interval: 0, quality: 'min7' }],
  // Jazz blues turnaround: I7-IV7-ii-V
  [{ interval: 0, quality: '7' }, { interval: 5, quality: '7' }, { interval: 2, quality: 'min7' }, { interval: 7, quality: '7' }],
  // Bird blues: I-ii-V-I
  [{ interval: 0, quality: 'Maj7' }, { interval: 2, quality: 'min7' }, { interval: 7, quality: '7b913' }, { interval: 0, quality: 'Maj7' }],
];

// ── Pop Templates ───────────────────────────────────────────────────────────

const POP_TEMPLATES: Template[] = [
  // I-V-vi-IV
  [{ interval: 0, quality: 'Maj7' }, { interval: 7, quality: 'Maj7' }, { interval: 9, quality: 'min7' }, { interval: 5, quality: 'Maj7' }],
  // vi-IV-I-V
  [{ interval: 9, quality: 'min7' }, { interval: 5, quality: 'Maj7' }, { interval: 0, quality: 'Maj7' }, { interval: 7, quality: 'Maj7' }],
  // I-IV-vi-V
  [{ interval: 0, quality: 'Maj7' }, { interval: 5, quality: 'Maj7' }, { interval: 9, quality: 'min7' }, { interval: 7, quality: 'Maj7' }],
  // I-vi-IV-V
  [{ interval: 0, quality: 'Maj7' }, { interval: 9, quality: 'min7' }, { interval: 5, quality: 'Maj7' }, { interval: 7, quality: '7' }],
  // IV-I-V-vi
  [{ interval: 5, quality: 'Maj7' }, { interval: 0, quality: 'Maj7' }, { interval: 7, quality: '7' }, { interval: 9, quality: 'min7' }],
];

// ── Modal Templates ─────────────────────────────────────────────────────────

const MODAL_TEMPLATES: Template[] = [
  // Dorian vamp: i7-IV7-i7-IV7
  [{ interval: 0, quality: 'min7' }, { interval: 5, quality: '7' }, { interval: 0, quality: 'min7' }, { interval: 5, quality: '7' }],
  // Dorian: i7-ii7-bIII-IV7
  [{ interval: 0, quality: 'min7' }, { interval: 2, quality: 'min7' }, { interval: 3, quality: 'Maj7' }, { interval: 5, quality: '7' }],
  // Mixolydian: I7-bVII-IV-I7
  [{ interval: 0, quality: '7' }, { interval: 10, quality: 'Maj7' }, { interval: 5, quality: 'Maj7' }, { interval: 0, quality: '7' }],
  // Lydian: I-II-I-II
  [{ interval: 0, quality: 'Maj7' }, { interval: 2, quality: 'Maj7' }, { interval: 0, quality: 'Maj7' }, { interval: 2, quality: 'Maj7' }],
  // Phrygian: i-bII-i-bII
  [{ interval: 0, quality: 'min7' }, { interval: 1, quality: 'Maj7' }, { interval: 0, quality: 'min7' }, { interval: 1, quality: 'Maj7' }],
  // Aeolian: i-bVI-bIII-bVII
  [{ interval: 0, quality: 'min7' }, { interval: 8, quality: 'Maj7' }, { interval: 3, quality: 'Maj7' }, { interval: 10, quality: '7' }],
];

const TEMPLATES_BY_STYLE: Record<ProgressionStyle, Template[]> = {
  jazz: JAZZ_TEMPLATES,
  blues: BLUES_TEMPLATES,
  pop: POP_TEMPLATES,
  modal: MODAL_TEMPLATES,
};

export const STYLE_OPTIONS: { key: ProgressionStyle; label: string }[] = [
  { key: 'jazz', label: 'Jazz' },
  { key: 'blues', label: 'Blues' },
  { key: 'pop', label: 'Pop' },
  { key: 'modal', label: 'Modal' },
];

export function generateProgression(style: ProgressionStyle = 'jazz'): ChordSlot[] {
  const templates = TEMPLATES_BY_STYLE[style];
  const template = randomPick(templates);
  const keyRoot = randomPick(ROOTS);
  const keySemitone = ROOT_TO_SEMITONE[keyRoot];

  return template.map(chord => ({
    root: rootFromSemitone(keySemitone + chord.interval),
    quality: chord.quality,
  }));
}
