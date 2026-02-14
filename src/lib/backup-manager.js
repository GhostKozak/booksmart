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

        return {
            version: 1,
            timestamp: new Date().toISOString(),
            data: {
                rules,
                folders,
                tags,
                ignoredUrls
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
    if (!backupData || !backupData.data) {
        throw new Error("Invalid backup file format");
    }

    const { rules, folders, tags, ignoredUrls } = backupData.data;

    await db.transaction('rw', db.rules, db.folders, db.tags, db.ignoredUrls, async () => {
        // We can decide to wipe and replace, or merge. 
        // "Restore" usually implies getting back to a state, so wipe and text is often safer for consistent state,
        // but might lose new things. 
        // Let's go with: Clear existing config tables and re-populate.
        // This is safer to avoid ID conflicts or duplicate logic.

        await Promise.all([
            db.rules.clear(),
            db.folders.clear(),
            db.tags.clear(),
            db.ignoredUrls.clear()
        ]);

        if (rules?.length) await db.rules.bulkAdd(rules);
        if (folders?.length) await db.folders.bulkAdd(folders);
        if (tags?.length) await db.tags.bulkAdd(tags);
        if (ignoredUrls?.length) await db.ignoredUrls.bulkAdd(ignoredUrls);
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
    } catch (error) {
        return null;
    }
}

export function getLastAutoBackupTime() {
    return localStorage.getItem('booksmart_autosave_timestamp');
}
