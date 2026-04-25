/**
 * FretboardExplorer.tsx — Scales page
 * Circle of fifths key selector + scale/chord chip grid + interactive fretboard
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
        const flatMap: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb' };
        const dr = flatMap[r] || r;
        if (settings.mode === 'scale') return `${dr} ${settings.scaleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        if (settings.mode === 'chord') return `${dr}${settings.chordType === 'maj' ? '' : settings.chordType}`;
        return `${dr}${settings.chordType === 'maj' ? '' : settings.chordType} over ${settings.scaleName.replace(/_/g, ' ')}`;
    }, [settings.root, settings.mode, settings.scaleName, settings.chordType]);

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-10 pt-10 pb-6">
                <p className="text-[11px] tracking-[3px] uppercase text-[#555] mb-3">Explorer</p>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                    Scales <span className="font-light opacity-30">& Modes</span>
                </h1>

                {/* Controls — circle of fifths + chips */}
                <div className="mt-6 mb-6">
                    <FretboardControls settings={settings} onChange={setSettings} />
                </div>

                {/* Currently selected + actions */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-5">
                        <div>
                            <p className="text-[10px] tracking-[2px] uppercase text-[#555] mb-0.5">Active</p>
                            <p className="text-2xl font-bold text-white">{displayTitle}</p>
                        </div>
                        <div className="w-px h-8 bg-white/[0.06]" />
                        <p className="text-[13px] text-[#555]">
                            {activeNotes.length} notes on fretboard
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {scaleNotesForPlayback.length > 0 && (
                            <button onClick={handlePlayScale}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                                    isPlayingScale
                                        ? 'bg-white text-black'
                                        : 'bg-white/[0.04] border border-white/[0.06] text-white hover:bg-white/[0.08]'
                                }`}>
                                {isPlayingScale ? <Square size={14} /> : <Play size={14} className="ml-0.5" />}
                                {isPlayingScale ? 'Stop' : 'Play Scale'}
                            </button>
                        )}
                        {lastClickedNote && (
                            <div className="px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm">
                                <span className="text-white/30">Last: </span>
                                <span className="text-white font-bold">{lastClickedNote.note}{lastClickedNote.octave}</span>
                                {lastClickedNote.interval && <span className="text-white/40 ml-1">({lastClickedNote.interval})</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Scale degree buttons */}
                {scaleNotesForPlayback.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-[10px] tracking-[2px] uppercase text-white/20 mr-1 font-mono">Degrees</span>
                        {scaleNotesForPlayback.map((pos, i) => (
                            <button key={i} onClick={() => playNote(pos.midi, 0.8, 0.5)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:scale-105 cursor-pointer ${
                                    pos.isRoot || pos.interval === 'R'
                                        ? 'bg-accent text-black'
                                        : 'bg-white/[0.04] border border-white/[0.06] text-white hover:bg-white/[0.08]'
                                }`}>
                                {pos.note}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Fretboard */}
            <div className="px-10 pb-6">
                <div className="bg-[#111] rounded-2xl p-6 border border-white/[0.04]">
                    <Fretboard activeNotes={activeNotes} showIntervals={settings.showIntervals} clickToPlay={true}
                        onNoteClick={setLastClickedNote} highlightRange={highlightRange ?? undefined} />
                </div>
            </div>

            {/* Legend */}
            <div className="px-10 pb-10">
                <div className="flex flex-wrap items-center gap-6 text-[11px] text-white/35">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#d4a44a' }} /><span>Root</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e8e8e8' }} /><span>Chord Tone</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#5b9bd5' }} /><span>Scale Tone</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#b07ed8' }} /><span>Tension</span></div>
                </div>
            </div>
        </div>
    );
}
