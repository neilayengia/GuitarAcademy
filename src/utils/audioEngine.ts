/**
 * audioEngine.ts — Guitar audio playback via pre-recorded samples
 *
 * Uses SampleLibrary for natural guitar tones. Falls back to
 * improved Karplus-Strong synthesis if samples fail to load.
 */

import { midiToFrequency } from '../musicTheory/notes';
import { loadSamples, isLoaded, getNearestSample, getClickBuffer } from './sampleLibrary';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let unlocked = false;
const audioFileCache = new Map<string, Promise<AudioBuffer>>();

export interface PlaybackHandle {
    stop: (fadeSeconds?: number) => void;
}

export interface AudioSequenceStep {
    id: string;
    url: string;
}

export interface AudioSequenceController extends PlaybackHandle {
    skipTo: (stepIndex: number) => void;
    setVolume: (volume: number) => void;
}

function getMasterOutput(ctx: AudioContext): AudioNode {
    if (!masterGain || !compressor) {
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.92;

        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.knee.value = 18;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.008;
        compressor.release.value = 0.12;

        masterGain.connect(compressor);
        compressor.connect(ctx.destination);
    }

    return masterGain;
}

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext({ latencyHint: 'interactive' });
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    getMasterOutput(audioCtx);
    return audioCtx;
}

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

export function preloadAudioEngine(): Promise<void> {
    return ensureSamples();
}

export function unlockAudioEngine(): void {
    const ctx = getAudioContext();
    if (unlocked) return;

    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    gain.gain.value = 0;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(getMasterOutput(ctx));
    source.start(ctx.currentTime);
    source.onended = () => {
        try {
            source.disconnect();
            gain.disconnect();
        } catch {}
    };

    unlocked = true;
}

export function getAudioTime(): number {
    return getAudioContext().currentTime;
}

export function loadAudioFile(path: string): Promise<AudioBuffer> {
    const cached = audioFileCache.get(path);
    if (cached) return cached;

    const promise = (async () => {
        const ctx = getAudioContext();
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        return ctx.decodeAudioData(arrayBuffer);
    })();

    audioFileCache.set(path, promise);
    return promise;
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
    for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < period - 1; i++) {
            ring[i] = ring[i] * 0.6 + ring[i + 1] * 0.4;
        }
    }

    const decay = 0.997;
    const blend = 0.52;
    let readIdx = 0;

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

function stopSource(source: AudioBufferSourceNode, gain: GainNode, fadeSeconds = 0.03): void {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
        source.stop(now + fadeSeconds + 0.01);
    } catch {}
}

function playDecodedBuffer(
    buffer: AudioBuffer,
    volume: number,
    startTime?: number,
): PlaybackHandle & { setVolume: (volume: number) => void; startTime: number; duration: number } {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const t = startTime ?? ctx.currentTime;

    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), t);

    source.connect(gain);
    gain.connect(getMasterOutput(ctx));
    source.start(t);
    source.onended = () => {
        try {
            source.disconnect();
            gain.disconnect();
        } catch {}
    };

    return {
        startTime: t,
        duration: buffer.duration,
        setVolume: (nextVolume: number) => {
            const now = ctx.currentTime;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setTargetAtTime(Math.max(0.0001, nextVolume), now, 0.01);
        },
        stop: (fadeSeconds?: number) => stopSource(source, gain, fadeSeconds),
    };
}

function playNoteFallback(midi: number, duration: number, volume: number, startTime?: number): PlaybackHandle {
    const ctx = getAudioContext();
    const freq = midiToFrequency(midi);
    const samples = generatePluckedString(ctx.sampleRate, freq, duration);

    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    const t = startTime ?? ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t + 0.008);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), t + Math.max(0.01, duration * 0.72));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.connect(gain);
    gain.connect(getMasterOutput(ctx));
    source.start(t);
    source.stop(t + duration + 0.05);
    source.onended = () => { try { source.disconnect(); gain.disconnect(); } catch {} };

    return { stop: (fadeSeconds?: number) => stopSource(source, gain, fadeSeconds) };
}

// ── Sample-based playback ─────────────────────────────────────────────────

function playSampleNote(midi: number, duration: number, volume: number, startTime?: number): PlaybackHandle {
    const ctx = getAudioContext();
    const sample = getNearestSample(midi);

    if (!sample) {
        return playNoteFallback(midi, duration, volume, startTime);
    }

    const source = ctx.createBufferSource();
    source.buffer = sample.buffer;
    source.playbackRate.value = Math.pow(2, (midi - sample.baseMidi) / 12);

    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 180;
    body.Q.value = 1.5;
    body.gain.value = 2;

    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2500;
    presence.Q.value = 0.8;
    presence.gain.value = 1.5;

    const highCut = ctx.createBiquadFilter();
    highCut.type = 'lowpass';
    highCut.frequency.value = 8000;
    highCut.Q.value = 0.5;

    const gain = ctx.createGain();
    const t = startTime ?? ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t + 0.006);
    const holdEnd = t + duration * 0.7;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), holdEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.connect(body);
    body.connect(presence);
    presence.connect(highCut);
    highCut.connect(gain);
    gain.connect(getMasterOutput(ctx));

    source.start(t);
    source.stop(t + duration + 0.05);
    source.onended = () => {
        try { source.disconnect(); gain.disconnect(); body.disconnect(); presence.disconnect(); highCut.disconnect(); } catch {}
    };

    return { stop: (fadeSeconds?: number) => stopSource(source, gain, fadeSeconds) };
}

// ── Public API (unchanged signatures) ─────────────────────────────────────

export function playNote(midi: number, duration = 1.5, volume = 0.5): PlaybackHandle {
    ensureSamples();
    if (isLoaded()) {
        return playSampleNote(midi, duration, volume);
    }
    return playNoteFallback(midi, duration, volume);
}

export function playChord(midiNotes: number[], strumDelay = 0.04, duration = 2.0): PlaybackHandle {
    ensureSamples();
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const perNoteVolume = 0.3 / Math.sqrt(midiNotes.length);
    const handles: PlaybackHandle[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    midiNotes.forEach((midi, i) => {
        const startTime = now + i * strumDelay;
        if (isLoaded()) {
            handles.push(playSampleNote(midi, duration, perNoteVolume, startTime));
        } else {
            const timer = setTimeout(() => {
                handles.push(playNoteFallback(midi, duration, perNoteVolume));
            }, i * strumDelay * 1000);
            timers.push(timer);
        }
    });

    return {
        stop: (fadeSeconds?: number) => {
            timers.forEach(clearTimeout);
            handles.forEach(handle => handle.stop(fadeSeconds));
        },
    };
}

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
    let stopped = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const handles: PlaybackHandle[] = [];

    const notes = [...midiNotes];
    if (descending) {
        notes.push(...[...midiNotes].reverse().slice(1));
    }

    notes.forEach((midi, i) => {
        if (stopped) return;
        const startTime = now + i * beatDuration;

        if (isLoaded()) {
            handles.push(playSampleNote(midi, beatDuration * 1.5, 0.45, startTime));
        } else {
            const t = setTimeout(() => {
                if (!stopped) handles.push(playNoteFallback(midi, beatDuration * 1.5, 0.45));
            }, i * beatDuration * 1000);
            timeouts.push(t);
        }
    });

    return {
        stop: () => {
            stopped = true;
            timeouts.forEach(clearTimeout);
            handles.forEach(handle => handle.stop(0.02));
        },
    };
}

export function playClick(accent = false, startTime?: number): PlaybackHandle {
    ensureSamples();
    const ctx = getAudioContext();
    const t = startTime ?? ctx.currentTime;

    const buffer = getClickBuffer(accent);
    if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = accent ? 0.7 : 0.48;
        source.connect(gain);
        gain.connect(getMasterOutput(ctx));
        source.start(t);
        source.onended = () => { try { source.disconnect(); } catch {} };
        return { stop: () => { try { source.stop(); } catch {} } };
    }

    // Fallback: improved click
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
    source.connect(getMasterOutput(ctx));
    source.start(t);

    return { stop: () => { try { source.stop(); } catch {} } };
}

export async function createAudioSequencePlayer(
    steps: AudioSequenceStep[],
    options: {
        startIndex?: number;
        loop?: boolean;
        volume?: number;
        onStepStart?: (stepIndex: number, step: AudioSequenceStep, durationSeconds: number) => void;
        onProgress?: (stepIndex: number, progress: number) => void;
        onEnded?: () => void;
        onError?: (error: unknown) => void;
    } = {},
): Promise<AudioSequenceController> {
    unlockAudioEngine();

    const playableSteps = steps.filter(step => step.url);
    const buffers = await Promise.all(playableSteps.map(step => loadAudioFile(step.url)));
    const ctx = getAudioContext();

    let stopped = false;
    let currentIndex = Math.min(Math.max(options.startIndex ?? 0, 0), Math.max(playableSteps.length - 1, 0));
    let current: ReturnType<typeof playDecodedBuffer> | null = null;
    let endedTimer: number | null = null;
    let progressFrame: number | null = null;
    let volume = options.volume ?? 0.75;

    const cancelTimers = () => {
        if (endedTimer !== null) window.clearTimeout(endedTimer);
        if (progressFrame !== null) window.cancelAnimationFrame(progressFrame);
        endedTimer = null;
        progressFrame = null;
    };

    const stopCurrent = (fadeSeconds = 0.03) => {
        cancelTimers();
        current?.stop(fadeSeconds);
        current = null;
    };

    const scheduleProgress = () => {
        if (!current) return;

        const tick = () => {
            if (stopped || !current) return;
            const progress = Math.min(1, Math.max(0, (ctx.currentTime - current.startTime) / current.duration));
            options.onProgress?.(currentIndex, progress);
            if (progress < 1) progressFrame = window.requestAnimationFrame(tick);
        };

        progressFrame = window.requestAnimationFrame(tick);
    };

    const playIndex = (stepIndex: number) => {
        if (stopped || playableSteps.length === 0) return;

        stopCurrent(0.015);
        currentIndex = Math.min(Math.max(stepIndex, 0), playableSteps.length - 1);
        const buffer = buffers[currentIndex];
        const startTime = ctx.currentTime + 0.02;

        current = playDecodedBuffer(buffer, volume, startTime);
        options.onStepStart?.(currentIndex, playableSteps[currentIndex], buffer.duration);
        options.onProgress?.(currentIndex, 0);
        scheduleProgress();

        endedTimer = window.setTimeout(() => {
            if (stopped) return;
            const nextIndex = currentIndex + 1;
            if (nextIndex < playableSteps.length) {
                playIndex(nextIndex);
            } else if (options.loop) {
                playIndex(0);
            } else {
                stopCurrent(0.01);
                options.onEnded?.();
            }
        }, (buffer.duration + 0.04) * 1000);
    };

    const controller: AudioSequenceController = {
        skipTo: (stepIndex: number) => {
            playIndex(stepIndex);
        },
        setVolume: (nextVolume: number) => {
            volume = nextVolume;
            current?.setVolume(nextVolume);
        },
        stop: (fadeSeconds?: number) => {
            stopped = true;
            stopCurrent(fadeSeconds);
        },
    };

    try {
        playIndex(currentIndex);
    } catch (error) {
        options.onError?.(error);
        throw error;
    }

    return controller;
}
