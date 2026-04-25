/**
 * FretboardControls.tsx — Control panel for the interactive fretboard
 * Circle of fifths + scale category chips + toggles
 */

import React from 'react';
import { Hash, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CircleOfFifths from './CircleOfFifths';
import { SCALE_TYPES, type ScaleType } from '../musicTheory/scales';
import { CHORD_TYPES } from '../musicTheory/chords';

export type FretboardMode = 'scale' | 'chord' | 'chord_scale';

export interface FretboardSettings {
    root: string;
    mode: FretboardMode;
    scaleName: string;
    chordType: string;
    showIntervals: boolean;
    showCAGED: boolean;
    cagedPosition: number;
    fretRange: { start: number; end: number } | null;
}

interface FretboardControlsProps {
    settings: FretboardSettings;
    onChange: (settings: FretboardSettings) => void;
}

const SCALE_CATEGORIES = [
    { key: 'major_modes', label: 'Major Modes' },
    { key: 'melodic_minor_modes', label: 'Melodic Minor' },
    { key: 'harmonic_minor_modes', label: 'Harmonic Minor' },
    { key: 'pentatonic', label: 'Pentatonic' },
    { key: 'blues', label: 'Blues' },
    { key: 'symmetric', label: 'Symmetric' },
    { key: 'other', label: 'Bebop' },
];

const CHORD_CATEGORIES = [
    { key: 'triad', label: 'Triads' },
    { key: 'seventh', label: '7ths' },
    { key: 'extended', label: 'Extended' },
    { key: 'altered', label: 'Altered' },
    { key: 'suspended', label: 'Sus' },
    { key: 'added', label: 'Added' },
];

const COF_TO_SHARP: Record<string, string> = {
    'C': 'C', 'G': 'G', 'D': 'D', 'A': 'A', 'E': 'E', 'B': 'B',
    'F#': 'F#', 'Db': 'C#', 'Ab': 'G#', 'Eb': 'D#', 'Bb': 'A#', 'F': 'F',
};

const CAGED_NAMES = ['C', 'A', 'G', 'E', 'D'];

export const DEFAULT_SETTINGS: FretboardSettings = {
    root: 'C',
    mode: 'scale',
    scaleName: 'ionian',
    chordType: 'maj7',
    showIntervals: false,
    showCAGED: false,
    cagedPosition: 0,
    fretRange: null,
};

export default function FretboardControls({ settings, onChange }: FretboardControlsProps) {
    const update = (partial: Partial<FretboardSettings>) => {
        onChange({ ...settings, ...partial });
    };

    const [activeScaleCat, setActiveScaleCat] = React.useState(() => {
        const found = SCALE_TYPES.find(s => s.name === settings.scaleName);
        return found?.category || 'major_modes';
    });

    const [activeChordCat, setActiveChordCat] = React.useState(() => {
        const found = CHORD_TYPES.find(c => c.symbol === settings.chordType);
        return found?.category || 'seventh';
    });

    const scalesInCategory = SCALE_TYPES.filter(s => s.category === activeScaleCat);
    const chordsInCategory = CHORD_TYPES.filter(c => c.category === activeChordCat);

    const displayRoot = (() => {
        const flatMap: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'G#': 'Ab', 'A#': 'Bb' };
        return flatMap[settings.root] || settings.root;
    })();

    return (
        <div className="space-y-6">
            {/* ── Key + Scale/Chord Selection ── */}
            <div className="flex items-start gap-8">
                {/* Circle of Fifths */}
                <CircleOfFifths
                    selected={settings.root}
                    onSelect={(key) => update({ root: COF_TO_SHARP[key] || key })}
                    size={190}
                />

                {/* Right side */}
                <div className="flex-1 min-w-0">
                    {/* Mode selector — simplified labels */}
                    <div className="flex gap-1 mb-5 bg-white/[0.02] rounded-xl p-1 w-fit border border-white/[0.04]">
                        {([
                            { id: 'scale' as const, label: 'Scales' },
                            { id: 'chord' as const, label: 'Chord Tones' },
                            { id: 'chord_scale' as const, label: 'Overlay' },
                        ]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => update({ mode: tab.id })}
                                className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                                    settings.mode === tab.id
                                        ? 'bg-white text-black'
                                        : 'text-white/35 hover:text-white/60'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Scale selection (when mode is scale or chord_scale) */}
                    {(settings.mode === 'scale' || settings.mode === 'chord_scale') && (
                        <div className="mb-4">
                            <p className="text-[10px] tracking-[2px] uppercase text-white/25 mb-2">
                                {settings.mode === 'chord_scale' ? 'Scale overlay' : 'Scale'}
                            </p>
                            {/* Category tabs */}
                            <div className="flex gap-1 mb-3 flex-wrap">
                                {SCALE_CATEGORIES.map(cat => {
                                    const count = SCALE_TYPES.filter(s => s.category === cat.key).length;
                                    if (count === 0) return null;
                                    return (
                                        <button
                                            key={cat.key}
                                            onClick={() => {
                                                setActiveScaleCat(cat.key);
                                                const first = SCALE_TYPES.find(s => s.category === cat.key);
                                                if (first) update({ scaleName: first.name });
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                                                activeScaleCat === cat.key
                                                    ? 'bg-white/[0.08] text-white'
                                                    : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Scale chips */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeScaleCat}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex flex-wrap gap-1.5"
                                >
                                    {scalesInCategory.map(scale => {
                                        const isActive = settings.scaleName === scale.name;
                                        return (
                                            <button
                                                key={scale.name}
                                                onClick={() => update({ scaleName: scale.name })}
                                                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                                                    isActive
                                                        ? 'text-[#080604]'
                                                        : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                                                }`}
                                                style={isActive ? {
                                                    background: 'linear-gradient(135deg, #5b9bd5, #4a8ac4)',
                                                    boxShadow: '0 0 12px rgba(91,155,213,0.15)',
                                                    color: '#fff',
                                                } : undefined}
                                            >
                                                {scale.displayName}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Chord selection (when mode is chord or chord_scale) */}
                    {(settings.mode === 'chord' || settings.mode === 'chord_scale') && (
                        <div className="mb-4">
                            <p className="text-[10px] tracking-[2px] uppercase text-white/25 mb-2">
                                {settings.mode === 'chord_scale' ? 'Chord tones' : 'Chord'}
                            </p>
                            <div className="flex gap-1 mb-3 flex-wrap">
                                {CHORD_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.key}
                                        onClick={() => {
                                            setActiveChordCat(cat.key);
                                            const first = CHORD_TYPES.find(c => c.category === cat.key);
                                            if (first) update({ chordType: first.symbol });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                                            activeChordCat === cat.key
                                                ? 'bg-white/[0.08] text-white'
                                                : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeChordCat}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="flex flex-wrap gap-1.5"
                                >
                                    {chordsInCategory.map(chord => {
                                        const isActive = settings.chordType === chord.symbol;
                                        return (
                                            <button
                                                key={chord.symbol}
                                                onClick={() => update({ chordType: chord.symbol })}
                                                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                                                    isActive
                                                        ? ''
                                                        : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                                                }`}
                                                style={isActive ? {
                                                    background: 'linear-gradient(135deg, #b8872e, #d4a44a)',
                                                    boxShadow: '0 0 12px rgba(212,164,74,0.15)',
                                                    color: '#080604',
                                                } : undefined}
                                            >
                                                {displayRoot}{chord.symbol === 'maj' ? '' : chord.symbol}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Toggles row ── */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={() => update({ showIntervals: !settings.showIntervals })}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium border transition-all duration-200 cursor-pointer ${
                        settings.showIntervals
                            ? 'bg-white text-black border-white'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/[0.1]'
                    }`}
                >
                    <Hash size={12} />
                    {settings.showIntervals ? 'Intervals' : 'Note Names'}
                </button>

                <button
                    onClick={() => update({ showCAGED: !settings.showCAGED })}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium border transition-all duration-200 cursor-pointer ${
                        settings.showCAGED
                            ? 'bg-white text-black border-white'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/[0.1]'
                    }`}
                >
                    <Eye size={12} />
                    CAGED
                </button>

                {settings.showCAGED && (
                    <div className="flex gap-1">
                        {CAGED_NAMES.map((name, idx) => (
                            <button
                                key={name}
                                onClick={() => update({ cagedPosition: idx })}
                                className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                                    settings.cagedPosition === idx
                                        ? 'bg-white text-black'
                                        : 'bg-white/[0.03] text-white/30 hover:text-white/60 border border-white/[0.06]'
                                }`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
