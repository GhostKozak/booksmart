import { generateUUID, isSafeUrl } from './utils';

/**
 * Parses a Pocket HTML export file (ril_export.html).
 * Structure: <h1>Category</h1> followed by <ul><li><a href="..." time_added="..." tags="...">Title</a></li></ul>
 *
 * @param {string} htmlContent - The Pocket HTML export content.
 * @returns {Array} - Array of bookmark objects.
 */
export const parsePocketHtml = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== 'string') return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const bookmarks = [];

    const headings = doc.querySelectorAll('h1, h2, h3');
    if (headings.length > 0) {
        headings.forEach(heading => {
            const folderName = heading.textContent.trim() || 'Pocket';
            let next = heading.nextElementSibling;
            while (next && next.tagName !== 'UL' && !['H1', 'H2', 'H3'].includes(next.tagName)) {
                next = next.nextElementSibling;
            }

            if (next && next.tagName === 'UL') {
                const links = next.querySelectorAll('a');
                links.forEach(a => {
                    const href = a.getAttribute('href') || a.href;
                    if (!href || !isSafeUrl(href)) return;

                    const timeAdded = a.getAttribute('time_added');
                    let addDate = Math.floor(Date.now() / 1000);
                    if (timeAdded) {
                        const parsedTime = parseInt(timeAdded, 10);
                        if (!isNaN(parsedTime)) {
                            addDate = parsedTime;
                        }
                    }

                    const tagsAttr = a.getAttribute('tags');
                    const tags = tagsAttr ? tagsAttr.split(',').map(t => t.trim()).filter(Boolean) : [];

                    bookmarks.push({
                        id: generateUUID(),
                        title: a.textContent.trim() || href,
                        url: href,
                        addDate,
                        tags,
                        originalFolder: folderName,
                        newFolder: folderName,
                        note: '',
                        status: 'unchanged'
                    });
                });
            }
        });
    }

    // Fallback if no bookmarks found through headings (e.g. flat UL list or direct links)
    if (bookmarks.length === 0) {
        const links = doc.querySelectorAll('a');
        links.forEach(a => {
            const href = a.getAttribute('href') || a.href;
            if (!href || !isSafeUrl(href)) return;

            const timeAdded = a.getAttribute('time_added');
            let addDate = Math.floor(Date.now() / 1000);
            if (timeAdded) {
                const parsedTime = parseInt(timeAdded, 10);
                if (!isNaN(parsedTime)) {
                    addDate = parsedTime;
                }
            }

            const tagsAttr = a.getAttribute('tags');
            const tags = tagsAttr ? tagsAttr.split(',').map(t => t.trim()).filter(Boolean) : [];

            bookmarks.push({
                id: generateUUID(),
                title: a.textContent.trim() || href,
                url: href,
                addDate,
                tags,
                originalFolder: 'Pocket',
                newFolder: 'Pocket',
                note: '',
                status: 'unchanged'
            });
        });
    }

    return bookmarks;
};

/**
 * Parses a Netscape Bookmark HTML content string.
 * Auto-detects and handles Pocket HTML exports as well.
 * 
 * @param {string} htmlContent - The HTML content of the bookmarks file.
 * @returns {Array} - Array of bookmark objects.
 */
export const parseBookmarks = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== 'string') return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Detect Pocket HTML format
    const titleText = (doc.title || '').toLowerCase();
    const isPocket = titleText.includes('pocket export') ||
        (!doc.querySelector('dl') && doc.querySelector('h1') && doc.querySelector('a[time_added]'));

    if (isPocket) {
        return parsePocketHtml(htmlContent);
    }

    const bookmarks = [];

    const traverse = (node, folderPath = []) => {
        const children = Array.from(node.children);

        children.forEach(child => {
            // Check for Folder (H3)
            if (child.tagName === 'DT') {
                const h3 = child.querySelector('h3');
                const dl = child.querySelector('dl');

                if (h3 && dl) {
                    const folderName = h3.textContent;
                    traverse(dl, [...folderPath, folderName]);
                } else {
                    // Check for Link (A) inside DT
                    const a = child.querySelector('a');
                    if (a) {
                        const href = a.href;
                        // Skip dangerous URL schemes
                        if (!isSafeUrl(href)) return;

                        // Check for <DD> note — it's the next sibling of this DT
                        let note = '';
                        const nextSibling = child.nextElementSibling;
                        if (nextSibling && nextSibling.tagName === 'DD') {
                            note = nextSibling.textContent.trim();
                        }

                        bookmarks.push({
                            id: generateUUID(),
                            title: a.textContent,
                            url: href,
                            addDate: a.getAttribute('add_date'),
                            icon: a.getAttribute('icon'),
                            tags: a.getAttribute('tags') ? a.getAttribute('tags').split(',').map(t => t.trim()) : [],
                            originalFolder: folderPath.join(' > ') || 'Root',
                            newFolder: folderPath.join(' > ') || 'Root',
                            note,
                            status: 'unchanged'
                        });
                    }
                }
            }
            // Direct DL children
            else if (child.tagName === 'DL') {
                traverse(child, folderPath);
            }
        });
    };

    // Start traversing from the main DL usually found in body
    const rootDl = doc.querySelector('dl');
    if (rootDl) {
        traverse(rootDl);
    } else {
        traverse(doc.body);
    }

    // If standard Netscape traversal found no bookmarks, check if it's Pocket HTML without title tag
    if (bookmarks.length === 0 && doc.querySelector('a')) {
        const pocketFallback = parsePocketHtml(htmlContent);
        if (pocketFallback.length > 0) {
            return pocketFallback;
        }
    }

    return bookmarks;
};

/**
 * Parses Pocket JSON format ({ list: { ... } } or array).
 */
export const parsePocketJson = (jsonContent) => {
    try {
        const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
        if (!data) return [];
        const list = data.list ? Object.values(data.list) : (Array.isArray(data) ? data : []);
        const bookmarks = [];

        for (const item of list) {
            if (!item || typeof item !== 'object') continue;
            const url = item.resolved_url || item.given_url || item.url;
            if (!url || !isSafeUrl(url)) continue;

            const title = item.resolved_title || item.given_title || item.title || url;
            let tags = [];
            if (item.tags) {
                if (Array.isArray(item.tags)) {
                    tags = item.tags.map(String).filter(Boolean);
                } else if (typeof item.tags === 'object') {
                    tags = Object.keys(item.tags);
                } else if (typeof item.tags === 'string') {
                    tags = item.tags.split(',').map(t => t.trim()).filter(Boolean);
                }
            }

            let addDate = Math.floor(Date.now() / 1000);
            if (item.time_added) {
                const t = parseInt(item.time_added, 10);
                if (!isNaN(t)) addDate = t;
            }

            const folder = item.status === '1' ? 'Read Archive' : (item.folder || 'Unread');
            const note = item.excerpt || item.note || '';

            bookmarks.push({
                id: item.id || generateUUID(),
                title,
                url,
                addDate,
                tags,
                originalFolder: folder,
                newFolder: folder,
                note,
                status: 'unchanged'
            });
        }
        return bookmarks;
    } catch (e) {
        console.error("Failed to parse Pocket JSON", e);
        return [];
    }
};

/**
 * Parses Raindrop.io JSON format ({ items: [...] } or array of Raindrop bookmarks).
 */
export const parseRaindropJson = (jsonContent) => {
    try {
        const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
        if (!data) return [];
        const items = Array.isArray(data) ? data : (data.items && Array.isArray(data.items) ? data.items : []);
        const bookmarks = [];

        for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            const url = item.link || item.url;
            if (!url || !isSafeUrl(url)) continue;

            const title = item.title || url;
            const folder = (typeof item.collection === 'object' ? item.collection?.title : item.collection) || item.folder || 'Root';

            let tags = [];
            if (Array.isArray(item.tags)) {
                tags = item.tags.map(String).filter(Boolean);
            } else if (typeof item.tags === 'string') {
                tags = item.tags.includes(',')
                    ? item.tags.split(',').map(t => t.trim()).filter(Boolean)
                    : item.tags.split(/\s+/).map(t => t.trim()).filter(Boolean);
            }

            let note = item.note || '';
            if (item.excerpt && !note.includes(item.excerpt)) {
                note = note ? `${note}\n\n${item.excerpt}` : item.excerpt;
            }

            let addDate = Math.floor(Date.now() / 1000);
            const dateStr = item.created || item.created_at || item.addDate;
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    addDate = Math.floor(d.getTime() / 1000);
                }
            }

            bookmarks.push({
                id: item.id || generateUUID(),
                title,
                url,
                addDate,
                tags,
                originalFolder: folder,
                newFolder: folder,
                note,
                status: 'unchanged'
            });
        }
        return bookmarks;
    } catch (e) {
        console.error("Failed to parse Raindrop JSON", e);
        return [];
    }
};

/**
 * Parses Pinboard JSON format (array of { href, description, extended, tags, time, toread }).
 */
export const parsePinboardJson = (jsonContent) => {
    try {
        const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
        if (!data || !Array.isArray(data)) return [];
        const bookmarks = [];

        for (const item of data) {
            if (!item || typeof item !== 'object') continue;
            const url = item.href || item.url;
            if (!url || !isSafeUrl(url)) continue;

            const title = item.description || item.title || url;
            const note = item.extended || item.note || '';

            let tags = [];
            if (typeof item.tags === 'string') {
                // Pinboard tags are space-delimited
                tags = item.tags.includes(',')
                    ? item.tags.split(',').map(t => t.trim()).filter(Boolean)
                    : item.tags.split(/\s+/).map(t => t.trim()).filter(Boolean);
            } else if (Array.isArray(item.tags)) {
                tags = item.tags.map(String).filter(Boolean);
            }

            let addDate = Math.floor(Date.now() / 1000);
            if (item.time) {
                const d = new Date(item.time);
                if (!isNaN(d.getTime())) {
                    addDate = Math.floor(d.getTime() / 1000);
                }
            }

            const folder = item.toread === 'yes' ? 'To Read' : (item.folder || 'Pinboard');

            bookmarks.push({
                id: item.id || generateUUID(),
                title,
                url,
                addDate,
                tags,
                originalFolder: folder,
                newFolder: folder,
                note,
                status: 'unchanged'
            });
        }
        return bookmarks;
    } catch (e) {
        console.error("Failed to parse Pinboard JSON", e);
        return [];
    }
};

/**
 * Parses JSON content with auto-detection for Pocket, Raindrop, Pinboard, and standard BookSmart formats.
 */
export const parseJson = (jsonContent) => {
    try {
        const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
        if (!data) return [];

        // 1. Pocket JSON format: { list: { ... } }
        if (typeof data === 'object' && !Array.isArray(data) && data.list && typeof data.list === 'object') {
            return parsePocketJson(data);
        }

        // 2. Raindrop JSON format wrapper: { items: [...] }
        if (typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.items)) {
            return parseRaindropJson(data);
        }

        // 3. Array of items
        if (Array.isArray(data)) {
            if (data.length === 0) return [];

            // Detect Pinboard format: elements have href and (description or extended or toread)
            const isPinboard = data.some(b => b && typeof b === 'object' && b.href !== undefined && (b.description !== undefined || b.extended !== undefined || b.toread !== undefined));
            if (isPinboard) {
                return parsePinboardJson(data);
            }

            // Detect Raindrop array format: elements have link or collection
            const isRaindrop = data.some(b => b && typeof b === 'object' && (b.link !== undefined || b.collection !== undefined));
            if (isRaindrop) {
                return parseRaindropJson(data);
            }

            // Standard BookSmart JSON format
            return data
                .filter(b => b && isSafeUrl(b.url))
                .map(b => ({
                    ...b,
                    id: b.id || generateUUID(),
                    note: b.note || '',
                    status: 'unchanged'
                }));
        }
        return [];
    } catch (e) {
        console.error("Failed to parse JSON", e);
        return [];
    }
};

/**
 * Parse a single CSV line respecting RFC 4180 quoting rules.
 * Handles quoted fields with commas, escaped quotes (""), and empty fields.
 */
export function parseCsvLine(line) {
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    parts.push(current);

    return parts;
}

/**
 * Parse entire CSV content respecting RFC 4180 quotes across multiple lines.
 */
function parseCsvRows(csvContent) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvContent.length; i++) {
        const char = csvContent[i];
        const nextChar = csvContent[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentField += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\r') {
                if (nextChar === '\n') {
                    i++;
                }
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else if (char === '\n') {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }
    return rows;
}

/**
 * Parses CSV content with dynamic header mapping.
 * Supports BookSmart CSV, Raindrop.io CSV, and arbitrary column orders.
 */
export const parseCsv = (csvContent) => {
    if (!csvContent || typeof csvContent !== 'string') return [];

    const lines = parseCsvRows(csvContent);
    if (!lines || lines.length === 0) return [];

    const clean = (str) => {
        if (!str) return '';
        return str.replace(/""/g, '"').trim();
    };

    const firstRow = lines[0].map(c => clean(c).toLowerCase());
    const hasValidUrlInFirstRow = firstRow.some(col => col.startsWith('http://') || col.startsWith('https://'));
    const hasHeader = !hasValidUrlInFirstRow && firstRow.some(col =>
        ['title', 'name', 'url', 'link', 'href', 'folder', 'collection', 'tags', 'created', 'date'].includes(col)
    );

    let titleIdx = 0;
    let urlIdx = 1;
    let folderIdx = 2;
    let tagsIdx = 3;
    let dateIdx = 4;
    let noteIdx = 5;
    let excerptIdx = -1;
    let startRow = 0;

    if (hasHeader) {
        startRow = 1;
        titleIdx = firstRow.findIndex(c => c === 'title' || c === 'name');
        urlIdx = firstRow.findIndex(c => c === 'url' || c === 'link' || c === 'href');
        folderIdx = firstRow.findIndex(c => c === 'folder' || c === 'collection' || c === 'category');
        tagsIdx = firstRow.findIndex(c => c === 'tags' || c === 'tag');
        dateIdx = firstRow.findIndex(c =>
            c === 'created' || c === 'created_at' || c === 'date' || c === 'date added' || c === 'time' || c === 'time_added'
        );
        noteIdx = firstRow.findIndex(c => c === 'note' || c === 'notes' || c === 'description');
        excerptIdx = firstRow.findIndex(c => c === 'excerpt');

        if (titleIdx === -1 && urlIdx === -1) {
            titleIdx = 0;
            urlIdx = 1;
        } else if (titleIdx === -1) {
            titleIdx = urlIdx === 0 ? 1 : 0;
        } else if (urlIdx === -1) {
            urlIdx = titleIdx === 0 ? 1 : 0;
        }
    }

    const bookmarks = [];

    for (let i = startRow; i < lines.length; i++) {
        const parts = lines[i];
        if (!parts || parts.length < 2 || parts.every(p => !clean(p))) continue;

        const url = urlIdx !== -1 && parts[urlIdx] !== undefined ? clean(parts[urlIdx]) : '';
        if (!url || !isSafeUrl(url)) continue;

        const title = titleIdx !== -1 && parts[titleIdx] !== undefined ? clean(parts[titleIdx]) : '';
        const folder = (folderIdx !== -1 && parts[folderIdx] !== undefined ? clean(parts[folderIdx]) : '') || 'Root';

        let tags = [];
        if (tagsIdx !== -1 && parts[tagsIdx] !== undefined) {
            const rawTags = clean(parts[tagsIdx]);
            if (rawTags) {
                tags = rawTags.includes(',')
                    ? rawTags.split(',').map(t => t.trim()).filter(Boolean)
                    : rawTags.split(/\s+/).map(t => t.trim()).filter(Boolean);
            }
        }

        let note = '';
        if (noteIdx !== -1 && parts[noteIdx] !== undefined) {
            note = clean(parts[noteIdx]);
        }
        if (excerptIdx !== -1 && parts[excerptIdx] !== undefined) {
            const excerpt = clean(parts[excerptIdx]);
            if (excerpt && !note.includes(excerpt)) {
                note = note ? `${note}\n\n${excerpt}` : excerpt;
            }
        }

        let addDate = Math.floor(Date.now() / 1000);
        if (dateIdx !== -1 && parts[dateIdx] !== undefined) {
            const dateStr = clean(parts[dateIdx]);
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    addDate = Math.floor(d.getTime() / 1000);
                }
            }
        }

        bookmarks.push({
            id: generateUUID(),
            title: title || url,
            url,
            addDate,
            tags,
            originalFolder: folder,
            newFolder: folder,
            note,
            status: 'unchanged'
        });
    }

    return bookmarks;
};

/**
 * Dedicated parser for Raindrop.io CSV exports.
 */
export const parseRaindropCsv = (csvContent) => parseCsv(csvContent);

/**
 * Parses Markdown content.
 * Expected format: 
 * ## Folder Name
 * - [Title](URL) `#tag1` `#tag2`
 */
export const parseMarkdown = (mdContent) => {
    const lines = mdContent.split('\n');
    const bookmarks = [];
    let currentFolder = 'Root';

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
    const tagRegex = /`#([^`]+)`/g;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('## ')) {
            currentFolder = trimmed.substring(3).trim();
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const match = trimmed.match(linkRegex);
            if (match) {
                const title = match[1];
                const url = match[2];

                // Skip dangerous URL schemes
                if (!isSafeUrl(url)) return;

                const tags = [];
                let tagMatch;
                while ((tagMatch = tagRegex.exec(trimmed)) !== null) {
                    tags.push(tagMatch[1]);
                }

                bookmarks.push({
                    id: generateUUID(),
                    title,
                    url,
                    addDate: Math.floor(Date.now() / 1000), // Markdown usually doesn't have dates, default to now
                    tags,
                    originalFolder: currentFolder,
                    newFolder: currentFolder,
                    status: 'unchanged'
                });
            }
        }
    });

    return bookmarks;
};

