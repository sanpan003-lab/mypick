<div align="center">

# 🌳 My Pick

### The forager's map. Self-hosted, private, and built to outlive any service.

![Status](https://img.shields.io/badge/status-production-22c55e)
![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%206%20%2B%20PocketBase-3B82F6)
![Hosting](https://img.shields.io/badge/hosting-Synology%20NAS-orange)
![License](https://img.shields.io/badge/license-personal-lightgrey)

</div>

---

## 📖 What is My Pick?

**My Pick** is a personal urban foraging companion — a map app for finding, identifying, and tracking your favourite fruit trees. Drop a pin on a tree, attach photos, log when it fruits, and build your own private orchard map. Publish trees to a shared community layer if you want others to find them. Keep everything else to yourself.

The whole stack runs on a Synology NAS in my home. No cloud subscriptions. No vendor lock-in. No third-party data harvesting. If a SaaS company shuts down, my data and my app keep working.

> Originally prototyped with [Bolt.new](https://bolt.new) and Gemini, then ported to fully self-hosted infrastructure.

---

## 🌐 Live App

**Production:** `https://my-pick.duckdns.org:8444`
**Admin (PocketBase):** `https://my-pick.duckdns.org:8444/_/`

*HTTPS via DuckDNS + Let's Encrypt, running behind a Synology DSM reverse proxy.*

---

## ✨ Features

### 🗺️ Explorer — Map-First Discovery
- **Interactive Leaflet map** with multiple tile styles (standard / satellite / terrain)
- **Drop pins** at any location to mark a tree you've found
- **GPS auto-locate** with permission prompt
- **Search by species** to filter visible pins
- **Community layer toggle** — see public trees from other users in your area (bounding-box-filtered for performance)

### 🌲 My Trees — Personal Orchard
- **Grid / List** view toggles
- **Sort** by recency, species, or proximity to current location
- **Cover photos** with auto-generated thumbnails for video entries
- **Cross-device sync** via Google Drive backup

### 📷 Camera Capture
- **Front/back camera toggle** via `react-webcam`
- Captures photos directly into a tree's media gallery
- Photos are **client-side compressed** before storage to keep IndexedDB small

### 📓 Journal — Daily Foraging Notes
- Log harvest amounts, weather, mood, and **phenology events** (bud break, first leaf, full bloom, fruit set, ripening, etc.)
- **AI summaries powered by Gemini 2.0 Flash** — generates a "Weekly Summary" and "Season Outlook" based on recent entries
- Attach photos to journal entries

### 🌱 Botanical Database
- **79 fruit & nut tree species** with detailed metadata:
  - Scientific name, growing zone, harvest window
  - Taste description, texture
  - Climate conditions, growing tips
  - Health benefits
- **Fuzzy search** with relevance scoring (`useBotanicalSearch` hook)
- Used to auto-populate tree details when adding a new pin

### ☁️ Google Drive Backup
- **One-tap full archive** to your own Google Drive
- Single JSON bundle (`orchard_system_backup.json`) to minimise API quota
- **Restore from any device** — everything (pins, notes, photos) flows back
- Exponential backoff retry on rate limits
- Concurrency-locked to prevent double-sync

### 🌍 Community Pins
- Opt-in public layer for sharing trees
- **Anonymous reads** — anyone can see community trees
- **Device-scoped writes** — only the device that published a tree can edit or delete it
- Geo-filtered bounding-box queries (max 100 results per region for performance)

### 📲 Progressive Web App
- **Installable** on Android (and iOS via Safari "Add to Home Screen")
- Service worker for offline app shell
- Standalone display mode, custom theme color, splash screen
- Works without an internet connection once cached

### 💾 Local Backup
- **Export to JSON** for portable backups
- **Import from JSON** to restore on a new install
- No cloud dependency — your data is always exportable

---

## 🧱 Tech Stack

### Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | **React 19** + TypeScript | Modern hooks (useDeferredValue, etc.) + type safety |
| Build tool | **Vite 6** | Fast HMR, simple env injection, modern ESM |
| Styling | **Tailwind CSS v4** | Utility-first, zero-config v4 with `@tailwindcss/vite` |
| Maps | **Leaflet + react-leaflet 5** | Lightweight, free, no API key required |
| Animations | **motion** (formerly Framer Motion) | Smooth page/sheet transitions |
| Icons | **lucide-react** | Consistent, tree-shakeable icon set |
| Camera | **react-webcam** | Wraps `getUserMedia` cleanly |
| Image processing | **browser-image-compression** | Client-side WebP/JPEG compression |
| Local storage | **idb** (IndexedDB wrapper) | Stores photos & videos as Data URLs |
| AI | **`@google/genai`** (Gemini 2.0 Flash) | Journal summaries |

### Backend

| Layer | Choice | Why |
|---|---|---|
| Database & API | **PocketBase** (self-hosted) | Single Go binary, REST + realtime out of the box |
| Static file serving | **PocketBase's built-in static server** | One container serves both API and frontend — no nginx needed |
| Auth (community pins) | **Device-scoped UUIDs** in localStorage | No login required; trust model is per-device |

### Infrastructure

| Layer | Choice |
|---|---|
| Host | **Synology DS720+** (Intel Celeron J4125, 6 GB RAM) |
| Runtime | **Docker** via DSM Container Manager |
| TLS | **Let's Encrypt** via DSM, auto-renewed |
| Dynamic DNS | **DuckDNS** (custom provider added to DSM) |
| Reverse proxy | **DSM Application Portal** → `localhost:8090` |
| Port forwarding | Eero — port `8444` → NAS |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (PWA on Android / iPhone / Desktop)                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React app                                              │    │
│  │  ├── Explorer (Leaflet map)                             │    │
│  │  ├── My Trees (grid/list)                               │    │
│  │  ├── Save Location (pin creator)                        │    │
│  │  ├── Journal (with Gemini AI summaries)                 │    │
│  │  └── Sidebar (settings, backup, install)                │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Service Worker     IndexedDB (photos/videos)           │    │
│  │  • offline shell    • compressed Data URLs              │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS :8444
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  Synology DS720+ NAS  (192.168.5.195)                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DSM Reverse Proxy                                        │  │
│  │  https://my-pick.duckdns.org:8444  →  localhost:8090     │  │
│  └──────────────────────────────┬───────────────────────────┘  │
│                                  │                              │
│  ┌──────────────────────────────▼───────────────────────────┐  │
│  │  PocketBase container  (ghcr.io/muchobien/pocketbase)     │  │
│  │                                                            │  │
│  │  ├── /pb_public  →  static React app (dist/)              │  │
│  │  └── /api/collections/trees  →  community pins API        │  │
│  │                                                            │  │
│  │  Volumes:                                                  │  │
│  │    /volume1/docker/mypick-db/pb_data  (database)          │  │
│  │    /volume1/docker/mypick-db/dist     (frontend)          │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ OAuth 2.0 (user-initiated)
                               ▼
                    ┌──────────────────────┐
                    │  Google Drive API    │
                    │  (per-user backup)   │
                    └──────────────────────┘
```

**Key architectural decision: PocketBase serves the frontend.**
PocketBase has a built-in static file server pointed at `/pb_public`. By mounting the Vite `dist/` folder there, the same container that runs the API also serves the React app. **One process, one container, one URL.** No separate nginx, no separate Node server.

---

## 📦 Data Model

### PocketBase Collections

**`picks`** — Personal tree pins
```
id, uid, lat, lng, details (JSON), address, notes,
location_description, image_urls (JSON), video_urls (JSON),
date_added, is_public
```

**`journal`** — Foraging diary entries
```
id, uid, date, title, content, weather (JSON), harvest (JSON),
mood, phenology_events (JSON), tree_id, photo_count
```

**`photos`** — Photo blobs (base64 Data URLs)
```
id, data
```

**`trees`** — Community-shared pins (public read, device-scoped write)
```
id, device_uid, lat, lng, common_name, scientific_name,
description, address, notes, image_url, details (JSON), date_added
```

### Client-Side (IndexedDB)

Photos and videos are stored locally as compressed Data URLs to keep PocketBase storage minimal. They sync to Google Drive on demand via the backup feature.

---

## 🔒 Privacy & Data Ownership

- **Personal pins** stay on your NAS. Nothing is sent to any third party unless you explicitly opt to publish or back up.
- **Photos** are stored locally on each device. They only leave the device when you back up to *your own* Google Drive.
- **Community pins** are public — but they are the only piece of the app that *is* public. Opt-in per pin.
- **Authentication** for community pins is a self-generated UUID stored in `localStorage`. No emails, no passwords, no accounts.
- **The whole NAS** is behind a Let's Encrypt cert, port-forwarded only on TCP/8444. PocketBase admin is at `/_/` and gated by a strong password.

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- A running PocketBase instance (local or remote)

### Setup

```bash
# Clone
git clone https://github.com/sanpan003-lab/mypick.git
cd mypick

# Install
npm install

# Configure
cp env.example .env
# Edit .env:
#   VITE_POCKETBASE_URL=http://localhost:8090
#   VITE_GOOGLE_CLIENT_ID=<your OAuth client id>
#   VITE_GEMINI_API_KEY=<your Gemini API key>

# Run dev server
npm run dev
# Opens at http://localhost:3000
```

### Build for production

```bash
npm run build
# Output → dist/
```

---

## 🐳 Self-Hosting on a Synology NAS

This is the deployment pattern I use. It's reproducible on any DSM 7+ NAS with Docker (Container Manager).

### 1. Run PocketBase in Docker

`/volume1/docker/mypick-db/docker-compose.yml`:

```yaml
services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    container_name: mypick-unified-pb
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - /volume1/docker/mypick-db/pb_data:/pb_data:rw
      - /volume1/docker/mypick-db/dist:/pb_public:rw
```

```bash
docker compose up -d
```

### 2. Import the schema

Visit `http://<NAS_IP>:8090/_/`, create an admin account, then **Settings → Import collections** and upload `pocketbase-schema.json` from this repo.

### 3. Build and deploy the frontend

```bash
# On the NAS, in the project source folder:
sudo docker run --rm \
  -v /volume1/docker/mypick-source/project:/app \
  -w /app \
  node:20-alpine \
  sh -c "npm install && npm run build"

# Swap the dist/ that PocketBase is serving:
sudo cp -r /volume1/docker/mypick-source/project/dist /volume1/docker/mypick-db/dist
sudo chown -R 1000:1000 /volume1/docker/mypick-db/dist
```

### 4. Set up HTTPS

- **DSM → External Access → DDNS** — register a hostname (Synology DDNS or DuckDNS)
- **DSM → Security → Certificate** — request a Let's Encrypt cert for that hostname
- **DSM → Login Portal → Advanced → Reverse Proxy** — route `https://yourname.example.com:8444` → `http://localhost:8090`
- **Router** — forward TCP port 8444 to the NAS

### 5. Configure Google OAuth (for Drive backup)

- Create a project at [console.cloud.google.com](https://console.cloud.google.com)
- Enable the Google Drive API
- Create an **OAuth 2.0 Client ID** (Web application)
- Add your production URL to **Authorized JavaScript origins**
- Drop the Client ID into `.env` as `VITE_GOOGLE_CLIENT_ID`
- Rebuild

---

## 📁 Project Structure

```
mypick/
├── public/                       # Static assets served at site root
│   ├── icon-192.png              # PWA icon (Android install requirement)
│   ├── icon-512.png              # PWA icon (large)
│   ├── manifest.json             # PWA manifest
│   └── service-worker.js         # Offline app shell
│
├── src/
│   ├── App.tsx                   # Top-level state + routing between tabs
│   ├── main.tsx                  # React entry point + ErrorBoundary
│   ├── index.css                 # Tailwind v4 imports + globals
│   │
│   ├── components/
│   │   ├── PickMap.tsx           # Main Leaflet map + community layer
│   │   ├── SaveLocationForm.tsx  # Pin creation wizard
│   │   ├── ConfirmLocationSheet.tsx
│   │   ├── MyTrees.tsx           # Personal orchard grid/list
│   │   ├── TreeProfile.tsx       # Single-tree detail page
│   │   ├── MyNotes.tsx           # Journal with Gemini AI summaries
│   │   ├── CameraScanner.tsx     # Webcam capture overlay
│   │   ├── PhotoGallery.tsx      # Photo carousel + video thumbnailer
│   │   ├── Sidebar.tsx           # Settings, backup, app install
│   │   ├── BottomNav.tsx         # Tab switcher (Explorer/Trees/Save/Journal)
│   │   ├── TopBar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── SyncOverlay.tsx       # Google Drive sync progress
│   │   ├── ChangelogOverlay.tsx
│   │   ├── ErrorBoundary.tsx     # React error boundary
│   │   ├── ErrorModal.tsx
│   │   ├── LoadingLeaf.tsx       # Animated loading state
│   │   ├── DetailsCard.tsx
│   │   ├── SuccessOverlay.tsx
│   │   └── ProfileModal.tsx
│   │
│   ├── services/
│   │   ├── pocketbase.ts         # Shared PocketBase client
│   │   ├── localStorageDB.ts     # CRUD over PocketBase + IndexedDB for photos
│   │   ├── communityPins.ts      # Public trees layer
│   │   ├── googleDriveBackup.ts  # OAuth + Drive API with exponential backoff
│   │   ├── geocoding.ts          # Reverse-geocoding for pin addresses
│   │   └── supabase.ts           # (legacy — unused in current deployment)
│   │
│   ├── hooks/
│   │   └── useBotanicalSearch.ts # Fuzzy search w/ deferred values
│   │
│   ├── data/
│   │   └── botanicalDatabase.json # 79 species reference data
│   │
│   └── types/
│       └── trees.ts              # TreeDetails, BotanicalEntry interfaces
│
├── supabase/migrations/          # (legacy SQL — kept for reference)
├── pocketbase-schema.json        # Importable PocketBase collection schema
├── vite.config.ts
├── tsconfig.json
├── package.json
├── env.example                   # Template for .env (no secrets)
└── README.md                     # ← you are here
```

---

## 🛠️ Redeployment Workflow

After making code changes locally:

```bash
# 1. Commit and push
git add .
git commit -m "feat: <what you changed>"
git push

# 2. SSH into the NAS
ssh user@<NAS_IP>

# 3. Pull, rebuild, swap
cd /volume1/docker/mypick-source/project
git pull
sudo docker run --rm \
  -v $(pwd):/app -w /app \
  node:20-alpine \
  sh -c "npm install && npm run build"
sudo cp -r dist /volume1/docker/mypick-db/dist.new
sudo rm -rf /volume1/docker/mypick-db/dist
sudo mv /volume1/docker/mypick-db/dist.new /volume1/docker/mypick-db/dist
sudo chown -R 1000:1000 /volume1/docker/mypick-db/dist
```

No container restart needed — PocketBase serves files from disk on every request.

---

## 🎓 What I Learned

- **Self-hosting is the closest thing to a permanent stack.** Bolt, Vercel, Supabase, Firebase — these can disappear, change pricing, or break your app with a policy update. A docker-compose on a NAS you own does not.
- **PWA install requirements are stricter than the spec suggests.** Chrome on Android wants 192×192 *and* 512×512 PNGs — SVGs alone won't trigger the install prompt, even though the spec allows them.
- **Secure context restrictions are real.** `crypto.randomUUID()`, geolocation, camera, and clipboard APIs all require HTTPS *or* localhost. HTTP on a LAN IP doesn't count. Worth knowing before debugging silent feature failures.
- **PocketBase's static server is underrated.** It removes nginx from the stack entirely. Two volumes, one process, done.
- **OAuth `redirect_uri_mismatch` is almost always the answer.** When Google auth fails on a new origin, it's the JavaScript origins allowlist on the OAuth client, not the code.
- **Build-time env vars are baked in forever.** Vite inlines `import.meta.env.VITE_*` at build time. Changing `.env` after `npm run build` does nothing — you must rebuild.
- **PWA scope is per-origin, not per-hostname.** Two apps on `host.com:8443` and `host.com:8444` *should* be independent but Chrome groups them at the menu level, breaking install for the second app. Different hostnames is the only clean fix.

---

## 📝 Tech Debt / Known Issues

- The `supabase/` folder and `src/services/supabase.ts` are legacy from an earlier design — left in place but unused in the current deployment.
- The botanical database is small (79 entries) and could be expanded.
- Photos in IndexedDB don't survive uninstalling the PWA — users should back up to Drive before reinstalling.
- The Google Drive backup is a single JSON blob, so partial restores aren't possible.
- Vite warns about large chunks (>500 KB) — could be solved with dynamic imports / `manualChunks`.

---

## 🙏 Acknowledgements

- **[PocketBase](https://pocketbase.io/)** — the unsung hero of single-binary self-hosting
- **[Leaflet](https://leafletjs.com/)** — open-source maps that just work
- **[muchobien/pocketbase](https://github.com/muchobien/pocketbase-docker)** — the Docker image used in production
- **[Marius Hosting](https://mariushosting.com/)** — invaluable Synology DSM guides
- **[Bolt.new](https://bolt.new) + Gemini** — for the initial prototype that turned into this

---

<div align="center">

*Built with React, PocketBase, and a refusal to depend on the cloud for things a Raspberry Pi could do.*

</div>
