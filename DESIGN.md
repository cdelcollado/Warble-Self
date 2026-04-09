# Warble Design System

## Button Sizing

All buttons use this scale, defined in `src/components/ui/Button.tsx`:

| Size | Tailwind         | Height (approx) | Usage                  |
|------|------------------|-----------------|------------------------|
| sm   | `px-3 py-2`      | ~36px           | Toolbar buttons        |
| md   | `px-4 py-2.5`    | ~40px           | Primary actions        |
| lg   | `px-5 py-3.5`    | ~48px           | (reserved)             |

Toolbar buttons in `MemoryGrid.tsx` and `Sidebar.tsx` use raw `<button>` elements
with `px-3 py-2` (matching sm). If sm sizing changes in Button.tsx, update toolbar
buttons to match.

## Color Semantics

The toolbar uses a consistent color vocabulary:

| Color   | Meaning       | Example                          |
|---------|---------------|----------------------------------|
| slate   | Neutral/copy  | Paste from clipboard             |
| emerald | Additive      | Add channel, Import repeaters    |
| amber   | Soft-delete   | Clear selected (preserves row)   |
| red     | Destructive   | Delete selected, Clear All       |

### Destructive Action Levels

Within the red group, there are two levels:
- **Tinted red** (`bg-red-50`, `bg-red-100`) — affects selection only (Delete, Clear)
- **Solid red** (`bg-red-600 text-white`) — reserved for pending confirmation state of "Clear All" only

A thin vertical separator (`h-5 w-px bg-slate-200`) separates "Delete Selected" from
"Clear All" to signal that Clear All is in a category of its own.

## Two-Step Confirm Pattern

Used for the "Clear All" button. On first click:
- Button enters pending state: `bg-red-600 text-white font-bold`
- Label changes to `t('grid.alerts.confirmClearAllShort', { count })` — e.g., "Delete all 47 channels?"
- Auto-cancels after **3 seconds** via a `useEffect` timeout
- Also cancels on `onBlur` (clicking elsewhere)
- Second click executes the action

This pattern replaces `window.confirm()` to keep the interaction in-context.

## Dark Mode

All components support dark mode via Tailwind `dark:` variants. The app uses
`isDarkMode` prop propagated from the root. Dark mode uses `slate-800/900/950`
surfaces and lighter foreground text.

## Typography

No custom font. Uses the system sans-serif stack. Headers use `font-semibold` or
`font-bold`, body/buttons use `font-medium`, meta text uses `font-normal` or `text-xs`.

## Toolbar Group Separators

Toolbar button groups are separated with:
```tsx
<div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
```

Groups in MemoryGrid toolbar:
1. Clipboard (paste)
2. Add channels (Add Channel, Repeaterbook, Add PMR)
3. Partial-delete (Clear Selected, Delete Selected)
4. [separator] Full-delete (Clear All — two-step confirm)
