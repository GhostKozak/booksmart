import { db } from '../db/schema';

/**
 * Returns Wayback Machine view URL for a given target link.
 */
export function getWaybackMachineUrl(url) {
    if (!url) return '';
    return `https://web.archive.org/web/*/${url}`;
}

/**
 * Returns Wayback Machine instant-save URL.
 */
export function getWaybackSaveUrl(url) {
    if (!url) return '';
    return `https://web.archive.org/save/${url}`;
}

/**
 * Checks Wayback Machine availability for a URL using their public JSON API.
 */
export async function checkWaybackAvailability(url) {
    if (!url) return null;
    try {
        const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl, { mode: 'cors' });
        if (!res.ok) return null;
        const data = await res.json();
        const closest = data?.archived_snapshots?.closest;
        if (closest && closest.available) {
            return {
                available: true,
                url: closest.url,
                timestamp: closest.timestamp
            };
        }
        return { available: false };
    } catch {
        // Network or CORS failure
        return null;
    }
}

/**
 * Saves a cleaned, full offline snapshot of an article into IndexedDB.
 */
export async function saveSnapshot({ bookmarkId, url, title, html, textContent }) {
    if (!url) return null;
    const content = html || '';
    const byteSize = new Blob([content]).size;
    const now = Date.now();

    const snapshot = {
        url,
        bookmarkId: bookmarkId || null,
        title: title || url,
        html: content,
        textContent: textContent || '',
        byteSize,
        savedAt: now
    };

    try {
        if (db.snapshots) {
            await db.snapshots.put(snapshot);
        }

        if (bookmarkId && db.bookmarks) {
            await db.bookmarks.update(bookmarkId, {
                hasSnapshot: true,
                snapshotSavedAt: now,
                snapshotByteSize: byteSize
            });
        }

        return snapshot;
    } catch (err) {
        console.error('Failed to save snapshot:', err);
        return null;
    }
}

/**
 * Retrieves an offline snapshot from IndexedDB.
 */
export async function getSnapshot(url, bookmarkId) {
    if (!db.snapshots) return null;
    try {
        if (url) {
            const found = await db.snapshots.get(url);
            if (found) return found;
        }
        if (bookmarkId) {
            const found = await db.snapshots.where('bookmarkId').equals(bookmarkId).first();
            if (found) return found;
        }
        return null;
    } catch (err) {
        console.error('Failed to get snapshot:', err);
        return null;
    }
}

/**
 * Removes an offline snapshot from IndexedDB.
 */
export async function deleteSnapshot(url, bookmarkId) {
    if (!db.snapshots) return false;
    try {
        if (url) {
            await db.snapshots.delete(url);
        }
        if (bookmarkId && db.bookmarks) {
            await db.bookmarks.update(bookmarkId, {
                hasSnapshot: false,
                snapshotSavedAt: null,
                snapshotByteSize: null
            });
        }
        return true;
    } catch (err) {
        console.error('Failed to delete snapshot:', err);
        return false;
    }
}

/**
 * Formats bytes into human readable KB / MB.
 */
export function formatByteSize(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Downloads snapshot as a self-contained offline HTML file.
 */
export function downloadSnapshotFile(snapshot) {
    if (!snapshot || !snapshot.html) return;
    const safeTitle = (snapshot.title || 'snapshot').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${snapshot.title || 'Offline Snapshot'} (BookSmart Archive)</title>
  <meta name="generator" content="BookSmart Offline Snapshot">
  <meta name="original-url" content="${snapshot.url}">
  <style>
    body {
      max-width: 760px;
      margin: 40px auto;
      padding: 0 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
      color: #1f2937;
      background: #fafafa;
    }
    .archive-banner {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 32px;
      font-size: 13px;
      color: #4b5563;
    }
    .archive-banner a { color: #2563eb; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="archive-banner">
    📦 <strong>BookSmart Offline Archive Copy</strong><br>
    Original Link: <a href="${snapshot.url}" target="_blank" rel="noopener noreferrer">${snapshot.url}</a><br>
    Archived Date: ${new Date(snapshot.savedAt).toLocaleString()}
  </div>
  <h1>${snapshot.title || 'Untitled'}</h1>
  ${snapshot.html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}-archive.html`;
    a.click();
    URL.revokeObjectURL(url);
}
