import { db } from '../db/schema';

export const HIGHLIGHT_COLORS = [
    {
        id: 'yellow',
        name: 'Sarı',
        nameKey: 'reader.highlights.colors.yellow',
        hex: '#fef08a',
        bg: 'rgba(254, 240, 138, 0.45)',
        border: '#eab308'
    },
    {
        id: 'green',
        name: 'Yeşil',
        nameKey: 'reader.highlights.colors.green',
        hex: '#bbf7d0',
        bg: 'rgba(187, 247, 208, 0.45)',
        border: '#22c55e'
    },
    {
        id: 'blue',
        name: 'Mavi',
        nameKey: 'reader.highlights.colors.blue',
        hex: '#bae6fd',
        bg: 'rgba(186, 230, 253, 0.45)',
        border: '#0ea5e9'
    },
    {
        id: 'purple',
        name: 'Mor',
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
