import { db } from '../../db/schema';

/**
 * Exports all subscribed feeds to an OPML 2.0 XML string.
 */
export async function exportFeedsToOpml() {
    const feeds = await db.feeds.toArray();
    const dateStr = new Date().toUTCString();
    let opml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    opml += `<opml version="2.0">\n`;
    opml += `  <head>\n`;
    opml += `    <title>BookSmart RSS Subscriptions</title>\n`;
    opml += `    <dateCreated>${dateStr}</dateCreated>\n`;
    opml += `  </head>\n`;
    opml += `  <body>\n`;
    for (const feed of feeds) {
        const title = (feed.title || '').replace(/"/g, '&quot;');
        const feedUrl = (feed.feedUrl || '').replace(/"/g, '&quot;');
        const siteUrl = (feed.siteUrl || feed.feedUrl || '').replace(/"/g, '&quot;');
        opml += `    <outline type="rss" text="${title}" title="${title}" xmlUrl="${feedUrl}" htmlUrl="${siteUrl}"/>\n`;
    }
    opml += `  </body>\n`;
    opml += `</opml>`;
    return opml;
}

/**
 * Imports feeds from an OPML XML string.
 * @param {string} opmlStr
 * @param {Function} subscribeFn - The subscribeToFeed implementation
 */
export async function importFeedsFromOpml(opmlStr, subscribeFn) {
    if (!opmlStr || typeof opmlStr !== 'string') {
        throw new Error('Invalid OPML content');
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(opmlStr, 'application/xml');
    const outlines = Array.from(doc.querySelectorAll('outline[xmlUrl], outline[xmlurl]'));

    let importedCount = 0;
    const errors = [];
    for (const outline of outlines) {
        const feedUrl = outline.getAttribute('xmlUrl') || outline.getAttribute('xmlurl');
        if (!feedUrl) continue;
        try {
            await subscribeFn(null, feedUrl);
            importedCount++;
        } catch (err) {
            errors.push({ feedUrl, error: err.message });
        }
    }
    return { total: outlines.length, importedCount, errors };
}
