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
} from "lucide-react";
import Fretboard from "./Fretboard";
import { getChordScaleOverlay } from "../musicTheory/fretboardMapping";
import { getChordAudioPath, getScaleOptionsForQuality, type ChordQuality } from "../utils/chordAudioMap";

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

  // Playback & Scale Selection State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  const [selectedScaleOverride, setSelectedScaleOverride] = useState<string | null>(null);

  const seqAudioRefs = useRef<(HTMLAudioElement | null)[]>([null, null, null, null]);
  const pitchDetection = usePitchDetection();

  // Load sources when slots change
  useEffect(() => {
    slots.forEach((slot, i) => {
      const el = seqAudioRefs.current[i];
      if (el && slot && !el.src.includes(getChordAudioPath(slot.root, slot.quality))) {
        el.src = getChordAudioPath(slot.root, slot.quality);
        el.load();
      } else if (el && !slot) {
        el.removeAttribute('src');
      }
    });

    if (isPlaying && !slots[activeSlotIdx]) {
      skipToNextValidSlot(activeSlotIdx);
    }
  }, [slots, isPlaying, activeSlotIdx]);

  // Reset scale override when the chord slot changes
  useEffect(() => {
    setSelectedScaleOverride(null);
  }, [activeSlotIdx]);

  // Handle Play/Pause logic
  useEffect(() => {
    const el = seqAudioRefs.current[activeSlotIdx];

    seqAudioRefs.current.forEach((audio, i) => {
      if (audio && i !== activeSlotIdx) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (isPlaying && slots[activeSlotIdx] && el) {
      el.volume = isMuted ? 0 : volume / 100;
      el.play().catch(e => {
        console.warn("Autoplay blocked or playback failed:", e);
        setIsPlaying(false);
      });
    } else if (!isPlaying && el) {
      el.pause();
    }
  }, [isPlaying, activeSlotIdx, slots, volume, isMuted]);

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
        setActiveSlotIdx(nextIdx);
        setAudioProgress(0);
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

  const handleAudioEnded = () => {
    skipToNextValidSlot(activeSlotIdx);
  };

  const skipBack = () => {
    let prevIdx = activeSlotIdx - 1;
    for (let i = 0; i < 4; i++) {
      if (prevIdx < 0) prevIdx = 3;
      if (slots[prevIdx]) {
        setActiveSlotIdx(prevIdx);
        setAudioProgress(0);
        return;
      }
      prevIdx--;
    }
  };

  const togglePlay = () => {
    if (!isPlaying && !slots.some(s => s !== null)) return; // Prevents play if all empty

    if (!isPlaying && !slots[activeSlotIdx]) {
      // Find first valid slot if current is empty
      const firstValid = slots.findIndex(s => s !== null);
      if (firstValid !== -1) setActiveSlotIdx(firstValid);
    }

    setIsPlaying(!isPlaying);
  };

  const handleDragStart = (e: React.DragEvent, root: string, quality: ChordQuality) => {
    setDraggedChord({ root, quality });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("application/json", JSON.stringify({ root, quality }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedChord) {
      const newSlots = [...slots];
      newSlots[index] = draggedChord;
      setSlots(newSlots);
    }
  };

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
    <div className="flex-1 p-8 flex flex-col h-full overflow-hidden bg-[#0f0f0f]">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <p className="text-[11px] tracking-[2px] uppercase text-[#555] mb-2">Practice Session</p>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Focus <span className="font-light opacity-30">Mode</span>
          </h2>
        </div>

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => setLoopEnabled(!loopEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${loopEnabled
              ? "bg-white text-black border-white"
              : "border-[#333] text-[#555] hover:text-white hover:border-[#555]"
              }`}
          >
            <RotateCcw size={14} />
            <span className="font-mono text-xs font-bold tracking-wider">LOOP</span>
          </button>

          <button
            onClick={() => { setSlots([null, null, null, null]); setIsPlaying(false); setActiveSlotIdx(0); setAudioProgress(0); }}
            className="font-mono text-xs font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors ml-2 px-4 py-2"
          >
            CLEAR SLOTS
          </button>

          <button
            onClick={pitchDetection.toggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${pitchDetection.isListening
              ? "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(248,113,113,0.15)]"
              : "border-[#333] text-[#555] hover:text-white hover:border-[#555]"
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
        <div className="bg-[#1a1a1a] border border-[#222222] rounded-2xl p-6 flex flex-col min-h-0 col-span-1">
          <h3 className="text-[11px] tracking-[2px] uppercase text-[#555] mb-4 flex items-center justify-between">
            Chord Library
            <GripHorizontal size={14} className="opacity-30" />
          </h3>
          <p className="text-xs text-[#555] mb-4">Drag any chord below into a progression slot.</p>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {ROOTS.map(root => (
              <div key={root} className="bg-[#1e1e1e] p-3 rounded-lg border border-[#2a2a2a]">
                <h4 className="font-bold text-white mb-2">{root}</h4>
                <div className="flex flex-wrap gap-2">
                  {QUALITIES.map(quality => (
                    <div
                      key={`${root}-${quality}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, root, quality)}
                      className="px-2 py-1.5 bg-[#2a2a2a] border border-[#333] rounded text-xs font-medium text-[#888888] hover:border-white hover:text-white cursor-grab active:cursor-grabbing transition-colors whitespace-nowrap"
                    >
                      <span className="font-bold text-white">{root}</span> <span className="text-[#888888]">{quality}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Player & Fretboard */}
        <div className="xl:col-span-3 flex flex-col gap-6 min-h-0">

          {/* Progression Drop Zones */}
          <div className="bg-[#1a1a1a] border border-[#222222] rounded-2xl p-6 flex-shrink-0">
            <h3 className="text-[11px] tracking-[2px] uppercase text-[#555] mb-4">
              Progression Slots
            </h3>
            <div className="flex items-center justify-center gap-4">
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => {
                    if (slot && !isPlaying) {
                      setActiveSlotIdx(idx);
                      setAudioProgress(0);
                      setIsPlaying(true);
                    }
                  }}
                  className={`flex-1 h-32 rounded-xl flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden group ${slot ? 'cursor-pointer' : ''} ${idx === activeSlotIdx && isPlaying
                      ? "border-white bg-white/5 shadow-[0_0_30px_rgba(255,255,255,0.05)] scale-105 z-10"
                      : slot
                        ? "border-[#333] bg-[#1e1e1e] hover:border-white/50"
                        : "border-dashed border-[#2a2a2a] bg-[#111] opacity-60 hover:opacity-100 hover:border-[#555]"
                    }`}
                >
                  {slot ? (
                    <>
                      <span className="text-4xl font-bold mb-1 text-white">{slot.root}</span>
                      <span className="font-mono text-sm text-[#888888]">{slot.quality}</span>
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
                    <div className="flex flex-col items-center text-[#555]">
                      <PlusCircle size={28} className="mb-2 opacity-50" />
                      <span className="font-mono text-xs uppercase tracking-widest leading-tight text-center">Drop<br />Chord Here</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Playback Controls & Progress */}
            <div className="mt-8 flex items-center gap-6">
              <div className="hidden">
                {slots.map((_, i) => (
                  <audio
                    key={i}
                    ref={(el) => seqAudioRefs.current[i] = el}
                    onEnded={handleAudioEnded}
                    onTimeUpdate={(e) => {
                      if (i === activeSlotIdx && isPlaying) {
                        setAudioProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100);
                      }
                    }}
                    crossOrigin="anonymous"
                  />
                ))}
              </div>

              <button
                onClick={skipBack}
                className="p-3 rounded-full bg-[#2a2a2a] border border-[#333] hover:bg-[#333] text-[#555] hover:text-white transition-colors disabled:opacity-30"
                disabled={!slots.some(s => s !== null)}
                aria-label="Previous chord"
              >
                <SkipBack size={24} />
              </button>

              <button
                onClick={togglePlay}
                disabled={!slots.some(s => s !== null)}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </button>

              <button
                onClick={() => skipToNextValidSlot(activeSlotIdx)}
                className="p-3 rounded-full bg-[#2a2a2a] border border-[#333] hover:bg-[#333] text-[#555] hover:text-white transition-colors disabled:opacity-30"
                disabled={!slots.some(s => s !== null)}
                aria-label="Next chord"
              >
                <SkipForward size={24} />
              </button>

              <div className="flex-1 mx-4">
                <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-white transition-all duration-[20ms] ease-linear rounded-full"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3 text-[#555] px-4 py-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-full">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-white transition-colors"
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
                  className="w-24 h-1.5 accent-white cursor-pointer"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>

          {/* Fretboard Visualization */}
          <div className="bg-[#1a1a1a] border border-[#222222] rounded-2xl p-6 flex-1 flex flex-col min-h-0">
            {/* Header: chord badge + scale strip */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] tracking-[2px] uppercase text-[#555] flex items-center gap-2">
                  <Activity size={14} className="text-white" /> Fretboard View
                </h3>
                <span className={`px-4 py-2 rounded-xl font-bold text-lg ${currentSlot ? 'text-black bg-white' : 'text-[#555] bg-[#1e1e1e] border border-[#2a2a2a]'}`}>
                  {currentSlot ? `${currentSlot.root}${currentSlot.quality}` : "No Chord Active"}
                </span>
              </div>

              {/* Scale Strip — always visible, one tap to switch */}
              {currentSlot && validScales.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider flex-shrink-0">Scales</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {validScales.map((scale, idx) => (
                      <button
                        key={scale}
                        onClick={() => setSelectedScaleOverride(scale)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeScale === scale
                          ? 'bg-white text-black'
                          : 'bg-[#1e1e1e] text-[#555] border border-[#2a2a2a] hover:bg-[#2a2a2a] hover:text-white'
                        }`}
                      >
                        <span className="opacity-50 mr-1">{idx + 1}</span>
                        {scale.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-[#333] flex-shrink-0 hidden lg:block">keys or 1-{validScales.length}</span>
                </div>
              )}
            </div>

            <Fretboard activeNotes={currentOverlay} showIntervals={true} />

            <div className="mt-4 flex gap-6 text-xs text-[#888888] justify-center bg-[#1e1e1e] border border-[#2a2a2a] p-3 rounded-lg w-fit mx-auto">
              <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-white mr-2"></span>Root</div>
              <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-[#888888] mr-2"></span>Chord Tone</div>
              <div className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-[#555] mr-2 opacity-60"></span>Tension</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
