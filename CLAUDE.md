# Rubato — Advanced Guitar Academy

## Project Context

Rubato is a professional-grade guitar learning web app focused on advanced harmony, voice leading, chord voicings, and improvisation. It targets serious intermediate-to-advanced guitarists — people who already know their barre chords and want to go deeper into jazz harmony, modal interchange, and fretboard mastery.

**Built by a Berklee College of Music graduate.** The music theory content (scales, voicings, chord-scale relationships, practice tips) is informed by real conservatory knowledge and Rick Beato's educational materials. This is not a beginner guitar app — every design and content decision should reflect that level of sophistication.

## Team Roles

- **User = Product Manager.** Makes all product decisions. Has deep domain expertise in music theory and guitar pedagogy. Has high visual standards.
- **Claude = Senior Developer.** Proposes, explains trade-offs, flags risks. Builds to release quality. Proactively catches problems. Never ships "good enough."

## Tech Stack

- React 19, TypeScript, Vite 6
- Tailwind CSS v4 (using `@theme` in index.css)
- Zustand (state management, persisted to localStorage + synced to Supabase)
- Supabase (auth, profiles, progress sync)
- Google Gemini Live API (AI Instructor — real-time audio)
- Framer Motion (`motion/react`)
- Lucide icons
- PWA (vite-plugin-pwa)

## Design Philosophy — "Studio Console"

The UI should feel like a **high-end music production environment** — think Output Arcade, Native Instruments, Ableton's restraint. Every surface should feel intentional, weighted, and tactile. Silence (whitespace) is as important as content.

### Core Principles

1. **The instrument is the hero.** The fretboard, the chord diagrams, the voice leading visualizations — these are the content. Everything else (controls, navigation, metadata) serves them. Never let chrome compete with content.

2. **Restraint over decoration.** No gradients for the sake of gradients. No glows unless they communicate state. No borders unless they create meaningful separation. When in doubt, remove.

3. **Information through hierarchy, not quantity.** Use size, weight, and opacity to create 3 clear levels: primary (what you're doing), secondary (what supports it), tertiary (what's available). Never show everything at equal prominence.

4. **Musician's workflow.** Every screen should map to a real practice workflow: select → visualize → practice → record → review. Controls should be reachable without breaking flow.

5. **Typography does the heavy lifting.** Use font weight and size contrasts instead of colors or backgrounds to differentiate content. The monospace font (JetBrains Mono) is for labels, metadata, and musical notation. The sans font (Plus Jakarta Sans) is for everything else.

### Color System

```
Background layers (darkest to lightest):
  bg:        #0a0a0a   — app background
  surface:   #111111   — sidebar, panels
  card:      #161616   — content cards
  elevated:  #1c1c1c   — raised elements, inputs

Borders (subtle by default):
  border-subtle: #1e1e1e   — card edges, dividers
  border:        #252525   — interactive borders, hover states

Text (high contrast hierarchy):
  text:           #f0f0f0   — primary content
  text-secondary: #999999   — supporting content
  text-muted:     #5a5a5a   — labels, metadata
  text-faint:     #3a3a3a   — barely visible, decorative

Accent (warm gold — like a tube amp indicator):
  accent:        #d4a44a   — primary accent
  accent-dim:    #b8872e   — hover/pressed states
  accent-bright: #e8c06a   — highlights

Semantic:
  error:   #e5484d
  success: #30a46c
  info:    #3b82f6
```

### Fretboard Color Language

The fretboard has its own color system that maps to music theory:
- **Gold (#d4a44a)** — Root notes. Always unmistakable.
- **Warm white (#e8e8e8)** — Chord tones (3, 5, 7). Essential.
- **Cool blue (#5b9bd5)** — Scale tones (2, 4, 6). Available.
- **Purple (#b07ed8)** — Tensions/extensions (b9, #9, #11, b13). Color.
- **Dim gray (#4a4a4a)** — Avoid notes. De-emphasized.

Multi-layer overlays use: Gold (layer 1), Blue (layer 2), Purple (layer 3).

### Spacing & Sizing

- Use Tailwind's default scale. Prefer `gap-` over margins.
- Cards: `rounded-2xl` (large), `rounded-xl` (medium), `rounded-lg` (small)
- Page padding: `px-8` minimum, `px-10` for main content areas
- Section headers: `text-[10px]` or `text-[11px]`, `tracking-[2px]`, `uppercase`, `font-mono`, `text-text-muted`
- Never use more than 3 levels of nesting for cards-within-cards.

### Animation

- Use Framer Motion (`motion/react`) for page transitions and meaningful state changes
- CSS transitions for hover/focus states only
- Keep durations short: 150ms for hovers, 200-300ms for entrances, 150ms for exits
- Ease: `easeOut` for entrances, `easeIn` for exits
- Never animate just to animate. Every animation should communicate a state change.

## Code Conventions

- All components are `.tsx` (never `.jsx`)
- Use design system tokens from `index.css` — never hardcode colors like `#1a1a1a` or `#888` in components. Use `text-text-secondary`, `bg-card`, `border-border-subtle`, etc.
- Prefer Tailwind classes over inline styles. Use inline styles only for dynamic values (computed positions, colors from data).
- Lazy-load all route-level components with `React.lazy()`
- Custom hooks go in `src/utils/` with `use` prefix
- Music theory logic goes in `src/musicTheory/`
- Server-only code goes in `src/server/`

## What NOT To Do

- Don't add features that weren't asked for
- Don't use emoji in the UI
- Don't add loading skeletons or spinners unless there's an actual async operation
- Don't use alert/confirm dialogs — use inline feedback
- Don't hardcode hex colors in components — always use design tokens
- Don't create documentation files unless explicitly requested
- Don't add comments to code that is self-explanatory
- Don't wrap things in unnecessary abstractions — three similar lines > one premature helper

## Known Architecture Decisions

- The AI Instructor (`/instructor`) depends on a local Express server at `localhost:3001` for Gemini API credentials and RAG knowledge base. This needs to be resolved before production deployment.
- `better-sqlite3` and `express` are in `dependencies` but are server-only — they should be in `devDependencies` or a separate server package.
- The app name is "Rubato" everywhere in the UI. The directory name "virtuoso" is legacy.
- Auth uses Supabase with email/password + Google OAuth.
- State is persisted to localStorage via Zustand `persist` middleware, with background sync to Supabase when a user is authenticated.
