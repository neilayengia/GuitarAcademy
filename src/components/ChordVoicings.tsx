/**
 * ChordVoicings.tsx — Voicings Library
 * Circle of fifths key selector + category chip grid + voicing cards
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Play, Search, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Fretboard from './Fretboard';
import CircleOfFifths from './CircleOfFifths';
import {
    SHARP_NOTES,
    CHORD_TYPES,
    getVoicingsForChord,
    type FretPosition,
} from '../musicTheory';
import { playChord } from '../utils/audioEngine';

const VOICING_TYPE_LABELS: Record<string, string> = {
    drop2: 'DROP 2', drop3: 'DROP 3', shell: 'SHELL', root_position: 'ROOT POS',
    quartal: 'QUARTAL', drop24: 'DROP 2+4', caged: 'CAGED', barre: 'BARRE',
    open: 'OPEN', spread: 'SPREAD', cluster: 'CLUSTER',
};

const CATEGORIES = [
    { key: 'triad', label: 'Triads' },
    { key: 'seventh', label: '7ths' },
    { key: 'extended', label: 'Extended' },
    { key: 'altered', label: 'Altered' },
    { key: 'suspended', label: 'Sus' },
    { key: 'added', label: 'Added' },
];

const LEVEL_FILTERS = ['All', 'Intermediate', 'Advanced', 'Expert'];

// Map circle-of-fifths labels to SHARP_NOTES equivalents
const COF_TO_SHARP: Record<string, string> = {
    'C': 'C', 'G': 'G', 'D': 'D', 'A': 'A', 'E': 'E', 'B': 'B',
    'F#': 'F#', 'Db': 'C#', 'Ab': 'G#', 'Eb': 'D#', 'Bb': 'A#', 'F': 'F',
};

export default function ChordVoicings() {
    const [root, setRoot] = useState('C');
    const [chordType, setChordType] = useState('maj7');
    const [activeCategory, setActiveCategory] = useState('seventh');
    const [levelFilter, setLevelFilter] = useState('All');
    const [selectedCard, setSelectedCard] = useState<number | null>(null);

    const chordsInCategory = useMemo(
        () => CHORD_TYPES.filter(c => c.category === activeCategory),
        [activeCategory]
    );

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

    const handleRootSelect = (key: string) => {
        setRoot(COF_TO_SHARP[key] || key);
        setSelectedCard(null);
    };

    const handleChordSelect = (symbol: string) => {
        setChordType(symbol);
        setSelectedCard(null);
    };

    // Display-friendly root (show flats for circle-of-fifths keys)
    const displayRoot = (() => {
        const flatMap: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb' };
        return flatMap[root] || root;
    })();

    const formatChordSymbol = (symbol: string) => {
        if (symbol === 'maj') return displayRoot;
        return `${displayRoot}${symbol}`;
    };

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-10 pt-10 pb-6">
                <p className="text-[11px] tracking-[3px] uppercase text-[#555] mb-3">Library</p>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                    Voicings <span className="font-light opacity-30">Library</span>
                </h1>

                {/* ── Key + Chord Selection ── */}
                <div className="flex items-start gap-8 mb-6">

                    {/* Circle of Fifths */}
                    <CircleOfFifths
                        selected={root}
                        onSelect={handleRootSelect}
                        size={200}
                    />

                    {/* Right side: category tabs + chord chips */}
                    <div className="flex-1 min-w-0">
                        {/* Category tabs */}
                        <div className="flex gap-1 mb-4">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => {
                                        setActiveCategory(cat.key);
                                        // Auto-select first chord in new category
                                        const first = CHORD_TYPES.find(c => c.category === cat.key);
                                        if (first) handleChordSelect(first.symbol);
                                    }}
                                    className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                                        activeCategory === cat.key
                                            ? 'bg-white/[0.08] text-white'
                                            : 'text-[#555] hover:text-white/70 hover:bg-white/[0.03]'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Chord chips */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeCategory}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-wrap gap-2"
                            >
                                {chordsInCategory.map(chord => {
                                    const isActive = chordType === chord.symbol;
                                    return (
                                        <button
                                            key={chord.symbol}
                                            onClick={() => handleChordSelect(chord.symbol)}
                                            className={`px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                                                isActive
                                                    ? 'text-[#080604]'
                                                    : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/80 hover:bg-white/[0.06] hover:border-white/[0.1]'
                                            }`}
                                            style={isActive ? {
                                                background: 'linear-gradient(135deg, #b8872e, #d4a44a)',
                                                boxShadow: '0 0 16px rgba(212,164,74,0.15), 0 2px 4px rgba(0,0,0,0.3)',
                                            } : undefined}
                                        >
                                            {formatChordSymbol(chord.symbol)}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>

                        {/* Currently selected chord display */}
                        <div className="mt-5 flex items-center gap-4">
                            <div>
                                <p className="text-[10px] tracking-[2px] uppercase text-[#555] mb-0.5">Selected</p>
                                <p className="text-2xl font-bold text-white">{chordName}</p>
                            </div>
                            <div className="w-px h-8 bg-white/[0.06]" />
                            <p className="text-[13px] text-[#555]">
                                {allVoicings.length} voicing{allVoicings.length !== 1 ? 's' : ''} found
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters row */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                        {LEVEL_FILTERS.map(level => (
                            <button key={level} onClick={() => setLevelFilter(level)}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                                    levelFilter === level
                                        ? 'bg-white text-black'
                                        : 'bg-transparent border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#555]'
                                }`}>
                                {level}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                            <input placeholder="Search chords..." className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-full pl-9 pr-4 py-2 text-sm text-white w-48 focus:outline-none focus:border-[#555] placeholder-[#555]" />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full text-sm text-[#888] hover:text-white transition-colors cursor-pointer">
                            <SlidersHorizontal size={14} />
                            Filters
                        </button>
                    </div>
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
                                    className={`bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-[#1e1e1e] ${
                                        isSelected ? 'ring-1 ring-white/20' : 'border border-[#222]'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-5">
                                        <div>
                                            <p className="text-[10px] tracking-[2px] uppercase text-[#555] mb-1">
                                                {VOICING_TYPE_LABELS[v.voicing.voicingType] || v.voicing.voicingType.toUpperCase()}
                                            </p>
                                            <p className="text-lg font-bold">{chordName}</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePlay(v.positions); }}
                                            className="w-10 h-10 rounded-full bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-white hover:bg-[#333] transition-colors cursor-pointer"
                                        >
                                            <Play size={14} className="ml-0.5" />
                                        </button>
                                    </div>

                                    {(() => {
                                        const minFret = Math.min(...frets);
                                        const maxFret = Math.max(...frets);
                                        const hasOpen = minFret === 0;
                                        const startFret = hasOpen ? 0 : Math.max(0, minFret - 1);
                                        const endFret = Math.max(startFret + 4, maxFret + 1);
                                        const numFrets = endFret - startFret;

                                        return (
                                            <div className="bg-surface rounded-xl p-4 mb-5 relative" style={{ height: '120px' }}>
                                                {hasOpen && (
                                                    <div className="absolute top-2 bottom-2 w-[3px] rounded-full bg-text-secondary/60"
                                                        style={{ left: '10%' }} />
                                                )}
                                                {[0, 1, 2, 3, 4, 5].map(s => (
                                                    <div key={s} className="absolute bg-text/10"
                                                        style={{ left: '10%', right: '6%', top: `${15 + s * 14}%`, height: `${1 + s * 0.3}px` }} />
                                                ))}
                                                {Array.from({ length: numFrets }, (_, i) => i + 1).map(f => (
                                                    <div key={f} className="absolute top-2 bottom-2 w-px bg-text/8"
                                                        style={{ left: `${10 + (f / numFrets) * 84}%` }} />
                                                ))}
                                                {!hasOpen && startFret > 0 && (
                                                    <span className="absolute text-[9px] font-mono text-text-muted"
                                                        style={{ left: '3%', top: '10%' }}>
                                                        {startFret}fr
                                                    </span>
                                                )}
                                                {v.positions.map((pos, pi) => {
                                                    const fretOffset = pos.fret - startFret;
                                                    const x = pos.fret === 0
                                                        ? 7
                                                        : 10 + ((fretOffset - 0.5) / numFrets) * 84;
                                                    const y = 15 + (pos.string - 1) * 14;
                                                    return (
                                                        <div key={pi}
                                                            className={`absolute w-5 h-5 rounded-full flex items-center justify-center ${
                                                                pos.isRoot ? 'bg-accent' : 'bg-text-secondary'
                                                            }`}
                                                            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                                                            <span className={`text-[8px] font-bold ${pos.isRoot ? 'text-bg' : 'text-text'}`}>
                                                                {pos.interval || ''}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}

                                    <div className="flex justify-between text-[11px] text-[#555]">
                                        <span>Notes: {notes.join(' — ')}</span>
                                        <span>STR: {v.voicing.stringSet.join('-')}</span>
                                    </div>

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
