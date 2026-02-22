import { describe, it, expect } from 'vitest';
// We simply test the processing logic. Since the worker script uses self.onmessage,
// we can't directly import it to access `processData` if it's not exported.
// But looking at processing.worker.js, `processData` is NOT exported.
// To test it, we can either:
// 1. Export it (which modifies the worker file) - but we prefer not to touch it unless necessary.
// 2. We mock `self` and import the entire file, then call `self.onmessage`.
// Let's use the second approach to keep the worker file intact.

describe('processing.worker', () => {
    let workerOnMessage;
    let workerPostMessage;

    beforeEach(async () => {
        // Setup mock for self
        workerPostMessage = vi.fn();
        global.self = {
            postMessage: workerPostMessage,
            onmessage: null
        };

        // Reset module registry to re-evaluate the worker code and bind to the new `self`
        vi.resetModules();

        // Import the worker file
        await import('../../workers/processing.worker.js');
        workerOnMessage = global.self.onmessage;
    });

    it('should process simple search correctly', async () => {
        const payload = {
            bookmarks: [
                { id: '1', url: 'https://reactjs.org', title: 'React', originalFolder: 'Dev' },
                { id: '2', url: 'https://vuejs.org', title: 'Vue', originalFolder: 'Dev' }
            ],
            rules: [],
            resolvedConflicts: {},
            searchQuery: 'react',
            searchMode: 'simple',
            activeTag: null,
            activeFolder: null,
            smartFilter: null,
            dateFilter: {},
            sortBy: 'default',
            fuseOptions: {}
        };

        await workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });

        expect(workerPostMessage).toHaveBeenCalled();
        const callArgs = workerPostMessage.mock.calls[0][0];
        expect(callArgs.type).toBe('DATA_PROCESSED');
        expect(callArgs.payload.processedBookmarks).toHaveLength(1);
        expect(callArgs.payload.processedBookmarks[0].id).toBe('1');
    });

    it('should apply folder filter successfully', async () => {
        const payload = {
            bookmarks: [
                { id: '1', url: 'https://reactjs.org', title: 'React', originalFolder: 'Dev' },
                { id: '2', url: 'https://vuejs.org', title: 'Vue', originalFolder: 'Design' }
            ],
            rules: [],
            resolvedConflicts: {},
            searchQuery: '',
            searchMode: 'simple',
            activeTag: null,
            activeFolder: 'Design',
            smartFilter: null,
            dateFilter: {},
            sortBy: 'default',
            fuseOptions: {}
        };

        await workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });

        const callArgs = workerPostMessage.mock.calls[0][0];
        expect(callArgs.payload.processedBookmarks).toHaveLength(1);
        expect(callArgs.payload.processedBookmarks[0].id).toBe('2');
    });

    it('should calculate duplicates accurately', async () => {
        const payload = {
            bookmarks: [
                { id: '1', url: 'https://reactjs.org', title: 'React', originalFolder: 'Dev' },
                { id: '2', url: 'https://reactjs.org', title: 'React Copy', originalFolder: 'Dev2' }
            ],
            rules: [],
            resolvedConflicts: {},
            searchQuery: '',
            searchMode: 'simple',
            activeTag: null,
            activeFolder: null,
            smartFilter: null,
            dateFilter: {},
            sortBy: 'default',
            fuseOptions: {}
        };

        await workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });

        const callArgs = workerPostMessage.mock.calls[0][0];
        expect(callArgs.payload.duplicateCount).toBe(1);
        expect(callArgs.payload.processedBookmarks).toHaveLength(2);

        // Sorting should guarantee duplicates are flagged
        const b1 = callArgs.payload.processedBookmarks.find(b => b.id === '1');
        const b2 = callArgs.payload.processedBookmarks.find(b => b.id === '2');

        expect(b1.hasDuplicate).toBe(true);
        expect(b1.isDuplicate).toBe(false);
        expect(b2.isDuplicate).toBe(true);
        expect(b2.hasDuplicate).toBe(false);
    });

    it('should apply rules and find conflicts appropriately', async () => {
        const payload = {
            bookmarks: [
                { id: '1', url: 'https://github.com', title: 'GitHub', originalFolder: 'Unsorted' }
            ],
            rules: [
                { id: 'r1', type: 'domain', value: 'github.com', targetFolder: 'Code', tags: 'dev' },
                { id: 'r2', type: 'keyword', value: 'github', targetFolder: 'Work', tags: '' }
            ],
            resolvedConflicts: {},
            searchQuery: '',
            searchMode: 'simple',
            activeTag: null,
            activeFolder: null,
            smartFilter: null,
            dateFilter: {},
            sortBy: 'default',
            fuseOptions: {}
        };

        await workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });

        const callArgs = workerPostMessage.mock.calls[0][0];
        const processed = callArgs.payload.processedBookmarks[0];

        expect(processed.status).toBe('conflict');
        expect(processed.conflictingFolders).toHaveLength(2);
        expect(processed.tags).toContain('dev');
    });
});
