import { db as defaultDb } from '../db';
import { fetchMetadataForUrl } from './metadata-fetcher';

/**
 * Checks whether a bookmark title is missing, generic, or just the URL.
 * @param {string|null} title
 * @param {string} url
 * @returns {boolean}
 */
export function isMissingTitle(title, url) {
    if (!title || typeof title !== 'string') return true;
    const trimmed = title.trim();
    if (!trimmed) return true;

    const lower = trimmed.toLowerCase();
    if (lower === 'untitled' || lower === 'untitled bookmark' || lower === 'no title') {
        return true;
    }

    if (lower.startsWith('http://') || lower.startsWith('https://')) {
        return true;
    }

    if (url) {
        const normTitle = trimmed.replace(/\/+$/, '').toLowerCase();
        const normUrl = url.trim().replace(/\/+$/, '').toLowerCase();
        if (normTitle === normUrl) return true;
    }

    return false;
}

/**
 * Checks whether a bookmark description/note is missing.
 * @param {string|null} note
 * @param {string|null} [description]
 * @returns {boolean}
 */
export function isMissingDescription(note, description) {
    const hasNote = Boolean(note && typeof note === 'string' && note.trim().length > 0);
    const hasDesc = Boolean(description && typeof description === 'string' && description.trim().length > 0);
    return !hasNote && !hasDesc;
}

/**
 * Checks whether a bookmark favicon/icon is missing.
 * @param {string|null} icon
 * @param {string|null} [favicon]
 * @returns {boolean}
 */
export function isMissingIcon(icon, favicon) {
    const hasIcon = Boolean(icon && typeof icon === 'string' && icon.trim().length > 0);
    const hasFav = Boolean(favicon && typeof favicon === 'string' && favicon.trim().length > 0);
    return !hasIcon && !hasFav;
}

/**
 * Analyzes bookmarks to count candidates for title, description, and icon enrichment.
 *
 * @param {Array<Object>} bookmarks
 * @returns {{
 *   totalBookmarks: number,
 *   missingTitleCount: number,
 *   missingDescriptionCount: number,
 *   missingIconCount: number,
 *   needingEnrichmentCount: number,
 *   fullyEnrichedCount: number,
 *   candidates: Array<{ bookmark: Object, reasons: string[] }>
 * }}
 */
export function analyzeEnrichmentCandidates(bookmarks) {
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
        return {
            totalBookmarks: 0,
            missingTitleCount: 0,
            missingDescriptionCount: 0,
            missingIconCount: 0,
            needingEnrichmentCount: 0,
            fullyEnrichedCount: 0,
            candidates: []
        };
    }

    let missingTitleCount = 0;
    let missingDescriptionCount = 0;
    let missingIconCount = 0;
    const candidates = [];

    for (const bm of bookmarks) {
        const reasons = [];

        if (isMissingTitle(bm.title, bm.url)) {
            missingTitleCount++;
            reasons.push('title');
        }

        if (isMissingDescription(bm.note, bm.description)) {
            missingDescriptionCount++;
            reasons.push('description');
        }

        if (isMissingIcon(bm.icon, bm.favicon)) {
            missingIconCount++;
            reasons.push('icon');
        }

        if (reasons.length > 0) {
            candidates.push({ bookmark: bm, reasons });
        }
    }

    return {
        totalBookmarks: bookmarks.length,
        missingTitleCount,
        missingDescriptionCount,
        missingIconCount,
        needingEnrichmentCount: candidates.length,
        fullyEnrichedCount: bookmarks.length - candidates.length,
        candidates
    };
}

/**
 * Enriches a single bookmark with fetched metadata and optionally updates db.bookmarks.
 *
 * @param {Object} bookmark
 * @param {Object} [options]
 * @param {Object} [options.db]
 * @param {boolean} [options.updateBookmarkTitle=true]
 * @param {boolean} [options.updateBookmarkNotes=false]
 * @param {boolean} [options.updateBookmarkIcon=true]
 * @param {boolean} [options.forceRefresh=false]
 * @returns {Promise<{ success: boolean, updatedFields: string[], metadata: Object|null }>}
 */
export async function enrichSingleBookmark(bookmark, {
    db = defaultDb,
    updateBookmarkTitle = true,
    updateBookmarkNotes = false,
    updateBookmarkIcon = true,
    forceRefresh = false
} = {}) {
    if (!bookmark || !bookmark.url) {
        return { success: false, updatedFields: [], metadata: null };
    }

    try {
        const metadata = await fetchMetadataForUrl(bookmark.url, { forceRefresh });
        if (!metadata) {
            return { success: false, updatedFields: [], metadata: null };
        }

        const updates = {};
        const updatedFields = [];

        if (updateBookmarkTitle && isMissingTitle(bookmark.title, bookmark.url) && metadata.title) {
            updates.title = metadata.title;
            updatedFields.push('title');
        }

        if (updateBookmarkNotes && isMissingDescription(bookmark.note, bookmark.description) && metadata.description) {
            updates.note = metadata.description;
            updatedFields.push('note');
        }

        if (updateBookmarkIcon && isMissingIcon(bookmark.icon, bookmark.favicon) && metadata.favicon) {
            updates.icon = metadata.favicon;
            updatedFields.push('icon');
        }

        if (Object.keys(updates).length > 0 && db?.bookmarks && bookmark.id) {
            await db.bookmarks.update(bookmark.id, updates);
        }

        return {
            success: true,
            updatedFields,
            metadata
        };
    } catch (error) {
        return {
            success: false,
            updatedFields: [],
            metadata: null,
            error: error?.message || 'Unknown error'
        };
    }
}

/**
 * Async queue manager for bulk metadata enrichment with pause/resume/cancel controls.
 */
export class MetadataEnrichmentQueue {
    constructor(bookmarks, options = {}) {
        this.bookmarks = bookmarks || [];
        this.options = {
            db: options.db || defaultDb,
            concurrency: Math.max(1, Math.min(options.concurrency || 3, 6)),
            updateBookmarkTitle: options.updateBookmarkTitle ?? true,
            updateBookmarkNotes: options.updateBookmarkNotes ?? false,
            updateBookmarkIcon: options.updateBookmarkIcon ?? true,
            forceRefresh: options.forceRefresh ?? false,
            onProgress: options.onProgress || null,
            ...options
        };

        this.queue = [...this.bookmarks];
        this.total = this.queue.length;
        this.processed = 0;
        this.successCount = 0;
        this.updatedCount = 0;
        this.errorCount = 0;

        this.isRunning = false;
        this.isPaused = false;
        this.isCancelled = false;
        this.resumeResolver = null;
    }

    async waitIfPaused() {
        if (!this.isPaused || this.isCancelled) return;
        await new Promise(resolve => {
            this.resumeResolver = resolve;
        });
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
        }
    }

    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            if (this.resumeResolver) {
                this.resumeResolver();
                this.resumeResolver = null;
            }
        }
    }

    cancel() {
        this.isCancelled = true;
        this.isRunning = false;
        if (this.resumeResolver) {
            this.resumeResolver();
            this.resumeResolver = null;
        }
    }

    async start() {
        if (this.total === 0) {
            return this.getSummary();
        }

        this.isRunning = true;
        this.isCancelled = false;
        this.isPaused = false;

        const workerCount = Math.min(this.options.concurrency, this.total);
        const workers = Array.from({ length: workerCount }, () => this.runWorker());

        await Promise.all(workers);
        this.isRunning = false;

        return this.getSummary();
    }

    async runWorker() {
        while (this.queue.length > 0) {
            if (this.isCancelled) break;
            await this.waitIfPaused();
            if (this.isCancelled) break;

            const item = this.queue.shift();
            if (!item) break;

            try {
                const res = await enrichSingleBookmark(item, this.options);
                if (res.success) {
                    this.successCount++;
                    if (res.updatedFields.length > 0) {
                        this.updatedCount++;
                    }
                } else {
                    this.errorCount++;
                }

                this.processed++;
                this.options.onProgress?.({
                    processed: this.processed,
                    total: this.total,
                    percentage: Math.round((this.processed / this.total) * 100),
                    successCount: this.successCount,
                    updatedCount: this.updatedCount,
                    errorCount: this.errorCount,
                    currentBookmark: item,
                    latestResult: res
                });
            } catch {
                this.errorCount++;
                this.processed++;
            }
        }
    }

    getSummary() {
        return {
            total: this.total,
            processed: this.processed,
            successCount: this.successCount,
            updatedCount: this.updatedCount,
            errorCount: this.errorCount,
            isCancelled: this.isCancelled
        };
    }
}
