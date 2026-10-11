# BookSmart Companion Extension 🚀

BookSmart Companion is a lightweight, serverless browser extension (Manifest V3) that provides **two-way bookmark synchronization via the `chrome.bookmarks` API** and **100% CORS-free link health checking**.

---

## ✨ Features

1. **🔄 Two-Way Browser Synchronization (`chrome.bookmarks` API):**
   - **Pull / Import:** Fetch your full browser bookmark hierarchy into BookSmart with 1-click (no need to manually export and import HTML files).
   - **Push / Export:** Sync BookSmart's organized bookmarks and folder structure directly into your browser under a dedicated `BookSmart` folder.
   - **Intelligent Two-Way Sync:** Automatically detects missing bookmarks on both ends, imports new ones into BookSmart, and pushes new ones to your browser.
2. **⭐️ Toolbar Quick Capture:**
   - Click the extension icon in the toolbar and hit **"Save Current Tab"** to immediately bookmark the active page.
3. **🛡️ 100% Serverless, CORS-Free Health Checks:**
   - Detects real HTTP status codes (200, 301, 404, 500, timeouts) without CORS restrictions or external servers.
4. **🔒 Privacy-First:**
   - 100% local. No third-party servers, tracking, or cloud databases.

---

## 🛠️ How to Install (Load Unpacked)

### Google Chrome / Brave / Edge / Arc:
1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions` in Edge).
2. Enable **Developer mode** in the top right corner.
3. Click the **Load unpacked** (Paketlenmemiş öğe yükle) button.
4. Select the `extension/` folder located inside the BookSmart project directory.
5. The extension is now active! BookSmart will automatically detect it and show a green connected indicator.

### Mozilla Firefox:
1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** (Geçici Eklenti Yükle).
3. Select the `manifest.firefox.json` file inside the `extension/` directory (or run `pnpm build:extension` and load `dist/extension-firefox/manifest.json`).

---

## 🔄 How it works with BookSmart
1. When you open BookSmart, the content script bridges communication with the background service worker.
2. **Browser Sync:**
   - Click **"Tarayıcı Yer İmlerini İçe Aktar"** or **"Two-Way Sync"** in BookSmart.
   - The extension uses `chrome.bookmarks.getTree()` and `chrome.bookmarks.create()` to synchronize your library seamlessly.
3. **Health Check:**
   - Requests are routed through the background script without CORS restrictions.
   - Real HTTP status codes stream back in real time.
