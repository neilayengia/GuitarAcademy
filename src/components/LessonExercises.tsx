/**
 * LessonExercises.tsx — Interactive exercise components for lessons
 *
 * Each exercise type maps to a specific pedagogical goal:
 * - IntervalEarTraining: hear two notes, name the interval
 * - ChordExplorer: browse diatonic chords in any key
 * - ScaleOverlayExplorer: chord-scale overlays with avoid notes
 * - IIVITrainer: practice ii-V-I in all 12 keys
 * - VoicingBrowser: browse Drop-2 voicings by quality
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Check, ChevronRight, Volume2 } from 'lucide-react';
import Fretboard from './Fretboard';
import { playNote, playChord } from '../utils/audioEngine';
import {
    SHARP_NOTES,
    noteToMidi, midiToNote, semitoneDist,
    getInterval, applyInterval, getIntervalBySemitones,
    buildChord, getDiatonicChords,
    getChordScales, getAvoidNotes, buildScale,
    getScalePositions, getChordPositions, getChordScaleOverlay,
    getVoicingsForChord, resolveVoicing,
    getVoiceLeadingPath, getGuidetoneLine,
    type FretPosition,
} from '../musicTheory';

// ── Shared Styles ────────────────────────────────────────────────────────────

const selectClass = "bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";
const btnClass = "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200";
const btnPrimary = `${btnClass} bg-[var(--color-accent)] text-[var(--color-bg)] hover:brightness-110`;
const btnSecondary = `${btnClass} border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]`;

const ALL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// ── Interval Ear Training ────────────────────────────────────────────────────

const BEGINNER_INTERVALS = [3, 4, 5, 7, 12]; // m3, M3, P4, P5, P8
const INTERVAL_NAMES: Record<number, string> = {
    0: 'Unison', 1: 'Minor 2nd', 2: 'Major 2nd', 3: 'Minor 3rd',
    4: 'Major 3rd', 5: 'Perfect 4th', 6: 'Tritone', 7: 'Perfect 5th',
    8: 'Minor 6th', 9: 'Major 6th', 10: 'Minor 7th', 11: 'Major 7th', 12: 'Octave',
};

interface IntervalEarProps {
    rounds?: number;
    difficulty?: string;
    onProgress?: (correct: number, total: number) => void;
}

export function IntervalEarTraining({ rounds = 5, difficulty = 'beginner', onProgress }: IntervalEarProps) {
    const intervals = difficulty === 'beginner' ? BEGINNER_INTERVALS : Object.keys(INTERVAL_NAMES).map(Number);
    const [round, setRound] = useState(0);
    const [score, setScore] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [currentInterval, setCurrentInterval] = useState(() => intervals[Math.floor(Math.random() * intervals.length)]);
    const [baseNote, setBaseNote] = useState(() => 60 + Math.floor(Math.random() * 12)); // C4-B4
    const [gameOver, setGameOver] = useState(false);

    const playInterval = useCallback(() => {
        playNote(baseNote, 1.2, 0.5);
        setTimeout(() => playNote(baseNote + currentInterval, 1.2, 0.5), 600);
    }, [baseNote, currentInterval]);

    const handleAnswer = useCallback((semitones: number) => {
        if (answered) return;
        setSelectedAnswer(semitones);
        setAnswered(true);
        const correct = semitones === currentInterval;
        if (correct) setScore(s => s + 1);
    }, [answered, currentInterval]);

    const nextRound = useCallback(() => {
        const nextRoundNum = round + 1;
        if (nextRoundNum >= rounds) {
            setGameOver(true);
            onProgress?.(score + (selectedAnswer === currentInterval ? 1 : 0), rounds);
            return;
        }
        setRound(nextRoundNum);
        setAnswered(false);
        setSelectedAnswer(null);
        const newInterval = intervals[Math.floor(Math.random() * intervals.length)];
        setCurrentInterval(newInterval);
        setBaseNote(60 + Math.floor(Math.random() * 12));
    }, [round, rounds, intervals, score, selectedAnswer, currentInterval, onProgress]);

    const restart = useCallback(() => {
        setRound(0);
        setScore(0);
        setAnswered(false);
        setSelectedAnswer(null);
        setGameOver(false);
        setCurrentInterval(intervals[Math.floor(Math.random() * intervals.length)]);
        setBaseNote(60 + Math.floor(Math.random() * 12));
    }, [intervals]);

    if (gameOver) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="text-5xl mb-4">{score >= rounds * 0.8 ? '🎉' : score >= rounds * 0.5 ? '👍' : '💪'}</div>
                <p className="text-2xl font-bold mb-2">{score} / {rounds}</p>
                <p className="text-[var(--color-text-secondary)] mb-6">
                    {score >= rounds * 0.8 ? 'Excellent ear!' : score >= rounds * 0.5 ? 'Good foundation — keep practicing.' : 'Keep at it — ears take time to train.'}
                </p>
                <button onClick={restart} className={btnSecondary}>
                    <RotateCcw size={14} /> Try Again
                </button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <span className="font-mono text-xs tracking-wider text-[var(--color-text-muted)] uppercase">
                    Round {round + 1} of {rounds}
                </span>
                <span className="font-mono text-xs text-[var(--color-accent)]">Score: {score}</span>
            </div>

            <div className="flex justify-center">
                <button onClick={playInterval} className={btnPrimary + ' px-8 py-4 text-base'}>
                    <Volume2 size={18} /> Play Interval
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {intervals.map(semitones => {
                    const isSelected = selectedAnswer === semitones;
                    const isCorrect = semitones === currentInterval;
                    let bg = 'bg-[var(--color-card)] border-[var(--color-border)]';
                    if (answered && isCorrect) bg = 'bg-emerald-500/20 border-emerald-500/50';
                    else if (answered && isSelected && !isCorrect) bg = 'bg-red-500/20 border-red-500/50';

                    return (
                        <button
                            key={semitones}
                            onClick={() => handleAnswer(semitones)}
                            disabled={answered}
                            className={`${btnClass} border ${bg} justify-center ${answered ? '' : 'hover:bg-[var(--color-card-hover)] hover:border-[var(--color-accent)]/30'}`}
                        >
                            {INTERVAL_NAMES[semitones]}
                            {answered && isCorrect && <Check size={14} className="text-emerald-400" />}
                        </button>
                    );
                })}
            </div>

            {answered && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                    <button onClick={nextRound} className={btnPrimary}>
                        {round + 1 >= rounds ? 'See Results' : 'Next'} <ChevronRight size={14} />
                    </button>
                </motion.div>
            )}
        </div>
    );
}

// ── Chord Explorer ───────────────────────────────────────────────────────────

interface ChordExplorerProps {
    mode?: string;
    requiredKeys?: number;
    onProgress?: (keysExplored: number) => void;
}

export function ChordExplorer({ requiredKeys = 3, onProgress }: ChordExplorerProps) {
    const [selectedKey, setSelectedKey] = useState('C');
    const [selectedChordIdx, setSelectedChordIdx] = useState<number | null>(null);
    const [keysExplored, setKeysExplored] = useState<Set<string>>(new Set());

    const diatonicChords = useMemo(() => {
        try {
            return getDiatonicChords(selectedKey);
        } catch {
            return [];
        }
    }, [selectedKey]);

    const romanNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

    const activeNotes = useMemo((): FretPosition[] => {
        if (selectedChordIdx === null || !diatonicChords[selectedChordIdx]) return [];
        const dc = diatonicChords[selectedChordIdx];
        try {
            return getChordPositions(dc.root, dc.quality);
        } catch {
            return [];
        }
    }, [selectedChordIdx, diatonicChords]);

    const handleKeyChange = useCallback((key: string) => {
        setSelectedKey(key);
        setSelectedChordIdx(null);
        setKeysExplored(prev => {
            const next = new Set(prev).add(key);
            onProgress?.(next.size);
            return next;
        });
    }, [onProgress]);

    const handleChordClick = useCallback((idx: number) => {
        setSelectedChordIdx(idx);
        const dc = diatonicChords[idx];
        if (dc) {
            try {
                const chord = buildChord(dc.root, dc.quality);
                const midiNotes = chord.notes.map(n => {
                    const match = n.match(/^([A-G][#b]?)(\d)$/);
                    if (!match) return 60;
                    return noteToMidi(match[1], parseInt(match[2]));
                });
                playChord(midiNotes);
            } catch { /* silent */ }
        }
    }, [diatonicChords]);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4">
                <label className="font-mono text-xs tracking-wider text-[var(--color-text-muted)] uppercase">Key:</label>
                <select value={selectedKey} onChange={e => handleKeyChange(e.target.value)} className={selectClass}>
                    {ALL_KEYS.map(k => <option key={k} value={k}>{k} Major</option>)}
                </select>
                <span className="ml-auto font-mono text-xs text-[var(--color-accent)]">
                    {keysExplored.size} / {requiredKeys} keys explored
                </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
                {diatonicChords.map((dc, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleChordClick(idx)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all duration-200 ${
                            selectedChordIdx === idx
                                ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                                : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                        }`}
                    >
                        <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{romanNumerals[idx]}</span>
                        <span className="text-sm font-medium">{dc.root}{dc.quality}</span>
                    </button>
                ))}
            </div>

            {activeNotes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Fretboard activeNotes={activeNotes} showIntervals clickToPlay />
                </motion.div>
            )}
        </div>
    );
}

// ── Scale Overlay Explorer ───────────────────────────────────────────────────

interface ScaleOverlayProps {
    showAvoidNotes?: boolean;
    onProgress?: (typesExplored: number) => void;
}

const CHORD_TYPES_FOR_EXPLORER = ['maj7', 'm7', '7', 'm7b5'];
const CHORD_TYPE_LABELS: Record<string, string> = {
    'maj7': 'Major 7', 'm7': 'Minor 7', '7': 'Dominant 7', 'm7b5': 'Minor 7♭5',
};

export function ScaleOverlayExplorer({ onProgress }: ScaleOverlayProps) {
    const [root, setRoot] = useState('C');
    const [chordType, setChordType] = useState('maj7');
    const [selectedScale, setSelectedScale] = useState<string | null>(null);
    const [typesExplored, setTypesExplored] = useState<Set<string>>(new Set());

    const availableScales = useMemo(() => {
        try {
            return getChordScales(chordType);
        } catch {
            return [];
        }
    }, [chordType]);

    const avoidNotes = useMemo(() => {
        if (!selectedScale) return [];
        try {
            return getAvoidNotes(root, selectedScale, chordType);
        } catch {
            return [];
        }
    }, [root, selectedScale, chordType]);

    const overlayNotes = useMemo((): FretPosition[] => {
        const scaleName = selectedScale || (availableScales.length > 0 ? availableScales[0].name : null);
        if (!scaleName) return [];
        try {
            return getChordScaleOverlay(root, chordType, scaleName);
        } catch {
            return [];
        }
    }, [root, chordType, selectedScale, availableScales]);

    const handleChordTypeChange = useCallback((type: string) => {
        setChordType(type);
        setSelectedScale(null);
        setTypesExplored(prev => {
            const next = new Set(prev).add(type);
            onProgress?.(next.size);
            return next;
        });
    }, [onProgress]);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="font-mono text-xs tracking-wider text-[var(--color-text-muted)] uppercase">Root:</label>
                    <select value={root} onChange={e => setRoot(e.target.value)} className={selectClass}>
                        {ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="font-mono text-xs tracking-wider text-[var(--color-text-muted)] uppercase">Chord:</label>
                    <select value={chordType} onChange={e => handleChordTypeChange(e.target.value)} className={selectClass}>
                        {CHORD_TYPES_FOR_EXPLORER.map(t => <option key={t} value={t}>{CHORD_TYPE_LABELS[t] || t}</option>)}
                    </select>
                </div>
                <span className="ml-auto font-mono text-xs text-[var(--color-accent)]">
                    {typesExplored.size} / 3 types explored
                </span>
            </div>

            {availableScales.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {availableScales.map((s, i) => (
                        <button
                            key={s.name}
                            onClick={() => setSelectedScale(s.name)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                                (selectedScale || availableScales[0]?.name) === s.name
                                    ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                                    : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/30'
                            }`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            )}

            {avoidNotes.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20">
                    <span className="text-xs text-red-400">⚠ Avoid notes:</span>
                    <span className="font-mono text-xs text-red-300">{avoidNotes.join(', ')}</span>
                </div>
            )}

            <Fretboard activeNotes={overlayNotes} showIntervals clickToPlay />
        </div>
    );
}

// ── ii-V-I Trainer ───────────────────────────────────────────────────────────

interface IIVITrainerProps {
    requiredKeys?: number;
    onProgress?: (keysCompleted: number) => void;
}

export function IIVITrainer({ requiredKeys = 4, onProgress }: IIVITrainerProps) {
    const [selectedKey, setSelectedKey] = useState('C');
    const [activeChordIdx, setActiveChordIdx] = useState<number | null>(null);
    const [keysCompleted, setKeysCompleted] = useState<Set<string>>(new Set());
    const [isMinor, setIsMinor] = useState(false);

    const progression = useMemo(() => {
        if (isMinor) {
            const ii = `${SHARP_NOTES[(SHARP_NOTES.indexOf(selectedKey) + 2) % 12]}m7b5`;
            const V = `${SHARP_NOTES[(SHARP_NOTES.indexOf(selectedKey) + 7) % 12]}7`;
            const i = `${selectedKey}m7`;
            return [ii, V, i];
        }
        const ii = `${SHARP_NOTES[(SHARP_NOTES.indexOf(selectedKey) + 2) % 12]}m7`;
        const V = `${SHARP_NOTES[(SHARP_NOTES.indexOf(selectedKey) + 7) % 12]}7`;
        const I = `${selectedKey}maj7`;
        return [ii, V, I];
    }, [selectedKey, isMinor]);

    const chordNotes = useMemo((): FretPosition[][] => {
        return progression.map(symbol => {
            try {
                // Parse chord: root + quality
                const match = symbol.match(/^([A-G][#b]?)(.+)$/);
                if (!match) return [];
                return getChordPositions(match[1], match[2]);
            } catch {
                return [];
            }
        });
    }, [progression]);

    const handleKeyChange = useCallback((key: string) => {
        setSelectedKey(key);
        setActiveChordIdx(null);
        setKeysCompleted(prev => {
            const next = new Set(prev).add(key);
            onProgress?.(next.size);
            return next;
        });
    }, [onProgress]);

    const playProgression = useCallback(() => {
        chordNotes.forEach((positions, idx) => {
            setTimeout(() => {
                setActiveChordIdx(idx);
                if (positions.length > 0) {
                    const midiNotes = positions.slice(0, 4).map(p => noteToMidi(p.note, p.octave ?? 4));
                    playChord(midiNotes);
                }
            }, idx * 1200);
        });
        // Reset after progression
        setTimeout(() => setActiveChordIdx(null), progression.length * 1200 + 500);
    }, [chordNotes, progression]);

    const labels = isMinor ? ['ii°', 'V7', 'i'] : ['ii', 'V', 'I'];

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="font-mono text-xs tracking-wider text-[var(--color-text-muted)] uppercase">Key:</label>
                    <select value={selectedKey} onChange={e => handleKeyChange(e.target.value)} className={selectClass}>
                        {ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
                <button
                    onClick={() => setIsMinor(m => !m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isMinor
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                            : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                >
                    {isMinor ? 'Minor ii-V-i' : 'Major ii-V-I'}
                </button>
                <span className="ml-auto font-mono text-xs text-[var(--color-accent)]">
                    {keysCompleted.size} / {requiredKeys} keys
                </span>
            </div>

            <div className="flex items-center gap-3">
                {progression.map((chord, idx) => (
                    <React.Fragment key={idx}>
                        <button
                            onClick={() => {
                                setActiveChordIdx(idx);
                                const positions = chordNotes[idx];
                                if (positions.length > 0) {
                                    const midiNotes = positions.slice(0, 4).map(p => noteToMidi(p.note, p.octave ?? 4));
                                    playChord(midiNotes);
                                }
                            }}
                            className={`flex-1 flex flex-col items-center gap-1 p-4 rounded-xl border transition-all duration-300 ${
                                activeChordIdx === idx
                                    ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/50 scale-105'
                                    : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                            }`}
                        >
                            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{labels[idx]}</span>
                            <span className="text-lg font-bold">{chord}</span>
                        </button>
                        {idx < progression.length - 1 && (
                            <ChevronRight size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div className="flex justify-center">
                <button onClick={playProgression} className={btnPrimary}>
                    <Play size={14} /> Play Progression
                </button>
            </div>

            {activeChordIdx !== null && chordNotes[activeChordIdx]?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={activeChordIdx}>
                    <Fretboard activeNotes={chordNotes[activeChordIdx]} showIntervals clickToPlay />
                </motion.div>
            )}
        </div>
    );
}

// ── Voicing Browser ──────────────────────────────────────────────────────────

interface VoicingBrowserProps {
    voicingType?: string;
    requiredQualities?: number;
    onProgress?: (qualitiesExplored: number) => void;
}

const VOICING_QUALITIES = ['maj7', 'm7', '7', 'm7b5', 'dim7', 'minmaj7'];
const VOICING_QUALITY_LABELS: Record<string, string> = {
    'maj7': 'Major 7', 'm7': 'Minor 7', '7': 'Dominant 7',
    'm7b5': 'Min7♭5', 'dim7': 'Dim 7', 'minmaj7': 'Min(maj7)',
};
const STRING_SETS = ['4321', '5432', '6543'];

export function VoicingBrowser({ requiredQualities = 3, onProgress }: VoicingBrowserProps) {
    const [root, setRoot] = useState('C');
    const [quality, setQuality] = useState('maj7');
    const [stringSet, setStringSet] = useState('4321');
    const [selectedVoicingIdx, setSelectedVoicingIdx] = useState(0);
    const [qualitiesExplored, setQualitiesExplored] = useState<Set<string>>(new Set());

    const voicings = useMemo(() => {
        try {
            const all = getVoicingsForChord(root, quality, { voicingType: 'drop2' });
            const targetStrings = stringSet.split('').map(Number);
            return all.filter(v => {
                const vs = v.voicing.stringSet.join('');
                return vs === stringSet;
            });
        } catch {
            return [];
        }
    }, [root, quality, stringSet]);

    const activeNotes = useMemo((): FretPosition[] => {
        if (!voicings[selectedVoicingIdx]) return [];
        const v = voicings[selectedVoicingIdx];
        return v.positions;
    }, [voicings, selectedVoicingIdx, root]);

    const handleQualityChange = useCallback((q: string) => {
        setQuality(q);
        setSelectedVoicingIdx(0);
        setQualitiesExplored(prev => {
            const next = new Set(prev).add(q);
            onProgress?.(next.size);
            return next;
        });
    }, [onProgress]);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="font-mono text-xs tracking-wider text-[var(--color-text-muted)] uppercase">Root:</label>
                    <select value={root} onChange={e => setRoot(e.target.value)} className={selectClass}>
                        {ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="font-mono text-xs tracking-wider text-[var(--color-text-muted)] uppercase">Quality:</label>
                    <select value={quality} onChange={e => handleQualityChange(e.target.value)} className={selectClass}>
                        {VOICING_QUALITIES.map(q => <option key={q} value={q}>{VOICING_QUALITY_LABELS[q] || q}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="font-mono text-xs tracking-wider text-[var(--color-text-muted)] uppercase">Strings:</label>
                    <select value={stringSet} onChange={e => { setStringSet(e.target.value); setSelectedVoicingIdx(0); }} className={selectClass}>
                        {STRING_SETS.map(s => <option key={s} value={s}>Strings {s.split('').join('-')}</option>)}
                    </select>
                </div>
                <span className="ml-auto font-mono text-xs text-[var(--color-accent)]">
                    {qualitiesExplored.size} / {requiredQualities} qualities
                </span>
            </div>

            {voicings.length > 0 ? (
                <>
                    <div className="flex flex-wrap gap-2">
                        {voicings.map((v, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setSelectedVoicingIdx(idx);
                                    // Play the voicing
                                    const midiNotes = v.positions.map(p => noteToMidi(p.note, p.octave ?? 4));
                                    playChord(midiNotes);
                                }}
                                className={`px-3 py-2 rounded-lg text-xs border transition-all ${
                                    selectedVoicingIdx === idx
                                        ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                                        : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                                }`}
                            >
                                Inv. {idx + 1} — frets {v.positions.map(p => p.fret).join('-')}
                            </button>
                        ))}
                    </div>

                    {activeNotes.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selectedVoicingIdx}>
                            <Fretboard activeNotes={activeNotes} showIntervals clickToPlay />
                        </motion.div>
                    )}
                </>
            ) : (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
                    No Drop-2 voicings found for {root}{quality} on strings {stringSet.split('').join('-')}. Try a different string set.
                </p>
            )}
        </div>
    );
}
