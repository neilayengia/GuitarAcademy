/**
 * FretboardControls.tsx — Control panel for the interactive fretboard
 *
 * Toggles for scale overlay, interval labels, CAGED positions,
 * root/scale/chord selection.
 */

import React from 'react';
import { Music, Guitar, Layers, Hash, Eye, Grid3X3 } from 'lucide-react';
import { SHARP_NOTES, FLAT_NOTES } from '../musicTheory/notes';
import { SCALE_TYPES, type ScaleType } from '../musicTheory/scales';
import { CHORD_TYPES, type ChordType } from '../musicTheory/chords';

// ── Types ────────────────────────────────────────────────────────────────────

export type FretboardMode = 'scale' | 'chord' | 'chord_scale';

export interface FretboardSettings {
    root: string;
    mode: FretboardMode;
    scaleName: string;
    chordType: string;
    showIntervals: boolean;
    showCAGED: boolean;
    cagedPosition: number; // 0-4 for C-A-G-E-D
    fretRange: { start: number; end: number } | null;
}

interface FretboardControlsProps {
    settings: FretboardSettings;
    onChange: (settings: FretboardSettings) => void;
}

// ── Grouped Scale Options ────────────────────────────────────────────────────

const SCALE_GROUPS = [
    { label: 'Major Modes', scales: SCALE_TYPES.filter(s => s.category === 'major_modes') },
    { label: 'Melodic Minor', scales: SCALE_TYPES.filter(s => s.category === 'melodic_minor_modes') },
    { label: 'Harmonic Minor', scales: SCALE_TYPES.filter(s => s.category === 'harmonic_minor_modes') },
    { label: 'Pentatonic & Blues', scales: SCALE_TYPES.filter(s => s.category === 'pentatonic' || s.category === 'blues') },
    { label: 'Symmetric', scales: SCALE_TYPES.filter(s => s.category === 'symmetric') },
    { label: 'Bebop', scales: SCALE_TYPES.filter(s => s.category === 'other') },
];

const CHORD_GROUPS = [
    { label: 'Triads', chords: CHORD_TYPES.filter(c => c.category === 'triad') },
    { label: '7th Chords', chords: CHORD_TYPES.filter(c => c.category === 'seventh') },
    { label: 'Extended', chords: CHORD_TYPES.filter(c => c.category === 'extended') },
    { label: 'Altered', chords: CHORD_TYPES.filter(c => c.category === 'altered') },
    { label: 'Suspended', chords: CHORD_TYPES.filter(c => c.category === 'suspended') },
    { label: 'Added', chords: CHORD_TYPES.filter(c => c.category === 'added') },
];

const CAGED_NAMES = ['C', 'A', 'G', 'E', 'D'];

// ── Default settings ─────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

export default function FretboardControls({ settings, onChange }: FretboardControlsProps) {
    const update = (partial: Partial<FretboardSettings>) => {
        onChange({ ...settings, ...partial });
    };

    return (
        <div className="space-y-4">
            {/* Row 1: Root + Mode */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Root selector */}
                <div className="flex items-center gap-2">
                    <Music size={14} className="text-[#555]" />
                    <span className="text-[11px] tracking-[2px] uppercase text-[#555]">Root</span>
                    <div className="flex gap-1">
                        {SHARP_NOTES.map(note => (
                            <button
                                key={note}
                                onClick={() => update({ root: note })}
                                className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${settings.root === note
                                    ? 'bg-white text-black'
                                    : 'bg-[#1a1a1a] text-[#555] hover:bg-[#2a2a2a] hover:text-white border border-[#2a2a2a]'
                                    }`}
                            >
                                {note}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 2: Mode selector */}
            <div className="flex items-center gap-3">
                <Layers size={14} className="text-[#555]" />
                <span className="text-[11px] tracking-[2px] uppercase text-[#555]">Display</span>
                <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1 border border-[#2a2a2a]">
                    {([
                        { id: 'scale', label: 'Scale', icon: Grid3X3 },
                        { id: 'chord', label: 'Chord Tones', icon: Guitar },
                        { id: 'chord_scale', label: 'Chord + Scale', icon: Layers },
                    ] as const).map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => update({ mode: tab.id })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${settings.mode === tab.id
                                    ? 'bg-white text-black'
                                    : 'text-[#555] hover:text-white'
                                    }`}
                            >
                                <Icon size={12} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Row 3: Scale / Chord selector (depends on mode) */}
            <div className="flex flex-wrap items-start gap-3">
                {(settings.mode === 'scale' || settings.mode === 'chord_scale') && (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] tracking-[2px] uppercase text-[#555]">Scale</span>
                        <select
                            value={settings.scaleName}
                            onChange={e => update({ scaleName: e.target.value })}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
                        >
                            {SCALE_GROUPS.map(group => (
                                <optgroup key={group.label} label={group.label}>
                                    {group.scales.map(scale => (
                                        <option key={scale.name} value={scale.name}>
                                            {scale.displayName}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                )}

                {(settings.mode === 'chord' || settings.mode === 'chord_scale') && (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] tracking-[2px] uppercase text-[#555]">Chord</span>
                        <select
                            value={settings.chordType}
                            onChange={e => update({ chordType: e.target.value })}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
                        >
                            {CHORD_GROUPS.map(group => (
                                <optgroup key={group.label} label={group.label}>
                                    {group.chords.map(chord => (
                                        <option key={chord.symbol} value={chord.symbol}>
                                            {settings.root}{chord.symbol === 'maj' ? '' : chord.symbol} — {chord.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Row 4: Toggles */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Interval toggle */}
                <button
                    onClick={() => update({ showIntervals: !settings.showIntervals })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${settings.showIntervals
                        ? 'bg-white text-black border-white'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#555]'
                        }`}
                >
                    <Hash size={12} />
                    {settings.showIntervals ? 'Intervals' : 'Note Names'}
                </button>

                {/* CAGED toggle */}
                <button
                    onClick={() => update({ showCAGED: !settings.showCAGED })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${settings.showCAGED
                        ? 'bg-white text-black border-white'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#555] hover:text-white hover:border-[#555]'
                        }`}
                >
                    <Eye size={12} />
                    CAGED
                </button>

                {/* CAGED position selector (visible when CAGED is on) */}
                {settings.showCAGED && (
                    <div className="flex gap-1">
                        {CAGED_NAMES.map((name, idx) => (
                            <button
                                key={name}
                                onClick={() => update({ cagedPosition: idx })}
                                className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${settings.cagedPosition === idx
                                    ? 'bg-white text-black'
                                    : 'bg-[#1a1a1a] text-[#555] hover:text-white border border-[#2a2a2a]'
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
