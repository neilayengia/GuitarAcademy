/**
 * Mapping utility for the uploaded chord audio files in /public/audio/chords/
 * 
 * Roots available: A, Ab, B, Bb, C, D, Db, E, Eb, F, Fsharp, G
 * Qualities available: Maj7, min7, 7, min7b5, 7b913, 7b9b13
 */

export type ChordQuality = 'Maj7' | 'min7' | '7' | 'min7b5' | '7b913' | '7b9b13';

// Normalizes a user-friendly root (like C# or Gb) to the exact filename prefix
export function getAudioRootPrefix(root: string): string {
    // Normalize flats/sharps aliases strictly based on available files
    const map: Record<string, string> = {
        'C#': 'Db',
        'Db': 'Db',
        'D#': 'Eb',
        'Eb': 'Eb',
        'F#': 'Fsharp',
        'Gb': 'Fsharp',
        'G#': 'Ab',
        'Ab': 'Ab',
        'A#': 'Bb',
        'Bb': 'Bb',
    };

    return map[root] || root;
}

// Maps our custom chord qualities to the appropriate scales/modes from scales.ts
// Returns an array of valid options, where the first element is the safest/default choice.
export function getScaleOptionsForQuality(quality: ChordQuality): string[] {
    switch (quality) {
        case 'Maj7':
            return ['ionian', 'lydian', 'major_pentatonic'];
        case 'min7':
            return ['dorian', 'aeolian', 'minor_pentatonic', 'blues'];
        case '7':
            return ['mixolydian', 'lydian_dominant', 'mixolydian_b6', 'blues'];
        case 'min7b5':
            return ['locrian', 'locrian_nat2'];
        case '7b913':
            return ['diminished_hw'];
        case '7b9b13':
            return ['altered'];
        default:
            return ['ionian'];
    }
}

// Full path resolver
export function getChordAudioPath(root: string, quality: ChordQuality): string {
    const fileRoot = getAudioRootPrefix(root);
    return `/audio/chords/${fileRoot}${quality}.mp3`;
}
