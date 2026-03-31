import React, { Suspense, lazy, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import Sidebar from "./components/Sidebar";
import SettingsPanel from "./components/SettingsPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { useKeyboardShortcuts, SHORTCUTS } from "./utils/useKeyboardShortcuts";

// Code-split each view for smaller initial bundle
const Dashboard = lazy(() => import("./components/Dashboard"));
const FretboardExplorer = lazy(() => import("./components/FretboardExplorer"));
const PracticeRoom = lazy(() => import("./components/PracticeRoom"));
const AIInstructor = lazy(() => import("./components/AIInstructor"));
const PerformanceAnalysis = lazy(() => import("./components/PerformanceAnalysis"));
const ChordVoicings = lazy(() => import("./components/ChordVoicings"));
const JamStudio = lazy(() => import("./components/JamStudio"));
const VoiceLeading = lazy(() => import("./components/VoiceLeading"));
const AuthPage = lazy(() => import("./components/AuthPage"));
const PricingPage = lazy(() => import("./components/PricingPage"));
const LessonView = lazy(() => import("./components/LessonView"));

function ViewSkeleton() {
  return (
    <div className="flex-1 p-8 animate-pulse">
      <div className="h-8 w-48 bg-[#1a1a1a] rounded-lg mb-4" />
      <div className="h-4 w-72 bg-[#161616] rounded mb-8" />
      <div className="surface-card p-6 mb-6">
        <div className="h-40 bg-[#161616] rounded-lg" />
      </div>
      <div className="surface-card p-6">
        <div className="h-32 bg-[#161616] rounded-lg" />
      </div>
    </div>
  );
}

// ── Route title mapping ──────────────────────────────────────────────────────

const ROUTE_TITLES: Record<string, string> = {
  "/": "Curriculum | Rubato",
  "/fretboard": "Fretboard Explorer | Rubato",
  "/practice": "Practice Room | Rubato",
  "/instructor": "AI Instructor | Rubato",
  "/analysis": "Performance Analysis | Rubato",
  "/voicings": "Chord Voicings | Rubato",
  "/jam": "Jam Studio | Rubato",
  "/auth": "Sign In | Rubato",
  "/pricing": "Upgrade | Rubato",
  "/lesson": "Lesson | Rubato",
};

// ── Page transition variants ─────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ── Keyboard shortcuts help overlay ──────────────────────────────────────────

function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative surface-card p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-6">Keyboard Shortcuts</h3>
        <div className="space-y-3">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-[#888] text-sm">{s.description}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-[#2a2a2a] text-xs text-white font-medium">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-[#555] text-xs mt-6 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-xs">Esc</kbd> or{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-xs">?</kbd> to close
        </p>
      </div>
    </div>
  );
}

// ── Animated route wrapper ───────────────────────────────────────────────────

function AnimatedRoutes() {
  const location = useLocation();
  const title = ROUTE_TITLES[location.pathname] || "Rubato — Guitar Academy";

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex-1 flex flex-col min-h-0"
        >
          <Suspense fallback={<ViewSkeleton />}>
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/fretboard" element={<FretboardExplorer />} />
              <Route path="/voice-leading" element={<VoiceLeading />} />
              <Route path="/practice" element={<PracticeRoom />} />
              <Route path="/jam" element={<JamStudio />} />
              <Route path="/instructor" element={<AIInstructor />} />
              <Route path="/analysis" element={<PerformanceAnalysis />} />
              <Route path="/voicings" element={<ChordVoicings />} />
              <Route path="/lesson/:moduleId/:lessonIndex" element={<LessonView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ── App shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden font-sans">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <ErrorBoundary>
          <AnimatedRoutes />
        </ErrorBoundary>
      </main>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <Suspense fallback={<ViewSkeleton />}>
        <Routes>
          {/* Auth page — no sidebar, full screen */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Everything else — protected behind auth */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </HelmetProvider>
  );
}
