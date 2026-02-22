import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCollections } from '../use-collections';
import { db } from '../../db';

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

// Mock Sonner
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        info: vi.fn()
    }
}));

const mockCollections = [];
const mockBookmarks = [];

// Mock DB
vi.mock('../../db', () => ({
    db: {
        collections: {
            orderBy: vi.fn(() => ({ toArray: vi.fn(async () => mockCollections) })),
            add: vi.fn(async (item) => { mockCollections.push(item); return item.id; }),
            update: vi.fn(async (id, updates) => {
                const idx = mockCollections.findIndex(c => c.id === id);
                if (idx !== -1) mockCollections[idx] = { ...mockCollections[idx], ...updates };
            }),
            delete: vi.fn(async (id) => {
                const idx = mockCollections.findIndex(c => c.id === id);
                if (idx !== -1) mockCollections.splice(idx, 1);
            }),
            get: vi.fn(async (id) => mockCollections.find(c => c.id === id)),
            count: vi.fn(async () => mockCollections.length),
            bulkAdd: vi.fn(async (items) => mockCollections.push(...items))
        },
        bookmarks: {
            where: vi.fn(() => ({
                equals: vi.fn(() => ({
                    toArray: vi.fn(async () => mockBookmarks.filter(b => b.collections?.includes('c1'))),
                    count: vi.fn(async () => mockBookmarks.filter(b => b.collections?.includes('c1')).length)
                }))
            })),
            bulkGet: vi.fn(async (ids) => mockBookmarks.filter(b => ids.includes(b.id))),
            get: vi.fn(async (id) => mockBookmarks.find(b => b.id === id)),
            update: vi.fn(async (id, updates) => {
                const idx = mockBookmarks.findIndex(b => b.id === id);
                if (idx !== -1) mockBookmarks[idx] = { ...mockBookmarks[idx], ...updates };
            }),
            add: vi.fn(async (bm) => mockBookmarks.push(bm)),
            clear: vi.fn(async () => { mockBookmarks.length = 0; })
        },
        transaction: vi.fn(async (...args) => {
            const cb = args[args.length - 1];
            return cb();
        })
    }
}));

describe('useCollections hook', () => {
    const mockAddCommand = vi.fn();

    beforeEach(async () => {
        vi.clearAllMocks();
        mockCollections.length = 0;
        mockBookmarks.length = 0;
    });

    it('creates a collection', async () => {
        const { result } = renderHook(() => useCollections({ addCommand: mockAddCommand }));

        let id;
        await act(async () => {
            id = await result.current.createCollection({ name: 'Test' });
        });

        const collection = await db.collections.get(id);
        expect(collection.name).toBe('Test');
        expect(mockAddCommand).toHaveBeenCalled();
    });

    it('updates a collection', async () => {
        const id = 'c1';
        await db.collections.add({ id, name: 'Old', order: 0 });

        const { result } = renderHook(() => useCollections({ addCommand: mockAddCommand }));

        await act(async () => {
            await result.current.updateCollection(id, { name: 'New' });
        });

        const collection = await db.collections.get(id);
        expect(collection.name).toBe('New');
    });

    it('deletes a collection and updates affected bookmarks', async () => {
        const id = 'c1';
        await db.collections.add({ id, name: 'To Delete', order: 0 });
        await db.bookmarks.add({ id: 'b1', url: 'test.com', collections: [id] });

        const { result } = renderHook(() => useCollections({ addCommand: mockAddCommand }));

        await act(async () => {
            await result.current.deleteCollection(id);
        });

        expect(await db.collections.get(id)).toBeUndefined();
        const bm = await db.bookmarks.get('b1');
        expect(bm.collections).not.toContain(id);
    });

    it('adds bookmarks to collection', async () => {
        const cid = 'c1';
        await db.collections.add({ id: cid, name: 'Target', order: 0 });
        await db.bookmarks.add({ id: 'b1', url: 'test.com', collections: [] });

        const { result } = renderHook(() => useCollections({ addCommand: mockAddCommand }));

        await act(async () => {
            await result.current.addBookmarksToCollection(['b1'], cid);
        });

        const bm = await db.bookmarks.get('b1');
        expect(bm.collections).toContain(cid);
    });

    it('removes bookmarks from collection', async () => {
        const cid = 'c1';
        await db.collections.add({ id: cid, name: 'Target', order: 0 });
        await db.bookmarks.add({ id: 'b1', url: 'test.com', collections: [cid] });

        const { result } = renderHook(() => useCollections({ addCommand: mockAddCommand }));

        await act(async () => {
            await result.current.removeBookmarksFromCollection(['b1'], cid);
        });

        const bm = await db.bookmarks.get('b1');
        expect(bm.collections).not.toContain(cid);
    });

    it('seeds default collections', async () => {
        const { result } = renderHook(() => useCollections({ addCommand: mockAddCommand }));

        await act(async () => {
            await result.current.seedDefaultCollections();
        });

        const count = await db.collections.count();
        expect(count).toBe(3);
    });

    it('shares a collection to clipboard', async () => {
        const cid = 'c1';
        await db.collections.add({ id: cid, name: 'Shared', icon: '🌟', order: 0 });
        await db.bookmarks.add({ id: 'b1', title: 'Google', url: 'https://google.com', collections: [cid] });

        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: { writeText: writeTextMock }
        });

        const { result } = renderHook(() => useCollections({ addCommand: mockAddCommand }));

        await act(async () => {
            await result.current.shareCollection(cid, 'markdown');
        });

        expect(writeTextMock).toHaveBeenCalled();
        const output = writeTextMock.mock.calls[0][0];
        expect(output).toContain('# 🌟 Shared');
        expect(output).toContain('[Google](https://google.com)');
    });
});
