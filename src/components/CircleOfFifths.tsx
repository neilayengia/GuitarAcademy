import React from 'react';
import { motion } from 'motion/react';

const KEYS_ORDER = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR_KEYS = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

interface CircleOfFifthsProps {
  selected: string;
  onSelect: (key: string) => void;
  size?: number;
}

export default function CircleOfFifths({ selected, onSelect, size = 200 }: CircleOfFifthsProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.27;
  const labelOuterR = size * 0.345;
  const labelInnerR = size * 0.215;

  // Normalize selected for comparison (handle enharmonics)
  const normalize = (n: string) => {
    const map: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'F#', 'G#': 'Ab', 'A#': 'Bb', 'Gb': 'F#' };
    return map[n] || n;
  };
  const selectedNorm = normalize(selected);

  const arcPath = (startAngle: number, endAngle: number, r1: number, r2: number) => {
    const toRad = (a: number) => (a - 90) * (Math.PI / 180);
    const x1 = cx + r1 * Math.cos(toRad(startAngle));
    const y1 = cy + r1 * Math.sin(toRad(startAngle));
    const x2 = cx + r1 * Math.cos(toRad(endAngle));
    const y2 = cy + r1 * Math.sin(toRad(endAngle));
    const x3 = cx + r2 * Math.cos(toRad(endAngle));
    const y3 = cy + r2 * Math.sin(toRad(endAngle));
    const x4 = cx + r2 * Math.cos(toRad(startAngle));
    const y4 = cy + r2 * Math.sin(toRad(startAngle));
    return `M${x1},${y1} A${r1},${r1} 0 0,1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 0,0 ${x4},${y4} Z`;
  };

  const segAngle = 360 / 12;

  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0"
    >
      {/* Outer ring segments (major keys) */}
      {KEYS_ORDER.map((key, i) => {
        const startA = i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const isActive = normalize(key) === selectedNorm;
        const toRad = (a: number) => (a - 90) * (Math.PI / 180);
        const midA = startA + segAngle / 2;
        const lx = cx + labelOuterR * Math.cos(toRad(midA));
        const ly = cy + labelOuterR * Math.sin(toRad(midA));

        return (
          <g key={key} onClick={() => onSelect(key)} className="cursor-pointer">
            <path
              d={arcPath(startA, endA, outerR, innerR + 2)}
              fill={isActive ? 'rgba(212, 164, 74, 0.2)' : 'rgba(255,255,255,0.02)'}
              stroke={isActive ? 'rgba(212, 164, 74, 0.5)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={isActive ? 1.5 : 0.5}
              className="transition-all duration-200 hover:fill-[rgba(255,255,255,0.06)]"
            />
            {isActive && (
              <path
                d={arcPath(startA, endA, outerR, innerR + 2)}
                fill="none"
                stroke="rgba(212, 164, 74, 0.15)"
                strokeWidth={4}
                filter="url(#glow)"
              />
            )}
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="select-none pointer-events-none"
              style={{
                fontSize: isActive ? '12px' : '10px',
                fontWeight: isActive ? 700 : 500,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fill: isActive ? '#d4a44a' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s ease',
              }}
            >
              {key}
            </text>
          </g>
        );
      })}

      {/* Inner ring segments (relative minors) */}
      {MINOR_KEYS.map((key, i) => {
        const startA = i * segAngle - segAngle / 2;
        const endA = startA + segAngle;
        const toRad = (a: number) => (a - 90) * (Math.PI / 180);
        const midA = startA + segAngle / 2;
        const lx = cx + labelInnerR * Math.cos(toRad(midA));
        const ly = cy + labelInnerR * Math.sin(toRad(midA));

        return (
          <g key={key}>
            <path
              d={arcPath(startA, endA, innerR, size * 0.12)}
              fill="rgba(255,255,255,0.01)"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={0.5}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="select-none"
              style={{
                fontSize: '8px',
                fontWeight: 400,
                fontFamily: "'JetBrains Mono', monospace",
                fill: 'rgba(255,255,255,0.2)',
              }}
            >
              {key}
            </text>
          </g>
        );
      })}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={size * 0.11} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: '7px',
          fontFamily: "'JetBrains Mono', monospace",
          fill: 'rgba(255,255,255,0.15)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}
      >
        5ths
      </text>

      {/* SVG filter for glow */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </motion.svg>
  );
}
