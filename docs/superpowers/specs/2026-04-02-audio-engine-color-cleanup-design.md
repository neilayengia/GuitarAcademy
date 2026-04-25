# P0: Audio Engine Overhaul + Color Token Cleanup

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Two independent P0 improvements that transform perceived quality

---

## 1. Audio Engine — Sampled Guitar Sounds

### Problem

The current Karplus-Strong synthesis in `src/utils/audioEngine.ts` produces thin, artificial tones. The attack is a raw noise burst (harsh click), there's no proper envelope shaping, and `playChord()` uses `setTimeout` for strum timing which drifts under load. For an app targeting intermediate-to-advanced guitarists, this is immediately noticeable and undermines credibility.

### Solution

Replace the synthesis engine with pre-recorded guitar note samples played back via Web Audio API `AudioBufferSourceNode`. Pitch-shift between samples for notes that fall between recorded pitches.

### Sample Strategy

- Record or source **clean nylon/steel acoustic guitar** single-note samples
- Chromatically sample every **3 semitones** from E2 (MIDI 40) to E5 (MIDI 76) = ~13 samples
- Each sample: ~1.5-2 seconds of sustain, natural decay, normalized volume
- Format: mp3, ~100-150KB each, total ~2-3MB
- Two additional samples for metronome: `click.mp3` and `click_accent.mp3`

**File structure:**
```
public/audio/samples/
  guitar_40.mp3   (E2)
  guitar_43.mp3   (G2)
  guitar_46.mp3   (Bb2)
  guitar_49.mp3   (Db3)
  guitar_52.mp3   (E3)
  guitar_55.mp3   (G3)
  guitar_58.mp3   (Bb3)
  guitar_61.mp3   (Db4)
  guitar_64.mp3   (E4)
  guitar_67.mp3   (G4)
  guitar_70.mp3   (Bb4)
  guitar_73.mp3   (Db5)
  guitar_76.mp3   (E5)
  click.mp3
  click_accent.mp3
```

### Architecture

#### SampleLibrary (new)

Singleton class responsible for loading and caching audio samples.

- `init(audioContext)` — called on first user interaction (click/tap). Fetches all sample mp3s in parallel via `fetch()` + `decodeAudioData()`. Stores decoded `AudioBuffer` objects in a `Map<number, AudioBuffer>` keyed by MIDI number.
- `getSample(midi)` — returns `{ buffer: AudioBuffer, baseNote: number }` for the nearest available sample to the requested MIDI note.
- `isLoaded()` — boolean, true once all samples are decoded.
- Lazy initialization: samples only load on first `playNote()` call, not on page load.

#### playNote(midi, duration, volume) — revised

1. Call `SampleLibrary.init()` if not loaded (first interaction triggers load)
2. Get nearest sample via `getSample(midi)`
3. Create `AudioBufferSourceNode`, set `playbackRate` to `2^((midi - baseNote) / 12)` for pitch correction
4. Route through filter chain: body resonance (peaking 180Hz) + presence (peaking 2.5kHz) + highCut (lowpass 8kHz)
5. Apply gain envelope via `GainNode`: immediate attack, hold for `duration * 0.7`, then linear ramp to 0 over remaining 30%
6. Schedule via `AudioContext.currentTime` (never `setTimeout`)

#### playChord(midiNotes, strumDelay, duration) — revised

- Use `AudioContext.currentTime` scheduling: each note starts at `ctx.currentTime + i * strumDelay`
- No `setTimeout` — eliminates timing drift entirely
- Volume per note: `volume / Math.sqrt(midiNotes.length)` to prevent clipping on dense voicings

#### playClick(accent) — revised

- Play `click.mp3` or `click_accent.mp3` sample instead of noise-burst synthesis
- Immediate playback, no envelope needed

#### playScale(midiNotes, tempo) — revised

- Use `AudioContext.currentTime` scheduling for all notes
- Return `{ stop }` that disconnects all scheduled sources

### Fallback

If sample loading fails (network error, unsupported format), fall back to improved Karplus-Strong:
- Add ADSR envelope to existing synthesis (attack 5ms, decay 50ms, sustain 0.7, release 200ms)
- Keep the existing filter chain
- Log warning to console

### Existing Chord Samples

The 72 chord mp3 files in `public/audio/chords/` used by Practice Room are untouched. They already sound good and serve a different purpose (full chord playback vs. individual note feedback).

### Public API

The exported API from `audioEngine.ts` does not change:
- `playNote(midi, duration?, volume?): void`
- `playChord(midiNotes, strumDelay?, duration?): void`
- `playScale(midiNotes, tempo?, ascending?, descending?): { stop: () => void }`
- `playClick(accent?): void`

No consumers need to change.

---

## 2. Color Token Cleanup

### Problem

`PracticeRoom.tsx` and `Dashboard.tsx` use ~40+ hardcoded hex color values (`#1a1a1a`, `#555`, `#888888`, `#333`, etc.) instead of the design system tokens defined in `index.css`. This makes these screens visually inconsistent with the rest of the app and breaks the Studio Console aesthetic.

### Solution

Replace all hardcoded hex values with Tailwind design tokens. No visual change intended — the tokens map to the same (or very close) colors.

### Mapping Table

| Hardcoded Value | Replacement Token | Context |
|----------------|-------------------|---------|
| `bg-[#0f0f0f]` | `bg-bg` | Page backgrounds |
| `bg-[#1a1a1a]` | `bg-elevated` | Card/panel backgrounds |
| `bg-[#1e1e1e]` | `bg-elevated` | Nested panels, inputs |
| `bg-[#111]` | `bg-surface` | Empty slot backgrounds |
| `bg-[#2a2a2a]` | `bg-elevated` | Chip/button backgrounds |
| `border-[#222222]` | `border-border-subtle` | Card borders |
| `border-[#2a2a2a]` | `border-border` | Input/chip borders |
| `border-[#333]` | `border-border` | Interactive borders |
| `text-[#555]` | `text-text-muted` | Labels, metadata |
| `text-[#888]` / `text-[#888888]` | `text-text-secondary` | Supporting text |
| `text-white` | `text-text` | Primary text on dark |
| `bg-white` (buttons) | `bg-accent` + `text-bg` | Primary action buttons |
| `border-white` | `border-accent` | Active states |

### Dashboard Gradients

The hero section in `Dashboard.tsx` uses inline `rgba(10,10,10,...)` gradients. These need a CSS custom property with the RGB components:

Add to `index.css` `@theme` block:
```css
--color-bg-rgb: 10, 10, 10;
```

Then replace inline gradient values:
```
rgba(10,10,10,0.98)  →  rgba(var(--color-bg-rgb), 0.98)
```

### Files Modified

1. `src/components/PracticeRoom.tsx` — ~30 replacements
2. `src/components/Dashboard.tsx` — ~8 gradient replacements
3. `src/index.css` — add `--color-bg-rgb` variable

### PracticeRoom Button Retheme

The Practice Room uses white (`bg-white text-black`) for primary actions (play button, active scale pill, active chord slot). The rest of the app uses gold accent for primary actions. These should become:
- Play button: `bg-accent text-bg`
- Active scale pill: `bg-accent text-bg`
- Active chord slot border: `border-accent`
- Loop button active: `bg-accent text-bg border-accent`

This brings the Practice Room into visual alignment with the rest of the app.

---

## Out of Scope

- New lesson content
- Touch support for drag-and-drop
- Exercise gating logic
- Sidebar navigation changes
- Custom volume slider component
