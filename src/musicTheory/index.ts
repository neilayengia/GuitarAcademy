/**
 * Music Theory Engine — Barrel Export
 *
 * Single entry point for all music theory functionality.
 * Import from '@/src/musicTheory' or './musicTheory'
 */

// ── Notes ──
export {
    SHARP_NOTES, FLAT_NOTES, ENHARMONIC_MAP, STANDARD_TUNING, TOTAL_FRETS,
    normalizeNoteName, pitchClass, noteNameFromPitchClass,
    parseNoteString, noteToMidi, midiToNote, midiToFrequency,
    frequencyToMidi, frequencyToNote, createNote, createNoteFromMidi,
    semitoneDist, transpose, getOpenStringMidi, prefersFlats,
    type NoteName, type Accidental, type Note,
} from './notes';

// ── Intervals ──
export {
    INTERVALS, EXTENDED_INTERVALS, ALL_INTERVALS,
    getInterval, applyInterval, applyIntervalByName,
    getIntervalByName, getIntervalBySemitones, invertInterval,
    getIntervalLabels,
    type Interval,
} from './intervals';

// ── Chords ──
export {
    CHORD_TYPES,
    getChordType, buildChord, identifyChord,
    getChordsByCategory, getChordToneLabel, slashChord, enharmonicEqual,
    type ChordType, type ChordCategory, type Chord,
} from './chords';

// ── Scales ──
export {
    SCALE_TYPES,
    getScaleType, buildScale, getChordScales, getAvoidNotes,
    getScalesByCategory, getRelativeScale,
    type ScaleType, type ScaleCategory, type Scale,
} from './scales';

// ── Fretboard Mapping ──
export {
    getNoteAtPosition, getPositionsForNote,
    getScalePositions, getChordPositions,
    getCAGEDPositions, getFullFretboard,
    closestPositionOnString, getChordScaleOverlay,
    type FretPosition,
} from './fretboardMapping';

// ── Voicings ──
export {
    VOICING_SHAPES,
    getVoicingShapes, getVoicingsByType, getVoicingsOnStrings,
    resolveVoicing, getVoicingsForChord, getClosestVoicing,
    type GuitarVoicing, type VoicingFinger, type VoicingType,
} from './voicings';

// ── Voice Leading ──
export {
    parseChordSymbol, getVoiceLeadingPath, analyzeVoiceMotion,
    getCommonTones, getGuidetoneLine, suggestNextChords,
    V7_RESOLUTION_TENDENCIES,
    type VoiceLeadingStep, type VoiceLeadingPath,
    type VoiceMotion, type GuideTone, type GuideToneLine,
} from './voiceLeading';

// ── Chord Substitutions (Beato Book 2.0) ──
export {
    classifyChordFunction, getDiatonicChords, getSubstitutions,
    getSecondaryDominants, getSecondaryDiminished, getTritoneSubstitute,
    DEGREE_NAMES,
    type HarmonicFunction, type DiatonicChord, type ChordSubstitution,
} from './chordSubstitutions';
