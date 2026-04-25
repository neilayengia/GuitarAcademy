/**
 * JamStudio.tsx — Jam workspace with multi-scale fretboard overlay
 *
 * Layout: transport bar → sidebar (progressions + layers) | fretboard hero
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Mic, Square, Play, Pause, Circle, Trash2,
    Minus, Plus, Shuffle, X, ChevronRight,
} from 'lucide-react';
import Fretboard from './Fretboard';
import { getScalePositions, type FretPosition } from '../musicTheory/fretboardMapping';
import { SHARP_NOTES } from '../musicTheory/notes';
import { getAudioTime, playClick, preloadAudioEngine, unlockAudioEngine } from '../utils/audioEngine';
import { getTipsForScale } from '../utils/practiceTips';

// ── Scale options ───────────────────────────────────────────────────────────

const QUICK_SCALES = [
    { label: 'Ionian', value: 'ionian' },
    { label: 'Dorian', value: 'dorian' },
    { label: 'Phrygian', value: 'phrygian' },
    { label: 'Lydian', value: 'lydian' },
    { label: 'Mixolydian', value: 'mixolydian' },
    { label: 'Aeolian', value: 'aeolian' },
    { label: 'Locrian', value: 'locrian' },
    { label: 'Lydian Dom', value: 'lydian_dominant' },
    { label: 'Altered', value: 'altered' },
    { label: 'Melodic Min', value: 'melodic_minor' },
    { label: 'Harm Minor', value: 'harmonic_minor' },
    { label: 'Min Pent', value: 'minor_pentatonic' },
    { label: 'Maj Pent', value: 'major_pentatonic' },
    { label: 'Blues', value: 'minor_blues' },
    { label: 'Whole Tone', value: 'whole_tone' },
    { label: 'Dim W-H', value: 'diminished_whole_half' },
    { label: 'Dim H-W', value: 'diminished_half_whole' },
    { label: 'Bebop Dom', value: 'bebop_dominant' },
];

const LAYER_COLORS = [
    { root: '#d4a44a', tone: '#e8d5a8', label: 'gold' },
    { root: '#5b9bd5', tone: '#a3c7e8', label: 'blue' },
    { root: '#b07ed8', tone: '#d1b3e8', label: 'purple' },
];

// ── Chord progression presets ───────────────────────────────────────────────

interface ChordInProgression {
    root: string;
    quality: string;
    scale: string;
    label: string;
}

interface ProgressionPreset {
    name: string;
    category: string;
    chords: ChordInProgression[];
}

const PRESETS: ProgressionPreset[] = [
    { name: 'ii-V-I Major', category: 'Jazz', chords: [
        { root: 'D', quality: 'm7', scale: 'dorian', label: 'Dm7' },
        { root: 'G', quality: '7', scale: 'mixolydian', label: 'G7' },
        { root: 'C', quality: 'maj7', scale: 'ionian', label: 'Cmaj7' },
    ]},
    { name: 'ii-V-I Minor', category: 'Jazz', chords: [
        { root: 'D', quality: 'm7b5', scale: 'locrian', label: 'Dm7b5' },
        { root: 'G', quality: '7', scale: 'altered', label: 'G7alt' },
        { root: 'C', quality: 'm7', scale: 'aeolian', label: 'Cm7' },
    ]},
    { name: 'I-vi-ii-V', category: 'Jazz', chords: [
        { root: 'C', quality: 'maj7', scale: 'ionian', label: 'Cmaj7' },
        { root: 'A', quality: 'm7', scale: 'aeolian', label: 'Am7' },
        { root: 'D', quality: 'm7', scale: 'dorian', label: 'Dm7' },
        { root: 'G', quality: '7', scale: 'mixolydian', label: 'G7' },
    ]},
    { name: 'Rhythm Changes', category: 'Jazz', chords: [
        { root: 'Bb', quality: 'maj7', scale: 'ionian', label: 'Bbmaj7' },
        { root: 'G', quality: 'm7', scale: 'dorian', label: 'Gm7' },
        { root: 'C', quality: 'm7', scale: 'dorian', label: 'Cm7' },
        { root: 'F', quality: '7', scale: 'mixolydian', label: 'F7' },
    ]},
    { name: 'Coltrane Changes', category: 'Jazz', chords: [
        { root: 'C', quality: 'maj7', scale: 'ionian', label: 'Cmaj7' },
        { root: 'Ab', quality: '7', scale: 'lydian_dominant', label: 'Ab7' },
        { root: 'E', quality: 'maj7', scale: 'ionian', label: 'Emaj7' },
    ]},
    { name: 'So What', category: 'Jazz', chords: [
        { root: 'D', quality: 'm7', scale: 'dorian', label: 'Dm7' },
        { root: 'Eb', quality: 'm7', scale: 'dorian', label: 'Ebm7' },
    ]},
    { name: 'Backdoor ii-V', category: 'Jazz', chords: [
        { root: 'F', quality: 'm7', scale: 'dorian', label: 'Fm7' },
        { root: 'Bb', quality: '7', scale: 'lydian_dominant', label: 'Bb7' },
        { root: 'C', quality: 'maj7', scale: 'ionian', label: 'Cmaj7' },
    ]},
    { name: 'Blues in C', category: 'Blues', chords: [
        { root: 'C', quality: '7', scale: 'mixolydian', label: 'C7' },
        { root: 'F', quality: '7', scale: 'mixolydian', label: 'F7' },
        { root: 'G', quality: '7', scale: 'mixolydian', label: 'G7' },
    ]},
    { name: 'Jazz Blues', category: 'Blues', chords: [
        { root: 'F', quality: '7', scale: 'mixolydian', label: 'F7' },
        { root: 'Bb', quality: '7', scale: 'mixolydian', label: 'Bb7' },
        { root: 'A', quality: 'm7', scale: 'dorian', label: 'Am7' },
        { root: 'D', quality: '7', scale: 'altered', label: 'D7alt' },
        { root: 'G', quality: 'm7', scale: 'dorian', label: 'Gm7' },
        { root: 'C', quality: '7', scale: 'mixolydian', label: 'C7' },
    ]},
    { name: 'Minor Blues', category: 'Blues', chords: [
        { root: 'C', quality: 'm7', scale: 'minor_blues', label: 'Cm7' },
        { root: 'F', quality: 'm7', scale: 'dorian', label: 'Fm7' },
        { root: 'G', quality: '7', scale: 'altered', label: 'G7alt' },
    ]},
    { name: 'I-V-vi-IV', category: 'Pop', chords: [
        { root: 'C', quality: 'maj', scale: 'ionian', label: 'C' },
        { root: 'G', quality: 'maj', scale: 'mixolydian', label: 'G' },
        { root: 'A', quality: 'm', scale: 'aeolian', label: 'Am' },
        { root: 'F', quality: 'maj', scale: 'lydian', label: 'F' },
    ]},
    { name: 'vi-IV-I-V', category: 'Pop', chords: [
        { root: 'A', quality: 'm', scale: 'aeolian', label: 'Am' },
        { root: 'F', quality: 'maj', scale: 'lydian', label: 'F' },
        { root: 'C', quality: 'maj', scale: 'ionian', label: 'C' },
        { root: 'G', quality: 'maj', scale: 'mixolydian', label: 'G' },
    ]},
    { name: 'Lydian Vamp', category: 'Modal', chords: [
        { root: 'C', quality: 'maj7', scale: 'lydian', label: 'Cmaj7#11' },
        { root: 'D', quality: '7', scale: 'mixolydian', label: 'D7' },
    ]},
    { name: 'Phrygian Vamp', category: 'Modal', chords: [
        { root: 'E', quality: 'm7', scale: 'phrygian', label: 'Em7' },
        { root: 'F', quality: 'maj7', scale: 'lydian', label: 'Fmaj7' },
    ]},
];

// ── Random progression generator ────────────────────────────────────────────

function generateRandomProgression(): ProgressionPreset {
    const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const templates = [
        (r: number) => ({
            name: 'Random ii-V-I in ' + keys[r],
            chords: [
                { root: keys[(r + 2) % 12], quality: 'm7', scale: 'dorian', label: keys[(r + 2) % 12] + 'm7' },
                { root: keys[(r + 7) % 12], quality: '7', scale: 'mixolydian', label: keys[(r + 7) % 12] + '7' },
                { root: keys[r], quality: 'maj7', scale: 'ionian', label: keys[r] + 'maj7' },
            ],
        }),
        (r: number) => ({
            name: 'Random Modal in ' + keys[r],
            chords: [
                { root: keys[r], quality: 'm7', scale: 'dorian', label: keys[r] + 'm7' },
                { root: keys[(r + 5) % 12], quality: '7', scale: 'mixolydian', label: keys[(r + 5) % 12] + '7' },
            ],
        }),
        (r: number) => ({
            name: 'Tritone Sub in ' + keys[r],
            chords: [
                { root: keys[(r + 2) % 12], quality: 'm7', scale: 'dorian', label: keys[(r + 2) % 12] + 'm7' },
                { root: keys[(r + 1) % 12], quality: '7', scale: 'lydian_dominant', label: keys[(r + 1) % 12] + '7' },
                { root: keys[r], quality: 'maj7', scale: 'ionian', label: keys[r] + 'maj7' },
            ],
        }),
    ];
    const r = Math.floor(Math.random() * 12);
    const t = templates[Math.floor(Math.random() * templates.length)](r);
    return { name: t.name, category: 'Random', chords: t.chords };
}

// ── Hooks ───────────────────────────────────────────────────────────────────

function useMetronome() {
    const [isRunning, setIsRunning] = useState(false);
    const [bpm, setBpm] = useState(90);
    const [beat, setBeat] = useState(0);
    const beatsPerBar = 4;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const nextBeatTimeRef = useRef(0);
    const beatRef = useRef(0);
    const bpmRef = useRef(bpm);

    useEffect(() => {
        bpmRef.current = bpm;
    }, [bpm]);

    const scheduleNextBeat = useCallback(() => {
        const nextBeat = (beatRef.current % beatsPerBar) + 1;
        beatRef.current = nextBeat;
        setBeat(nextBeat);
        playClick(nextBeat === 1, nextBeatTimeRef.current);
        nextBeatTimeRef.current += 60 / bpmRef.current;
    }, []);

    const start = useCallback(() => {
        unlockAudioEngine();
        preloadAudioEngine().catch(() => {});
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(true);
        setBeat(0);
        beatRef.current = 0;
        nextBeatTimeRef.current = getAudioTime() + 0.04;

        const scheduleAhead = 0.12;
        const lookaheadMs = 25;
        const tick = () => {
            while (nextBeatTimeRef.current < getAudioTime() + scheduleAhead) {
                scheduleNextBeat();
            }
        };

        tick();
        intervalRef.current = setInterval(() => {
            tick();
        }, lookaheadMs);
    }, [scheduleNextBeat]);

    const stop = useCallback(() => {
        setIsRunning(false); setBeat(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
    }, []);

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

    return { isRunning, bpm, setBpm, beat, beatsPerBar, start, stop };
}

function useRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordings, setRecordings] = useState<{ id: number; url: string; duration: number }[]>([]);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr; chunksRef.current = []; startTimeRef.current = Date.now();
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setRecordings(prev => [...prev, { id: Date.now(), url: URL.createObjectURL(blob), duration: (Date.now() - startTimeRef.current) / 1000 }]);
                stream.getTracks().forEach(t => t.stop());
            };
            mr.start(); setIsRecording(true);
        } catch {}
    }, []);

    const stopRecording = useCallback(() => { mediaRecorderRef.current?.stop(); setIsRecording(false); }, []);

    const playRecording = useCallback((id: number) => {
        audioRef.current?.pause();
        if (currentlyPlaying === id) { setCurrentlyPlaying(null); return; }
        const rec = recordings.find(r => r.id === id); if (!rec) return;
        const a = new Audio(rec.url); a.play(); audioRef.current = a; setCurrentlyPlaying(id);
        a.onended = () => { setCurrentlyPlaying(null); audioRef.current = null; };
    }, [recordings, currentlyPlaying]);

    const deleteRecording = useCallback((id: number) => {
        setRecordings(prev => prev.filter(r => r.id !== id));
        if (currentlyPlaying === id) { audioRef.current?.pause(); setCurrentlyPlaying(null); }
    }, [currentlyPlaying]);

    return { isRecording, recordings, currentlyPlaying, startRecording, stopRecording, playRecording, deleteRecording };
}

// ── Scale Layer type ────────────────────────────────────────────────────────

interface ScaleLayer {
    id: number;
    root: string;
    scale: string;
    label: string;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function JamStudio() {
    const [layers, setLayers] = useState<ScaleLayer[]>([
        { id: 1, root: 'D', scale: 'dorian', label: 'Dm7 (Dorian)' },
    ]);
    const [activePreset, setActivePreset] = useState<ProgressionPreset | null>(null);
    const [presetCategory, setPresetCategory] = useState('Jazz');
    const [activeTipLayer, setActiveTipLayer] = useState(0);
    const metronome = useMetronome();
    const recorder = useRecorder();

    const fretboardNotes = useMemo(() => {
        const allNotes: FretPosition[] = [];
        const seenPositions = new Set<string>();
        layers.forEach((layer, layerIdx) => {
            try {
                const positions = getScalePositions(layer.root, layer.scale, 0, 15);
                const color = LAYER_COLORS[layerIdx] || LAYER_COLORS[0];
                positions.forEach(pos => {
                    const key = `${pos.string}-${pos.fret}`;
                    if (!seenPositions.has(key)) {
                        seenPositions.add(key);
                        allNotes.push({ ...pos, color: pos.isRoot ? color.root : color.tone, isRoot: pos.isRoot });
                    }
                });
            } catch {}
        });
        return allNotes;
    }, [layers]);

    const addLayer = () => {
        if (layers.length >= 3) return;
        setLayers(prev => [...prev, { id: Date.now(), root: 'G', scale: 'mixolydian', label: 'G7 (Mixolydian)' }]);
    };

    const removeLayer = (id: number) => setLayers(prev => prev.filter(l => l.id !== id));

    const updateLayer = (id: number, root: string, scale: string) => {
        const scaleName = QUICK_SCALES.find(s => s.value === scale)?.label || scale;
        setLayers(prev => prev.map(l => l.id === id ? { ...l, root, scale, label: `${root} ${scaleName}` } : l));
    };

    const loadPreset = (preset: ProgressionPreset) => {
        setActivePreset(preset);
        setLayers(preset.chords.slice(0, 3).map((chord, i) => ({
            id: Date.now() + i,
            root: chord.root,
            scale: chord.scale,
            label: `${chord.label} (${QUICK_SCALES.find(s => s.value === chord.scale)?.label || chord.scale})`,
        })));
        setActiveTipLayer(0);
    };

    const handleRecord = () => {
        if (recorder.isRecording) {
            recorder.stopRecording();
            if (metronome.isRunning) metronome.stop();
        } else {
            recorder.startRecording();
            if (!metronome.isRunning) metronome.start();
        }
    };

    const categories = [...new Set(PRESETS.map(p => p.category))];
    const filteredPresets = PRESETS.filter(p => p.category === presetCategory);
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    // Current practice tip (single, contextual)
    const currentTipLayer = layers[activeTipLayer] || layers[0];
    const currentTip = currentTipLayer ? getTipsForScale(currentTipLayer.scale)[0] : null;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">

            {/* ═══ Transport Bar ═══ */}
            <div className="flex-shrink-0 px-8 py-4 flex items-center gap-6 border-b border-border-subtle bg-surface/30">

                {/* Title */}
                <div className="mr-auto">
                    <h2 className="text-lg font-bold text-text tracking-tight leading-none">Jam Studio</h2>
                    <p className="text-[11px] text-text-muted font-mono tracking-wider uppercase mt-0.5">
                        {activePreset ? activePreset.name : 'Custom'}
                    </p>
                </div>

                {/* Metronome — inline */}
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-card border border-border-subtle">
                    <div className="flex gap-1">
                        {Array.from({ length: metronome.beatsPerBar }).map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-75 ${
                                metronome.beat === i + 1
                                    ? (i === 0 ? 'bg-accent scale-125' : 'bg-text scale-110')
                                    : 'bg-border'
                            }`} />
                        ))}
                    </div>
                    <div className="w-px h-4 bg-border-subtle" />
                    <button onClick={() => metronome.setBpm(Math.max(40, metronome.bpm - 5))}
                        className="text-text-muted hover:text-text transition-colors"><Minus size={12} /></button>
                    <span className="text-sm font-bold text-text tabular-nums min-w-[3ch] text-center">{metronome.bpm}</span>
                    <button onClick={() => metronome.setBpm(Math.min(240, metronome.bpm + 5))}
                        className="text-text-muted hover:text-text transition-colors"><Plus size={12} /></button>
                    <div className="w-px h-4 bg-border-subtle" />
                    <button onClick={() => metronome.isRunning ? metronome.stop() : metronome.start()}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            metronome.isRunning ? 'bg-text text-bg' : 'bg-elevated text-text hover:bg-border'
                        }`}>
                        {metronome.isRunning ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                    </button>
                </div>

                {/* Record button */}
                <button onClick={handleRecord}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        recorder.isRecording
                            ? 'bg-error/15 border border-error/30 text-error'
                            : 'bg-elevated border border-border text-text-secondary hover:text-text hover:border-border'
                    }`}>
                    {recorder.isRecording ? <><Square size={13} className="fill-current" /> Stop</> : <><Circle size={13} className="text-error" /> Record</>}
                </button>

                {/* Randomize */}
                <button onClick={() => loadPreset(generateRandomProgression())}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-elevated border border-border text-text-secondary hover:text-text text-sm font-medium transition-colors">
                    <Shuffle size={13} /> Random
                </button>
            </div>

            {/* ═══ Main Area ═══ */}
            <div className="flex-1 flex min-h-0">

                {/* ── Sidebar: Progressions + Layers ── */}
                <div className="w-72 xl:w-80 flex-shrink-0 border-r border-border-subtle overflow-y-auto bg-surface/20">
                    <div className="p-5 space-y-5">

                        {/* Progressions */}
                        <div>
                            <h3 className="text-[10px] tracking-[2px] uppercase text-text-muted font-mono mb-3">Progressions</h3>
                            <div className="flex gap-1 mb-3 flex-wrap">
                                {categories.map(cat => (
                                    <button key={cat} onClick={() => setPresetCategory(cat)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                            presetCategory === cat ? 'bg-text text-bg' : 'text-text-muted hover:text-text'
                                        }`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-1">
                                {filteredPresets.map(preset => (
                                    <button key={preset.name} onClick={() => loadPreset(preset)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group ${
                                            activePreset?.name === preset.name
                                                ? 'bg-accent/10 border border-accent/25'
                                                : 'hover:bg-elevated border border-transparent'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[13px] font-medium text-text">{preset.name}</p>
                                            <ChevronRight size={12} className="text-text-faint group-hover:text-text-muted transition-colors" />
                                        </div>
                                        <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                                            {preset.chords.map(c => c.label).join(' → ')}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border-subtle" />

                        {/* Scale Layers */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] tracking-[2px] uppercase text-text-muted font-mono">
                                    Layers <span className="text-text-faint">{layers.length}/3</span>
                                </h3>
                                {layers.length < 3 && (
                                    <button onClick={addLayer}
                                        className="text-[11px] text-accent font-semibold hover:text-accent-bright transition-colors">
                                        + Add
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {layers.map((layer, idx) => {
                                    const color = LAYER_COLORS[idx];
                                    return (
                                        <div key={layer.id}
                                            className="rounded-xl bg-card border border-border-subtle p-3 border-l-[3px]"
                                            style={{ borderLeftColor: color.root }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <button
                                                    onClick={() => setActiveTipLayer(idx)}
                                                    className={`text-[11px] font-bold transition-colors ${
                                                        activeTipLayer === idx ? 'text-text' : 'text-text-muted'
                                                    }`}
                                                    style={activeTipLayer === idx ? { color: color.root } : undefined}
                                                >
                                                    Layer {idx + 1}
                                                </button>
                                                {layers.length > 1 && (
                                                    <button onClick={() => removeLayer(layer.id)}
                                                        className="text-text-faint hover:text-error transition-colors p-0.5">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex gap-1.5">
                                                <select value={layer.root}
                                                    onChange={e => updateLayer(layer.id, e.target.value, layer.scale)}
                                                    className="bg-surface border border-border-subtle rounded-lg px-2 py-1.5 text-[13px] text-text w-[58px] focus:outline-none focus:border-accent-dim">
                                                    {SHARP_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                                                </select>
                                                <select value={layer.scale}
                                                    onChange={e => updateLayer(layer.id, layer.root, e.target.value)}
                                                    className="bg-surface border border-border-subtle rounded-lg px-2 py-1.5 text-[13px] text-text flex-1 min-w-0 focus:outline-none focus:border-accent-dim">
                                                    {QUICK_SCALES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border-subtle" />

                        {/* Recordings (only if any exist) */}
                        {recorder.recordings.length > 0 && (
                            <div>
                                <h3 className="text-[10px] tracking-[2px] uppercase text-text-muted font-mono mb-3">
                                    Takes <span className="text-text-faint">{recorder.recordings.length}</span>
                                </h3>
                                <div className="space-y-1.5">
                                    {recorder.recordings.map((rec, i) => (
                                        <div key={rec.id} className="flex items-center gap-2 p-2 bg-card border border-border-subtle rounded-lg">
                                            <button onClick={() => recorder.playRecording(rec.id)}
                                                className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                                                    recorder.currentlyPlaying === rec.id
                                                        ? 'bg-text text-bg'
                                                        : 'bg-elevated text-text'
                                                }`}>
                                                {recorder.currentlyPlaying === rec.id ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
                                            </button>
                                            <span className="text-[12px] text-text flex-1 min-w-0 truncate">Take {i + 1}</span>
                                            <span className="text-[11px] text-text-muted tabular-nums">{formatTime(rec.duration)}</span>
                                            <button onClick={() => recorder.deleteRecording(rec.id)}
                                                className="text-text-faint hover:text-error transition-colors p-0.5"><Trash2 size={11} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Main: Fretboard + Context ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

                    {/* Active progression chord strip */}
                    {activePreset && (
                        <div className="flex-shrink-0 px-8 py-4 flex items-center gap-2 border-b border-border-subtle">
                            <span className="text-[10px] tracking-[2px] uppercase text-text-faint font-mono mr-2">
                                {activePreset.category}
                            </span>
                            {activePreset.chords.map((chord, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span className="text-text-faint text-xs">→</span>}
                                    <span
                                        className="px-3 py-1.5 rounded-lg text-sm font-semibold border"
                                        style={i < 3 ? {
                                            borderColor: LAYER_COLORS[i].root + '40',
                                            background: LAYER_COLORS[i].root + '10',
                                            color: LAYER_COLORS[i].root,
                                        } : {
                                            borderColor: 'var(--color-border-subtle)',
                                            color: 'var(--color-text-muted)',
                                        }}
                                    >
                                        {chord.label}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Fretboard — the hero */}
                    <div className="flex-1 flex flex-col justify-center px-8 py-6 min-h-0">
                        {/* Layer legend */}
                        <div className="flex items-center gap-4 mb-4">
                            {layers.map((layer, idx) => (
                                <button key={layer.id} onClick={() => setActiveTipLayer(idx)}
                                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all ${
                                        activeTipLayer === idx ? 'bg-card border border-border-subtle' : 'opacity-60 hover:opacity-100'
                                    }`}>
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: LAYER_COLORS[idx].root }} />
                                    <span className="text-[12px] text-text-secondary font-medium">{layer.label}</span>
                                </button>
                            ))}
                            {layers.length > 1 && (
                                <span className="text-[10px] text-text-faint ml-auto">Overlap = voice leading</span>
                            )}
                        </div>

                        <div className="bg-card border border-border-subtle rounded-2xl p-5">
                            <Fretboard activeNotes={fretboardNotes} showIntervals={true} clickToPlay={true} />
                        </div>

                        {/* Recording indicator */}
                        {recorder.isRecording && (
                            <div className="flex items-center justify-center gap-2 py-2.5 mt-3 bg-error/8 border border-error/15 rounded-xl">
                                <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
                                <span className="text-[13px] text-error font-medium">Recording</span>
                                <span className="text-[11px] text-error/50 ml-1">{metronome.bpm} BPM</span>
                            </div>
                        )}
                    </div>

                    {/* Practice tip — contextual, single */}
                    {currentTip && (
                        <div className="flex-shrink-0 px-8 pb-6">
                            <div className="bg-card border border-border-subtle rounded-xl p-4 flex gap-4"
                                 style={{ borderTopColor: LAYER_COLORS[activeTipLayer]?.root, borderTopWidth: '2px' }}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[activeTipLayer]?.root }} />
                                        <p className="text-[10px] tracking-[2px] uppercase text-text-muted font-mono">
                                            {currentTipLayer.root} {QUICK_SCALES.find(s => s.value === currentTipLayer.scale)?.label}
                                        </p>
                                    </div>
                                    <p className="text-[14px] font-bold text-text mb-1">{currentTip.title}</p>
                                    <p className="text-[13px] text-text-secondary leading-relaxed">{currentTip.tip}</p>
                                </div>
                                <div className="flex-shrink-0 w-px bg-border-subtle" />
                                <div className="flex-shrink-0 space-y-1.5 min-w-[180px]">
                                    <p className="text-[12px] font-medium" style={{ color: LAYER_COLORS[activeTipLayer]?.root }}>{currentTip.targetNotes}</p>
                                    {currentTip.avoidNotes && (
                                        <p className="text-[11px] text-error/70">{currentTip.avoidNotes}</p>
                                    )}
                                    {currentTip.melodicCell && (
                                        <p className="text-[11px] text-text-muted font-mono">{currentTip.melodicCell}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
