# Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-page Rubato app with a single-screen workspace where the Practice Room is the entire app — focused fretboard, collapsible chord panel, transport bar, and voicing strip.

**Architecture:** The current `PracticeRoom.tsx` (742 lines) gets decomposed into four focused components (`Workspace.tsx`, `TopBar.tsx`, `ChordPanel.tsx`, `VoicingStrip.tsx`) that coordinate through props and callbacks. `App.tsx` is stripped to two routes (`/` and `/auth`). All standalone page components and the `Sidebar` are deleted. Existing music theory utils (`voicings.ts`, `fretboardMapping.ts`, `chordAudioMap.ts`) and `audioEngine.ts` are used unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), Zustand, Lucide icons

---

### Task 1: Create `ChordPanel.tsx` — Collapsible left panel

**Files:**
- Create: `src/components/ChordPanel.tsx`

This is a self-contained collapsible panel with search, chord library grouped by root, and the progression generator controls. It receives callbacks to communicate with the parent.

- [ ] **Step 1: Create ChordPanel component**

```tsx
// src/components/ChordPanel.tsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Shuffle, X } from "lucide-react";
import { type ChordQuality } from "../utils/chordAudioMap";
import { STYLE_OPTIONS } from "../musicTheory/progressionGenerator";

const ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const QUALITIES: ChordQuality[] = ["Maj7", "min7", "7", "min7b5", "7b913", "7b9b13"];

const QUALITY_DISPLAY: Record<ChordQuality, string> = {
  Maj7: "Maj7",
  min7: "m7",
  "7": "7",
  min7b5: "m7b5",
  "7b913": "13b9",
  "7b9b13": "7alt",
};

interface ChordPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddChord: (root: string, quality: ChordQuality) => void;
  onDragStart: (e: React.DragEvent, root: string, quality: ChordQuality) => void;
  onGenerate: (style: "jazz" | "blues" | "pop" | "modal") => void;
}

export default function ChordPanel({
  isOpen,
  onClose,
  onAddChord,
  onDragStart,
  onGenerate,
}: ChordPanelProps) {
  const [search, setSearch] = useState("");
  const [genStyle, setGenStyle] = useState<"jazz" | "blues" | "pop" | "modal">("jazz");

  const filteredRoots = useMemo(() => {
    if (!search.trim()) return ROOTS;
    const q = search.trim().toLowerCase();
    return ROOTS.filter((root) => {
      // Match root name
      if (root.toLowerCase().includes(q)) return true;
      // Match quality combos like "cmaj7" or "dm7"
      return QUALITIES.some((qual) =>
        `${root}${qual}`.toLowerCase().includes(q) ||
        `${root}${QUALITY_DISPLAY[qual]}`.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const filteredQualities = useMemo(() => {
    if (!search.trim()) return null; // show all
    const q = search.trim().toLowerCase();
    // If searching for a quality specifically
    return (root: string) =>
      QUALITIES.filter(
        (qual) =>
          `${root}${qual}`.toLowerCase().includes(q) ||
          `${root}${QUALITY_DISPLAY[qual]}`.toLowerCase().includes(q) ||
          root.toLowerCase().includes(q)
      );
  }, [search]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex-shrink-0 overflow-hidden"
        >
          <div className="w-[240px] h-full bg-surface border-r border-border-subtle flex flex-col">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
              <span className="text-[10px] tracking-[2px] uppercase text-text-muted font-mono">
                Chord Library
              </span>
              <button
                onClick={onClose}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 bg-elevated border border-border-subtle rounded-lg px-3 py-2">
                <Search size={12} className="text-text-muted flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chords..."
                  className="bg-transparent text-xs text-text placeholder:text-text-faint outline-none w-full"
                />
              </div>
            </div>

            {/* Generator */}
            <div className="px-4 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-1 mb-2">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGenStyle(opt.key)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${
                      genStyle === opt.key
                        ? "bg-white/10 text-white"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onGenerate(genStyle)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-all cursor-pointer"
              >
                <Shuffle size={12} />
                <span className="font-mono text-[10px] font-bold tracking-wider">GENERATE</span>
              </button>
            </div>

            {/* Chord Library */}
            <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
              <div className="space-y-3">
                {filteredRoots.map((root) => {
                  const quals = filteredQualities ? filteredQualities(root) : QUALITIES;
                  if (quals.length === 0) return null;
                  return (
                    <div key={root}>
                      <h4 className="text-sm font-bold text-text mb-1.5">{root}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {quals.map((quality) => (
                          <button
                            key={`${root}-${quality}`}
                            draggable
                            onDragStart={(e) => onDragStart(e, root, quality)}
                            onClick={() => onAddChord(root, quality)}
                            className="px-2 py-1 bg-elevated border border-border rounded text-[10px] font-medium text-text-secondary hover:border-accent hover:text-text cursor-grab active:cursor-grabbing transition-colors"
                            title="Click to add · Drag to place"
                          >
                            {QUALITY_DISPLAY[quality]}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd ~/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy && npx tsc --noEmit src/components/ChordPanel.tsx 2>&1 | head -20`

Expected: No errors, or only errors about missing module resolution (acceptable at this stage since the component isn't wired in yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/ChordPanel.tsx
git commit -m "feat: add ChordPanel — collapsible chord library with search and generator"
```

---

### Task 2: Create `VoicingStrip.tsx` — Bottom voicing selector

**Files:**
- Create: `src/components/VoicingStrip.tsx`

Horizontal scrollable strip showing available voicings for the active chord. Clicking a voicing highlights it on the fretboard and plays a preview.

- [ ] **Step 1: Create VoicingStrip component**

```tsx
// src/components/VoicingStrip.tsx
import React, { useMemo } from "react";
import { getVoicingsForChord, type GuitarVoicing } from "../musicTheory/voicings";
import type { FretPosition } from "../musicTheory/fretboardMapping";
import { noteToMidi } from "../musicTheory/notes";
import { playChord } from "../utils/audioEngine";

const VOICING_TYPE_LABELS: Record<string, string> = {
  root_position: "Root Pos",
  drop2: "Drop 2",
  drop3: "Drop 3",
  drop24: "Drop 2-4",
  shell: "Shell",
  caged: "CAGED",
  barre: "Barre",
  open: "Open",
  spread: "Spread",
  cluster: "Cluster",
  quartal: "Quartal",
};

interface VoicingStripProps {
  root: string | null;
  chordSymbol: string | null;
  activeVoicingIndex: number | null;
  onSelectVoicing: (index: number, positions: FretPosition[]) => void;
}

export default function VoicingStrip({
  root,
  chordSymbol,
  activeVoicingIndex,
  onSelectVoicing,
}: VoicingStripProps) {
  const voicings = useMemo(() => {
    if (!root || !chordSymbol) return [];
    return getVoicingsForChord(root, chordSymbol, { maxFret: 15 });
  }, [root, chordSymbol]);

  if (voicings.length === 0) {
    return (
      <div className="bg-surface border-t border-border-subtle px-4 py-3 flex items-center">
        <span className="text-[10px] tracking-[2px] uppercase text-text-muted font-mono">
          {root ? "No voicings available" : "Select a chord to see voicings"}
        </span>
      </div>
    );
  }

  const handleClick = (index: number, positions: FretPosition[]) => {
    onSelectVoicing(index, positions);
    // Play preview
    const midiNotes = positions
      .map((p) => noteToMidi(p.note, p.octave))
      .sort((a, b) => a - b);
    playChord(midiNotes, 0.025, 1.35);
  };

  return (
    <div className="bg-surface border-t border-border-subtle px-4 py-3 flex items-center gap-3">
      <span className="text-[10px] tracking-[2px] uppercase text-text-muted font-mono flex-shrink-0">
        Voicings
      </span>
      <div className="flex gap-2 flex-1 overflow-x-auto custom-scrollbar pb-0.5">
        {voicings.map((v, idx) => {
          const avgFret = Math.round(
            v.positions.reduce((sum, p) => sum + p.fret, 0) / v.positions.length
          );
          const label = VOICING_TYPE_LABELS[v.voicing.voicingType] || v.voicing.voicingType;
          const isActive = activeVoicingIndex === idx;

          return (
            <button
              key={idx}
              onClick={() => handleClick(idx, v.positions)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-accent text-bg"
                  : "bg-elevated border border-border text-text-secondary hover:border-accent hover:text-text"
              }`}
            >
              {label} · fret {avgFret}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/VoicingStrip.tsx
git commit -m "feat: add VoicingStrip — horizontal voicing selector with audio preview"
```

---

### Task 3: Create `TopBar.tsx` — Transport, slots, scales, volume

**Files:**
- Create: `src/components/TopBar.tsx`

Compact top bar containing the panel toggle, transport controls, progression slots (drop targets), scale selector pills, and volume. This extracts and condenses the transport + slots + scale UI from the current `PracticeRoom.tsx`.

- [ ] **Step 1: Create TopBar component**

```tsx
// src/components/TopBar.tsx
import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  Minus,
  PanelLeft,
} from "lucide-react";
import { type ChordQuality } from "../utils/chordAudioMap";
import UserMenu from "./UserMenu";

type Slot = { root: string; quality: ChordQuality } | null;

interface TopBarProps {
  // Panel toggle
  isPanelOpen: boolean;
  onTogglePanel: () => void;

  // Transport
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  hasChords: boolean;

  // Slots
  slots: Slot[];
  activeSlotIdx: number;
  audioProgress: number;
  onSlotClick: (idx: number) => void;
  onRemoveSlot: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragLeave: (idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  dropTargetIdx: number | null;

  // Loop
  loopEnabled: boolean;
  onToggleLoop: () => void;

  // Scales
  validScales: string[];
  activeScale: string | null;
  onSelectScale: (scale: string) => void;

  // Volume
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;

  // Clear
  onClear: () => void;

}

export default function TopBar({
  isPanelOpen,
  onTogglePanel,
  isPlaying,
  onTogglePlay,
  onSkipBack,
  onSkipForward,
  hasChords,
  slots,
  activeSlotIdx,
  audioProgress,
  onSlotClick,
  onRemoveSlot,
  onDragOver,
  onDragLeave,
  onDrop,
  dropTargetIdx,
  loopEnabled,
  onToggleLoop,
  validScales,
  activeScale,
  onSelectScale,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  onClear,
}: TopBarProps) {
  return (
    <div className="bg-surface border-b border-border-subtle px-4 py-3 flex items-center gap-3">
      {/* Panel toggle */}
      <button
        onClick={onTogglePanel}
        className={`p-2 rounded-lg transition-all cursor-pointer ${
          isPanelOpen
            ? "bg-accent text-bg"
            : "bg-elevated border border-border text-text-muted hover:text-text"
        }`}
        aria-label="Toggle chord library"
      >
        <PanelLeft size={16} />
      </button>

      {/* Transport */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onSkipBack}
          disabled={!hasChords}
          className="p-1.5 rounded-lg text-text-muted hover:text-text transition-colors disabled:opacity-30"
          aria-label="Previous chord"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={onTogglePlay}
          disabled={!hasChords}
          className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-bg hover:brightness-110 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>

        <button
          onClick={onSkipForward}
          disabled={!hasChords}
          className="p-1.5 rounded-lg text-text-muted hover:text-text transition-colors disabled:opacity-30"
          aria-label="Next chord"
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Progression Slots */}
      <div className="flex gap-1.5 flex-1 max-w-md">
        {slots.map((slot, idx) => (
          <div
            key={idx}
            onDragOver={(e) => { e.preventDefault(); onDragOver(e, idx); }}
            onDragLeave={() => onDragLeave(idx)}
            onDrop={(e) => onDrop(e, idx)}
            onClick={() => slot && onSlotClick(idx)}
            className={`flex-1 h-11 rounded-lg flex items-center justify-center relative transition-all group ${
              slot ? "cursor-pointer" : ""
            } ${
              dropTargetIdx === idx
                ? "border-2 border-accent bg-accent/10 scale-[1.03]"
                : idx === activeSlotIdx && slot
                ? "border-2 border-accent bg-accent/5"
                : slot
                ? "border border-border bg-elevated hover:border-accent/50"
                : "border border-dashed border-border bg-elevated/50"
            }`}
          >
            {slot ? (
              <>
                <span className="font-bold text-sm text-text">{slot.root}</span>
                <span className="font-mono text-[10px] text-text-secondary ml-1">{slot.quality}</span>
                {/* Progress indicator */}
                {idx === activeSlotIdx && isPlaying && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border-subtle rounded-b-lg overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-[20ms] ease-linear"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveSlot(idx); }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  aria-label="Remove chord"
                >
                  <Minus size={10} />
                </button>
              </>
            ) : (
              <span className="text-text-faint text-[10px] font-mono">+</span>
            )}
          </div>
        ))}
      </div>

      {/* Scale Pills */}
      {validScales.length > 0 && (
        <div className="flex gap-1 items-center">
          {validScales.map((scale, idx) => (
            <button
              key={scale}
              onClick={() => onSelectScale(scale)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                activeScale === scale
                  ? "bg-accent text-bg"
                  : "bg-elevated text-text-muted border border-border hover:text-text"
              }`}
            >
              <span className="opacity-40 mr-0.5">{idx + 1}</span>
              {scale.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Loop */}
      <button
        onClick={onToggleLoop}
        className={`p-2 rounded-lg transition-all cursor-pointer ${
          loopEnabled
            ? "bg-accent text-bg"
            : "bg-elevated border border-border text-text-muted hover:text-text"
        }`}
        aria-label={loopEnabled ? "Loop on" : "Loop off"}
        title={loopEnabled ? "Loop on" : "Loop off"}
      >
        <RotateCcw size={14} />
      </button>

      {/* Clear */}
      {hasChords && (
        <button
          onClick={onClear}
          className="font-mono text-[10px] font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors px-2 py-1 cursor-pointer"
        >
          CLEAR
        </button>
      )}

      {/* Volume */}
      <div className="flex items-center gap-2 text-text-muted">
        <button
          onClick={onToggleMute}
          className="hover:text-text transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={isMuted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-16 h-1 accent-accent cursor-pointer"
          aria-label="Volume"
        />
      </div>

      {/* User Menu */}
      <UserMenu />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat: add TopBar — transport controls, progression slots, scales, volume"
```

---

### Task 4: Create `Workspace.tsx` — Main app shell

**Files:**
- Create: `src/components/Workspace.tsx`

This is the top-level component that replaces `PracticeRoom.tsx`. It owns all playback state, slot management, and coordinates `TopBar`, `ChordPanel`, `Fretboard`, and `VoicingStrip`. Most of the logic is lifted directly from `PracticeRoom.tsx` — the hooks (`usePitchDetection`), playback callbacks, drag handlers, and slot management.

- [ ] **Step 1: Create Workspace component**

```tsx
// src/components/Workspace.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Fretboard from "./Fretboard";
import TopBar from "./TopBar";
import ChordPanel from "./ChordPanel";
import VoicingStrip from "./VoicingStrip";
import SettingsPanel from "./SettingsPanel";
import { getChordScaleOverlay, type FretPosition } from "../musicTheory/fretboardMapping";
import { noteToMidi } from "../musicTheory/notes";
import { getChordAudioPath, getScaleOptionsForQuality, type ChordQuality } from "../utils/chordAudioMap";
import { generateProgression } from "../musicTheory/progressionGenerator";
import {
  createAudioSequencePlayer,
  playChord,
  preloadAudioEngine,
  unlockAudioEngine,
  type AudioSequenceController,
  type AudioSequenceStep,
} from "../utils/audioEngine";

const QUALITY_TO_SYMBOL: Record<ChordQuality, string> = {
  Maj7: "maj7",
  min7: "m7",
  "7": "7",
  min7b5: "m7b5",
  "7b913": "13b9",
  "7b9b13": "7alt",
};

const QUALITY_TO_INTERVALS: Record<ChordQuality, number[]> = {
  Maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  "7": [0, 4, 7, 10],
  min7b5: [0, 3, 6, 10],
  "7b913": [0, 4, 10, 13, 21],
  "7b9b13": [0, 4, 10, 13, 20],
};

type Slot = { root: string; quality: ChordQuality } | null;

export default function Workspace() {
  // ── Panel State ──
  const [isPanelOpen, setIsPanelOpen] = useState(() => {
    const saved = localStorage.getItem("rubato-panel-open");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("rubato-panel-open", String(isPanelOpen));
  }, [isPanelOpen]);

  // ── Settings ──
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Playback State ──
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([null, null, null, null]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  const [selectedScaleOverride, setSelectedScaleOverride] = useState<string | null>(null);

  // ── Voicing State ──
  const [activeVoicingIndex, setActiveVoicingIndex] = useState<number | null>(null);
  const [voicingOverlay, setVoicingOverlay] = useState<FretPosition[] | null>(null);

  // ── Drag State ──
  const [draggedChord, setDraggedChord] = useState<{ root: string; quality: ChordQuality } | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // ── Refs ──
  const sequenceRef = useRef<AudioSequenceController | null>(null);
  const sequenceRunRef = useRef(0);

  const hasChords = slots.some((s) => s !== null);
  const currentSlot = slots[activeSlotIdx];

  // ── Scale Logic ──
  const validScales = useMemo(() => {
    return currentSlot ? getScaleOptionsForQuality(currentSlot.quality) : [];
  }, [currentSlot]);

  const activeScale = selectedScaleOverride || (validScales.length > 0 ? validScales[0] : null);
  const activeScaleIndex = activeScale ? validScales.indexOf(activeScale) : 0;

  const scaleOverlay = useMemo(() => {
    if (!currentSlot || !activeScale) return [];
    return getChordScaleOverlay(currentSlot.root, QUALITY_TO_SYMBOL[currentSlot.quality], activeScale);
  }, [currentSlot, activeScale]);

  // Use voicing overlay if selected, otherwise use scale overlay
  const fretboardOverlay = voicingOverlay || scaleOverlay;

  // Reset scale and voicing when chord changes
  useEffect(() => {
    setSelectedScaleOverride(null);
    setActiveVoicingIndex(null);
    setVoicingOverlay(null);
  }, [activeSlotIdx]);

  // ── Volume sync ──
  useEffect(() => {
    sequenceRef.current?.setVolume(isMuted ? 0 : volume / 100);
  }, [isMuted, volume]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      sequenceRef.current?.stop(0.02);
      sequenceRef.current = null;
    };
  }, []);

  // ── Playback Logic (from PracticeRoom) ──

  const buildSequenceSteps = useCallback(
    (startIdx: number): AudioSequenceStep[] => {
      const steps: AudioSequenceStep[] = [];
      const slotsToVisit = loopEnabled
        ? Array.from({ length: 4 }, (_, offset) => (startIdx + offset) % 4)
        : Array.from({ length: 4 - startIdx }, (_, offset) => startIdx + offset);

      slotsToVisit.forEach((slotIdx) => {
        const slot = slots[slotIdx];
        if (!slot) return;
        steps.push({ id: String(slotIdx), url: getChordAudioPath(slot.root, slot.quality) });
      });
      return steps;
    },
    [loopEnabled, slots]
  );

  const playFromSlot = useCallback(
    async (slotIdx: number) => {
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
    },
    [buildSequenceSteps, isMuted, loopEnabled, slots, volume]
  );

  const skipToNextValidSlot = useCallback(
    (currentIdx: number) => {
      let nextIdx = currentIdx + 1;
      for (let i = 0; i < 4; i++) {
        if (nextIdx >= 4) {
          if (!loopEnabled) {
            setIsPlaying(false);
            setActiveSlotIdx(0);
            setAudioProgress(0);
            return;
          }
          nextIdx = 0;
        }
        if (slots[nextIdx]) {
          if (isPlaying) playFromSlot(nextIdx);
          else {
            setActiveSlotIdx(nextIdx);
            setAudioProgress(0);
          }
          return;
        }
        nextIdx++;
      }
      setIsPlaying(false);
      setActiveSlotIdx(0);
      setAudioProgress(0);
    },
    [isPlaying, loopEnabled, playFromSlot, slots]
  );

  const skipBack = useCallback(() => {
    let prevIdx = activeSlotIdx - 1;
    for (let i = 0; i < 4; i++) {
      if (prevIdx < 0) prevIdx = 3;
      if (slots[prevIdx]) {
        if (isPlaying) playFromSlot(prevIdx);
        else {
          setActiveSlotIdx(prevIdx);
          setAudioProgress(0);
        }
        return;
      }
      prevIdx--;
    }
  }, [activeSlotIdx, isPlaying, playFromSlot, slots]);

  const togglePlay = useCallback(() => {
    if (!hasChords) return;
    unlockAudioEngine();
    preloadAudioEngine().catch(() => {});

    if (isPlaying) {
      sequenceRunRef.current += 1;
      sequenceRef.current?.stop(0.03);
      sequenceRef.current = null;
      setIsPlaying(false);
      return;
    }

    if (!slots[activeSlotIdx]) {
      const firstValid = slots.findIndex((s) => s !== null);
      if (firstValid !== -1) {
        playFromSlot(firstValid);
        return;
      }
    }
    playFromSlot(activeSlotIdx);
  }, [activeSlotIdx, hasChords, isPlaying, playFromSlot, slots]);

  const handleClear = useCallback(() => {
    sequenceRunRef.current += 1;
    sequenceRef.current?.stop(0.02);
    sequenceRef.current = null;
    setSlots([null, null, null, null]);
    setIsPlaying(false);
    setActiveSlotIdx(0);
    setAudioProgress(0);
    setActiveVoicingIndex(null);
    setVoicingOverlay(null);
  }, []);

  // ── Chord Add/Preview ──

  const previewChord = useCallback((root: string, quality: ChordQuality) => {
    const rootMidi = noteToMidi(root, 3);
    const midiNotes = QUALITY_TO_INTERVALS[quality].map((interval) => rootMidi + interval);
    playChord(midiNotes, 0.025, 1.35);
  }, []);

  const addChordFromLibrary = useCallback(
    (root: string, quality: ChordQuality) => {
      unlockAudioEngine();
      preloadAudioEngine().catch(() => {});
      previewChord(root, quality);
      setSlots((prev) => {
        const next = [...prev];
        const targetIdx = next.findIndex((slot) => slot === null);
        const idx = targetIdx === -1 ? activeSlotIdx : targetIdx;
        next[idx] = { root, quality };
        setActiveSlotIdx(idx);
        setAudioProgress(0);
        return next;
      });
    },
    [activeSlotIdx, previewChord]
  );

  const handleGenerate = useCallback(
    (style: "jazz" | "blues" | "pop" | "modal") => {
      unlockAudioEngine();
      preloadAudioEngine().catch(() => {});
      const progression = generateProgression(style);
      setSlots(progression);
      setIsPlaying(false);
      setActiveSlotIdx(0);
      setAudioProgress(0);
    },
    []
  );

  // ── Drag Handlers ──

  const handleDragStart = useCallback(
    (e: React.DragEvent, root: string, quality: ChordQuality) => {
      setDraggedChord({ root, quality });
      previewChord(root, quality);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("application/json", JSON.stringify({ root, quality }));
      }
    },
    [previewChord]
  );

  const handleDragOver = useCallback((_e: React.DragEvent, index: number) => {
    setDropTargetIdx(index);
  }, []);

  const handleDragLeave = useCallback((idx: number) => {
    setDropTargetIdx((current) => (current === idx ? null : current));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
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
    },
    [draggedChord, isPlaying, playFromSlot, previewChord, slots]
  );

  const handleSlotClick = useCallback(
    (idx: number) => {
      if (!isPlaying) {
        setActiveSlotIdx(idx);
        setAudioProgress(0);
        playFromSlot(idx);
      }
    },
    [isPlaying, playFromSlot]
  );

  const handleRemoveSlot = useCallback(
    (idx: number) => {
      const n = [...slots];
      n[idx] = null;
      setSlots(n);
      if (idx === activeSlotIdx && isPlaying) skipToNextValidSlot(activeSlotIdx);
    },
    [activeSlotIdx, isPlaying, skipToNextValidSlot, slots]
  );

  // ── Voicing Selection ──
  const handleSelectVoicing = useCallback((_index: number, positions: FretPosition[]) => {
    setActiveVoicingIndex(_index);
    setVoicingOverlay(positions);
  }, []);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Cmd/Ctrl+B: toggle panel
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setIsPanelOpen((prev) => !prev);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (validScales.length === 0) return;

      // Number keys 1-9 for scales
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= validScales.length) {
        e.preventDefault();
        setSelectedScaleOverride(validScales[num - 1]);
        setActiveVoicingIndex(null);
        setVoicingOverlay(null);
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = (activeScaleIndex + 1) % validScales.length;
        setSelectedScaleOverride(validScales[next]);
        setActiveVoicingIndex(null);
        setVoicingOverlay(null);
      }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = (activeScaleIndex - 1 + validScales.length) % validScales.length;
        setSelectedScaleOverride(validScales[prev]);
        setActiveVoicingIndex(null);
        setVoicingOverlay(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [validScales, activeScaleIndex]);

  // Handle empty slot during playback
  useEffect(() => {
    if (isPlaying && !slots[activeSlotIdx]) {
      skipToNextValidSlot(activeSlotIdx);
    }
  }, [slots, isPlaying, activeSlotIdx, skipToNextValidSlot]);

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden font-sans">
      {/* Left Panel */}
      <ChordPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onAddChord={addChordFromLibrary}
        onDragStart={handleDragStart}
        onGenerate={handleGenerate}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar
          isPanelOpen={isPanelOpen}
          onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onSkipBack={skipBack}
          onSkipForward={() => skipToNextValidSlot(activeSlotIdx)}
          hasChords={hasChords}
          slots={slots}
          activeSlotIdx={activeSlotIdx}
          audioProgress={audioProgress}
          onSlotClick={handleSlotClick}
          onRemoveSlot={handleRemoveSlot}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dropTargetIdx={dropTargetIdx}
          loopEnabled={loopEnabled}
          onToggleLoop={() => setLoopEnabled((prev) => !prev)}
          validScales={validScales}
          activeScale={activeScale}
          onSelectScale={(scale) => {
            setSelectedScaleOverride(scale);
            setActiveVoicingIndex(null);
            setVoicingOverlay(null);
          }}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={(v) => { setVolume(v); setIsMuted(false); }}
          onToggleMute={() => setIsMuted((prev) => !prev)}
          onClear={handleClear}
        />

        {/* Fretboard — Hero */}
        <div className="flex-1 p-6 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3">
            <span className={`px-4 py-1.5 rounded-xl font-bold text-sm ${
              currentSlot ? "text-bg bg-accent" : "text-text-muted bg-elevated border border-border"
            }`}>
              {currentSlot ? `${currentSlot.root}${currentSlot.quality}` : "No Chord Active"}
            </span>

            {voicingOverlay && (
              <button
                onClick={() => { setActiveVoicingIndex(null); setVoicingOverlay(null); }}
                className="text-[10px] font-mono text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                Show full scale
              </button>
            )}
          </div>

          <Fretboard activeNotes={fretboardOverlay} showIntervals={true} />

          <div className="mt-3 flex gap-6 text-xs text-text-secondary justify-center bg-elevated border border-border p-2.5 rounded-lg w-fit mx-auto">
            <div className="flex items-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent mr-1.5"></span>Root
            </div>
            <div className="flex items-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-text-secondary mr-1.5"></span>Chord Tone
            </div>
            <div className="flex items-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-text-muted mr-1.5 opacity-60"></span>Tension
            </div>
          </div>
        </div>

        {/* Bottom Voicing Strip */}
        <VoicingStrip
          root={currentSlot?.root ?? null}
          chordSymbol={currentSlot ? QUALITY_TO_SYMBOL[currentSlot.quality] : null}
          activeVoicingIndex={activeVoicingIndex}
          onSelectVoicing={handleSelectVoicing}
        />
      </div>

      {/* Settings Panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Workspace.tsx
git commit -m "feat: add Workspace — single-screen app shell coordinating all zones"
```

---

### Task 5: Rewire `App.tsx` — Strip routes and remove sidebar

**Files:**
- Modify: `src/App.tsx`

Replace the entire file. Remove all lazy imports for deleted pages, remove Sidebar, remove AnimatedRoutes, remove ShortcutsHelp overlay (keyboard shortcuts are now in Workspace). The app becomes: `/auth` → AuthPage, everything else → ProtectedRoute → Workspace.

- [ ] **Step 1: Rewrite App.tsx**

Replace the full contents of `src/App.tsx` with:

```tsx
import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { preloadAudioEngine, unlockAudioEngine } from "./utils/audioEngine";

const Workspace = lazy(() => import("./components/Workspace"));
const AuthPage = lazy(() => import("./components/AuthPage"));

function LoadingScreen() {
  return (
    <div className="h-screen bg-bg flex items-center justify-center">
      <div className="text-text-muted text-sm font-mono tracking-wider animate-pulse">
        RUBATO
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  useEffect(() => {
    const primeAudio = () => {
      unlockAudioEngine();
      preloadAudioEngine().catch(() => {});
    };

    window.addEventListener("pointerdown", primeAudio, { once: true, passive: true });
    window.addEventListener("keydown", primeAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Helmet>
        <title>Rubato</title>
      </Helmet>
      <Workspace />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AuthenticatedApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </HelmetProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: strip App.tsx to two routes — workspace and auth"
```

---

### Task 6: Update `useKeyboardShortcuts.ts` — Remove navigation shortcuts

**Files:**
- Modify: `src/utils/useKeyboardShortcuts.ts`

The old navigation shortcuts (p, f, c, v, i, a) reference deleted routes. Replace with a minimal version that only handles the `?` help toggle. The workspace handles its own shortcuts internally.

- [ ] **Step 1: Rewrite useKeyboardShortcuts.ts**

Replace the full contents with:

```tsx
import { useEffect, useCallback, useState } from "react";

export interface ShortcutEntry {
  key: string;
  description: string;
  scope: "global" | string;
}

export const SHORTCUTS: ShortcutEntry[] = [
  { key: "Cmd/Ctrl+B", description: "Toggle chord library", scope: "global" },
  { key: "1-9", description: "Switch scale", scope: "global" },
  { key: "↑/↓", description: "Cycle scales", scope: "global" },
  { key: "?", description: "Toggle shortcuts help", scope: "global" },
];

export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "?":
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
        case "Escape":
          if (showHelp) {
            e.preventDefault();
            setShowHelp(false);
          }
          break;
      }
    },
    [showHelp]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/useKeyboardShortcuts.ts
git commit -m "refactor: strip navigation shortcuts — workspace handles its own"
```

---

### Task 7: Delete removed components and clean up imports

**Files:**
- Delete: `src/components/Dashboard.tsx`
- Delete: `src/components/Sidebar.tsx`
- Delete: `src/components/LessonView.tsx`
- Delete: `src/components/LessonExercises.tsx`
- Delete: `src/components/PerformanceAnalysis.tsx`
- Delete: `src/components/AIInstructor.tsx`
- Delete: `src/components/CircleOfFifths.tsx`
- Delete: `src/components/PricingPage.tsx`
- Delete: `src/components/FretboardExplorer.tsx`
- Delete: `src/components/JamStudio.tsx`
- Delete: `src/components/PracticeRoom.tsx`
- Delete: `src/components/__tests__/PerformanceAnalysis.test.tsx`

- [ ] **Step 1: Delete all removed component files**

```bash
cd ~/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy
rm src/components/Dashboard.tsx
rm src/components/Sidebar.tsx
rm src/components/LessonView.tsx
rm src/components/LessonExercises.tsx
rm src/components/PerformanceAnalysis.tsx
rm src/components/AIInstructor.tsx
rm src/components/CircleOfFifths.tsx
rm src/components/PricingPage.tsx
rm src/components/FretboardExplorer.tsx
rm src/components/JamStudio.tsx
rm src/components/PracticeRoom.tsx
rm -rf src/components/__tests__
```

- [ ] **Step 2: Remove dead imports from store**

In `src/store/useAppStore.ts`, remove the `PracticeSession` interface, `recentSessions`, `totalPracticeMinutes`, `overallAccuracy`, `sessionsCompleted`, `currentStreak`, `lastPracticeDate`, `recordPracticeSession`, and `recordSessionToSupabase` — all progress tracking code that no longer has a UI. Also remove `LessonProgress`, `modulesUnlocked`, and lesson-related actions if they exist.

Check for any other files that import deleted components:

```bash
grep -rn "from.*Dashboard\|from.*Sidebar\|from.*LessonView\|from.*LessonExercises\|from.*PerformanceAnalysis\|from.*AIInstructor\|from.*CircleOfFifths\|from.*PricingPage\|from.*FretboardExplorer\|from.*JamStudio\|from.*PracticeRoom" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```

Fix any remaining imports that reference deleted files.

- [ ] **Step 3: Verify the app compiles**

```bash
cd ~/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors related to deleted files. There may be warnings about unused variables — fix those if they appear.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete legacy page components and clean up dead imports"
```

---

### Task 8: Add `.superpowers/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add entry to .gitignore**

Append `.superpowers/` to the `.gitignore` file.

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers/ to gitignore"
```

---

### Task 9: Verify and fix — full integration test

**Files:**
- No new files

- [ ] **Step 1: Start the dev server and verify no console errors**

```bash
cd ~/Downloads/virtuoso_guitar_academy/virtuoso_-advanced-guitar-academy && npm run dev
```

Open `http://localhost:3000` (or whichever port). Verify:
- App loads directly into the Workspace (no dashboard, no sidebar)
- Chord panel is visible on the left by default
- Clicking a chord adds it to a slot and previews audio
- Fretboard shows scale overlay for the active chord
- Scale pills in top bar switch scales
- Voicing strip at bottom shows voicings for the active chord
- Play/pause/skip transport works
- Generate button in the panel creates a progression
- Cmd+B toggles the panel
- Panel collapse gives fretboard full width

- [ ] **Step 2: Fix any TypeScript errors**

```bash
npx tsc --noEmit 2>&1
```

Fix all errors.

- [ ] **Step 3: Fix any runtime errors found during manual testing**

Address any issues discovered in step 1.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve integration issues from workspace redesign"
```

- [ ] **Step 5: Push to remote**

```bash
git push origin develop
```
