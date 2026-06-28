# Rubato Workspace Redesign — Design Spec

## Context

Rubato is pivoting from a multi-page guitar learning app to a single-screen interactive workspace. The target customer is an intermediate guitarist breaking into advanced harmony (jazz voicings, chord-scale relationships, voice leading) — B2C at ~£10-15/month.

The previous version (tagged `v0-legacy`) spread functionality across standalone pages (Dashboard, Lessons, AI Instructor, Progress, Circle of Fifths, Chord Voicings, Voice Leading, Fretboard Explorer, Practice Room). The new version collapses everything into one workspace where the Practice Room IS the app.

## Architecture

### Layout: Focused Fretboard + Collapsible Side Panel

The workspace has four zones:

```
+-------+-------------------------------------------+
| CHORD |  TOP BAR: ☰ | ▶ ⏮ ⏭ | [Cm7][F7][Bb7][+] | Dorian | Aeolian | 🔊 |
| LIB   |-------------------------------------------+
|       |                                           |
| search|           FRETBOARD (HERO)                |
| C     |        Full height, full width            |
|  Maj7 |     Scale overlay + note highlights       |
|  m7   |                                           |
|  7    |                                           |
| D     |                                           |
|  Maj7 |                                           |
|  ...  |-------------------------------------------+
|       |  VOICING STRIP: [Drop 2·8th] [Drop 3·3rd] [Shell·8th] [Close·1st] |
+-------+-------------------------------------------+
```

**Default state:** Panel open (Building Mode). User can collapse it to maximize fretboard (Practice Mode).

### Zone Details

**1. Top Bar**
- Panel toggle (☰) — opens/closes chord library
- Transport controls: play/pause, skip back, skip forward
- 4 progression slots — drag targets, click to select active chord
- Scale selector pills — contextual to active chord's quality, keyboard-switchable (1-9, arrows)
- Volume control (slider + mute toggle)

**2. Left Panel (Collapsible)**
- Search input at top — filters chords in real time
- Chord library grouped by root (C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B)
- Each root shows quality badges (Maj7, m7, 7, m7b5, 7alt, 13b9)
- Click to add chord to first empty slot (or active slot if all full)
- Drag to place in a specific slot
- Click previews the chord audio (existing behavior)
- Progression generator controls (style selector + generate button) move here from the top bar — they're part of building, not practicing
- Animated slide in/out with Framer Motion, ~200ms

**3. Fretboard (Center — Hero)**
- Existing `Fretboard.tsx` component, unchanged in functionality
- Gets maximum available screen real estate
- Shows scale overlay for the active chord + selected scale
- Color language unchanged: gold (root), warm white (chord tones), blue (scale tones), purple (tensions)
- Interval labels shown by default
- Legend bar below fretboard (Root / Chord Tone / Tension)

**4. Bottom Voicing Strip**
- Horizontal scrollable strip showing available voicings for the active chord
- Each voicing pill shows: type + fret position (e.g. "Drop 2 · 8th fret")
- Active voicing highlighted with accent color
- Clicking a voicing highlights those specific notes on the fretboard
- Voicings sourced from existing `ChordVoicings.tsx` logic
- Strip is empty/hidden when no chord is active

### Routing

```
/      → Workspace (authenticated) or AuthPage (unauthenticated)
/auth  → AuthPage (redirect to / if already authenticated)
```

No other routes. `ProtectedRoute` wraps the workspace.

### Components

**New:**
- `Workspace.tsx` — top-level shell, replaces `PracticeRoom.tsx`. Owns layout, panel state, and coordinates the four zones.
- `TopBar.tsx` — transport, slots, scales, volume. Extracted from current PracticeRoom.
- `ChordPanel.tsx` — collapsible left panel. Search + chord library + generator. Extracts chord library UI from current PracticeRoom + adds search.
- `VoicingStrip.tsx` — bottom strip. New component, uses voicing data from existing music theory utils.

**Kept as-is:**
- `Fretboard.tsx` — no changes
- `FretboardControls.tsx` — no changes
- `AuthPage.tsx` — no changes
- `ProtectedRoute.tsx` — no changes
- `UserMenu.tsx` — rendered in TopBar
- `SettingsPanel.tsx` — accessible from UserMenu

**Deleted:**
- `Dashboard.tsx`
- `Sidebar.tsx`
- `LessonView.tsx`
- `LessonExercises.tsx`
- `PerformanceAnalysis.tsx`
- `AIInstructor.tsx`
- `CircleOfFifths.tsx`
- `PricingPage.tsx`
- `FretboardExplorer.tsx`

### State Management

Existing Zustand store (`useAppStore`) stays. No new state slices needed. The workspace uses:
- Progression slots, playback state, active slot index (already in PracticeRoom local state — stays local)
- Panel open/closed state — new local state in Workspace, persisted to localStorage
- Scale override selection (already exists)
- Volume/mute (already exists)

Remove from store: `totalPracticeMinutes`, `overallAccuracy`, `currentStreak`, `recentSessions`, `sessionsCompleted`, `recordPracticeSession` — all progress tracking state. Dead code with no UI.

### Audio

No changes to the audio engine. `audioEngine.ts`, `chordAudioMap.ts`, and all playback logic stays identical. The voicing strip will use `playChord()` for previewing voicings on click.

### Keyboard Shortcuts

Existing shortcuts stay:
- `1-9` — switch scales
- `Arrow Up/Down/Left/Right` — cycle scales

New shortcut:
- `Cmd+B` / `Ctrl+B` — toggle chord panel

### What Is NOT In Scope

- No onboarding, tooltips, or guided tour
- No new dependencies
- No new API integrations
- No subscription/payment flow
- No mobile-specific responsive layout (desktop-first, functional on tablet)
- No new state management patterns
- No tests beyond what exists
