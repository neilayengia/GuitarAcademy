/**
 * sampleLibrary.ts — Lazy-loading guitar sample manager
 *
 * Loads pre-recorded guitar note samples on first use.
 * Returns the nearest sample + playback rate for pitch correction.
 */

const SAMPLE_NOTES = [40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 73, 76];
const EXT = 'wav';

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

    const clickPromise = decodeFile(ctx, `/audio/samples/click.${EXT}`)
      .then(b => { clickBuffer = b; });
    const clickAccentPromise = decodeFile(ctx, `/audio/samples/click_accent.${EXT}`)
      .then(b => { clickAccentBuffer = b; });

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
