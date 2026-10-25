import { db } from '../db/schema';
import { getAllExtensionHighlights } from './extension-client';
import { cleanUrl } from './url-cleaner';

export const HIGHLIGHT_COLORS = [
    {
        id: 'yellow',
        name: 'Yellow',
        nameKey: 'reader.highlights.colors.yellow',
        hex: '#fef08a',
        bg: 'rgba(254, 240, 138, 0.45)',
        border: '#eab308'
    },
    {
        id: 'green',
        name: 'Green',
        nameKey: 'reader.highlights.colors.green',
        hex: '#bbf7d0',
        bg: 'rgba(187, 247, 208, 0.45)',
        border: '#22c55e'
    },
    {
        id: 'blue',
        name: 'Blue',
        nameKey: 'reader.highlights.colors.blue',
        hex: '#bae6fd',
        bg: 'rgba(186, 230, 253, 0.45)',
        border: '#0ea5e9'
    },
    {
        id: 'purple',
        name: 'Purple',
        nameKey: 'reader.highlights.colors.purple',
        hex: '#e9d5ff',
        bg: 'rgba(233, 213, 255, 0.45)',
        border: '#a855f7'
    }
];

export async function getHighlightsForBookmark(bookmarkId, url) {
    if (!db.highlights) return [];
    try {
        let list = [];
        if (bookmarkId) {
            list = await db.highlights.where('bookmarkId').equals(bookmarkId).toArray();
        } else if (url) {
            list = await db.highlights.where('url').equals(url).toArray();
        }
        return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } catch (err) {
        console.error('Failed to get highlights:', err);
        return [];
    }
}

export async function addHighlight({ bookmarkId, url, text, color = 'yellow', note = '' }) {
    if (!text || !text.trim()) return null;
    const cleanText = text.trim();
    const newHighlight = {
        bookmarkId: bookmarkId || null,
        url: url || '',
        text: cleanText,
        color,
        note: note ? note.trim() : '',
        createdAt: Date.now()
    };

    try {
        const id = await db.highlights.add(newHighlight);
        newHighlight.id = id;

        if (bookmarkId && db.bookmarks) {
            const count = await db.highlights.where('bookmarkId').equals(bookmarkId).count();
            await db.bookmarks.update(bookmarkId, { highlightsCount: count });
        }

        return newHighlight;
    } catch (err) {
        console.error('Failed to add highlight:', err);
        return null;
    }
}

export async function updateHighlight(id, { note, color }) {
    if (!id || !db.highlights) return false;
    const updates = {};
    if (note !== undefined) updates.note = note.trim();
    if (color !== undefined) updates.color = color;
    updates.updatedAt = Date.now();

    try {
        await db.highlights.update(id, updates);
        return true;
    } catch (err) {
        console.error('Failed to update highlight:', err);
        return false;
    }
}

export async function deleteHighlight(id, bookmarkId) {
    if (!id || !db.highlights) return false;
    try {
        await db.highlights.delete(id);
        if (bookmarkId && db.bookmarks) {
            const count = await db.highlights.where('bookmarkId').equals(bookmarkId).count();
            await db.bookmarks.update(bookmarkId, { highlightsCount: count });
        }
        return true;
    } catch (err) {
        console.error('Failed to delete highlight:', err);
        return false;
    }
}

/**
 * Formats highlights as Markdown blockquotes with optional notes.
 */
export function exportHighlightsToMarkdown(bookmark, highlights = []) {
    if (!highlights || highlights.length === 0) return '';
    const title = bookmark?.title || bookmark?.url || 'Makale';
    const url = bookmark?.url || '';

    let md = `## 📖 Vurgular ve Notlar: [${title}](${url})\n\n`;

    highlights.forEach((h, idx) => {
        const colorName = HIGHLIGHT_COLORS.find(c => c.id === h.color)?.name || h.color;
        md += `> ${h.text}\n`;
        md += `> — *[${colorName}]*\n`;
        if (h.note) {
            md += `\n**Not:** ${h.note}\n`;
        }
        if (idx < highlights.length - 1) {
            md += `\n---\n\n`;
        }
    });

    return md;
}

/**
 * Injects <mark> tags into HTML for the given list of highlights safely,
 * without corrupting HTML tags or attribute values.
 */
export function applyHighlightsToHtml(html, highlights = []) {
    if (!html || typeof html !== 'string' || !highlights || highlights.length === 0) {
        return html;
    }

    let modifiedHtml = html;

    highlights.forEach((h) => {
        if (!h.text || h.text.length < 2) return;
        const colorObj = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
        const rawText = h.text;

        // Escape regex special characters
        const escaped = rawText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match occurrences that are NOT inside HTML tags (<...>)
        const regex = new RegExp(`(?![^<]*>)(${escaped})`, 'gi');

        modifiedHtml = modifiedHtml.replace(regex, (match) => {
            return `<mark data-highlight-id="${h.id}" class="booksmart-highlight booksmart-highlight-${h.color}" style="background-color: ${colorObj.bg}; border-bottom: 2px solid ${colorObj.border}; padding: 1px 3px; border-radius: 3px; cursor: pointer;" title="${h.note ? `Not: ${h.note}` : 'Vurgulanan metin'}">${match}</mark>`;
        });
    });

    return modifiedHtml;
}

/**
 * Returns all saved highlights from Dexie db.highlights.
 */
export async function getAllHighlights() {
    if (!db.highlights) return [];
    try {
        const list = await db.highlights.toArray();
        return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (err) {
        console.error('Failed to get all highlights:', err);
        return [];
    }
}

/**
 * Synchronizes highlights captured in the companion extension into Dexie db.highlights.
 * Maps bookmarkId when matching URL is found in the user's library.
 *
 * @returns {Promise<{ imported: number, total: number }>}
 */
export async function syncExtensionHighlightsToDb() {
    if (!db.highlights) return { imported: 0, total: 0 };
    try {
        const extensionHighlights = await getAllExtensionHighlights();
        if (!Array.isArray(extensionHighlights) || extensionHighlights.length === 0) {
            return { imported: 0, total: 0 };
        }

        const existingDbHighlights = await db.highlights.toArray();
        const existingKeySet = new Set(
            existingDbHighlights.map(h => `${(h.url || '').trim()}|${(h.text || '').trim()}`)
        );

        // Fetch user bookmarks to map matching bookmarkId and titles
        let bookmarks = [];
        if (db.bookmarks) {
            bookmarks = await db.bookmarks.toArray();
        }
        const bookmarkUrlMap = new Map();
        bookmarks.forEach(bm => {
            if (bm.url) {
                const norm = cleanUrl(bm.url).cleaned || bm.url;
                bookmarkUrlMap.set(norm, bm);
            }
        });

        let imported = 0;
        const toAdd = [];

        for (const extHl of extensionHighlights) {
            if (!extHl.text || !extHl.text.trim()) continue;
            const normUrl = cleanUrl(extHl.url || '').cleaned || extHl.url || '';
            const key = `${(extHl.url || '').trim()}|${extHl.text.trim()}`;

            if (!existingKeySet.has(key)) {
                const matchedBm = bookmarkUrlMap.get(normUrl);
                toAdd.push({
                    bookmarkId: matchedBm?.id || null,
                    pageTitle: matchedBm?.title || extHl.pageTitle || '',
                    url: extHl.url || '',
                    text: extHl.text.trim(),
                    color: extHl.color || 'yellow',
                    note: (extHl.note || '').trim(),
                    createdAt: extHl.createdAt || Date.now()
                });
                existingKeySet.add(key);
                imported++;
            }
        }

        if (toAdd.length > 0) {
            await db.highlights.bulkAdd(toAdd);

            // Update highlightsCount on affected bookmarks
            if (db.bookmarks) {
                const affectedBookmarkIds = new Set(toAdd.map(h => h.bookmarkId).filter(Boolean));
                for (const bmId of affectedBookmarkIds) {
                    const count = await db.highlights.where('bookmarkId').equals(bmId).count();
                    await db.bookmarks.update(bmId, { highlightsCount: count });
                }
            }
        }

        return { imported, total: extensionHighlights.length };
    } catch (err) {
        console.error('Failed to sync extension highlights:', err);
        return { imported: 0, total: 0 };
    }
}

/**
 * Formats a list of highlights into an Obsidian-compatible Markdown document with callouts.
 *
 * @param {Array<Object>} highlights
 * @param {Object} [options]
 * @returns {string}
 */
export function exportHighlightsToObsidianMarkdown(highlights = [], {
    title = 'BookSmart Vurgular ve Notlar',
    includeCallouts = true,
    tags = ['booksmart', 'highlights']
} = {}) {
    if (!highlights || highlights.length === 0) return '';

    const dateStr = new Date().toISOString().split('T')[0];
    let md = `---\n`;
    md += `title: "${title}"\n`;
    md += `date: ${dateStr}\n`;
    if (tags && tags.length > 0) {
        md += `tags:\n${tags.map(t => `  - ${t}`).join('\n')}\n`;
    }
    md += `---\n\n`;

    md += `# 📖 ${title}\n\n`;
    md += `*BookSmart kütüphanesinden dışa aktarıldı · ${dateStr}*\n\n---\n\n`;

    // Group highlights by URL
    const grouped = new Map();
    highlights.forEach(h => {
        const groupKey = h.url || 'Bilinmeyen Kaynak';
        if (!grouped.has(groupKey)) {
            grouped.set(groupKey, []);
        }
        grouped.get(groupKey).push(h);
    });

    for (const [url, items] of grouped.entries()) {
        const pageTitle = items[0]?.pageTitle || items[0]?.bookmarkTitle || url;
        md += `## [${pageTitle}](${url})\n\n`;

        items.forEach((item) => {
            const colorName = HIGHLIGHT_COLORS.find(c => c.id === item.color)?.name || item.color;
            const itemDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';

            if (includeCallouts) {
                md += `> [!quote] ${item.text}\n`;
                md += `> — *${colorName} vurgu*${itemDate ? ` · ${itemDate}` : ''}\n`;
                if (item.note) {
                    md += `\n> [!note] 📝 Yapışkan Not\n`;
                    md += `> ${item.note.replace(/\n/g, '\n> ')}\n`;
                }
            } else {
                md += `> ${item.text}\n`;
                md += `> — *[${colorName}]*${itemDate ? ` (${itemDate})` : ''}\n`;
                if (item.note) {
                    md += `\n**Not:** ${item.note}\n`;
                }
            }
            md += `\n`;
        });

        md += `---\n\n`;
    }

    return md;
}

/**
 * Initiates a browser download for Markdown content.
 */
export function downloadMarkdownFile(content, filename = 'booksmart-highlights.md') {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
