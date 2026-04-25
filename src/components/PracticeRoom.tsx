import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Mic,
  Activity,
  RotateCcw,
  PlusCircle,
  Minus,
  GripHorizontal,
  Shuffle,
} from "lucide-react";
import Fretboard from "./Fretboard";
import { getChordScaleOverlay } from "../musicTheory/fretboardMapping";
import { noteToMidi } from "../musicTheory/notes";
import { getChordAudioPath, getScaleOptionsForQuality, type ChordQuality } from "../utils/chordAudioMap";
import { generateProgression, STYLE_OPTIONS } from "../musicTheory/progressionGenerator";
import {
  createAudioSequencePlayer,
  playChord,
  preloadAudioEngine,
  unlockAudioEngine,
  type AudioSequenceController,
  type AudioSequenceStep,
} from "../utils/audioEngine";

const ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const QUALITIES: ChordQuality[] = ["Maj7", "min7", "7", "min7b5", "7b913", "7b9b13"];

const QUALITY_TO_SYMBOL: Record<ChordQuality, string> = {
  "Maj7": "maj7",
  "min7": "m7",
  "7": "7",
  "min7b5": "m7b5",
  "7b913": "13b9",
  "7b9b13": "7alt"
};

const QUALITY_TO_INTERVALS: Record<ChordQuality, number[]> = {
  "Maj7": [0, 4, 7, 11],
  "min7": [0, 3, 7, 10],
  "7": [0, 4, 7, 10],
  "min7b5": [0, 3, 6, 10],
  "7b913": [0, 4, 10, 13, 21],
  "7b9b13": [0, 4, 10, 13, 20],
};

// ── Custom Hook: Pitch Detection ─────────────────────────────────────────────

function usePitchDetection() {
  const [isListening, setIsListening] = useState(false);
  const [pitch, setPitch] = useState<string | null>(null);
  const [centsOff, setCentsOff] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pitchFrameRef = useRef<number | null>(null);

  const autoCorrelate = useCallback((buf: Float32Array, sampleRate: number) => {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++)
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++)
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE - i; j++)
        c[i] += buf[j] * buf[j + i];

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    let T0 = maxpos;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
    return sampleRate / T0;
  }, []);

  const updatePitch = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    const ac = autoCorrelate(buffer, audioContextRef.current.sampleRate);

    if (ac !== -1) {
      const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const noteNum = 12 * (Math.log(ac / 440) / Math.log(2));
      const note = Math.round(noteNum) + 69;
      setPitch(notes[note % 12]);
      const targetFreq = 440 * Math.pow(2, (note - 69) / 12);
      const cents = Math.floor(1200 * Math.log2(ac / targetFreq));
      setCentsOff(Math.max(-50, Math.min(50, cents)));
    } else {
      setPitch(null);
      setCentsOff(0);
    }
    pitchFrameRef.current = requestAnimationFrame(updatePitch);
  }, [autoCorrelate]);

  const toggle = useCallback(async () => {
    if (!isListening) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        setIsListening(true);
        pitchFrameRef.current = requestAnimationFrame(updatePitch);
      } catch (err) {
        console.error("Microphone access denied", err);
      }
    } else {
      setIsListening(false);
      setPitch(null);
      setCentsOff(0);
      if (pitchFrameRef.current) cancelAnimationFrame(pitchFrameRef.current);
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();
    }
  }, [isListening, updatePitch]);

  useEffect(() => {
    return () => {
      if (pitchFrameRef.current) cancelAnimationFrame(pitchFrameRef.current);
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return { isListening, pitch, centsOff, toggle };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PracticeRoom() {
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);

  // Custom Progression State
  type Slot = { root: string; quality: ChordQuality } | null;
  const [slots, setSlots] = useState<Slot[]>([null, null, null, null]);
  const [draggedChord, setDraggedChord] = useState<{ root: string; quality: ChordQuality } | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // Generator state
  const [genStyle, setGenStyle] = useState<'jazz' | 'blues' | 'pop' | 'modal'>('jazz');

  const handleGenerate = () => {
    unlockAudioEngine();
    preloadAudioEngine().catch(() => {});
    const progression = generateProgression(genStyle);
    setSlots(progression);
    setIsPlaying(false);
    setActiveSlotIdx(0);
    setAudioProgress(0);
  };

  // Playback & Scale Selection State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  const [selectedScaleOverride, setSelectedScaleOverride] = useState<string | null>(null);

  const sequenceRef = useRef<AudioSequenceController | null>(null);
  const sequenceRunRef = useRef(0);
  const pitchDetection = usePitchDetection();

  useEffect(() => {
    if (isPlaying && !slots[activeSlotIdx]) {
      skipToNextValidSlot(activeSlotIdx);
    }
  }, [slots, isPlaying, activeSlotIdx]);

  useEffect(() => {
    sequenceRef.current?.setVolume(isMuted ? 0 : volume / 100);
  }, [isMuted, volume]);

  useEffect(() => {
    return () => {
      sequenceRef.current?.stop(0.02);
      sequenceRef.current = null;
    };
  }, []);

  // Reset scale override when the chord slot changes
  useEffect(() => {
    setSelectedScaleOverride(null);
  }, [activeSlotIdx]);

  const skipToNextValidSlot = (currentIdx: number) => {
    let nextIdx = currentIdx + 1;
    let found = false;

    // Look forward for a filled slot
    for (let i = 0; i < 4; i++) {
      if (nextIdx >= 4) {
        if (!loopEnabled) {
          setIsPlaying(false);
          setActiveSlotIdx(0);
          setAudioProgress(0);
          return;
        }
        nextIdx = 0; // loop back
      }

      if (slots[nextIdx]) {
        if (isPlaying) {
          playFromSlot(nextIdx);
        } else {
          setActiveSlotIdx(nextIdx);
          setAudioProgress(0);
        }
        found = true;
        break;
      }
      nextIdx++;
    }

    if (!found) {
      setIsPlaying(false);
      setActiveSlotIdx(0);
      setAudioProgress(0);
    }
  };

  const skipBack = () => {
    let prevIdx = activeSlotIdx - 1;
    for (let i = 0; i < 4; i++) {
      if (prevIdx < 0) prevIdx = 3;
      if (slots[prevIdx]) {
        if (isPlaying) {
          playFromSlot(prevIdx);
        } else {
          setActiveSlotIdx(prevIdx);
          setAudioProgress(0);
        }
        return;
      }
      prevIdx--;
    }
  };

  const buildSequenceSteps = useCallback((startIdx: number): AudioSequenceStep[] => {
    const steps: AudioSequenceStep[] = [];
    const slotsToVisit = loopEnabled
      ? Array.from({ length: 4 }, (_, offset) => (startIdx + offset) % 4)
      : Array.from({ length: 4 - startIdx }, (_, offset) => startIdx + offset);

    slotsToVisit.forEach((slotIdx) => {
      const slot = slots[slotIdx];
      if (!slot) return;
      steps.push({
        id: String(slotIdx),
        url: getChordAudioPath(slot.root, slot.quality),
      });
    });

    return steps;
  }, [loopEnabled, slots]);

  const playFromSlot = useCallback(async (slotIdx: number) => {
    const targetSlot = slots[slotIdx];
    if (!targetSlot) return;

    unlockAudioEngine();
    const runId = sequenceRunRef.current + 1;
    sequenceRunRef.current = runId;
    sequenceRef.current?.stop(0.02);
    sequenceRef.current = null;
    setIsPlaying(true);
    setActiveSlotIdx(slotIdx);
    setAudioProgress(0);

    const steps = buildSequenceSteps(slotIdx);
    if (steps.length === 0) {
      setIsPlaying(false);
      return;
    }

    try {
      sequenceRef.current = await createAudioSequencePlayer(steps, {
        loop: loopEnabled,
        volume: isMuted ? 0 : volume / 100,
        onStepStart: (_stepIndex, step) => {
          if (sequenceRunRef.current !== runId) return;
          setActiveSlotIdx(Number(step.id));
          setAudioProgress(0);
        },
        onProgress: (_stepIndex, progress) => {
          if (sequenceRunRef.current !== runId) return;
          setAudioProgress(progress * 100);
        },
        onEnded: () => {
          if (sequenceRunRef.current !== runId) return;
          setIsPlaying(false);
          setAudioProgress(0);
        },
        onError: (error) => {
          console.warn("Sequence playback failed:", error);
        },
      });
    } catch (error) {
      if (sequenceRunRef.current !== runId) return;
      console.warn("Sequence playback failed:", error);
      setIsPlaying(false);
      setAudioProgress(0);
    }
  }, [buildSequenceSteps, isMuted, loopEnabled, slots, volume]);

  const togglePlay = () => {
    if (!isPlaying && !slots.some(s => s !== null)) return; // Prevents play if all empty
    unlockAudioEngine();
    preloadAudioEngine().catch(() => {});

    if (isPlaying) {
      sequenceRunRef.current += 1;
      sequenceRef.current?.stop(0.03);
      sequenceRef.current = null;
      setIsPlaying(false);
      return;
    }

    if (!isPlaying && !slots[activeSlotIdx]) {
      // Find first valid slot if current is empty
      const firstValid = slots.findIndex(s => s !== null);
      if (firstValid !== -1) {
        playFromSlot(firstValid);
        return;
      }
    }

    playFromSlot(activeSlotIdx);
  };

  const handleDragStart = (e: React.DragEvent, root: string, quality: ChordQuality) => {
    setDraggedChord({ root, quality });
    previewChord(root, quality);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("application/json", JSON.stringify({ root, quality }));
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // allow drop
    setDropTargetIdx(index);
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedChord) {
      const newSlots = [...slots];
      newSlots[index] = draggedChord;
      setSlots(newSlots);
      setActiveSlotIdx(index);
      setAudioProgress(0);
      previewChord(draggedChord.root, draggedChord.quality);
      if (isPlaying) {
        setTimeout(() => playFromSlot(index), 0);
      }
    }
    setDraggedChord(null);
    setDropTargetIdx(null);
  };

  const previewChord = useCallback((root: string, quality: ChordQuality) => {
    const rootMidi = noteToMidi(root, 3);
    const midiNotes = QUALITY_TO_INTERVALS[quality].map(interval => rootMidi + interval);
    playChord(midiNotes, 0.025, 1.35);
  }, []);

  const addChordFromLibrary = useCallback((root: string, quality: ChordQuality) => {
    unlockAudioEngine();
    preloadAudioEngine().catch(() => {});
    previewChord(root, quality);
    setSlots(prev => {
      const next = [...prev];
      const targetIdx = next.findIndex(slot => slot === null);
      const idx = targetIdx === -1 ? activeSlotIdx : targetIdx;
      next[idx] = { root, quality };
      setActiveSlotIdx(idx);
      setAudioProgress(0);
      return next;
    });
  }, [activeSlotIdx, previewChord]);

  // Resolve Scale Data for Fretboard
  const currentSlot = slots[activeSlotIdx];
  const validScales = useMemo(() => {
    return currentSlot ? getScaleOptionsForQuality(currentSlot.quality) : [];
  }, [currentSlot]);

  const activeScale = selectedScaleOverride || (validScales.length > 0 ? validScales[0] : null);
  const activeScaleIndex = activeScale ? validScales.indexOf(activeScale) : 0;

  const currentOverlay = currentSlot && activeScale
    ? getChordScaleOverlay(currentSlot.root, QUALITY_TO_SYMBOL[currentSlot.quality], activeScale)
    : [];

  // Keyboard shortcuts: number keys 1-9 switch scales, arrow left/right cycle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (validScales.length === 0) return;

      // Number keys 1-9
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= validScales.length) {
        e.preventDefault();
        setSelectedScaleOverride(validScales[num - 1]);
        return;
      }

      // Arrow keys to cycle
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = (activeScaleIndex + 1) % validScales.length;
        setSelectedScaleOverride(validScales[next]);
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = (activeScaleIndex - 1 + validScales.length) % validScales.length;
        setSelectedScaleOverride(validScales[prev]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [validScales, activeScaleIndex]);

  return (
    <div className="flex-1 p-8 flex flex-col h-full overflow-hidden bg-bg">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <p className="text-[11px] tracking-[2px] uppercase text-text-muted mb-2">Practice Session</p>
          <h2 className="text-3xl font-bold tracking-tight text-text">
            Focus <span className="font-light opacity-30">Mode</span>
          </h2>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          {/* ── Progression Generator ── */}
          <div className="flex items-center gap-1 bg-elevated border border-border-subtle rounded-full p-1">
            {STYLE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setGenStyle(opt.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  genStyle === opt.key
                    ? 'bg-white/10 text-white'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-all cursor-pointer"
          >
            <Shuffle size={14} />
            <span className="font-mono text-xs font-bold tracking-wider">GENERATE</span>
          </button>

          <div className="w-px h-5 bg-border-subtle" />

          <button
            onClick={() => setLoopEnabled(!loopEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer ${loopEnabled
              ? "bg-accent text-bg border-accent"
              : "border-border text-text-muted hover:text-text hover:border-border"
              }`}
          >
            <RotateCcw size={14} />
            <span className="font-mono text-xs font-bold tracking-wider">LOOP</span>
          </button>

          <button
            onClick={() => {
              sequenceRunRef.current += 1;
              sequenceRef.current?.stop(0.02);
              sequenceRef.current = null;
              setSlots([null, null, null, null]);
              setIsPlaying(false);
              setActiveSlotIdx(0);
              setAudioProgress(0);
            }}
            className="font-mono text-xs font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors px-4 py-2 cursor-pointer"
          >
            CLEAR
          </button>

          <button
            onClick={pitchDetection.toggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${pitchDetection.isListening
              ? "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(248,113,113,0.15)]"
              : "border-border text-text-muted hover:text-text hover:border-border"
              }`}
          >
            {pitchDetection.isListening ? <Activity size={18} className="animate-pulse" /> : <Mic size={18} />}
            <span className="font-mono text-xs font-bold tracking-wider">
              {pitchDetection.isListening ? "LISTENING" : "MIC OFF"}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-0">

        {/* Left Column: Draggable Library */}
        <div className="bg-elevated border border-border-subtle rounded-2xl p-6 flex flex-col min-h-0 col-span-1">
          <h3 className="text-[11px] tracking-[2px] uppercase text-text-muted mb-4 flex items-center justify-between">
            Chord Library
            <GripHorizontal size={14} className="opacity-30" />
          </h3>
          <p className="text-xs text-text-muted mb-4">Drag any chord below into a progression slot.</p>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {ROOTS.map(root => (
              <div key={root} className="bg-elevated p-3 rounded-lg border border-border">
                <h4 className="font-bold text-text mb-2">{root}</h4>
                <div className="flex flex-wrap gap-2">
                  {QUALITIES.map(quality => (
                    <button
                      key={`${root}-${quality}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, root, quality)}
                      onClick={() => addChordFromLibrary(root, quality)}
                      className="px-2 py-1.5 bg-elevated border border-border rounded text-xs font-medium text-text-secondary hover:border-accent hover:text-text cursor-grab active:cursor-grabbing transition-colors whitespace-nowrap text-left"
                      title="Click to add and preview. Drag to place manually."
                    >
                      <span className="font-bold text-text">{root}</span> <span className="text-text-secondary">{quality}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Player & Fretboard */}
        <div className="xl:col-span-3 flex flex-col gap-6 min-h-0">

          {/* Progression Drop Zones */}
          <div className="bg-elevated border border-border-subtle rounded-2xl p-6 flex-shrink-0">
            <h3 className="text-[11px] tracking-[2px] uppercase text-text-muted mb-4">
              Progression Slots
            </h3>
            <div className="flex items-center justify-center gap-4">
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={() => setDropTargetIdx(current => current === idx ? null : current)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => {
                    if (slot && !isPlaying) {
                      setActiveSlotIdx(idx);
                      setAudioProgress(0);
                      playFromSlot(idx);
                    }
                  }}
                  className={`flex-1 h-32 rounded-xl flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden group ${slot ? 'cursor-pointer' : ''} ${dropTargetIdx === idx
                      ? "border-accent bg-accent/10 scale-[1.03]"
                      : idx === activeSlotIdx && isPlaying
                      ? "border-accent bg-accent/5 shadow-glow scale-105 z-10"
                      : slot
                        ? "border-border bg-elevated hover:border-accent/50"
                        : "border-dashed border-border bg-surface opacity-60 hover:opacity-100 hover:border-text-muted"
                    }`}
                >
                  {slot ? (
                    <>
                      <span className="text-4xl font-bold mb-1 text-text">{slot.root}</span>
                      <span className="font-mono text-sm text-text-secondary">{slot.quality}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const n = [...slots];
                          n[idx] = null;
                          setSlots(n);
                          if (idx === activeSlotIdx && isPlaying) skipToNextValidSlot(activeSlotIdx);
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                        aria-label="Remove Chord"
                      >
                        <Minus size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-text-muted">
                      <PlusCircle size={28} className="mb-2 opacity-50" />
                      <span className="font-mono text-xs uppercase tracking-widest leading-tight text-center">Drop<br />Chord Here</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Playback Controls & Progress */}
            <div className="mt-8 flex items-center gap-6">
              <button
                onClick={skipBack}
                className="p-3 rounded-full bg-elevated border border-border hover:bg-card text-text-muted hover:text-text transition-colors disabled:opacity-30"
                disabled={!slots.some(s => s !== null)}
                aria-label="Previous chord"
              >
                <SkipBack size={24} />
              </button>

              <button
                onClick={togglePlay}
                disabled={!slots.some(s => s !== null)}
                className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-bg hover:brightness-110 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </button>

              <button
                onClick={() => skipToNextValidSlot(activeSlotIdx)}
                className="p-3 rounded-full bg-elevated border border-border hover:bg-card text-text-muted hover:text-text transition-colors disabled:opacity-30"
                disabled={!slots.some(s => s !== null)}
                aria-label="Next chord"
              >
                <SkipForward size={24} />
              </button>

              <div className="flex-1 mx-4">
                <div className="h-2 bg-elevated rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-accent transition-all duration-[20ms] ease-linear rounded-full"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3 text-text-muted px-4 py-2 bg-elevated border border-border rounded-full">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-text transition-colors"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-24 h-1.5 accent-accent cursor-pointer"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>

          {/* Fretboard Visualization */}
          <div className="bg-elevated border border-border-subtle rounded-2xl p-6 flex-1 flex flex-col min-h-0">
            {/* Header: chord badge + scale strip */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] tracking-[2px] uppercase text-text-muted flex items-center gap-2">
                  <Activity size={14} className="text-text" /> Fretboard View
                </h3>
                <span className={`px-4 py-2 rounded-xl font-bold text-lg ${currentSlot ? 'text-bg bg-accent' : 'text-text-muted bg-elevated border border-border'}`}>
                  {currentSlot ? `${currentSlot.root}${currentSlot.quality}` : "No Chord Active"}
                </span>
              </div>

              {/* Scale Strip — always visible, one tap to switch */}
              {currentSlot && validScales.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex-shrink-0">Scales</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {validScales.map((scale, idx) => (
                      <button
                        key={scale}
                        onClick={() => setSelectedScaleOverride(scale)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeScale === scale
                          ? 'bg-accent text-bg'
                          : 'bg-elevated text-text-muted border border-border hover:bg-card hover:text-text'
                        }`}
                      >
                        <span className="opacity-50 mr-1">{idx + 1}</span>
                        {scale.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-text-faint flex-shrink-0 hidden lg:block">keys or 1-{validScales.length}</span>
                </div>
              )}
            </div>

            <Fretboard activeNotes={currentOverlay} showIntervals={true} />

            <div className="mt-4 flex gap-6 text-xs text-text-secondary justify-center bg-elevated border border-border p-3 rounded-lg w-fit mx-auto">
              <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-accent mr-2"></span>Root</div>
              <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-text-secondary mr-2"></span>Chord Tone</div>
              <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-text-muted mr-2 opacity-60"></span>Tension</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
