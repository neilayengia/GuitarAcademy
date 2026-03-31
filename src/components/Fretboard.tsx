/**
 * Fretboard.tsx — Interactive SVG guitar fretboard
 *
 * Features:
 * - SVG-based rendering for crisp scaling
 * - Configurable fret range (startFret/endFret)
 * - Scale overlay mode with interval labels
 * - Chord shape mode with finger dots
 * - Click-to-play audio via Web Audio
 * - Framer Motion animations
 * - Root note highlighting
 */

import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { FretPosition } from '../musicTheory/fretboardMapping';
import { getNoteAtPosition } from '../musicTheory/fretboardMapping';
import { playNote } from '../utils/audioEngine';

// ── Layout Constants ─────────────────────────────────────────────────────────

const DEFAULT_NUM_FRETS = 15;
const NUM_STRINGS = 6;
const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E']; // high to low (string 1-6)

// SVG dimensions
const PADDING_LEFT = 48;
const PADDING_RIGHT = 16;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 36;
const NUT_WIDTH = 8;
const FRET_AREA_WIDTH = 900;
const STRING_SPACING = 28;
const FRETBOARD_HEIGHT = STRING_SPACING * (NUM_STRINGS - 1);

// ── Color System ─────────────────────────────────────────────────────────────
// Designed for clarity on dark fretboard:
// - Root: bright gold (always stands out)
// - Chord tones (3,5,7): warm white
// - Scale tones (2,4,6): cool blue
// - Tensions (b9,#9,#11,b13): purple
// - Avoid notes: dim gray

const COLORS = {
  root: '#d4a44a',       // Gold — always the root, unmistakable
  chordTone: '#e8e8e8',  // Warm white — essential chord tones
  scaleTone: '#5b9bd5',  // Cool blue — available scale tones
  tension: '#b07ed8',    // Purple — color tensions / extensions
  avoid: '#4a4a4a',      // Dim — avoid notes
  default: '#6a6a6a',
  activeBg: 'rgba(212, 164, 74, 0.08)',
};

function getNoteColor(pos: FretPosition): string {
  if (pos.isRoot) return COLORS.root;
  if (pos.color) return pos.color;

  const label = pos.interval;
  if (!label) return COLORS.default;

  if (label === 'R') return COLORS.root;
  // Chord tones: 3rds, 5ths, 7ths
  if (['3', 'b3', '5'].includes(label)) return COLORS.chordTone;
  if (['7', 'b7', 'bb7'].includes(label)) return COLORS.chordTone;
  // Tensions / extensions
  if (['b5', '#5', '9', 'b9', '#9', '11', '#11', '13', 'b13'].includes(label)) return COLORS.tension;
  // Scale tones (2, 4, 6 — diatonic passing tones)
  if (['2', '4', '6'].includes(label)) return COLORS.scaleTone;
  return COLORS.scaleTone;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface FretboardProps {
  activeNotes?: FretPosition[];
  showIntervals?: boolean;
  clickToPlay?: boolean;
  onNoteClick?: (pos: FretPosition) => void;
  highlightRange?: { start: number; end: number };
  compact?: boolean;
  /** First fret to display (default 0) */
  startFret?: number;
  /** Last fret to display (default: auto-calculated from activeNotes, min 15) */
  endFret?: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Fretboard({
  activeNotes = [],
  showIntervals = false,
  clickToPlay = true,
  onNoteClick,
  highlightRange,
  compact = false,
  startFret: propStartFret,
  endFret: propEndFret,
}: FretboardProps) {

  // Auto-calculate fret range — always start from 0, extend endFret if needed
  const { startFret, endFret } = useMemo(() => {
    const sf = propStartFret ?? 0;
    let ef = propEndFret ?? DEFAULT_NUM_FRETS;

    if (activeNotes.length > 0 && propEndFret === undefined) {
      const maxActiveFret = Math.max(...activeNotes.map(n => n.fret));
      if (maxActiveFret > ef) {
        ef = Math.min(maxActiveFret + 2, 22);
      }
    }

    return { startFret: sf, endFret: ef };
  }, [activeNotes, propStartFret, propEndFret]);

  const numFrets = endFret - startFret;
  const showNut = startFret === 0;

  const SVG_WIDTH = PADDING_LEFT + (showNut ? NUT_WIDTH : 0) + FRET_AREA_WIDTH + PADDING_RIGHT;
  const SVG_HEIGHT = PADDING_TOP + FRETBOARD_HEIGHT + PADDING_BOTTOM;

  // Fret position helpers (relative to the visible range)
  const getFretX = useCallback((fret: number): number => {
    const relativeFret = fret - startFret;
    if (fret === 0 && startFret === 0) return PADDING_LEFT;
    const fretWidth = FRET_AREA_WIDTH / numFrets;
    const offset = showNut ? NUT_WIDTH : 0;
    return PADDING_LEFT + offset + (relativeFret - (showNut ? 1 : 0)) * fretWidth;
  }, [startFret, numFrets, showNut]);

  const getFretCenterX = useCallback((fret: number): number => {
    if (fret === 0 && startFret === 0) return PADDING_LEFT - 12;
    const fretWidth = FRET_AREA_WIDTH / numFrets;
    const offset = showNut ? NUT_WIDTH : 0;
    const relativeFret = fret - startFret;
    return PADDING_LEFT + offset + (relativeFret - (showNut ? 1 : 0) + 0.5) * fretWidth;
  }, [startFret, numFrets, showNut]);

  const getStringY = (stringNum: number): number => {
    return PADDING_TOP + (stringNum - 1) * STRING_SPACING;
  };

  // Active notes lookup
  const activeMap = useMemo(() => {
    const map = new Map<string, FretPosition>();
    activeNotes.forEach(n => map.set(`${n.string}-${n.fret}`, n));
    return map;
  }, [activeNotes]);

  const handleFretClick = useCallback((string: number, fret: number) => {
    const pos = getNoteAtPosition(string, fret);
    const activePos = activeMap.get(`${string}-${fret}`) || pos;
    if (clickToPlay) playNote(pos.midi, 0.8);
    onNoteClick?.(activePos);
  }, [clickToPlay, onNoteClick, activeMap]);

  // Determine which fret numbers to label
  const fretLabels = useMemo(() => {
    const labels: number[] = [];
    for (let f = startFret + 1; f <= endFret; f++) {
      if ([1, 3, 5, 7, 9, 12, 15, 17, 19, 21].includes(f)) {
        labels.push(f);
      }
    }
    return labels;
  }, [startFret, endFret]);

  // Markers
  const singleMarkers = [3, 5, 7, 9, 15, 17, 19, 21].filter(f => f > startFret && f <= endFret);
  const doubleMarkers = [12].filter(f => f > startFret && f <= endFret);

  const scaleFactor = compact ? 0.7 : 1;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full min-w-[700px]"
        style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'top left' }}
        role="img"
        aria-label="Interactive guitar fretboard"
      >
        {/* ── Fretboard Background ── */}
        <rect
          x={PADDING_LEFT}
          y={PADDING_TOP - 4}
          width={(showNut ? NUT_WIDTH : 0) + FRET_AREA_WIDTH}
          height={FRETBOARD_HEIGHT + 8}
          rx={4}
          fill="#161618"
        />

        {/* ── Highlight Range (CAGED) ── */}
        {highlightRange && (
          <rect
            x={getFretX(Math.max(highlightRange.start, startFret))}
            y={PADDING_TOP - 6}
            width={getFretX(Math.min(highlightRange.end + 1, endFret)) - getFretX(Math.max(highlightRange.start, startFret))}
            height={FRETBOARD_HEIGHT + 12}
            rx={6}
            fill={COLORS.activeBg}
            stroke={COLORS.root}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.4}
          />
        )}

        {/* ── Nut ── */}
        {showNut && (
          <rect
            x={PADDING_LEFT}
            y={PADDING_TOP - 4}
            width={NUT_WIDTH}
            height={FRETBOARD_HEIGHT + 8}
            rx={2}
            fill="#E4E3E0"
          />
        )}

        {/* ── Fret Wires ── */}
        {Array.from({ length: numFrets }).map((_, i) => {
          const fret = startFret + i + 1;
          const fretWidth = FRET_AREA_WIDTH / numFrets;
          const offset = showNut ? NUT_WIDTH : 0;
          const x = PADDING_LEFT + offset + (i + (showNut ? 0 : 1)) * fretWidth;
          return (
            <line
              key={`fret-${fret}`}
              x1={x}
              y1={PADDING_TOP - 4}
              x2={x}
              y2={PADDING_TOP + FRETBOARD_HEIGHT + 4}
              stroke="#2a2a2d"
              strokeWidth={2}
            />
          );
        })}

        {/* ── Fret Markers (dots) ── */}
        {singleMarkers.map(fret => (
          <circle
            key={`marker-${fret}`}
            cx={getFretCenterX(fret)}
            cy={PADDING_TOP + FRETBOARD_HEIGHT / 2}
            r={5}
            fill="#232326"
            opacity={0.6}
          />
        ))}
        {doubleMarkers.map(fret => (
          <React.Fragment key={`dmarker-${fret}`}>
            <circle cx={getFretCenterX(fret)} cy={PADDING_TOP + FRETBOARD_HEIGHT * 0.25} r={5} fill="#232326" opacity={0.6} />
            <circle cx={getFretCenterX(fret)} cy={PADDING_TOP + FRETBOARD_HEIGHT * 0.75} r={5} fill="#232326" opacity={0.6} />
          </React.Fragment>
        ))}

        {/* ── Strings ── */}
        {Array.from({ length: NUM_STRINGS }).map((_, i) => {
          const stringNum = i + 1;
          const y = getStringY(stringNum);
          const thickness = 1 + (stringNum - 1) * 0.4;
          return (
            <line
              key={`string-${stringNum}`}
              x1={PADDING_LEFT}
              y1={y}
              x2={PADDING_LEFT + (showNut ? NUT_WIDTH : 0) + FRET_AREA_WIDTH}
              y2={y}
              stroke="#71717A"
              strokeWidth={thickness}
              opacity={0.7}
            />
          );
        })}

        {/* ── String Labels ── */}
        {STRING_NAMES.map((name, i) => (
          <text
            key={`slabel-${i}`}
            x={PADDING_LEFT - 16}
            y={getStringY(i + 1) + 4}
            textAnchor="middle"
            fill="#71717A"
            fontSize={11}
            fontFamily="'Inter', sans-serif"
          >
            {name}
          </text>
        ))}

        {/* ── Fret Numbers ── */}
        {fretLabels.map(fret => (
          <text
            key={`fnum-${fret}`}
            x={getFretCenterX(fret)}
            y={PADDING_TOP + FRETBOARD_HEIGHT + 28}
            textAnchor="middle"
            fill="#71717A"
            fontSize={10}
            fontFamily="'Inter', sans-serif"
          >
            {fret}
          </text>
        ))}

        {/* ── Start fret indicator (when not starting at 0) ── */}
        {startFret > 0 && (
          <text
            x={PADDING_LEFT + 8}
            y={PADDING_TOP - 10}
            fill="#717786"
            fontSize={11}
            fontWeight={600}
            fontFamily="'Inter', sans-serif"
          >
            {startFret}fr
          </text>
        )}

        {/* ── Clickable Areas ── */}
        {Array.from({ length: NUM_STRINGS }).map((_, si) =>
          Array.from({ length: numFrets + (showNut ? 1 : 0) }).map((_, fi) => {
            const stringNum = si + 1;
            const fret = startFret + fi;
            const cx = getFretCenterX(fret);
            const cy = getStringY(stringNum);
            const fretWidth = FRET_AREA_WIDTH / numFrets;
            const halfW = fret === 0 ? 14 : fretWidth / 2;
            const activeNote = activeMap.get(`${stringNum}-${fret}`);

            return (
              <rect
                key={`click-${stringNum}-${fret}`}
                x={cx - halfW}
                y={cy - STRING_SPACING / 2}
                width={halfW * 2}
                height={STRING_SPACING}
                fill="transparent"
                className="cursor-pointer"
                role="button"
                tabIndex={activeNote ? 0 : -1}
                aria-label={`String ${stringNum}, fret ${fret}${activeNote ? ': ' + activeNote.note : ''}`}
                onClick={() => handleFretClick(stringNum, fret)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFretClick(stringNum, fret);
                  }
                }}
              />
            );
          })
        )}

        {/* ── Active Notes ── */}
        <AnimatePresence>
          {activeNotes.filter(pos => pos.fret >= startFret && pos.fret <= endFret).map((pos, idx) => {
            const cx = getFretCenterX(pos.fret);
            const cy = getStringY(pos.string);
            const color = getNoteColor(pos);
            const label = showIntervals ? (pos.interval || pos.note) : pos.note;
            const isRoot = pos.isRoot || pos.interval === 'R';
            const r = isRoot ? 13 : 11;

            return (
              <motion.g
                key={`note-${pos.string}-${pos.fret}-${idx}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: idx * 0.02 }}
                style={{ originX: `${cx}px`, originY: `${cy}px` }}
                className="cursor-pointer"
                onClick={() => handleFretClick(pos.string, pos.fret)}
              >
                {isRoot && (
                  <circle cx={cx} cy={cy} r={r + 4} fill={color} opacity={0.15} />
                )}
                <circle cx={cx} cy={cy} r={r} fill={color} stroke="#0C0C0E" strokeWidth={2} />
                <text
                  x={cx} y={cy + 4}
                  textAnchor="middle" fill="white"
                  fontSize={isRoot ? 10 : 9}
                  fontWeight={isRoot ? 700 : 500}
                  fontFamily="'Inter', sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>
    </div>
  );
}
