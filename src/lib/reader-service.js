import { db } from '../db/schema';
import { fetchFeedXmlRaw } from './rss-service';

const READER_PREFS_KEY = 'booksmart_reader_preferences';

export const DEFAULT_READER_PREFS = {
    theme: 'light', // 'light' | 'dark' | 'sepia'
    font: 'serif',  // 'serif' | 'sans' | 'mono'
    fontSize: 18,   // 14 - 24
    lineHeight: 'relaxed' // 'normal' | 'relaxed'
};

/**
 * Returns saved reader typography & theme preferences.
 */
export function getReaderPreferences() {
    if (typeof localStorage === 'undefined') return DEFAULT_READER_PREFS;
    try {
        const stored = localStorage.getItem(READER_PREFS_KEY);
        if (stored) {
            return { ...DEFAULT_READER_PREFS, ...JSON.parse(stored) };
        }
    } catch {
        // Fall back to default
    }
    return DEFAULT_READER_PREFS;
}

/**
 * Persists reader typography & theme preferences.
 */
export function setReaderPreferences(prefs) {
    if (typeof localStorage === 'undefined') return;
    try {
        const current = getReaderPreferences();
        const merged = { ...current, ...prefs };
        localStorage.setItem(READER_PREFS_KEY, JSON.stringify(merged));
    } catch {
        // Ignored
    }
}

/**
 * Calculates estimated reading time based on word count.
 * Average reading speed: 200 words per minute.
 */
export function calculateReadingTime(textOrWords, wpm = 200) {
    let wordCount = 0;
    if (typeof textOrWords === 'number') {
        wordCount = textOrWords;
    } else if (typeof textOrWords === 'string') {
        wordCount = textOrWords.trim().split(/\s+/).filter(Boolean).length;
    }
    const minutes = Math.max(1, Math.ceil(wordCount / wpm));
    return {
        wordCount,
        minutes
    };
}

/**
 * Formats reading time string (e.g. "5 dk okuma" or "5 min read").
 */
export function formatReadingTime(minutes, t = null) {
    const min = Math.max(1, Math.round(minutes || 1));
    if (t && typeof t === 'function') {
        return t('reader.readingTimeMinutes', {
            count: min,
            defaultValue: `${min} dk okuma`
        });
    }
    return `${min} dk okuma`;
}

/**
 * Resolves potentially relative URL against base URL.
 */
function toAbsolute(href, baseUrl) {
    if (!href || typeof href !== 'string') return '';
    try {
        return new URL(href.trim(), baseUrl).href;
    } catch {
        return href;
    }
}

const UNWANTED_SELECTORS = [
    'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'applet', 'canvas', 'audio', 'video',
    'nav', 'header', 'footer', 'aside', 'form', 'svg', 'button', 'input', 'textarea', 'select', 'base',
    '.ad', '.ads', '.advertisement', '.ad-banner', '.advert',
    '.cookie', '.cookie-banner', '.cookie-notice', '#cookie-banner',
    '.social-share', '.share-buttons', '.share-bar', '.social-links',
    '.comments', '#comments', '.disqus', '#disqus_thread',
    '.newsletter-signup', '.subscribe-box', '.popup', '.modal',
    '.sidebar', '#sidebar', '.widget', '.related-posts', '.recommended'
];

const CONTENT_CONTAINER_SELECTORS = [
    'article',
    '[role="article"]',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.article__content',
    '.story-body',
    '.article-body',
    '#article-body',
    '.markdown-body',
    '.prose',
    'main',
    '#main',
    '#content'
];

/**
 * Cleans an element by removing unwanted tags, attributes, and sanitizing links & images.
 */
function cleanContentElement(element, baseUrl) {
    const clone = element.cloneNode(true);

    // Remove unwanted sub-elements
    for (const selector of UNWANTED_SELECTORS) {
        const matches = clone.querySelectorAll(selector);
        matches.forEach(el => el.remove());
    }

    // Whitelist semantic tags and clean attributes
    const allElems = clone.querySelectorAll('*');
    allElems.forEach(el => {
        // Strip event handlers and inline styles
        Array.from(el.attributes).forEach(attr => {
            const attrName = attr.name.toLowerCase();
            if (attrName.startsWith('on') || attrName === 'style' || attrName === 'class' || attrName === 'id') {
                el.removeAttribute(attr.name);
            }
        });

        // Resolve absolute links & prevent javascript: / untrusted protocols
        if (el.tagName === 'A') {
            const href = el.getAttribute('href');
            if (href) {
                const absHref = toAbsolute(href, baseUrl);
                if (/^https?:\/\//i.test(absHref) || /^mailto:/i.test(absHref)) {
                    el.setAttribute('href', absHref);
                    el.setAttribute('target', '_blank');
                    el.setAttribute('rel', 'noopener noreferrer');
                } else {
                    el.removeAttribute('href');
                }
            }
        }

        // Resolve absolute images & add lazy loading
        if (el.tagName === 'IMG') {
            const src = el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-original');
            if (src && !src.startsWith('data:')) {
                const absSrc = toAbsolute(src, baseUrl);
                if (/^https?:\/\//i.test(absSrc)) {
                    el.setAttribute('src', absSrc);
                    el.setAttribute('loading', 'lazy');
                    el.classList.add('rounded-lg', 'max-w-full', 'h-auto', 'my-4', 'shadow-xs');
                } else {
                    el.remove();
                }
            } else if (!src) {
                el.remove();
            }
        }
    });

    return clone;
}

/**
 * Extracts reader-friendly article data and clean HTML from webpage HTML.
 */
export function extractArticleFromHtml(html, url) {
    if (!html || typeof html !== 'string') {
        throw new Error('Invalid HTML content');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Metadata Extraction
    const getMeta = (propNames) => {
        for (const name of propNames) {
            const el = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
            if (el && el.getAttribute('content')) {
                return el.getAttribute('content').trim();
            }
        }
        return '';
    };

    const title = getMeta(['og:title', 'twitter:title']) ||
        doc.querySelector('h1')?.textContent?.trim() ||
        doc.querySelector('title')?.textContent?.trim() ||
        'Untitled Article';

    const byline = getMeta(['author', 'article:author', 'twitter:creator']) ||
        doc.querySelector('[rel="author"], .author, .byline')?.textContent?.trim() ||
        '';

    const publishedTime = getMeta(['article:published_time', 'date', 'pubdate']) ||
        doc.querySelector('time')?.getAttribute('datetime') ||
        doc.querySelector('time')?.textContent?.trim() ||
        '';

    const leadImage = toAbsolute(getMeta(['og:image', 'twitter:image']), url) || '';

    let siteName = getMeta(['og:site_name']) || '';
    if (!siteName && url) {
        try {
            siteName = new URL(url).hostname.replace(/^www\./, '');
        } catch {
            siteName = '';
        }
    }

    // 2. Main Content Container Detection
    let mainContainer = null;
    for (const selector of CONTENT_CONTAINER_SELECTORS) {
        const found = doc.querySelector(selector);
        if (found && found.textContent.trim().length > 250) {
            mainContainer = found;
            break;
        }
    }

    // Fallback: Score div/section blocks by paragraph density
    if (!mainContainer) {
        let bestCandidate = null;
        let bestScore = 0;
        const candidates = doc.querySelectorAll('div, section, main, body');

        candidates.forEach(cand => {
            const pCount = cand.querySelectorAll('p').length;
            const textLen = cand.textContent.trim().length;
            if (pCount > 0 && textLen > 200) {
                // Link density penalty
                const linkLen = Array.from(cand.querySelectorAll('a'))
                    .reduce((acc, a) => acc + a.textContent.length, 0);
                const linkDensity = textLen > 0 ? (linkLen / textLen) : 1;

                if (linkDensity < 0.5) {
                    const score = textLen * (1 - linkDensity) * (pCount * 1.5);
                    if (score > bestScore) {
                        bestScore = score;
                        bestCandidate = cand;
                    }
                }
            }
        });

        mainContainer = bestCandidate || doc.body;
    }

    // Clean and extract HTML
    const cleanedContainer = cleanContentElement(mainContainer || doc.body, url);
    const contentHtml = cleanedContainer.innerHTML.trim();
    const textContent = cleanedContainer.textContent.replace(/\s+/g, ' ').trim();

    const { wordCount, minutes: readingTimeMinutes } = calculateReadingTime(textContent);

    return {
        url,
        title,
        byline,
        publishedTime,
        leadImage,
        siteName,
        contentHtml,
        textContent,
        wordCount,
        readingTimeMinutes,
        savedAt: Date.now()
    };
}

/**
 * Fetches an article by URL, extracts its reader view, and caches in IndexedDB.
 */
export async function fetchAndExtractArticle(url, { bookmarkId = null, forceRefresh = false, timeoutMs = 12000 } = {}) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
        throw new Error('Invalid article URL');
    }

    const cleanUrl = url.trim();

    // Check cached article in Dexie if not forcing refresh
    if (!forceRefresh) {
        try {
            const cached = await db.readerArticles.get(cleanUrl);
            if (cached && cached.contentHtml) {
                return cached;
            }
        } catch {
            // Table might not exist in older tests or empty
        }
    }

    // Fetch HTML text (Companion extension bypasses CORS serverlessly)
    const html = await fetchFeedXmlRaw(cleanUrl, timeoutMs);
    const article = extractArticleFromHtml(html, cleanUrl);
    article.bookmarkId = bookmarkId;

    // Cache into IndexedDB
    try {
        await db.readerArticles.put(article);

        // Update bookmark's readingTimeMinutes if bookmark exists
        if (bookmarkId) {
            await db.bookmarks.update(bookmarkId, { readingTimeMinutes: article.readingTimeMinutes });
        } else {
            const match = await db.bookmarks.where('url').equals(cleanUrl).first();
            if (match) {
                await db.bookmarks.update(match.id, { readingTimeMinutes: article.readingTimeMinutes });
            }
        }
    } catch (dbErr) {
        console.warn('[Reader] Failed to cache article in DB:', dbErr.message);
    }

    return article;
}

/**
 * Saves a reader article into the user's BookSmart bookmarks under 'Okuma Listesi'.
 */
export async function saveArticleToBookmarks(article, targetFolder = 'Okuma Listesi') {
    if (!article || !article.url) return null;

    const newBookmark = {
        title: article.title || 'Okuma Listesi Makalesi',
        url: article.url,
        originalFolder: targetFolder,
        newFolder: targetFolder,
        tags: ['read-later', 'reader'],
        ruleTags: [],
        readingTimeMinutes: article.readingTimeMinutes || 1,
        addDate: Math.floor(Date.now() / 1000),
        note: `Okuma Süresi: ~${article.readingTimeMinutes} dk (${article.wordCount} kelime)`,
        status: 'unchanged'
    };

    const id = await db.bookmarks.add(newBookmark);
    newBookmark.id = id;

    // Link back to cached article
    try {
        await db.readerArticles.update(article.url, { bookmarkId: id });
    } catch {
        // Ignored
    }

    return newBookmark;
}
