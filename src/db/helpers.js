import { db } from './schema';
import { generateUUID } from '../lib/utils';

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
