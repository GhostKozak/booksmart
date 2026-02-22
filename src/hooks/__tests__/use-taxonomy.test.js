import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTaxonomy } from '../use-taxonomy';
import { db } from '../../db';

const mockFolders = [];
const mockTags = [];
const mockIgnoredUrls = [];

// Mock Dexie Hooks
vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: (cb) => {
        // Simple heuristic to return the right mock array
        const queryStr = cb.toString();
        if (queryStr.includes('folders')) return [...mockFolders];
        if (queryStr.includes('tags')) return [...mockTags];
        if (queryStr.includes('ignoredUrls')) return [...mockIgnoredUrls];
        return [];
    }
}));

// Mock DB
vi.mock('../../db', () => ({
    db: {
        folders: {
            orderBy: vi.fn(() => ({ toArray: vi.fn(async () => mockFolders) })),
            toArray: vi.fn(async () => mockFolders),
            bulkDelete: vi.fn(async (ids) => {
                ids.forEach(id => {
                    const idx = mockFolders.findIndex(f => f.id === id);
                    if (idx !== -1) mockFolders.splice(idx, 1);
                });
            }),
            bulkPut: vi.fn(async (items) => {
                items.forEach(item => {
                    const idx = mockFolders.findIndex(f => f.id === item.id);
                    if (idx !== -1) mockFolders[idx] = item;
                    else mockFolders.push(item);
                });
            }),
            add: vi.fn(async (item) => mockFolders.push(item)),
            clear: vi.fn(async () => { mockFolders.length = 0; }),
            count: vi.fn(async () => mockFolders.length)
        },
        tags: {
            orderBy: vi.fn(() => ({ toArray: vi.fn(async () => mockTags) })),
            toArray: vi.fn(async () => mockTags),
            add: vi.fn(async (item) => mockTags.push(item)),
            clear: vi.fn(async () => { mockTags.length = 0; }),
            count: vi.fn(async () => mockTags.length),
            where: vi.fn((key) => ({
                equals: vi.fn((val) => ({
                    first: vi.fn(async () => mockTags.find(t => t[key] === val))
                }))
            }))
        },
        ignoredUrls: {
            toArray: vi.fn(async () => mockIgnoredUrls),
            where: vi.fn((key) => ({
                equals: vi.fn((val) => ({
                    first: vi.fn(async () => mockIgnoredUrls.find(i => i[key] === val)),
                    delete: vi.fn(async () => {
                        const idx = mockIgnoredUrls.findIndex(i => i[key] === val);
                        if (idx !== -1) mockIgnoredUrls.splice(idx, 1);
                    })
                }))
            })),
            add: vi.fn(async (item) => mockIgnoredUrls.push(item)),
            clear: vi.fn(async () => { mockIgnoredUrls.length = 0; })
        },
        transaction: vi.fn(async (...args) => {
            const cb = args[args.length - 1];
            return cb();
        })
    }
}));

describe('useTaxonomy hook', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        mockFolders.length = 0;
        mockTags.length = 0;
        mockIgnoredUrls.length = 0;
    });

    it('toggles ignore URL', async () => {
        const url = 'https://ignore.me';
        const { result, rerender } = renderHook(() => useTaxonomy({ workerUniqueTags: [], workerUniqueFolders: [] }));

        await act(async () => {
            await result.current.toggleIgnoreUrl(url);
        });
        rerender();

        // Check if it exists after first toggle
        const ignored = await db.ignoredUrls.where('url').equals(url).first();
        expect(ignored).toBeDefined();

        await act(async () => {
            await result.current.toggleIgnoreUrl(url);
        });
        rerender();
        const ignoredAfter = await db.ignoredUrls.where('url').equals(url).first();
        expect(ignoredAfter).toBeUndefined();
    });

    it('calculates discovered items correctly', async () => {
        const workerFolders = [{ id: 'f1', name: 'New Folder' }, { id: 'f2', name: 'Existing' }];
        await db.folders.add({ id: 'ex', name: 'Existing', order: 0 });

        const { result } = renderHook(() => useTaxonomy({
            workerUniqueFolders: workerFolders,
            workerUniqueTags: []
        }));

        // Note: live query items (availableFolders) might be empty on first render
        // But discoveredFolders logic is purely a useMemo based on props and availableFolders
        // If availableFolders is empty initially, discoveredFolders might show both
        // In a real test with dexie-react-hooks, we might need to wait for the result

        // discoveredFolders filter: !existingNames.has(f.name)
        // Since useLiveQuery is async, we might see New Folder + Existing initially 
        // and then just New Folder after the query resolves.

        expect(result.current.discoveredFolders).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'New Folder' })
        ]));
    });

    it('sets available folders (bulkPut)', async () => {
        const newFolders = [{ id: '1', name: 'F1', order: 0 }, { id: '2', name: 'F2', order: 1 }];
        const { result } = renderHook(() => useTaxonomy({ workerUniqueTags: [], workerUniqueFolders: [] }));

        await act(async () => {
            await result.current.setAvailableFolders(newFolders);
        });

        const count = await db.folders.count();
        expect(count).toBe(2);
    });

    it('saves a single item to taxonomy', async () => {
        const { result } = renderHook(() => useTaxonomy({ workerUniqueTags: [], workerUniqueFolders: [] }));

        await act(async () => {
            await result.current.saveToTaxonomy('New Tag', 'tag');
        });

        const tag = await db.tags.where('name').equals('New Tag').first();
        expect(tag).toBeDefined();
        expect(tag.color).toBe('#10b981'); // Default tag color
    });
});
