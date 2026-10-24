# BookSmart 📚

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D20.19-green.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-1.3.0-indigo.svg)](https://github.com/GhostKozak/booksmart)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-emerald.svg)](https://github.com/GhostKozak/booksmart)

**BookSmart** is a privacy-first, local-first smart bookmark manager, read-it-later client, and research companion that runs entirely in your browser. Organize thousands of bookmarks with Local or Cloud AI, read articles distraction-free, highlight web pages, follow RSS feeds, and keep your browser bookmarks synchronized in real time.

![BookSmart Screenshot](/images/homepage_screenshot.png)

---

## ✨ Core Features

### 🧠 AI-Powered Organization & Automation
- **Local & Cloud AI Support**: Run 100% private local models via **Ollama**, or connect **OpenAI**, **Google Gemini**, or **Anthropic Claude**.
- **Magic Sort & Semantic Deduplication**: Categorize unorganized bookmarks into folders, fix messy/broken page titles, generate one-sentence summaries, and detect semantic duplicates with AI.
- **AI Cost & Token Estimator**: Preview token usage and estimated cost before running batch AI operations.
- **Smart Rule Engine & Habit Suggester**: Automate categorization with regex/keyword/domain rules. BookSmart automatically analyzes your existing folder habits to suggest new rules (*"You always move `github.com` links to `Dev > Open Source` — create a rule?"*).
- **Bulk Favicon & Metadata Enricher**: Queue bookmarks in the background with pause/resume and concurrency controls to automatically repair missing titles, fetch OpenGraph descriptions, and refresh broken favicons.

### 📖 Reading, Archiving & Web Highlighting
- **Distraction-Free Reader Mode**: Extract clean article content with customizable typography, font sizing, reading time estimates, and Light / Sepia / Dark themes.
- **Live Web Highlighter & Sticky Notes**: Highlight text in 4 colors (Yellow, Green, Blue, Purple) and attach sticky notes—both inside Reader Mode and directly on live websites via the companion extension's context menu. Export all highlights as Markdown.
- **Offline HTML Snapshots & Wayback Machine**: Save full offline HTML snapshots of important pages into local `IndexedDB` storage or look up / archive dead links directly on the Internet Archive.
- **Reading Reminders**: Schedule "Read Later" desktop notifications with quick presets (*Tomorrow, This Weekend, Next Week*) or custom date/time alarms.

### 📰 Built-in RSS & Newsletter Reader
- **Serverless Feed Aggregator**: Subscribe to RSS, Atom, and JSON feeds with automatic feed discovery from website URLs.
- **Background Polling & OPML Support**: Automatically checks for new articles in the background, supports OPML import/export, unread filtering, and 1-click saving to bookmarks.

### ⚡ Search, Sharing & Productivity
- **Multi-Mode Search**: Instant search across titles, URLs, tags, folders, and personal notes using **Simple**, **Fuzzy** (typo-tolerant), **Regex**, or **Local Semantic** search modes.
- **Command Palette (`⌘K` / `Ctrl+K`)**: Trigger any action, switch views, filter collections, or run AI tools without lifting your hands from the keyboard.
- **Public Collection Hub (Bento / Linktree Generator)**: Export any collection as a standalone, responsive `index.html` portfolio page (Bento Grid, Minimal List, or Magazine Cards) ready for free hosting on GitHub Pages.
- **QR Code Sharing**: Instantly generate downloadable QR codes to send links to mobile devices.
- **6 Flexible Views & Analytics**: Switch between List, Compact, Grid, Visual Cards, Table, and Folder Tree views, or explore library health and domain trends in the Analytics Dashboard.

### 🔒 Privacy & Data Safety
- **100% Local-First (`IndexedDB`)**: Your bookmarks, notes, snapshots, and rules live strictly in your browser. Zero telemetry or external servers.
- **AES-GCM 256-Bit Key Vault**: Protect your stored API keys with an optional master password (`PBKDF2` + `AES-GCM`).
- **Multi-Format Import & Export**: Import and export HTML (Netscape/Browser), JSON (BookSmart, Raindrop, Pinboard), CSV, and Markdown, complete with automatic local backups and full Undo/Redo history.

---

## 🧩 Browser Companion Extension

BookSmart includes a lightweight Manifest V3 companion extension for **Chromium** (Chrome, Brave, Edge, Opera, Arc) and **Firefox** that bridges the web app with native browser APIs:

- **🔄 1-Click 2-Way Browser Sync**: Bidirectional synchronization between BookSmart and your native browser bookmarks bar/folders.
- **🔍 Omnibox Address Bar Search (`bs <query>`)**: Type `bs` followed by a keyword in your browser's address bar to search BookSmart bookmarks, tags, folders, and notes with instant navigation.
- **🖍️ On-Page Web Highlighter**: Select text on any webpage and right-click to highlight or attach a sticky note. Highlights persist across page reloads and sync directly into BookSmart's *Highlights & Notes* view.
- **🗂️ Research Session Saver**: Save all open tabs in your current window as a dedicated BookSmart Collection and Folder in a single click.
- **🛡️ CORS-Free Link Health, Metadata & RSS Fetching**: Perform accurate HTTP status checks (`200`, `404`, `500`), OpenGraph scraping, and RSS XML fetching without browser CORS restrictions.
- **🔔 Duplicate Detection Badge**: Automatically displays a `✓` badge on the extension icon when visiting a URL already saved in your library.

### 📥 Download & Install Extension

| Browser | Direct ZIP Download | Source Directory |
| :--- | :--- | :--- |
| **Chrome / Brave / Edge / Opera** | [📥 **booksmart-companion-chrome.zip**](https://github.com/GhostKozak/booksmart/releases/latest/download/booksmart-companion-chrome.zip) | [`/extension`](./extension) |
| **Firefox** | [📥 **booksmart-companion-firefox.zip**](https://github.com/GhostKozak/booksmart/releases/latest/download/booksmart-companion-firefox.zip) | [Built from `/extension`](./extension) |

1. **Chromium**: Download and extract `booksmart-companion-chrome.zip` → Open `chrome://extensions` → Enable **Developer mode** → Click **Load unpacked** and select the extracted folder.
2. **Firefox**: Download and extract `booksmart-companion-firefox.zip` → Open `about:debugging#/runtime/this-firefox` → Click **Load Temporary Add-on...** and select `manifest.json` inside the folder.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS v4
- **Storage & State**: Dexie.js (IndexedDB), Zustand
- **Performance**: Web Workers (background filtering, sorting, and link checking), React Virtuoso (virtualized rendering for 10k+ items)
- **Search & UI**: Fuse.js, `@dnd-kit` (drag & drop), Recharts, Lucide Icons, Sonner
- **Localization**: `i18next` (English, Turkish, German, French, Spanish)
- **Testing & Quality**: Vitest, React Testing Library, ESLint 9

---

## 🚀 Development & Build

**Prerequisites:** Node.js `>= 20.19` and `pnpm` (or `npm`).

```bash
# 1. Clone the repository
git clone https://github.com/GhostKozak/booksmart.git
cd booksmart

# 2. Install dependencies
pnpm install

# 3. Start development server (includes local RSS CORS dev proxy)
pnpm dev

# 4. Run test suite (61 test suites / 600+ unit & integration tests)
pnpm test -- --run

# 5. Run linter
pnpm lint

# 6. Build production PWA & package browser extensions (.zip)
pnpm build
```

---

## 📂 Project Structure

```text
booksmart/
├── extension/            # Chromium Manifest V3 Companion Extension
├── extension-firefox/    # Firefox Companion Extension build
├── public/downloads/     # Packaged extension .zip archives served by the app
├── scripts/              # Build & packaging scripts (build-extension.js)
└── src/
    ├── components/       # UI components, views, layout, and modals
    ├── db/               # Dexie IndexedDB schema, migrations, and seeders
    ├── hooks/            # Custom React hooks (sync, worker, AI, undo/redo, enricher)
    ├── lib/              # Core services (parsers, exporter, highlighter, RSS, vault, rules)
    ├── locales/          # i18n translations (en, tr, de, fr, es)
    ├── services/ai/      # Multi-provider AI clients (Ollama, OpenAI, Gemini, Anthropic)
    ├── store/            # Zustand global UI & filter state
    └── workers/          # Background Web Worker for heavy dataset processing
```

---

## 🤝 Contributing & License

Contributions are welcome! Please review [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a Pull Request.

Licensed under the **GNU General Public License v3.0 or later** — see [LICENSE](LICENSE) for details.
