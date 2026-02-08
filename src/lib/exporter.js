/**
 * Exports bookmarks to Netscape HTML format.
 * Reconstructs the folder structure based on 'newFolder' property.
 * 
 * @param {Array} bookmarks - Array of bookmark objects.
 * @returns {string} - The HTML string.
 */
export const exportBookmarks = (bookmarks) => {
    // Group bookmarks by newFolder
    const structure = {};

    bookmarks.forEach(b => {
        const folderPath = b.newFolder.split(' > ');
        let currentLevel = structure;

        folderPath.forEach((folder, index) => {
            if (!currentLevel[folder]) {
                currentLevel[folder] = {
                    __bookmarks__: [],
                    __subfolders__: {}
                };
            }

            if (index === folderPath.length - 1) {
                currentLevel[folder].__bookmarks__.push(b);
            } else {
                currentLevel = currentLevel[folder].__subfolders__;
            }
        });
    });

    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
  <!-- This is an automatically generated file.
       It will be read and overwritten.
       DO NOT EDIT! -->
  <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
  <TITLE>Bookmarks</TITLE>
  <H1>Bookmarks</H1>
  <DL><p>
  `;

    const buildHtml = (levelObj, indent = '    ') => {
        let output = '';

        // Process folders at this level
        for (const [folderName, content] of Object.entries(levelObj)) {
            output += `${indent}<DT><H3 ADD_DATE="${Date.now()}">${folderName}</H3>\n`;
            output += `${indent}<DL><p>\n`;

            // Add bookmarks in this folder
            content.__bookmarks__.forEach(b => {
                const tagsAttr = b.tags && b.tags.length > 0 ? ` TAGS="${b.tags.join(',')}"` : '';
                output += `${indent}    <DT><A HREF="${b.url}" ADD_DATE="${b.addDate || ''}" ICON="${b.icon || ''}"${tagsAttr}>${b.title}</A>\n`;
            });

            // Recursively add subfolders
            if (content.__subfolders__ && Object.keys(content.__subfolders__).length > 0) {
                output += buildHtml(content.__subfolders__, indent + '    ');
            }

            output += `${indent}</DL><p>\n`;
        }
        return output;
    };

    html += buildHtml(structure);
    html += `</DL><p>`;

    return html;
};
