import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateFromLocalStorage } from '../migrations';
import { db } from '../schema';

// Mock DB
vi.mock('../schema', () => ({
    db: {
        rules: { count: vi.fn(), bulkPut: vi.fn() },
        folders: { count: vi.fn(), bulkPut: vi.fn() },
        tags: { count: vi.fn(), bulkPut: vi.fn() },
        ignoredUrls: { count: vi.fn(), bulkPut: vi.fn() },
        transaction: vi.fn(async (...args) => {
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

describe('DB Migrations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        db.rules.count.mockResolvedValue(0);
        db.folders.count.mockResolvedValue(0);
        db.tags.count.mockResolvedValue(0);
        db.ignoredUrls.count.mockResolvedValue(0);
    });

    it('should migrate data from localStorage to DB', async () => {
        localStorageMock.setItem('booksmart_rules', JSON.stringify([{ id: 'r1', name: 'Rule 1' }]));
        localStorageMock.setItem('booksmart_folders', JSON.stringify(['Work', 'Personal']));

        await migrateFromLocalStorage();

        expect(db.rules.bulkPut).toHaveBeenCalledWith([{ id: 'r1', name: 'Rule 1' }]);
        expect(db.folders.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ name: 'Work' }),
            expect.objectContaining({ name: 'Personal' })
        ]));
        expect(localStorageMock.getItem('booksmart_db_migrated')).toBe('true');
    });

    it('should not migrate if already migrated', async () => {
        localStorageMock.setItem('booksmart_db_migrated', 'true');
        await migrateFromLocalStorage();
        expect(db.transaction).not.toHaveBeenCalled();
    });

    it('should not migrate if DB already has data', async () => {
        db.rules.count.mockResolvedValue(5);
        localStorageMock.setItem('booksmart_rules', JSON.stringify([{ id: 'r1' }]));

        await migrateFromLocalStorage();

        expect(db.rules.bulkPut).not.toHaveBeenCalled();
    });
});
