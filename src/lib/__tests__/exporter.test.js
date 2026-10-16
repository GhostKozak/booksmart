import { describe, it, expect } from 'vitest';
import { exportBookmarks, exportToJson, exportToCsv, exportToMarkdown, getExportPayload } from '../exporter';

describe('exporter', () => {
    const testBookmarks = [
        {
            title: 'Link 1',
            url: 'https://e1.com',
            newFolder: 'Folder A',
            tags: ['t1'],
            addDate: '1700000000',
            note: 'Note 1'
        },
        {
            title: 'Link 2',
            url: 'https://e2.com',
            newFolder: 'Folder A > Sub',
            tags: [],
            addDate: '1700000001'
        },
        {
            title: 'Root Link',
            url: 'https://root.com',
            newFolder: 'Root',
            tags: ['t2']
        }
    ];

    describe('exportBookmarks (HTML)', () => {
        it('should correctly build the nested HTML structure', () => {
            const html = exportBookmarks(testBookmarks);

            expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
            expect(html).toContain('<H1>Bookmarks</H1>');

            // Checking structure via occurrences
            expect(html).toContain('HREF="https://e1.com"');
            expect(html).toContain('HREF="https://e2.com"');
            expect(html).toContain('HREF="https://root.com"');

            // Folders
            expect(html).toContain('<H3 ADD_DATE=');
            expect(html).toContain('Folder A</H3>');
            expect(html).toContain('Sub</H3>');

            // Tags and notes
            expect(html).toContain('TAGS="t1"');
            expect(html).toContain('<DD>Note 1');
        });
    });

    describe('exportToJson', () => {
        it('should return a valid JSON string', () => {
            const json = exportToJson(testBookmarks);
            const parsed = JSON.parse(json);
            expect(parsed).toHaveLength(3);
            expect(parsed[0].title).toBe('Link 1');
        });
    });

    describe('exportToCsv', () => {
        it('should correctly format CSV with headers', () => {
            const csv = exportToCsv(testBookmarks);
            const lines = csv.split('\n');

            expect(lines[0]).toBe('Title,URL,Folder,Tags,Date Added,Note');
            expect(lines[1]).toContain('"Link 1","https://e1.com","Folder A","t1"');
            expect(lines[3]).toContain('"Root Link","https://root.com","Root","t2"');
        });

        it('should sanitize formula characters (=, +, -, @) to prevent CSV injection', () => {
            const unsafeBookmarks = [
                {
                    title: '=cmd|’ /C calc’!A0',
                    url: 'https://safe.com',
                    newFolder: '+Folder',
                    note: '@payload'
                }
            ];
            const csv = exportToCsv(unsafeBookmarks);
            expect(csv).toContain("\"'=cmd|’ /C calc’!A0\"");
            expect(csv).toContain("\"'+Folder\"");
            expect(csv).toContain("\"'@payload\"");
        });
    });

    describe('exportToMarkdown', () => {
        it('should group bookmarks by folder in Markdown', () => {
            const md = exportToMarkdown(testBookmarks);

            expect(md).toContain('## Folder A');
            expect(md).toContain('## Folder A > Sub');
            expect(md).toContain('## Root');

            expect(md).toContain('- [Link 1](https://e1.com) `#t1`');
            expect(md).toContain('  > Note 1');
            expect(md).toContain('- [Root Link](https://root.com) `#t2`');
        });
    });

    describe('getExportPayload', () => {
        it('should calculate export payload and estimated size for HTML', () => {
            const payload = getExportPayload(testBookmarks, 'html');
            expect(payload.type).toBe('text/html');
            expect(payload.extension).toBe('html');
            expect(payload.content).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
            expect(payload.bytes).toBeGreaterThan(0);
            expect(payload.estimatedSize).toMatch(/B|KB/);
        });

        it('should calculate export payload for JSON', () => {
            const payload = getExportPayload(testBookmarks, 'json');
            expect(payload.type).toBe('application/json');
            expect(payload.extension).toBe('json');
            expect(JSON.parse(payload.content)).toHaveLength(3);
        });

        it('should calculate export payload for CSV', () => {
            const payload = getExportPayload(testBookmarks, 'csv');
            expect(payload.type).toBe('text/csv');
            expect(payload.extension).toBe('csv');
            expect(payload.content).toContain('Title,URL,Folder');
        });

        it('should calculate export payload for Markdown', () => {
            const payload = getExportPayload(testBookmarks, 'md');
            expect(payload.type).toBe('text/markdown');
            expect(payload.extension).toBe('md');
            expect(payload.content).toContain('# Bookmarks Export');
        });

        it('should handle empty bookmark list', () => {
            const payload = getExportPayload([], 'html');
            expect(payload.bytes).toBeGreaterThan(0); // html skeleton
            expect(payload.content).toContain('<H1>Bookmarks</H1>');
        });

        it('should fallback to originalFolder if newFolder is not defined', () => {
            const bookmarksWithoutNewFolder = [
                { title: 'Doc', url: 'https://doc.com', originalFolder: 'ImportedDocs', tags: [] }
            ];
            const html = exportBookmarks(bookmarksWithoutNewFolder);
            expect(html).toContain('ImportedDocs</H3>');

            const csv = exportToCsv(bookmarksWithoutNewFolder);
            expect(csv).toContain('"ImportedDocs"');

            const md = exportToMarkdown(bookmarksWithoutNewFolder);
            expect(md).toContain('## ImportedDocs');
        });
    });
});

