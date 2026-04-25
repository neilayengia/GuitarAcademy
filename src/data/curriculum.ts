/**
 * curriculum.ts — Structured lesson content for Rubato Guitar Academy
 *
 * Module 1: Foundations of Harmony
 * Based on The Beato Book 2.0, Chapters 1-2
 *
 * Each lesson is a data object — NOT a React component — so content
 * is separable from rendering and can be serialized, searched, or
 * transformed independently.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type StepType = 'text' | 'fretboard' | 'exercise' | 'audio' | 'quiz';

export interface FretboardConfig {
    root: string;
    scale?: string;
    chord?: string;
    showIntervals: boolean;
    highlightStrings?: number[];
}

export interface QuizOption {
    label: string;
    correct: boolean;
}

export interface ExerciseConfig {
    type: 'interval_ear' | 'chord_explorer' | 'scale_overlay' | 'voicing_browser' | 'ii_v_i_trainer' | 'voice_leading_explorer';
    [key: string]: any;
}

export interface LessonStep {
    type: StepType;
    title?: string;
    content?: string;
    fretboardConfig?: FretboardConfig;
    exerciseConfig?: ExerciseConfig;
    quizOptions?: QuizOption[];
    audioConfig?: { chordSymbols?: string[]; root?: string; scale?: string };
}

export interface Lesson {
    id: string;
    moduleId: number;
    lessonIndex: number;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    estimatedMinutes: number;
    beatoReference: string;
    steps: LessonStep[];
    completionCriteria: string;
}

export interface Module {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    lessons: Lesson[];
}

// ── Module 1: Foundations of Harmony ─────────────────────────────────────────

const LESSON_1_INTERVALS: Lesson = {
    id: 'intervals-building-blocks',
    moduleId: 1,
    lessonIndex: 0,
    title: 'Intervals',
    subtitle: 'The Building Blocks',
    description: 'Master the 12 intervals — the DNA of all harmony and melody.',
    icon: '🎯',
    estimatedMinutes: 15,
    beatoReference: 'Beato Book 2.0 — Ch.1, Ex. 1–7',
    completionCriteria: 'Identify 5 intervals correctly by ear',
    steps: [
        {
            type: 'text',
            title: 'Why Intervals Matter',
            content: `Intervals are the **building blocks of all polyphonic music**. Every chord, every scale, every melody — they're all made of intervals.

An interval is simply the distance between two notes, measured in half steps. There are 12 intervals in the space of an octave:

| Symbol | Name | Half Steps |
|--------|------|-----------|
| P1 | Unison | 0 |
| m2 | Minor 2nd | 1 |
| M2 | Major 2nd | 2 |
| m3 | Minor 3rd | 3 |
| M3 | Major 3rd | 4 |
| P4 | Perfect 4th | 5 |
| A4/d5 | Tritone | 6 |
| P5 | Perfect 5th | 7 |
| m6 | Minor 6th | 8 |
| M6 | Major 6th | 9 |
| m7 | Minor 7th | 10 |
| M7 | Major 7th | 11 |

Commit these to memory — both **aurally** and **visually**. This is your foundation.`,
        },
        {
            type: 'text',
            title: 'Perfect vs. Imperfect',
            content: `Intervals fall into two families that behave differently:

**Perfect Intervals** — Unison, 4th, 5th, Octave
- When enlarged by a half step → *Augmented*
- When reduced by a half step → *Diminished*
- These intervals sound "pure" and "open"

**Imperfect Intervals** — 2nds, 3rds, 6ths, 7ths
- Major → enlarged by ½ step → *Augmented*
- Major → reduced by ½ step → *Minor*
- Minor → enlarged by ½ step → *Major*
- Minor → reduced by ½ step → *Diminished*

**The 3rds and 7ths are the most important intervals in harmony.** They define whether a chord is major, minor, or dominant. Jazz musicians call them *guide tones* — we'll come back to this in Lesson 4.`,
        },
        {
            type: 'fretboard',
            title: 'See It on the Fretboard',
            content: 'Here\'s every **Perfect 5th** from C across the fretboard. Click any note to hear it. Notice the consistent shape — this is one of the guitar\'s great advantages.',
            fretboardConfig: {
                root: 'C',
                scale: 'chromatic',
                showIntervals: true,
            },
        },
        {
            type: 'exercise',
            title: 'Ear Training: Name That Interval',
            content: 'Two notes will play. Identify the interval between them. The key to mastering harmony is hearing these relationships *instantly*.',
            exerciseConfig: {
                type: 'interval_ear',
                rounds: 5,
                difficulty: 'beginner', // P4, P5, M3, m3, P8 only
            },
        },
        {
            type: 'text',
            title: 'Enharmonic Equivalents',
            content: `Some intervals contain the same number of half steps but have different names. An **Augmented 2nd** and a **Minor 3rd** are both 3 half steps — they sound identical, but they're spelled differently depending on context.

This matters for two reasons:
1. **Correct spelling** tells you the harmonic function (is that note the ♯9 or the ♭3?)
2. **Reading music** requires you to know that C–D♯ is an Aug 2nd, while C–E♭ is a min 3rd

For now, train your ears. The theory will click once the sounds are solid.`,
        },
        {
            type: 'quiz',
            title: 'Check Your Understanding',
            content: 'How many half steps is a Perfect 5th?',
            quizOptions: [
                { label: '5 half steps', correct: false },
                { label: '6 half steps', correct: false },
                { label: '7 half steps', correct: true },
                { label: '8 half steps', correct: false },
            ],
        },
    ],
};

const LESSON_2_DIATONIC_CHORDS: Lesson = {
    id: 'diatonic-seventh-chords',
    moduleId: 1,
    lessonIndex: 1,
    title: 'Diatonic Seventh Chords',
    subtitle: 'Harmony in Context',
    description: 'Build and hear every seventh chord from the major, melodic minor, and harmonic minor scales.',
    icon: '🏗️',
    estimatedMinutes: 18,
    beatoReference: 'Beato Book 2.0 — Ch.1, Ex. 8–19',
    completionCriteria: 'Explore diatonic chords in 3 different keys',
    steps: [
        {
            type: 'text',
            title: 'Stacking Thirds',
            content: `Western harmony is built on **tertian harmony** — chords constructed by stacking intervals of a third.

**Two thirds stacked = a Triad** (3 notes)
**Three thirds stacked = a Seventh Chord** (4 notes)

When these chords originate from a single key, they're called **diatonic chords**. A seven-note scale yields seven diatonic chords.

The Roman Numeral system labels each chord by its position:
- **Uppercase** = Major quality (I, IV, V)
- **Lowercase** = Minor quality (ii, iii, vi)
- **° symbol** = Diminished (vii°)`,
        },
        {
            type: 'exercise',
            title: 'Explore Diatonic Chords',
            content: 'Select a key and hear all 7 diatonic seventh chords. Notice how each chord has a distinct quality and function. Try at least **3 different keys**.',
            exerciseConfig: {
                type: 'chord_explorer',
                mode: 'diatonic',
                requiredKeys: 3,
            },
        },
        {
            type: 'text',
            title: 'The Four Parent Scales',
            content: `Every diatonic chord system comes from a **parent scale**. The four most important are:

**Major Scale** (Ionian)
I maj7 — ii m7 — iii m7 — IV maj7 — V7 — vi m7 — vii m7♭5

**Natural Minor** (Aeolian)
i m7 — ii m7♭5 — ♭III maj7 — iv m7 — v m7 — ♭VI maj7 — ♭VII7

**Melodic Minor**
i m(maj7) — ii m7 — ♭III+ maj7 — IV7 — V7 — vi m7♭5 — vii m7♭5

**Harmonic Minor**
i m(maj7) — ii m7♭5 — ♭III+ maj7 — iv m7 — V7 — ♭VI maj7 — vii°7

Each generates a unique set of chord qualities. The **melodic minor** is especially important in jazz — it produces the altered dominant scale (mode VII) used over every V7 chord.`,
        },
        {
            type: 'text',
            title: 'Chord Quality Formulas',
            content: `Memorize these formulas — they're your chord DNA:

| Quality | Formula | Sound |
|---------|---------|-------|
| **Major 7** | 1 – 3 – 5 – 7 | Bright, stable |
| **Minor 7** | 1 – ♭3 – 5 – ♭7 | Warm, melancholic |
| **Dominant 7** | 1 – 3 – 5 – ♭7 | Tension, wants to resolve |
| **Minor 7♭5** | 1 – ♭3 – ♭5 – ♭7 | Dark, unstable |
| **Diminished 7** | 1 – ♭3 – ♭5 – ♭♭7 | Symmetric, mysterious |
| **Minor(maj7)** | 1 – ♭3 – 5 – 7 | Bittersweet |
| **Augmented maj7** | 1 – 3 – ♯5 – 7 | Dreamy, unresolved |

The **3rd** tells you major or minor. The **7th** tells you the chord's tension level.`,
        },
        {
            type: 'quiz',
            title: 'Check Your Understanding',
            content: 'In the key of G major, what is the iii chord?',
            quizOptions: [
                { label: 'Bm7', correct: true },
                { label: 'Bbmaj7', correct: false },
                { label: 'B7', correct: false },
                { label: 'Bdim7', correct: false },
            ],
        },
        {
            type: 'quiz',
            title: 'One More',
            content: 'What makes a Dominant 7th chord want to resolve?',
            quizOptions: [
                { label: 'The perfect 5th', correct: false },
                { label: 'The tritone between its 3rd and ♭7th', correct: true },
                { label: 'The root note', correct: false },
                { label: 'The minor 3rd', correct: false },
            ],
        },
    ],
};

const LESSON_3_CHORD_SCALE: Lesson = {
    id: 'chord-scale-theory',
    moduleId: 1,
    lessonIndex: 2,
    title: 'Chord-Scale Theory',
    subtitle: 'Color & Tension',
    description: 'Learn which scales work over which chords — and which notes to avoid.',
    icon: '🎨',
    estimatedMinutes: 20,
    beatoReference: 'Beato Book 2.0 — Ch.1, Chord Families & Modes',
    completionCriteria: 'Explore chord-scale overlays for 3 different chord types',
    steps: [
        {
            type: 'text',
            title: 'Every Chord Implies a Scale',
            content: `This is one of the most powerful ideas in modern harmony:

**Every chord implies one or more scales that sound good over it.**

The scale you choose determines the *color* — the available tensions and extensions. This is called **chord-scale theory**, and it's how jazz musicians make real-time decisions about what notes to play.

The chord tones (R, 3, 5, 7) are always "safe." The remaining scale tones are either:
- **Tensions** (9, 11, 13) — add color and interest
- **Avoid notes** — create unpleasant dissonance against the chord`,
        },
        {
            type: 'text',
            title: 'Chord Families',
            content: `Chords are grouped into families based on their quality. Each family has specific scales that work:

**Major 7 Family**
→ Ionian (natural), Lydian (♯4 = modern/bright)

**Minor 7 Family**
→ Dorian (♮6 = most common), Aeolian (♭6), Phrygian (♭2 = dark)

**Dominant 7 Family** (the most options)
→ Mixolydian (unaltered), Lydian Dominant (♯4), Altered (all tensions ♯/♭), Diminished H-W

**Minor 7♭5 Family**
→ Locrian (natural), Locrian ♮2

The dominant family has the most scale choices because the V7 chord is the moment of maximum harmonic tension — and you control *how much* tension with your scale choice.`,
        },
        {
            type: 'exercise',
            title: 'Chord-Scale Overlay Explorer',
            content: 'Select a chord type and see which scales are available. **Watch the fretboard** — root notes glow gold, chord tones are warm white, scale tones are blue, and avoid notes are dimmed. Toggle between scales to feel the color change.',
            exerciseConfig: {
                type: 'scale_overlay',
                showAvoidNotes: true,
            },
        },
        {
            type: 'text',
            title: 'Avoid Notes — What They Are',
            content: `An **avoid note** is a scale degree that sits a half step above a chord tone. This creates a harsh dissonance that "clouds" the chord's identity.

Common avoid notes:
- **4th over Major 7** (Ionian) — the F over Cmaj7 clashes with the E (3rd)
- **♭6 over Minor 7** (Aeolian) — the A♭ over Cm7 darkens the sound
- **4th over Dominant 7** (Mixolydian) — the F over G7 pulls against the B (3rd)

**Important:** Avoid notes aren't "wrong" — they just need to be treated carefully. They're passing tones, not resting points. Land on a chord tone or tension instead.

The Lydian mode is popular precisely because it has **no avoid notes** — the ♯4 sits a whole step above the 3rd, so everything resonates freely.`,
        },
        {
            type: 'fretboard',
            title: 'See the Difference: Ionian vs. Lydian',
            content: 'Compare C Ionian (with its avoid note on the 4th) to C Lydian (no avoid notes). Notice how Lydian feels more "open" — every note belongs.',
            fretboardConfig: {
                root: 'C',
                scale: 'ionian',
                showIntervals: true,
            },
        },
        {
            type: 'quiz',
            title: 'Quick Check',
            content: 'Why is the 4th degree an "avoid note" over a major 7 chord?',
            quizOptions: [
                { label: 'It\'s a tritone from the root', correct: false },
                { label: 'It\'s a half step above the 3rd (a chord tone)', correct: true },
                { label: 'It doesn\'t belong to the scale', correct: false },
                { label: 'It creates a parallel 5th', correct: false },
            ],
        },
    ],
};

const LESSON_4_II_V_I: Lesson = {
    id: 'ii-v-i-progression',
    moduleId: 1,
    lessonIndex: 3,
    title: 'The ii-V-I',
    subtitle: 'The Most Important Progression',
    description: 'Master the backbone of jazz harmony — and learn to hear harmonic function.',
    icon: '🔄',
    estimatedMinutes: 20,
    beatoReference: 'Beato Book 2.0 — Ch.1, Ex. 26–37; Ch.4, Ex. 163–167',
    completionCriteria: 'Practice ii-V-I voice leading in 4 keys',
    steps: [
        {
            type: 'text',
            title: 'The DNA of Jazz',
            content: `If you learn one progression, make it this one:

**ii – V – I**

In C major: **Dm7 → G7 → Cmaj7**

This three-chord sequence contains all three harmonic functions:
- **Pre-dominant** (ii) — creates momentum
- **Dominant** (V) — maximum tension
- **Tonic** (I) — resolution, home

The ii-V-I appears in virtually every jazz standard, pop song, and R&B track. In some tunes, it's the *entire* harmonic structure. John Coltrane's "Giant Steps" is a sequence of ii-V-I's in three keys. "Autumn Leaves" is almost entirely ii-V-I's alternating between major and minor.`,
        },
        {
            type: 'text',
            title: 'Guide Tone Voice Leading',
            content: `The magic of the ii-V-I is in the **voice leading** — how individual notes move between chords.

Watch the guide tones (3rds and 7ths):

| Chord | 3rd | 7th |
|-------|-----|-----|
| **Dm7** | F | C |
| **G7** | B | F |
| **Cmaj7** | E | B |

The **7th of ii** (C) becomes the **3rd of V** by moving DOWN a half step (C → B).
The **3rd of ii** (F) becomes the **7th of V** (F stays put!).
Then **B resolves up** to C or E, and **F resolves down** to E.

This smooth, stepwise motion is why the progression sounds so satisfying. The notes practically *lead themselves* to the next chord.`,
        },
        {
            type: 'exercise',
            title: 'ii-V-I in All 12 Keys',
            content: 'Select a key and hear the ii-V-I with voice leading visualized on the fretboard. Watch how the guide tones move by step. Practice in at least **4 keys**.',
            exerciseConfig: {
                type: 'ii_v_i_trainer',
                requiredKeys: 4,
            },
        },
        {
            type: 'text',
            title: 'Minor ii-V-i',
            content: `The minor version uses chords from harmonic minor:

**ii m7♭5 → V7alt → i m7**

In C minor: **Dm7♭5 → G7alt → Cm7**

Key differences:
- The **ii chord** is half-diminished (m7♭5) instead of m7
- The **V chord** is altered — the tensions are ♭9, ♯9, ♯11, ♭13
- The resolution goes to a **minor** tonic

The altered dominant is the darkest, most tension-filled sound in tonal harmony. It uses the 7th mode of melodic minor (A♭ melodic minor over G7alt).

Learn to hear the difference between a major ii-V-I (bright, resolved) and a minor ii-V-i (dark, bittersweet). This distinction defines the emotional palette of jazz.`,
        },
        {
            type: 'audio',
            title: 'Hear the Difference',
            content: 'Listen to these two progressions back to back. Major ii-V-I followed by minor ii-V-i, both in C.',
            audioConfig: {
                chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Dm7b5', 'G7alt', 'Cm7'],
            },
        },
        {
            type: 'quiz',
            title: 'Quick Check',
            content: 'In a ii-V-I, what happens to the 7th of the ii chord?',
            quizOptions: [
                { label: 'It jumps up a 4th to become the root of V', correct: false },
                { label: 'It moves down a half step to become the 3rd of V', correct: true },
                { label: 'It stays the same', correct: false },
                { label: 'It drops an octave', correct: false },
            ],
        },
    ],
};

const LESSON_5_DROP2: Lesson = {
    id: 'drop-2-voicings',
    moduleId: 1,
    lessonIndex: 4,
    title: 'Drop-2 Voicings',
    subtitle: 'The Jazz Guitar Sound',
    description: 'Learn the voicing technique that defines jazz guitar — and how to connect them with voice leading.',
    icon: '🎸',
    estimatedMinutes: 20,
    beatoReference: 'Beato Book 2.0 — Ch.2, Drop 2 (all qualities)',
    completionCriteria: 'Explore Drop-2 voicings for 3 chord qualities',
    steps: [
        {
            type: 'text',
            title: 'What is Drop-2?',
            content: `If there's one voicing technique every jazz guitarist must know, it's **Drop-2**.

Here's how it works:
1. Start with a **close-position** chord (all notes within one octave)
2. Take the **2nd voice from the top** and drop it down an octave

Example with Cmaj7 in close position: **B – E – G – C** (top to bottom)
→ Drop the 2nd from top (E) down an octave
→ Result: **B – G – C – E** (now spans more than an octave)

Why does this matter for guitar?
- Close-position 4-note chords require impossible stretches on guitar
- Drop-2 creates voicings that fit comfortably in a **4-fret span**
- Every inversion gives you a different **top note** (melody note)
- You get 4 inversions × 3 string sets = **12 shapes per chord quality**

Drop-2 voicings are the bread and butter of Joe Pass, Wes Montgomery, Pat Metheny, and virtually every jazz guitarist since the 1950s.`,
        },
        {
            type: 'text',
            title: 'The Four Inversions',
            content: `Each Drop-2 voicing has 4 inversions, determined by which chord tone is in the bass:

| Inversion | Bass Note | Character |
|-----------|-----------|-----------|
| **Root position** | Root (1) | Grounded, stable |
| **1st inversion** | 3rd | Smooth, warm |
| **2nd inversion** | 5th | Open, neutral |
| **3rd inversion** | 7th | Colorful, leading |

Each inversion also places a different note on top — and the **top note is what the ear hears most clearly**. This is why you need all four inversions: they let you **control the melody** while comping.

The three common string sets on guitar:
- Strings **4-3-2-1** (most common, treble register)
- Strings **5-4-3-2** (mid register)
- Strings **6-5-4-3** (low register, Freddie Green territory)`,
        },
        {
            type: 'exercise',
            title: 'Voicing Browser',
            content: 'Browse Drop-2 voicings by chord quality and string set. Click any voicing to hear it and see it on the fretboard. Try at least **3 chord qualities** (e.g., maj7, m7, dom7).',
            exerciseConfig: {
                type: 'voicing_browser',
                voicingType: 'drop2',
                requiredQualities: 3,
            },
        },
        {
            type: 'text',
            title: 'Connecting Voicings Through a ii-V-I',
            content: `Now combine lessons 4 and 5: voice leading with Drop-2 shapes.

When moving from Dm7 to G7 to Cmaj7 using Drop-2 voicings on strings 4-3-2-1:

1. **Start with Dm7** — pick any inversion
2. **Move to G7** — find the inversion where the fingers move the least
3. **Resolve to Cmaj7** — again, minimal movement

The principle: **the best next voicing is the closest one.**

This is the "minimum motion" approach to jazz comping. Your hand barely moves, but the harmony changes completely. The audience hears smooth, professional voice leading — you feel an effortless 1-2 fret shift.

This is what separates a jazz guitarist from someone who just knows chord shapes.`,
        },
        {
            type: 'fretboard',
            title: 'See Voice Leading in Action',
            content: 'Here\'s a Cmaj7 Drop-2 voicing on strings 4-3-2-1. As you explore different inversions, notice how the top note changes while the chord quality stays the same.',
            fretboardConfig: {
                root: 'C',
                chord: 'maj7',
                showIntervals: true,
                highlightStrings: [1, 2, 3, 4],
            },
        },
        {
            type: 'quiz',
            title: 'Final Check',
            content: 'Why do jazz guitarists prefer Drop-2 voicings over close-position chords?',
            quizOptions: [
                { label: 'They\'re louder', correct: false },
                { label: 'They use fewer strings', correct: false },
                { label: 'They fit the guitar\'s tuning in a comfortable fret span', correct: true },
                { label: 'They only use open strings', correct: false },
            ],
        },
    ],
};

// ── Module Assembly ─────────────────────────────────────────────────────────

export const MODULE_1: Module = {
    id: 1,
    title: 'Foundations of Harmony',
    subtitle: 'Module 1',
    description: 'Build your harmonic vocabulary from intervals through jazz voicings.',
    lessons: [
        LESSON_1_INTERVALS,
        LESSON_2_DIATONIC_CHORDS,
        LESSON_3_CHORD_SCALE,
        LESSON_4_II_V_I,
        LESSON_5_DROP2,
    ],
};

export const MODULE_2: Module = {
    id: 2,
    title: 'Advanced Reharmonization',
    subtitle: 'Module 2 (Virtuoso Pro)',
    description: 'Transform basic chord progressions using tritone substitutions, secondary dominants, and diminished passing chords.',
    lessons: [
        {
            id: 'tritone-sub',
            moduleId: 2,
            lessonIndex: 0,
            title: 'The Tritone Substitution',
            subtitle: 'Altering the V7',
            description: 'Learn how to substitute dominant chords for chromatic bass motion.',
            icon: '🔄',
            estimatedMinutes: 25,
            beatoReference: 'Beato Book 2.0 — Tritone Subs',
            completionCriteria: 'Apply a tritone sub to a ii-V-I in three keys',
            steps: [
                {
                    type: 'text',
                    title: 'What is a Tritone Sub?',
                    content: `A **tritone substitution** is one of the most powerful reharmonization tools in jazz. It replaces a dominant 7th chord with another dominant 7th chord whose root is a **tritone (6 half steps)** away.

Example: Replace **G7** with **Db7**

Why does this work? Because both chords share the same **guide tones** (3rd and 7th), just swapped:

| Chord | 3rd | 7th |
|-------|-----|-----|
| **G7** | B | F |
| **Db7** | F | Cb (=B) |

The B and F are the same two notes — they're just functioning differently. This means the voice leading into the resolution chord (Cmaj7) is equally smooth from either dominant chord.

The bonus: the bass line becomes **chromatic**. Instead of G → C (a 4th jump), you get Db → C (a half step slide). This chromatic bass motion is the hallmark of sophisticated jazz harmony.`,
                },
                {
                    type: 'text',
                    title: 'The Tritone Relationship',
                    content: `Every dominant 7th chord has exactly one tritone substitute. They come in pairs:

| Original V7 | Tritone Sub |
|-------------|-------------|
| G7 | Db7 |
| C7 | Gb7 |
| D7 | Ab7 |
| A7 | Eb7 |
| E7 | Bb7 |
| B7 | F7 |

**The tritone interval is symmetrical** — it divides the octave exactly in half. So if G7 can be replaced by Db7, then Db7 can equally be replaced by G7.

This symmetry is why the tritone sub works so naturally. You're not forcing an alien chord into the progression — you're revealing a chord that was *already implied* by the same tritone tension.`,
                },
                {
                    type: 'exercise',
                    title: 'Hear the ii-bII7-I',
                    content: 'Listen to the standard ii-V-I, then hear it with the tritone sub applied (ii-bII7-I). The chord quality is the same, but the bass line becomes beautifully chromatic: D → Db → C.',
                    exerciseConfig: {
                        type: 'ii_v_i_trainer',
                        requiredKeys: 3,
                        mode: 'tritone_sub',
                    },
                },
                {
                    type: 'text',
                    title: 'Voice Leading the Tritone Sub',
                    content: `When you apply a tritone sub on guitar, the voice leading is incredibly efficient. Watch what happens with Drop-2 voicings:

**Standard ii-V-I (C major):**
Dm7 → G7 → Cmaj7

**With Tritone Sub:**
Dm7 → **Db7** → Cmaj7

The inner voices barely move — often just one fret shift. The bass drops chromatically (D → Db → C). This is why jazz guitarists love tritone subs: they sound sophisticated but are *easier to play* than the original.

**Key insight:** The tritone sub doesn't change the harmonic *function* — it's still dominant → tonic. It changes the *color* and creates that silky chromatic motion.`,
                },
                {
                    type: 'audio',
                    title: 'A/B Comparison',
                    content: 'First you\'ll hear the standard ii-V-I, then the tritone sub version. Listen for the chromatic bass line in the second version.',
                    audioConfig: {
                        chordSymbols: ['Dm7', 'G7', 'Cmaj7', 'Dm7', 'Db7', 'Cmaj7'],
                    },
                },
                {
                    type: 'quiz',
                    title: 'Check Your Understanding',
                    content: 'What is the tritone substitute for A7?',
                    quizOptions: [
                        { label: 'D7', correct: false },
                        { label: 'Eb7', correct: true },
                        { label: 'E7', correct: false },
                        { label: 'Bb7', correct: false },
                    ],
                },
            ],
        },
        {
            id: 'secondary-dominants',
            moduleId: 2,
            lessonIndex: 1,
            title: 'Secondary Dominants',
            subtitle: 'Creating Local Tonicization',
            description: 'Temporarily tonicize any diatonic chord to create forward momentum.',
            icon: '🎯',
            estimatedMinutes: 22,
            beatoReference: 'Beato Book 2.0 — Secondary Dominants',
            completionCriteria: 'Identify V/V and V/vi in a progression',
            steps: [
                {
                    type: 'text',
                    title: 'What Are Secondary Dominants?',
                    content: `A **secondary dominant** is a dominant 7th chord that temporarily "tonicizes" a chord other than the I chord. It creates a momentary **ii-V-I** cadence pointing to a diatonic target.

Think of it as the V7 of *any* diatonic chord — not just the I.

In C major, the diatonic chords are:
I (Cmaj7) — ii (Dm7) — iii (Em7) — IV (Fmaj7) — V (G7) — vi (Am7)

Each of these can be temporarily treated as a "I" chord by placing its V7 right before it:

| Secondary Dom | Target | Symbol |
|--------------|--------|--------|
| **A7** → Dm7 | V7/ii | Creates D minor tonicization |
| **B7** → Em7 | V7/iii | Creates E minor tonicization |
| **C7** → Fmaj7 | V7/IV | Creates F major tonicization |
| **D7** → G7 | V7/V | Creates G major tonicization |
| **E7** → Am7 | V7/vi | Creates A minor tonicization |

The most common are **V7/V** (D7 in C major) and **V7/vi** (E7 in C major).`,
                },
                {
                    type: 'text',
                    title: 'How Secondary Dominants Create Motion',
                    content: `Secondary dominants work because of the **tritone resolution** we learned about. Every dominant 7th chord contains a tritone between its 3rd and 7th, and that tritone *wants* to resolve.

When you insert a secondary dominant, you're creating a **temporary gravitational pull** toward the target chord. The listener's ear expects that resolution — and when it arrives, it feels satisfying and inevitable.

**Example in a I-vi-ii-V:**
Original: Cmaj7 → Am7 → Dm7 → G7
With secondary doms: Cmaj7 → **E7** → Am7 → **A7** → Dm7 → G7

Each secondary dominant creates forward momentum. The E7 *pushes* into Am7. The A7 *pushes* into Dm7. The progression gains energy and direction.

**The key principle:** Secondary dominants don't change the destination — they make the *journey* more interesting.`,
                },
                {
                    type: 'fretboard',
                    title: 'V7/V on the Fretboard',
                    content: 'Here\'s D7 (the V7/V in C major) shown on the fretboard. This chord is borrowed from outside the key — the F# doesn\'t belong to C major. That\'s what creates the "leading tone" pull toward G.',
                    fretboardConfig: {
                        root: 'D',
                        chord: '7',
                        showIntervals: true,
                    },
                },
                {
                    type: 'exercise',
                    title: 'Spot the Secondary Dominant',
                    content: 'You\'ll hear short chord progressions. Identify which chord is the secondary dominant and what it resolves to. Listen for the tension-resolution pattern.',
                    exerciseConfig: {
                        type: 'chord_explorer',
                        mode: 'secondary_dominants',
                        requiredKeys: 3,
                    },
                },
                {
                    type: 'audio',
                    title: 'Before & After',
                    content: 'First: a plain I-vi-ii-V. Then: the same progression enriched with secondary dominants. Hear how much more momentum the second version has.',
                    audioConfig: {
                        chordSymbols: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'E7', 'Am7', 'A7', 'Dm7', 'G7'],
                    },
                },
                {
                    type: 'quiz',
                    title: 'Quick Check',
                    content: 'In the key of C major, what is the V7/vi?',
                    quizOptions: [
                        { label: 'A7', correct: false },
                        { label: 'E7', correct: true },
                        { label: 'D7', correct: false },
                        { label: 'B7', correct: false },
                    ],
                },
            ],
        },
    ],
};

// ── Module 3: Voice Leading Mastery ─────────────────────────────────────────

const LESSON_6_GUIDE_TONES: Lesson = {
    id: 'guide-tones',
    moduleId: 3,
    lessonIndex: 0,
    title: 'Guide Tones',
    subtitle: 'The Skeleton of Harmony',
    description: 'Discover how the 3rds and 7ths of chords create the essential melodic thread that defines harmonic movement.',
    icon: '🧭',
    estimatedMinutes: 18,
    beatoReference: 'Beato Book 2.0 — Ch.1, Guide Tone Lines',
    completionCriteria: 'Trace guide tones through 3 progressions',
    steps: [
        {
            type: 'text',
            title: 'What Are Guide Tones?',
            content: `**Guide tones** are the **3rd and 7th** of every chord. They are the two most important notes because:

1. **The 3rd** determines whether the chord is major or minor
2. **The 7th** determines the chord's tension level (major 7th = stable, dominant 7th = tense, minor 7th = warm)

Together, these two notes contain more harmonic information than all the other chord tones combined. The root tells you *where* you are. The 5th is mostly structural. But the 3rd and 7th tell you *what kind of sound* you're hearing.

Jazz pianists like Bill Evans built entire accompaniment styles around playing just these two notes. Guitarists can do the same — and it's the foundation of sophisticated comping.

**The guide tone principle:** If you play only the 3rds and 7ths, the harmonic progression is still completely clear to the listener.`,
        },
        {
            type: 'text',
            title: 'Guide Tone Lines',
            content: `A **guide tone line** is what happens when you track the 3rds and 7ths *across* a chord progression. These notes create smooth, stepwise melodic lines — almost automatically.

Watch this through a ii-V-I in C:

| Chord | 3rd | 7th |
|-------|-----|-----|
| **Dm7** | F | C |
| **G7** | B | F |
| **Cmaj7** | E | B |

Now trace two voices:
- **Voice 1:** F → F → E (holds, then drops a half step)
- **Voice 2:** C → B → B (drops a half step, then holds)

Each voice moves by **at most a half step**. This is the magic — the harmonic motion is enormous (three different chords) but the actual note movement is tiny.

This is why the ii-V-I sounds so smooth. The guide tones *lead themselves* from chord to chord.`,
        },
        {
            type: 'exercise',
            title: 'Guide Tone Tracer',
            content: 'Select a progression and watch the guide tones highlighted in gold. The 3rds and 7ths will be traced as a melodic line through the changes. Try at least **3 different progressions** and notice how the guide tones always move by step.',
            exerciseConfig: {
                type: 'voice_leading_explorer',
                mode: 'guide_tones',
                requiredProgressions: 3,
            },
        },
        {
            type: 'text',
            title: 'Why This Matters for Guitar',
            content: `Understanding guide tones transforms your comping and soloing:

**For Comping:**
- You can comp with just two notes (3rd + 7th) and still outline the harmony clearly
- Add the root in the bass and one more color tone for a complete but economical voicing
- Your voice leading becomes automatic — just follow the guide tones

**For Soloing:**
- Target the 3rd or 7th on strong beats and your lines will always sound "inside"
- Guide tones are your anchors — embellish around them with scale tones and chromatic approach notes
- When you hear a great jazz solo "nail" a chord change, they're usually landing on a guide tone

**The Joe Pass approach:** Pass would often play guide tone lines on the middle strings while walking a bass line on the low strings. Two voices, the entire harmonic picture.`,
        },
        {
            type: 'fretboard',
            title: 'Guide Tones on the Fretboard',
            content: 'Here are the chord tones of Dm7. The 3rd (F) and 7th (C) are your guide tones — the essential notes. Notice their positions across different string sets.',
            fretboardConfig: {
                root: 'D',
                chord: 'm7',
                showIntervals: true,
            },
        },
        {
            type: 'quiz',
            title: 'Check Your Understanding',
            content: 'In a ii-V-I (Dm7 → G7 → Cmaj7), what happens to the 3rd of Dm7 (F) as you move to G7?',
            quizOptions: [
                { label: 'It jumps up to G', correct: false },
                { label: 'It stays on F — becoming the 7th of G7', correct: true },
                { label: 'It drops to D', correct: false },
                { label: 'It moves up to A', correct: false },
            ],
        },
    ],
};

const LESSON_7_SMOOTH_VL: Lesson = {
    id: 'smooth-voice-leading',
    moduleId: 3,
    lessonIndex: 1,
    title: 'Smooth Voice Leading',
    subtitle: 'The Art of Minimal Motion',
    description: 'Master the principle of minimum motion — moving each voice as little as possible between chords.',
    icon: '🌊',
    estimatedMinutes: 20,
    beatoReference: 'Beato Book 2.0 — Ch.2, Voice Leading Principles',
    completionCriteria: 'Compare voice leading paths for 3 progressions',
    steps: [
        {
            type: 'text',
            title: 'The Principle of Minimum Motion',
            content: `The golden rule of voice leading:

**Each voice should move to the nearest available note in the next chord.**

This means:
- **Common tones stay put** — if a note appears in both chords, hold it
- **Moving voices resolve by step** — half step or whole step whenever possible
- **Avoid parallel movement** — voices should move independently (oblique or contrary motion)
- **Leaps are a last resort** — jumps larger than a whole step should be rare and intentional

This isn't just a "rule" — it's how the ear naturally hears harmony. When all voices move by step, the chord change sounds *inevitable*. When voices leap randomly, the change sounds *jarring*.

**Common voice motion types:**
- **Oblique**: One voice moves, the other stays (most smooth)
- **Contrary**: Voices move in opposite directions (balanced)
- **Similar**: Voices move in the same direction (parallel warning)
- **Parallel**: Voices move same direction by same interval (avoid for 5ths/8ves)`,
        },
        {
            type: 'text',
            title: 'Voice Leading with Drop-2 Voicings',
            content: `In Lesson 5, you learned Drop-2 shapes. Now let's connect them with voice leading.

The key insight: **inversions are your voice leading tool.**

When you move from Dm7 to G7 on strings 4-3-2-1, you don't just grab any G7 shape. You find the G7 inversion where:
1. Common tones stay on the same fret (or as close as possible)
2. Moving voices shift by 1-2 frets maximum

**Example: Dm7 (3rd inv) → G7 (root pos) on strings 4-3-2-1:**
- String 4: fret 5 (D) → fret 5 (D) — **COMMON TONE** ✓
- String 3: fret 5 (F) → fret 5 (F) — **COMMON TONE** ✓
- String 2: fret 5 (A) → fret 4 (G) — **one fret down** ✓
- String 1: fret 5 (C) → fret 4 (B) — **one fret down** ✓

Two notes don't move at all. Two notes shift one fret. That's the smoothest possible voice leading — and it sounds *gorgeous*.`,
        },
        {
            type: 'exercise',
            title: 'Voice Leading Path Explorer',
            content: 'Enter a progression and see the optimal voice leading path calculated. The tool finds voicings that minimize total finger movement. Compare different voicing types (Drop 2, Drop 3) to see which gives the smoothest result.',
            exerciseConfig: {
                type: 'voice_leading_explorer',
                mode: 'path_comparison',
                requiredProgressions: 3,
            },
        },
        {
            type: 'text',
            title: 'The Movement Score',
            content: `Professional guitarists develop an intuition for voice leading quality. Here's a way to quantify it:

**Movement Score = total frets moved across all voices**

For a 4-voice chord change:
- **Score 0-2**: Excellent — mostly common tones, very smooth
- **Score 3-4**: Good — step motion dominant
- **Score 5-7**: Fair — some leaps, but manageable
- **Score 8+**: Poor — too much jumping, find a better inversion

When you browse voicings in the Voice Leading tool, each transition shows its movement score. The lower, the better.

**Pro tip:** Sometimes a slightly higher movement score is worth it if it gives you a better melody note on top. Voice leading is about *balance* — smoothness matters, but so does musicality.`,
        },
        {
            type: 'fretboard',
            title: 'See the Minimal Motion',
            content: 'This fretboard shows a G7 Drop-2 voicing — one that connects smoothly from the Dm7 shape you just saw. Notice how close the positions are.',
            fretboardConfig: {
                root: 'G',
                chord: '7',
                showIntervals: true,
                highlightStrings: [1, 2, 3, 4],
            },
        },
        {
            type: 'quiz',
            title: 'Check Your Understanding',
            content: 'What is the "golden rule" of voice leading?',
            quizOptions: [
                { label: 'Always play from the root position', correct: false },
                { label: 'Each voice should move to the nearest available note in the next chord', correct: true },
                { label: 'Use the same chord shape on every string set', correct: false },
                { label: 'Play all four strings at once', correct: false },
            ],
        },
    ],
};

const LESSON_8_VL_STANDARDS: Lesson = {
    id: 'voice-leading-standards',
    moduleId: 3,
    lessonIndex: 2,
    title: 'Voice Leading Through Changes',
    subtitle: 'Real-World Application',
    description: 'Apply voice leading principles to real progressions — from jazz standards to modern harmony.',
    icon: '🎼',
    estimatedMinutes: 22,
    beatoReference: 'Beato Book 2.0 — Ch.4, Comping \u0026 Voice Leading',
    completionCriteria: 'Voice lead through 2 standard progressions',
    steps: [
        {
            type: 'text',
            title: 'From Theory to Real Music',
            content: `You've learned guide tones, minimum motion, and Drop-2 voice leading. Now let's apply everything to progressions you'll encounter in real playing.

The approach:
1. **Identify the key centers** — where are the ii-V-I's?
2. **Map the guide tones** — trace the 3rds and 7ths through the changes
3. **Choose voicings** — find Drop-2 inversions that follow the guide tone line
4. **Optimize** — minimize total movement while keeping a good top-note melody

We'll work through two classic harmonic frameworks that appear everywhere in jazz and popular music.`,
        },
        {
            type: 'text',
            title: 'Framework 1: The Descending ii-V Chain',
            content: `One of the most common patterns in jazz is a chain of ii-V-I's that descend by whole or half steps. This pattern appears in countless standards.

**Progression:**
Cm7 → F7 → Bbmaj7 → Bbm7 → Eb7 → Abmaj7

This is two ii-V-I's that descend by a whole step:
- ii-V-I in Bb: Cm7 → F7 → Bbmaj7
- ii-V-I in Ab: Bbm7 → Eb7 → Abmaj7

**Guide tone analysis:**
| Chord | 3rd | 7th |
|-------|-----|-----|
| Cm7 | Eb | Bb |
| F7 | A | Eb |
| Bbmaj7 | D | A |
| Bbm7 | Db | Ab |
| Eb7 | G | Db |
| Abmaj7 | C | G |

Watch the 7th line: Bb → Eb → A → Ab → Db → G — these move by step, creating a beautiful descending chromatic thread.`,
        },
        {
            type: 'audio',
            title: 'Hear the Descending Chain',
            content: 'Listen to these changes with smooth voice leading. Follow the inner voices — they barely move even as the key centers shift.',
            audioConfig: {
                chordSymbols: ['Cm7', 'F7', 'Bbmaj7', 'Bbm7', 'Eb7', 'Abmaj7'],
            },
        },
        {
            type: 'text',
            title: 'Framework 2: The Turnaround',
            content: `The **I-vi-ii-V turnaround** is the DNA of jazz standards, pop songs, and R&B. It cycles endlessly and each chord flows naturally to the next.

**In C major:** Cmaj7 → Am7 → Dm7 → G7

With reharmonization (tritone subs + secondary dominants):
Cmaj7 → A7 → Dm7 → Db7

**Guide tone analysis:**
| Chord | 3rd | 7th |
|-------|-----|-----|
| Cmaj7 | E | B |
| A7 | C# | G |
| Dm7 | F | C |
| Db7 | F | Cb (B) |

Now connect to the top (back to Cmaj7): the cycle repeats perfectly. This progression is incredibly fun to comp over — the harmony is constantly moving but the voice leading keeps everything controlled.

**Your assignment:** Use the Voice Leading tool (in the sidebar) to build both of these progressions and watch the optimal voicing path on the fretboard.`,
        },
        {
            type: 'exercise',
            title: 'Build Your Own Progression',
            content: 'Use the Voice Leading explorer to enter a custom chord progression. Start simple (a ii-V-I) and gradually add complexity — secondary dominants, tritone subs, key center changes. Watch how the voice leading engine finds smooth paths.',
            exerciseConfig: {
                type: 'voice_leading_explorer',
                mode: 'custom',
                requiredProgressions: 2,
            },
        },
        {
            type: 'quiz',
            title: 'Final Check',
            content: 'When voice leading through a chain of ii-V-I\'s descending by half steps, the guide tones create what kind of motion?',
            quizOptions: [
                { label: 'Random leaps', correct: false },
                { label: 'Chromatic (half-step) descending lines', correct: true },
                { label: 'Ascending whole steps', correct: false },
                { label: 'Static (no motion)', correct: false },
            ],
        },
    ],
};

export const MODULE_3: Module = {
    id: 3,
    title: 'Voice Leading Mastery',
    subtitle: 'Module 3',
    description: 'Master the art of smooth voice leading — guide tones, minimum motion, and real-world application through jazz standard progressions.',
    lessons: [
        LESSON_6_GUIDE_TONES,
        LESSON_7_SMOOTH_VL,
        LESSON_8_VL_STANDARDS,
    ],
};

export const CURRICULUM: Module[] = [MODULE_1, MODULE_2, MODULE_3];

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getModule(moduleId: number): Module | undefined {
    return CURRICULUM.find(m => m.id === moduleId);
}

export function getLesson(moduleId: number, lessonIndex: number): Lesson | undefined {
    return getModule(moduleId)?.lessons[lessonIndex];
}

export function getTotalLessons(): number {
    return CURRICULUM.reduce((sum, mod) => sum + mod.lessons.length, 0);
}
