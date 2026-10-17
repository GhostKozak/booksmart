import { executeAIRequest } from '../services/ai/provider-dispatcher'
import { cleanJsonString } from '../services/ai/ai-utils'

const STOP_WORDS = new Set([
    'http', 'https', 'www', 'com', 'org', 'net', 'html', 'page', 'home',
    'with', 'from', 'that', 'this', 'about', 'guide', 'free', 'online',
    'view', 'read', 'best', 'more', 'your', 'into', 'what', 'when',
    'where', 'which', 'their', 'there', 'have', 'been', 'post', 'blog'
])

/**
 * Extracts clean domain without www prefix
 */
export function extractDomain(url) {
    if (!url || typeof url !== 'string') return ''
    try {
        const hasProtocol = /^https?:\/\//i.test(url)
        if (!hasProtocol && !url.includes('.')) return ''
        const parsed = new URL(hasProtocol ? url : `https://${url}`)
        const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase()
        return hostname.includes('.') ? hostname : ''
    } catch {
        return ''
    }
}

/**
 * Local statistical pattern mining for Smart Rules.
 * Analyzes bookmarks to find strong domain -> folder and keyword -> folder habits.
 * 
 * @param {Array} bookmarks
 * @param {Array} existingRules
 * @param {Object} [options]
 * @returns {Array} List of suggested rule objects with confidence and samples
 */
export function analyzeRulePatterns(bookmarks = [], existingRules = [], options = {}) {
    const { minCount = 2, minConfidence = 0.65 } = options
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) return []

    const validRules = Array.isArray(existingRules) ? existingRules : []
    const existingRuleDomains = new Set(
        validRules
            .filter(r => r.type === 'domain' && r.value)
            .map(r => r.value.toLowerCase().trim())
    )
    const existingRuleKeywords = new Set(
        validRules
            .filter(r => r.type === 'keyword' && r.value)
            .flatMap(r => r.value.toLowerCase().split(',').map(k => k.trim()))
            .filter(Boolean)
    )

    // Filter bookmarks with a valid folder
    const organizedBookmarks = bookmarks.filter(b => {
        const folder = (b.newFolder || b.originalFolder || '').trim()
        return folder && folder !== 'Root' && folder.toLowerCase() !== 'uncategorized'
    })

    const suggestions = []
    const seenValues = new Set()

    // ── 1. Domain Pattern Analysis ──
    const domainMap = new Map() // domain -> { total: number, folderCounts: Map<folder, Bookmarks[]> }

    organizedBookmarks.forEach(b => {
        const domain = extractDomain(b.url)
        if (!domain || domain.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) return

        const folder = (b.newFolder || b.originalFolder).trim()
        if (!domainMap.has(domain)) {
            domainMap.set(domain, { total: 0, folderMap: new Map() })
        }

        const data = domainMap.get(domain)
        data.total++
        if (!data.folderMap.has(folder)) {
            data.folderMap.set(folder, [])
        }
        data.folderMap.get(folder).push(b)
    })

    domainMap.forEach((data, domain) => {
        if (data.total < minCount) return
        if (existingRuleDomains.has(domain)) return

        // Find best folder
        let bestFolder = null
        let bestCount = 0
        let bestList = []

        data.folderMap.forEach((list, folder) => {
            if (list.length > bestCount) {
                bestCount = list.length
                bestFolder = folder
                bestList = list
            }
        })

        const confidence = bestCount / data.total
        if (confidence >= minConfidence && bestFolder) {
            // Check for common tags among bestList
            const tagCounts = new Map()
            bestList.forEach(b => {
                const tags = Array.isArray(b.tags) ? b.tags : (typeof b.tags === 'string' ? b.tags.split(',') : [])
                tags.map(t => t.trim()).filter(Boolean).forEach(t => {
                    tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
                })
            })

            const commonTags = []
            tagCounts.forEach((count, tag) => {
                if (count / bestCount >= 0.5) commonTags.push(tag)
            })

            const confidencePercent = Math.round(confidence * 100)
            seenValues.add(domain)

            suggestions.push({
                id: `sug-domain-${domain}`,
                type: 'domain',
                value: domain,
                targetFolder: bestFolder,
                tags: commonTags.join(', '),
                confidence: confidencePercent,
                matchedCount: bestCount,
                totalCount: data.total,
                samples: bestList.slice(0, 3).map(b => ({ id: b.id, title: b.title || b.url, url: b.url })),
                source: 'pattern',
                reason: `${domain} bağlantılarının %${confidencePercent}'i (${bestCount}/${data.total}) "${bestFolder}" klasöründe yer alıyor.`
            })
        }
    })

    // ── 2. Keyword Pattern Analysis (for titles with strong recurring words) ──
    const keywordFolderMap = new Map() // word -> Map<folder, Bookmarks[]>
    const keywordTotalMap = new Map() // word -> total

    organizedBookmarks.forEach(b => {
        const title = (b.title || '').toLowerCase()
        const words = title
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 4 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))

        const uniqueWords = new Set(words)
        const folder = (b.newFolder || b.originalFolder).trim()

        uniqueWords.forEach(word => {
            keywordTotalMap.set(word, (keywordTotalMap.get(word) || 0) + 1)
            if (!keywordFolderMap.has(word)) {
                keywordFolderMap.set(word, new Map())
            }
            const fMap = keywordFolderMap.get(word)
            if (!fMap.has(folder)) {
                fMap.set(folder, [])
            }
            fMap.get(folder).push(b)
        })
    })

    keywordFolderMap.forEach((fMap, word) => {
        const total = keywordTotalMap.get(word) || 0
        if (total < Math.max(3, minCount)) return
        if (existingRuleKeywords.has(word) || seenValues.has(word)) return

        let bestFolder = null
        let bestCount = 0
        let bestList = []

        fMap.forEach((list, folder) => {
            if (list.length > bestCount) {
                bestCount = list.length
                bestFolder = folder
                bestList = list
            }
        })

        const confidence = bestCount / total
        // Higher confidence threshold for keywords (>= 80%) to avoid false positives
        if (confidence >= 0.80 && bestFolder) {
            const confidencePercent = Math.round(confidence * 100)
            seenValues.add(word)

            suggestions.push({
                id: `sug-keyword-${word}`,
                type: 'keyword',
                value: word,
                targetFolder: bestFolder,
                tags: '',
                confidence: confidencePercent,
                matchedCount: bestCount,
                totalCount: total,
                samples: bestList.slice(0, 3).map(b => ({ id: b.id, title: b.title || b.url, url: b.url })),
                source: 'pattern',
                reason: `Başlığında "${word}" geçen yer imlerinin %${confidencePercent}'i (${bestCount}/${total}) "${bestFolder}" klasöründe yer alıyor.`
            })
        }
    })

    // Sort by weighted score: confidence * matchedCount
    return suggestions.sort((a, b) => (b.confidence * b.matchedCount) - (a.confidence * a.matchedCount))
}

/**
 * AI-powered Deep Rule Suggester.
 * Analyzes bookmark library semantics and suggests smart classification rules.
 */
export async function suggestRulesWithAI({
    bookmarks = [],
    existingRules = [],
    apiKey,
    model = 'gemini-3.5-flash-lite',
    provider = 'gemini',
    abortSignal
}) {
    if (!bookmarks || bookmarks.length === 0) return []

    // Sample up to 60 bookmarks with folders for prompt efficiency
    const sample = bookmarks
        .filter(b => b.title && (b.newFolder || b.originalFolder))
        .slice(0, 60)
        .map(b => ({
            title: b.title,
            domain: extractDomain(b.url),
            folder: b.newFolder || b.originalFolder,
            tags: b.tags || []
        }))

    if (sample.length < 3) return []

    const existingSummary = (existingRules || []).map(r => `${r.type}: "${r.value}" -> ${r.targetFolder || ''}`).join(', ')

    const prompt = `You are a Smart Bookmarks Rule Generator for BookSmart app.
Analyze the user's bookmarks and their organized folders:
${JSON.stringify(sample)}

Existing user rules:
[${existingSummary}]

Task:
Discover 3 to 6 high-value rules to automatically categorize future bookmarks.
Rules can be:
- type: "domain" (e.g. value: "github.com", targetFolder: "Development", tags: "code,git")
- type: "keyword" (e.g. value: "tutorial,guide", targetFolder: "Education", tags: "learning")

Do not duplicate existing rules.
Respond strictly with a JSON array in this exact structure:
[
  {
    "type": "domain",
    "value": "github.com",
    "targetFolder": "Development",
    "tags": "dev,tools",
    "reason": "You frequently save github.com repositories to Development."
  }
]`

    const rawResponse = await executeAIRequest({
        prompt,
        apiKey,
        model,
        provider,
        abortSignal
    })

    const cleaned = cleanJsonString(rawResponse)
    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed)) return []

    return parsed
        .filter(r => r && r.value && (r.targetFolder || r.tags))
        .map((r, idx) => ({
            id: `sug-ai-${idx}-${r.value}`,
            type: r.type === 'domain' ? 'domain' : 'keyword',
            value: String(r.value).trim(),
            targetFolder: String(r.targetFolder || '').trim(),
            tags: Array.isArray(r.tags) ? r.tags.join(', ') : String(r.tags || '').trim(),
            confidence: 90,
            matchedCount: 1,
            totalCount: 1,
            samples: [],
            source: 'ai',
            reason: r.reason || `AI tarafından önerilen kural: "${r.value}"`
        }))
}
