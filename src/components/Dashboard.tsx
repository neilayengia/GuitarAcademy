import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight, BookOpen, Check, ChevronRight, Zap,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuth } from "../contexts/AuthContext";
import { MODULE_1, CURRICULUM, getTotalLessons } from "../data/curriculum";


export default function Dashboard() {
  const navigate = useNavigate();
  const { currentStreak, totalPracticeMinutes, sessionsCompleted, lessonProgress } = useAppStore();
  const { profile } = useAuth();
  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Guitarist";

  const hours = Math.floor(totalPracticeMinutes / 60);
  const mins = totalPracticeMinutes % 60;
  const practiceLabel = hours > 0 ? `${hours}h ${mins}m` : totalPracticeMinutes > 0 ? `${mins}m` : "0m";

  const totalLessons = getTotalLessons();
  const completedTotal = CURRICULUM.reduce((sum, mod) =>
    sum + mod.lessons.filter(l => lessonProgress[`mod${l.moduleId}_lesson${l.lessonIndex}`]?.completed).length, 0
  );

  // Find the next incomplete lesson for "Continue" CTA
  const nextLesson = (() => {
    for (const mod of CURRICULUM) {
      const isLocked = mod.subtitle.includes('Pro') && profile?.subscription_tier !== 'pro';
      if (isLocked) continue;
      for (const l of mod.lessons) {
        if (!lessonProgress[`mod${l.moduleId}_lesson${l.lessonIndex}`]?.completed) {
          return l;
        }
      }
    }
    return CURRICULUM[0].lessons[0];
  })();

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">

      {/* ── Photographic backdrop ── */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/hero-guitar-new.avif"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.12, filter: "saturate(0.2) contrast(1.2)" }}
        />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, rgba(var(--color-bg-rgb),0.97) 0%, rgba(var(--color-bg-rgb),0.85) 50%, rgba(var(--color-bg-rgb),0.7) 100%)",
        }} />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(var(--color-bg-rgb),1) 0%, transparent 40%)",
        }} />
      </div>

      {/* ── Main layout: two-column hero + curriculum ── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">

        {/* ═══ LEFT: Hero zone ═══ */}
        <div className="lg:w-[55%] flex flex-col justify-center px-10 lg:px-16 py-10 lg:py-0">

          {/* Welcome line */}
          <motion.p
            className="font-mono text-[11px] tracking-[0.2em] uppercase text-text-muted mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            Welcome back, {displayName}
          </motion.p>

          {/* Headline */}
          <motion.h1
            className="mb-8"
            style={{
              fontSize: "clamp(2.8rem, 5.5vw, 5rem)",
              fontWeight: 700,
              lineHeight: 0.92,
              letterSpacing: "-0.035em",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
          >
            <span className="block text-text">The Art of</span>
            <span className="block text-accent" style={{ fontWeight: 300 }}>
              Mastery
            </span>
          </motion.h1>

          {/* Stats strip — always visible, zero state handled */}
          <motion.div
            className="flex items-center gap-8 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.16 }}
          >
            <div className="pr-8 border-r border-border-subtle">
              <p className="text-text text-2xl font-bold tracking-tight leading-none">{completedTotal}<span className="text-text-muted font-normal text-base">/{totalLessons}</span></p>
              <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted mt-1.5">Lessons</p>
            </div>
            <div className="pr-8 border-r border-border-subtle">
              <p className="text-text text-2xl font-bold tracking-tight leading-none">{currentStreak}</p>
              <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted mt-1.5">Day Streak</p>
            </div>
            <div className="pr-8 border-r border-border-subtle">
              <p className="text-text text-2xl font-bold tracking-tight leading-none">{practiceLabel}</p>
              <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted mt-1.5">Practiced</p>
            </div>
            <div>
              <p className="text-text text-2xl font-bold tracking-tight leading-none">{sessionsCompleted}</p>
              <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted mt-1.5">Sessions</p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 }}
          >
            <button
              onClick={() => navigate(`/lesson/${nextLesson.moduleId}/${nextLesson.lessonIndex}`)}
              className="btn-primary px-7 py-3.5 text-sm"
            >
              {completedTotal === 0 ? "Start Learning" : "Continue Learning"}
              <ArrowRight size={15} strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate("/practice")}
              className="btn-secondary px-7 py-3.5 text-sm"
            >
              Practice Room
            </button>
          </motion.div>
        </div>

        {/* ═══ RIGHT: Curriculum panel ═══ */}
        <motion.div
          className="lg:w-[45%] flex flex-col min-h-0 lg:border-l border-border-subtle"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Panel header */}
          <div className="px-8 pt-8 pb-4 flex items-center justify-between flex-shrink-0">
            <h2 className="font-mono text-[11px] tracking-[0.15em] uppercase text-text-muted">
              Curriculum
            </h2>
            <span className="font-mono text-[10px] text-accent">
              {completedTotal} / {totalLessons} complete
            </span>
          </div>

          {/* Scrollable lesson list */}
          <div className="flex-1 overflow-y-auto px-8 pb-6 space-y-6">
            {CURRICULUM.map((module) => {
              const isLocked = module.subtitle.includes("Pro") && profile?.subscription_tier !== "pro";
              const modCompleted = module.lessons.filter(
                (l) => lessonProgress[`mod${l.moduleId}_lesson${l.lessonIndex}`]?.completed
              ).length;

              return (
                <div key={module.id}>
                  {/* Module header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    {isLocked ? (
                      <Zap size={14} className="text-accent" strokeWidth={2} />
                    ) : (
                      <BookOpen size={14} className="text-text-muted" strokeWidth={1.8} />
                    )}
                    <span className={`font-mono text-[10px] tracking-[0.15em] uppercase ${isLocked ? "text-accent font-bold" : "text-text-muted"}`}>
                      {module.title}
                    </span>
                    {isLocked && (
                      <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-bold">PRO</span>
                    )}
                    {!isLocked && (
                      <span className="font-mono text-[10px] text-text-faint ml-auto">
                        {modCompleted}/{module.lessons.length}
                      </span>
                    )}
                  </div>

                  {/* Lesson rows — compact list, not cards */}
                  <div className="space-y-1">
                    {module.lessons.map((lesson, idx) => {
                      const key = `mod${lesson.moduleId}_lesson${lesson.lessonIndex}`;
                      const isComplete = !isLocked && lessonProgress[key]?.completed;
                      const isNext = !isLocked && !isComplete && lesson.id === nextLesson.id;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => isLocked ? navigate("/pricing") : navigate(`/lesson/${lesson.moduleId}/${lesson.lessonIndex}`)}
                          className={`group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150 ${
                            isNext
                              ? "bg-accent/8 border border-accent/20 hover:border-accent/40"
                              : isComplete
                              ? "hover:bg-card/40"
                              : isLocked
                              ? "opacity-60 hover:opacity-80"
                              : "hover:bg-card/40"
                          }`}
                        >
                          {/* Status indicator */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isComplete
                              ? "bg-emerald-500/15"
                              : isNext
                              ? "bg-accent/15"
                              : isLocked
                              ? "bg-card/40"
                              : "bg-card/60"
                          }`}>
                            {isComplete ? (
                              <Check size={13} className="text-emerald-400" strokeWidth={2.5} />
                            ) : isLocked ? (
                              <span className="text-xs opacity-50">🔒</span>
                            ) : (
                              <span className="font-mono text-[11px] text-text-muted font-medium">{idx + 1}</span>
                            )}
                          </div>

                          {/* Lesson info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-medium leading-tight truncate ${
                              isComplete ? "text-emerald-300/80" : isNext ? "text-text" : isLocked ? "text-text-muted" : "text-text-secondary group-hover:text-text"
                            }`}>
                              {lesson.title}
                            </p>
                            <p className="text-[11px] text-text-muted leading-tight mt-0.5 truncate">
                              {lesson.subtitle}
                            </p>
                          </div>

                          {/* Duration + arrow */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono text-[10px] text-text-muted">{lesson.estimatedMinutes}m</span>
                            {isNext && <ChevronRight size={14} className="text-accent" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>


    </div>
  );
}
