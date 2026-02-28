import { db } from '../db';

/**
 * Creates a backup object containing rules, folders, tags, and ignored URLs.
 * @returns {Promise<Object>} The backup data object.
 */
export async function createBackup() {
    try {
        const rules = await db.rules.toArray();
        const folders = await db.folders.toArray();
        const tags = await db.tags.toArray();
        const ignoredUrls = await db.ignoredUrls.toArray();
        const collections = await db.collections.toArray();

        return {
            version: 1,
            timestamp: new Date().toISOString(),
            data: {
                rules,
                folders,
                tags,
                ignoredUrls,
                collections
            }
        };
    } catch (error) {
        console.error("Failed to create backup:", error);
        throw error;
    }
}

/**
 * Triggers a browser download of the backup data.
 * @param {Object} backupData - The backup data object.
 */
export function downloadBackup(backupData) {
    const filename = `booksmart_config_backup_${new Date().toISOString().split('T')[0]}.json`;
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Restores configuration from a backup object.
 * @param {Object} backupData - The parsed JSON backup object.
 * @returns {Promise<void>}
 */
export async function restoreBackup(backupData) {
    if (!backupData || typeof backupData !== 'object') {
        throw new Error("Invalid backup file format");
    }

    // Validate backup structure
    if (!backupData.data || typeof backupData.data !== 'object') {
        throw new Error("Invalid backup file format: missing data field");
    }

    if (backupData.version !== undefined && typeof backupData.version !== 'number') {
        throw new Error("Invalid backup file format: invalid version");
    }

    const { rules, folders, tags, ignoredUrls, collections } = backupData.data;

    // Validate each data array is actually an array (or undefined)
    const validateArray = (arr, name) => {
        if (arr === undefined || arr === null) return [];
        if (!Array.isArray(arr)) {
            throw new Error(`Invalid backup data: ${name} must be an array`);
        }
        // Limit size to prevent DOS
        if (arr.length > 50000) {
            throw new Error(`Invalid backup data: ${name} exceeds maximum allowed entries (50000)`);
        }
        return arr;
    };

    const safeRules = validateArray(rules, 'rules');
    const safeFolders = validateArray(folders, 'folders');
    const safeTags = validateArray(tags, 'tags');
    const safeIgnoredUrls = validateArray(ignoredUrls, 'ignoredUrls');
    const safeCollections = validateArray(collections, 'collections');

    await db.transaction('rw', db.rules, db.folders, db.tags, db.ignoredUrls, db.collections, async () => {
        await Promise.all([
            db.rules.clear(),
            db.folders.clear(),
            db.tags.clear(),
            db.ignoredUrls.clear(),
            db.collections.clear()
        ]);

        if (safeRules.length) await db.rules.bulkAdd(safeRules);
        if (safeFolders.length) await db.folders.bulkAdd(safeFolders);
        if (safeTags.length) await db.tags.bulkAdd(safeTags);
        if (safeIgnoredUrls.length) await db.ignoredUrls.bulkAdd(safeIgnoredUrls);
        if (safeCollections.length) await db.collections.bulkAdd(safeCollections);
    });
}

/**
 * Saves a simplified snapshot to LocalStorage as a fail-safe.
 * This is "auto-backup" for safety, not full history.
 */
export async function saveAutoBackup() {
    try {
        const backup = await createBackup();
        // Compress or just save? LS is limited to ~5MB. 
        // Config data is usually small enough.
        localStorage.setItem('booksmart_autosave_config', JSON.stringify(backup));
        localStorage.setItem('booksmart_autosave_timestamp', new Date().toISOString());
    } catch (e) {
        console.warn("Auto-backup failed (likely quota exceeded):", e);
    }
}

export function getAutoBackup() {
    try {
        const raw = localStorage.getItem('booksmart_autosave_config');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getLastAutoBackupTime() {
    return localStorage.getItem('booksmart_autosave_timestamp');
}
