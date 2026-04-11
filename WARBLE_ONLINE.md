# Warble Online

> **Warble Online: community hub for ham radio codeplugs**

Warble Online is the publicly hosted, multi-user edition of Warble. It extends Warble-Self with user accounts, a community codeplug repository, and social features (ratings, comments, moderation).

Unlike Warble-Self — which is single-user and auth-free — Warble Online requires a Supabase project as its backend and is intended to be deployed on a public server accessible from the internet.

---

## Features (Online-only)

### User Accounts
- Registration and login via **Supabase Auth** (email + password)
- Optional ham radio callsign stored in user profile
- Persistent sessions across browser reloads

### Codeplug Repository *(Phases 1–4 implemented)*
- Community repository for sharing, browsing and downloading radio codeplugs
- Upload `.img`, `.csv` or `.ddmr` files with title, description, brand, model, country and region
- **Auto-detection** of radio model from `.img` metadata footer (UV-5R, UV-5R MINI) and from `.ddmr` magic bytes (RT-4D)
- Browse and filter by brand, model, country — sort by newest, most downloaded, or best rated
- **In-browser channel preview** — inspect channels without downloading, powered by Warble's own drivers (including DMR columns: Timeslot, TalkGroup)
- **Load to editor** — load a community codeplug directly into the channel editor
- **Star ratings (1–5)** with average score displayed on each card
- **Threaded comments** — two-level reply threads per codeplug
- **Report system** — flag inappropriate codefiles or comments for moderation
- Download counter tracked via Supabase RPC
- Paginated results (20 per page)
- Requires a free user account to upload, rate, and comment

---

## Architecture

### Backend: Supabase

Warble Online uses **Supabase** as a fully managed BaaS (Backend as a Service). No custom server-side code is required beyond the frontend SPA.

#### PostgreSQL tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles: callsign, country. FK → `auth.users` |
| `codefiles` | Uploaded codeplugs: metadata, brand, model, format, storage path, download count, avg rating |
| `ratings` | Star ratings (1–5) per user per codefile. Unique constraint `(codefile_id, user_id)` |
| `comments` | Threaded comments: top-level and replies (`parent_id` self-FK). Soft-deletable |
| `reports` | Content reports (codefiles or comments) for moderation |

#### Row-Level Security (RLS)

All tables have RLS enabled. Key policies:
- `codefiles`: anyone can read; only authenticated users can insert; only the author can delete
- `ratings`: authenticated users can upsert/delete their own rating; all can read
- `comments`: authenticated users can insert; authors can delete their own; all can read
- `reports`: authenticated users can insert; read restricted to admins

#### Storage

A single bucket `codefiles` stores the raw codeplug files. Access is controlled by Supabase Storage policies (upload requires auth; download requires auth; files are referenced by signed URL).

#### Server-side functions (RPC)

- **`increment_downloads(codefile_id)`** — atomic increment of `downloads` counter, callable by authenticated users
- **`avg_rating` trigger** — PostgreSQL trigger on `ratings` that keeps `codefiles.avg_rating` and `codefiles.rating_count` denormalized and always up to date

#### Client

The Supabase JavaScript client (`@supabase/supabase-js`) is initialised once in `src/lib/supabase.ts` with the project URL and public anon key from environment variables. Auth state is managed globally via `useAuth.ts`.

### Permission Model

| Action | Anonymous | Registered user | Author | Admin |
|--------|-----------|-----------------|--------|-------|
| Browse / search | ✅ | ✅ | ✅ | ✅ |
| Download | ✅ | ✅ | ✅ | ✅ |
| Preview channels | ✅ | ✅ | ✅ | ✅ |
| Upload codeplug | ❌ | ✅ | ✅ | ✅ |
| Rate / comment | ❌ | ✅ | ✅ | ✅ |
| Edit / delete own | ❌ | ❌ | ✅ | ✅ |
| Moderate / remove | ❌ | ❌ | ❌ | ✅ |

### Source additions over Warble-Self

```
src/
├── auth/
│   ├── AuthModal.tsx           # Login / register modal
│   ├── ProfileModal.tsx        # Profile editor (callsign + country)
│   └── useAuth.ts              # Hook: session management, signIn, signUp, signOut
├── lib/
│   └── supabase.ts             # Supabase client, TypeScript types, RADIO_BRANDS catalogue
└── repository/
    ├── RepositoryPage.tsx      # Browse page: search, filters, pagination
    ├── CodefileCard.tsx        # Card: metadata, star display, preview & download buttons
    ├── CodefileDetailModal.tsx # Community modal: star ratings, threaded comments, reports
    ├── PreviewModal.tsx        # In-browser channel preview (read-only AG Grid)
    ├── UploadModal.tsx         # Upload form with cascading brand→model selects
    └── useRepository.ts        # All Supabase interactions for the repository feature
```

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Auth + sidebar + UI skeleton | ✅ Done (2026-03-31) |
| **Phase 2** | Upload & browse codefiles | ✅ Done (2026-04-01) |
| **Phase 3** | In-browser channel preview | ✅ Done (2026-04-02) |
| **Phase 4** | Ratings, comments & moderation | ✅ Done (2026-04-02) |

### Phase 1 — Auth + sidebar + UI skeleton ✅ *Completed 2026-03-31*

**Deliverables:**
- `@supabase/supabase-js` installed and configured via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `src/lib/supabase.ts` — Supabase client + `Profile` type
- `src/auth/useAuth.ts` — hook: `signIn`, `signUp`, `signOut`, `user`, `displayName`, persistent session
- `src/auth/AuthModal.tsx` — login/register modal with callsign field, email confirmation screen
- `src/auth/ProfileModal.tsx` — profile editor (callsign + country), upsert to `profiles` table; opened by clicking the user name in the sidebar
- `src/repository/RepositoryPage.tsx` — skeleton tab with search bar, coming-soon banner, feature preview cards
- `src/components/Sidebar.tsx` — full sidebar navigation with Repository tab added
- All new strings translated in CA / ES / EN (`auth.*`, `profile.*`, `repository.*`)

**Supabase schema:**
```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  callsign text,
  country text,
  created_at timestamp with time zone default now()
);
alter table public.profiles enable row level security;
create policy "Profiles viewable by everyone" on profiles for select using (true);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
```

### Phase 2 — Upload & browse ✅ *Completed 2026-04-01*

**Deliverables:**
- `src/lib/supabase.ts` — `Codefile`, `CodefileWithAuthor` types + `RADIO_BRANDS` catalogue
- `src/repository/useRepository.ts` — hook for listing/filtering/paginating + `uploadCodefile` + `downloadCodefile` functions
- `src/repository/UploadModal.tsx` — upload form with cascading brand→model selects, file picker, auto-detection badge
- `src/repository/CodefileCard.tsx` — card with metadata, format badge (.img/.csv), author, location, download button
- `src/repository/RepositoryPage.tsx` — full browse page: search, filter panel, card grid, pagination
- Supabase: `codefiles` table + RLS policies + Storage bucket `codefiles` + `increment_downloads` RPC
- Full i18n coverage (CA / ES / EN) for all Phase 2 strings

**Supabase schema additions:**
```sql
create table public.codefiles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  brand text not null,
  model text not null,
  country text not null,
  region text,
  file_path text not null,
  file_format text not null,     -- 'img' | 'csv'
  downloads integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table public.codefiles enable row level security;
create policy "Codefiles viewable by everyone" on codefiles for select using (true);
create policy "Users can insert own codefiles" on codefiles for insert with check (auth.uid() = author_id);
create policy "Users can update own codefiles" on codefiles for update using (auth.uid() = author_id);
create policy "Users can delete own codefiles" on codefiles for delete using (auth.uid() = author_id);
```

### Phase 3 — Channel preview ✅ *Completed 2026-04-02*

**Deliverables:**
- `src/repository/PreviewModal.tsx` — read-only AG Grid modal showing decoded channels
- `src/lib/imgDetection.ts` — detects radio model from `.img` binary footer (JSON metadata)
- `src/repository/useRepository.ts` — `fetchCodefileBuffer()` fetches signed URL and returns `Uint8Array` in memory
- `src/repository/CodefileCard.tsx` — "Preview" button for supported `.img` models
- "Load into editor" copies channels into active session; silently switches driver if model already confirmed

### Phase 4 — Community & ratings ✅ *Completed 2026-04-02*

**Deliverables:**
- `src/repository/CodefileDetailModal.tsx` — modal with interactive star rating (1–5), two-level threaded comments, report dialog
- `src/repository/useRepository.ts` — `fetchRatings`, `upsertRating`, `deleteRating`, `fetchComments`, `addComment`, `deleteComment`, `reportContent`
- Star average + count displayed on each card; sort by best rated in filter panel
- Anonymous users cannot download, rate, or comment (login required)
- Full i18n coverage (CA / ES / EN) for all Phase 4 strings

**Supabase schema additions:**
```sql
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  codefile_id uuid references public.codefiles on delete cascade,
  user_id uuid references auth.users on delete cascade,
  score smallint check (score between 1 and 5),
  created_at timestamp with time zone default now(),
  unique (codefile_id, user_id)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  codefile_id uuid references public.codefiles on delete cascade,
  user_id uuid references auth.users on delete cascade,
  parent_id uuid references public.comments on delete cascade,
  body text not null,
  created_at timestamp with time zone default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users on delete cascade,
  target_type text not null,  -- 'codefile' | 'comment'
  target_id uuid not null,
  reason text,
  created_at timestamp with time zone default now()
);
-- Denormalized columns + trigger for correct pagination sort
alter table public.codefiles add column avg_rating numeric default 0;
alter table public.codefiles add column rating_count integer default 0;
```

---

## Future Proposals

### Callsign Verification
- Integrate with **DMR-MARC** or **HamQTH** API to verify that a callsign is a valid licensed amateur radio operator
- Show a verified badge on user profiles and uploaded codefiles
- Optional: gate upload privileges behind verified callsign

### Admin Moderation Panel
- Dedicated admin UI listing all pending reports (codefiles + comments)
- Actions: dismiss report, delete content, suspend user
- Accessible only to users with the `admin` role in Supabase

### Public User Profile Pages
- Public-facing profile page per user: callsign, country, list of uploaded codefiles
- Shows average rating received, total downloads, join date
- Linked from codefile cards (author name → profile page)

### Usage Analytics
- Optional, privacy-respecting analytics (Plausible or Umami — no cookies, no PII)
- Track: page views, feature usage, popular radio models, download counts
- Operator can opt in when deploying Warble Online

### Error Reporting
- Integrate Sentry for automatic error capture with stack traces
- User can submit optional feedback with error context
- No PII collected; respects user privacy

### Rate Limiting / Anti-abuse
- Per-IP and per-user upload rate limiting via `@fastify/rate-limit` or Supabase RLS checks
- Prevent comment spam: minimum account age or verified callsign required
- File size cap enforced at the Supabase Storage policy level

---

## Development Strategy

### Repository structure

Warble-Online lives in the **same GitHub repository** as Warble-Self. The two editions share the same core (drivers, channel editor, zones, RepeaterBook, i18n, all UX features). Online is purely additive: Online = Self + auth + Supabase + community features.

Splitting into two repos would require manually keeping shared code in sync — a maintenance burden with no benefit at this scale. A monorepo with pnpm workspaces would be architecturally cleaner but is premature until the teams or build complexity require it.

### Build targets

A single environment variable gates the Online features:

```env
# .env.self
VITE_MODE=self

# .env.online
VITE_MODE=online
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Two npm scripts produce two independent bundles from the same source:

```json
"build:self":   "vite build --mode self",
"build:online": "vite build --mode online"
```

### Feature gating

Online-only modules (`src/auth/`, `src/repository/`, `src/lib/supabase.ts`) are only imported when the env vars are present. Vite's tree-shaking excludes them from the Self bundle entirely.

```typescript
// src/lib/supabase.ts — no-op when env vars are absent
export const supabase = import.meta.env.VITE_SUPABASE_URL
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null
```

### Dependency ownership

| Dependency | Layer | Self | Online |
|---|---|---|---|
| `@supabase/supabase-js` | Frontend | Not bundled | Yes |
| Supabase project | BaaS | No | Yes |
| `resend` | Fastify backend only | No | Yes |
| Fastify backend | Docker container | Optional (proxy) | Required |

**Resend** handles transactional email from the Fastify backend (welcome emails, callsign verification, admin alerts) — things Supabase's built-in email cannot do with custom branding. It is never imported in the React frontend.

### When to split into two repos

Only if one of these becomes true:
- Different teams own Self vs Online
- You want to open-source Self but keep Online private
- Build complexity makes the shared repo more friction than benefit

---

## Deployment

Warble Online requires a Supabase project. Copy `.env.local.example` to `.env.local` and fill in the project credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

The frontend is still a static SPA deployable on any static host. The RepeaterBook proxy (if needed) runs as a separate Docker container — see the Docker section in `FEATURE_PROPOSALS.md`.

For a full public deployment, a reverse proxy (nginx, Caddy) with TLS is required — the Web Serial API only works over HTTPS.
