# Warble — Work Session State

> This file is updated at the end of each session.
> Do not edit manually.

---

## Current Status

**Last updated**: 2026-04-03 (session 2)
**Active phase**: UI improvements — in progress. Version: **v0.9.0 (BETA 0.9)**

---

## Codeplug Repository Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Auth + sidebar + UI skeleton | ✅ Completed (2026-03-31) |
| Phase 2 | Upload & browse codefiles | ✅ Completed (2026-04-01) |
| Phase 3 | In-browser channel preview | ✅ Completed (2026-04-02) |
| Phase 4 | Ratings, comments & moderation | ✅ Completed (2026-04-02) |

---

## Driver Radtel RT-4D — Delivered (2026-04-02)

First **DMR** radio fully supported in Warble. Complete implementation:

### New / modified files
- `src/lib/drivers/rt4d.ts` (**NEW**) — `.ddmr` decoder + full RT-4D serial driver
- `src/lib/drivers/index.ts` — RT-4D added to `SUPPORTED_RADIOS` (3072 channels)
- `src/lib/imgDetection.ts` — `.ddmr` detection (magic `CD AB` at 0x200C + 1 MB size)
- `src/lib/supabase.ts` — Radtel added to `RADIO_BRANDS`; `ddmr` format in `file_format` type
- `src/lib/types.ts` — `'DMR'` mode + optional `timeslot` and `contactIndex` fields
- `src/repository/PreviewModal.tsx` — DMR-specific columns (Timeslot, TalkGroup)
- `src/repository/UploadModal.tsx` — accepts `.ddmr` files; auto-detection
- `src/locales/ca.json`, `en.json`, `es.json` — `timeslot` and `talkgroup` in `grid.columns`

### RT-4D serial protocol (reverse-engineered from SPM captures, verified on hardware)

**Read** — Blocks 0x0008→0x03C3:
- ENTER: `[34 52 05 10 9B]` → ACK `06`
- READ addr: `[52 HH LL csum]` → `[52 HH LL]` + 1024 bytes + csum
- EXIT: `[34 52 05 EE 79]`

**Write** — 1028-byte packets `[cmd, ctr_hi, ctr_lo, ...1024 bytes..., csum]`:

| cmd | Block range | Counter | Content |
|-----|-------------|---------|---------|
| `0x90` | 0x0008 (1 block) | `0x0000` | Global config |
| `0x91` | 0x0010–0x0357 | `block − 0x0010` | Channels, zones, lists |
| `0x97` | 0x0358–0x035F | `block − 0x0358` | DMR contact table |
| `0x98` | 0x03C0–0x03C3 | `block − 0x03C0` | Final section |

- All-0xFF blocks are skipped (same behaviour as official CPS)
- Checksum: `sum(cmd, ctr_hi, ctr_lo, data[0..1023]) & 0xFF`
- Baud rate: **115200** (8N1, CH340)

### Channel structure (48 bytes / stride 0x30, starting at 0x4000)
- `+00`: type (`0x40`=Analog FM, `0x00/0x02`=DMR)
- `+03`: timeslot (`0x00`=TS1, `0x01`=TS2)
- `+05`: RX frequency (uint32 LE × 10 Hz)
- `+09`: TX frequency (uint32 LE × 10 Hz)
- `+11`: contact/TalkGroup index
- `+20`: channel name (ASCII 15 bytes, 0xFF padding)

### RT-4D future TODOs
- **Open `.ddmr` in the main editor** — ✅ implemented (2026-04-03): `accept` updated, `.ddmr` branch in `handleFileUpload`, driver auto-switched to `rt4d`.
- **RT-4D global settings** — pending reverse-engineering of offsets in the config block (see procedure below)
- Color Code: suspected upper nibble of byte `+02` (e.g. `0x4E` → CC=4)
- TalkGroup names: contact table at blocks 0x0358–0x0359 (located, decoder pending)
- `writeToRadio` for blocks 0x035A–0x03BF if a large codeplug has data there

### Procedure to identify RT-4D global settings offsets

No serial capture needed. The `.ddmr` is a complete flash memory dump, so settings are stored in binary directly. The global config block is block `0x0008` → file offset `0x2000`–`0x23FF` (1 KB).

**Steps:**
1. Open the RT-4D CPS and load the current codeplug
2. Change **one single parameter** (e.g. squelch from 3 to 7) and save → `settings_sq7.ddmr`
3. Revert the change (squelch from 7 to 3) and save → `settings_sq3.ddmr`
4. Compare the two files with the following script:

```python
a = open('settings_sq3.ddmr', 'rb').read()
b = open('settings_sq7.ddmr', 'rb').read()
diffs = [(i, a[i], b[i]) for i in range(len(a)) if a[i] != b[i]]
for off, va, vb in diffs:
    print(f'0x{off:06X}: {va:#04x} → {vb:#04x}')
```

5. If the diff shows **a single changed byte**, that is the direct offset of the parameter
6. If it shows several bytes, one will be an internal checksum → repeat with a third value
   to confirm which byte follows the parameter value
7. Repeat the process for each parameter (VOX, backlight, beep, etc.)

**Once the offsets are identified**, the implementation follows the UV-5R pattern exactly
(`getGlobalSettingsSchema`, `decodeGlobalSettings`, `encodeGlobalSettings`
in `src/lib/drivers/rt4d.ts`). The settings UI works with no additional changes.

---

## Phase 2 — Delivered (2026-04-01)

- `src/lib/supabase.ts` — `Codefile`, `CodefileWithAuthor` types, `RADIO_BRANDS` catalogue
- `src/repository/useRepository.ts` — hook + `uploadCodefile` + `downloadCodefile`
- `src/repository/UploadModal.tsx` — upload form with auto-detection by `.img` size
- `src/repository/CodefileCard.tsx` — card with metadata, format badge, download button
- `src/repository/RepositoryPage.tsx` — full browse page: search, filters, grid, pagination
- Auto-detection of radio from `.img` size: UV-5R (6152 B), UV-5R MINI (33344 B)
- Supabase: `codefiles` table + RLS + `codefiles` bucket + `increment_downloads` RPC + FK `author_id→profiles.id`
- Full i18n (CA/ES/EN) for Phase 2

---

## Phase 3 — Delivered (2026-04-02)

- `src/repository/PreviewModal.tsx` — read-only AG Grid modal + "Load to editor" action
- `src/lib/imgDetection.ts` — `.img` footer detection + native size (shared utility)
- `src/lib/drivers/uv5rmini.ts` — exports standalone `decodeUV5RMini()` function
- `src/repository/useRepository.ts` — `fetchCodefileBuffer()` (in-memory download)
- `src/repository/CodefileCard.tsx` — "Preview" button for supported `.img` models
- `src/App.tsx` — driver mismatch detection on `.img` open + confirmation dialog
- Fix: extra `0x01` byte between `.img` magic and base64 JSON is now skipped correctly

## Phase 4 — Delivered (2026-04-02)

- `src/repository/CodefileDetailModal.tsx` — full modal: ★ 1-5 rating, threaded comments with replies, report dialog
- `src/repository/useRepository.ts` — `fetchRatings`, `upsertRating`, `deleteRating`, `fetchComments`, `addComment`, `deleteComment`, `reportContent`
- `src/lib/supabase.ts` — `avg_rating`, `rating_count` fields on `Codefile`; `Comment` and `Rating` types
- `src/repository/CodefileCard.tsx` — star display in meta row, "Details" button
- Supabase: `ratings`, `comments`, `reports` tables + RLS + trigger for denormalized `avg_rating`/`rating_count`
- Sort by "Best rated" (`rating`) in filter panel
- Anonymous users cannot download codefiles (auth required)
- Fix: duplicate key `"filter"` → `"filterButton"` in CA/ES/EN locales
- Full i18n (CA/ES/EN) for Phase 4

---

## Phase 1 — Delivered (2026-03-31)

- `src/lib/supabase.ts` — Supabase client + `Profile` type
- `src/auth/useAuth.ts` — auth hook: signIn, signUp, signOut, persistent session
- `src/auth/AuthModal.tsx` — login/register modal with callsign field
- `src/auth/ProfileModal.tsx` — profile editor (callsign + country)
- `src/repository/RepositoryPage.tsx` — skeleton with "coming soon" banner
- `src/components/Sidebar.tsx` — full sidebar navigation

---

## Additional improvements (2026-04-02, post-Phase 4)

- Version bumped to **v0.9.0** (`package.json`, README badge, locales `BETA 0.9`, git tag `v0.9.0`)
- Grid zones hidden when driver has ≤32 channels (`channelCount` in `RadioModel`)
- "Loc" column renamed to "Canal" (CA/ES) / "Channel" (EN)
- Fix: duplicate key `repository.filter` → `repository.filterButton` in all 3 locales

---

## Delivered (2026-04-03)

- **Open `.ddmr` in the editor** ✅ — `App.tsx`: `.ddmr` branch in `handleFileUpload`, `decodeRT4D()`, driver auto-switched to RT-4D. `accept` updated to `.img,.csv,.ddmr`. i18n (CA/ES/EN) "Open File" button label updated.
- **README: exhaustive architecture section** ✅ — full stack, source tree, driver architecture, data-flow, Supabase schema, i18n, security, testing, CI/CD, guide for adding new drivers.
- **RT-4D global settings offset procedure documented** ✅ — hex-diff steps to locate offsets without serial capture.
- **All .md files and all code comments translated to English** ✅
- **UI Design System** ✅ — `Button` component (5 variants), full migration of all raw buttons, dark mode shadows, Sidebar hierarchy with section label, `<Toaster>` + CSS vars for toasts
- **Active radio status bar** ✅ — persistent header showing model name, file-loaded badge and unsaved-changes badge; USB button opens connection drawer
- **Persistent USB connection drawer** ✅ — `RadioProgrammer` in a slide-in right-side drawer; USB tab removed from sidebar; drawer closes after read/write
- **Frequency validation indicator** ✅ — `⚠` prefix on invalid cells (visible even when selected) + browser tooltip "Frequency out of range for this radio"

---

## UI Improvements — Status (2026-04-03)

### Completed this session
| # | Problem | Status |
|---|---------|--------|
| 1 | Unified button system | ✅ `Button` component + full migration |
| 2 | Dark mode shadows | ✅ shadow color tokens on all cards/modals |
| 3 | Sidebar density/hierarchy | ✅ section label + smaller file action buttons |
| 4 | Toast dark mode | ✅ `<Toaster>` + CSS vars |
| 5 | USB connection in separate tab | ✅ persistent slide-in drawer |
| 6 | "Write" button confusing | ✅ resolved with drawer (opens directly) |
| 7 | No active radio indication | ✅ radio status bar with badges |
| 8 | Frequency validation unclear | ✅ `⚠` icon + browser tooltip |

### Pending
| # | Problem | Priority | Effort |
|---|---------|----------|--------|
| 9 | Repository as main tab | Low | Medium |
| 10 | Sidebar not collapsible (mobile) | Low | High |
| 11 | Channel grid min-w-[1280px] | Low | High |

---

## Suggested next steps

- **UI remaining**: Repository tab → secondary navigation (problem 9); sidebar collapsible (10); grid responsive (11)
- **RT-4D global settings** — hex-diff two `.ddmr` files (see procedure in RT-4D section) to identify offsets; driver implementation is straightforward once identified
- **Public deployment** (Vercel) → prerequisite for v1.0
- **Docker support** (proposed 2026-04-03) — `Dockerfile` + nginx + `docker-compose.yml` for self-hosted deployments; low priority while Vercel is the primary target
- TalkGroup name decoder for RT-4D (blocks 0x0358–0x0359 located)
- DMR Color Code for RT-4D (upper nibble of byte +02)
- New radio models (Quansheng UV-K5, Baofeng UV-82...)
- PWA (install as app)

---

## Key technical decisions

- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Frontend**: React + TypeScript + Vite
- **UI**: AG Grid for the channel grid
- **i18n**: CA / ES / EN (`src/locales/` files)
- **Auth**: ham radio callsign required at registration
- **Preview**: reuses Warble's own drivers to decode channels in the browser
- **Auto-detection**: `.img` binary footer (JSON metadata) + `.ddmr` magic bytes
- **Zones**: visible only if `channelCount > 32` (defined in `SUPPORTED_RADIOS` registry)
- **DMR**: `'DMR'` mode in `MemoryChannel`, adaptive Timeslot/TalkGroup columns
- **Language policy**: all .md files and all code comments must be in English

---

## Git — latest commits (2026-04-03, session close)

```
53cd910 fix: resolve all ESLint errors to unblock CI
1c8a559 docs: close session — update SESSION.md with final state 2026-04-03
d8b0854 docs: remove Baofeng-specific mention in USB programming feature
d6965ea docs: update .md files with UI improvements (2026-04-03 session)
9f58dd1 feat: add warning icon and tooltip to invalid frequency cells
11a49d1 feat: replace USB tab with persistent connection drawer
6c61656 feat: add active radio status bar to main content area
df804ad refactor: unify UI design system (buttons, shadows, sidebar, toasts)
8df4a30 refactor: translate all .md files and code comments to English
44326ed docs: exhaustive architecture section in README + session update 2026-04-03
811922f feat: open .ddmr files directly in the main editor
e308597 feat: add Radtel RT-4D DMR radio support (read + write + repository preview)
```
```
697776a docs: close session — update all .md files with 2026-04-03 session deliverables
53cd910 fix: resolve all ESLint errors to unblock CI
1c8a559 docs: close session — update SESSION.md with final state 2026-04-03
d8b0854 docs: remove Baofeng-specific mention in USB programming feature
d6965ea docs: update .md files with UI improvements (2026-04-03 session)
```
```
697776a docs: close session — update all .md files with 2026-04-03 session deliverables
53cd910 fix: resolve all ESLint errors to unblock CI
1c8a559 docs: close session — update SESSION.md with final state 2026-04-03
d8b0854 docs: remove Baofeng-specific mention in USB programming feature
d6965ea docs: update .md files with UI improvements (2026-04-03 session)
```
