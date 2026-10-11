# BookSmart Companion Extension 🚀

BookSmart Companion is a lightweight, serverless browser extension (Manifest V3) designed to perform **100% CORS-free and serverless bookmark link health checks**.

---

## 💡 Why is this needed?

Standard web applications running directly in the browser are restricted by the browser's **CORS (Cross-Origin Resource Sharing)** policy. When a web app attempts to `fetch()` external links:
- Responses are opaque (`mode: 'no-cors'`).
- The browser hides status codes: a 404 Not Found or 500 Server Error cannot be distinguished from a healthy 200 OK.
- This leads to unreliable "Alive" and "Dead" reports.

The **BookSmart Companion extension** runs in the background of your browser with `host_permissions: ["<all_urls>"]`:
- **No CORS Restrictions:** Performs real HTTP `HEAD` and `GET` requests directly.
- **Accurate HTTP Status Codes:** Truly detects 200, 301, 404, 410, 500, timeouts, and network failures.
- **100% Serverless & Private:** No data ever leaves your computer. No external proxy servers or backend needed.

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
3. Select the `manifest.json` file inside the `extension/` directory.

---

## 🔄 How it works with BookSmart
1. When you open BookSmart, the content script communicates with the background service worker.
2. When you click **Health Check** (Sağlık Kontrolü):
   - BookSmart detects the extension.
   - The link check requests are routed through the background script.
   - Results stream back with authentic status codes and alive/dead classifications in real time.
