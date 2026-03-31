# Rubato Design Spec — "Studio Console: Tactile & Expressive"

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Visual design direction, design token system, and component treatment for all existing screens

---

## 1. Design Direction

**Identity:** Studio Console — Tactile & Expressive

Rubato should feel like a boutique piece of studio gear. Every surface has weight and physicality — inset panels, beveled controls, faint material textures — but the interactions are fluid and expressive, like playing an instrument rather than operating a machine.

**Reference points:** Output Arcade, Native Instruments Kontakt/Massive, Arturia V Collection, Universal Audio console plugins. The common thread: dark, warm, physical, professional.

**What makes Rubato distinct:** The combination of hardware-grade surfaces with instrument-like motion. Most studio-inspired UIs feel static and mechanical. Rubato moves — selections ripple, layers fade in with gentle easing, states flow into each other. The chassis is a console; the soul is an instrument.

---

## 2. Surface Treatment (B3 — Tactile Detail)

### Material Language

Every major surface should feel like a real material:

- **App background (#0a0a0a):** Deep matte black. The void behind the console.
- **Sidebar / panels (#111111 → #141414):** Subtle vertical gradient suggesting brushed aluminum or anodized metal. A faint 2-3% noise texture overlay to break up the digital flatness.
- **Cards (#161616):** Inset panels — they sit *into* the surface rather than floating above it. Achieved with `inset box-shadow` (top-left dark, bottom-right slightly lighter) and a 1px border that's darker on top and lighter on bottom.
- **Elevated elements (#1c1c1c):** Raised controls — buttons, toggles, dropdowns. These *do* float, with a subtle drop shadow and a faint top-edge highlight (1px, 3-4% white opacity) simulating light catch.
- **Input fields:** Recessed with `inset box-shadow`. Darker than their container. Focus state adds a faint gold glow ring.

### Texture Details

- **Noise overlay:** 2-3% opacity SVG noise on panel backgrounds. Already exists in index.css as `body::after` film grain — extend this concept to card and sidebar surfaces at lower opacity.
- **Brushed-metal hint:** On the sidebar and transport bar only. Achieved via a subtle horizontal linear gradient (1-2% opacity white streaks). Do not overuse — this is a hint, not a texture map.
- **Tolex/fabric hint:** On the main app background only. A very faint cross-hatch pattern at 1-2% opacity. Suggests amplifier cabinet covering without being literal.

### Depth System

Three explicit depth levels:

| Level | Use | Treatment |
|-------|-----|-----------|
| **Recessed** | Inputs, fretboard container, inset panels | `inset box-shadow: 0 2px 4px rgba(0,0,0,0.4)`, border darker on top |
| **Flush** | Cards, content areas | Subtle border, minimal shadow, sits level with surface |
| **Raised** | Buttons, toggles, active tabs, floating controls | `box-shadow: 0 2px 8px rgba(0,0,0,0.3)`, 1px top highlight |

---

## 3. Typography (T3 — Display Flair)

### Font Stack

- **Display / Headlines:** Plus Jakarta Sans, 700-800 weight, `letter-spacing: -0.03em` to `-0.04em`. Tight, heavy, etched-into-faceplate character. Used for page titles, feature names, and hero text.
- **Body:** Plus Jakarta Sans, 400-500 weight, normal tracking. Clean readability for descriptions, lesson content, practice tips.
- **Labels / Metadata:** JetBrains Mono, 400-500 weight, `letter-spacing: 0.1em` to `0.15em`, `text-transform: uppercase`, `font-size: 10-11px`. Used for section headers, nav category labels, BPM readouts, key signatures, fret numbers, status indicators.
- **Musical notation:** JetBrains Mono, normal case. Chord symbols (Cmaj7, Dm9), scale names, interval labels on the fretboard.

### Hierarchy Rules

1. **Page title:** 28-32px, Jakarta Sans 800, -0.03em tracking. One per screen.
2. **Section header:** 10-11px, JetBrains Mono 500, uppercase, 0.1-0.15em tracking, text-muted color. Sits above content groups.
3. **Card title:** 16-18px, Jakarta Sans 700, -0.02em tracking. Identifies a card's content.
4. **Body text:** 14px, Jakarta Sans 400. Standard reading text.
5. **Supporting text:** 13px, Jakarta Sans 400, text-secondary color. Descriptions, subtitles.
6. **Micro label:** 10px, JetBrains Mono 400, uppercase, text-muted. Metadata, counts, timestamps.

---

## 4. Interaction & Motion (I3 — Ambient & Flowing)

### Core Principles

- Motion should feel **continuous and expressive**, not snappy or mechanical
- State changes flow into each other — no hard cuts
- The app should feel like it's breathing, not clicking

### Timing

| Action | Duration | Easing |
|--------|----------|--------|
| Hover state | 200ms | ease-out |
| Button press (scale down) | 120ms in, 300ms out | ease-in, spring out |
| Card/panel entrance | 300-400ms | ease-out with slight overshoot |
| Page transition | 350ms | ease-in-out |
| Layer fade-in (fretboard) | 400-500ms | ease-out |
| Selection ripple/glow | 600ms | ease-out (fade to settled state) |
| Exit/dismiss | 200ms | ease-in |

### Specific Behaviors

- **Button press:** Scale to 0.97 on press, spring back to 1.0 on release. Shadow decreases on press (feels like pushing into the surface).
- **Card hover:** Faint gold border-glow fades in (200ms). No transform — cards don't lift on hover, they illuminate.
- **Scale layer toggle:** New notes fade in with a soft radial spread from the fretboard center (400ms stagger per note group). Removing a layer fades notes out simultaneously (200ms).
- **Page transitions:** Content fades out (150ms), new content fades in with subtle upward drift (300ms, 8px translateY).
- **Selection:** Selected items get a brief gold pulse-glow (600ms, eases to a subtle persistent gold border). Deselection fades smoothly (200ms).
- **Sidebar navigation:** Active indicator slides fluidly between items (layout animation, 250ms spring).
- **Metronome beat dots:** Gentle pulse on beat (scale 1.0 → 1.3 → 1.0, 200ms). Current beat glows gold.

---

## 5. Gold Accent System (G2 — Signature Threading)

### Where Gold Appears

**Always gold:**
- Root notes on fretboard
- Primary CTA button (gradient: #b8872e → #d4a44a → #e8c06a)
- Active nav item indicator
- Logo mark ("R" badge)
- Progress indicators (lesson completion bars, practice streaks)

**Gold hints (subtle):**
- Section header underline (1px, 20% opacity)
- Hover state border-glow on interactive cards (15% opacity)
- Active tab underline
- Focus ring on inputs (8% opacity glow)
- Selected state persistent border (30% opacity)
- Toggle knob in "on" position

**Never gold:**
- Body text (always grayscale hierarchy)
- Backgrounds (gold is line/dot/glow, never fill)
- Disabled states (always gray)
- Error/success states (use semantic red/green)

### Gold Palette

```
#b8872e  — Pressed/darker state, gradient start
#d4a44a  — Primary accent, the signature gold
#e8c06a  — Highlight, gradient end, bright state
rgba(212,164,74, 0.15) — Glow/border hint
rgba(212,164,74, 0.08) — Subtle background tint (focus rings, selection bg)
rgba(212,164,74, 0.03) — Ambient radial gradient on hero areas
```

---

## 6. Component Treatment

### Cards

```
Background: #161616
Border: 1px solid #1e1e1e (top border slightly darker, bottom slightly lighter for inset feel)
Border-radius: 16px (large cards), 12px (medium), 8px (small/nested)
Shadow: inset 0 1px 0 rgba(0,0,0,0.2), inset 0 -1px 0 rgba(255,255,255,0.02)
Hover: border transitions to rgba(212,164,74,0.15) over 200ms
```

Cards are **inset panels**, not floating. They feel pressed into the console surface.

### Buttons

**Primary (gold CTA):**
```
Background: linear-gradient(135deg, #b8872e, #d4a44a, #e8c06a)
Color: #0a0a0a (dark text on gold)
Shadow: 0 0 20px rgba(212,164,74,0.15), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)
Border-radius: 12px
Press: scale(0.97), shadow reduces
```

**Secondary:**
```
Background: #1c1c1c
Border: 1px solid #252525
Color: #f0f0f0
Shadow: 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)
Hover: border → #333
Press: scale(0.97), inset shadow
```

**Ghost:**
```
Background: transparent
Border: 1px solid #1e1e1e
Color: #999
Hover: background → rgba(255,255,255,0.03), color → #f0f0f0
```

### Inputs

```
Background: #0e0d0b
Border: 1px solid #1e1c18
Shadow: inset 0 2px 4px rgba(0,0,0,0.4)
Border-radius: 12px
Focus: border → #3a3228, ring → 0 0 0 2px rgba(212,164,74,0.08)
```

Inputs are **recessed** — darker than their container, pressed into the surface.

### Sidebar

```
Background: #111111 with faint vertical brushed-metal gradient
Width: 220px (current fixed width — collapse mode is out of scope)
Active item: gold left-border (2px), faint gold bg tint (rgba(212,164,74,0.06))
Active indicator: animated slide between items (250ms spring)
Section labels: JetBrains Mono, 10px, uppercase, tracking 0.15em, text-muted
```

### Fretboard Container

```
Background: #0e0e10 (slightly cooler than app bg — suggests rosewood)
Border: 1px solid #1a1a1e
Border-radius: 16px
Shadow: inset 0 2px 8px rgba(0,0,0,0.5) (deeply recessed — the fretboard sits IN the console)
Padding: 20-24px
```

### Transport Bar (Jam Studio)

```
Background: #141414
Border-top: 1px solid #1e1e1e
Height: 56-64px
Controls: raised buttons with top-edge highlight
BPM display: JetBrains Mono, 18px, tabular-nums
Beat dots: 8px circles, inactive #2a2a2a, active #d4a44a with pulse animation
```

---

## 7. Screen-by-Screen Application

### Auth Page

- Full-screen dark background with faint tolex texture and subtle gold radial gradient
- Centered card with pronounced inset treatment — the login form is a recessed panel
- "Rubato" wordmark: Jakarta Sans 800, 36px, -0.04em tracking, subtle metallic gradient (f0f0f0 → 999999)
- Tagline: JetBrains Mono, 10px, uppercase, tracking 3px, text-muted
- Gold CTA button for sign-in, recessed input fields
- Google OAuth button: raised secondary style

### Dashboard

- Hero greeting: large display headline (32px, Jakarta 800, tight tracking)
- Module cards: inset panels with lesson progress bars (gold fill)
- Stats section: JetBrains Mono micro-labels with numeric readouts
- Quick-access grid: raised icon buttons with hover glow

### Jam Studio

- Three-zone layout: transport bar (top), sidebar (left), fretboard hero (center)
- Fretboard container: deeply recessed, largest element on screen
- Scale layer cards: flush cards with gold-threaded selection state
- Progression selector: raised tab bar with sliding gold indicator
- Transport controls: raised buttons with physical press feedback

### Chord Voicings

- Voicing cards: inset panels showing chord diagram + metadata
- Comparison mode: side-by-side recessed panels
- Filter controls: raised pill buttons with gold active state

### Curriculum / Lessons

- Module headers: display headline + mono section label
- Lesson list: flush cards with progress indicators
- Active lesson: gold left-border accent
- Locked (Pro) lessons: reduced opacity, lock icon, subtle blur

### AI Instructor

- Chat-style interface with recessed message container
- User messages: raised cards (right-aligned)
- AI responses: flush cards (left-aligned) with faint gold accent border
- Audio waveform visualizer: gold gradient, recessed container

### Pricing

- Two-tier comparison: side-by-side inset panels
- Pro tier: gold border accent, "Recommended" badge in gold
- Feature checkmarks: gold for Pro features, gray for free

---

## 8. Design Token Migration

The existing `@theme` block in `index.css` already defines most color tokens but they are not used consistently. The migration involves:

1. **Audit every component** for hardcoded hex values
2. **Replace with Tailwind token classes** (`bg-card`, `text-text-secondary`, `border-border-subtle`, etc.)
3. **Add missing tokens** to the `@theme` block:
   - `--color-accent-dim: #b8872e`
   - `--color-accent-bright: #e8c06a`
   - `--color-text-faint: #3a3a3a`
   - Depth shadow tokens (recessed, flush, raised) as CSS custom properties
   - Texture overlays as reusable utility classes
4. **Create shared component classes** in index.css for the 3 depth levels (`.surface-recessed`, `.surface-flush`, `.surface-raised`)
5. **Standardize border-radius** usage across all components

### Files Requiring Migration

Every component file in `src/components/` needs review. Priority order based on user visibility:

1. `AuthPage.tsx` — entry point, first impression
2. `Dashboard.tsx` — primary screen after login
3. `JamStudio.tsx` — flagship feature, most complex layout
4. `Sidebar.tsx` — visible on every screen
5. `Fretboard.tsx` — core visualization (color system is correct, container treatment needs update)
6. `ChordVoicings.tsx` — key feature screen
7. `LessonView.tsx` — curriculum delivery
8. `PricingPage.tsx` — conversion screen
9. All remaining components

---

## 9. What This Spec Does NOT Cover

- No new features. This is purely visual/interaction design applied to existing screens.
- No changes to music theory engine, data models, API integrations, or business logic.
- No changes to routing, state management, or auth flow.
- No mobile-specific responsive design (that's a separate future effort).
- No accessibility audit (important but separate scope).

---

## 10. Success Criteria

The redesign is successful when:

1. **Every screen uses design tokens** — zero hardcoded hex values in component files
2. **Surfaces feel physical** — cards are inset, buttons are raised, inputs are recessed
3. **Typography creates clear hierarchy** — display headlines, mono labels, and body text are visually distinct without relying on color
4. **Gold threads through the experience** — present on every screen as a subtle signature, never overwhelming
5. **Interactions feel expressive** — state changes flow smoothly, selections ripple, layers breathe
6. **The app feels like one cohesive product** — not a collection of screens with different styling approaches
