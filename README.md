<div align="center">

# 🎸 Virtuoso: Advanced Guitar Academy

**Professional-grade guitar learning platform featuring real-time audio feedback,<br>advanced harmony engine, and AI-powered instruction.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Live-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

</div>

---

## Overview

Virtuoso is an interactive guitar teaching application that covers everything from basic intervals to advanced jazz voice leading. It combines a **comprehensive music theory engine** with an **interactive SVG fretboard**, a **practice room with real-time pitch detection**, and a **live AI instructor** powered by Google's Gemini API.

### Key Features

- 🎶 **Music Theory Engine** — Complete library of notes, intervals, chords (triads → altered dominants), scales (all modes, pentatonics, jazz), voicings (drop-2, drop-3, shell, CAGED), and voice leading algorithms.
- 🎸 **Interactive Fretboard Explorer** — SVG-based guitar neck with overlay modes for scales, chords, chord-scale relationships, and CAGED positions. Click any note to hear it.
- 🥁 **Practice Room** — Built-in metronome, chord progression playback (ii–V–I, blues, etc.), real-time pitch detection via the Web Audio API, and loopable sections.
- 🤖 **AI Instructor** — Live, bidirectional audio session with Google Gemini. Speak or play into your mic and receive real-time voice feedback from a jazz guitar instructor.
- 📊 **Performance Analysis** — Dashboard tracking practice minutes, accuracy, modules completed, and session history.
- 🔊 **Audio Engine** — Web Audio API synthesis with additive harmonics and ADSR envelopes for realistic plucked-string playback, strum simulation, and metronome clicks.

---

## Architecture

```
virtuoso_-advanced-guitar-academy/
├── src/
│   ├── musicTheory/            # Pure-function theory engine (zero UI dependencies)
│   │   ├── notes.ts            # Chromatic notes, MIDI ↔ frequency, enharmonics
│   │   ├── intervals.ts        # Interval database, lookup, application, inversion
│   │   ├── chords.ts           # 30+ chord types, building, identification
│   │   ├── scales.ts           # 30+ scale types, modes, chord-scale theory
│   │   ├── voicings.ts         # Guitar voicing shapes (drop-2/3, shell, CAGED)
│   │   ├── voiceLeading.ts     # Voice leading paths, guide tones, suggestions
│   │   ├── fretboardMapping.ts # Maps theory onto 6-string × 22-fret grid
│   │   ├── index.ts            # Barrel export
│   │   └── __tests__/          # Vitest unit tests
│   │
│   ├── components/
│   │   ├── Dashboard.tsx       # Curriculum overview with module progress
│   │   ├── Fretboard.tsx       # Core SVG fretboard renderer
│   │   ├── FretboardControls.tsx  # Key, scale, chord, and display selectors
│   │   ├── FretboardExplorer.tsx  # Full-page fretboard tool (controls + board)
│   │   ├── PracticeRoom.tsx    # Metronome, playback, pitch detection
│   │   ├── AIInstructor.tsx    # Live Gemini AI voice session
│   │   ├── PerformanceAnalysis.tsx # Stats and practice history
│   │   ├── Sidebar.tsx         # App navigation
│   │   └── ErrorBoundary.jsx   # Graceful error handling
│   │
│   ├── utils/
│   │   └── audioEngine.ts      # Web Audio synthesis (notes, chords, clicks)
│   │
│   ├── App.tsx                 # Router + layout (code-split with React.lazy)
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
│
├── index.html                  # HTML shell
├── vite.config.ts              # Vite + React + Tailwind config
├── tsconfig.json               # TypeScript config (ES2022, bundler module)
├── package.json
└── .env.example                # Required environment variables
```

---

## Music Theory Engine

The engine lives in `src/musicTheory/` and is intentionally **framework-agnostic** — pure TypeScript functions with zero React or DOM dependencies, making it testable and reusable outside the UI.

### Modules

| Module | Purpose | Key Exports |
|---|---|---|
| **`notes.ts`** | Chromatic note system, MIDI ↔ frequency conversion, enharmonic spelling, standard tuning constants | `createNote`, `noteToMidi`, `midiToFrequency`, `frequencyToNote`, `transpose`, `prefersFlats` |
| **`intervals.ts`** | All 19 intervals (unison → major 13th), interval calculation between any two notes | `getInterval`, `applyInterval`, `invertInterval`, `getIntervalLabels` |
| **`chords.ts`** | 30+ chord types across 8 categories (triads, 7ths, extended, altered, suspended, added, power) | `buildChord`, `identifyChord`, `getChordType`, `slashChord` |
| **`scales.ts`** | 30+ scale types (major modes, melodic/harmonic minor modes, pentatonics, bebop, symmetric) with chord-scale theory | `buildScale`, `getChordScales`, `getAvoidNotes`, `getRelativeScale` |
| **`voicings.ts`** | Guitar voicing database — root position, drop-2, drop-3, shell, and CAGED shapes | `resolveVoicing`, `getVoicingsForChord`, `getClosestVoicing` |
| **`voiceLeading.ts`** | Optimal voice leading between chord progressions, guide tone lines, next-chord suggestions | `getVoiceLeadingPath`, `analyzeVoiceMotion`, `getGuidetoneLine`, `suggestNextChords` |
| **`fretboardMapping.ts`** | Projects any scale, chord, or overlay onto the 6×22 fretboard grid with interval labels and colors | `getScalePositions`, `getChordPositions`, `getCAGEDPositions`, `getChordScaleOverlay` |

---

## UI Components

| Component | Description |
|---|---|
| **Dashboard** | Curriculum view with three learning modules (Foundation of Harmony, Advanced Chord Changes, Modal Interchange). Tracks lesson progress and links directly to relevant fretboard views. |
| **Fretboard** | Core SVG guitar fretboard renderer. Renders note dots with interval labels, root highlighting, color-coded overlays, and click-to-play audio. |
| **FretboardControls** | Control panel for selecting root note, display mode (scale, chord, chord-scale, CAGED), scale type, chord type, and visual preferences. |
| **FretboardExplorer** | Full-page view combining `Fretboard` + `FretboardControls`. Reads URL query params to support deep-linking from the curriculum. |
| **PracticeRoom** | Interactive practice environment with: built-in metronome (adjustable BPM), chord progression playback with transport controls, real-time pitch detection via Web Audio `AnalyserNode`, and visual feedback showing detected notes vs expected. |
| **AIInstructor** | Live voice session with Google Gemini's multimodal Live API. Streams mic audio to Gemini and plays back AI-generated voice responses in real time. The AI acts as a jazz guitar instructor. |
| **PerformanceAnalysis** | Analytics dashboard with animated counters showing practice time, accuracy, modules completed, and a timeline of recent sessions. |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Gemini API key** (required for the AI Instructor feature)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd virtuoso_-advanced-guitar-academy

# Install dependencies
npm install
```

### Environment Setup

Copy the example environment file and add your API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
GEMINI_API_KEY="your-gemini-api-key-here"
```

### Running Locally

```bash
npm run dev
```

The app will start on [http://localhost:3000](http://localhost:3000).

### Knowledge Base (Your Own Books & Materials)

You can feed the AI Instructor your own study materials — Berklee textbooks, personal notes, chord charts, anything in PDF or plain text format.

**Step 1 — Drop your files:**

```
knowledge/
├── berklee-harmony-book.pdf
├── jazz-voicings-notes.pdf
└── personal-notes.txt
```

**Step 2 — Ingest (extract, chunk, and embed):**

```bash
npm run knowledge:ingest
```

This reads each file, splits it into ~500-token chunks, generates embeddings via Gemini, and stores everything in a local `knowledge.db` SQLite database.

**Step 3 — Start the knowledge API:**

```bash
npm run knowledge:serve
```

This starts a lightweight API server on port 3001. The AI Instructor will automatically query it for relevant context when you start a session.

> **Tip:** Run both `npm run dev` and `npm run knowledge:serve` in separate terminals. When the knowledge server is running, you'll see a green status indicator on the AI Instructor page.

### All Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the frontend dev server (port 3000) |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check the project with `tsc --noEmit` |
| `npm run clean` | Remove the `dist/` directory |
| `npm run knowledge:ingest` | Process PDFs/TXTs in `knowledge/` → embed → store in SQLite |
| `npm run knowledge:serve` | Start the knowledge API server (port 3001) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Language** | TypeScript 5.8 |
| **UI Framework** | React 19 |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 4 |
| **Routing** | React Router 7 |
| **Animation** | Motion (Framer Motion) |
| **Icons** | Lucide React |
| **AI** | Google Gemini (`@google/genai`) — Live API for real-time voice |
| **Audio** | Web Audio API (custom synthesis engine) |
| **Testing** | Vitest |

---

## Browser Permissions

The app may request the following permissions:

- 🎤 **Microphone** — Required for real-time pitch detection (Practice Room) and the AI Instructor voice session.

---

## License

This project is private and not currently published under an open-source license.
