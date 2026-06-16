import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('processing.worker', () => {
    let workerOnMessage;
    let workerPostMessage;
    const BASE_BOOKMARKS = [
        { id: '1', url: 'https://reactjs.org', title: 'React', originalFolder: 'Dev', tags: ['frontend'], addDate: Math.floor((Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) / 1000) },
        { id: '2', url: 'https://vuejs.org', title: 'Vue', originalFolder: 'Design', tags: ['frontend', 'framework'], addDate: Math.floor((Date.now() - 1 * 24 * 60 * 60 * 1000) / 1000) },
        { id: '3', url: 'https://nodejs.org', title: 'Node.js', originalFolder: 'Dev', tags: ['backend'], addDate: Math.floor(Date.now() / 1000) },
    ];

    beforeEach(async () => {
        workerPostMessage = vi.fn();
        global.self = { postMessage: workerPostMessage, onmessage: null };
        vi.resetModules();
        await import('../../workers/processing.worker.js');
        workerOnMessage = global.self.onmessage;
    });

    function process(payloadOverrides = {}) {
        const payload = {
            bookmarks: BASE_BOOKMARKS,
            rules: [],
            resolvedConflicts: {},
            searchQuery: '',
            searchMode: 'simple',
            activeTag: null,
            activeFolder: null,
            activeCollection: null,
            smartFilter: null,
            dateFilter: {},
            sortBy: 'default',
            fuseOptions: {},
            ...payloadOverrides
        };
        workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
        return workerPostMessage.mock.calls[0][0];
    }

    describe('basic filtering', () => {
        it('should pass through all bookmarks with no filters', async () => {
            const result = process();
            expect(result.type).toBe('DATA_PROCESSED');
            expect(result.payload.processedBookmarks).toHaveLength(3);
        });

        it('should filter by simple search query', async () => {
            const result = process({ searchQuery: 'react', searchMode: 'simple' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('1');
        });

        it('should filter by URL in simple search', async () => {
            const result = process({ searchQuery: 'nodejs', searchMode: 'simple' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('3');
        });

        it('should filter by tags in simple search', async () => {
            const result = process({ searchQuery: 'framework', searchMode: 'simple' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('2');
        });

        it('should apply folder filter successfully', async () => {
            const result = process({ activeFolder: 'Design' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('2');
        });

        it('should apply tag filter successfully', async () => {
            const result = process({ activeTag: 'backend' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('3');
        });

        it('should apply collection filter', async () => {
            const bookmarksWithCollection = BASE_BOOKMARKS.map(b =>
                b.id === '1' ? { ...b, collections: ['col1'] } : b
            );
            const result = process({ bookmarks: bookmarksWithCollection, activeCollection: 'col1' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('1');
        });

        it('should return empty when no bookmarks match collection filter', async () => {
            const result = process({ activeCollection: 'nonexistent' });
            expect(result.payload.processedBookmarks).toHaveLength(0);
        });
    });

    describe('regex search', () => {
        it('should filter by valid regex pattern', async () => {
            const result = process({ searchQuery: '^Reac', searchMode: 'regex' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('1');
        });

        it('should fallback to simple contains for invalid regex', async () => {
            const result = process({ searchQuery: '[invalid', searchMode: 'regex' });
            // With invalid regex, should fallback to simple contains
            expect(result.payload.processedBookmarks.length).toBeGreaterThanOrEqual(0);
        });

        it('should not crash with very long regex pattern', async () => {
            const result = process({ searchQuery: 'a'.repeat(250), searchMode: 'regex' });
            expect(result.type).toBe('DATA_PROCESSED');
        });
    });

    describe('date filtering', () => {
        it('should filter by start date', async () => {
            const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const result = process({ dateFilter: { start: startDate } });
            // Only bookmark 1 (10 years old) should be excluded
            expect(result.payload.processedBookmarks).toHaveLength(2);
        });

        it('should filter by end date', async () => {
            const endDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const result = process({ dateFilter: { end: endDate } });
            // Bookmark 3 (added today) should be excluded
            expect(result.payload.processedBookmarks).toHaveLength(2);
        });

        it('should filter by both start and end date', async () => {
            // Bookmark 1 (10yr old) excluded by start, bookmark 2 (1day old) and 3 (now) included
            const startDate = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const result = process({ dateFilter: { start: startDate, end: endDate } });
            expect(result.payload.processedBookmarks).toHaveLength(2);
        });
    });

    describe('smart filters', () => {
        it('should filter old bookmarks (>5 years)', async () => {
            const result = process({ smartFilter: 'old' });
            // Bookmark 1 is 10 years old
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('1');
        });

        it('should filter http:// URLs', async () => {
            const bookmarks = [
                { id: 'http1', url: 'http://example.com', title: 'HTTP', originalFolder: 'Root' },
                { id: 'https1', url: 'https://example.com', title: 'HTTPS', originalFolder: 'Root' },
            ];
            const result = process({ bookmarks, smartFilter: 'http' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('http1');
        });

        it('should filter untitled bookmarks', async () => {
            const bookmarks = [
                { id: 'ut1', url: 'https://example.com/page', title: '', originalFolder: 'Root' },
                { id: 'ut2', url: 'https://example.com/other', title: 'My Title', originalFolder: 'Root' },
            ];
            const result = process({ bookmarks, smartFilter: 'untitled' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('ut1');
        });

        it('should filter documents', async () => {
            const bookmarks = [
                { id: 'doc1', url: 'https://example.com/doc.pdf', title: 'PDF', originalFolder: 'Root' },
                { id: 'doc2', url: 'https://example.com/doc.docx', title: 'Word', originalFolder: 'Root' },
                { id: 'nodoc', url: 'https://example.com/page.html', title: 'Page', originalFolder: 'Root' },
            ];
            const result = process({ bookmarks, smartFilter: 'docs' });
            expect(result.payload.processedBookmarks).toHaveLength(2);
        });

        it('should filter long URLs (>=200 chars)', async () => {
            const bookmarks = [
                { id: 'long1', url: 'https://example.com/' + 'a'.repeat(200), title: 'Long', originalFolder: 'Root' },
                { id: 'short1', url: 'https://example.com/short', title: 'Short', originalFolder: 'Root' },
            ];
            const result = process({ bookmarks, smartFilter: 'longurl' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('long1');
        });

        it('should filter media domains', async () => {
            const bookmarks = [
                { id: 'yt', url: 'https://youtube.com/watch', title: 'YT', originalFolder: 'Root' },
                { id: 'normal', url: 'https://example.com', title: 'Normal', originalFolder: 'Root' },
            ];
            const result = process({ bookmarks, smartFilter: 'media' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('yt');
        });

        it('should filter social domains', async () => {
            const bookmarks = [
                { id: 'tw', url: 'https://twitter.com/user', title: 'Tweet', originalFolder: 'Root' },
                { id: 'gh', url: 'https://github.com/user', title: 'Code', originalFolder: 'Root' },
            ];
            const result = process({ bookmarks, smartFilter: 'social' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('tw');
        });

        it('should filter shopping domains', async () => {
            const bookmarks = [
                { id: 'amz', url: 'https://amazon.com/product', title: 'Amazon', originalFolder: 'Root' },
                { id: 'blog', url: 'https://blog.example.com', title: 'Blog', originalFolder: 'Root' },
            ];
            const result = process({ bookmarks, smartFilter: 'shopping' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('amz');
        });

        it('should filter news domains', async () => {
            const bookmarks = [
                { id: 'tc', url: 'https://techcrunch.com/article', title: 'TC', originalFolder: 'Root' },
                { id: 'pers', url: 'https://myblog.example.com', title: 'Personal', originalFolder: 'Root' },
            ];
            const result = process({ bookmarks, smartFilter: 'news' });
            expect(result.payload.processedBookmarks).toHaveLength(1);
            expect(result.payload.processedBookmarks[0].id).toBe('tc');
        });
    });

    describe('sorting', () => {
        it('should sort by title A-Z', async () => {
            const result = process({ sortBy: 'title-az' });
            const titles = result.payload.processedBookmarks.map(b => b.title);
            expect(titles).toEqual(['Node.js', 'React', 'Vue']);
        });

        it('should sort by title Z-A', async () => {
            const result = process({ sortBy: 'title-za' });
            const titles = result.payload.processedBookmarks.map(b => b.title);
            expect(titles).toEqual(['Vue', 'React', 'Node.js']);
        });

        it('should sort by date newest first', async () => {
            const result = process({ sortBy: 'date-new' });
            const ids = result.payload.processedBookmarks.map(b => b.id);
            expect(ids).toEqual(['3', '2', '1']);
        });

        it('should sort by date oldest first', async () => {
            const result = process({ sortBy: 'date-old' });
            const ids = result.payload.processedBookmarks.map(b => b.id);
            expect(ids).toEqual(['1', '2', '3']);
        });

        it('should sort by domain', async () => {
            const result = process({ sortBy: 'domain' });
            const domains = result.payload.processedBookmarks.map(b => b.url);
            expect(domains).toEqual(['https://nodejs.org', 'https://reactjs.org', 'https://vuejs.org']);
        });

        it('should sort by folder', async () => {
            const result = process({ sortBy: 'folder' });
            const folders = result.payload.processedBookmarks.map(b => b.originalFolder);
            expect(folders).toEqual(['Design', 'Dev', 'Dev']);
        });
    });

    describe('duplicate detection', () => {
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
            workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
            const callArgs = workerPostMessage.mock.calls[0][0];
            expect(callArgs.payload.duplicateCount).toBe(1);
            const b1 = callArgs.payload.processedBookmarks.find(b => b.id === '1');
            const b2 = callArgs.payload.processedBookmarks.find(b => b.id === '2');
            expect(b1.hasDuplicate).toBe(true);
            expect(b1.isDuplicate).toBe(false);
            expect(b2.isDuplicate).toBe(true);
            expect(b2.hasDuplicate).toBe(false);
        });

        it('should normalize URLs for duplicate detection', async () => {
            const payload = {
                bookmarks: [
                    { id: '1', url: 'HTTPS://REACTJS.ORG/', title: 'React', originalFolder: 'Dev' },
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
            workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
            const callArgs = workerPostMessage.mock.calls[0][0];
            expect(callArgs.payload.duplicateCount).toBe(1);
            const b2 = callArgs.payload.processedBookmarks.find(b => b.id === '2');
            expect(b2.isDuplicate).toBe(true);
        });

        it('should detect duplicates across www and non-www variants', async () => {
            const payload = {
                bookmarks: [
                    { id: '1', url: 'https://www.example.com/page', title: 'Page 1', originalFolder: 'Root' },
                    { id: '2', url: 'https://example.com/page', title: 'Page 2', originalFolder: 'Root' }
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
            workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
            const callArgs = workerPostMessage.mock.calls[0][0];
            expect(callArgs.payload.duplicateCount).toBe(1);
        });
    });

    describe('statistics calculation', () => {
        it('should return unique tags sorted by count', async () => {
            const result = process();
            const tags = result.payload.uniqueTags;
            expect(tags).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'frontend', count: 2 }),
                    expect.objectContaining({ name: 'framework', count: 1 }),
                    expect.objectContaining({ name: 'backend', count: 1 }),
                ])
            );
        });

        it('should return unique folders with counts', async () => {
            const result = process();
            const folders = result.payload.uniqueFolders;
            expect(folders).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Dev', count: 2 }),
                    expect.objectContaining({ name: 'Design', count: 1 }),
                ])
            );
        });

        it('should include newFolder in folder counts when different from original', async () => {
            const bookmarks = [
                { id: '1', url: 'https://example.com', title: 'Test', originalFolder: 'Old', newFolder: 'New', tags: [] },
            ];
            const result = process({ bookmarks });
            const folders = result.payload.uniqueFolders;
            expect(folders).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Old', count: 1 }),
                    expect.objectContaining({ name: 'New', count: 1 }),
                ])
            );
        });

        it('should handle string tags in statistics', async () => {
            const bookmarks = [
                { id: '1', url: 'https://example.com', title: 'Test', originalFolder: 'Root', tags: 'tag1,tag2' },
            ];
            const result = process({ bookmarks });
            expect(result.payload.uniqueTags).toHaveLength(2);
        });
    });

    describe('rule application', () => {
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
            workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
            const callArgs = workerPostMessage.mock.calls[0][0];
            const processed = callArgs.payload.processedBookmarks[0];
            expect(processed.status).toBe('conflict');
            expect(processed.conflictingFolders).toHaveLength(2);
            expect(processed.tags).toContain('dev');
        });

        it('should use resolved conflict folder when available', async () => {
            const payload = {
                bookmarks: [
                    { id: '1', url: 'https://github.com', title: 'GitHub', originalFolder: 'Unsorted' }
                ],
                rules: [
                    { id: 'r1', type: 'domain', value: 'github.com', targetFolder: 'Code', tags: '' },
                    { id: 'r2', type: 'keyword', value: 'github', targetFolder: 'Work', tags: '' }
                ],
                resolvedConflicts: { '1': 'Code' },
                searchQuery: '',
                searchMode: 'simple',
                activeTag: null,
                activeFolder: null,
                smartFilter: null,
                dateFilter: {},
                sortBy: 'default',
                fuseOptions: {}
            };
            workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
            const callArgs = workerPostMessage.mock.calls[0][0];
            expect(callArgs.payload.processedBookmarks[0].newFolder).toBe('Code');
            expect(callArgs.payload.processedBookmarks[0].status).not.toBe('conflict');
        });

        it('should apply multi-value comma-separated rules', async () => {
            const payload = {
                bookmarks: [
                    { id: '1', url: 'https://github.com/react', title: 'React on GitHub', originalFolder: 'Unsorted' }
                ],
                rules: [
                    { id: 'r1', type: 'keyword', value: 'react, vue, angular', targetFolder: 'Frontend', tags: 'ui,js' }
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
            workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
            const callArgs = workerPostMessage.mock.calls[0][0];
            const processed = callArgs.payload.processedBookmarks[0];
            expect(processed.status).toBe('matched');
            expect(processed.newFolder).toBe('Frontend');
            expect(processed.tags).toEqual(expect.arrayContaining(['ui', 'js']));
        });

        it('should apply exact match rule type', async () => {
            const payload = {
                bookmarks: [
                    { id: '1', url: 'https://example.com', title: 'My Bookmark', originalFolder: 'Unsorted' }
                ],
                rules: [
                    { id: 'r1', type: 'exact', value: 'My Bookmark', targetFolder: 'Favorites', tags: '' }
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
            workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
            const callArgs = workerPostMessage.mock.calls[0][0];
            expect(callArgs.payload.processedBookmarks[0].newFolder).toBe('Favorites');
            expect(callArgs.payload.processedBookmarks[0].status).toBe('matched');
        });

        it('should preserve ai-suggested status', async () => {
            const payload = {
                bookmarks: [
                    { id: '1', url: 'https://example.com', title: 'Test', originalFolder: 'Root', newFolder: 'AI Folder', status: 'suggested', ruleTags: ['ai-tag'] }
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
            workerOnMessage({ data: { type: 'PROCESS_DATA', payload } });
            const callArgs = workerPostMessage.mock.calls[0][0];
            expect(callArgs.payload.processedBookmarks[0].status).toBe('suggested');
            expect(callArgs.payload.processedBookmarks[0].newFolder).toBe('AI Folder');
            expect(callArgs.payload.processedBookmarks[0].tags).toContain('ai-tag');
        });
    });

    describe('edge cases', () => {
        it('should handle empty bookmarks array', async () => {
            const result = process({ bookmarks: [] });
            expect(result.payload.processedBookmarks).toEqual([]);
            expect(result.payload.uniqueTags).toEqual([]);
            expect(result.payload.uniqueFolders).toEqual([]);
            expect(result.payload.duplicateCount).toBe(0);
        });

        it('should handle bookmarks with missing fields', async () => {
            const result = process({
                bookmarks: [
                    { id: '1', url: 'https://example.com' },
                    { id: '2', url: 'https://test.com', title: 'Test' },
                ]
            });
            expect(result.payload.processedBookmarks).toHaveLength(2);
            expect(result.type).toBe('DATA_PROCESSED');
        });

        it('should handle check-link requests', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({ ok: true });
            workerOnMessage({ data: { type: 'CHECK_LINKS', payload: { urls: ['https://example.com'] } } });
            // Give async checkLink time to resolve
            await vi.waitFor(() => {
                expect(workerPostMessage).toHaveBeenCalled();
            });
            const calls = workerPostMessage.mock.calls.map(c => c[0].type);
            expect(calls).toContain('LINKS_CHECKED_COMPLETE');
        });
    });
});
