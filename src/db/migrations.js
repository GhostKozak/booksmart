import { db } from './schema';
import { generateUUID } from '../lib/utils';

let isMigrating = false;

export async function migrateFromLocalStorage() {
    if (isMigrating) return;
    const isMigrated = localStorage.getItem('booksmart_db_migrated');
    if (isMigrated === 'true') return;

    isMigrating = true;
    try {
        const rules = JSON.parse(localStorage.getItem('booksmart_rules') || '[]');
        const foldersRaw = JSON.parse(localStorage.getItem('booksmart_folders') || '[]');
        const tagsRaw = JSON.parse(localStorage.getItem('booksmart_tags') || '[]');
        const ignoredUrlsRaw = JSON.parse(localStorage.getItem('ignoredUrls') || '[]');

        // Parse Folders (Handle legacy string[] vs object[])
        const folders = foldersRaw.map((f, index) => {
            if (typeof f === 'string') {
                return { id: generateUUID(), name: f, color: '#3b82f6', order: index };
            }
            return f;
        });

        // Parse Tags (Handle legacy string[] vs object[])
        const tags = tagsRaw.map((t, index) => {
            if (typeof t === 'string') {
                return { id: generateUUID(), name: t, color: '#10b981', order: index };
            }
            return t;
        });

        const ignoredUrls = Array.isArray(ignoredUrlsRaw) ? ignoredUrlsRaw.map(url => ({ url })) : [];

        // Transaction to bulk add
        await db.transaction('rw', db.rules, db.folders, db.tags, db.ignoredUrls, async () => {
            // Check if already populated to prevent race condition double-entry
            const existingRulesCount = await db.rules.count();
            if (rules.length > 0 && existingRulesCount === 0) await db.rules.bulkPut(rules);

            const existingFoldersCount = await db.folders.count();
            if (folders.length > 0 && existingFoldersCount === 0) await db.folders.bulkPut(folders);

            const existingTagsCount = await db.tags.count();
            if (tags.length > 0 && existingTagsCount === 0) await db.tags.bulkPut(tags);

            const existingIgnoredCount = await db.ignoredUrls.count();
            if (ignoredUrls.length > 0 && existingIgnoredCount === 0) await db.ignoredUrls.bulkPut(ignoredUrls);
        });

        console.log("Migration to IndexedDB successful!");
        localStorage.setItem('booksmart_db_migrated', 'true');
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        isMigrating = false;
    }
}
