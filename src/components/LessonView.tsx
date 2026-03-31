/**
 * LessonView.tsx — Generic lesson renderer
 *
 * Takes a Lesson data object and steps through its content,
 * rendering each step type (text, fretboard, exercise, audio, quiz)
 * with the Studio Console aesthetic.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, BookOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLesson, type LessonStep } from '../data/curriculum';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../contexts/AuthContext';
import Fretboard from './Fretboard';
import { playNote, playChord } from '../utils/audioEngine';
import {
    IntervalEarTraining,
    ChordExplorer,
    ScaleOverlayExplorer,
    IIVITrainer,
    VoicingBrowser,
} from './LessonExercises';
import {
    getScalePositions, getChordPositions, getChordScaleOverlay,
    noteToMidi,
} from '../musicTheory';

// ── Markdown-lite renderer ───────────────────────────────────────────────────

function RichText({ content }: { content: string }) {
    // Simple markdown: **bold**, *italic*, `code`, tables, newlines
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let tableRows: string[][] = [];
    let inTable = false;

    const formatLine = (line: string, key: number) => {
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
        return (
            <span key={key}>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**'))
                        return <strong key={i} className="text-[var(--color-text)] font-semibold">{part.slice(2, -2)}</strong>;
                    if (part.startsWith('*') && part.endsWith('*'))
                        return <em key={i} className="text-[var(--color-text-secondary)]">{part.slice(1, -1)}</em>;
                    if (part.startsWith('`') && part.endsWith('`'))
                        return <code key={i} className="px-1.5 py-0.5 rounded bg-[var(--color-card)] text-[var(--color-accent)] text-[0.85em] font-mono">{part.slice(1, -1)}</code>;
                    return <span key={i}>{part}</span>;
                })}
            </span>
        );
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Table detection
        if (line.startsWith('|') && line.endsWith('|')) {
            const cells = line.split('|').filter(Boolean).map(c => c.trim());
            if (cells.every(c => /^[-:]+$/.test(c))) continue; // separator row
            tableRows.push(cells);
            inTable = true;
            // Check if next line is NOT a table row
            const nextLine = lines[i + 1]?.trim();
            if (!nextLine || (!nextLine.startsWith('|'))) {
                // Render table
                elements.push(
                    <div key={i} className="overflow-x-auto my-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--color-border)]">
                                    {tableRows[0].map((cell, ci) => (
                                        <th key={ci} className="px-3 py-2 text-left font-mono text-xs text-[var(--color-text-muted)] uppercase tracking-wider">{cell}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.slice(1).map((row, ri) => (
                                    <tr key={ri} className="border-b border-[var(--color-border-subtle)]">
                                        {row.map((cell, ci) => (
                                            <td key={ci} className="px-3 py-2 text-[var(--color-text-secondary)]">{formatLine(cell, ci)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
                tableRows = [];
                inTable = false;
            }
            continue;
        }

        if (inTable) {
            inTable = false;
            tableRows = [];
        }

        if (line === '') {
            elements.push(<div key={i} className="h-3" />);
        } else if (line.startsWith('- ')) {
            elements.push(
                <div key={i} className="flex gap-2 ml-2 mb-1">
                    <span className="text-[var(--color-accent)] mt-0.5">•</span>
                    <span className="text-[var(--color-text-secondary)] leading-relaxed text-[0.9375rem]">{formatLine(line.slice(2), 0)}</span>
                </div>
            );
        } else {
            elements.push(
                <p key={i} className="text-[var(--color-text-secondary)] leading-relaxed text-[0.9375rem] mb-2">{formatLine(line, 0)}</p>
            );
        }
    }

    return <div>{elements}</div>;
}

// ── Step Renderers ───────────────────────────────────────────────────────────

function TextStep({ step }: { step: LessonStep }) {
    return (
        <div className="space-y-4">
            {step.content && <RichText content={step.content} />}
        </div>
    );
}

function FretboardStep({ step }: { step: LessonStep }) {
    const config = step.fretboardConfig;
    const activeNotes = useMemo(() => {
        if (!config) return [];
        try {
            if (config.chord) return getChordPositions(config.root, config.chord);
            if (config.scale) return getChordScaleOverlay(config.root, 'maj7', config.scale);
            return getScalePositions(config.root, 'major');
        } catch {
            return [];
        }
    }, [config]);

    return (
        <div className="space-y-4">
            {step.content && <RichText content={step.content} />}
            <Fretboard activeNotes={activeNotes} showIntervals={config?.showIntervals} clickToPlay />
        </div>
    );
}

function ExerciseStep({ step, onProgress }: { step: LessonStep; onProgress?: (value: number) => void }) {
    const config = step.exerciseConfig;
    if (!config) return null;

    return (
        <div className="space-y-4">
            {step.content && <RichText content={step.content} />}
            <div className="mt-4 p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                {config.type === 'interval_ear' && (
                    <IntervalEarTraining
                        rounds={config.rounds || 5}
                        difficulty={config.difficulty || 'beginner'}
                        onProgress={(correct, total) => onProgress?.(correct)}
                    />
                )}
                {config.type === 'chord_explorer' && (
                    <ChordExplorer
                        requiredKeys={config.requiredKeys || 3}
                        onProgress={onProgress}
                    />
                )}
                {config.type === 'scale_overlay' && (
                    <ScaleOverlayExplorer
                        showAvoidNotes={config.showAvoidNotes}
                        onProgress={onProgress}
                    />
                )}
                {config.type === 'ii_v_i_trainer' && (
                    <IIVITrainer
                        requiredKeys={config.requiredKeys || 4}
                        onProgress={onProgress}
                    />
                )}
                {config.type === 'voicing_browser' && (
                    <VoicingBrowser
                        voicingType={config.voicingType}
                        requiredQualities={config.requiredQualities || 3}
                        onProgress={onProgress}
                    />
                )}
            </div>
        </div>
    );
}

function AudioStep({ step }: { step: LessonStep }) {
    const handlePlay = useCallback(() => {
        const config = step.audioConfig;
        if (!config?.chordSymbols) return;
        config.chordSymbols.forEach((symbol, idx) => {
            setTimeout(() => {
                try {
                    const match = symbol.match(/^([A-G][#b]?)(.+)$/);
                    if (!match) return;
                    const positions = getChordPositions(match[1], match[2]);
                    const midiNotes = positions.slice(0, 4).map(p => noteToMidi(p.note, p.octave ?? 4));
                    playChord(midiNotes);
                } catch { /* silent */ }
            }, idx * 1200);
        });
    }, [step.audioConfig]);

    return (
        <div className="space-y-4">
            {step.content && <RichText content={step.content} />}
            <div className="flex justify-center mt-4">
                <button
                    onClick={handlePlay}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] font-medium hover:brightness-110 transition-all"
                >
                    ▶ Play Audio Example
                </button>
            </div>
            {step.audioConfig?.chordSymbols && (
                <div className="flex justify-center gap-3 mt-2">
                    {step.audioConfig.chordSymbols.map((c, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-sm font-mono">
                            {c}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function QuizStep({ step, onAnswer }: { step: LessonStep; onAnswer?: (correct: boolean) => void }) {
    const [selected, setSelected] = useState<number | null>(null);

    const handleSelect = (idx: number) => {
        if (selected !== null) return;
        setSelected(idx);
        const correct = step.quizOptions?.[idx]?.correct ?? false;
        onAnswer?.(correct);
    };

    return (
        <div className="space-y-4">
            {step.content && (
                <p className="text-[var(--color-text)] font-medium text-lg">{step.content}</p>
            )}
            <div className="grid gap-2 mt-4">
                {step.quizOptions?.map((option, idx) => {
                    let classes = 'flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ';
                    if (selected === null) {
                        classes += 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-card-hover)] cursor-pointer';
                    } else if (option.correct) {
                        classes += 'bg-emerald-500/10 border-emerald-500/40';
                    } else if (selected === idx) {
                        classes += 'bg-red-500/10 border-red-500/40';
                    } else {
                        classes += 'bg-[var(--color-card)] border-[var(--color-border)] opacity-50';
                    }

                    return (
                        <button key={idx} onClick={() => handleSelect(idx)} className={classes}>
                            <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                selected !== null && option.correct ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300' :
                                selected === idx && !option.correct ? 'border-red-400 bg-red-400/20 text-red-300' :
                                'border-[var(--color-border)] text-[var(--color-text-muted)]'
                            }`}>
                                {selected !== null && option.correct ? <Check size={14} /> : String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-sm text-[var(--color-text-secondary)]">{option.label}</span>
                        </button>
                    );
                })}
            </div>
            {selected !== null && (
                <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm mt-2 ${step.quizOptions?.[selected]?.correct ? 'text-emerald-400' : 'text-orange-400'}`}
                >
                    {step.quizOptions?.[selected]?.correct ? '✓ Correct!' : `Not quite — the answer is "${step.quizOptions?.find(o => o.correct)?.label}"`}
                </motion.p>
            )}
        </div>
    );
}

// ── Main LessonView ──────────────────────────────────────────────────────────

export default function LessonView() {
    const { moduleId, lessonIndex } = useParams<{ moduleId: string; lessonIndex: string }>();
    const navigate = useNavigate();
    const completeLesson = useAppStore(s => s.completeLesson);
    const { profile } = useAuth();

    const lesson = useMemo(() => {
        return getLesson(Number(moduleId), Number(lessonIndex));
    }, [moduleId, lessonIndex]);

    const [currentStep, setCurrentStep] = useState(0);
    const [completed, setCompleted] = useState(false);

    // Protection logic
    if (lesson && lesson.moduleId > 1 && profile?.subscription_tier !== 'pro') {
        return <Navigate to="/pricing" replace />;
    }

    if (!lesson) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <p className="text-[var(--color-text-muted)]">Lesson not found.</p>
                <button onClick={() => navigate('/')} className="btn-secondary px-4 py-2 text-sm">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const step = lesson.steps[currentStep];
    const isLastStep = currentStep === lesson.steps.length - 1;
    const progress = ((currentStep + 1) / lesson.steps.length) * 100;

    const handleNext = () => {
        if (isLastStep) {
            setCompleted(true);
            completeLesson(lesson.moduleId, lesson.lessonIndex);
        } else {
            setCurrentStep(s => s + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(s => s - 1);
    };

    if (completed) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="text-6xl"
                >
                    🎉
                </motion.div>
                <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                >
                    <h2 className="text-2xl font-bold mb-2">Lesson Complete!</h2>
                    <p className="text-[var(--color-text-secondary)] mb-1">{lesson.title}: {lesson.subtitle}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{lesson.completionCriteria}</p>
                </motion.div>
                <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3"
                >
                    {lesson.lessonIndex < 4 && (
                        <button
                            onClick={() => {
                                setCurrentStep(0);
                                setCompleted(false);
                                navigate(`/lesson/${lesson.moduleId}/${lesson.lessonIndex + 1}`);
                            }}
                            className="btn-primary px-6 py-3 text-sm"
                        >
                            Next Lesson <ArrowRight size={14} />
                        </button>
                    )}
                    <button onClick={() => navigate('/')} className="btn-secondary px-6 py-3 text-sm">
                        Back to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-lg hover:bg-[var(--color-card)] transition-colors"
                    >
                        <ArrowLeft size={18} className="text-[var(--color-text-muted)]" />
                    </button>
                    <div>
                        <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                            Module {lesson.moduleId} • Lesson {lesson.lessonIndex + 1}
                        </p>
                        <h1 className="text-lg font-bold leading-tight">{lesson.icon} {lesson.title}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Clock size={13} className="text-[var(--color-text-muted)]" />
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">~{lesson.estimatedMinutes} min</span>
                </div>
            </div>

            {/* ── Progress bar ── */}
            <div className="h-0.5 bg-[var(--color-border-subtle)]">
                <motion.div
                    className="h-full bg-[var(--color-accent)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                />
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 lg:px-10 py-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Step title */}
                            {step.title && (
                                <h2 className="text-xl font-bold mb-5 text-[var(--color-text)]">{step.title}</h2>
                            )}

                            {/* Step content by type */}
                            {step.type === 'text' && <TextStep step={step} />}
                            {step.type === 'fretboard' && <FretboardStep step={step} />}
                            {step.type === 'exercise' && <ExerciseStep step={step} />}
                            {step.type === 'audio' && <AudioStep step={step} />}
                            {step.type === 'quiz' && <QuizStep step={step} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Navigation footer ── */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-4 border-t border-[var(--color-border-subtle)]">
                <button
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${
                        currentStep === 0
                            ? 'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]'
                    }`}
                >
                    <ChevronLeft size={16} /> Previous
                </button>

                <div className="flex items-center gap-1.5">
                    {lesson.steps.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentStep(idx)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                idx === currentStep
                                    ? 'bg-[var(--color-accent)] w-6'
                                    : idx < currentStep
                                    ? 'bg-[var(--color-accent)]/40'
                                    : 'bg-[var(--color-border)]'
                            }`}
                        />
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-[var(--color-bg)] hover:brightness-110 transition-all"
                >
                    {isLastStep ? 'Complete' : 'Next'} <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
