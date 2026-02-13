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
