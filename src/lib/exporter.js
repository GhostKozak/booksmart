/**
 * Exports bookmarks to Netscape HTML format.
 * Reconstructs the folder structure based on 'newFolder' property.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The HTML string.
 */
/**
 * Escapes HTML entities to prevent XSS in exported content.
 * @param {string} str - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export const exportBookmarks = (bookmarks) => {
    // 1. Initialize Root Node
    const root = {
        __bookmarks__: [],
        __subfolders__: {}
    };

    // 2. Build Tree Structure
    bookmarks.forEach(b => {
        const folder = b.newFolder || b.originalFolder;
        // Handle explicit Root items or missing folder
        if (!folder || folder === 'Root') {
            root.__bookmarks__.push(b);
            return;
        }

        const folderPath = folder.split(' > ');
        let currentLevel = root;

        folderPath.forEach((folder, index) => {
            // Ensure folder node exists
            if (!currentLevel.__subfolders__[folder]) {
                currentLevel.__subfolders__[folder] = {
                    __bookmarks__: [],
                    __subfolders__: {}
                };
            }

            // Move pointer
            if (index === folderPath.length - 1) {
                // We are at the target folder, add bookmark
                currentLevel.__subfolders__[folder].__bookmarks__.push(b);
            } else {
                // Dig deeper
                currentLevel = currentLevel.__subfolders__[folder];
            }
        });
    });

    // 3. Recursive Builder Function
    const buildHtml = (node, indent = '    ') => {
        let output = '';

        // A. Render Bookmarks at this level
        node.__bookmarks__.forEach(b => {
            const escapedTags = b.tags && b.tags.length > 0 ? ` TAGS="${escapeHtml(b.tags.join(','))}"` : '';
            const addDateAttr = b.addDate ? ` ADD_DATE="${escapeHtml(String(b.addDate))}"` : '';
            const iconAttr = b.icon ? ` ICON="${escapeHtml(b.icon)}"` : '';

            output += `${indent}<DT><A HREF="${escapeHtml(b.url)}"${addDateAttr}${iconAttr}${escapedTags}>${escapeHtml(b.title)}</A>\n`;
            if (b.note) {
                output += `${indent}<DD>${escapeHtml(b.note)}\n`;
            }
        });

        // B. Render Subfolders
        for (const [folderName, subNode] of Object.entries(node.__subfolders__)) {
            output += `${indent}<DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}">${escapeHtml(folderName)}</H3>\n`;
            output += `${indent}<DL><p>\n`;

            // Recurse
            output += buildHtml(subNode, indent + '    ');

            output += `${indent}</DL><p>\n`;
        }

        return output;
    };

    // 4. Construct Final HTML
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

    html += buildHtml(root); // Start building from root
    html += `</DL><p>`;

    return html;
};

/**
 * Exports bookmarks to JSON format.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The JSON string.
 */
export const exportToJson = (bookmarks) => {
    return JSON.stringify(bookmarks, null, 2);
};

/**
 * Sanitizes CSV cell against formula injection and quotes double-quotes.
 * @param {*} value
 * @returns {string}
 */
function sanitizeCsvCell(value) {
    if (value == null) return '';
    let str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
    }
    return str.replace(/"/g, '""');
}

/**
 * Exports bookmarks to CSV format.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The CSV string.
 */
export const exportToCsv = (bookmarks) => {
    const headers = ['Title', 'URL', 'Folder', 'Tags', 'Date Added', 'Note'];
    const rows = bookmarks.map(b => {
        const title = sanitizeCsvCell(b.title);
        const url = sanitizeCsvCell(b.url);
        const folder = sanitizeCsvCell(b.newFolder || b.originalFolder || 'Root');
        const tags = sanitizeCsvCell((b.tags || []).join(','));
        const rawDate = parseInt(b.addDate, 10);
        let date = '';
        if (!isNaN(rawDate) && rawDate > 0) {
            const ms = rawDate < 1e11 ? rawDate * 1000 : rawDate;
            try {
                date = new Date(ms).toISOString();
            } catch {
                date = '';
            }
        }
        const note = sanitizeCsvCell(b.note);

        return `"${title}","${url}","${folder}","${tags}","${date}","${note}"`;
    });

    return [headers.join(','), ...rows].join('\n');
};

/**
 * Exports bookmarks to Markdown format.
 * Grouped by folder.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The Markdown string.
 */
export const exportToMarkdown = (bookmarks) => {
    const folders = {};

    bookmarks.forEach(b => {
        const folder = b.newFolder || b.originalFolder || 'Root';
        if (!folders[folder]) {
            folders[folder] = [];
        }
        folders[folder].push(b);
    });

    let md = '# Bookmarks Export\n\n';

    const sortedFolders = Object.keys(folders).sort();

    sortedFolders.forEach(folder => {
        md += `## ${folder}\n\n`;
        folders[folder].forEach(b => {
            md += `- [${b.title}](${b.url})`;
            if (b.tags && b.tags.length > 0) {
                const tagStr = b.tags.map(t => '`#' + t + '`').join(' ');
                md += ` ${tagStr}`;
            }
            md += '\n';
            if (b.note) {
                md += `  > ${b.note}\n`;
            }
        });
        md += '\n';
    });

    return md;
};

/**
 * Calculates export content, MIME type, file extension, and estimated file size.
 * 
 * @param {Array} bookmarks - Array of bookmarks to export.
 * @param {string} format - 'html' | 'json' | 'csv' | 'md'
 * @returns {Object} - { content, type, extension, bytes, estimatedSize }
 */
export const getExportPayload = (bookmarks = [], format = 'html') => {
    let content = '';
    let type = '';
    let extension = '';

    switch (format) {
        case 'json':
            content = exportToJson(bookmarks);
            type = 'application/json';
            extension = 'json';
            break;
        case 'csv':
            content = exportToCsv(bookmarks);
            type = 'text/csv';
            extension = 'csv';
            break;
        case 'md':
            content = exportToMarkdown(bookmarks);
            type = 'text/markdown';
            extension = 'md';
            break;
        case 'html':
        default:
            content = exportBookmarks(bookmarks);
            type = 'text/html';
            extension = 'html';
            break;
    }

    const bytes = typeof Blob !== 'undefined'
        ? new Blob([content]).size
        : (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(content).length : content.length);

    let estimatedSize = `${bytes} B`;
    if (bytes >= 1024 * 1024) {
        estimatedSize = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
        estimatedSize = `${(bytes / 1024).toFixed(1)} KB`;
    }

    return { content, type, extension, bytes, estimatedSize };
};

