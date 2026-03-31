/**
 * voicings.ts — Guitar chord voicing database and generators
 *
 * Covers root position, inversions, drop-2, drop-3, shell voicings,
 * and CAGED shapes for the most common chord types.
 *
 * Each voicing is defined using reference frets for C root.
 * Transposition is done by adding the root's pitch class value to each fret.
 */

import { pitchClass, STANDARD_TUNING } from './notes';
import { getNoteAtPosition, type FretPosition } from './fretboardMapping';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GuitarVoicing {
    name: string;
    chordType: string;
    voicingType: VoicingType;
    stringSet: number[];
    /** Each finger defined by string + reference fret (for C root) + interval label */
    shape: VoicingFinger[];
    inversion: number;      // 0 = root, 1 = 1st inv, 2 = 2nd inv, 3 = 3rd inv
    movable: boolean;
}

export interface VoicingFinger {
    string: number;         // 1–6
    referenceFret: number;  // correct fret when root = C
    intervalLabel: string;  // e.g. 'R', '3', '5', '7'
    note?: string;
}

export type VoicingType =
    | 'root_position'
    | 'drop2'
    | 'drop3'
    | 'drop24'
    | 'shell'
    | 'caged'
    | 'barre'
    | 'open'
    | 'spread'
    | 'cluster'
    | 'quartal';

// ── Voicing Shapes Database ──────────────────────────────────────────────────
// All reference frets are for C root. To transpose, add pitchClass(root) to each fret.
// Guitar standard tuning: Str6=E2, Str5=A2, Str4=D3, Str3=G3, Str2=B3, Str1=E4

function v(
    name: string,
    chordType: string,
    voicingType: VoicingType,
    stringSet: number[],
    shape: [number, number, string][],  // [string, referenceFret, label]
    inversion = 0,
    movable = true
): GuitarVoicing {
    return {
        name,
        chordType,
        voicingType,
        stringSet,
        shape: shape.map(([s, f, l]) => ({ string: s, referenceFret: f, intervalLabel: l })),
        inversion,
        movable,
    };
}

export const VOICING_SHAPES: GuitarVoicing[] = [
    // ═══════════════════════════════════════════════════
    // MAJOR 7 VOICINGS (Cmaj7 = C-E-G-B)
    // ═══════════════════════════════════════════════════

    // Root position (close voicing) on strings 5-4-3-2
    // Cmaj7: C-E-G-B → str5=C, str4=E, str3=G, str2=B
    v('Maj7 Root Pos (5432)', 'maj7', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 0, '5'], [2, 0, '7']], 0),
    // Root position on strings 4-3-2-1
    v('Maj7 Root Pos (4321)', 'maj7', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 8, '5'], [1, 7, '7']], 0),

    // Drop-2 on strings 4-3-2-1
    // Root pos (5-R-3-7): G3-C4-E4-B4
    v('Maj7 Drop-2 Root', 'maj7', 'drop2', [4, 3, 2, 1], [[4, 5, '5'], [3, 5, 'R'], [2, 5, '3'], [1, 7, '7']], 0),
    // 1st inv (7-3-5-R): B3-E4-G4-C5
    v('Maj7 Drop-2 1st', 'maj7', 'drop2', [4, 3, 2, 1], [[4, 9, '7'], [3, 9, '3'], [2, 8, '5'], [1, 8, 'R']], 1),
    // 2nd inv (R-5-7-3): C4-G4-B4-E5
    v('Maj7 Drop-2 2nd', 'maj7', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 12, '5'], [2, 12, '7'], [1, 12, '3']], 2),
    // 3rd inv (3-7-R-5): E3-B3-C4-G4
    v('Maj7 Drop-2 3rd', 'maj7', 'drop2', [4, 3, 2, 1], [[4, 2, '3'], [3, 4, '7'], [2, 1, 'R'], [1, 3, '5']], 3),

    // Drop-2 on strings 5-4-3-2
    // Root pos: G3-C4-E4-B4
    v('Maj7 Drop-2 Root (5432)', 'maj7', 'drop2', [5, 4, 3, 2], [[5, 10, '5'], [4, 10, 'R'], [3, 9, '3'], [2, 12, '7']], 0),
    // 1st inv: B2-E3-G3-C4
    v('Maj7 Drop-2 1st (5432)', 'maj7', 'drop2', [5, 4, 3, 2], [[5, 2, '7'], [4, 2, '3'], [3, 0, '5'], [2, 1, 'R']], 1),
    // 2nd inv: C3-G3-B3-E4
    v('Maj7 Drop-2 2nd (5432)', 'maj7', 'drop2', [5, 4, 3, 2], [[5, 3, 'R'], [4, 5, '5'], [3, 4, '7'], [2, 5, '3']], 2),
    // 3rd inv: E3-B3-C4-G4
    v('Maj7 Drop-2 3rd (5432)', 'maj7', 'drop2', [5, 4, 3, 2], [[5, 7, '3'], [4, 9, '7'], [3, 5, 'R'], [2, 8, '5']], 3),

    // Drop-2 on strings 6-5-4-3 (Beato p.103 row 1)
    v('Maj7 Drop-2 Root (6543)', 'maj7', 'drop2', [6, 5, 4, 3], [[6, 3, '5'], [5, 3, 'R'], [4, 2, '3'], [3, 4, '7']], 0),
    v('Maj7 Drop-2 1st (6543)', 'maj7', 'drop2', [6, 5, 4, 3], [[6, 7, '7'], [5, 7, '3'], [4, 5, '5'], [3, 5, 'R']], 1),
    v('Maj7 Drop-2 2nd (6543)', 'maj7', 'drop2', [6, 5, 4, 3], [[6, 8, 'R'], [5, 10, '5'], [4, 9, '7'], [3, 9, '3']], 2),
    v('Maj7 Drop-2 3rd (6543)', 'maj7', 'drop2', [6, 5, 4, 3], [[6, 0, '3'], [5, 2, '7'], [4, 10, 'R'], [3, 0, '5']], 3),

    // Shell voicings (Root + 3 + 7)
    // R-3-7 on strings 6-5-4: C3-E3-B3
    v('Maj7 Shell (R-3-7) E-str', 'maj7', 'shell', [6, 5, 4], [[6, 8, 'R'], [5, 7, '3'], [4, 9, '7']], 0),
    // R-3-7 on strings 5-4-3: C3-E3-B3
    v('Maj7 Shell (R-3-7) A-str', 'maj7', 'shell', [5, 4, 3], [[5, 3, 'R'], [4, 2, '3'], [3, 4, '7']], 0),
    // R-7-3 on strings 6-4-3: C3-B3-E4
    v('Maj7 Shell (R-7-3) E-str', 'maj7', 'shell', [6, 4, 3], [[6, 8, 'R'], [4, 9, '7'], [3, 9, '3']], 0),

    // ═══════════════════════════════════════════════════
    // MINOR 7 VOICINGS (Cm7 = C-Eb-G-Bb)
    // ═══════════════════════════════════════════════════

    // Root position (close voicing)
    // Cm7: C-Eb-G-Bb → str5=C, str4=Eb, str3=G, str2=Bb
    v('m7 Root Pos (5432)', 'm7', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 1, 'b3'], [3, 0, '5'], [2, 11, 'b7']], 0),
    v('m7 Root Pos (4321)', 'm7', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 8, 'b3'], [2, 8, '5'], [1, 6, 'b7']], 0),

    // Drop-2 on strings 4-3-2-1
    // Root pos (5-R-b3-b7): G3-C4-Eb4-Bb4
    v('m7 Drop-2 Root', 'm7', 'drop2', [4, 3, 2, 1], [[4, 5, '5'], [3, 5, 'R'], [2, 4, 'b3'], [1, 6, 'b7']], 0),
    // 1st inv (b7-b3-5-R): Bb3-Eb4-G4-C5
    v('m7 Drop-2 1st', 'm7', 'drop2', [4, 3, 2, 1], [[4, 8, 'b7'], [3, 8, 'b3'], [2, 8, '5'], [1, 8, 'R']], 1),
    // 2nd inv (R-5-b7-b3): C4-G4-Bb4-Eb5
    v('m7 Drop-2 2nd', 'm7', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 12, '5'], [2, 11, 'b7'], [1, 11, 'b3']], 2),
    // 3rd inv (b3-b7-R-5): Eb3-Bb3-C4-G4
    v('m7 Drop-2 3rd', 'm7', 'drop2', [4, 3, 2, 1], [[4, 1, 'b3'], [3, 3, 'b7'], [2, 1, 'R'], [1, 3, '5']], 3),

    // Drop-2 on strings 5-4-3-2 (Beato p.105 row 2)
    v('m7 Drop-2 Root (5432)', 'm7', 'drop2', [5, 4, 3, 2], [[5, 10, '5'], [4, 10, 'R'], [3, 8, 'b3'], [2, 11, 'b7']], 0),
    v('m7 Drop-2 1st (5432)', 'm7', 'drop2', [5, 4, 3, 2], [[5, 1, 'b7'], [4, 1, 'b3'], [3, 0, '5'], [2, 1, 'R']], 1),
    v('m7 Drop-2 2nd (5432)', 'm7', 'drop2', [5, 4, 3, 2], [[5, 3, 'R'], [4, 5, '5'], [3, 3, 'b7'], [2, 4, 'b3']], 2),
    v('m7 Drop-2 3rd (5432)', 'm7', 'drop2', [5, 4, 3, 2], [[5, 6, 'b3'], [4, 8, 'b7'], [3, 5, 'R'], [2, 8, '5']], 3),

    // Drop-2 on strings 6-5-4-3 (Beato p.105 row 1)
    v('m7 Drop-2 Root (6543)', 'm7', 'drop2', [6, 5, 4, 3], [[6, 3, '5'], [5, 3, 'R'], [4, 1, 'b3'], [3, 3, 'b7']], 0),
    v('m7 Drop-2 1st (6543)', 'm7', 'drop2', [6, 5, 4, 3], [[6, 6, 'b7'], [5, 6, 'b3'], [4, 5, '5'], [3, 5, 'R']], 1),
    v('m7 Drop-2 2nd (6543)', 'm7', 'drop2', [6, 5, 4, 3], [[6, 8, 'R'], [5, 10, '5'], [4, 8, 'b7'], [3, 8, 'b3']], 2),
    v('m7 Drop-2 3rd (6543)', 'm7', 'drop2', [6, 5, 4, 3], [[6, 11, 'b3'], [5, 1, 'b7'], [4, 10, 'R'], [3, 0, '5']], 3),

    // Shell voicings
    v('m7 Shell (R-b3-b7) E-str', 'm7', 'shell', [6, 5, 4], [[6, 8, 'R'], [5, 6, 'b3'], [4, 8, 'b7']], 0),
    v('m7 Shell (R-b3-b7) A-str', 'm7', 'shell', [5, 4, 3], [[5, 3, 'R'], [4, 1, 'b3'], [3, 3, 'b7']], 0),

    // ═══════════════════════════════════════════════════
    // DOMINANT 7 VOICINGS (C7 = C-E-G-Bb)
    // ═══════════════════════════════════════════════════

    // Root position (close voicing)
    v('7 Root Pos (5432)', '7', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 0, '5'], [2, 11, 'b7']], 0),
    v('7 Root Pos (4321)', '7', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 8, '5'], [1, 6, 'b7']], 0),

    // Drop-2 on strings 4-3-2-1
    // Root pos (5-R-3-b7): G3-C4-E4-Bb4
    v('7 Drop-2 Root', '7', 'drop2', [4, 3, 2, 1], [[4, 5, '5'], [3, 5, 'R'], [2, 5, '3'], [1, 6, 'b7']], 0),
    // 1st inv (b7-3-5-R): Bb3-E4-G4-C5
    v('7 Drop-2 1st', '7', 'drop2', [4, 3, 2, 1], [[4, 8, 'b7'], [3, 9, '3'], [2, 8, '5'], [1, 8, 'R']], 1),
    // 2nd inv (R-5-b7-3): C4-G4-Bb4-E5
    v('7 Drop-2 2nd', '7', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 12, '5'], [2, 11, 'b7'], [1, 12, '3']], 2),
    // 3rd inv (3-b7-R-5): E3-Bb3-C4-G4
    v('7 Drop-2 3rd', '7', 'drop2', [4, 3, 2, 1], [[4, 2, '3'], [3, 3, 'b7'], [2, 1, 'R'], [1, 3, '5']], 3),

    // Drop-2 on strings 5-4-3-2 (Beato p.104 row 2)
    v('7 Drop-2 Root (5432)', '7', 'drop2', [5, 4, 3, 2], [[5, 10, '5'], [4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7']], 0),
    v('7 Drop-2 1st (5432)', '7', 'drop2', [5, 4, 3, 2], [[5, 1, 'b7'], [4, 2, '3'], [3, 0, '5'], [2, 1, 'R']], 1),
    v('7 Drop-2 2nd (5432)', '7', 'drop2', [5, 4, 3, 2], [[5, 3, 'R'], [4, 5, '5'], [3, 3, 'b7'], [2, 5, '3']], 2),
    v('7 Drop-2 3rd (5432)', '7', 'drop2', [5, 4, 3, 2], [[5, 7, '3'], [4, 8, 'b7'], [3, 5, 'R'], [2, 8, '5']], 3),

    // Drop-2 on strings 6-5-4-3 (Beato p.104 row 1)
    v('7 Drop-2 Root (6543)', '7', 'drop2', [6, 5, 4, 3], [[6, 3, '5'], [5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7']], 0),
    v('7 Drop-2 1st (6543)', '7', 'drop2', [6, 5, 4, 3], [[6, 6, 'b7'], [5, 7, '3'], [4, 5, '5'], [3, 5, 'R']], 1),
    v('7 Drop-2 2nd (6543)', '7', 'drop2', [6, 5, 4, 3], [[6, 8, 'R'], [5, 10, '5'], [4, 8, 'b7'], [3, 9, '3']], 2),
    v('7 Drop-2 3rd (6543)', '7', 'drop2', [6, 5, 4, 3], [[6, 0, '3'], [5, 1, 'b7'], [4, 10, 'R'], [3, 0, '5']], 3),

    // Shell voicings (Freddie Green)
    v('7 Shell (R-3-b7) E-str', '7', 'shell', [6, 5, 4], [[6, 8, 'R'], [5, 7, '3'], [4, 8, 'b7']], 0),
    v('7 Shell (R-3-b7) A-str', '7', 'shell', [5, 4, 3], [[5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7']], 0),
    v('7 Shell (R-b7-3)', '7', 'shell', [6, 4, 3], [[6, 8, 'R'], [4, 8, 'b7'], [3, 9, '3']], 0),

    // ═══════════════════════════════════════════════════
    // HALF-DIMINISHED (m7b5) VOICINGS (Cm7b5 = C-Eb-Gb-Bb)
    // ═══════════════════════════════════════════════════

    // Root position
    v('m7b5 Root Pos (5432)', 'm7b5', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 1, 'b3'], [3, 11, 'b5'], [2, 11, 'b7']], 0),
    v('m7b5 Root Pos (4321)', 'm7b5', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 8, 'b3'], [2, 7, 'b5'], [1, 6, 'b7']], 0),

    // Drop-2 on strings 4-3-2-1 (Beato p.108 row 3)
    v('m7b5 Drop-2 Root', 'm7b5', 'drop2', [4, 3, 2, 1], [[4, 4, 'b5'], [3, 5, 'R'], [2, 4, 'b3'], [1, 6, 'b7']], 0),
    v('m7b5 Drop-2 1st', 'm7b5', 'drop2', [4, 3, 2, 1], [[4, 8, 'b7'], [3, 8, 'b3'], [2, 7, 'b5'], [1, 8, 'R']], 1),
    v('m7b5 Drop-2 2nd', 'm7b5', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 11, 'b5'], [2, 11, 'b7'], [1, 11, 'b3']], 2),
    v('m7b5 Drop-2 3rd', 'm7b5', 'drop2', [4, 3, 2, 1], [[4, 1, 'b3'], [3, 3, 'b7'], [2, 1, 'R'], [1, 2, 'b5']], 3),

    // Drop-2 on strings 5-4-3-2 (Beato p.108 row 2)
    v('m7b5 Drop-2 Root (5432)', 'm7b5', 'drop2', [5, 4, 3, 2], [[5, 9, 'b5'], [4, 10, 'R'], [3, 8, 'b3'], [2, 11, 'b7']], 0),
    v('m7b5 Drop-2 1st (5432)', 'm7b5', 'drop2', [5, 4, 3, 2], [[5, 1, 'b7'], [4, 1, 'b3'], [3, 11, 'b5'], [2, 1, 'R']], 1),
    v('m7b5 Drop-2 2nd (5432)', 'm7b5', 'drop2', [5, 4, 3, 2], [[5, 3, 'R'], [4, 4, 'b5'], [3, 3, 'b7'], [2, 4, 'b3']], 2),
    v('m7b5 Drop-2 3rd (5432)', 'm7b5', 'drop2', [5, 4, 3, 2], [[5, 6, 'b3'], [4, 8, 'b7'], [3, 5, 'R'], [2, 7, 'b5']], 3),

    // Drop-2 on strings 6-5-4-3 (Beato p.108 row 1)
    v('m7b5 Drop-2 Root (6543)', 'm7b5', 'drop2', [6, 5, 4, 3], [[6, 2, 'b5'], [5, 3, 'R'], [4, 1, 'b3'], [3, 3, 'b7']], 0),
    v('m7b5 Drop-2 1st (6543)', 'm7b5', 'drop2', [6, 5, 4, 3], [[6, 6, 'b7'], [5, 6, 'b3'], [4, 4, 'b5'], [3, 5, 'R']], 1),
    v('m7b5 Drop-2 2nd (6543)', 'm7b5', 'drop2', [6, 5, 4, 3], [[6, 8, 'R'], [5, 9, 'b5'], [4, 8, 'b7'], [3, 8, 'b3']], 2),
    v('m7b5 Drop-2 3rd (6543)', 'm7b5', 'drop2', [6, 5, 4, 3], [[6, 11, 'b3'], [5, 1, 'b7'], [4, 10, 'R'], [3, 11, 'b5']], 3),

    // Shell
    v('m7b5 Shell (R-b3-b7)', 'm7b5', 'shell', [6, 5, 4], [[6, 8, 'R'], [5, 6, 'b3'], [4, 8, 'b7']], 0),

    // ═══════════════════════════════════════════════════
    // DIMINISHED 7 VOICINGS (Cdim7 = C-Eb-Gb-Bbb/A)
    // Beato p.109
    // ═══════════════════════════════════════════════════

    // Drop-2 on strings 4-3-2-1 (Beato p.109 row 3)
    v('dim7 Drop-2 Root', 'dim7', 'drop2', [4, 3, 2, 1], [[4, 4, 'b5'], [3, 5, 'R'], [2, 4, 'b3'], [1, 5, 'bb7']], 0),
    v('dim7 Drop-2 1st', 'dim7', 'drop2', [4, 3, 2, 1], [[4, 7, 'bb7'], [3, 8, 'b3'], [2, 7, 'b5'], [1, 8, 'R']], 1),
    v('dim7 Drop-2 2nd', 'dim7', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 11, 'b5'], [2, 10, 'bb7'], [1, 11, 'b3']], 2),
    v('dim7 Drop-2 3rd', 'dim7', 'drop2', [4, 3, 2, 1], [[4, 1, 'b3'], [3, 2, 'bb7'], [2, 1, 'R'], [1, 2, 'b5']], 3),

    // Drop-2 on strings 5-4-3-2 (Beato p.109 row 2)
    v('dim7 Drop-2 Root (5432)', 'dim7', 'drop2', [5, 4, 3, 2], [[5, 9, 'b5'], [4, 10, 'R'], [3, 8, 'b3'], [2, 10, 'bb7']], 0),
    v('dim7 Drop-2 1st (5432)', 'dim7', 'drop2', [5, 4, 3, 2], [[5, 0, 'bb7'], [4, 1, 'b3'], [3, 11, 'b5'], [2, 1, 'R']], 1),
    v('dim7 Drop-2 2nd (5432)', 'dim7', 'drop2', [5, 4, 3, 2], [[5, 3, 'R'], [4, 4, 'b5'], [3, 2, 'bb7'], [2, 4, 'b3']], 2),
    v('dim7 Drop-2 3rd (5432)', 'dim7', 'drop2', [5, 4, 3, 2], [[5, 6, 'b3'], [4, 7, 'bb7'], [3, 5, 'R'], [2, 7, 'b5']], 3),

    // Drop-2 on strings 6-5-4-3 (Beato p.109 row 1)
    v('dim7 Drop-2 Root (6543)', 'dim7', 'drop2', [6, 5, 4, 3], [[6, 2, 'b5'], [5, 3, 'R'], [4, 1, 'b3'], [3, 2, 'bb7']], 0),
    v('dim7 Drop-2 1st (6543)', 'dim7', 'drop2', [6, 5, 4, 3], [[6, 5, 'bb7'], [5, 6, 'b3'], [4, 4, 'b5'], [3, 5, 'R']], 1),
    v('dim7 Drop-2 2nd (6543)', 'dim7', 'drop2', [6, 5, 4, 3], [[6, 8, 'R'], [5, 9, 'b5'], [4, 7, 'bb7'], [3, 8, 'b3']], 2),
    v('dim7 Drop-2 3rd (6543)', 'dim7', 'drop2', [6, 5, 4, 3], [[6, 11, 'b3'], [5, 0, 'bb7'], [4, 10, 'R'], [3, 11, 'b5']], 3),

    // ═══════════════════════════════════════════════════
    // MINOR-MAJOR 7 VOICINGS (CmMaj7 = C-Eb-G-B)
    // Beato p.107
    // ═══════════════════════════════════════════════════

    // Drop-2 on strings 4-3-2-1
    v('mMaj7 Drop-2 Root', 'mMaj7', 'drop2', [4, 3, 2, 1], [[4, 5, '5'], [3, 5, 'R'], [2, 4, 'b3'], [1, 7, '7']], 0),
    v('mMaj7 Drop-2 1st', 'mMaj7', 'drop2', [4, 3, 2, 1], [[4, 9, '7'], [3, 8, 'b3'], [2, 8, '5'], [1, 8, 'R']], 1),
    v('mMaj7 Drop-2 2nd', 'mMaj7', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 12, '5'], [2, 12, '7'], [1, 11, 'b3']], 2),
    v('mMaj7 Drop-2 3rd', 'mMaj7', 'drop2', [4, 3, 2, 1], [[4, 1, 'b3'], [3, 4, '7'], [2, 1, 'R'], [1, 3, '5']], 3),

    // Drop-2 on strings 5-4-3-2
    v('mMaj7 Drop-2 Root (5432)', 'mMaj7', 'drop2', [5, 4, 3, 2], [[5, 10, '5'], [4, 10, 'R'], [3, 8, 'b3'], [2, 12, '7']], 0),
    v('mMaj7 Drop-2 1st (5432)', 'mMaj7', 'drop2', [5, 4, 3, 2], [[5, 2, '7'], [4, 1, 'b3'], [3, 0, '5'], [2, 1, 'R']], 1),
    v('mMaj7 Drop-2 2nd (5432)', 'mMaj7', 'drop2', [5, 4, 3, 2], [[5, 3, 'R'], [4, 5, '5'], [3, 4, '7'], [2, 4, 'b3']], 2),
    v('mMaj7 Drop-2 3rd (5432)', 'mMaj7', 'drop2', [5, 4, 3, 2], [[5, 6, 'b3'], [4, 9, '7'], [3, 5, 'R'], [2, 8, '5']], 3),

    // Drop-2 on strings 6-5-4-3
    v('mMaj7 Drop-2 Root (6543)', 'mMaj7', 'drop2', [6, 5, 4, 3], [[6, 3, '5'], [5, 3, 'R'], [4, 1, 'b3'], [3, 4, '7']], 0),
    v('mMaj7 Drop-2 1st (6543)', 'mMaj7', 'drop2', [6, 5, 4, 3], [[6, 7, '7'], [5, 6, 'b3'], [4, 5, '5'], [3, 5, 'R']], 1),
    v('mMaj7 Drop-2 2nd (6543)', 'mMaj7', 'drop2', [6, 5, 4, 3], [[6, 8, 'R'], [5, 10, '5'], [4, 9, '7'], [3, 8, 'b3']], 2),
    v('mMaj7 Drop-2 3rd (6543)', 'mMaj7', 'drop2', [6, 5, 4, 3], [[6, 11, 'b3'], [5, 2, '7'], [4, 10, 'R'], [3, 0, '5']], 3),

    // ═══════════════════════════════════════════════════
    // 4-NOTE CHORDS: 7b5, 7#5, maj7#5, 6, m6, add9, madd9
    // Drop-2 on strings 4-3-2-1 (all inversions)
    // ═══════════════════════════════════════════════════

    // Dom7b5 (C-E-Gb-Bb) — Drop-2
    v('7b5 Drop-2 Root', '7b5', 'drop2', [4, 3, 2, 1], [[4, 4, 'b5'], [3, 5, 'R'], [2, 5, '3'], [1, 6, 'b7']], 0),
    v('7b5 Drop-2 1st', '7b5', 'drop2', [4, 3, 2, 1], [[4, 8, 'b7'], [3, 9, '3'], [2, 7, 'b5'], [1, 8, 'R']], 1),
    v('7b5 Drop-2 2nd', '7b5', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 11, 'b5'], [2, 11, 'b7'], [1, 12, '3']], 2),
    v('7b5 Drop-2 3rd', '7b5', 'drop2', [4, 3, 2, 1], [[4, 2, '3'], [3, 3, 'b7'], [2, 1, 'R'], [1, 2, 'b5']], 3),
    v('7b5 Drop-2 Root (5432)', '7b5', 'drop2', [5, 4, 3, 2], [[5, 9, 'b5'], [4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7']], 0),
    v('7b5 Drop-2 1st (5432)', '7b5', 'drop2', [5, 4, 3, 2], [[5, 1, 'b7'], [4, 2, '3'], [3, 11, 'b5'], [2, 1, 'R']], 1),

    // Aug7 / 7#5 (C-E-G#-Bb) — Drop-2
    v('7#5 Drop-2 Root', '7#5', 'drop2', [4, 3, 2, 1], [[4, 6, '#5'], [3, 5, 'R'], [2, 5, '3'], [1, 6, 'b7']], 0),
    v('7#5 Drop-2 1st', '7#5', 'drop2', [4, 3, 2, 1], [[4, 8, 'b7'], [3, 9, '3'], [2, 8, '#5'], [1, 8, 'R']], 1),
    v('7#5 Drop-2 2nd', '7#5', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 1, '#5'], [2, 11, 'b7'], [1, 12, '3']], 2),
    v('7#5 Drop-2 3rd', '7#5', 'drop2', [4, 3, 2, 1], [[4, 2, '3'], [3, 3, 'b7'], [2, 1, 'R'], [1, 4, '#5']], 3),

    // Maj7#5 (C-E-G#-B) — Drop-2
    v('maj7#5 Drop-2 Root', 'maj7#5', 'drop2', [4, 3, 2, 1], [[4, 6, '#5'], [3, 5, 'R'], [2, 5, '3'], [1, 7, '7']], 0),
    v('maj7#5 Drop-2 1st', 'maj7#5', 'drop2', [4, 3, 2, 1], [[4, 9, '7'], [3, 9, '3'], [2, 8, '#5'], [1, 8, 'R']], 1),
    v('maj7#5 Drop-2 2nd', 'maj7#5', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 1, '#5'], [2, 12, '7'], [1, 12, '3']], 2),
    v('maj7#5 Drop-2 3rd', 'maj7#5', 'drop2', [4, 3, 2, 1], [[4, 2, '3'], [3, 4, '7'], [2, 1, 'R'], [1, 4, '#5']], 3),

    // Maj6 (C-E-G-A) — Drop-2 (Beato p.102)
    v('6 Drop-2 Root', '6', 'drop2', [4, 3, 2, 1], [[4, 5, '5'], [3, 5, 'R'], [2, 5, '3'], [1, 5, '6']], 0),
    v('6 Drop-2 1st', '6', 'drop2', [4, 3, 2, 1], [[4, 7, '6'], [3, 9, '3'], [2, 8, '5'], [1, 8, 'R']], 1),
    v('6 Drop-2 2nd', '6', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 12, '5'], [2, 10, '6'], [1, 12, '3']], 2),
    v('6 Drop-2 3rd', '6', 'drop2', [4, 3, 2, 1], [[4, 2, '3'], [3, 2, '6'], [2, 1, 'R'], [1, 3, '5']], 3),
    v('6 Drop-2 Root (5432)', '6', 'drop2', [5, 4, 3, 2], [[5, 10, '5'], [4, 10, 'R'], [3, 9, '3'], [2, 10, '6']], 0),
    v('6 Drop-2 1st (5432)', '6', 'drop2', [5, 4, 3, 2], [[5, 0, '6'], [4, 2, '3'], [3, 0, '5'], [2, 1, 'R']], 1),

    // Min6 (C-Eb-G-A) — Drop-2 (Beato p.106)
    v('m6 Drop-2 Root', 'm6', 'drop2', [4, 3, 2, 1], [[4, 5, '5'], [3, 5, 'R'], [2, 4, 'b3'], [1, 5, '6']], 0),
    v('m6 Drop-2 1st', 'm6', 'drop2', [4, 3, 2, 1], [[4, 7, '6'], [3, 8, 'b3'], [2, 8, '5'], [1, 8, 'R']], 1),
    v('m6 Drop-2 2nd', 'm6', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 12, '5'], [2, 10, '6'], [1, 11, 'b3']], 2),
    v('m6 Drop-2 3rd', 'm6', 'drop2', [4, 3, 2, 1], [[4, 1, 'b3'], [3, 2, '6'], [2, 1, 'R'], [1, 3, '5']], 3),
    v('m6 Drop-2 Root (5432)', 'm6', 'drop2', [5, 4, 3, 2], [[5, 10, '5'], [4, 10, 'R'], [3, 8, 'b3'], [2, 10, '6']], 0),
    v('m6 Drop-2 1st (5432)', 'm6', 'drop2', [5, 4, 3, 2], [[5, 0, '6'], [4, 1, 'b3'], [3, 0, '5'], [2, 1, 'R']], 1),

    // Add9 (C-E-G-D) — root position shapes
    v('add9 Root (4321)', 'add9', 'root_position', [4, 3, 2, 1], [[4, 5, '5'], [3, 5, 'R'], [2, 5, '3'], [1, 10, '9']], 0),
    v('add9 Root (5432)', 'add9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 0, '5'], [2, 3, '9']], 0),

    // mAdd9 (C-Eb-G-D)
    v('madd9 Root (4321)', 'madd9', 'root_position', [4, 3, 2, 1], [[4, 5, '5'], [3, 5, 'R'], [2, 4, 'b3'], [1, 10, '9']], 0),
    v('madd9 Root (5432)', 'madd9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 1, 'b3'], [3, 0, '5'], [2, 3, '9']], 0),

    // ═══════════════════════════════════════════════════
    // EXTENDED CHORDS: 9ths (played as 4-note, drop the 5th)
    // Maj9 = R,3,7,9 | m9 = R,b3,b7,9 | 9 = R,3,b7,9
    // ═══════════════════════════════════════════════════

    // Maj9 (C-E-B-D → drop 5th) — Drop-2 style
    v('Maj9 Drop-2 Root', 'maj9', 'drop2', [4, 3, 2, 1], [[4, 2, '9'], [3, 5, 'R'], [2, 5, '3'], [1, 7, '7']], 0),
    v('Maj9 Drop-2 1st', 'maj9', 'drop2', [4, 3, 2, 1], [[4, 9, '7'], [3, 9, '3'], [2, 10, '9'], [1, 8, 'R']], 1),
    v('Maj9 Root (5432)', 'maj9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 4, '7'], [2, 3, '9']], 0),
    v('Maj9 Root (4321)', 'maj9', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 12, '7'], [1, 10, '9']], 0),

    // m9 (C-Eb-Bb-D → drop 5th) — THE ONE YOU TRIED
    v('m9 Drop-2 Root', 'm9', 'drop2', [4, 3, 2, 1], [[4, 2, '9'], [3, 5, 'R'], [2, 4, 'b3'], [1, 6, 'b7']], 0),
    v('m9 Drop-2 1st', 'm9', 'drop2', [4, 3, 2, 1], [[4, 8, 'b7'], [3, 8, 'b3'], [2, 10, '9'], [1, 8, 'R']], 1),
    v('m9 Drop-2 2nd', 'm9', 'drop2', [4, 3, 2, 1], [[4, 10, 'R'], [3, 2, '9'], [2, 11, 'b7'], [1, 11, 'b3']], 2),
    v('m9 Root (5432)', 'm9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 1, 'b3'], [3, 3, 'b7'], [2, 3, '9']], 0),
    v('m9 Root (4321)', 'm9', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 8, 'b3'], [2, 11, 'b7'], [1, 10, '9']], 0),

    // Dom9 (C-E-Bb-D → drop 5th)
    v('9 Drop-2 Root', '9', 'drop2', [4, 3, 2, 1], [[4, 2, '9'], [3, 5, 'R'], [2, 5, '3'], [1, 6, 'b7']], 0),
    v('9 Drop-2 1st', '9', 'drop2', [4, 3, 2, 1], [[4, 8, 'b7'], [3, 9, '3'], [2, 10, '9'], [1, 8, 'R']], 1),
    v('9 Root (5432)', '9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7'], [2, 3, '9']], 0),
    v('9 Root (4321)', '9', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 10, '9']], 0),

    // mMaj9 (C-Eb-B-D → drop 5th)
    v('mMaj9 Root (5432)', 'mMaj9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 1, 'b3'], [3, 4, '7'], [2, 3, '9']], 0),
    v('mMaj9 Root (4321)', 'mMaj9', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 8, 'b3'], [2, 12, '7'], [1, 10, '9']], 0),

    // ═══════════════════════════════════════════════════
    // ALTERED DOMINANTS: 7#9, 7b9, 7alt, 13b9
    // ═══════════════════════════════════════════════════

    // 7#9 "Hendrix chord" (C-E-Bb-D# → R,3,b7,#9)
    v('7#9 Root (4321)', '7#9', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 11, '#9']], 0),
    v('7#9 Drop-2 Root', '7#9', 'drop2', [4, 3, 2, 1], [[4, 3, '#9'], [3, 5, 'R'], [2, 5, '3'], [1, 6, 'b7']], 0),
    v('7#9 Root (5432)', '7#9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7'], [2, 4, '#9']], 0),

    // 7b9 (C-E-Bb-Db → R,3,b7,b9)
    v('7b9 Root (4321)', '7b9', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 9, 'b9']], 0),
    v('7b9 Drop-2 Root', '7b9', 'drop2', [4, 3, 2, 1], [[4, 1, 'b9'], [3, 5, 'R'], [2, 5, '3'], [1, 6, 'b7']], 0),
    v('7b9 Root (5432)', '7b9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7'], [2, 2, 'b9']], 0),

    // 7alt (C-E-Gb-Bb-Db-D# → use R,3,b7,b9 or R,3,b7,#9 — same as 7b9/7#9)
    v('7alt Root (4321)', '7alt', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 9, 'b9']], 0),
    v('7alt Var (4321)', '7alt', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 11, '#9']], 0),
    v('7alt Root (5432)', '7alt', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 4, 'b5'], [3, 3, 'b7'], [2, 2, 'b9']], 0),

    // 13b9 (R,3,b7,b9,13 → play R,3,b7,13 drop 5th and b9)
    v('13b9 Root (4321)', '13b9', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 5, '13']], 0),
    v('13b9 Var (4321)', '13b9', 'root_position', [4, 3, 2, 1], [[4, 1, 'b9'], [3, 5, 'R'], [2, 5, '3'], [1, 5, '13']], 0),

    // ═══════════════════════════════════════════════════
    // 11ths, 13ths, 7#11, 9#11 (reduced to 4-note grips)
    // ═══════════════════════════════════════════════════

    // 11 (R,3,b7,11 → drop 5,9)
    v('11 Root (4321)', '11', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 1, '11']], 0),
    v('11 Root (5432)', '11', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7'], [2, 6, '11']], 0),

    // 13 (R,3,b7,13 → drop 5,9,11)
    v('13 Root (4321)', '13', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 5, '13']], 0),
    v('13 Root (5432)', '13', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7'], [2, 10, '13']], 0),

    // m13 (R,b3,b7,13)
    v('m13 Root (4321)', 'm13', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 8, 'b3'], [2, 11, 'b7'], [1, 5, '13']], 0),
    v('m13 Root (5432)', 'm13', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 1, 'b3'], [3, 3, 'b7'], [2, 10, '13']], 0),

    // 7#11 (R,3,b7,#11)
    v('7#11 Root (4321)', '7#11', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 2, '#11']], 0),
    v('7#11 Root (5432)', '7#11', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7'], [2, 7, '#11']], 0),

    // 9#11 (R,3,b7,#11 — same grip, 9th implied)
    v('9#11 Root (4321)', '9#11', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 11, 'b7'], [1, 2, '#11']], 0),
    v('9#11 Root (5432)', '9#11', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 3, 'b7'], [2, 7, '#11']], 0),

    // ═══════════════════════════════════════════════════
    // SUSPENDED & TRIAD VARIATIONS
    // ═══════════════════════════════════════════════════

    // Sus2 (C-D-G)
    v('Sus2 Root (432)', 'sus2', 'root_position', [4, 3, 2], [[4, 10, 'R'], [3, 7, '2'], [2, 8, '5']], 0),
    v('Sus2 Root (321)', 'sus2', 'root_position', [3, 2, 1], [[3, 5, 'R'], [2, 3, '2'], [1, 3, '5']], 0),
    v('Sus2 1st (432)', 'sus2', 'root_position', [4, 3, 2], [[4, 0, '2'], [3, 0, '5'], [2, 1, 'R']], 1),
    v('Sus2 2nd (432)', 'sus2', 'root_position', [4, 3, 2], [[4, 5, '5'], [3, 5, 'R'], [2, 3, '2']], 2),

    // Sus4 (C-F-G)
    v('Sus4 Root (432)', 'sus4', 'root_position', [4, 3, 2], [[4, 10, 'R'], [3, 10, '4'], [2, 8, '5']], 0),
    v('Sus4 Root (321)', 'sus4', 'root_position', [3, 2, 1], [[3, 5, 'R'], [2, 6, '4'], [1, 3, '5']], 0),
    v('Sus4 1st (432)', 'sus4', 'root_position', [4, 3, 2], [[4, 3, '4'], [3, 0, '5'], [2, 1, 'R']], 1),
    v('Sus4 2nd (432)', 'sus4', 'root_position', [4, 3, 2], [[4, 5, '5'], [3, 5, 'R'], [2, 6, '4']], 2),

    // Dim triad (C-Eb-Gb)
    v('Dim Root (432)', 'dim', 'root_position', [4, 3, 2], [[4, 10, 'R'], [3, 8, 'b3'], [2, 7, 'b5']], 0),
    v('Dim Root (321)', 'dim', 'root_position', [3, 2, 1], [[3, 5, 'R'], [2, 4, 'b3'], [1, 2, 'b5']], 0),
    v('Dim 1st (432)', 'dim', 'root_position', [4, 3, 2], [[4, 1, 'b3'], [3, 11, 'b5'], [2, 1, 'R']], 1),

    // Aug triad (C-E-G#)
    v('Aug Root (432)', 'aug', 'root_position', [4, 3, 2], [[4, 10, 'R'], [3, 9, '3'], [2, 9, '#5']], 0),
    v('Aug Root (321)', 'aug', 'root_position', [3, 2, 1], [[3, 5, 'R'], [2, 5, '3'], [1, 4, '#5']], 0),
    v('Aug 1st (432)', 'aug', 'root_position', [4, 3, 2], [[4, 2, '3'], [3, 1, '#5'], [2, 1, 'R']], 1),

    // Power chord (C-G)
    v('Power 5th (65)', '5', 'root_position', [6, 5], [[6, 8, 'R'], [5, 10, '5']], 0),
    v('Power 5th (54)', '5', 'root_position', [5, 4], [[5, 3, 'R'], [4, 5, '5']], 0),
    v('Power 5th Oct (654)', '5', 'root_position', [6, 5, 4], [[6, 8, 'R'], [5, 10, '5'], [4, 10, 'R']], 0),

    // 6/9 (C-E-A-D → R,3,6,9 drop 5th)
    v('6/9 Root (4321)', '6/9', 'root_position', [4, 3, 2, 1], [[4, 10, 'R'], [3, 9, '3'], [2, 10, '6'], [1, 10, '9']], 0),
    v('6/9 Root (5432)', '6/9', 'root_position', [5, 4, 3, 2], [[5, 3, 'R'], [4, 2, '3'], [3, 2, '6'], [2, 3, '9']], 0),

    // ═══════════════════════════════════════════════════
    // MAJOR TRIAD VOICINGS (C = C-E-G)
    // ═══════════════════════════════════════════════════

    // Close position on strings 4-3-2
    // Root pos: C-E-G
    v('Maj Root (432)', 'maj', 'root_position', [4, 3, 2], [[4, 10, 'R'], [3, 9, '3'], [2, 8, '5']], 0),
    // 1st inv: E-G-C
    v('Maj 1st (432)', 'maj', 'root_position', [4, 3, 2], [[4, 2, '3'], [3, 0, '5'], [2, 1, 'R']], 1),
    // 2nd inv: G-C-E
    v('Maj 2nd (432)', 'maj', 'root_position', [4, 3, 2], [[4, 5, '5'], [3, 5, 'R'], [2, 5, '3']], 2),

    // Close position on strings 3-2-1
    // Root pos: C-E-G
    v('Maj Root (321)', 'maj', 'root_position', [3, 2, 1], [[3, 5, 'R'], [2, 5, '3'], [1, 3, '5']], 0),
    // 1st inv: E-G-C
    v('Maj 1st (321)', 'maj', 'root_position', [3, 2, 1], [[3, 9, '3'], [2, 8, '5'], [1, 8, 'R']], 1),
    // 2nd inv: G-C-E
    v('Maj 2nd (321)', 'maj', 'root_position', [3, 2, 1], [[3, 0, '5'], [2, 1, 'R'], [1, 0, '3']], 2),

    // ═══════════════════════════════════════════════════
    // MINOR TRIAD VOICINGS (Cm = C-Eb-G)
    // ═══════════════════════════════════════════════════

    // Close position on strings 4-3-2
    v('Min Root (432)', 'm', 'root_position', [4, 3, 2], [[4, 10, 'R'], [3, 8, 'b3'], [2, 8, '5']], 0),
    v('Min 1st (432)', 'm', 'root_position', [4, 3, 2], [[4, 1, 'b3'], [3, 0, '5'], [2, 1, 'R']], 1),
    v('Min 2nd (432)', 'm', 'root_position', [4, 3, 2], [[4, 5, '5'], [3, 5, 'R'], [2, 4, 'b3']], 2),

    // ═══════════════════════════════════════════════════
    // QUARTAL VOICINGS (Beato pp. 215-234)
    // Stacked perfect 4ths — modern jazz sound
    // ═══════════════════════════════════════════════════

    // 3-note quartal stacks on strings 4-3-2
    v('Quartal Stack (432)', 'm7', 'quartal', [4, 3, 2], [[4, 10, 'R'], [3, 10, '4'], [2, 11, 'b7']], 0),
    v('Quartal Stack 2nd (432)', '7sus4', 'quartal', [4, 3, 2], [[4, 5, '4'], [3, 3, 'b7'], [2, 1, 'R']], 0),

    // 3-note quartal stacks on strings 3-2-1
    v('Quartal Stack (321)', 'm7', 'quartal', [3, 2, 1], [[3, 5, 'R'], [2, 6, '4'], [1, 6, 'b7']], 0),
    v('Quartal Stack 2nd (321)', 'm7', 'quartal', [3, 2, 1], [[3, 10, '4'], [2, 11, 'b7'], [1, 11, 'b3']], 0),

    // 4-note quartal voicings on strings 4-3-2-1
    v('Quartal 4-note (4321)', 'm11', 'quartal', [4, 3, 2, 1], [[4, 10, 'R'], [3, 10, '4'], [2, 11, 'b7'], [1, 11, 'b3']], 0),

    // 4-note quartal voicings on strings 5-4-3-2 (So What voicing)
    v('So What Voicing (5432)', 'm7', 'quartal', [5, 4, 3, 2], [[5, 3, 'R'], [4, 5, '4'], [3, 5, 'b7'], [2, 4, 'b3']], 0),

    // ═══════════════════════════════════════════════════
    // DROP-3 VOICINGS (Beato Chapter 2)
    // ═══════════════════════════════════════════════════

    // Maj7 Drop-3 on strings 6-4-3-2
    // Root pos: C-G-B-E → str6=C, str4=G, str3=B, str2=E
    v('Maj7 Drop-3 Root (6432)', 'maj7', 'drop3', [6, 4, 3, 2], [[6, 8, 'R'], [4, 5, '5'], [3, 4, '7'], [2, 5, '3']], 0),
    // 1st inv: E-B-C-G
    v('Maj7 Drop-3 1st (6432)', 'maj7', 'drop3', [6, 4, 3, 2], [[6, 0, '3'], [4, 9, '7'], [3, 5, 'R'], [2, 8, '5']], 1),
    // 2nd inv: G-C-E-B
    v('Maj7 Drop-3 2nd (6432)', 'maj7', 'drop3', [6, 4, 3, 2], [[6, 3, '5'], [4, 10, 'R'], [3, 9, '3'], [2, 12, '7']], 2),

    // m7 Drop-3 on strings 6-4-3-2
    v('m7 Drop-3 Root (6432)', 'm7', 'drop3', [6, 4, 3, 2], [[6, 8, 'R'], [4, 5, '5'], [3, 3, 'b7'], [2, 4, 'b3']], 0),
    v('m7 Drop-3 1st (6432)', 'm7', 'drop3', [6, 4, 3, 2], [[6, 11, 'b3'], [4, 8, 'b7'], [3, 5, 'R'], [2, 8, '5']], 1),

    // Dom7 Drop-3 on strings 6-4-3-2
    v('7 Drop-3 Root (6432)', '7', 'drop3', [6, 4, 3, 2], [[6, 8, 'R'], [4, 5, '5'], [3, 3, 'b7'], [2, 5, '3']], 0),
    v('7 Drop-3 1st (6432)', '7', 'drop3', [6, 4, 3, 2], [[6, 0, '3'], [4, 8, 'b7'], [3, 5, 'R'], [2, 8, '5']], 1),

    // Drop-3 on strings 5-3-2-1
    v('Maj7 Drop-3 Root (5321)', 'maj7', 'drop3', [5, 3, 2, 1], [[5, 3, 'R'], [3, 4, '7'], [2, 5, '3'], [1, 3, '5']], 0),
    v('m7 Drop-3 Root (5321)', 'm7', 'drop3', [5, 3, 2, 1], [[5, 3, 'R'], [3, 3, 'b7'], [2, 4, 'b3'], [1, 3, '5']], 0),
    v('7 Drop-3 Root (5321)', '7', 'drop3', [5, 3, 2, 1], [[5, 3, 'R'], [3, 3, 'b7'], [2, 5, '3'], [1, 3, '5']], 0),
];

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get all voicing shapes for a given chord type.
 */
export function getVoicingShapes(chordSymbol: string): GuitarVoicing[] {
    const normalized = chordSymbol.toLowerCase();
    return VOICING_SHAPES.filter(v => v.chordType.toLowerCase() === normalized);
}

/**
 * Get voicings filtered by voicing type (drop2, shell, etc.)
 */
export function getVoicingsByType(chordSymbol: string, type: VoicingType): GuitarVoicing[] {
    return getVoicingShapes(chordSymbol).filter(v => v.voicingType === type);
}

/**
 * Get voicings on a specific string set.
 */
export function getVoicingsOnStrings(chordSymbol: string, strings: number[]): GuitarVoicing[] {
    const strKey = strings.join(',');
    return getVoicingShapes(chordSymbol).filter(v => v.stringSet.join(',') === strKey);
}

/**
 * Resolve a voicing shape to actual fret positions for a given root note.
 *
 * Since all reference frets are defined for C root, transposing is simply
 * adding the root's pitch class value to each fret. This works because
 * guitar fret patterns are transposition-invariant.
 */
export function resolveVoicing(voicing: GuitarVoicing, root: string): FretPosition[] {
    const rootPC = pitchClass(root);
    const transpose = rootPC;

    // For each finger, compute all valid fret options (original + octave down)
    const fretOptions: number[][] = voicing.shape.map(finger => {
        const raw = finger.referenceFret + transpose;
        const options: number[] = [];
        // Try the raw position and shifted down by 12
        for (const f of [raw, raw - 12, raw + 12]) {
            const clamped = f > 22 ? f - 12 : f < 0 ? f + 12 : f;
            if (clamped >= 0 && clamped <= 22) options.push(clamped);
        }
        // Deduplicate
        return [...new Set(options)];
    });

    // Find the best combination: all notes in range, smallest span, lowest position
    let bestFrets: number[] | null = null;
    let bestScore = Infinity; // lower = better (span * 10 + avg)

    // For voicings with 3-4 notes, brute-force all combinations
    function search(idx: number, current: number[]) {
        if (idx === fretOptions.length) {
            const span = Math.max(...current) - Math.min(...current);
            if (span > 5) return; // unplayable
            const avg = current.reduce((a, b) => a + b, 0) / current.length;
            const score = span * 10 + avg; // prefer small span, then low position
            if (score < bestScore) {
                bestScore = score;
                bestFrets = [...current];
            }
            return;
        }
        for (const fret of fretOptions[idx]) {
            current.push(fret);
            search(idx + 1, current);
            current.pop();
        }
    }

    search(0, []);

    if (!bestFrets) return [];

    return voicing.shape.map((finger, i) => {
        const fret = bestFrets![i];
        const pos = getNoteAtPosition(finger.string, fret);
        return {
            ...pos,
            interval: finger.intervalLabel,
            isRoot: finger.intervalLabel === 'R',
            color: finger.intervalLabel === 'R' ? '#d4a44a' : undefined,
        };
    });
}

/**
 * Get all resolved voicings for a chord in a given key,
 * optionally filtered and sorted by proximity to a target fret.
 */
export function getVoicingsForChord(
    root: string,
    chordSymbol: string,
    options?: {
        nearFret?: number;
        voicingType?: VoicingType;
        stringSet?: number[];
        maxFret?: number;
    }
): { voicing: GuitarVoicing; positions: FretPosition[] }[] {
    let shapes = getVoicingShapes(chordSymbol);

    if (options?.voicingType) {
        shapes = shapes.filter(s => s.voicingType === options.voicingType);
    }
    if (options?.stringSet) {
        const strKey = options.stringSet.join(',');
        shapes = shapes.filter(s => s.stringSet.join(',') === strKey);
    }

    const results: { voicing: GuitarVoicing; positions: FretPosition[] }[] = [];

    for (const shape of shapes) {
        const positions = resolveVoicing(shape, root);
        if (positions.length === 0) continue;
        if (options?.maxFret && positions.some(p => p.fret > options.maxFret!)) continue;

        // Check for playable span
        const frets = positions.map(p => p.fret);
        const span = Math.max(...frets) - Math.min(...frets);
        if (span > 6) continue; // Skip unplayable voicings

        results.push({ voicing: shape, positions });
    }

    if (options?.nearFret !== undefined) {
        const target = options.nearFret;
        results.sort((a, b) => {
            const avgA = a.positions.reduce((sum, p) => sum + p.fret, 0) / a.positions.length;
            const avgB = b.positions.reduce((sum, p) => sum + p.fret, 0) / b.positions.length;
            return Math.abs(avgA - target) - Math.abs(avgB - target);
        });
    }

    return results;
}

/**
 * Get the closest voicing of a target chord to a reference voicing.
 * Core of voice leading — minimal finger movement.
 */
export function getClosestVoicing(
    currentPositions: FretPosition[],
    targetRoot: string,
    targetChordSymbol: string
): { voicing: GuitarVoicing; positions: FretPosition[]; totalMovement: number } | null {
    const avgFret = currentPositions.reduce((sum, p) => sum + p.fret, 0) / currentPositions.length;
    const candidates = getVoicingsForChord(targetRoot, targetChordSymbol, { nearFret: avgFret });

    if (candidates.length === 0) return null;

    const scored = candidates.map(candidate => {
        let totalMovement = 0;
        for (const currentPos of currentPositions) {
            const sameStringPos = candidate.positions.find(p => p.string === currentPos.string);
            if (sameStringPos) {
                totalMovement += Math.abs(sameStringPos.fret - currentPos.fret);
            } else {
                totalMovement += 5;
            }
        }
        return { ...candidate, totalMovement };
    });

    scored.sort((a, b) => a.totalMovement - b.totalMovement);
    return scored[0];
}
