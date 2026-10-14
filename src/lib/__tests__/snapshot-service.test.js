import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getWaybackMachineUrl,
    getWaybackSaveUrl,
    checkWaybackAvailability,
    saveSnapshot,
    getSnapshot,
    deleteSnapshot,
    formatByteSize,
    downloadSnapshotFile
} from '../snapshot-service';
import { db } from '../../db/schema';

vi.mock('../../db/schema', () => ({
    db: {
        snapshots: {
            put: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
            where: vi.fn()
        },
        bookmarks: {
            update: vi.fn()
        }
    }
}));

describe('snapshot-service.js', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        globalThis.URL.revokeObjectURL = vi.fn();
    });

    it('generates Wayback Machine view and save URLs', () => {
        const url = 'https://example.com/article';
        expect(getWaybackMachineUrl(url)).toBe('https://web.archive.org/web/*/https://example.com/article');
        expect(getWaybackSaveUrl(url)).toBe('https://web.archive.org/save/https://example.com/article');
        expect(getWaybackMachineUrl('')).toBe('');
    });

    it('formats bytes into human readable size', () => {
        expect(formatByteSize(0)).toBe('0 B');
        expect(formatByteSize(500)).toBe('500 B');
        expect(formatByteSize(2048)).toBe('2.0 KB');
        expect(formatByteSize(1048576 * 2.5)).toBe('2.5 MB');
    });

    it('checks Wayback availability API', async () => {
        const mockApiResponse = {
            archived_snapshots: {
                closest: {
                    available: true,
                    url: 'https://web.archive.org/web/20260101/https://example.com',
                    timestamp: '20260101'
                }
            }
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(mockApiResponse)
        });

        const res = await checkWaybackAvailability('https://example.com');
        expect(res).not.toBeNull();
        expect(res.available).toBe(true);
        expect(res.url).toContain('web.archive.org');
    });

    it('saves full offline HTML snapshot and updates bookmark flags', async () => {
        db.snapshots.put.mockResolvedValue('https://example.com');

        const snapshot = await saveSnapshot({
            bookmarkId: 12,
            url: 'https://example.com',
            title: 'Test Article',
            html: '<p>Article content</p>',
            textContent: 'Article content'
        });

        expect(snapshot).not.toBeNull();
        expect(snapshot.url).toBe('https://example.com');
        expect(snapshot.byteSize).toBeGreaterThan(0);
        expect(db.snapshots.put).toHaveBeenCalledWith(expect.objectContaining({
            url: 'https://example.com',
            bookmarkId: 12,
            title: 'Test Article'
        }));
        expect(db.bookmarks.update).toHaveBeenCalledWith(12, expect.objectContaining({
            hasSnapshot: true
        }));
    });

    it('retrieves snapshot by url', async () => {
        const mockData = { url: 'https://example.com', title: 'Saved' };
        db.snapshots.get.mockResolvedValue(mockData);

        const res = await getSnapshot('https://example.com');
        expect(res).toEqual(mockData);
        expect(db.snapshots.get).toHaveBeenCalledWith('https://example.com');
    });

    it('deletes snapshot and updates bookmark flag', async () => {
        db.snapshots.delete.mockResolvedValue(undefined);

        const ok = await deleteSnapshot('https://example.com', 12);
        expect(ok).toBe(true);
        expect(db.snapshots.delete).toHaveBeenCalledWith('https://example.com');
        expect(db.bookmarks.update).toHaveBeenCalledWith(12, {
            hasSnapshot: false,
            snapshotSavedAt: null,
            snapshotByteSize: null
        });
    });

    it('downloads snapshot file with download click trigger', () => {
        const clickMock = vi.fn();
        vi.spyOn(document, 'createElement').mockReturnValue({
            href: '',
            download: '',
            click: clickMock
        });

        downloadSnapshotFile({
            title: 'Sample Page',
            url: 'https://sample.com',
            html: '<p>Body</p>',
            savedAt: Date.now()
        });

        expect(clickMock).toHaveBeenCalled();
        expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    });
});
