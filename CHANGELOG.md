# Changelog

All notable changes to Warble will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Self-hosted backend** (2026-04-07)
  - Replaced Supabase with a fully self-hosted stack: Fastify + Better Auth + Drizzle ORM + PostgreSQL + MinIO
  - `backend/` — Fastify v5 REST API with Better Auth for email/password auth and session management
  - `backend/src/routes/` — REST endpoints for profiles, codefiles, ratings, comments, reports
  - `backend/src/storage/minio.ts` — MinIO S3-compatible file storage replacing Supabase Storage
  - `src/lib/api.ts` — new central HTTP client (`api`, `authApi`, `apiBuffer`)
  - All frontend data access migrated from Supabase SDK to custom REST API calls
  - Password recovery flow: email link → token → new password form
  - Auth modal extended with forgot/reset password modes (3 locales)

- **Full Docker deployment** (2026-04-07)
  - Root `Dockerfile` — multi-stage frontend build (Node 24 + nginx)
  - `nginx.conf` — serves static frontend + proxies `/api/` to backend
  - `docker-compose.yml` — single `docker compose up --build -d` starts postgres, minio, backend, frontend
  - Backend Dockerfile fixed with proper multi-stage build (builder + runner stages)
  - Automatic DB migrations on backend startup

- **UI Design System** (2026-04-03)
  - `src/components/ui/Button.tsx` — unified `Button` component with variants (primary / secondary / outline / ghost / destructive) and sizes (sm / md / lg)
  - Migrated all raw `<button>` elements across the app to the `Button` component: `RadioProgrammer`, `AuthModal`, `ProfileModal`, `CodefileCard`, `RepositoryPage`, `UploadModal`
  - Dark mode shadows fixed: added `shadow-slate-200/60 dark:shadow-slate-950/70` color tokens to all modals and cards (`AuthModal`, `ProfileModal`, `UploadModal`, `CodefileCard`, `GlobalSettings`, `App` mismatch dialog)
  - Sidebar hierarchy: file action buttons now use `text-xs` + smaller icons vs `text-sm` primary nav, with a labeled "ARXIU / FILE" section divider
  - `<Toaster>` added to `App.tsx`; `useToast.ts` now uses CSS variables `--toast-bg` / `--toast-text` for correct dark mode colors

- **Active radio status bar** (2026-04-03)
  - Persistent header bar at the top of the main content area (hidden on repository tab)
  - Shows: selected radio model name, "File loaded" badge (green) when a buffer is active, "Unsaved changes" badge (amber) when `isDirty` is true
  - USB connection button on the right side opens/closes the connection drawer

- **Persistent USB connection drawer** (2026-04-03)
  - `RadioProgrammer` moved from a dedicated tab to a slide-in drawer (right side, `z-50`)
  - Drawer opens via: USB button in the radio bar, or "Write to Radio" in the sidebar
  - After reading or writing, the drawer closes automatically — user stays on their current view
  - "USB Connection" tab removed from sidebar navigation
  - Backdrop click closes the drawer

- **Frequency validation indicator** (2026-04-03)
  - Invalid frequency cells now show a `⚠` prefix that persists even when the row is selected, eliminating confusion with normal row selection highlight
  - Browser tooltip on hover: "Frequency out of range for this radio" (i18n CA/ES/EN)
  - `enableBrowserTooltips` enabled on the AG Grid instance

- **RT-4D: open `.ddmr` directly in the main editor** (2026-04-03)
  - `src/App.tsx` — new branch in `handleFileUpload()` for `.ddmr` files: reads the binary buffer, calls `decodeRT4D()`, auto-switches the driver to `rt4d`, and loads the channels into the grid — same UX as opening a `.img` file
  - `src/App.tsx` — `accept` attribute on the hidden file input updated to include `.ddmr`
  - `src/App.tsx` — `decodeRT4D` imported from `src/lib/drivers/rt4d.ts`
  - i18n (CA/ES/EN) — `app.buttons.openFile` label updated to mention `.ddmr`
- **README: detailed architecture section** (2026-04-03)
  - Full technology stack table with versions and roles
  - Annotated source tree
  - Driver architecture: `IRadioDriver` interface, registry/factory pattern, driver comparison table
  - Data-flow diagrams: file open, USB read, USB write, save to disk
  - Supabase backend: tables, RLS policies, storage, RPCs/triggers
  - i18n, auto-detection, security, testing and CI/CD sections
  - Guide for adding a new radio driver

- **Radtel RT-4D DMR support** (2026-04-02) — first DMR radio supported by Warble
  - `src/lib/drivers/rt4d.ts` — full serial read/write driver + `.ddmr` decoder
    - Read protocol: block-based (1024 B), blocks 0x0008–0x03C3, 115200 baud (CH340)
    - Write protocol: 1028-byte packets `[cmd, ctr_hi, ctr_lo, 1024B data, csum]`
      - cmd=0x90 → config block 0x0008
      - cmd=0x91 → data blocks 0x0010–0x0357 (channels, zones, lists)
      - cmd=0x97 → DMR contact table 0x0358–0x035F
      - cmd=0x98 → final section 0x03C0–0x03C3
    - All-0xFF blocks skipped (matches official CPS behaviour)
    - Protocol fully reverse-engineered from USB serial captures; **verified on real hardware**
  - `src/lib/types.ts` — `'DMR'` added to mode union; optional `timeslot` and `contactIndex` fields
  - `src/lib/imgDetection.ts` — `.ddmr` detection (1 MB size + `CD AB` magic at 0x200C)
  - `src/lib/supabase.ts` — Radtel brand + RT-4D model; `'ddmr'` file format type
  - `src/lib/drivers/index.ts` — RT-4D registered in `SUPPORTED_RADIOS` (3072 channels)
  - `src/repository/PreviewModal.tsx` — adaptive DMR columns (Timeslot, TalkGroup) in preview modal
  - `src/repository/UploadModal.tsx` — accepts `.ddmr` files with auto-detection
  - i18n (CA/ES/EN) — `grid.columns.timeslot` and `grid.columns.talkgroup`

---

## [0.9.0] - 2026-04-02

### Added
- **Codeplug Repository — Phase 4** (2026-04-02)
  - `src/repository/CodefileDetailModal.tsx` — community interaction modal: star ratings (1–5), two-level threaded comments, report dialog
  - `src/repository/useRepository.ts` — added `fetchRatings`, `upsertRating`, `deleteRating`, `fetchComments`, `addComment`, `deleteComment`, `reportContent`
  - `src/lib/supabase.ts` — denormalized `avg_rating`, `rating_count` on `Codefile`; `Comment` and `Rating` types
  - `src/repository/CodefileCard.tsx` — star average display in meta row, "Details" button opening CodefileDetailModal
  - Supabase: `ratings`, `comments`, `reports` tables + RLS + trigger for denormalized aggregate columns
  - Sort by best rated option in repository filter panel
  - Anonymous users now restricted from downloading (authentication required)
  - Fix: duplicate i18n key `repository.filter` renamed to `repository.filterButton` in CA/ES/EN locales
  - Full i18n coverage (CA / ES / EN) for all Phase 4 strings

- **Codeplug Repository — Phase 3** (2026-04-02)
  - `src/repository/PreviewModal.tsx` — read-only AG Grid modal for in-browser channel preview
  - `src/lib/imgDetection.ts` — `.img` binary footer detection: parses JSON metadata to extract radio model; handles optional extra bytes between magic and base64
  - `src/lib/drivers/uv5rmini.ts` — exported standalone `decodeUV5RMini()` function
  - `src/repository/useRepository.ts` — `fetchCodefileBuffer()` for signed URL in-memory file fetch
  - `src/repository/CodefileCard.tsx` — "Preview" button for supported `.img` models (UV-5R, UV-5R MINI)
  - `src/App.tsx` — driver mismatch detection when opening `.img` files + confirmation dialog; Write to Radio and Save CSV buttons moved to sidebar
  - `src/components/Sidebar.tsx` — added Write to Radio and Save CSV to sidebar; logo larger; auth and radio selector reordered
  - Fix: extra `0x01` byte between `.img` magic and base64 JSON is now skipped correctly

- **Codeplug Repository — Phase 2** (2026-04-01)
  - `src/repository/useRepository.ts` — `useRepository` hook (list/filter/paginate) + `uploadCodefile` + `downloadCodefile` functions
  - `src/repository/UploadModal.tsx` — upload form with cascading brand→model selects and auto-detection badge
  - `src/repository/CodefileCard.tsx` — card with metadata, format badge, download button
  - `src/repository/RepositoryPage.tsx` — full browse page replacing the Phase 1 skeleton
  - Auto-detection of radio model from `.img` file size (UV-5R: 6152 B / UV-5R MINI: 33344 B)
  - `Codefile`, `CodefileWithAuthor` types and `RADIO_BRANDS` catalogue added to `src/lib/supabase.ts`
  - Supabase backend: `codefiles` table + RLS + Storage bucket + `increment_downloads` RPC + FK to `profiles`
  - Full i18n coverage for Phase 2 strings (CA / ES / EN): upload form, filter panel, card, results, pagination
- **Codeplug Repository — Phase 1** (2026-03-31)
  - Supabase Auth: register, login, persistent session, user profile modal
  - Left sidebar navigation replacing horizontal tab bar
  - Repository skeleton tab with search bar and feature preview cards

### Added (earlier)
- **Security improvements**
  - File size validation (10MB limit) for uploaded files
  - XSS protection via HTML sanitization of channel names
  - CSV formula injection prevention
  - Binary buffer corruption detection
  - Frequency validation against hardware limits
- **Toast notification system** replacing browser alerts for better UX
- **Custom React hooks**
  - `useFrequencyValidation` - Frequency validation logic
  - `useToast` - Consistent toast notifications
- **Comprehensive test suite**
  - Unit tests for binary utilities (BCD conversion, frequency parsing)
  - Security validation tests
  - Vitest configuration with Happy DOM
- **Developer tooling**
  - ESLint configuration
  - TypeScript strict mode
  - CI/CD pipeline with GitHub Actions
  - Environment variables configuration (`.env.example`)
- **Documentation**
  - JSDoc comments for public functions
  - SECURITY.md with security policies
  - CHANGELOG.md
  - Constants with descriptive names for magic numbers

### Changed
- Improved error handling with typed errors instead of `any`
- Better type safety throughout codebase (reduced usage of `any`)
- Binary utilities now throw descriptive errors on invalid input
- Enhanced BCD conversion functions with validation

### Fixed
- Type assertions in App.tsx for Blob creation
- Error messages now use i18n translations instead of hardcoded English

## [0.1.0-MVP] - 2025-01-XX

### Added
- Initial MVP release
- Baofeng UV-5R and UV-5R MINI driver support
- Web Serial API integration for USB programming
- AG Grid-based channel editor
- RepeaterBook API integration
- PMR446 channel quick-add
- Import/export `.img` and `.csv` files
- Multilingual UI (Catalan, Spanish, English)
- Global radio settings panel
- Virtual zones for channel organization
- Dark mode support
- Frequency validation with color-coded errors

### Known Issues
- Tests require Node.js 20+ (incompatible with Node 18)
- RepeaterBook proxy requires server-side configuration for production
- Some ESLint warnings for engine version mismatch

[Unreleased]: https://github.com/cdelcollado/Warble/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/cdelcollado/Warble/compare/v0.1.0...v0.9.0
[0.1.0-MVP]: https://github.com/cdelcollado/Warble/releases/tag/v0.1.0
