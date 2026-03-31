import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Layers, GitBranch, PlayCircle, Mic, TrendingUp, Zap, BookOpen, Check } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuth } from "../contexts/AuthContext";
import { MODULE_1, CURRICULUM } from "../data/curriculum";

const FEATURES = [
  { to: "/voicings",      icon: Layers,     label: "Voicings",        description: "Chord library" },
  { to: "/fretboard",     icon: GitBranch,  label: "Fretboard",       description: "Explorer" },
  { to: "/practice",      icon: PlayCircle, label: "Practice",        description: "Focus mode" },
  { to: "/jam",           icon: Mic,        label: "Jam Studio",      description: "Improvise" },
  { to: "/instructor",    icon: Zap,        label: "AI Instructor",   description: "Live session" },
  { to: "/analysis",      icon: TrendingUp, label: "Progress",        description: "Your stats" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentStreak, totalPracticeMinutes, sessionsCompleted, lessonProgress } = useAppStore();
  const { profile } = useAuth();
  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Guitarist";

  const hours = Math.floor(totalPracticeMinutes / 60);
  const mins = totalPracticeMinutes % 60;
  const practiceLabel = hours > 0 ? `${hours}h ${mins}m` : totalPracticeMinutes > 0 ? `${mins}m` : null;

  // Count completed lessons
  const completedCount = MODULE_1.lessons.filter((l) => {
    const key = `mod${l.moduleId}_lesson${l.lessonIndex}`;
    return lessonProgress[key]?.completed;
  }).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">

      {/* ── Photographic backdrop ── */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/hero-guitar.jpg"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.14, filter: "saturate(0.25) contrast(1.15)" }}
        />
        {/* Left solid fade */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to right, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.85) 40%, rgba(10,10,10,0.3) 75%, rgba(10,10,10,0.15) 100%)",
        }} />
        {/* Bottom solid fade */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.55) 28%, transparent 55%)",
        }} />
        {/* Top vignette */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(10,10,10,0.45) 0%, transparent 20%)",
        }} />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col h-full px-10 lg:px-16 py-10 lg:py-12 overflow-y-auto">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-border bg-card/40 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-glow" />
            <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-text-secondary">
              Advanced Fretboard Mastery
            </span>
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          className="mt-8 mb-6"
          style={{ maxWidth: "680px" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-text-muted mb-3">
            Welcome back, {displayName}
          </p>
          <h1 style={{
            fontSize: "clamp(3rem, 7vw, 6rem)",
            fontWeight: 700,
            lineHeight: 0.9,
            letterSpacing: "-0.035em",
          }}>
            <span className="block text-text">The Art of</span>
            <span className="block" style={{ fontWeight: 300, color: "rgba(240,240,240,0.18)" }}>
              Mastery
            </span>
          </h1>
        </motion.div>

        {/* Body copy */}
        <motion.p
          className="text-text-secondary mb-8"
          style={{ maxWidth: "460px", fontSize: "0.9375rem", lineHeight: 1.7 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Advanced harmony, voice leading, and chord voicings. A practice environment built for serious musicians.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex items-center gap-4 mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
        >
          <button
            onClick={() => navigate("/lesson/1/0")}
            className="btn-primary px-7 py-3.5 text-sm"
          >
            {completedCount === 0 ? 'Start Learning' : 'Continue Learning'}
            <ArrowRight size={15} strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate("/practice")}
            className="btn-secondary px-7 py-3.5 text-sm"
          >
            Practice Room
          </button>
        </motion.div>

        {/* ── Curriculum Section ── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
        >
          {CURRICULUM.map((module) => {
            const isLocked = module.id > 1 && profile?.subscription_tier !== 'pro';
            // Count completed for this specific module
            const modCompletedCount = module.lessons.filter((l) => lessonProgress[`mod${l.moduleId}_lesson${l.lessonIndex}`]?.completed).length;

            return (
              <div key={module.id} className="mb-10 last:mb-0">
                <div className="flex items-center gap-3 mb-4">
                  {isLocked ? (
                    <Zap size={16} className="text-accent" strokeWidth={1.8} />
                  ) : (
                    <BookOpen size={16} className="text-text-muted" strokeWidth={1.8} />
                  )}
                  <h2 className={`font-mono text-[11px] tracking-[0.15em] uppercase ${isLocked ? 'text-accent font-bold' : 'text-text-muted'}`}>
                    {module.title} {isLocked && <span className="text-[9px] bg-accent/20 px-1.5 py-0.5 rounded ml-2">PRO</span>}
                  </h2>
                  {!isLocked && (
                    <span className="font-mono text-[10px] text-accent ml-auto">
                      {modCompletedCount} / {module.lessons.length} complete
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {module.lessons.map((lesson) => {
                    const key = `mod${lesson.moduleId}_lesson${lesson.lessonIndex}`;
                    const isComplete = !isLocked && lessonProgress[key]?.completed;

                    return (
                      <button
                        key={lesson.id}
                        id={`lesson-${lesson.moduleId}-${lesson.lessonIndex}`}
                        onClick={() => isLocked ? navigate('/pricing') : navigate(`/lesson/${lesson.moduleId}/${lesson.lessonIndex}`)}
                        className={`group relative flex flex-col gap-2 p-4 rounded-xl border text-left transition-all duration-200 ${
                          isComplete
                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                            : isLocked 
                            ? 'bg-card/20 border-border-subtle hover:border-accent opacity-75 hover:opacity-100'
                            : 'bg-card/30 border-border-subtle backdrop-blur-sm hover:bg-card/60 hover:border-border'
                        }`}
                      >
                        <div className="flex flex-1 items-center justify-between">
                          <span className={`text-xl transition-transform duration-300 ${isLocked ? 'opacity-50' : isComplete ? 'scale-110' : 'group-hover:scale-110'}`}>
                            {isLocked ? '🔒' : lesson.icon}
                          </span>
                          {isComplete && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20">
                              <Check size={12} className="text-emerald-400" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div>
                          <p className={`text-[13px] font-medium leading-tight transition-colors duration-200 ${
                            isLocked ? 'text-text-muted' : isComplete ? 'text-emerald-300' : 'text-text-secondary group-hover:text-text'
                          }`}>
                            {lesson.title}
                          </p>
                          <p className={`text-[11px] leading-tight mt-0.5 ${isLocked ? 'text-text-muted/50' : 'text-text-muted'}`}>
                            {lesson.subtitle}
                          </p>
                        </div>
                        <p className={`text-[10px] font-mono mt-auto ${isLocked ? 'text-accent' : 'text-text-muted'}`}>
                          {isLocked ? 'Upgrade to Unlock' : `~${lesson.estimatedMinutes} min`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Bottom section: stats + feature grid ── */}
        <div className="space-y-6">

          {/* Stats row — only shown once user has data */}
          {(currentStreak > 0 || totalPracticeMinutes > 0 || sessionsCompleted > 0) && (
            <motion.div
              className="flex items-center gap-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              {currentStreak > 0 && (
                <div>
                  <p className="text-text text-2xl font-bold tracking-tight leading-none">{currentStreak}</p>
                  <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted mt-1">Day Streak</p>
                </div>
              )}
              {practiceLabel && (
                <div>
                  <p className="text-text text-2xl font-bold tracking-tight leading-none">{practiceLabel}</p>
                  <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted mt-1">Practiced</p>
                </div>
              )}
              {sessionsCompleted > 0 && (
                <div>
                  <p className="text-text text-2xl font-bold tracking-tight leading-none">{sessionsCompleted}</p>
                  <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-muted mt-1">Sessions</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Feature quick-access grid */}
          <motion.div
            className="grid grid-cols-3 sm:grid-cols-6 gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.38 }}
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const isLocked = f.label === "AI Instructor" && profile?.subscription_tier !== 'pro';

              return (
                <button
                  key={f.to}
                  onClick={() => isLocked ? navigate('/pricing') : navigate(f.to)}
                  className={`group flex flex-col gap-2 p-3.5 rounded-xl border border-border-subtle bg-card/30 backdrop-blur-sm transition-all duration-200 text-left ${
                    isLocked ? 'opacity-70 cursor-pointer hover:border-accent hover:opacity-100' : 'hover:bg-card/60 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={16} className={`transition-colors duration-200 ${isLocked ? 'text-accent' : 'text-text-muted group-hover:text-accent'}`} strokeWidth={1.8} />
                    {isLocked && <span className="text-[9px] font-bold text-accent bg-accent/20 px-1.5 py-0.5 rounded">PRO</span>}
                  </div>
                  <div>
                    <p className={`text-[13px] font-medium transition-colors duration-200 leading-tight ${
                      isLocked ? 'text-text-muted mt-1' : 'text-text-secondary group-hover:text-text'
                    }`}>
                      {f.label}
                    </p>
                    <p className={`text-[11px] leading-tight mt-0.5 ${isLocked ? 'text-accent opacity-80' : 'text-text-muted'}`}>
                      {isLocked ? 'Unlock access' : f.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
