/**
 * Music Theory Engine — Unit Tests
 *
 * Tests for all core modules: notes, intervals, chords, scales,
 * fretboard mapping, voicings, and voice leading.
 */
import { describe, it, expect } from 'vitest';
import {
    // Notes
    normalizeNoteName, pitchClass, noteNameFromPitchClass,
    parseNoteString, noteToMidi, midiToNote, midiToFrequency,
    frequencyToMidi, frequencyToNote, createNote, semitoneDist, transpose,
    getOpenStringMidi, prefersFlats,

    // Intervals
    getInterval, applyInterval, applyIntervalByName,
    getIntervalByName, getIntervalBySemitones, invertInterval,
    INTERVALS,

    // Chords
    buildChord, identifyChord, getChordType,
    getChordToneLabel, enharmonicEqual,

    // Scales
    buildScale, getChordScales, getAvoidNotes,
    getScaleType,

    // Fretboard
    getNoteAtPosition, getPositionsForNote,
    getScalePositions, getChordPositions,
    getChordScaleOverlay, getFullFretboard,

    // Voicings
    getVoicingShapes, resolveVoicing, getVoicingsForChord,
    getClosestVoicing,

    // Voice Leading
    parseChordSymbol, getVoiceLeadingPath, getCommonTones,
    getGuidetoneLine, analyzeVoiceMotion,
} from '../index';

// ═══════════════════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════════════════

describe('Notes', () => {
    describe('normalizeNoteName', () => {
        it('should pass through sharp names', () => {
            expect(normalizeNoteName('C')).toBe('C');
            expect(normalizeNoteName('C#')).toBe('C#');
            expect(normalizeNoteName('F#')).toBe('F#');
        });

        it('should convert flats to sharps', () => {
            expect(normalizeNoteName('Db')).toBe('C#');
            expect(normalizeNoteName('Eb')).toBe('D#');
            expect(normalizeNoteName('Bb')).toBe('A#');
            expect(normalizeNoteName('Gb')).toBe('F#');
            expect(normalizeNoteName('Ab')).toBe('G#');
        });

        it('should handle enharmonic edge cases', () => {
            expect(normalizeNoteName('B#')).toBe('C');
            expect(normalizeNoteName('E#')).toBe('F');
            expect(normalizeNoteName('Cb')).toBe('B');
            expect(normalizeNoteName('Fb')).toBe('E');
        });

        it('should throw on unknown notes', () => {
            expect(() => normalizeNoteName('X')).toThrow();
        });
    });

    describe('pitchClass', () => {
        it('should return correct pitch classes', () => {
            expect(pitchClass('C')).toBe(0);
            expect(pitchClass('D')).toBe(2);
            expect(pitchClass('E')).toBe(4);
            expect(pitchClass('F')).toBe(5);
            expect(pitchClass('G')).toBe(7);
            expect(pitchClass('A')).toBe(9);
            expect(pitchClass('B')).toBe(11);
        });

        it('should handle sharps and flats', () => {
            expect(pitchClass('C#')).toBe(1);
            expect(pitchClass('Db')).toBe(1);
            expect(pitchClass('Bb')).toBe(10);
            expect(pitchClass('A#')).toBe(10);
        });
    });

    describe('noteNameFromPitchClass', () => {
        it('should return sharp names by default', () => {
            expect(noteNameFromPitchClass(0)).toBe('C');
            expect(noteNameFromPitchClass(1)).toBe('C#');
            expect(noteNameFromPitchClass(6)).toBe('F#');
        });

        it('should return flat names when requested', () => {
            expect(noteNameFromPitchClass(1, true)).toBe('Db');
            expect(noteNameFromPitchClass(3, true)).toBe('Eb');
            expect(noteNameFromPitchClass(10, true)).toBe('Bb');
        });
    });

    describe('MIDI conversion', () => {
        it('should convert C4 to MIDI 60', () => {
            expect(noteToMidi('C', 4)).toBe(60);
        });

        it('should convert A4 to MIDI 69', () => {
            expect(noteToMidi('A', 4)).toBe(69);
        });

        it('should convert MIDI 60 back to C4', () => {
            const result = midiToNote(60);
            expect(result.name).toBe('C');
            expect(result.octave).toBe(4);
        });

        it('should convert A4 (MIDI 69) to 440 Hz', () => {
            expect(midiToFrequency(69)).toBeCloseTo(440, 1);
        });

        it('should convert 440 Hz to MIDI 69', () => {
            expect(frequencyToMidi(440)).toBe(69);
        });

        it('should round trip note string → Note → back', () => {
            const note = createNote('F#3');
            expect(note.name).toBe('F#');
            expect(note.octave).toBe(3);
            expect(note.midi).toBe(noteToMidi('F#', 3));
        });
    });

    describe('semitoneDist', () => {
        it('should get correct distance between notes', () => {
            expect(semitoneDist('C', 'E')).toBe(4);    // major 3rd
            expect(semitoneDist('C', 'G')).toBe(7);    // perfect 5th
            expect(semitoneDist('C', 'B')).toBe(11);   // major 7th
            expect(semitoneDist('C', 'C')).toBe(0);    // unison
            expect(semitoneDist('E', 'C')).toBe(8);    // minor 6th (ascending)
        });
    });

    describe('transpose', () => {
        it('should transpose up correctly', () => {
            expect(transpose('C', 4)).toBe('E');     // up major 3rd
            expect(transpose('G', 7)).toBe('D');     // up perfect 5th
        });

        it('should transpose down correctly', () => {
            expect(transpose('C', -1)).toBe('B');
            expect(transpose('D', -2)).toBe('C');
        });
    });

    describe('getOpenStringMidi', () => {
        it('should return 6 values for standard tuning', () => {
            const midiNotes = getOpenStringMidi();
            expect(midiNotes).toHaveLength(6);
            expect(midiNotes[0]).toBe(40);  // E2
            expect(midiNotes[5]).toBe(64);  // E4
        });
    });

    describe('prefersFlats', () => {
        it('should identify flat keys', () => {
            expect(prefersFlats('F')).toBe(true);
            expect(prefersFlats('Bb')).toBe(true);
            expect(prefersFlats('Eb')).toBe(true);
        });

        it('should identify sharp keys', () => {
            expect(prefersFlats('C')).toBe(false);
            expect(prefersFlats('G')).toBe(false);
            expect(prefersFlats('D')).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERVALS
// ═══════════════════════════════════════════════════════════════════════════

describe('Intervals', () => {
    describe('getInterval', () => {
        it('should identify basic intervals', () => {
            expect(getInterval('C', 'E').shortName).toBe('3');      // major 3rd
            expect(getInterval('C', 'G').shortName).toBe('5');      // perfect 5th
            expect(getInterval('C', 'Bb').shortName).toBe('b7');    // minor 7th
            expect(getInterval('C', 'B').shortName).toBe('7');      // major 7th
            expect(getInterval('C', 'Eb').shortName).toBe('b3');    // minor 3rd
        });

        it('should handle tritone', () => {
            expect(getInterval('C', 'F#').shortName).toBe('b5');
            expect(getInterval('C', 'Gb').shortName).toBe('b5');
        });
    });

    describe('applyInterval', () => {
        it('should apply intervals correctly', () => {
            expect(applyInterval('C', 4)).toBe('E');     // major 3rd
            expect(applyInterval('C', 7)).toBe('G');     // perfect 5th
            expect(applyInterval('A', 3)).toBe('C');     // minor 3rd
        });
    });

    describe('applyIntervalByName', () => {
        it('should work with short names', () => {
            expect(applyIntervalByName('C', '3')).toBe('E');
            expect(applyIntervalByName('C', 'b7')).toBe('A#');
            expect(applyIntervalByName('C', 'b7', true)).toBe('Bb');
        });
    });

    describe('invertInterval', () => {
        it('should invert intervals correctly', () => {
            const maj3 = getIntervalBySemitones(4);     // major 3rd
            const inverted = invertInterval(maj3);
            expect(inverted.semitones).toBe(8);          // minor 6th
            expect(inverted.shortName).toBe('b6');
        });

        it('should invert perfect 5th to perfect 4th', () => {
            const p5 = getIntervalBySemitones(7);
            expect(invertInterval(p5).semitones).toBe(5); // perfect 4th
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHORDS
// ═══════════════════════════════════════════════════════════════════════════

describe('Chords', () => {
    describe('buildChord', () => {
        it('should build a C major triad', () => {
            const chord = buildChord('C', 'maj');
            expect(chord.notes).toEqual(['C', 'E', 'G']);
            expect(chord.root).toBe('C');
        });

        it('should build a Cmaj7 chord', () => {
            const chord = buildChord('C', 'maj7');
            expect(chord.notes).toEqual(['C', 'E', 'G', 'B']);
        });

        it('should build a Dm7 chord', () => {
            const chord = buildChord('D', 'm7');
            expect(chord.notes).toEqual(['D', 'F', 'A', 'C']);
        });

        it('should build a G7 chord', () => {
            const chord = buildChord('G', '7');
            expect(chord.notes).toEqual(['G', 'B', 'D', 'F']);
        });

        it('should build a Bm7b5 (half-diminished)', () => {
            const chord = buildChord('B', 'm7b5');
            expect(chord.notes).toEqual(['B', 'D', 'F', 'A']);
        });

        it('should build extended chords', () => {
            const chord = buildChord('C', '9');
            expect(chord.notes).toEqual(['C', 'E', 'G', 'A#', 'D']);
        });

        it('should handle flat root notes', () => {
            const chord = buildChord('Bb', '7');
            expect(chord.root).toBe('A#'); // normalized
            expect(chord.notes).toContain('D');
        });
    });

    describe('identifyChord', () => {
        it('should identify C major triad', () => {
            const results = identifyChord(['C', 'E', 'G']);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].root).toBe('C');
            expect(results[0].type.name).toBe('major');
        });

        it('should identify Am7 chord', () => {
            const results = identifyChord(['A', 'C', 'E', 'G']);
            const am7 = results.find(r => r.root === 'A' && r.type.symbol === 'm7');
            expect(am7).toBeDefined();
        });

        it('should identify G7 chord', () => {
            const results = identifyChord(['G', 'B', 'D', 'F']);
            const g7 = results.find(r => r.root === 'G' && r.type.symbol === '7');
            expect(g7).toBeDefined();
        });

        it('should handle inversions (notes in different order)', () => {
            const results = identifyChord(['E', 'G', 'C']);
            const cmaj = results.find(r => r.root === 'C' && r.type.name === 'major');
            expect(cmaj).toBeDefined();
        });

        it('should return empty for single note', () => {
            expect(identifyChord(['C'])).toEqual([]);
        });
    });

    describe('getChordType', () => {
        it('should find common chord types', () => {
            expect(getChordType('maj7')).toBeDefined();
            expect(getChordType('m7')).toBeDefined();
            expect(getChordType('7')).toBeDefined();
            expect(getChordType('dim7')).toBeDefined();
        });

        it('should find by alias', () => {
            expect(getChordType('Δ7')?.symbol).toBe('maj7');
            expect(getChordType('-7')?.symbol).toBe('m7');
            expect(getChordType('ø7')?.symbol).toBe('m7b5');
        });
    });

    describe('enharmonicEqual', () => {
        it('should detect enharmonic equivalents', () => {
            expect(enharmonicEqual('C#', 'Db')).toBe(true);
            expect(enharmonicEqual('F#', 'Gb')).toBe(true);
            expect(enharmonicEqual('C', 'C')).toBe(true);
        });

        it('should reject non-equivalents', () => {
            expect(enharmonicEqual('C', 'D')).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCALES
// ═══════════════════════════════════════════════════════════════════════════

describe('Scales', () => {
    describe('buildScale', () => {
        it('should build C major (ionian)', () => {
            const scale = buildScale('C', 'ionian');
            expect(scale.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
        });

        it('should build C major using "major" alias', () => {
            const scale = buildScale('C', 'major');
            expect(scale.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
        });

        it('should build D dorian', () => {
            const scale = buildScale('D', 'dorian');
            expect(scale.notes).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C']);
        });

        it('should build A minor pentatonic', () => {
            const scale = buildScale('A', 'minor_pentatonic');
            expect(scale.notes).toEqual(['A', 'C', 'D', 'E', 'G']);
        });

        it('should build blues scale', () => {
            const scale = buildScale('A', 'blues');
            expect(scale.notes).toHaveLength(6);
            expect(scale.notes).toContain('A');
            expect(scale.notes).toContain('D#'); // b5 (Eb normalized to D#)
        });

        it('should build altered scale', () => {
            const scale = buildScale('G', 'altered');
            expect(scale.notes).toHaveLength(7);
        });
    });

    describe('getChordScales', () => {
        it('should recommend dorian for m7', () => {
            const scales = getChordScales('m7');
            expect(scales).toContain('dorian');
        });

        it('should recommend mixolydian for 7', () => {
            const scales = getChordScales('7');
            expect(scales).toContain('mixolydian');
        });

        it('should recommend altered for 7alt', () => {
            const scales = getChordScales('7alt');
            expect(scales).toContain('altered');
        });

        it('should recommend locrian for m7b5', () => {
            const scales = getChordScales('m7b5');
            expect(scales).toContain('locrian');
        });
    });

    describe('getAvoidNotes', () => {
        it('should find avoid notes for C major scale over Cmaj7', () => {
            const avoidNotes = getAvoidNotes('C', 'ionian', [0, 4, 7, 11]);
            // F (4th degree) is a half-step above E (3rd of Cmaj7) — classic avoid note
            expect(avoidNotes).toContain('F');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// FRETBOARD MAPPING
// ═══════════════════════════════════════════════════════════════════════════

describe('Fretboard Mapping', () => {
    describe('getNoteAtPosition', () => {
        it('should return E for open 1st string (high E)', () => {
            const pos = getNoteAtPosition(1, 0);
            expect(pos.note).toBe('E');
            expect(pos.octave).toBe(4);
        });

        it('should return E for open 6th string (low E)', () => {
            const pos = getNoteAtPosition(6, 0);
            expect(pos.note).toBe('E');
            expect(pos.octave).toBe(2);
        });

        it('should return A for open 5th string', () => {
            const pos = getNoteAtPosition(5, 0);
            expect(pos.note).toBe('A');
        });

        it('should return F for 1st fret of 1st string', () => {
            const pos = getNoteAtPosition(1, 1);
            expect(pos.note).toBe('F');
        });

        it('should return the same note at 12th fret as open', () => {
            const open = getNoteAtPosition(1, 0);
            const twelfth = getNoteAtPosition(1, 12);
            expect(open.note).toBe(twelfth.note);
            expect(twelfth.octave).toBe(open.octave + 1);
        });

        it('should throw for invalid string', () => {
            expect(() => getNoteAtPosition(0, 5)).toThrow();
            expect(() => getNoteAtPosition(7, 5)).toThrow();
        });
    });

    describe('getPositionsForNote', () => {
        it('should find multiple positions for C across the neck', () => {
            const positions = getPositionsForNote('C', 0, 12);
            expect(positions.length).toBeGreaterThan(3);
            positions.forEach(p => expect(p.note).toBe('C'));
        });
    });

    describe('getScalePositions', () => {
        it('should get positions for C major scale', () => {
            const positions = getScalePositions('C', 'major', 0, 5);
            expect(positions.length).toBeGreaterThan(10);
            // All should be in C major (no sharps/flats)
            const noteNames = new Set(positions.map(p => p.note));
            expect(noteNames).toContain('C');
            expect(noteNames).toContain('D');
            expect(noteNames).toContain('E');
            expect(noteNames).not.toContain('C#');
            expect(noteNames).not.toContain('F#');
        });

        it('should label roots correctly', () => {
            const positions = getScalePositions('C', 'major', 0, 5);
            const roots = positions.filter(p => p.isRoot);
            expect(roots.length).toBeGreaterThan(0);
            roots.forEach(r => expect(r.note).toBe('C'));
        });
    });

    describe('getChordPositions', () => {
        it('should get positions for Cmaj7', () => {
            const positions = getChordPositions('C', 'maj7', 0, 12);
            expect(positions.length).toBeGreaterThan(5);
            const noteNames = new Set(positions.map(p => p.note));
            expect(noteNames).toContain('C');
            expect(noteNames).toContain('E');
            expect(noteNames).toContain('G');
            expect(noteNames).toContain('B');
        });
    });

    describe('getFullFretboard', () => {
        it('should return 6 strings', () => {
            const board = getFullFretboard(12);
            expect(board).toHaveLength(6);
            board.forEach(string => expect(string).toHaveLength(13)); // 0-12 = 13 positions
        });
    });

    describe('getChordScaleOverlay', () => {
        it('should return colored positions', () => {
            const overlay = getChordScaleOverlay('C', 'maj7', 'ionian', 0, 5);
            expect(overlay.length).toBeGreaterThan(0);
            // Chord tones should have accent color
            const roots = overlay.filter(p => p.isRoot);
            expect(roots.length).toBeGreaterThan(0);
            expect(roots[0].color).toBe('#C8A96E');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// VOICINGS
// ═══════════════════════════════════════════════════════════════════════════

describe('Voicings', () => {
    describe('getVoicingShapes', () => {
        it('should find voicings for maj7', () => {
            const voicings = getVoicingShapes('maj7');
            expect(voicings.length).toBeGreaterThan(0);
        });

        it('should find voicings for m7', () => {
            const voicings = getVoicingShapes('m7');
            expect(voicings.length).toBeGreaterThan(0);
        });

        it('should find voicings for 7 (dominant)', () => {
            const voicings = getVoicingShapes('7');
            expect(voicings.length).toBeGreaterThan(0);
        });
    });

    describe('resolveVoicing', () => {
        it('should place a Cmaj7 voicing on the fretboard', () => {
            const shapes = getVoicingShapes('maj7');
            const resolved = resolveVoicing(shapes[0], 'C');
            expect(resolved.length).toBeGreaterThan(0);
            // Should contain a C note somewhere
            const notes = resolved.map(p => p.note);
            expect(notes).toContain('C');
        });

        it('should place voicings in playable range', () => {
            const shapes = getVoicingShapes('maj7');
            const resolved = resolveVoicing(shapes[0], 'A');
            resolved.forEach(p => {
                expect(p.fret).toBeGreaterThanOrEqual(0);
                expect(p.fret).toBeLessThanOrEqual(22);
            });
        });
    });

    describe('getVoicingsForChord', () => {
        it('should return resolved voicings for Cmaj7', () => {
            const results = getVoicingsForChord('C', 'maj7');
            expect(results.length).toBeGreaterThan(0);
            results.forEach(r => {
                expect(r.positions.length).toBeGreaterThan(0);
            });
        });

        it('should sort by proximity when nearFret is specified', () => {
            const results = getVoicingsForChord('C', 'maj7', { nearFret: 3 });
            if (results.length >= 2) {
                // First result should be closer to fret 3 than the last
                const avg1 = results[0].positions.reduce((s, p) => s + p.fret, 0) / results[0].positions.length;
                const avgLast = results[results.length - 1].positions.reduce((s, p) => s + p.fret, 0) / results[results.length - 1].positions.length;
                expect(Math.abs(avg1 - 3)).toBeLessThanOrEqual(Math.abs(avgLast - 3));
            }
        });
    });

    describe('getClosestVoicing', () => {
        it('should find a close G7 voicing from a Dm7 voicing', () => {
            const dm7Voicings = getVoicingsForChord('D', 'm7', { nearFret: 5 });
            if (dm7Voicings.length > 0) {
                const closest = getClosestVoicing(dm7Voicings[0].positions, 'G', '7');
                expect(closest).not.toBeNull();
                if (closest) {
                    expect(closest.totalMovement).toBeGreaterThanOrEqual(0);
                    expect(closest.positions.length).toBeGreaterThan(0);
                }
            }
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// VOICE LEADING
// ═══════════════════════════════════════════════════════════════════════════

describe('Voice Leading', () => {
    describe('parseChordSymbol', () => {
        it('should parse simple chords', () => {
            expect(parseChordSymbol('Cmaj7')).toEqual({ root: 'C', typeSymbol: 'maj7' });
            expect(parseChordSymbol('Dm7')).toEqual({ root: 'D', typeSymbol: 'm7' });
            expect(parseChordSymbol('G7')).toEqual({ root: 'G', typeSymbol: '7' });
        });

        it('should parse chords with accidentals', () => {
            expect(parseChordSymbol('F#m7')).toEqual({ root: 'F#', typeSymbol: 'm7' });
            expect(parseChordSymbol('Bbmaj7')).toEqual({ root: 'Bb', typeSymbol: 'maj7' });
        });

        it('should default to major for plain note', () => {
            expect(parseChordSymbol('C')).toEqual({ root: 'C', typeSymbol: 'maj' });
        });

        it('should normalize aliases', () => {
            expect(parseChordSymbol('CΔ7').typeSymbol).toBe('maj7');
            expect(parseChordSymbol('C-7').typeSymbol).toBe('m7');
        });
    });

    describe('getCommonTones', () => {
        it('should find common tones between Dm7 and G7', () => {
            const common = getCommonTones('Dm7', 'G7');
            // D and F are common tones (D is in both, F is b7 of G7 and b3 of Dm7)
            expect(common.length).toBeGreaterThan(0);
        });

        it('should find common tones between Cmaj7 and Am7', () => {
            const common = getCommonTones('Cmaj7', 'Am7');
            // C, E, G are all common
            expect(common.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('getGuidetoneLine', () => {
        it('should extract guide tones for ii-V-I', () => {
            const guideTones = getGuidetoneLine(['Dm7', 'G7', 'Cmaj7']);
            expect(guideTones).toHaveLength(3);

            // Dm7: 3rd = F, 7th = C
            expect(guideTones[0].chordName).toBe('Dm7');
            expect(guideTones[0].third.note).toBeTruthy();
            expect(guideTones[0].seventh.note).toBeTruthy();

            // G7: 3rd = B, 7th = F
            expect(guideTones[1].chordName).toBe('G7');

            // Cmaj7: 3rd = E, 7th = B
            expect(guideTones[2].chordName).toBe('Cmaj7');
        });
    });

    describe('getVoiceLeadingPath', () => {
        it('should find a path through ii-V-I', () => {
            const path = getVoiceLeadingPath(['Dm7', 'G7', 'Cmaj7']);
            expect(path.steps.length).toBeLessThanOrEqual(3);
            // If voicings were found, movement should be defined
            if (path.steps.length === 3) {
                expect(path.totalMovement).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('analyzeVoiceMotion', () => {
        it('should detect common tones and movement', () => {
            const dm7 = getVoicingsForChord('D', 'm7', { nearFret: 5 });
            const g7 = getVoicingsForChord('G', '7', { nearFret: 5 });

            if (dm7.length > 0 && g7.length > 0) {
                const motions = analyzeVoiceMotion(dm7[0].positions, g7[0].positions);
                expect(motions.length).toBeGreaterThan(0);
                // Each motion should have a type
                motions.forEach(m => {
                    expect(['common', 'step', 'leap', 'contrary', 'new']).toContain(m.type);
                });
            }
        });
    });
});
