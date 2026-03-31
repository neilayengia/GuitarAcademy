/**
 * ChordVoicings.tsx — Voicings Library (Cinematic Dark)
 * Grid of voicing cards with mini fretboard diagrams
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Play, Search, SlidersHorizontal, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import Fretboard from './Fretboard';
import {
    SHARP_NOTES,
    CHORD_TYPES,
    getVoicingsForChord,
    type VoicingType,
    type FretPosition,
} from '../musicTheory';
import { playChord } from '../utils/audioEngine';

const VOICING_TYPE_LABELS: Record<string, string> = {
    drop2: 'DROP 2', drop3: 'DROP 3', shell: 'SHELL', root_position: 'ROOT POS',
    quartal: 'QUARTAL', drop24: 'DROP 2+4', caged: 'CAGED', barre: 'BARRE',
    open: 'OPEN', spread: 'SPREAD', cluster: 'CLUSTER',
};

const CHORD_GROUPS = [
    { label: 'Triads', chords: CHORD_TYPES.filter(c => c.category === 'triad') },
    { label: '7th Chords', chords: CHORD_TYPES.filter(c => c.category === 'seventh') },
    { label: 'Extended', chords: CHORD_TYPES.filter(c => c.category === 'extended') },
    { label: 'Altered', chords: CHORD_TYPES.filter(c => c.category === 'altered') },
    { label: 'Suspended', chords: CHORD_TYPES.filter(c => c.category === 'suspended') },
    { label: 'Added', chords: CHORD_TYPES.filter(c => c.category === 'added') },
];

const LEVEL_FILTERS = ['All', 'Intermediate', 'Advanced', 'Expert'];

export default function ChordVoicings() {
    const [root, setRoot] = useState('C');
    const [chordType, setChordType] = useState('maj7');
    const [levelFilter, setLevelFilter] = useState('All');
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Get all voicings for the selected root + chord
    const allVoicings = useMemo(() => {
        try {
            return getVoicingsForChord(root, chordType, { maxFret: 22 });
        } catch { return []; }
    }, [root, chordType]);

    const chordName = chordType === 'maj' ? root : `${root} ${
        CHORD_TYPES.find(c => c.symbol === chordType)?.name || chordType
    }`;

    const handlePlay = useCallback((positions: FretPosition[]) => {
        playChord(positions.map(p => p.midi).sort((a, b) => a - b), 0.03, 1.5);
    }, []);

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-10 pt-10 pb-8">
                <p className="text-[11px] tracking-[3px] uppercase text-[#555] mb-3">Library</p>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                    Voicings <span className="font-light opacity-30">Library</span>
                </h1>

                {/* Controls row */}
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        {/* Root selector */}
                        <div className="flex gap-1">
                            {SHARP_NOTES.map(n => (
                                <button key={n} onClick={() => { setRoot(n); setSelectedCard(null); }}
                                    className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${root === n ? 'bg-white text-black' : 'text-[#555] hover:text-white hover:bg-[#2a2a2a]'}`}>
                                    {n}
                                </button>
                            ))}
                        </div>
                        <div className="w-px h-5 bg-[#2a2a2a]" />
                        <select value={chordType} onChange={e => { setChordType(e.target.value); setSelectedCard(null); }}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#555]">
                            {CHORD_GROUPS.map(g => (
                                <optgroup key={g.label} label={g.label}>
                                    {g.chords.map(c => <option key={c.symbol} value={c.symbol}>{root}{c.symbol === 'maj' ? '' : c.symbol}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                            <input placeholder="Search chords..." className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-full pl-9 pr-4 py-2 text-sm text-white w-48 focus:outline-none focus:border-[#555] placeholder-[#555]" />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full text-sm text-[#888] hover:text-white transition-colors">
                            <SlidersHorizontal size={14} />
                            Filters
                        </button>
                    </div>
                </div>

                {/* Level pills */}
                <div className="flex gap-2">
                    {LEVEL_FILTERS.map(level => (
                        <button key={level} onClick={() => setLevelFilter(level)}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${levelFilter === level ? 'bg-white text-black' : 'bg-transparent border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#555]'}`}>
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* Voicing Cards Grid */}
            <div className="px-10 pb-12">
                {allVoicings.length === 0 ? (
                    <div className="text-center py-20 text-[#555]">
                        No voicings found for {chordName}. Try a different chord type.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {allVoicings.map((v, idx) => {
                            const isSelected = selectedCard === idx;
                            const frets = v.positions.map(p => p.fret);
                            const notes = v.positions.map(p => p.note);

                            return (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedCard(isSelected ? null : idx)}
                                    className={`bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-[#1e1e1e] ${isSelected ? 'ring-1 ring-white/20' : 'border border-[#222]'}`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div>
                                            <p className="text-[10px] tracking-[2px] uppercase text-[#555] mb-1">
                                                {VOICING_TYPE_LABELS[v.voicing.voicingType] || v.voicing.voicingType.toUpperCase()}
                                            </p>
                                            <p className="text-lg font-bold">{chordName}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePlay(v.positions); }}
                                            className="w-10 h-10 rounded-full bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-white hover:bg-[#333] transition-colors"
                                        >
                                            <Play size={14} className="ml-0.5" />
                                        </button>
                                    </div>

                                    {/* Mini fretboard */}
                                    <div className="bg-[#111] rounded-xl p-4 mb-5 relative" style={{ height: '120px' }}>
                                        {/* Strings */}
                                        {[0, 1, 2, 3, 4, 5].map(s => (
                                            <div key={s} className="absolute left-4 right-4 bg-white/10"
                                                style={{ top: `${15 + s * 17}%`, height: `${1 + s * 0.3}px` }} />
                                        ))}
                                        {/* Fret lines */}
                                        {[1, 2, 3, 4, 5].map(f => (
                                            <div key={f} className="absolute top-2 bottom-2 w-px bg-white/8"
                                                style={{ left: `${10 + f * 16}%` }} />
                                        ))}
                                        {/* Notes */}
                                        {v.positions.map((pos, pi) => {
                                            const minF = Math.min(...frets);
                                            const maxF = Math.max(...frets);
                                            const range = Math.max(maxF - minF, 4);
                                            const x = ((pos.fret - minF) / range) * 70 + 15;
                                            const y = ((pos.string - 1) / 5) * 70 + 15;
                                            return (
                                                <div key={pi}
                                                    className={`absolute w-5 h-5 rounded-full flex items-center justify-center ${pos.isRoot ? 'bg-white' : 'bg-[#888]'}`}
                                                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                                                    <span className={`text-[8px] font-bold ${pos.isRoot ? 'text-black' : 'text-white'}`}>{pos.interval || ''}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-between text-[11px] text-[#555]">
                                        <span>Notes: {notes.join(' — ')}</span>
                                        <span>STR: {v.voicing.stringSet.join('-')}</span>
                                    </div>

                                    {/* Expanded: full fretboard */}
                                    {isSelected && (
                                        <div className="mt-5 pt-5 border-t border-[#2a2a2a]">
                                            <Fretboard activeNotes={v.positions} showIntervals={true} clickToPlay={true} />
                                            <div className="mt-3 flex gap-4 text-[11px] text-[#555]">
                                                <span>Type: {VOICING_TYPE_LABELS[v.voicing.voicingType]}</span>
                                                <span>Inv: {['Root', '1st', '2nd', '3rd'][v.voicing.inversion]}</span>
                                                <span>Frets: {frets.join('-')}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
