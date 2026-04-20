<p align="center">
  <img src="public/warble-logo.png" alt="Warble Logo" width="140" />
</p>

# Warble

> **Warble: radio programming for the web**

Warble is a modern, open-source web application for programming amateur (ham) radio transceivers directly from your browser — no software installation required. Built using web technologies, it runs natively in Chrome or Edge via the **Web Serial API**.

![Version](https://img.shields.io/badge/version-0.9.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20|%20Edge-orange)
![Status](https://img.shields.io/badge/status-Beta-yellow)

---

## ✨ Features

### 🔌 Direct USB Radio Programming
- Connect your radio via USB programming cable (FTDI, CP2102 or CH340 chip)
- Read and write channel memory directly using the **Web Serial API**
- No drivers, no Java, no desktop app needed — just Chrome or Edge

### 📻 Supported Radios
| Model | Channels | Mode | Protocol |
|---|---|---|---|
| **Baofeng UV-5R** (and variants) | 128 | FM analog | Standard UV-5R |
| **Baofeng UV-5R MINI** | 999 | FM analog | UV17Pro (XOR-encrypted) |
| **Radtel RT-4D** | 3072 | FM + **DMR** | Proprietary (reverse-engineered) |

### 🏠 Homepage with Radio Showcase
- Dedicated homepage with rotating radio model names (cycles every 7 seconds)
- Four quick-action cards: Read from radio, Open file, Import repository, Start blank
- Animated waveform canvas visualization
- Clickable logo navigates back to homepage from any tab

### 📊 Spreadsheet-style Channel Editor
- AG Grid-powered table with inline editing
- **Double-click a row** to open an inline tabbed editor (Basics, Tones, DTMF, Power, Notes)
- Real-time frequency validation with colour-coded highlighting
- Edit channel name, frequency, duplex, offset, CTCSS/DCS tones, mode, power, skip

### 🗂️ Virtual Zones
Organise channels into virtual zones (groups of 32) for easier navigation — transparent to the radio.

### 📡 RepeaterBook with Interactive Map
- Search and import repeaters from **[RepeaterBook](https://repeaterbook.com/)** directly into your channel list
- **Interactive Leaflet map** with repeater markers and popups
- Split-panel layout: search/list on the left, map on the right
- Filter by country, region, band; radius slider (5–500km); sort by distance or frequency
- Expandable repeater detail cards with callsign, city, frequency, PL, distance

### 🚨 PMR446 Quick-add
One-click insertion of all 16 standard PMR446 channels.

### 💾 Import / Export
- Import `.img`, `.csv`, `.ddmr` files
- Export `.csv`, save `.img` binary images
- Drag-and-drop support

### 🌍 Multilingual UI
Available in **Catalan (CA)**, **Spanish (ES)**, and **English (EN)** — auto-detected from browser.

### 🗄️ Codeplug Repository
- Community repository for sharing, browsing and downloading radio codeplugs
- Upload `.img`, `.csv` or `.ddmr` with title, description, brand, model, country, region
- Auto-detection of radio model from `.img` footer and `.ddmr` magic bytes
- Browse and filter by brand, model, country — sort by newest, most downloaded, or best rated
- In-browser channel preview powered by Warble's own drivers
- Load community codeplugs directly into the channel editor
- Star ratings (1–5), threaded comments, and content reporting

> **Single-user mode:** Warble-Self is designed for self-hosted personal use. There is no login or registration — all repository actions are attributed to the local `warble` user automatically.

---

## 🚀 Getting Started

### Option A — Docker (recommended)

#### Prerequisites
- **Docker Engine** (v20.10+) and **Docker Compose v2**. On fresh Ubuntu/Debian:
  ```bash
  sudo apt update && sudo apt install -y docker.io docker-compose-v2 openssl git
  sudo usermod -aG docker $USER   # then log out and back in, or run: newgrp docker
  ```
  Run docker commands as your normal user (not with `sudo`) — `sudo docker compose` can behave differently from plain `docker compose` on some hosts.
- **CPU with x86-64-v2 support** (any Intel Nehalem / AMD Bulldozer or newer, ~2009+). Older CPUs will fail with `Fatal glibc error: CPU does not support x86-64-v2` when MinIO starts.

#### Install

```bash
# 1. Clone the repository
git clone https://github.com/cdelcollado/Warble-Self.git
cd Warble-Self

# 2. Generate secrets and create .env automatically
./setup.sh

# 3. Build and start everything
docker compose up --build -d

# 4. Check that all five containers are up and healthy
docker compose ps
```

Open **http://localhost** in your browser. No registration required — you're the only user.

> For production with a real domain and HTTPS, edit `.env` before step 3 and set `DOMAIN`, `BETTER_AUTH_URL` and `FRONTEND_URL`. See [QUICKSTART.md](QUICKSTART.md) for SSL and Cloudflare setup.

#### Updating to a newer version

`docker compose up --build -d` alone can reuse cached image layers and keep serving old code. After `git pull`, force a clean rebuild:

```bash
git pull origin main
docker compose build --no-cache frontend backend
docker compose up -d --force-recreate frontend backend
```

Then hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) to drop the cached SPA.

### Option B — Local Development

#### Prerequisites
- [Node.js](https://nodejs.org/) v22 or higher
- [Docker](https://docker.com/) (for PostgreSQL and MinIO)

```bash
# 1. Start infrastructure (postgres + minio)
docker compose up postgres minio -d

# 2. Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env and set your values

# 3. Install and start backend
cd backend
npm install
npm run dev

# 4. In a new terminal, install and start frontend
cd ..
npm install
npm run dev
```

Frontend: **http://localhost:5173**
Backend: **http://localhost:3000**

---

## 🖥️ Browser Requirements

| Requirement | Details |
|---|---|
| Browser | **Google Chrome** or **Microsoft Edge** (v89+) |
| OS | Windows, macOS, or Linux |
| Hardware | USB programming cable (FTDI or CP2102 chip recommended) |

> ⚠️ Firefox and Safari do not support the Web Serial API.

---

## 🛠️ Architecture

### Technology Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| **Language** | TypeScript | ~5.9 | Strict typing throughout |
| **UI Framework** | React | ^19.2 | Component-based UI |
| **Build Tool** | Vite | ^5.4 | Dev server + production bundler |
| **Styling** | Tailwind CSS | ^3.4 | Utility-first with semantic design tokens |
| **Maps** | Leaflet + react-leaflet | ^1.9 / ^5 | Interactive RepeaterBook map |
| **Grid** | AG Grid Community | ^35.1 | Spreadsheet-style channel editor |
| **Icons** | Lucide React | ^0.575 | SVG icon library |
| **i18n** | i18next + react-i18next | ^25 / ^16 | CA / ES / EN runtime translations |
| **Backend** | Fastify | ^5.3 | REST API server |
| **Database** | PostgreSQL + Drizzle ORM | 16 / ^0.41 | Relational data store |
| **Storage** | MinIO | latest | S3-compatible file storage |
| **Proxy** | Caddy + nginx | 2-alpine / alpine | TLS termination + static serving + API proxy |
| **Testing** | Vitest + Happy DOM | ^4.1 / ^20.8 | Unit tests |
| **Linting** | ESLint 9 + typescript-eslint | ^9 / ^8 | Static analysis |

### System Diagram

```
Browser
  │
  ▼
Caddy:80/443  (automatic HTTPS via Let's Encrypt)
  │
  ▼
nginx:80
  ├── /api/*  ──► backend (Fastify):3000
  │                 ├── Drizzle ORM  ──► PostgreSQL
  │                 └── MinIO SDK    ──► MinIO:9000
  └── /*      ──► React SPA (static files)
```

> No auth layer. All requests run as the single local user (`LOCAL_USER_ID = 'local'`).
> The `local` user row is seeded into the DB automatically on first startup.

### Source Tree

```
├── backend/                    # Fastify API server
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts        # Drizzle database client
│   │   │   ├── schema.ts       # PostgreSQL schema
│   │   │   └── migrate.ts      # Migration runner
│   │   ├── middleware/auth.ts   # LOCAL_USER_ID constant (no real auth)
│   │   ├── routes/             # REST API routes
│   │   │   ├── profiles.ts
│   │   │   ├── codefiles.ts
│   │   │   ├── ratings.ts
│   │   │   ├── comments.ts
│   │   │   ├── reports.ts
│   │   │   └── admin.ts        # Admin endpoints (ADMIN_SECRET bearer)
│   │   ├── storage/minio.ts    # MinIO client
│   │   └── index.ts            # Fastify app entry point
│   └── drizzle/migrations/     # SQL migration files
├── src/                        # React frontend
│   ├── App.tsx
│   ├── components/
│   │   ├── MemoryGrid.tsx      # AG Grid channel editor
│   │   ├── ChannelDetail.tsx   # Inline tabbed channel editor (double-click)
│   │   ├── LandingPage.tsx     # Homepage with radio showcase + action cards
│   │   ├── RepeaterBookPage.tsx # RepeaterBook with interactive Leaflet map
│   │   ├── Waveform.tsx        # Animated waveform canvas component
│   │   ├── GlobalSettings.tsx  # Driver-specific settings panel
│   │   ├── RadioProgrammer.tsx # USB read/write UI (slide-in drawer)
│   │   └── Sidebar.tsx         # Navigation sidebar with clickable logo
│   ├── hooks/
│   │   └── useTheme.ts         # Blueprint theme hook
│   ├── lib/
│   │   ├── api.ts              # HTTP client (api, authApi, apiBuffer)
│   │   ├── drivers/            # Radio driver implementations
│   │   ├── repeaterbook.ts     # RepeaterBook API (search, raw fetch, channel conversion)
│   │   ├── supabase.ts         # TypeScript types + RADIO_BRANDS catalogue
│   │   └── types.ts            # Core interfaces
│   ├── locales/                # CA / ES / EN translations
│   └── repository/             # Codeplug repository feature
├── Dockerfile                  # Frontend multi-stage build (nginx)
├── nginx.conf                  # nginx: static files + /api/* proxy to backend
├── Caddyfile                   # Caddy: TLS termination, proxies to nginx
├── docker-compose.yml          # Full stack orchestration
├── setup.sh                    # First-run script: generates .env with random secrets
└── .env.example                # Environment variable template
```

### Driver Architecture

Every radio is implemented as a class satisfying the `IRadioDriver` interface in `src/lib/types.ts`:

```typescript
export interface IRadioDriver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  readFromRadio(onProgress?: (pct: number) => void): Promise<Uint8Array>;
  writeToRadio(data: Uint8Array, onProgress?: (pct: number) => void): Promise<void>;
  decodeChannels(data: Uint8Array): MemoryChannel[];
  encodeChannels(channels: MemoryChannel[], baseBuffer: Uint8Array): Uint8Array;
  getFrequencyLimits(): { min: number; max: number }[];
  getGlobalSettingsSchema(): SettingDef[];
  decodeGlobalSettings(data: Uint8Array): GlobalSettings;
  encodeGlobalSettings(settings: GlobalSettings, baseBuffer: Uint8Array): Uint8Array;
}
```

| Driver | Radio | Protocol | Format |
|---|---|---|---|
| `uv5r.ts` | Baofeng UV-5R | Standard UV-5R (9600 baud) | `.img` (6152 B) |
| `uv5rmini.ts` | Baofeng UV-5R MINI | UV17Pro (XOR `CO 7`) | `.img` (33344 B) |
| `rt4d.ts` | Radtel RT-4D | Proprietary (115200 baud) | `.ddmr` (1 MB) |

### Backend API

| Prefix | Handler | Description |
|---|---|---|
| `GET/PUT /api/profiles/me` | Drizzle | User profile (callsign, country) |
| `GET/POST /api/codefiles` | Drizzle + MinIO | List and upload codefiles |
| `POST /api/codefiles/:id/download` | MinIO | Streams file binary to browser |
| `GET /api/codefiles/:id/buffer` | MinIO | Binary buffer for in-browser preview |
| `GET/PUT/DELETE /api/codefiles/:id/ratings` | Drizzle | Star ratings |
| `GET/POST /api/codefiles/:id/comments` | Drizzle | Threaded comments |
| `DELETE /api/comments/:id` | Drizzle | Delete a comment |
| `POST /api/reports` | Drizzle | Content reports |
| `GET /api/admin/reports` | Drizzle | List reports (ADMIN_SECRET required) |
| `DELETE /api/admin/codefiles/:id` | Drizzle + MinIO | Force-delete codefile (admin) |
| `DELETE /api/admin/comments/:id` | Drizzle | Force-delete comment (admin) |

---

## ⚙️ Environment Variables

Run `./setup.sh` to generate `.env` automatically with random secrets. The relevant variables are:

| Variable | Description | Auto-generated |
|---|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL password | Yes |
| `MINIO_ACCESS_KEY` | MinIO username | Yes |
| `MINIO_SECRET_KEY` | MinIO password | Yes |
| `BETTER_AUTH_SECRET` | Internal signing secret | Yes |
| `ADMIN_SECRET` | Bearer token for `/api/admin/*` | Yes |
| `DOMAIN` | Public domain for HTTPS (`localhost` for dev) | No — edit manually |
| `BETTER_AUTH_URL` | Full URL of the app (`http://localhost` for dev) | No — edit manually |
| `FRONTEND_URL` | Full URL of the app (`http://localhost` for dev) | No — edit manually |

For production, set `DOMAIN`, `BETTER_AUTH_URL` and `FRONTEND_URL` to your real domain with `https://`. Caddy will obtain a Let's Encrypt certificate automatically. See [QUICKSTART.md](QUICKSTART.md) for SSL and Cloudflare setup details.

---

## 🧪 Testing

```bash
# Backend tests (Vitest)
cd backend
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

---

## 🗺️ Roadmap

| Phase | Description | Status |
|---|---|---|
| Repository Phase 1 | Auth + sidebar + UI skeleton | ✅ 2026-03-31 |
| Repository Phase 2 | Upload & browse codefiles | ✅ 2026-04-01 |
| Repository Phase 3 | In-browser channel preview | ✅ 2026-04-02 |
| Repository Phase 4 | Ratings, comments & moderation | ✅ 2026-04-02 |
| Self-hosted backend | Fastify + Better Auth + MinIO | ✅ 2026-04-07 |
| Full Docker stack | Single `docker compose up` deployment | ✅ 2026-04-07 |
| Auth-free single-user mode | Removed login/register, local user auto-seeded | ✅ 2026-04-11 |
| UI redesign | Blueprint theme, homepage, inline editing, RepeaterBook map | ✅ 2026-04-19 |

**Upcoming:**
- PWA support
- More radio models (Quansheng UV-K5, AnyTone, Retevis)
- RT-4D: Color Code and TalkGroup name resolver
- Undo/Redo system
- Channel bulk operations

---

## 🤝 Contributing

Contributions are welcome! To add a new radio driver:

1. Fork the repository
2. Create `src/lib/drivers/yournewradio.ts` implementing `IRadioDriver`
3. Register in `src/lib/drivers/index.ts`
4. Add to `MODEL_TO_DRIVER_ID` in `src/lib/imgDetection.ts` (if `.img` format)
5. Open a Pull Request with a description of the protocol

Please open an issue first for major changes.

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

### Acknowledgements

- [CHIRP](https://chirpmyradio.com/) — the original open-source radio programming software that inspired this project. The UV-5R MINI protocol was reverse-engineered from CHIRP's `baofeng_uv17Pro.py` driver.
- [RepeaterBook](https://repeaterbook.com/) — repeater database API.
- [AG Grid](https://www.ag-grid.com/) — high-performance spreadsheet grid.

---

<p align="center">Made in Barcelona with ❤️ for the ham radio community</p>
