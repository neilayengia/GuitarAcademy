/**
 * VoiceLeading.tsx — Voice leading pathway visualizer
 * Shows how notes move between chords in a progression
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';
import { playChord } from '../utils/audioEngine';

interface VLChord {
  label: string;
  notes: string[];
  midi: number[];
}

interface Progression {
  name: string;
  key: string;
  chords: VLChord[];
}

const PROGRESSIONS: Progression[] = [
  {
    name: 'ii-V-I Major', key: 'C Major',
    chords: [
      { label: 'Dm7', notes: ['C', 'A', 'F', 'D'], midi: [72, 69, 65, 62] },
      { label: 'G7', notes: ['B', 'G', 'F', 'D'], midi: [71, 67, 65, 62] },
      { label: 'Cmaj7', notes: ['B', 'G', 'E', 'C'], midi: [71, 67, 64, 60] },
    ],
  },
  {
    name: 'ii-V-I Minor', key: 'C Minor',
    chords: [
      { label: 'Dm7b5', notes: ['C', 'Ab', 'F', 'D'], midi: [72, 68, 65, 62] },
      { label: 'G7alt', notes: ['B', 'Ab', 'F', 'Db'], midi: [71, 68, 65, 61] },
      { label: 'Cm7', notes: ['Bb', 'G', 'Eb', 'C'], midi: [70, 67, 63, 60] },
    ],
  },
  {
    name: 'I-vi-ii-V', key: 'C Major',
    chords: [
      { label: 'Cmaj7', notes: ['B', 'G', 'E', 'C'], midi: [71, 67, 64, 60] },
      { label: 'Am7', notes: ['C', 'A', 'E', 'C'], midi: [72, 69, 64, 60] },
      { label: 'Dm7', notes: ['C', 'A', 'F', 'D'], midi: [72, 69, 65, 62] },
      { label: 'G7', notes: ['B', 'G', 'F', 'D'], midi: [71, 67, 65, 62] },
    ],
  },
  {
    name: 'Blues', key: 'C Blues',
    chords: [
      { label: 'C7', notes: ['Bb', 'G', 'E', 'C'], midi: [70, 67, 64, 60] },
      { label: 'F7', notes: ['A', 'F', 'Eb', 'C'], midi: [69, 65, 63, 60] },
      { label: 'G7', notes: ['B', 'G', 'F', 'D'], midi: [71, 67, 65, 62] },
    ],
  },
];

function midiToY(midi: number, min: number, max: number, h: number): number {
  const range = max - min || 1;
  return 30 + (h - 60) * (1 - (midi - min) / range);
}

export default function VoiceLeading() {
  const [preset, setPreset] = useState(0);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const prog = PROGRESSIONS[preset];
  const allMidi = prog.chords.flatMap(c => c.midi);
  const minM = Math.min(...allMidi) - 2;
  const maxM = Math.max(...allMidi) + 2;
  const H = 280;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handlePlay = useCallback(() => {
    if (playing) { timers.current.forEach(clearTimeout); setPlaying(false); return; }
    setPlaying(true);
    const ms = 1500;
    prog.chords.forEach((c, i) => {
      timers.current.push(setTimeout(() => { setActive(i); playChord(c.midi, 0.04, 2); }, i * ms));
    });
    timers.current.push(setTimeout(() => setPlaying(false), prog.chords.length * ms + 500));
  }, [playing, prog]);

  const reset = () => { timers.current.forEach(clearTimeout); setPlaying(false); setActive(0); };

  return (
    <div className="flex-1 p-8 lg:p-10 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-text-muted mb-3">Progression Analysis</p>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-3" style={{ letterSpacing: '-0.03em' }}>
          Voice Leading <span style={{ fontWeight: 300, opacity: 0.25 }}>Pathways</span>
        </h1>
        <p style={{ color: '#999', maxWidth: 520, margin: '0 auto', lineHeight: 1.6, fontSize: '0.95rem' }}>
          Visualize how individual notes transition smoothly between chords in standard progressions. Notice the minimal movement required.
        </p>
      </div>

      {/* Presets */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {PROGRESSIONS.map((p, i) => (
          <button key={p.name} onClick={() => { reset(); setPreset(i); }}
            style={{
              padding: '7px 18px', borderRadius: 999, fontSize: 13,
              fontWeight: preset === i ? 600 : 400,
              background: preset === i ? '#fff' : 'transparent',
              color: preset === i ? '#0a0a0a' : '#888',
              border: preset === i ? 'none' : '1px solid #2a2a2a',
            }}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Visualization */}
      <div className="card p-8 relative mx-auto" style={{ maxWidth: 900 }}>
        {/* Transport */}
        <div className="absolute top-5 right-5 flex gap-2">
          <button onClick={handlePlay}
            style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: playing ? '#fff' : '#1c1c1c', color: playing ? '#0a0a0a' : '#fff', border: `1px solid ${playing ? '#fff' : '#333'}` }}>
            {playing ? <Square size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
          </button>
          <button onClick={reset}
            style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#1c1c1c', color: '#888', border: '1px solid #333' }}>
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Chord columns with SVG lines */}
        <div style={{ position: 'relative', height: H + 50 }}>
          {/* SVG lines */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: H + 50, overflow: 'visible', pointerEvents: 'none' }}>
            {prog.chords.map((chord, ci) => {
              if (ci === 0) return null;
              const prev = prog.chords[ci - 1];
              const voices = Math.min(chord.midi.length, prev.midi.length);
              const cols = prog.chords.length;
              const px = ((ci - 1) / (cols - 1)) * 100;
              const cx = (ci / (cols - 1)) * 100;

              return Array.from({ length: voices }).map((_, vi) => {
                const y1 = midiToY(prev.midi[vi], minM, maxM, H) + 25;
                const y2 = midiToY(chord.midi[vi], minM, maxM, H) + 25;
                const isCommon = prev.midi[vi] === chord.midi[vi];
                return (
                  <line key={`${ci}-${vi}`}
                    x1={`${px}%`} y1={y1} x2={`${cx}%`} y2={y2}
                    stroke={isCommon ? '#d4a44a' : '#555'}
                    strokeWidth={isCommon ? 2 : 1}
                    strokeDasharray={isCommon ? 'none' : '5 4'}
                    opacity={(active >= ci - 1 && active <= ci) ? 0.8 : 0.2}
                  />
                );
              });
            })}
          </svg>

          {/* Columns */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2, height: '100%' }}>
            {prog.chords.map((chord, ci) => {
              const isAct = ci === active;
              return (
                <div key={ci} onClick={() => { setActive(ci); playChord(chord.midi, 0.04, 2); }}
                  style={{ flex: `0 0 ${100 / prog.chords.length}%`, textAlign: 'center', cursor: 'pointer',
                    opacity: isAct ? 1 : 0.35, transition: 'opacity 0.3s' }}>
                  <p style={{ fontWeight: 700, fontSize: isAct ? 18 : 15, marginBottom: 16, color: isAct ? '#fff' : '#888', transition: 'all 0.3s' }}>
                    {chord.label}
                  </p>
                  <div style={{ position: 'relative', height: H }}>
                    {chord.notes.map((note, ni) => {
                      const y = midiToY(chord.midi[ni], minM, maxM, H);
                      const isCommon = (ci > 0 && ni < prog.chords[ci - 1].midi.length && chord.midi[ni] === prog.chords[ci - 1].midi[ni]) ||
                        (ci < prog.chords.length - 1 && ni < prog.chords[ci + 1].midi.length && chord.midi[ni] === prog.chords[ci + 1].midi[ni]);
                      return (
                        <div key={ni} style={{
                          position: 'absolute', left: '50%', top: y, transform: 'translate(-50%, -50%)',
                          width: isAct ? 42 : 34, height: isAct ? 42 : 34, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isAct ? (isCommon ? '#d4a44a' : '#fff') : '#222',
                          border: isAct ? 'none' : '1px solid #333',
                          boxShadow: isAct && isCommon ? '0 0 16px rgba(212,164,74,0.3)' : 'none',
                          transition: 'all 0.3s',
                        }}>
                          <span style={{ fontSize: isAct ? 13 : 11, fontWeight: 600, color: isAct ? '#0a0a0a' : '#888' }}>{note}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Movement analysis */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e1e1e' }}>
          {prog.chords.map((c, i) => {
            if (i === 0) return null;
            const prev = prog.chords[i - 1];
            const voices = Math.min(c.midi.length, prev.midi.length);
            let common = 0, half = 0;
            for (let v = 0; v < voices; v++) {
              const d = Math.abs(c.midi[v] - prev.midi[v]);
              if (d === 0) common++;
              if (d === 1) half++;
            }
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <p className="font-mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' }}>{prev.label} → {c.label}</p>
                <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  {common > 0 && <span style={{ color: '#d4a44a' }}>{common} common</span>}
                  {common > 0 && half > 0 && ' · '}
                  {half > 0 && <span>{half} half-step</span>}
                  {common === 0 && half === 0 && 'stepwise'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key info */}
      <p className="font-mono text-center mt-6" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#3a3a3a', textTransform: 'uppercase' }}>
        Key: {prog.key} &nbsp;•&nbsp; Voicing: Drop 2 &nbsp;•&nbsp; Tempo: 80 BPM
      </p>
    </div>
  );
}
