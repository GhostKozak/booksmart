import { KEYWORD_MAPPINGS } from '../lib/keyword-mapper';

/**
 * Auto-categorizes a list of bookmarks based on local keyword rules.
 * @param {Array} bookmarks - List of { id, title, url }
 * @returns {Object} - Map of { id: { folder, tags } }
 */
export function autoCategorizeLocal(bookmarks) {
    const results = {};

    bookmarks.forEach(bookmark => {
        const title = (bookmark.title || '').toLowerCase();
        const url = (bookmark.url || '').toLowerCase();
        const content = `${title} ${url}`;

        let bestMatch = null;
        let matchedTags = new Set();

        // Iterate through all mappings
        for (const mapping of KEYWORD_MAPPINGS) {
            const matches = mapping.keywords.some(keyword => content.includes(keyword.toLowerCase()));

            if (matches) {
                // First folder match wins as the primary category
                if (!bestMatch) {
                    bestMatch = mapping.folder;
                }
                // Accumulate all matching tags
                if (mapping.tags) {
                    mapping.tags.forEach(t => matchedTags.add(t));
                }
            }
        }

        if (bestMatch || matchedTags.size > 0) {
            results[bookmark.id] = {
                folder: bestMatch,
                tags: Array.from(matchedTags)
            };
        }
    });

    return results;
}
