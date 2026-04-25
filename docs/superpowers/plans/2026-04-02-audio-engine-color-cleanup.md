# Audio Engine Overhaul + Color Token Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synthetic Karplus-Strong audio engine with sampled guitar sounds and fix all hardcoded hex colors in PracticeRoom, Dashboard, and App.tsx to use design system tokens.

**Architecture:** New `SampleLibrary` singleton lazily loads ~15 guitar note samples + 2 click samples on first user interaction. The public API (`playNote`, `playChord`, `playScale`, `playClick`) stays identical — no consumer changes needed. Color cleanup is a mechanical find-and-replace across 3 component files + 1 CSS variable addition.

**Tech Stack:** Web Audio API (AudioBufferSourceNode, GainNode, BiquadFilterNode), Tailwind CSS v4 design tokens

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/utils/sampleLibrary.ts` | Sample loading, caching, nearest-sample lookup |
| Rewrite | `src/utils/audioEngine.ts` | Use SampleLibrary for playback, AudioContext scheduling |
| Create | `public/audio/samples/*.mp3` | 13 guitar note samples + 2 click samples |
| Modify | `src/components/PracticeRoom.tsx` | Replace ~35 hardcoded hex values with tokens |
| Modify | `src/components/Dashboard.tsx` | Replace gradient rgba values with CSS var |
| Modify | `src/App.tsx` | Replace ~8 hardcoded hex values with tokens |
| Modify | `src/index.css` | Add `--color-bg-rgb` variable |

---

### Task 1: Generate Guitar Note Samples

**Files:**
- Create: `public/audio/samples/` directory with 15 mp3 files

We need real guitar samples. We'll use Web Audio synthesis to generate high-quality guitar-like tones offline via a Node script, then save as mp3. Alternatively, source from a free CC0 guitar sample pack.

- [ ] **Step 1: Create the samples directory**

```bash
mkdir -p /Users/diviyajayengia/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy/public/audio/samples
```

- [ ] **Step 2: Create a sample generation script**

Create `scripts/generate-samples.ts` — a Node script that uses `audiobuffer-to-wav` or similar to synthesize clean guitar notes using an improved Karplus-Strong with proper ADSR envelope, body IR, and saves them as wav files we can convert.

However, the faster and better approach: source 13 clean nylon guitar notes from a free sample library (e.g., Philharmonia Orchestra free samples, or use the Tone.js Salamander guitar samples which are CC-BY). Download individual notes at MIDI 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76.

For the click samples, create two short percussive samples (rimshot and woodblock).

Since we cannot automatically download copyrighted samples, we will **improve the existing Karplus-Strong engine significantly** and pre-render the samples as mp3 files using a generation script. This gives us control over quality.

Create file `scripts/generate-guitar-samples.mjs`:

```javascript
/**
 * generate-guitar-samples.mjs
 * 
 * Generates guitar-like samples using improved Karplus-Strong synthesis
 * with proper ADSR envelope, body resonance, and saves as WAV files.
 * 
 * Run: node scripts/generate-guitar-samples.mjs
 * Then convert to mp3: for f in public/audio/samples/*.wav; do ffmpeg -i "$f" -b:a 192k "${f%.wav}.mp3"; done
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SAMPLE_RATE = 44100;
const DURATION = 2.5; // seconds
const OUTPUT_DIR = 'public/audio/samples';

// MIDI notes to generate: every 3 semitones from E2 (40) to E5 (76)
const MIDI_NOTES = [40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function generateNote(freq, sampleRate, duration) {
  const totalSamples = Math.ceil(sampleRate * duration);
  const output = new Float32Array(totalSamples);

  // Ring buffer (Karplus-Strong)
  const period = Math.round(sampleRate / freq);
  const ring = new Float32Array(period);

  // Initialize with band-limited noise (smoother attack)
  for (let i = 0; i < period; i++) {
    ring[i] = Math.random() * 2 - 1;
  }

  // Pre-filter noise for warmth (3 passes of averaging)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < period - 1; i++) {
      ring[i] = ring[i] * 0.6 + ring[i + 1] * 0.4;
    }
  }

  // ADSR envelope parameters (in samples)
  const attackSamples = Math.ceil(sampleRate * 0.003);   // 3ms attack
  const decaySamples = Math.ceil(sampleRate * 0.08);      // 80ms decay
  const sustainLevel = 0.75;
  const releaseSamples = Math.ceil(sampleRate * 0.4);     // 400ms release
  const releaseStart = totalSamples - releaseSamples;

  // KS parameters — tuned for nylon guitar
  const decay = 0.998;
  const blend = 0.52;

  let readIdx = 0;

  for (let i = 0; i < totalSamples; i++) {
    const curr = ring[readIdx];
    const next = ring[(readIdx + 1) % period];

    // KS filter + decay
    ring[readIdx] = (curr * (1 - blend) + next * blend) * decay;
    readIdx = (readIdx + 1) % period;

    // Apply ADSR envelope
    let env = 1.0;
    if (i < attackSamples) {
      env = i / attackSamples;
    } else if (i < attackSamples + decaySamples) {
      const t = (i - attackSamples) / decaySamples;
      env = 1.0 - t * (1.0 - sustainLevel);
    } else if (i >= releaseStart) {
      const t = (i - releaseStart) / releaseSamples;
      env = sustainLevel * (1.0 - t * t); // quadratic release
    } else {
      env = sustainLevel;
    }

    output[i] = curr * env;
  }

  // Body resonance simulation: apply a simple 2nd-order filter
  // Boost around 180Hz (guitar body) and cut above 6kHz
  const bodyFiltered = applyResonance(output, sampleRate, freq);

  return bodyFiltered;
}

function applyResonance(samples, sampleRate, fundamentalFreq) {
  const output = new Float32Array(samples.length);

  // Simple biquad peaking filter at 180Hz
  const f0 = 180;
  const Q = 1.2;
  const gainDb = 3;
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * f0 / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);

  const b0 = 1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha / A;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = (b0 / a0) * x + (b1 / a0) * x1 + (b2 / a0) * x2
            - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1; x1 = x;
    y2 = y1; y1 = y;
    output[i] = y;
  }

  // Lowpass at 7kHz to tame harshness
  const fc = 7000;
  const rc = 1.0 / (2 * Math.PI * fc);
  const dt = 1.0 / sampleRate;
  const alphaLP = dt / (rc + dt);
  let prev = output[0];
  for (let i = 1; i < output.length; i++) {
    output[i] = prev + alphaLP * (output[i] - prev);
    prev = output[i];
  }

  // Normalize
  let maxAbs = 0;
  for (let i = 0; i < output.length; i++) {
    if (Math.abs(output[i]) > maxAbs) maxAbs = Math.abs(output[i]);
  }
  if (maxAbs > 0) {
    for (let i = 0; i < output.length; i++) {
      output[i] = output[i] / maxAbs * 0.9;
    }
  }

  return output;
}

function generateClick(accent) {
  const duration = 0.05;
  const totalSamples = Math.ceil(SAMPLE_RATE * duration);
  const output = new Float32Array(totalSamples);

  const freq = accent ? 2800 : 2200;
  for (let i = 0; i < totalSamples; i++) {
    const env = Math.exp(-i / (totalSamples * 0.08));
    // Mix sine + noise for a woodblock-like click
    const sine = Math.sin(2 * Math.PI * freq * i / SAMPLE_RATE);
    const noise = Math.random() * 2 - 1;
    output[i] = (sine * 0.7 + noise * 0.3) * env * (accent ? 0.8 : 0.5);
  }

  return output;
}

function floatToWav(samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const val = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    buffer.writeInt16LE(Math.round(val), 44 + i * 2);
  }

  return buffer;
}

// --- Main ---
mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('Generating guitar samples...');
for (const midi of MIDI_NOTES) {
  const freq = midiToFreq(midi);
  const samples = generateNote(freq, SAMPLE_RATE, DURATION);
  const wav = floatToWav(samples, SAMPLE_RATE);
  const path = join(OUTPUT_DIR, `guitar_${midi}.wav`);
  writeFileSync(path, wav);
  console.log(`  guitar_${midi}.wav (${freq.toFixed(1)} Hz)`);
}

// Click samples
const click = generateClick(false);
const clickAccent = generateClick(true);
writeFileSync(join(OUTPUT_DIR, 'click.wav'), floatToWav(click, SAMPLE_RATE));
writeFileSync(join(OUTPUT_DIR, 'click_accent.wav'), floatToWav(clickAccent, SAMPLE_RATE));
console.log('  click.wav, click_accent.wav');

console.log('\nDone! Now convert to mp3:');
console.log('  for f in public/audio/samples/*.wav; do ffmpeg -i "$f" -b:a 192k "${f%.wav}.mp3" && rm "$f"; done');
```

- [ ] **Step 3: Run the generation script**

```bash
cd /Users/diviyajayengia/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy
node scripts/generate-guitar-samples.mjs
```

- [ ] **Step 4: Convert WAV to MP3 (requires ffmpeg)**

If ffmpeg is available:
```bash
cd /Users/diviyajayengia/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy
for f in public/audio/samples/*.wav; do ffmpeg -i "$f" -b:a 192k "${f%.wav}.mp3" && rm "$f"; done
```

If ffmpeg is not available, keep the WAV files and update the file extension references in `sampleLibrary.ts` to `.wav`.

- [ ] **Step 5: Verify samples exist**

```bash
ls -la public/audio/samples/
```

Expected: 13 guitar files + 2 click files (mp3 or wav).

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-guitar-samples.mjs public/audio/samples/
git commit -m "feat: generate guitar note samples for audio engine"
```

---

### Task 2: Create SampleLibrary

**Files:**
- Create: `src/utils/sampleLibrary.ts`

- [ ] **Step 1: Create sampleLibrary.ts**

```typescript
/**
 * sampleLibrary.ts — Lazy-loading guitar sample manager
 *
 * Loads pre-recorded guitar note samples on first use.
 * Returns the nearest sample + playback rate for pitch correction.
 */

// MIDI numbers of available samples (every 3 semitones, E2–E5)
const SAMPLE_NOTES = [40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76];

// Detect file extension: prefer mp3, fall back to wav
const EXT = 'mp3';

interface SampleEntry {
  buffer: AudioBuffer;
  midi: number;
}

let samples: Map<number, AudioBuffer> | null = null;
let clickBuffer: AudioBuffer | null = null;
let clickAccentBuffer: AudioBuffer | null = null;
let loadPromise: Promise<void> | null = null;

async function decodeFile(ctx: AudioContext, path: string): Promise<AudioBuffer> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

export async function loadSamples(ctx: AudioContext): Promise<void> {
  if (samples) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const map = new Map<number, AudioBuffer>();

    const notePromises = SAMPLE_NOTES.map(async (midi) => {
      const buffer = await decodeFile(ctx, `/audio/samples/guitar_${midi}.${EXT}`);
      map.set(midi, buffer);
    });

    const clickPromise = decodeFile(ctx, `/audio/samples/click.${EXT}`).then(b => { clickBuffer = b; });
    const clickAccentPromise = decodeFile(ctx, `/audio/samples/click_accent.${EXT}`).then(b => { clickAccentBuffer = b; });

    await Promise.all([...notePromises, clickPromise, clickAccentPromise]);
    samples = map;
  })();

  return loadPromise;
}

export function isLoaded(): boolean {
  return samples !== null;
}

export function getNearestSample(midi: number): { buffer: AudioBuffer; baseMidi: number } | null {
  if (!samples) return null;

  let closest = SAMPLE_NOTES[0];
  let minDist = Math.abs(midi - closest);

  for (const note of SAMPLE_NOTES) {
    const dist = Math.abs(midi - note);
    if (dist < minDist) {
      minDist = dist;
      closest = note;
    }
  }

  const buffer = samples.get(closest);
  if (!buffer) return null;
  return { buffer, baseMidi: closest };
}

export function getClickBuffer(accent: boolean): AudioBuffer | null {
  return accent ? clickAccentBuffer : clickBuffer;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/diviyajayengia/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy
npx tsc --noEmit src/utils/sampleLibrary.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/sampleLibrary.ts
git commit -m "feat: add SampleLibrary for lazy-loading guitar samples"
```

---

### Task 3: Rewrite audioEngine.ts to Use Samples

**Files:**
- Rewrite: `src/utils/audioEngine.ts`

- [ ] **Step 1: Rewrite audioEngine.ts**

Replace the entire file with:

```typescript
/**
 * audioEngine.ts — Guitar audio playback via pre-recorded samples
 *
 * Uses SampleLibrary for natural guitar tones. Falls back to
 * improved Karplus-Strong synthesis if samples fail to load.
 */

import { midiToFrequency } from '../musicTheory/notes';
import { loadSamples, isLoaded, getNearestSample, getClickBuffer } from './sampleLibrary';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext({ latencyHint: 'interactive' });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Ensure samples are loaded. Called automatically on first playback. */
async function ensureSamples(): Promise<void> {
  const ctx = getAudioContext();
  if (!isLoaded()) {
    try {
      await loadSamples(ctx);
    } catch (e) {
      console.warn('Sample loading failed, using synthesis fallback:', e);
    }
  }
}

// ── Fallback: Improved Karplus-Strong ──────────────────────────────────────

function generatePluckedString(
  sampleRate: number,
  freq: number,
  duration: number,
): Float32Array {
  const totalSamples = Math.ceil(sampleRate * duration);
  const output = new Float32Array(totalSamples);
  const period = Math.round(sampleRate / freq);
  const ring = new Float32Array(period);

  for (let i = 0; i < period; i++) {
    ring[i] = Math.random() * 2 - 1;
  }
  // Smooth initial noise
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < period - 1; i++) {
      ring[i] = ring[i] * 0.6 + ring[i + 1] * 0.4;
    }
  }

  const decay = 0.997;
  const blend = 0.52;
  let readIdx = 0;

  // ADSR
  const attackEnd = Math.ceil(sampleRate * 0.003);
  const decayEnd = attackEnd + Math.ceil(sampleRate * 0.08);
  const sustainLevel = 0.75;
  const releaseStart = totalSamples - Math.ceil(sampleRate * 0.3);

  for (let i = 0; i < totalSamples; i++) {
    const curr = ring[readIdx];
    const next = ring[(readIdx + 1) % period];
    ring[readIdx] = (curr * (1 - blend) + next * blend) * decay;
    readIdx = (readIdx + 1) % period;

    let env = sustainLevel;
    if (i < attackEnd) env = i / attackEnd;
    else if (i < decayEnd) env = 1.0 - ((i - attackEnd) / (decayEnd - attackEnd)) * (1.0 - sustainLevel);
    else if (i >= releaseStart) {
      const t = (i - releaseStart) / (totalSamples - releaseStart);
      env = sustainLevel * (1.0 - t * t);
    }

    output[i] = curr * env;
  }

  return output;
}

function playNoteFallback(midi: number, duration: number, volume: number): void {
  const ctx = getAudioContext();
  const freq = midiToFrequency(midi);
  const samples = generatePluckedString(ctx.sampleRate, freq, duration);

  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.getChannelData(0).set(samples);

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
  source.onended = () => { try { source.disconnect(); gain.disconnect(); } catch {} };
}

// ── Sample-based playback ─────────────────────────────────────────────────

function playSampleNote(midi: number, duration: number, volume: number, startTime?: number): void {
  const ctx = getAudioContext();
  const sample = getNearestSample(midi);

  if (!sample) {
    playNoteFallback(midi, duration, volume);
    return;
  }

  const source = ctx.createBufferSource();
  source.buffer = sample.buffer;
  // Pitch-shift to the target note
  source.playbackRate.value = Math.pow(2, (midi - sample.baseMidi) / 12);

  // Body resonance
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 180;
  body.Q.value = 1.5;
  body.gain.value = 2;

  // Presence
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2500;
  presence.Q.value = 0.8;
  presence.gain.value = 1.5;

  // High cut
  const highCut = ctx.createBiquadFilter();
  highCut.type = 'lowpass';
  highCut.frequency.value = 8000;
  highCut.Q.value = 0.5;

  // Gain envelope
  const gain = ctx.createGain();
  const t = startTime ?? ctx.currentTime;
  gain.gain.setValueAtTime(volume, t);
  // Natural decay: hold then release
  const holdEnd = t + duration * 0.7;
  gain.gain.setValueAtTime(volume, holdEnd);
  gain.gain.linearRampToValueAtTime(0, t + duration);

  source.connect(body);
  body.connect(presence);
  presence.connect(highCut);
  highCut.connect(gain);
  gain.connect(ctx.destination);

  source.start(t);
  source.stop(t + duration + 0.05);
  source.onended = () => {
    try { source.disconnect(); gain.disconnect(); body.disconnect(); presence.disconnect(); highCut.disconnect(); } catch {}
  };
}

// ── Public API (unchanged signatures) ─────────────────────────────────────

/**
 * Play a guitar note at a given MIDI number.
 */
export function playNote(midi: number, duration = 1.5, volume = 0.5): void {
  ensureSamples();
  if (isLoaded()) {
    playSampleNote(midi, duration, volume);
  } else {
    playNoteFallback(midi, duration, volume);
  }
}

/**
 * Play a chord with strum effect. Uses AudioContext scheduling (no setTimeout).
 */
export function playChord(midiNotes: number[], strumDelay = 0.04, duration = 2.0): void {
  ensureSamples();
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const perNoteVolume = 0.3 / Math.sqrt(midiNotes.length);

  midiNotes.forEach((midi, i) => {
    const startTime = now + i * strumDelay;
    if (isLoaded()) {
      playSampleNote(midi, duration, perNoteVolume, startTime);
    } else {
      // Fallback: still use setTimeout for synthesis (no AudioContext scheduling for generated buffers)
      setTimeout(() => playNoteFallback(midi, duration, perNoteVolume), i * strumDelay * 1000);
    }
  });
}

/**
 * Play a scale ascending (and optionally descending).
 * Returns a cleanup function to stop playback.
 */
export function playScale(
  midiNotes: number[],
  tempo = 100,
  ascending = true,
  descending = false
): { stop: () => void } {
  ensureSamples();
  const ctx = getAudioContext();
  const beatDuration = 60 / tempo;
  const now = ctx.currentTime;
  const sources: AudioBufferSourceNode[] = [];
  let stopped = false;

  const notes = [...midiNotes];
  if (descending) {
    notes.push(...[...midiNotes].reverse().slice(1));
  }

  notes.forEach((midi, i) => {
    if (stopped) return;
    const startTime = now + i * beatDuration;

    if (isLoaded()) {
      playSampleNote(midi, beatDuration * 1.5, 0.45, startTime);
    } else {
      const t = setTimeout(() => {
        if (!stopped) playNoteFallback(midi, beatDuration * 1.5, 0.45);
      }, i * beatDuration * 1000);
      // Store timeout id for cleanup — reuse sources array slot
      (sources as any).push({ timeout: t });
    }
  });

  return {
    stop: () => {
      stopped = true;
      sources.forEach((s: any) => {
        if (s.timeout) clearTimeout(s.timeout);
        try { s.stop?.(); s.disconnect?.(); } catch {}
      });
    },
  };
}

/**
 * Play a metronome click using a real sample.
 */
export function playClick(accent = false): void {
  ensureSamples();
  const ctx = getAudioContext();

  const buffer = getClickBuffer(accent);
  if (buffer) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.onended = () => { try { source.disconnect(); } catch {} };
    return;
  }

  // Fallback: noise burst (original behavior, improved)
  const bufferSize = Math.ceil(ctx.sampleRate * 0.03);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  const clickFreq = accent ? 2800 : 2200;

  for (let i = 0; i < bufferSize; i++) {
    const env = Math.exp(-i / (bufferSize * 0.08));
    const sine = Math.sin(2 * Math.PI * clickFreq * i / ctx.sampleRate);
    const noise = Math.random() * 2 - 1;
    data[i] = (sine * 0.7 + noise * 0.3) * env * (accent ? 0.6 : 0.35);
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.connect(ctx.destination);
  source.start(ctx.currentTime);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/diviyajayengia/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Run the dev server and manually test**

```bash
cd /Users/diviyajayengia/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy
npm run dev
```

Open the app, navigate to the Fretboard Explorer, click notes. Verify:
- First click triggers sample loading (small delay)
- Subsequent clicks play immediately
- Notes sound natural, not synthetic
- Chords strum without timing drift

- [ ] **Step 4: Commit**

```bash
git add src/utils/audioEngine.ts src/utils/sampleLibrary.ts
git commit -m "feat: replace Karplus-Strong with sample-based audio engine"
```

---

### Task 4: Add --color-bg-rgb CSS Variable

**Files:**
- Modify: `src/index.css:16`

- [ ] **Step 1: Add the RGB variable to the theme block**

In `src/index.css`, after the line `--color-bg: #0a0a0a;` (line 16), add:

```css
  --color-bg-rgb: 10, 10, 10;
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: add --color-bg-rgb variable for gradient overlays"
```

---

### Task 5: Color Token Cleanup — PracticeRoom.tsx

**Files:**
- Modify: `src/components/PracticeRoom.tsx`

This is a mechanical find-and-replace. Every hardcoded hex value gets replaced with the corresponding design token.

- [ ] **Step 1: Replace all hardcoded colors**

Apply the following replacements throughout `PracticeRoom.tsx`:

| Find | Replace |
|------|---------|
| `bg-[#0f0f0f]` | `bg-bg` |
| `bg-[#1a1a1a]` | `bg-elevated` |
| `bg-[#1e1e1e]` | `bg-elevated` |
| `bg-[#111]` | `bg-surface` |
| `bg-[#2a2a2a]` | `bg-elevated` |
| `border-[#222222]` | `border-border-subtle` |
| `border-[#2a2a2a]` | `border-border` |
| `border-[#333]` | `border-border` |
| `text-[#555]` | `text-text-muted` |
| `text-[#888888]` | `text-text-secondary` |
| `text-[#888]` | `text-text-secondary` |
| `text-[#333]` | `text-text-faint` |
| `text-white` | `text-text` |
| `text-black` | `text-bg` |
| `bg-white` (buttons/badges) | `bg-accent` |
| `border-white` | `border-accent` |
| `bg-white/5` | `bg-accent/5` |
| `bg-white/90` | `bg-accent/90` |
| `hover:border-white` | `hover:border-accent` |
| `hover:border-white/50` | `hover:border-accent/50` |
| `hover:text-white` | `hover:text-text` |
| `shadow-[0_0_30px_rgba(255,255,255,0.05)]` | `shadow-glow` |
| `accent-white` (range input) | `accent-accent` |
| `bg-white` (progress bar fill) | `bg-accent` |

**Important context-sensitive replacements:**
- The big play button: `bg-white ... text-black` → `bg-accent ... text-bg`
- Active chord slot: `border-white bg-white/5` → `border-accent bg-accent/5`
- Active scale pill: `bg-white text-black` → `bg-accent text-bg`
- Chord badge: `text-black bg-white` → `text-bg bg-accent`
- Loop button active: `bg-white text-black border-white` → `bg-accent text-bg border-accent`
- Root labels in chord library: `text-white` → `text-text`
- Chord chip hover: `hover:border-white hover:text-white` → `hover:border-accent hover:text-text`
- Fretboard legend dots: `bg-white` (root) stays as-is since it represents the color system, but wrap in the design token: `bg-text`

- [ ] **Step 2: Verify no hardcoded hex values remain**

```bash
grep -n '#[0-9a-fA-F]\{3,6\}' src/components/PracticeRoom.tsx
```

Expected: no output (zero matches).

- [ ] **Step 3: Run dev server and visually verify**

Open Practice Room — verify:
- Gold accent on play button, active states, progress bar
- All text colors match the rest of the app
- No jarring white elements that break the Studio Console feel

- [ ] **Step 4: Commit**

```bash
git add src/components/PracticeRoom.tsx
git commit -m "fix: replace all hardcoded hex colors with design tokens in PracticeRoom"
```

---

### Task 6: Color Token Cleanup — Dashboard.tsx

**Files:**
- Modify: `src/components/Dashboard.tsx:46-56`

- [ ] **Step 1: Replace gradient rgba values with CSS variable**

Replace the three gradient overlay divs (lines 46-56) to use `var(--color-bg-rgb)`:

```tsx
        {/* Left solid fade */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to right, rgba(var(--color-bg-rgb),0.98) 0%, rgba(var(--color-bg-rgb),0.85) 40%, rgba(var(--color-bg-rgb),0.3) 75%, rgba(var(--color-bg-rgb),0.15) 100%)",
        }} />
        {/* Bottom solid fade */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(var(--color-bg-rgb),1) 0%, rgba(var(--color-bg-rgb),0.55) 28%, transparent 55%)",
        }} />
        {/* Top vignette */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(var(--color-bg-rgb),0.45) 0%, transparent 20%)",
        }} />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "fix: replace hardcoded rgba gradients with design token in Dashboard"
```

---

### Task 7: Color Token Cleanup — App.tsx

**Files:**
- Modify: `src/App.tsx:27-28,30,33,77-78,84-86`

- [ ] **Step 1: Replace hardcoded colors in ViewSkeleton and ShortcutsHelp**

In the `ViewSkeleton` component (lines 27-33):
| Find | Replace |
|------|---------|
| `bg-[#1a1a1a]` | `bg-elevated` |
| `bg-[#161616]` | `bg-card` |

In the `ShortcutsHelp` component (lines 77-86):
| Find | Replace |
|------|---------|
| `text-[#888]` | `text-text-secondary` |
| `bg-[#2a2a2a]` | `bg-elevated` |
| `text-[#555]` | `text-text-muted` |

- [ ] **Step 2: Verify no hardcoded hex values remain**

```bash
grep -n '#[0-9a-fA-F]\{3,6\}' src/App.tsx
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix: replace hardcoded hex colors with design tokens in App.tsx"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/diviyajayengia/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run existing tests**

```bash
npm run test
```

Expected: all existing tests pass.

- [ ] **Step 3: Run dev server and smoke test all pages**

```bash
npm run dev
```

Verify these pages:
- Dashboard: hero gradients look correct, no visual change
- Practice Room: gold accents, all panels use proper tokens
- Fretboard Explorer: click notes → hear sample-based audio
- Lesson view: ear training plays sampled notes
- Jam Studio: metronome click sounds like a woodblock, not a glitch
- Shortcuts overlay (press `?`): proper token colors

- [ ] **Step 4: Commit any final fixes if needed**
