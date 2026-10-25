// BookSmart Companion - Rule Classifier
// Auto-classifies URLs and pages into folders and tags using rules and smart heuristics.

const DEFAULT_DOMAIN_RULES = {
    'github.com': { folder: 'Yazılım & Kod', tags: ['dev', 'github', 'kod'] },
    'gitlab.com': { folder: 'Yazılım & Kod', tags: ['dev', 'gitlab', 'kod'] },
    'stackoverflow.com': { folder: 'Yazılım & Kod', tags: ['dev', 'soru-cevap'] },
    'youtube.com': { folder: 'Videolar', tags: ['video', 'medya'] },
    'youtu.be': { folder: 'Videolar', tags: ['video', 'medya'] },
    'vimeo.com': { folder: 'Videolar', tags: ['video'] },
    'medium.com': { folder: 'Makaleler', tags: ['okuma', 'blog'] },
    'substack.com': { folder: 'Makaleler', tags: ['bulten', 'okuma'] },
    'dev.to': { folder: 'Makaleler', tags: ['yazilim', 'blog'] },
    'reddit.com': { folder: 'Topluluk & Tartışma', tags: ['forum', 'topluluk'] },
    'news.ycombinator.com': { folder: 'Hacker News', tags: ['tech', 'haber'] },
    'twitter.com': { folder: 'Sosyal Medya', tags: ['sosyal'] },
    'x.com': { folder: 'Sosyal Medya', tags: ['sosyal'] },
    'linkedin.com': { folder: 'Kariyer & Ağ', tags: ['kariyer', 'is'] },
    'wikipedia.org': { folder: 'Referans & Bilim', tags: ['arastirma', 'ansiklopedi'] },
    'arxiv.org': { folder: 'Akademik & Makaleler', tags: ['bilim', 'arastirma', 'akademik'] },
    'amazon.': { folder: 'Alışveriş', tags: ['alisveris'] },
    'trendyol.com': { folder: 'Alışveriş', tags: ['alisveris'] },
    'hepsiburada.com': { folder: 'Alışveriş', tags: ['alisveris'] }
};

/**
 * Classifies a given URL and Title against custom user rules and fallback domain heuristics.
 * @param {string} url
 * @param {string} title
 * @param {Array} customRules - [{ type: 'keyword'|'domain'|'exact', value: string, targetFolder: string, tags: string }]
 * @returns {{ folder: string, tags: string[], matchedRule: string | null }}
 */
function classifyUrlWithRules(url, title, customRules = []) {
    if (!url) {
        return { folder: 'BookSmart', tags: [], matchedRule: null };
    }

    const safeUrl = url.trim();
    const safeTitle = (title || '').trim();
    const combinedContent = `${safeTitle} ${safeUrl}`.toLowerCase();

    let matchedFolder = null;
    let matchedRuleDesc = null;
    const collectedTags = [];

    // 1. Evaluate custom user rules first
    if (Array.isArray(customRules)) {
        for (const rule of customRules) {
            if (!rule || !rule.value) continue;
            const values = rule.value.toLowerCase().split(',').map(v => v.trim()).filter(Boolean);
            let isMatch = false;

            for (const val of values) {
                if (rule.type === 'domain') {
                    try {
                        const parsed = new URL(safeUrl);
                        if (parsed.hostname.toLowerCase().includes(val)) {
                            isMatch = true;
                        }
                    } catch {
                        if (safeUrl.toLowerCase().includes(val)) isMatch = true;
                    }
                } else if (rule.type === 'exact') {
                    if (safeTitle.toLowerCase() === val) {
                        isMatch = true;
                    }
                } else {
                    // 'keyword' (default)
                    if (combinedContent.includes(val)) {
                        isMatch = true;
                    }
                }
                if (isMatch) break;
            }

            if (isMatch) {
                if (!matchedFolder && rule.targetFolder) {
                    matchedFolder = rule.targetFolder;
                    matchedRuleDesc = `Kural: ${rule.type} (${rule.value})`;
                }
                if (rule.tags) {
                    const tagList = rule.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                    collectedTags.push(...tagList);
                    if (!matchedRuleDesc) {
                        matchedRuleDesc = `Kural: ${rule.type} (${rule.value})`;
                    }
                }
            }
        }
    }

    // 2. Fallback to smart domain heuristics if no targetFolder was assigned
    if (!matchedFolder) {
        try {
            const host = new URL(safeUrl).hostname.toLowerCase();
            for (const [domainPattern, defaults] of Object.entries(DEFAULT_DOMAIN_RULES)) {
                if (host.includes(domainPattern)) {
                    matchedFolder = defaults.folder;
                    collectedTags.push(...defaults.tags);
                    matchedRuleDesc = `Otomatik: ${domainPattern}`;
                    break;
                }
            }
        } catch {
            // Invalid URL fallback
        }
    }

    const uniqueTags = Array.from(new Set(collectedTags));

    return {
        folder: matchedFolder || 'BookSmart',
        tags: uniqueTags,
        matchedRule: matchedRuleDesc
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_DOMAIN_RULES,
        classifyUrlWithRules
    };
}
