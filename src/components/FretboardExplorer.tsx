/**
 * FretboardExplorer.tsx — Interactive fretboard with scale/chord visualization
 * Scale playback, clickable notes, CAGED positions
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fretboard from './Fretboard';
import FretboardControls, { DEFAULT_SETTINGS, type FretboardSettings, type FretboardMode } from './FretboardControls';
import {
    getScalePositions,
    getChordPositions,
    getChordScaleOverlay,
    getCAGEDPositions,
    type FretPosition,
} from '../musicTheory';
import { playScale, playNote } from '../utils/audioEngine';
import { Play, Square } from 'lucide-react';

export default function FretboardExplorer() {
    const [searchParams] = useSearchParams();
    const [settings, setSettings] = useState<FretboardSettings>(() => {
        const root = searchParams.get('root') || DEFAULT_SETTINGS.root;
        const mode = (searchParams.get('mode') as FretboardMode) || DEFAULT_SETTINGS.mode;
        const scaleName = searchParams.get('scale') || DEFAULT_SETTINGS.scaleName;
        const chordType = searchParams.get('chord') || DEFAULT_SETTINGS.chordType;
        const showCAGED = searchParams.get('caged') === 'true';
        return {
            ...DEFAULT_SETTINGS, root,
            mode: ['scale', 'chord', 'chord_scale'].includes(mode) ? mode : DEFAULT_SETTINGS.mode,
            scaleName, chordType, showCAGED,
        };
    });
    const [lastClickedNote, setLastClickedNote] = useState<FretPosition | null>(null);
    const [isPlayingScale, setIsPlayingScale] = useState(false);
    const scalePlayerRef = useRef<{ stop: () => void } | null>(null);

    useEffect(() => {
        const root = searchParams.get('root');
        const mode = searchParams.get('mode') as FretboardMode | null;
        const scale = searchParams.get('scale');
        const chord = searchParams.get('chord');
        const caged = searchParams.get('caged');
        if (root || mode || scale || chord || caged !== null) {
            setSettings(prev => ({
                ...prev,
                ...(root && { root }),
                ...(mode && ['scale', 'chord', 'chord_scale'].includes(mode) && { mode }),
                ...(scale && { scaleName: scale }),
                ...(chord && { chordType: chord }),
                ...(caged !== null && { showCAGED: caged === 'true' }),
            }));
        }
    }, [searchParams]);

    useEffect(() => () => { scalePlayerRef.current?.stop(); }, []);

    const { activeNotes, highlightRange } = useMemo(() => {
        let notes: FretPosition[] = [];
        let range: { start: number; end: number } | null = null;
        const minFret = settings.showCAGED ? undefined : 0;
        const maxFret = settings.showCAGED ? undefined : 15;
        try {
            if (settings.mode === 'scale') notes = getScalePositions(settings.root, settings.scaleName, minFret, maxFret);
            else if (settings.mode === 'chord') notes = getChordPositions(settings.root, settings.chordType, minFret, maxFret);
            else if (settings.mode === 'chord_scale') notes = getChordScaleOverlay(settings.root, settings.chordType, settings.scaleName, minFret, maxFret);
            if (settings.showCAGED) {
                const cagedPositions = getCAGEDPositions(settings.root, settings.scaleName);
                if (cagedPositions[settings.cagedPosition]) {
                    const caged = cagedPositions[settings.cagedPosition];
                    range = { start: caged.startFret, end: caged.endFret };
                    notes = notes.filter(n => n.fret >= caged.startFret && n.fret <= caged.endFret);
                }
            }
        } catch (e) { console.warn('Could not compute fretboard positions:', e); }
        return { activeNotes: notes, highlightRange: range };
    }, [settings]);

    const scaleNotesForPlayback = useMemo(() => {
        if (settings.mode !== 'scale' && settings.mode !== 'chord_scale') return [];
        try {
            const positions = getScalePositions(settings.root, settings.scaleName, 0, 15);
            const seen = new Set<number>();
            const singleOctave: FretPosition[] = [];
            const combined = [...positions.filter(p => p.string === 3).sort((a, b) => a.fret - b.fret), ...positions.filter(p => p.string === 2).sort((a, b) => a.fret - b.fret)];
            for (const pos of combined) {
                const pc = pos.midi % 12;
                if (!seen.has(pc)) { seen.add(pc); singleOctave.push(pos); if (singleOctave.length >= 8) break; }
            }
            singleOctave.sort((a, b) => a.midi - b.midi);
            if (singleOctave.length > 0) {
                const rootPC = singleOctave[0].midi % 12;
                const lastPC = singleOctave[singleOctave.length - 1].midi % 12;
                if (rootPC !== lastPC) {
                    const octaveRoot = positions.find(p => p.midi % 12 === rootPC && p.midi > singleOctave[singleOctave.length - 1].midi);
                    if (octaveRoot) singleOctave.push(octaveRoot);
                }
            }
            return singleOctave;
        } catch { return []; }
    }, [settings.root, settings.scaleName, settings.mode]);

    const handlePlayScale = useCallback(() => {
        if (isPlayingScale) { scalePlayerRef.current?.stop(); setIsPlayingScale(false); return; }
        if (scaleNotesForPlayback.length === 0) return;
        setIsPlayingScale(true);
        const midiNotes = scaleNotesForPlayback.map(p => p.midi);
        scalePlayerRef.current = playScale(midiNotes, 100, true, true);
        const totalNotes = midiNotes.length * 2 - 1;
        setTimeout(() => setIsPlayingScale(false), totalNotes * (60 / 100) * 0.8 * 1000 + 500);
    }, [isPlayingScale, scaleNotesForPlayback]);

    const displayTitle = useMemo(() => {
        const r = settings.root;
        if (settings.mode === 'scale') return `${r} ${settings.scaleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        if (settings.mode === 'chord') return `${r}${settings.chordType === 'maj' ? '' : settings.chordType}`;
        return `${r}${settings.chordType === 'maj' ? '' : settings.chordType} — ${settings.scaleName.replace(/_/g, ' ')}`;
    }, [settings.root, settings.mode, settings.scaleName, settings.chordType]);

    return (
        <div className="flex-1 p-8 lg:p-10 overflow-y-auto">
            {/* Header */}
            <div className="mb-6">
                <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-text-muted mb-2">Fretboard Explorer</p>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                    {displayTitle}
                </h1>
                <p className="text-text-secondary text-sm mt-1">{activeNotes.length} notes on fretboard</p>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                {scaleNotesForPlayback.length > 0 && (
                    <button onClick={handlePlayScale}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${isPlayingScale ? 'bg-white text-black' : 'bg-elevated border border-border text-white hover:bg-border'}`}>
                        {isPlayingScale ? <Square size={14} /> : <Play size={14} className="ml-0.5" />}
                        {isPlayingScale ? 'Stop' : 'Play Scale'}
                    </button>
                )}
                {lastClickedNote && (
                    <div className="px-4 py-2 bg-elevated border border-border rounded-xl text-sm">
                        <span className="text-text-muted">Last: </span>
                        <span className="text-white font-bold">{lastClickedNote.note}{lastClickedNote.octave}</span>
                        {lastClickedNote.interval && <span className="text-text-secondary ml-1">({lastClickedNote.interval})</span>}
                    </div>
                )}
            </div>

            {/* Scale tones */}
            {scaleNotesForPlayback.length > 0 && (
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted mr-1">Scale</span>
                    {scaleNotesForPlayback.map((pos, i) => (
                        <button key={i} onClick={() => playNote(pos.midi, 0.8, 0.5)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:scale-105 ${pos.isRoot || pos.interval === 'R' ? 'bg-accent text-black' : 'bg-card border border-border text-white hover:bg-elevated'}`}>
                            {pos.note}
                        </button>
                    ))}
                </div>
            )}

            {/* Fretboard */}
            <div className="card p-6 mb-6">
                <Fretboard activeNotes={activeNotes} showIntervals={settings.showIntervals} clickToPlay={true}
                    onNoteClick={setLastClickedNote} highlightRange={highlightRange ?? undefined} />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-5 text-xs text-text-secondary mb-6">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: '#d4a44a' }} /><span>Root</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: '#e8e8e8' }} /><span>Chord Tone</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: '#5b9bd5' }} /><span>Scale Tone</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: '#b07ed8' }} /><span>Tension</span></div>
            </div>

            {/* Controls */}
            <div className="card p-6">
                <h3 className="font-mono text-[11px] tracking-[0.12em] uppercase text-text-muted mb-4">Controls</h3>
                <FretboardControls settings={settings} onChange={setSettings} />
            </div>
        </div>
    );
}
