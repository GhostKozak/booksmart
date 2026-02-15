/**
 * Exports bookmarks to Netscape HTML format.
 * Reconstructs the folder structure based on 'newFolder' property.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The HTML string.
 */
/**
 * Exports bookmarks to Netscape HTML format.
 * Reconstructs the folder structure based on 'newFolder' property.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The HTML string.
 */
/**
 * Exports bookmarks to Netscape HTML format.
 * Reconstructs the folder structure based on 'newFolder' property.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The HTML string.
 */
export const exportBookmarks = (bookmarks) => {
    // 1. Initialize Root Node
    const root = {
        __bookmarks__: [],
        __subfolders__: {}
    };

    // 2. Build Tree Structure
    bookmarks.forEach(b => {
        // Handle explicit Root items or missing folder
        if (!b.newFolder || b.newFolder === 'Root') {
            root.__bookmarks__.push(b);
            return;
        }

        const folderPath = b.newFolder.split(' > ');
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
            const tagsAttr = b.tags && b.tags.length > 0 ? ` TAGS="${b.tags.join(',')}"` : '';
            const addDateAttr = b.addDate ? ` ADD_DATE="${b.addDate}"` : '';
            const iconAttr = b.icon ? ` ICON="${b.icon}"` : '';

            output += `${indent}<DT><A HREF="${b.url}"${addDateAttr}${iconAttr}${tagsAttr}>${b.title}</A>\n`;
        });

        // B. Render Subfolders
        for (const [folderName, subNode] of Object.entries(node.__subfolders__)) {
            output += `${indent}<DT><H3 ADD_DATE="${Date.now()}">${folderName}</H3>\n`;
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
 * Exports bookmarks to CSV format.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The CSV string.
 */
export const exportToCsv = (bookmarks) => {
    const headers = ['Title', 'URL', 'Folder', 'Tags', 'Date Added'];
    const rows = bookmarks.map(b => {
        const title = (b.title || '').replace(/"/g, '""'); // Escape double quotes
        const url = (b.url || '').replace(/"/g, '""');
        const folder = (b.newFolder || 'Root').replace(/"/g, '""');
        const tags = (b.tags || []).join(',').replace(/"/g, '""');
        const date = b.addDate ? new Date(parseInt(b.addDate) * 1000).toISOString() : '';

        return `"${title}","${url}","${folder}","${tags}","${date}"`;
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
    // Reuse the tree building logic from HTML export basically, or simpler grouping
    // Let's do a simple grouping map for markdown

    const folders = {};

    bookmarks.forEach(b => {
        const folder = b.newFolder || 'Root';
        if (!folders[folder]) {
            folders[folder] = [];
        }
        folders[folder].push(b);
    });

    let md = '# Bookmarks Export\n\n';

    // Sort folders alphabetically, but put Root first if exists
    const sortedFolders = Object.keys(folders).sort();

    sortedFolders.forEach(folder => {
        md += `## ${folder}\n\n`;
        folders[folder].forEach(b => {
            md += `- [${b.title}](${b.url})`;
            if (b.tags && b.tags.length > 0) {
                md += ` \`#${b.tags.join(', #')}\``;
            }
            md += '\n';
        });
        md += '\n';
    });

    return md;
};
