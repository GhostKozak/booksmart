import { db } from './schema';
import { generateUUID, pickTagColor } from '../lib/utils';

let seedPromise = null;

// Helper to seed defaults if empty (and not migrated)
export async function seedDefaults() {
    if (seedPromise) return seedPromise;
    seedPromise = (async () => {
        await deduplicateTaxonomy();

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
                color: pickTagColor(name),
                order: index
            }));
            await db.tags.bulkAdd(defaultTags);
        }

        await deduplicateTaxonomy();
    })();

    try {
        await seedPromise;
    } finally {
        seedPromise = null;
    }
}

// Deduplication Helper (One-off fix)
export async function deduplicateTaxonomy() {
    await db.transaction('rw', db.folders, db.tags, async () => {
        // Deduplicate Folders
        const folders = await db.folders.toArray();
        const seenFolders = new Set();
        const duplicateFolderIds = [];
        const foldersToUpdate = [];

        folders.forEach(f => {
            const key = (f.name || '').toLowerCase().trim();
            if (!key) {
                if (f.id) duplicateFolderIds.push(f.id);
                return;
            }
            if (seenFolders.has(key)) {
                if (f.id) duplicateFolderIds.push(f.id);
            } else {
                seenFolders.add(key);
                if (!f.id) {
                    foldersToUpdate.push({ ...f, id: generateUUID() });
                }
            }
        });

        if (duplicateFolderIds.length > 0) {
            await db.folders.bulkDelete(duplicateFolderIds);
        }
        if (foldersToUpdate.length > 0) {
            await db.folders.bulkPut(foldersToUpdate);
        }

        // Deduplicate Tags
        const tags = await db.tags.toArray();
        const seenTags = new Set();
        const duplicateTagIds = [];
        const tagsToUpdate = [];

        tags.forEach(t => {
            const key = (t.name || '').toLowerCase().trim();
            if (!key) {
                if (t.id) duplicateTagIds.push(t.id);
                return;
            }
            if (seenTags.has(key)) {
                if (t.id) duplicateTagIds.push(t.id);
            } else {
                seenTags.add(key);
                if (!t.id) {
                    tagsToUpdate.push({ ...t, id: generateUUID() });
                }
            }
        });

        if (duplicateTagIds.length > 0) {
            await db.tags.bulkDelete(duplicateTagIds);
        }
        if (tagsToUpdate.length > 0) {
            await db.tags.bulkPut(tagsToUpdate);
        }
    });
}
