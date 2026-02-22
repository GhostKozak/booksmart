import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBackup, restoreBackup, getAutoBackup } from '../backup-manager';
import { db } from '../../db';

// Mock DB
vi.mock('../../db', () => ({
    db: {
        rules: { toArray: vi.fn(), clear: vi.fn(), bulkAdd: vi.fn() },
        folders: { toArray: vi.fn(), clear: vi.fn(), bulkAdd: vi.fn() },
        tags: { toArray: vi.fn(), clear: vi.fn(), bulkAdd: vi.fn() },
        ignoredUrls: { toArray: vi.fn(), clear: vi.fn(), bulkAdd: vi.fn() },
        collections: { toArray: vi.fn(), clear: vi.fn(), bulkAdd: vi.fn() },
        transaction: vi.fn((mode, ...args) => {
            const cb = args[args.length - 1];
            return cb();
        })
    }
}));

// Mock LocalStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('backup-manager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    it('createBackup should collect all data from DB', async () => {
        db.rules.toArray.mockResolvedValue([{ id: 'r1' }]);
        db.folders.toArray.mockResolvedValue([{ id: 'f1' }]);
        db.tags.toArray.mockResolvedValue([]);
        db.ignoredUrls.toArray.mockResolvedValue([]);
        db.collections.toArray.mockResolvedValue([]);

        const backup = await createBackup();

        expect(backup.version).toBe(1);
        expect(backup.data.rules).toHaveLength(1);
        expect(backup.data.folders).toHaveLength(1);
        expect(backup.timestamp).toBeDefined();
    });

    it('restoreBackup should clear tables and bulk add new data', async () => {
        const backupData = {
            data: {
                rules: [{ id: 'r1' }],
                folders: [{ id: 'f1' }],
                tags: [],
                ignoredUrls: [],
                collections: []
            }
        };

        await restoreBackup(backupData);

        expect(db.rules.clear).toHaveBeenCalled();
        expect(db.rules.bulkAdd).toHaveBeenCalledWith([{ id: 'r1' }]);
        expect(db.folders.clear).toHaveBeenCalled();
        expect(db.folders.bulkAdd).toHaveBeenCalledWith([{ id: 'f1' }]);
    });

    it('restoreBackup should throw error for invalid format', async () => {
        await expect(restoreBackup({})).rejects.toThrow('Invalid backup file format');
    });

    it('getAutoBackup should parse data from localStorage', () => {
        const mockData = { version: 1, data: {} };
        localStorageMock.setItem('booksmart_autosave_config', JSON.stringify(mockData));

        const result = getAutoBackup();
        expect(result).toEqual(mockData);
    });

    it('getAutoBackup should return null if no data exists', () => {
        expect(getAutoBackup()).toBeNull();
    });
});
