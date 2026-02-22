import { describe, it, expect, vi } from 'vitest';
import { parseBookmarks, parseJson, parseCsv, parseMarkdown } from '../parser';

// Mock generateUUID for stable IDs in tests
vi.mock('../utils', () => ({
    generateUUID: () => 'mock-id'
}));

describe('parser', () => {
    describe('parseBookmarks (HTML)', () => {
        it('should parse Netscape HTML bookmarks correctly', () => {
            const html = `
                <!DOCTYPE NETSCAPE-Bookmark-file-1>
                <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
                <TITLE>Bookmarks</TITLE>
                <H1>Bookmarks</H1>
                <DL><p>
                    <DT><H3 ADD_DATE="1700000000">Folder A</H3>
                    <DL><p>
                        <DT><A HREF="https://example.com/1" ADD_DATE="1700000001">Link 1</A>
                        <DT><A HREF="https://example.com/2" ADD_DATE="1700000002" TAGS="tag1, tag2">Link 2</A>
                        <DD>This is a note for link 2
                    </DL><p>
                    <DT><A HREF="https://example.com/root" ADD_DATE="1700000003">Root Link</A>
                </DL><p>
            `;

            const result = parseBookmarks(html);

            expect(result).toHaveLength(3);

            // Link 1
            expect(result[0].title).toBe('Link 1');
            expect(result[0].url).toBe('https://example.com/1');
            expect(result[0].originalFolder).toBe('Folder A');

            // Link 2 with note and tags
            expect(result[1].title).toBe('Link 2');
            expect(result[1].tags).toEqual(['tag1', 'tag2']);
            expect(result[1].note).toBe('This is a note for link 2');

            // Root Link
            expect(result[2].title).toBe('Root Link');
            expect(result[2].originalFolder).toBe('Root');
        });
    });

    describe('parseJson', () => {
        it('should parse valid JSON array of bookmarks', () => {
            const json = JSON.stringify([
                { title: 'JSON Link', url: 'https://json.com', tags: ['j1'] }
            ]);
            const result = parseJson(json);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('JSON Link');
            expect(result[0].status).toBe('unchanged');
        });

        it('should return empty array for invalid JSON', () => {
            const result = parseJson('invalid-json');
            expect(result).toEqual([]);
        });
    });

    describe('parseCsv', () => {
        it('should parse CSV content with headers', () => {
            const csv = 'Title,URL,Folder,Tags,Date Added,Note\n' +
                '"CSV Link","https://csv.com","My Folder","t1, t2","2024-01-01","A note"';
            const result = parseCsv(csv);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('CSV Link');
            expect(result[0].url).toBe('https://csv.com');
            expect(result[0].originalFolder).toBe('My Folder');
            expect(result[0].tags).toEqual(['t1', 't2']);
            expect(result[0].note).toBe('A note');
        });
    });

    describe('parseMarkdown', () => {
        it('should parse Markdown list with folders it correctly', () => {
            const md = `
## My Dev Folder
- [React](https://reactjs.org) \`#javascript\` \`#frontend\`
- [Vue](https://vuejs.org)

## Tools
- [Vite](https://vitejs.dev) \`#tool\`
            `;
            const result = parseMarkdown(md);
            expect(result).toHaveLength(3);

            expect(result[0].title).toBe('React');
            expect(result[0].originalFolder).toBe('My Dev Folder');
            expect(result[0].tags).toEqual(['javascript', 'frontend']);

            expect(result[2].title).toBe('Vite');
            expect(result[2].originalFolder).toBe('Tools');
            expect(result[2].tags).toEqual(['tool']);
        });
    });
});
