# Warble Design System

## Theme: Blueprint

Warble uses a single **Blueprint** theme — sepia/cream tones with a red accent and sharp corners (border-radius: 0). The theme is applied via `data-theme="blueprint"` on `<html>` and managed by the `useTheme` hook (`src/hooks/useTheme.ts`).

### CSS Custom Properties

All colors are defined as semantic design tokens in `src/index.css` under `[data-theme="blueprint"]`. Tailwind references these via `tailwind.config.js` extensions.

#### Surface & Background Tokens

| Token | CSS Variable | Usage |
|-------|-------------|-------|
| `w-bg` | `--w-bg` | Main background |
| `w-bg-elev` | `--w-bg-elev` | Elevated surfaces (cards, panels) |
| `w-bg-sunken` | `--w-bg-sunken` | Recessed areas (inputs, dropdowns) |
| `w-bg-hover` | `--w-bg-hover` | Hover state backgrounds |

#### Foreground Tokens

| Token | CSS Variable | Usage |
|-------|-------------|-------|
| `w-fg` | `--w-fg` | Primary text |
| `w-fg-soft` | `--w-fg-soft` | Secondary text |
| `w-fg-mute` | `--w-fg-mute` | Tertiary/placeholder text |
| `w-fg-faint` | `--w-fg-faint` | Disabled/subtle text |

#### Accent Tokens

| Token | CSS Variable | Usage |
|-------|-------------|-------|
| `w-accent` | `--w-accent` | Primary accent (buttons, active states) |
| `w-accent-fg` | `--w-accent-fg` | Accent text (links, highlighted labels) |
| `w-accent-soft` | `--w-accent-soft` | Accent background tint |

#### Border Tokens

| Token | CSS Variable | Usage |
|-------|-------------|-------|
| `w-border` | `--w-border` | Standard borders |
| `w-border-soft` | `--w-border-soft` | Subtle/internal borders |

#### Signal Colors

| Token | CSS Variable | Usage |
|-------|-------------|-------|
| `sig-green` | `--sig-green` | Success, connected, valid |
| `sig-amber` | `--sig-amber` | Warning, unsaved, pending |
| `sig-red` | `--sig-red` | Error, destructive |

### Border Radius

Blueprint uses sharp corners. Custom Tailwind utilities:

| Class | Value |
|-------|-------|
| `rounded-theme-md` | `var(--radius-md)` — 0px in Blueprint |
| `rounded-theme-lg` | `var(--radius-lg)` — 0px in Blueprint |
| `rounded-theme-xl` | `var(--radius-xl)` — 0px in Blueprint |

### Shadows

| Token | CSS Variable | Usage |
|-------|-------------|-------|
| `shadow-card` | `--shadow-card` | Card/panel elevation |
| `shadow-glow` | `--shadow-glow` | Accent glow effect |

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│ Sidebar (w-56)  │  Breadcrumb bar              │
│                 │  ─────────────────────────────│
│  [Logo]         │                               │
│  Radio selector │  Main content area            │
│  ─────────────  │  (home / channels / settings  │
│  Nav items      │   / repeaterbook / repository)│
│  ─────────────  │                               │
│  File actions   │                               │
│  Language       │  ─────────────────────────────│
│                 │  Status bar                   │
└─────────────────────────────────────────────────┘
```

### Sidebar
- **Logo section**: Clickable — navigates to homepage
- **Radio selector**: Dropdown with "Select radio" label
- **Nav items**: Home (implicit via logo), Channels, Radio settings, RepeaterBook, Codeplug repository
- **File actions**: Open File, Save Image, Save CSV, Write to Radio (hidden on home/repository tabs)
- **Language selector**: EN / ES / CA

### Breadcrumb Bar
Top bar showing: Ready status dot > Radio model > codeplug > filename > saved/unsaved indicator. Connect radio button on the right.

### Status Bar
Bottom bar showing: channel count / max, frequency limits, save status.

## Button Sizing

All buttons use this scale, defined in `src/components/ui/Button.tsx`:

| Size | Tailwind | Height (approx) | Usage |
|------|----------|-----------------|-------|
| sm | `px-3 py-2` | ~36px | Toolbar buttons |
| md | `px-4 py-2.5` | ~40px | Primary actions |
| lg | `px-5 py-3.5` | ~48px | (reserved) |

## Color Semantics in Toolbar

| Color | Meaning | Example |
|-------|---------|---------|
| slate | Neutral/copy | Paste from clipboard |
| emerald | Additive | Add channel, Import repeaters |
| amber | Soft-delete | Clear selected (preserves row) |
| red | Destructive | Delete selected, Clear All |

### Destructive Action Levels

- **Tinted red** (`bg-red-50`, `bg-red-100`) — affects selection only (Delete, Clear)
- **Solid red** (`bg-red-600 text-white`) — reserved for pending confirmation state of "Clear All" only

## Two-Step Confirm Pattern

Used for the "Clear All" button. On first click:
- Button enters pending state: `bg-red-600 text-white font-bold`
- Label changes to `t('grid.alerts.confirmClearAllShort', { count })` — e.g., "Delete all 47 channels?"
- Auto-cancels after **3 seconds** via a `useEffect` timeout
- Also cancels on `onBlur` (clicking elsewhere)
- Second click executes the action

## Typography

- **Display font** (`font-display`): Used for the "Warble." logo text
- **Mono font** (`font-mono`): Used for status labels, beta badge, frequency readouts
- System sans-serif stack for body text
- Headers: `font-semibold` or `font-bold`
- Body/buttons: `font-medium`
- Meta text: `font-normal` or `text-xs`

## New Components (2026-04-19)

### LandingPage (Homepage)
- Hero text with rotating radio model name (fade animation, 7s interval)
- 2x2 grid of action cards
- Waveform visualization on the right (hidden on small screens)

### Waveform
- Animated canvas drawing using `requestAnimationFrame`
- Reads CSS variables for theme-aware colors (`--w-accent`, `--w-fg-faint`, `--w-border-soft`)
- Handles DPR scaling

### ChannelDetail (Inline Editor)
- Triggered by double-clicking a row in MemoryGrid
- 5 tabs: Basics, Tones & Squelch, DTMF/DCS, Power & mode, Notes & Tags
- Draft state pattern: copies channel data, user edits draft, Save/Discard

### RepeaterBookPage
- Split-panel layout: 420px search panel + flex-1 Leaflet map
- Interactive map with OpenStreetMap tiles, markers, popups
- Expandable repeater detail cards

## Toolbar Group Separators

Toolbar button groups are separated with:
```tsx
<div className="h-4 w-px bg-w-border mx-1" />
```
