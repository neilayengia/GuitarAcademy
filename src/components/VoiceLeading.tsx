/**
 * VoiceLeading.tsx — Voice Leading Pathways
 *
 * Interactive voice leading visualization using the real voicing engine.
 * No hardcoded MIDI maps — builds chords dynamically from music theory.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, RotateCcw, ChevronRight, Repeat, Lightbulb } from 'lucide-react';
import { playChord } from '../utils/audioEngine';
import Fretboard from './Fretboard';
import {
    getVoiceLeadingPath, getGuidetoneLine, parseChordSymbol,
    suggestNextChords, buildChord, noteToMidi,
    type VoiceLeadingPath,
} from '../musicTheory';

// ── Preset Progressions ──────────────────────────────────────────────────────

const PRESETS = [
    { name: 'ii-V-I Major', key: 'C Major', chords: ['Dm7', 'G7', 'Cmaj7'] },
    { name: 'ii-V-I Minor', key: 'C Minor', chords: ['Dm7b5', 'G7', 'Cm7'] },
    { name: 'I-vi-ii-V', key: 'C Major', chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'] },
    { name: 'Blues', key: 'C Blues', chords: ['C7', 'F7', 'G7'] },
    { name: 'Descending ii-Vs', key: 'Bb to Ab', chords: ['Cm7', 'F7', 'Bbmaj7', 'Bbm7', 'Eb7', 'Abmaj7'] },
    { name: 'Turnaround', key: 'C Major', chords: ['Cmaj7', 'A7', 'Dm7', 'Db7'] },
];

// ── Build MIDI from music theory (no hardcoded maps) ────────────────────────

interface VLChord {
    label: string;
    notes: string[];
    midi: number[];
    positions?: { string: number; midi: number }[];
}

// A "voice" on guitar lives on a string — pair voices between chords by string
// when we have real voicings, falling back to sorted-pitch pairing otherwise.
function voicePairs(prev: VLChord, chord: VLChord): [number, number][] {
    if (prev.positions && chord.positions) {
        const pairs: [number, number][] = [];
        for (const pos of chord.positions) {
            const from = prev.positions.find(p => p.string === pos.string);
            if (from) pairs.push([from.midi, pos.midi]);
        }
        return pairs;
    }
    const voices = Math.min(chord.midi.length, prev.midi.length);
    return Array.from({ length: voices }, (_, v) => [prev.midi[v], chord.midi[v]]);
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midi: number): string {
    return NOTE_NAMES[midi % 12];
}

function buildVLChords(symbols: string[]): VLChord[] {
    return symbols.map(symbol => {
        try {
            const { root, typeSymbol } = parseChordSymbol(symbol);
            const intervals: Record<string, number[]> = {
                'maj7': [0, 4, 7, 11], 'maj': [0, 4, 7], 'm7': [0, 3, 7, 10],
                'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7b5': [0, 3, 6, 10],
                'dim7': [0, 3, 6, 9], 'minmaj7': [0, 3, 7, 11], 'aug': [0, 4, 8],
                'm6': [0, 3, 7, 9], '6': [0, 4, 7, 9], '9': [0, 4, 7, 10, 14],
                'maj9': [0, 4, 7, 11, 14], 'm9': [0, 3, 7, 10, 14],
                '7alt': [0, 4, 6, 10], 'sus4': [0, 5, 7], '7sus4': [0, 5, 7, 10],
                'add9': [0, 4, 7, 14], 'aug7': [0, 4, 8, 10],
            };
            const intv = intervals[typeSymbol] || [0, 4, 7, 11];
            const rootMidi = noteToMidi(root, 3);
            // Voice in a comfortable mid-range (MIDI 48-72)
            const midi = intv.map(i => {
                let n = rootMidi + i;
                while (n < 48) n += 12;
                while (n > 72) n -= 12;
                return n;
            }).sort((a, b) => a - b);
            return { label: symbol, notes: midi.map(midiToNoteName), midi };
        } catch {
            return { label: symbol, notes: [], midi: [] };
        }
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function midiToY(midi: number, min: number, max: number, h: number): number {
    const range = max - min || 1;
    return 24 + (h - 48) * (1 - (midi - min) / range);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function VoiceLeading() {
    const [presetIdx, setPresetIdx] = useState(0);
    const [customInput, setCustomInput] = useState('');
    const [useCustom, setUseCustom] = useState(false);
    const [active, setActive] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [looping, setLooping] = useState(false);
    const [tempo, setTempo] = useState(80);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const chordSymbols = useMemo(() => {
        if (useCustom && customInput.trim()) {
            return customInput.trim().split(/[\s,]+/).filter(Boolean);
        }
        return PRESETS[presetIdx]?.chords || [];
    }, [useCustom, customInput, presetIdx]);

    const currentKey = useMemo(() => {
        if (useCustom) return 'Custom';
        return PRESETS[presetIdx]?.key || '';
    }, [useCustom, presetIdx]);

    const vlPath = useMemo<VoiceLeadingPath | null>(() => {
        try {
            const path = getVoiceLeadingPath(chordSymbols);
            return path.steps.length > 0 ? path : null;
        } catch { return null; }
    }, [chordSymbols]);

    // Prefer the real voicing engine (same voicings as the fretboard panel) so
    // the visualization shows genuine voice leading; fall back to close-position
    // stacks only when the engine couldn't voice every chord in the progression.
    const vlChords = useMemo<VLChord[]>(() => {
        if (vlPath && vlPath.steps.length === chordSymbols.length) {
            return vlPath.steps.map(s => {
                const midi = [...s.positions.map(p => p.midi)].sort((a, b) => a - b);
                return {
                    label: s.chord,
                    notes: midi.map(midiToNoteName),
                    midi,
                    positions: s.positions.map(p => ({ string: p.string, midi: p.midi })),
                };
            });
        }
        return buildVLChords(chordSymbols);
    }, [vlPath, chordSymbols]);

    const guideTones = useMemo(() => {
        try { return getGuidetoneLine(chordSymbols); }
        catch { return []; }
    }, [chordSymbols]);

    const H = 260;
    const LABEL_H = 40;
    const allMidi = vlChords.flatMap(c => c.midi);
    const minM = allMidi.length > 0 ? Math.min(...allMidi) - 2 : 58;
    const maxM = allMidi.length > 0 ? Math.max(...allMidi) + 2 : 74;

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const msPerBeat = (60 / tempo) * 1000 * 2;

    const handlePlay = useCallback(() => {
        if (playing) {
            timers.current.forEach(clearTimeout);
            timers.current = [];
            setPlaying(false);
            return;
        }
        setPlaying(true);
        const playOnce = (offset = 0) => {
            vlChords.forEach((c, i) => {
                timers.current.push(setTimeout(() => {
                    setActive(i);
                    if (c.midi.length > 0) playChord(c.midi, 0.04, 2);
                }, offset + i * msPerBeat));
            });
            return offset + vlChords.length * msPerBeat;
        };
        let endTime = playOnce();
        if (looping) {
            for (let rep = 1; rep < 4; rep++) endTime = playOnce(endTime);
        }
        timers.current.push(setTimeout(() => setPlaying(false), endTime + 500));
    }, [playing, vlChords, msPerBeat, looping]);

    const reset = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setPlaying(false);
        setActive(0);
    }, []);

    const selectPreset = useCallback((idx: number) => {
        reset();
        setPresetIdx(idx);
        setUseCustom(false);
    }, [reset]);

    const submitCustom = useCallback(() => {
        if (customInput.trim()) { reset(); setUseCustom(true); }
    }, [customInput, reset]);

    // Movement analysis
    const movements = useMemo(() => {
        return vlChords.map((chord, i) => {
            if (i === 0) return null;
            const prev = vlChords[i - 1];
            let common = 0, step = 0, leap = 0, totalSemi = 0;
            for (const [a, b] of voicePairs(prev, chord)) {
                const d = Math.abs(b - a);
                totalSemi += d;
                if (d === 0) common++;
                else if (d <= 2) step++;
                else leap++;
            }
            return { common, step, leap, totalSemi, from: prev.label, to: chord.label };
        });
    }, [vlChords]);

    const totalMovement = movements.reduce((sum, m) => sum + (m?.totalSemi || 0), 0);
    const totalCommon = movements.reduce((sum, m) => sum + (m?.common || 0), 0);

    const suggestions = useMemo(() => {
        if (!showSuggestions || !vlPath?.steps.length) return [];
        const lastStep = vlPath.steps[vlPath.steps.length - 1];
        try { return suggestNextChords(lastStep.chord, lastStep.positions).slice(0, 5); }
        catch { return []; }
    }, [showSuggestions, vlPath]);

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1000px] mx-auto px-6 lg:px-10 py-8">

                {/* ── Header ── */}
                <div className="mb-8">
                    <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-text-muted mb-2">Progression Analysis</p>
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3" style={{ letterSpacing: '-0.03em' }}>
                        Voice Leading <span className="font-light text-text-faint">Pathways</span>
                    </h1>
                    <p className="text-text-secondary text-[0.9rem] leading-relaxed" style={{ maxWidth: 520 }}>
                        Visualize voice movement, trace guide tones, and explore voicings on the fretboard.
                    </p>
                </div>

                {/* ── Preset row ── */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {PRESETS.map((p, i) => (
                        <button key={p.name} onClick={() => selectPreset(i)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                                !useCustom && presetIdx === i
                                    ? 'bg-accent text-bg font-semibold'
                                    : 'text-text-secondary border border-border hover:text-text hover:border-border'
                            }`}>
                            {p.name}
                        </button>
                    ))}
                </div>

                {/* ── Custom input ── */}
                <div className="relative mb-8">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={customInput}
                            onChange={e => setCustomInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && submitCustom()}
                            placeholder="Custom: Dm7 G7 Cmaj7 Am7..."
                            className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
                        />
                        <button onClick={submitCustom}
                            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all bg-accent text-bg hover:brightness-110">
                            Analyze
                        </button>
                    </div>
                </div>

                {/* ── Voice Path Visualization ── */}
                {vlChords.length > 0 && vlChords[0].midi.length > 0 && (
                    <div className="card p-6 mb-5">
                        {/* Transport */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <button onClick={handlePlay}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                                        playing ? 'bg-accent text-bg border-accent' : 'bg-elevated text-text border-border hover:bg-card'
                                    }`}>
                                    {playing ? <Square size={13} /> : <Play size={13} className="ml-0.5" />}
                                </button>
                                <button onClick={reset}
                                    className="w-9 h-9 rounded-full flex items-center justify-center bg-elevated text-text-secondary border border-border hover:text-text transition-colors">
                                    <RotateCcw size={13} />
                                </button>
                                <button onClick={() => setLooping(l => !l)}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                                        looping ? 'bg-accent/15 text-accent border-accent/40' : 'bg-elevated text-text-secondary border-border hover:text-text'
                                    }`}>
                                    <Repeat size={13} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Tempo</span>
                                <input type="range" min={40} max={160} value={tempo}
                                    onChange={e => setTempo(Number(e.target.value))}
                                    className="w-20 accent-accent" />
                                <span className="font-mono text-xs text-text-secondary w-12">{tempo} bpm</span>
                            </div>
                        </div>

                        {/* SVG Voice Paths — same coordinate space as the note circles */}
                        <div className="relative" style={{ height: LABEL_H + H }}>
                            <svg className="absolute left-0 right-0 w-full overflow-visible pointer-events-none" style={{ top: LABEL_H, height: H }}>
                                {vlChords.map((chord, ci) => {
                                    if (ci === 0) return null;
                                    const prev = vlChords[ci - 1];
                                    const cols = vlChords.length;
                                    const px = ((ci - 0.5) / cols) * 100;
                                    const cx = ((ci + 0.5) / cols) * 100;

                                    return voicePairs(prev, chord).map(([fromMidi, toMidi], vi) => {
                                        const y1 = midiToY(fromMidi, minM, maxM, H);
                                        const y2 = midiToY(toMidi, minM, maxM, H);
                                        const isCommon = fromMidi === toMidi;
                                        const isStep = Math.abs(fromMidi - toMidi) <= 2;
                                        const isActive = active >= ci - 1 && active <= ci;

                                        return (
                                            <line key={`${ci}-${vi}`}
                                                x1={`${px}%`} y1={y1} x2={`${cx}%`} y2={y2}
                                                stroke={isCommon ? '#d4a44a' : isStep ? '#5b9bd5' : '#4a4a4a'}
                                                strokeWidth={isCommon ? 2.5 : isStep ? 1.5 : 1}
                                                strokeDasharray={isCommon ? 'none' : isStep ? 'none' : '5 4'}
                                                opacity={isActive ? 0.9 : 0.35}
                                                style={{ transition: 'opacity 0.3s' }}
                                            />
                                        );
                                    });
                                })}
                            </svg>

                            {/* Chord columns */}
                            <div className="flex justify-between relative z-[2] h-full">
                                {vlChords.map((chord, ci) => {
                                    const isAct = ci === active;
                                    return (
                                        <div key={ci}
                                            onClick={() => { setActive(ci); if (chord.midi.length > 0) playChord(chord.midi, 0.04, 2); }}
                                            className="text-center cursor-pointer transition-opacity duration-300"
                                            style={{ flex: `0 0 ${100 / vlChords.length}%`, opacity: isAct ? 1 : 0.6 }}>
                                            <p className={`font-bold flex items-end justify-center transition-all duration-300 ${isAct ? 'text-[17px] text-text' : 'text-sm text-text-secondary'}`}
                                                style={{ height: LABEL_H, paddingBottom: 8 }}>
                                                {chord.label}
                                            </p>
                                            <div className="relative" style={{ height: H }}>
                                                {chord.notes.map((note, ni) => {
                                                    const y = midiToY(chord.midi[ni], minM, maxM, H);
                                                    const isCommon = (ci > 0 && vlChords[ci - 1].midi.includes(chord.midi[ni])) ||
                                                        (ci < vlChords.length - 1 && vlChords[ci + 1].midi.includes(chord.midi[ni]));
                                                    const gt = guideTones[ci];
                                                    const isGuideTone = gt && (note === gt.third.note || note === gt.seventh.note);

                                                    return (
                                                        <div key={ni}
                                                            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-300"
                                                            style={{
                                                                top: y,
                                                                width: isAct ? 36 : 28,
                                                                height: isAct ? 36 : 28,
                                                                background: isAct
                                                                    ? (isCommon ? 'var(--color-accent)' : isGuideTone ? '#5b9bd5' : 'var(--color-text)')
                                                                    : 'var(--color-elevated)',
                                                                border: isAct
                                                                    ? (isGuideTone ? '2px solid #5b9bd5' : 'none')
                                                                    : '1px solid var(--color-border)',
                                                                boxShadow: isAct && isCommon ? 'var(--shadow-glow)' : isAct && isGuideTone ? '0 0 12px rgba(91,155,213,0.25)' : 'none',
                                                            }}>
                                                            <span className={`font-semibold ${isAct ? 'text-[12px] text-bg' : 'text-[10px] text-text-secondary'}`}>{note}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Motion analysis strip */}
                        <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-border-subtle flex-wrap">
                            {movements.map((m, i) => {
                                if (!m) return null;
                                return (
                                    <div key={i} className="text-center">
                                        <p className="font-mono text-[10px] tracking-wider text-text-muted uppercase">{m.from} → {m.to}</p>
                                        <p className="text-xs text-text-secondary mt-1 flex gap-1.5 justify-center">
                                            {m.common > 0 && <span className="text-accent">{m.common} common</span>}
                                            {m.step > 0 && <span style={{ color: '#5b9bd5' }}>{m.step} step</span>}
                                            {m.leap > 0 && <span className="text-text-muted">{m.leap} leap</span>}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Guide Tone Line ── */}
                {guideTones.length > 0 && (
                    <div className="card p-5 mb-5">
                        <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-muted mb-4">
                            Guide Tone Line <span style={{ color: '#5b9bd5' }}>●</span> 3rds & 7ths
                        </p>
                        <div className="space-y-2">
                            {['third', 'seventh'].map((voice) => (
                                <div key={voice} className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-[10px] text-text-muted w-10">{voice === 'third' ? '3rd:' : '7th:'}</span>
                                    {guideTones.map((gt, i) => {
                                        const tone = voice === 'third' ? gt.third : gt.seventh;
                                        return (
                                            <React.Fragment key={`${voice}-${i}`}>
                                                <span
                                                    onClick={() => { setActive(i); if (vlChords[i]?.midi.length > 0) playChord(vlChords[i].midi, 0.04, 2); }}
                                                    className={`cursor-pointer px-2.5 py-1 rounded-lg text-sm font-bold font-mono transition-all ${
                                                        active === i
                                                            ? 'bg-info/15 text-info border border-info/30'
                                                            : 'text-text-secondary border border-transparent'
                                                    }`}
                                                    style={{ color: active === i ? '#5b9bd5' : undefined }}>
                                                    {tone.note || '—'}
                                                    <span className="text-[9px] opacity-50 ml-1">({tone.intervalLabel})</span>
                                                </span>
                                                {i < guideTones.length - 1 && <span className="text-text-faint text-[10px]">→</span>}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Stats + Fretboard ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                    {/* Stats panel */}
                    <div className="card p-5 space-y-4">
                        <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-muted">Analysis</p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-surface">
                                <p className="font-mono text-[9px] text-text-muted uppercase">Movement</p>
                                <p className={`text-2xl font-bold ${
                                    totalMovement <= 6 ? 'text-success' : totalMovement <= 12 ? 'text-accent' : 'text-error'
                                }`}>{totalMovement}</p>
                                <p className="font-mono text-[9px] text-text-muted">semitones</p>
                            </div>
                            <div className="p-3 rounded-lg bg-surface">
                                <p className="font-mono text-[9px] text-text-muted uppercase">Common</p>
                                <p className="text-2xl font-bold text-accent">{totalCommon}</p>
                                <p className="font-mono text-[9px] text-text-muted">held tones</p>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-surface">
                            <p className="font-mono text-[9px] text-text-muted uppercase mb-1">Quality</p>
                            <p className={`text-lg font-bold ${
                                totalMovement <= 6 ? 'text-success' : totalMovement <= 12 ? 'text-accent' : 'text-error'
                            }`}>
                                {totalMovement <= 6 ? 'Excellent' : totalMovement <= 12 ? 'Good' : 'Fair'}
                            </p>
                            <p className="text-xs text-text-muted mt-1">
                                {totalMovement <= 6 ? 'Minimal motion — smooth voice leading' :
                                 totalMovement <= 12 ? 'Some step motion, well connected' :
                                 'Consider different inversions to reduce movement'}
                            </p>
                        </div>

                        {/* Suggestions */}
                        <button
                            onClick={() => setShowSuggestions(s => !s)}
                            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                                showSuggestions
                                    ? 'bg-accent/10 text-accent border-accent/30'
                                    : 'bg-surface text-text-secondary border-border-subtle hover:text-text'
                            }`}>
                            <Lightbulb size={13} /> {showSuggestions ? 'Hide' : 'Suggest Next Chord'}
                        </button>

                        <AnimatePresence>
                            {showSuggestions && suggestions.length > 0 && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    className="space-y-1.5 overflow-hidden">
                                    {suggestions.map((s, i) => (
                                        <button key={i}
                                            onClick={() => {
                                                const newSymbols = [...chordSymbols, s.chord].join(' ');
                                                setCustomInput(newSymbols);
                                                setUseCustom(true);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all bg-surface border border-border-subtle hover:bg-elevated">
                                            <span className="text-sm font-bold text-text">{s.chord}</span>
                                            <span className="font-mono text-[10px] text-text-muted">
                                                {s.commonTones.length} common · {s.movement} mvmt
                                            </span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Fretboard panel */}
                    <div className="card p-5 lg:col-span-2">
                        <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-muted mb-3">
                            Fretboard — {vlChords[active]?.label || ''} {vlPath?.steps[active] ? `(${vlPath.steps[active].voicing.voicingType.replace('_', ' ')})` : ''}
                        </p>
                        {vlPath?.steps[active] ? (
                            <AnimatePresence mode="wait">
                                <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                                    <Fretboard activeNotes={vlPath.steps[active].positions} showIntervals clickToPlay />
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            <div className="flex items-center justify-center h-40 text-sm text-text-muted">
                                {chordSymbols.length === 0 ? 'Enter a chord progression above' : 'No voicings found — try standard symbols (Dm7, G7, Cmaj7)'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="font-mono text-center text-[11px] tracking-[0.15em] text-text-faint uppercase">
                    Key: {currentKey} · Voicing: Drop 2 · Tempo: {tempo} BPM
                </p>
            </div>
        </div>
    );
}
