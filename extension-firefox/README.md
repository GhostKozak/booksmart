# BookSmart Companion Extension 🚀

BookSmart Companion is a lightweight, serverless browser extension (Manifest V3) for Chromium and Firefox that provides **two-way bookmark synchronization**, **Omnibox address-bar search**, **live web page highlighting**, and **CORS-free link health & metadata fetching**.

---

## ✨ Features

1. **🔄 Two-Way Browser Synchronization (`chrome.bookmarks` API):**
   - **Pull / Import:** Fetch your full browser bookmark hierarchy into BookSmart with 1-click.
   - **Push / Export:** Sync BookSmart's organized bookmarks and folder hierarchy directly into your browser.
   - **Intelligent Two-Way Sync:** Automatically imports missing bookmarks, exports new ones, updates modified titles/folders, and syncs web highlights.
2. **🔍 Omnibox Quick Search (`bs <query>`):**
   - Type `bs` followed by a search term in the browser address bar to instantly search your BookSmart bookmarks, tags, folders, and notes.
3. **🖍️ Live Web Highlighter & Sticky Notes:**
   - Select text on any webpage and use the right-click context menu (**BookSmart**) to highlight in Yellow, Green, Blue, or Purple and attach sticky notes. Highlights automatically restore on revisit and sync into BookSmart.
4. **🗂️ Toolbar Quick Capture & Session Saver:**
   - Save the active tab with folder selection, or save all open tabs in the current window as a dedicated Research Session collection.
5. **🛡️ 100% Serverless, CORS-Free Health, Metadata & RSS Checks:**
   - Detects real HTTP status codes (`200`, `301`, `404`, `500`), scrapes OpenGraph metadata/favicons, and fetches RSS/Atom XML feeds without CORS blocks.

---

## 🛠️ How to Install (Load Unpacked)

### Google Chrome / Brave / Edge / Opera / Arc:
1. Open your browser and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` folder (or extracted `booksmart-companion-chrome.zip`).

### Mozilla Firefox:
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** and select `extension-firefox/manifest.json` (or `manifest.json` inside extracted `booksmart-companion-firefox.zip`).
