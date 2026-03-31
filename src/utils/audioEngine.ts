/**
 * audioEngine.ts — Karplus-Strong string synthesis (buffer-based)
 *
 * Pre-computes the plucked string waveform offline for precise control
 * and natural guitar-like tone. No oscillators, no feedback loops.
 */

import { midiToFrequency } from '../musicTheory/notes';

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

/**
 * Pre-compute a Karplus-Strong plucked string waveform.
 *
 * Algorithm:
 * 1. Fill a ring buffer (length = sampleRate/freq) with noise
 * 2. For each output sample, read from the ring buffer
 * 3. Write back the average of current + next sample (lowpass filtering)
 * 4. This naturally creates harmonics and decay — sounds like a plucked string
 */
function generatePluckedString(
    sampleRate: number,
    freq: number,
    duration: number,
    brightness: number = 0.5, // 0 = very dark/mellow, 1 = very bright
    decay: number = 0.996,     // closer to 1 = longer sustain
): Float32Array {
    const totalSamples = Math.ceil(sampleRate * duration);
    const output = new Float32Array(totalSamples);

    // Ring buffer length = one period of the fundamental
    const period = Math.round(sampleRate / freq);
    const ringBuffer = new Float32Array(period);

    // Initialize ring buffer with shaped noise (the "pluck")
    for (let i = 0; i < period; i++) {
        ringBuffer[i] = Math.random() * 2 - 1;
    }

    // Optional: apply a simple lowpass to the initial noise for warmer attack
    if (brightness < 0.8) {
        const smoothing = 1 - brightness;
        for (let pass = 0; pass < Math.ceil(smoothing * 3); pass++) {
            for (let i = 0; i < period - 1; i++) {
                ringBuffer[i] = ringBuffer[i] * (1 - smoothing * 0.5) + ringBuffer[i + 1] * (smoothing * 0.5);
            }
        }
    }

    let readIndex = 0;

    // The blend factor controls how much lowpass filtering per sample
    // Higher = duller sound, faster decay of harmonics
    const blend = 0.5 + (1 - brightness) * 0.3;

    for (let i = 0; i < totalSamples; i++) {
        const curr = ringBuffer[readIndex];
        const next = ringBuffer[(readIndex + 1) % period];

        // Output the current sample
        output[i] = curr;

        // Karplus-Strong averaging filter + decay
        ringBuffer[readIndex] = (curr * (1 - blend) + next * blend) * decay;

        readIndex = (readIndex + 1) % period;
    }

    return output;
}

/**
 * Play a guitar-like plucked note at a given MIDI number.
 */
export function playNote(midi: number, duration = 1.5, volume = 0.5): void {
    const ctx = getAudioContext();
    const freq = midiToFrequency(midi);
    const now = ctx.currentTime;

    // Adjust brightness and decay based on register
    // Low notes: warmer, longer sustain. High notes: brighter, faster decay.
    const normalizedPitch = (midi - 40) / 48; // 0 = low E, 1 = very high
    const brightness = 0.3 + normalizedPitch * 0.4; // 0.3 to 0.7
    const decay = 0.997 - normalizedPitch * 0.003; // 0.997 to 0.994

    // Generate the waveform
    const sampleRate = ctx.sampleRate;
    const samples = generatePluckedString(sampleRate, freq, duration, brightness, decay);

    // Calculate effective generated frequency (correcting for integer rounding and filter phase delay)
    // The loop length is Math.round(sampleRate / freq).
    // The filter is a lowpass with phase advance = blend = 0.5 + (1 - brightness) * 0.3
    const period = Math.round(sampleRate / freq);
    const blend = 0.5 + (1 - brightness) * 0.3;
    const effectivePeriod = period - blend;
    const genFreq = sampleRate / effectivePeriod;

    // Create AudioBuffer from the computed samples
    const buffer = ctx.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Playback rate ensures perfect tuning regardless of rounded ring-buffer length
    source.playbackRate.value = freq / genFreq;

    // Body resonance — subtle warmth
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 180;
    body.Q.value = 1.5;
    body.gain.value = 2;

    // Presence boost for clarity
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2500;
    presence.Q.value = 0.8;
    presence.gain.value = 1.5;

    // Tame harsh highs
    const highCut = ctx.createBiquadFilter();
    highCut.type = 'lowpass';
    highCut.frequency.value = 8000;
    highCut.Q.value = 0.5;

    // Master volume
    const gain = ctx.createGain();
    gain.gain.value = volume;

    // Chain: source → body → presence → highCut → gain → output
    source.connect(body);
    body.connect(presence);
    presence.connect(highCut);
    highCut.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);

    // Cleanup
    source.onended = () => {
        try { source.disconnect(); gain.disconnect(); } catch {}
    };
}

/**
 * Play a chord with strum effect.
 */
export function playChord(midiNotes: number[], strumDelay = 0.04, duration = 2.0): void {
    midiNotes.forEach((midi, i) => {
        setTimeout(() => playNote(midi, duration, 0.3), i * strumDelay * 1000);
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
    const beatDuration = 60 / tempo;
    let stopped = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const notes = [...midiNotes];
    if (descending) {
        notes.push(...[...midiNotes].reverse().slice(1));
    }

    notes.forEach((midi, i) => {
        const t = setTimeout(() => {
            if (!stopped) playNote(midi, beatDuration * 1.5, 0.45);
        }, i * beatDuration * 1000);
        timeouts.push(t);
    });

    return {
        stop: () => {
            stopped = true;
            timeouts.forEach(clearTimeout);
        },
    };
}

/**
 * Play a metronome click.
 */
export function playClick(accent = false): void {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Use a short noise burst for a more natural "wood block" click
    const bufferSize = Math.ceil(ctx.sampleRate * 0.02);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    const clickFreq = accent ? 0.15 : 0.08;
    for (let i = 0; i < bufferSize; i++) {
        const env = Math.exp(-i / (bufferSize * 0.15));
        data[i] = (Math.random() * 2 - 1) * env * clickFreq;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = accent ? 3000 : 2000;
    filter.Q.value = 2;

    source.connect(filter);
    filter.connect(ctx.destination);
    source.start(now);
}
