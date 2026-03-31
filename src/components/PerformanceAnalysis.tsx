import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    const startTime = performance.now();
    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);
  return value;
}

export default function PerformanceAnalysis() {
  const navigate = useNavigate();
  const { totalPracticeMinutes, overallAccuracy, currentStreak, recentSessions, sessionsCompleted } = useAppStore();

  const hours = totalPracticeMinutes / 60;
  const animHours = useAnimatedCounter(Math.round(hours * 10)) / 10;
  const animVoicings = useAnimatedCounter(sessionsCompleted * 3); // approximate

  // Generate chart data from recent sessions (or placeholder)
  const chartData = recentSessions.length > 0
    ? recentSessions.slice(0, 7).reverse().map(s => s.durationMinutes)
    : [2, 3, 4, 3, 6, 8, 10, 9, 12, 11, 14, 12];

  const maxVal = Math.max(...chartData, 1);
  const chartPoints = chartData.map((v, i) => {
    const x = (i / (chartData.length - 1)) * 100;
    const y = 100 - (v / maxVal) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero with background */}
      <div className="relative h-[340px] overflow-hidden">
        <img src="/hero-guitar.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f0f]" />

        <div className="relative px-10 pt-10 h-full flex flex-col justify-between pb-8">
          <p className="text-[11px] tracking-[3px] uppercase text-[#555]">Analytics Overview</p>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[0.9] mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Your <span className="font-light opacity-30">Evolution</span>
              </h1>
              <p className="text-[#888] text-base max-w-md">
                Tracking your journey through complex harmony and physical endurance.
              </p>
            </div>

            {/* Stat cards */}
            <div className="flex gap-4">
              <div className="glass-card px-8 py-5 text-center">
                <p className="text-3xl font-bold mb-1">{animHours.toFixed(1)}</p>
                <p className="text-[10px] tracking-[2px] uppercase text-[#555]">Hrs This Week</p>
              </div>
              <div className="glass-card px-8 py-5 text-center">
                <p className="text-3xl font-bold mb-1">{animVoicings}</p>
                <p className="text-[10px] tracking-[2px] uppercase text-[#555]">Voicings Learned</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-10 pb-12">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#222]">
          <svg viewBox="0 0 100 100" className="w-full h-64" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75].map(y => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#222" strokeWidth="0.3" />
            ))}

            {/* Area fill */}
            <polygon
              points={`0,100 ${chartPoints} 100,100`}
              fill="url(#chartGrad)"
              opacity="0.3"
            />

            {/* Line */}
            <polyline
              points={chartPoints}
              fill="none"
              stroke="white"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />

            {/* Gradient def */}
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between mt-4 text-[11px] text-[#555] tracking-wide">
            {days.map(d => <span key={d}>{d}</span>)}
          </div>
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] tracking-[3px] uppercase text-[#555] mb-4">Recent Sessions</p>
            <div className="space-y-2">
              {recentSessions.slice(0, 5).map((session, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-[#222] hover:bg-[#1e1e1e] transition-colors">
                  <div>
                    <p className="text-sm font-medium">{session.chordsPracticed.length > 0 ? session.chordsPracticed.slice(0, 3).join(', ') : `${session.durationMinutes}min session`}</p>
                    <p className="text-[11px] text-[#555] mt-0.5">{session.bpm} BPM · {session.durationMinutes}m</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${session.accuracy}%` }} />
                    </div>
                    <span className="text-xs text-[#888] w-8 text-right">{session.accuracy}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentSessions.length === 0 && (
          <div className="mt-8 text-center py-16">
            <p className="text-[#555] mb-4">No practice data yet</p>
            <button onClick={() => navigate('/practice')} className="px-6 py-3 bg-white text-black rounded-full text-sm font-semibold hover:bg-white/90 transition-colors">
              Start Practicing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
