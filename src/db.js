import Dexie from 'dexie';
import { generateUUID } from './lib/utils';

export const db = new Dexie('BookSmartDB');

db.version(1).stores({
    bookmarks: '++id, url, title, originalFolder, newFolder, *tags, addDate', // Indexes
    folders: 'id, name, order',
    tags: 'id, name, order',
    rules: 'id, type, value, targetFolder, *tags',
    ignoredUrls: 'url' // Primary key is url
});

// Migration logic
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

// Helper to seed defaults if empty (and not migrated)
export async function seedDefaults() {
    const folderCount = await db.folders.count();
    const tagCount = await db.tags.count();

    if (folderCount === 0) {
        const defaultFolders = ['Work', 'Personal', 'Reading List', 'Dev', 'News'].map((name, index) => ({
            id: generateUUID(),
            name,
            color: '#3b82f6',
            order: index
        }));
        await db.folders.bulkAdd(defaultFolders);
    }

    if (tagCount === 0) {
        const defaultTags = ['important', 'read-later', 'tutorial', 'tool', 'inspiration'].map((name, index) => ({
            id: generateUUID(),
            name,
            color: '#10b981',
            order: index
        }));
        await db.tags.bulkAdd(defaultTags);
    }
}

// Deduplication Helper (One-off fix)
export async function deduplicateTaxonomy() {
    await db.transaction('rw', db.folders, db.tags, async () => {
        // Deduplicate Folders
        const folders = await db.folders.toArray();
        const seenFolders = new Set();
        const duplicateFolderIds = [];

        folders.forEach(f => {
            const key = f.name.toLowerCase().trim();
            if (seenFolders.has(key)) {
                duplicateFolderIds.push(f.id);
            } else {
                seenFolders.add(key);
            }
        });

        if (duplicateFolderIds.length > 0) {
            console.log(`Removing ${duplicateFolderIds.length} duplicate folders`);
            await db.folders.bulkDelete(duplicateFolderIds);
        }

        // Deduplicate Tags
        const tags = await db.tags.toArray();
        const seenTags = new Set();
        const duplicateTagIds = [];

        tags.forEach(t => {
            const key = t.name.toLowerCase().trim();
            if (seenTags.has(key)) {
                duplicateTagIds.push(t.id);
            } else {
                seenTags.add(key);
            }
        });

        if (duplicateTagIds.length > 0) {
            console.log(`Removing ${duplicateTagIds.length} duplicate tags`);
            await db.tags.bulkDelete(duplicateTagIds);
        }
    });
}
