import { describe, it, expect, vi } from 'vitest';
import {
    parseBookmarks,
    parseJson,
    parseCsv,
    parseMarkdown,
    parsePocketHtml,
    parsePocketJson,
    parseRaindropJson,
    parseRaindropCsv,
    parsePinboardJson
} from '../parser';

vi.mock('../utils', async () => {
    const actual = await vi.importActual('../utils');
    return {
        ...actual,
        generateUUID: () => 'mock-id'
    };
});

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
            expect(result[0].title).toBe('Link 1');
            expect(result[0].url).toBe('https://example.com/1');
            expect(result[0].originalFolder).toBe('Folder A');
            expect(result[1].title).toBe('Link 2');
            expect(result[1].tags).toEqual(['tag1', 'tag2']);
            expect(result[1].note).toBe('This is a note for link 2');
            expect(result[2].title).toBe('Root Link');
            expect(result[2].originalFolder).toBe('Root');
        });

        it('should return empty array for empty HTML', () => {
            expect(parseBookmarks('<html></html>')).toEqual([]);
        });

        it('should skip javascript: URLs', () => {
            const html = `
                <DL><p>
                    <DT><A HREF="javascript:void(0)">Bad Link</A>
                    <DT><A HREF="https://example.com/page">Good Link</A>
                </DL><p>
            `;
            const result = parseBookmarks(html);
            expect(result).toHaveLength(1);
            expect(result[0].url).toBe('https://example.com/page');
        });

        it('should skip data: URLs', () => {
            const html = `
                <DL><p>
                    <DT><A HREF="data:text/html,hello">Bad Link</A>
                </DL><p>
            `;
            const result = parseBookmarks(html);
            expect(result).toEqual([]);
        });

        it('should handle deeply nested folder hierarchy', () => {
            const html = `
                <DL><p>
                    <DT><H3>Level 1</H3>
                    <DL><p>
                        <DT><H3>Level 2</H3>
                        <DL><p>
                            <DT><A HREF="https://deep.com">Deep Link</A>
                        </DL><p>
                    </DL><p>
                </DL><p>
            `;
            const result = parseBookmarks(html);
            expect(result).toHaveLength(1);
            expect(result[0].originalFolder).toBe('Level 1 > Level 2');
        });

        it('should handle HTML without any DL element', () => {
            const result = parseBookmarks('<html><body><p>No bookmarks here</p></body></html>');
            expect(result).toEqual([]);
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

        it('should return empty array for non-array JSON', () => {
            const result = parseJson('{"key": "value"}');
            expect(result).toEqual([]);
        });

        it('should filter out dangerous URLs', () => {
            const json = JSON.stringify([
                { title: 'Safe', url: 'https://safe.com' },
                { title: 'Bad', url: 'javascript:alert(1)' }
            ]);
            const result = parseJson(json);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Safe');
        });

        it('should assign UUID if id is missing', () => {
            const json = JSON.stringify([
                { title: 'No ID', url: 'https://noid.com' }
            ]);
            const result = parseJson(json);
            expect(result[0].id).toBe('mock-id');
        });

        it('should preserve existing id if present', () => {
            const json = JSON.stringify([
                { id: 'existing-1', title: 'Has ID', url: 'https://hasid.com' }
            ]);
            const result = parseJson(json);
            expect(result[0].id).toBe('existing-1');
        });

        it('should default note to empty string', () => {
            const json = JSON.stringify([
                { title: 'Test', url: 'https://test.com' }
            ]);
            const result = parseJson(json);
            expect(result[0].note).toBe('');
        });

        it('should handle null/undefined input gracefully', () => {
            expect(parseJson(null)).toEqual([]);
            expect(parseJson(undefined)).toEqual([]);
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

        it('should handle commas inside quoted fields', () => {
            const csv = 'Title,URL,Folder\n"Link, with comma","https://example.com","Folder, A"';
            const result = parseCsv(csv);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Link, with comma');
            expect(result[0].originalFolder).toBe('Folder, A');
        });

        it('should handle escaped quotes inside quoted fields', () => {
            const csv = 'Title,URL\n"Title with ""quote""","https://example.com"';
            const result = parseCsv(csv);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Title with "quote"');
        });

        it('should handle empty fields', () => {
            const csv = 'Title,URL,Folder\n"Title","https://example.com",';
            const result = parseCsv(csv);
            expect(result).toHaveLength(1);
            expect(result[0].originalFolder).toBe('Root');
        });

        it('should handle CSV without header row', () => {
            const csv = '"Link","https://example.com"';
            const result = parseCsv(csv);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Link');
        });

        it('should skip lines with fewer than 2 parts', () => {
            const csv = 'Title,URL\n"only title"';
            const result = parseCsv(csv);
            expect(result).toHaveLength(0);
        });

        it('should skip empty lines', () => {
            const csv = 'Title,URL\n"Link","https://link.com"\n\n"Link2","https://link2.com"';
            const result = parseCsv(csv);
            expect(result).toHaveLength(2);
        });

        it('should filter out javascript: URLs from CSV', () => {
            const csv = 'Title,URL\n"Bad","javascript:void(0)"';
            const result = parseCsv(csv);
            expect(result).toHaveLength(0);
        });

        it('should default title to URL if empty', () => {
            const csv = 'Title,URL\n,"https://example.com"';
            const result = parseCsv(csv);
            expect(result[0].title).toBe('https://example.com');
        });

        it('should parse date strings to timestamps', () => {
            const csv = 'Title,URL,Date Added\n"Link","https://example.com","2024-06-15"';
            const result = parseCsv(csv);
            expect(typeof result[0].addDate).toBe('number');
        });

        it('should use current time for invalid dates', () => {
            const csv = 'Title,URL,Date Added\n"Link","https://example.com","not-a-date"';
            const result = parseCsv(csv);
            expect(typeof result[0].addDate).toBe('number');
        });
    });

    describe('parseMarkdown', () => {
        it('should parse Markdown list with folders', () => {
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

        it('should handle asterisk list items', () => {
            const md = '* [Link](https://example.com) `#tag`';
            const result = parseMarkdown(md);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Link');
        });

        it('should skip javascript: URLs', () => {
            const md = '- [Bad](javascript:alert(1))';
            const result = parseMarkdown(md);
            expect(result).toHaveLength(0);
        });

        it('should default to Root folder for items outside any heading', () => {
            const md = '- [Lonely](https://lonely.com)';
            const result = parseMarkdown(md);
            expect(result).toHaveLength(1);
            expect(result[0].originalFolder).toBe('Root');
        });

        it('should skip lines without links', () => {
            const md = '- this is just text with no link\n- [Link](https://link.com)';
            const result = parseMarkdown(md);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Link');
        });

        it('should handle empty markdown', () => {
            expect(parseMarkdown('')).toEqual([]);
        });
    });

    describe('Pocket format support', () => {
        const pocketHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                    <title>Pocket Export</title>
                </head>
                <body>
                    <h1>Unread</h1>
                    <ul>
                        <li><a href="https://pocket.com/item1" time_added="1490000000" tags="tech,read-later">Pocket Article 1</a></li>
                        <li><a href="javascript:alert(1)" time_added="1490000005" tags="bad">Unsafe Article</a></li>
                    </ul>
                    <h1>Read Archive</h1>
                    <ul>
                        <li><a href="https://pocket.com/item2" time_added="1490000100" tags="news">Pocket Article 2</a></li>
                    </ul>
                </body>
            </html>
        `;

        it('should parse Pocket HTML via parsePocketHtml', () => {
            const result = parsePocketHtml(pocketHtml);
            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Pocket Article 1');
            expect(result[0].url).toBe('https://pocket.com/item1');
            expect(result[0].originalFolder).toBe('Unread');
            expect(result[0].tags).toEqual(['tech', 'read-later']);
            expect(result[0].addDate).toBe(1490000000);

            expect(result[1].title).toBe('Pocket Article 2');
            expect(result[1].originalFolder).toBe('Read Archive');
            expect(result[1].tags).toEqual(['news']);
            expect(result[1].addDate).toBe(1490000100);
        });

        it('should auto-detect Pocket HTML in parseBookmarks', () => {
            const result = parseBookmarks(pocketHtml);
            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Pocket Article 1');
            expect(result[0].originalFolder).toBe('Unread');
        });

        it('should handle Pocket HTML without categories fallback', () => {
            const flatHtml = `
                <html>
                <body>
                    <ul>
                        <li><a href="https://pocket.com/flat" time_added="1500000000" tags="flat">Flat Item</a></li>
                    </ul>
                </body>
                </html>
            `;
            const result = parsePocketHtml(flatHtml);
            expect(result).toHaveLength(1);
            expect(result[0].originalFolder).toBe('Pocket');
            expect(result[0].tags).toEqual(['flat']);
        });

        it('should parse Pocket JSON with dictionary list', () => {
            const pocketJson = JSON.stringify({
                status: 1,
                list: {
                    "101": {
                        item_id: "101",
                        resolved_url: "https://resolved.com/1",
                        given_url: "https://given.com/1",
                        resolved_title: "Resolved Title",
                        time_added: "1550000000",
                        tags: { "ai": {}, "deepmind": {} },
                        excerpt: "Article excerpt summary",
                        status: "0"
                    },
                    "102": {
                        item_id: "102",
                        given_url: "https://archived.com/2",
                        given_title: "Archived Title",
                        time_added: "1550000100",
                        tags: ["archive-tag"],
                        status: "1"
                    }
                }
            });

            const result = parsePocketJson(pocketJson);
            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Resolved Title');
            expect(result[0].url).toBe('https://resolved.com/1');
            expect(result[0].tags).toEqual(['ai', 'deepmind']);
            expect(result[0].note).toBe('Article excerpt summary');
            expect(result[0].originalFolder).toBe('Unread');
            expect(result[0].addDate).toBe(1550000000);

            expect(result[1].title).toBe('Archived Title');
            expect(result[1].url).toBe('https://archived.com/2');
            expect(result[1].originalFolder).toBe('Read Archive');
        });

        it('should auto-detect Pocket JSON in parseJson', () => {
            const pocketJson = JSON.stringify({
                list: {
                    "1": {
                        resolved_url: "https://auto.com",
                        resolved_title: "Auto Pocket",
                        tags: "pocket,auto",
                        status: "0"
                    }
                }
            });
            const result = parseJson(pocketJson);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Auto Pocket');
            expect(result[0].tags).toEqual(['pocket', 'auto']);
        });
    });

    describe('Raindrop format support', () => {
        it('should parse Raindrop CSV with standard Raindrop columns', () => {
            const raindropCsv = [
                'id,title,note,excerpt,url,folder,tags,created',
                '12345,"Raindrop Item 1","My user note","Excerpt text","https://raindrop.io/1","Design","ui, ux, web","2023-08-15T10:30:00.000Z"',
                '12346,"Raindrop Item 2","","Snippet description","https://raindrop.io/2","Development","dev react","2024-01-01T00:00:00.000Z"'
            ].join('\n');

            const result = parseRaindropCsv(raindropCsv);
            expect(result).toHaveLength(2);

            expect(result[0].title).toBe('Raindrop Item 1');
            expect(result[0].url).toBe('https://raindrop.io/1');
            expect(result[0].originalFolder).toBe('Design');
            expect(result[0].tags).toEqual(['ui', 'ux', 'web']);
            expect(result[0].note).toContain('My user note');
            expect(result[0].note).toContain('Excerpt text');
            expect(result[0].addDate).toBe(Math.floor(new Date('2023-08-15T10:30:00.000Z').getTime() / 1000));

            expect(result[1].title).toBe('Raindrop Item 2');
            expect(result[1].tags).toEqual(['dev', 'react']);
            expect(result[1].note).toBe('Snippet description');
        });

        it('should auto-detect Raindrop CSV columns in parseCsv', () => {
            const raindropCsv = 'id,title,note,excerpt,url,folder,tags,created\n1,"Item","","","https://test.com","Folder","t1","2023-01-01"';
            const result = parseCsv(raindropCsv);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Item');
            expect(result[0].url).toBe('https://test.com');
            expect(result[0].originalFolder).toBe('Folder');
        });

        it('should parse Raindrop JSON with items wrapper', () => {
            const raindropJson = JSON.stringify({
                items: [
                    {
                        title: 'Raindrop JSON Item',
                        link: 'https://raindrop.io/item',
                        note: 'Personal note',
                        excerpt: 'Excerpt summary',
                        collection: { title: 'Reading' },
                        tags: ['reading', 'books'],
                        created: '2023-05-20T12:00:00.000Z'
                    }
                ]
            });

            const result = parseRaindropJson(raindropJson);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Raindrop JSON Item');
            expect(result[0].url).toBe('https://raindrop.io/item');
            expect(result[0].originalFolder).toBe('Reading');
            expect(result[0].tags).toEqual(['reading', 'books']);
            expect(result[0].note).toContain('Personal note');
            expect(result[0].note).toContain('Excerpt summary');
        });

        it('should auto-detect Raindrop JSON in parseJson', () => {
            const raindropJson = JSON.stringify([
                {
                    title: 'Array Raindrop',
                    link: 'https://raindrop.io/array',
                    collection: 'Articles',
                    tags: ['art1']
                }
            ]);
            const result = parseJson(raindropJson);
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Array Raindrop');
            expect(result[0].url).toBe('https://raindrop.io/array');
            expect(result[0].originalFolder).toBe('Articles');
        });
    });

    describe('Pinboard format support', () => {
        const pinboardJson = JSON.stringify([
            {
                href: 'https://pinboard.in/item1',
                description: 'Pinboard Link 1',
                extended: 'Detailed note from Pinboard',
                meta: 'meta-hash',
                hash: '123',
                time: '2022-04-10T15:20:00Z',
                shared: 'yes',
                toread: 'no',
                tags: 'pinboard tools web-development'
            },
            {
                href: 'https://pinboard.in/toread',
                description: 'To Read Bookmark',
                extended: '',
                time: '2022-04-11T12:00:00Z',
                toread: 'yes',
                tags: 'reading'
            },
            {
                href: 'javascript:alert(1)',
                description: 'Unsafe Pinboard',
                extended: '',
                time: '2022-04-11T12:00:00Z',
                tags: 'bad'
            }
        ]);

        it('should parse Pinboard JSON via parsePinboardJson', () => {
            const result = parsePinboardJson(pinboardJson);
            expect(result).toHaveLength(2);

            expect(result[0].title).toBe('Pinboard Link 1');
            expect(result[0].url).toBe('https://pinboard.in/item1');
            expect(result[0].note).toBe('Detailed note from Pinboard');
            expect(result[0].tags).toEqual(['pinboard', 'tools', 'web-development']);
            expect(result[0].originalFolder).toBe('Pinboard');
            expect(result[0].addDate).toBe(Math.floor(new Date('2022-04-10T15:20:00Z').getTime() / 1000));

            expect(result[1].title).toBe('To Read Bookmark');
            expect(result[1].originalFolder).toBe('To Read');
            expect(result[1].tags).toEqual(['reading']);
        });

        it('should auto-detect Pinboard JSON in parseJson', () => {
            const result = parseJson(pinboardJson);
            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Pinboard Link 1');
            expect(result[1].originalFolder).toBe('To Read');
        });
    });
});

