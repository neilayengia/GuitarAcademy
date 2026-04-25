/**
 * generate-guitar-samples.mjs
 *
 * Generates guitar-like samples using improved Karplus-Strong with
 * ADSR envelope, body resonance, and saves as WAV.
 *
 * Run: node scripts/generate-guitar-samples.mjs
 * Convert: for f in public/audio/samples/*.wav; do ffmpeg -i "$f" -b:a 192k "${f%.wav}.mp3" && rm "$f"; done
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SAMPLE_RATE = 44100;
const DURATION = 2.5;
const OUTPUT_DIR = 'public/audio/samples';

const MIDI_NOTES = [40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function generateNote(freq, sampleRate, duration) {
  const totalSamples = Math.ceil(sampleRate * duration);
  const output = new Float32Array(totalSamples);
  const period = Math.round(sampleRate / freq);
  const ring = new Float32Array(period);

  // Band-limited noise init
  for (let i = 0; i < period; i++) {
    ring[i] = Math.random() * 2 - 1;
  }
  // Smooth for warmth
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < period - 1; i++) {
      ring[i] = ring[i] * 0.6 + ring[i + 1] * 0.4;
    }
  }

  const decay = 0.998;
  const blend = 0.52;
  let readIdx = 0;

  const attackEnd = Math.ceil(sampleRate * 0.003);
  const decayEnd = attackEnd + Math.ceil(sampleRate * 0.08);
  const sustainLevel = 0.75;
  const releaseStart = totalSamples - Math.ceil(sampleRate * 0.4);

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

  return applyResonance(output, sampleRate);
}

function applyResonance(samples, sampleRate) {
  const output = new Float32Array(samples.length);

  // Biquad peaking at 180Hz (guitar body)
  const f0 = 180, Q = 1.2, gainDb = 3;
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * f0 / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);

  const b0 = 1 + alpha * A, b1 = -2 * Math.cos(w0), b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A, a1 = -2 * Math.cos(w0), a2 = 1 - alpha / A;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = (b0/a0)*x + (b1/a0)*x1 + (b2/a0)*x2 - (a1/a0)*y1 - (a2/a0)*y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    output[i] = y;
  }

  // Lowpass at 7kHz
  const rc = 1.0 / (2 * Math.PI * 7000);
  const dt = 1.0 / sampleRate;
  const alphaLP = dt / (rc + dt);
  let prev = output[0];
  for (let i = 1; i < output.length; i++) {
    output[i] = prev + alphaLP * (output[i] - prev);
    prev = output[i];
  }

  // Normalize
  let maxAbs = 0;
  for (let i = 0; i < output.length; i++) if (Math.abs(output[i]) > maxAbs) maxAbs = Math.abs(output[i]);
  if (maxAbs > 0) for (let i = 0; i < output.length; i++) output[i] = output[i] / maxAbs * 0.9;

  return output;
}

function generateClick(accent) {
  const duration = 0.05;
  const totalSamples = Math.ceil(SAMPLE_RATE * duration);
  const output = new Float32Array(totalSamples);
  const freq = accent ? 2800 : 2200;

  for (let i = 0; i < totalSamples; i++) {
    const env = Math.exp(-i / (totalSamples * 0.08));
    const sine = Math.sin(2 * Math.PI * freq * i / SAMPLE_RATE);
    const noise = Math.random() * 2 - 1;
    output[i] = (sine * 0.7 + noise * 0.3) * env * (accent ? 0.8 : 0.5);
  }
  return output;
}

function floatToWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const val = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    buffer.writeInt16LE(Math.round(val), 44 + i * 2);
  }
  return buffer;
}

mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('Generating guitar samples...');
for (const midi of MIDI_NOTES) {
  const freq = midiToFreq(midi);
  const samples = generateNote(freq, SAMPLE_RATE, DURATION);
  const wav = floatToWav(samples, SAMPLE_RATE);
  writeFileSync(join(OUTPUT_DIR, `guitar_${midi}.wav`), wav);
  console.log(`  guitar_${midi}.wav (${freq.toFixed(1)} Hz)`);
}

const click = generateClick(false);
const clickAccent = generateClick(true);
writeFileSync(join(OUTPUT_DIR, 'click.wav'), floatToWav(click, SAMPLE_RATE));
writeFileSync(join(OUTPUT_DIR, 'click_accent.wav'), floatToWav(clickAccent, SAMPLE_RATE));
console.log('  click.wav, click_accent.wav');
console.log('\nDone! Convert to mp3 with:');
console.log('  for f in public/audio/samples/*.wav; do ffmpeg -i "$f" -b:a 192k "${f%.wav}.mp3" && rm "$f"; done');
