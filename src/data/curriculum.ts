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
    type: 'interval_ear' | 'chord_explorer' | 'scale_overlay' | 'voicing_browser' | 'ii_v_i_trainer';
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
                    content: 'A tritone substitution occurs when you replace a dominant 7th chord with another dominant 7th chord that is three whole steps (a tritone) away.'
                }
            ]
        },
        {
            id: 'secondary-dominants',
            moduleId: 2,
            lessonIndex: 1,
            title: 'Secondary Dominants',
            subtitle: 'Creating Local Tonicization',
            description: 'Temporarily tonicize any diatonic chord to create forward momentum.',
            icon: '🎯',
            estimatedMinutes: 20,
            beatoReference: 'Beato Book 2.0 — Secondary Dominants',
            completionCriteria: 'Identify V/V and V/vi in a progression',
            steps: [
                {
                    type: 'text',
                    title: 'Creating Tension',
                    content: 'Secondary dominants briefly pretend another chord is the "I" chord by placing its dominant V7 right before it.'
                }
            ]
        }
    ],
};

export const CURRICULUM: Module[] = [MODULE_1, MODULE_2];

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
