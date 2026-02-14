import { generateUUID } from './utils';

/**
 * Parses a Netscape Bookmark HTML content string.
 * Flattens the folder structure but preserves the path.
 * 
 * @param {string} htmlContent - The HTML content of the bookmarks file.
 * @returns {Array} - Array of bookmark objects.
 */
export const parseBookmarks = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const bookmarks = [];

    const traverse = (node, folderPath = []) => {
        // If it's a folder (H3 tag usually precedes a DL)
        // In Netscape format, structure is often: <DT><H3>Folder</H3><DL>...</DL>
        // But DOMParser puts them in a structure. 
        // We iterate over children of DLs.

        // Actually, let's simply find all 'A' tags and trace back their parents to build the path.
        // But traversal is more robust for correct folder association.

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
                        bookmarks.push({
                            id: generateUUID(),
                            title: a.textContent,
                            url: a.href,
                            addDate: a.getAttribute('add_date'),
                            icon: a.getAttribute('icon'),
                            tags: a.getAttribute('tags') ? a.getAttribute('tags').split(',').map(t => t.trim()) : [],
                            originalFolder: folderPath.join(' > ') || 'Root',
                            newFolder: folderPath.join(' > ') || 'Root', // Default to original
                            status: 'unchanged'
                        });
                    }
                }
            }
            // Sometimes structure is different, handle direct DL children if valid
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
        // Fallback if no main DL found, maybe try body
        traverse(doc.body);
    }

    return bookmarks;
};

/**
 * Parses JSON content.
 * Expected format: Array of bookmark objects.
 */
export const parseJson = (jsonContent) => {
    try {
        const data = JSON.parse(jsonContent);
        if (Array.isArray(data)) {
            return data.map(b => ({
                ...b,
                id: b.id || generateUUID(),
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
 * Parses CSV content.
 * Expected headers: Title, URL, Folder, Tags, Date Added
 */
export const parseCsv = (csvContent) => {
    const lines = csvContent.split('\n');
    const bookmarks = [];

    // Simple CSV parser (doesn't handle newlines in quotes perfectly but good enough for now)
    // We assume the export format we generated: "Title","URL","Folder","Tags","Date Added"

    // Skip header likely
    const startIndex = lines[0].toLowerCase().includes('title') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Naive split by comma, but handling quotes would be better.
        // Let's use a regex for splitting CSV lines respecting quotes
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

        if (!parts || parts.length < 2) continue;

        const clean = (str) => {
            if (!str) return '';
            str = str.trim();
            if (str.startsWith('"') && str.endsWith('"')) {
                str = str.slice(1, -1);
            }
            return str.replace(/""/g, '"');
        };

        const title = clean(parts[0]);
        const url = clean(parts[1]);
        const folder = clean(parts[2]) || 'Root';
        const tags = clean(parts[3]).split(',').map(t => t.trim()).filter(Boolean);
        const dateStr = clean(parts[4]);

        // Try to parse date
        let addDate = Date.now();
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                addDate = Math.floor(d.getTime() / 1000);
            }
        }

        if (url) {
            bookmarks.push({
                id: generateUUID(),
                title: title || url,
                url,
                addDate,
                tags,
                originalFolder: folder,
                newFolder: folder,
                status: 'unchanged'
            });
        }
    }
    return bookmarks;
};

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
