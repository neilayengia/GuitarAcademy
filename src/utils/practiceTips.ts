/**
 * practiceTips.ts — Berklee-level practice guidance per chord-scale situation
 *
 * Each tip targets a specific chord quality + scale combination and gives
 * actionable advice: what notes to target, what to avoid, melodic cells to try.
 */

export interface PracticeTip {
    title: string;
    tip: string;
    targetNotes: string;  // e.g. "Target: 9 (E), b7 (C)"
    avoidNotes?: string;  // e.g. "Avoid: 4 (F) on strong beats"
    melodicCell?: string; // e.g. "Try: D → E → F → A"
}

// Key: "quality:scale" or just "scale"
const TIPS: Record<string, PracticeTip[]> = {
    // ── Major Modes ──
    'ionian': [{
        title: 'Major Sound — Resolve & Rest',
        tip: 'Ionian is the resolution point. Play with confidence. Let melodies breathe — long tones on R and 3 create stability. The 7th (B) wants to resolve up to the root.',
        targetNotes: 'Target: R, 3, 5, 7 on strong beats',
        avoidNotes: 'Careful: 4 (F) clashes with the 3 — use as passing tone only',
        melodicCell: 'Try: C → E → G → B → C (arpeggiate up to the octave)',
    }],
    'dorian': [{
        title: 'The Jazz Minor — Natural 6th is Key',
        tip: 'Dorian\'s characteristic note is the natural 6th — it\'s what separates it from Aeolian. Emphasize the 6th on strong beats to bring out the Dorian color. This is the sound of So What, Maiden Voyage, and most m7 comping.',
        targetNotes: 'Target: 9 (E), 6 (A) — these define the Dorian sound',
        avoidNotes: 'No avoid notes — Dorian is very consonant over m7',
        melodicCell: 'Try: D → E → F → A (1 → 9 → b3 → 6) — classic Dorian cell',
    }],
    'phrygian': [{
        title: 'Dark & Spanish — b2 is Everything',
        tip: 'The b2 (one semitone above root) gives Phrygian its dark, flamenco quality. Use it as an approach tone from below to the root. Works great over sus(b9) or m7 in dark contexts.',
        targetNotes: 'Target: R, b3, b7. Use b2 as approach tone',
        melodicCell: 'Try: E → F → E → D → E (hover around the b2→R resolution)',
    }],
    'lydian': [{
        title: 'Bright & Floating — #4 Opens the Sound',
        tip: 'Lydian\'s #4 eliminates the "avoid note" problem of Ionian. Every note is consonant over maj7. The #4 creates a dreamy, floating quality — Pat Metheny territory. Let it ring.',
        targetNotes: 'Target: #4 (F#), 7 (B) — the bright notes',
        avoidNotes: 'No avoid notes — Lydian is fully consonant',
        melodicCell: 'Try: C → D → E → F# (ascending through the #4 is magical)',
    }],
    'mixolydian': [{
        title: 'Dominant Blues-Rock — b7 Drives the Sound',
        tip: 'Mixolydian is a major scale with a b7 — the dominant sound. It sits between major and blues. The b7 creates forward motion — it wants to resolve down to the 3rd of the next chord (V→I resolution).',
        targetNotes: 'Target: R, 3, b7 — the dominant chord tones',
        avoidNotes: 'Careful: 4 clashes with 3 on strong beats',
        melodicCell: 'Try: G → A → B → D → F → E (encircle the 3rd from above)',
    }],
    'aeolian': [{
        title: 'Natural Minor — Melancholy & Depth',
        tip: 'Aeolian is the standard minor sound. The b6 is what makes it darker than Dorian. Use pentatonic shapes as a foundation, then add the 2 and b6 for color.',
        targetNotes: 'Target: R, b3, 5, b7',
        melodicCell: 'Try: A → C → D → E → G (minor pentatonic core)',
    }],
    'locrian': [{
        title: 'Half-Diminished — Unstable by Nature',
        tip: 'Locrian over m7b5 is inherently unstable — that\'s the point. It leads somewhere. Target the b5 and b3 on strong beats. Resolve to the V chord. Don\'t try to "stay" in Locrian — pass through it.',
        targetNotes: 'Target: b3, b5, b7 — outline the m7b5 arpeggio',
        melodicCell: 'Try: D → F → Ab → C → B (m7b5 arp → resolve to 3rd of G7)',
    }],

    // ── Melodic Minor Modes ──
    'lydian_dominant': [{
        title: 'Lydian Dominant — The Tritone Sub Scale',
        tip: 'Lydian Dominant (#4 + b7) is the go-to scale for tritone substitutions. It works over any dominant chord that resolves down a half step. The #4 is what makes it Lydian — bright tension that resolves smoothly.',
        targetNotes: 'Target: 3, #4 (enharmonic b5), b7',
        avoidNotes: 'No avoid notes — fully consonant over dom7',
        melodicCell: 'Try: Bb → D → E → Ab (3 → #4 → b7 over a Bb7 tritone sub)',
    }],
    'altered': [{
        title: 'Altered Dominant — Maximum Tension',
        tip: 'The altered scale (7th mode of melodic minor) has EVERY altered tension: b9, #9, b5, #5. It\'s maximum dissonance that resolves beautifully to a major chord. Use it on V7 chords that resolve to I.',
        targetNotes: 'Target: 3 and b7 (guide tones), then add b9, #9, #5',
        melodicCell: 'Try: G → B → Db → D# → F → Ab (3 → b9 → #9 → b7 → b5/b13)',
    }],
    'melodic_minor': [{
        title: 'Melodic Minor — Jazz Minor',
        tip: 'Melodic minor (natural 6 + natural 7 over minor) is the parent scale for Altered, Lydian Dominant, and more. Over a minMaj7 chord, it\'s the definitive sound. The major 7th over minor creates beautiful tension.',
        targetNotes: 'Target: R, b3, 7 — the minMaj7 arpeggio',
        melodicCell: 'Try: C → Eb → G → B (minMaj7 arpeggio)',
    }],

    // ── Pentatonic & Blues ──
    'minor_pentatonic': [{
        title: 'Minor Pentatonic — The Foundation',
        tip: 'Five notes, zero avoid notes, infinite possibilities. The minor pentatonic is the most important scale in guitar. Master it in all 5 positions before anything else. Add the b5 (blue note) for blues flavor.',
        targetNotes: 'All notes are strong: R, b3, 4, 5, b7',
        melodicCell: 'Try: A → C → D → E → G → A (the box pattern, but SING it)',
    }],
    'major_pentatonic': [{
        title: 'Major Pentatonic — Country & Sweet',
        tip: 'Same shapes as minor pentatonic, different root. Bright, sweet, works over any major chord. Mix major and minor pentatonic over dominant chords for blues/country hybrid licks.',
        targetNotes: 'All notes consonant: R, 2, 3, 5, 6',
        melodicCell: 'Try: C → D → E → G → A → C (bright, major sound)',
    }],
    'minor_blues': [{
        title: 'Blues Scale — The b5 Changes Everything',
        tip: 'Minor pentatonic + the b5 (blue note). That one extra note between 4 and 5 is the entire blues vocabulary. Bend into it, slide through it, never land on it — it\'s a passing tone that creates soul.',
        targetNotes: 'Target: R, b3, 5. The b5 is a passing tone — don\'t land on it',
        melodicCell: 'Try: A → C → D → Eb → E → G (walk through the blue note)',
    }],

    // ── Symmetric ──
    'diminished_whole_half': [{
        title: 'Diminished W-H — Over Dim7 Chords',
        tip: 'The whole-half diminished scale is symmetric — the same pattern repeats every minor 3rd. This means any lick you play works in 4 keys simultaneously. Use it over dim7 chords and dominant 7b9 chords.',
        targetNotes: 'Target: R, b3, b5, bb7 (dim7 arpeggio)',
        melodicCell: 'Try: C → D → Eb → F# → G → A → Bb → C (the symmetry is the sound)',
    }],
    'whole_tone': [{
        title: 'Whole Tone — Dreamy & Unresolved',
        tip: 'All whole steps — no semitones means no tension/resolution, just floating. Use over aug chords or dom7#5. Debussy made this famous. On guitar, the symmetric fingering makes it easy to play fast.',
        targetNotes: 'All notes equally weighted — no avoid notes',
        melodicCell: 'Try: C → D → E → F# → G# → A# → C (pure whole steps)',
    }],

    // ── Harmonic Minor ──
    'harmonic_minor': [{
        title: 'Harmonic Minor — Classical Meets Jazz',
        tip: 'The raised 7th over natural minor creates the augmented 2nd interval (b6 to 7) — that "exotic" sound. Essential for minor ii-V-i resolution. The V chord in minor keys comes from harmonic minor.',
        targetNotes: 'Target: R, b3, 5, 7 — the minMaj7 sound',
        melodicCell: 'Try: C → D → Eb → G → Ab → B → C (hear the aug 2nd between Ab and B)',
    }],
};

/**
 * Get practice tips for a given scale name.
 * Returns array of tips (usually 1, could be more for common scales).
 */
export function getTipsForScale(scaleName: string): PracticeTip[] {
    return TIPS[scaleName] || [{
        title: 'Explore This Sound',
        tip: 'Play through the scale slowly, listening to each interval. Find the notes that sound most characteristic — those are the ones that define this scale\'s unique color.',
        targetNotes: 'Target: R and the note that sounds most "different" from major',
    }];
}

/**
 * Get a quick tip string for a chord label (e.g. "Dm7") + scale combination.
 */
export function getQuickTip(scale: string): string {
    const tips = TIPS[scale];
    if (!tips || tips.length === 0) return '';
    return tips[0].melodicCell || tips[0].targetNotes;
}
