/**
 * Semantic Vector Search Service (Client-Side Local AI)
 * Provides fast, 100% offline client-side vector search and concept matching.
 * Capable of discovering conceptually related bookmarks even when exact keywords differ
 * (e.g. query "React hızlandırma" finds "useMemo ve useCallback İpuçları").
 */

// Turkish & English Stopwords
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will',
    'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when', 'where', 'who',
    'which', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    // Turkish
    'acaba', 'ama', 'aslında', 'az', 'bana', 'bazen', 'bazı', 'belki', 'ben', 'benden',
    'beni', 'benim', 'beri', 'biri', 'birkaç', 'birşey', 'biz', 'bizden', 'bize', 'bizi',
    'bizim', 'bu', 'buna', 'bunda', 'bundan', 'bunlar', 'bunu', 'bunun', 'burada', 'çok',
    'çünkü', 'da', 'daha', 'de', 'defa', 'diye', 'en', 'gibi', 'hem', 'hep', 'hepsi',
    'her', 'hiç', 'için', 'ile', 'ise', 'kez', 'ki', 'kim', 'mı', 'mi', 'mu', 'mü',
    'nasıl', 'ne', 'neden', 'nerde', 'nerede', 'nereye', 'niçin', 'niye', 'o', 'olan',
    'olarak', 'oldu', 'olduğu', 'olduklarını', 'olmadı', 'olmadığı', 'olmak', 'olması',
    'olmayan', 'olmaz', 'olsa', 'olsun', 'olup', 'olur', 'olursa', 'oluyor', 'onlar',
    'onlara', 'onlardan', 'onları', 'onların', 'onu', 'onun', 'orada', 'oysa', 'pek',
    'şey', 'siz', 'sizden', 'size', 'sizi', 'sizin', 'şu', 'şuna', 'şunda', 'şundan',
    'şunları', 'şunu', 'tarafından', 'tr', 've', 'veya', 'ya', 'yani', 'yok'
]);

// Semantic concept clusters mapping related terminology to canonical concept dimensions
export const CONCEPT_CLUSTERS = {
    react: [
        'react', 'reactjs', 'jsx', 'tsx', 'hook', 'hooks', 'usememo', 'usecallback',
        'useeffect', 'usestate', 'usecontext', 'useref', 'usereducer', 'component',
        'components', 'props', 'nextjs', 'redux', 'zustand', 'virtual-dom', 'rerender',
        'memo', 'fiber'
    ],
    vue: [
        'vue', 'vuejs', 'vue3', 'vuex', 'pinia', 'composition-api', 'nuxt', 'v-model',
        'reactive', 'ref', 'computed', 'sfc'
    ],
    performance: [
        'hizlandirma', 'hiz', 'performans', 'performance', 'speed', 'optimizasyon',
        'optimization', 'optimize', 'hizli', 'fast', 'faster', 'profiling', 'profiler',
        'latency', 'cache', 'caching', 'memoize', 'usememo', 'usecallback', 'throttle',
        'debounce', 'benchmark', 'lazy', 'lighthouse', 'web-vitals', 'fps', 'memory-leak'
    ],
    javascript: [
        'javascript', 'js', 'typescript', 'ts', 'ecmascript', 'es6', 'async', 'await',
        'promise', 'closure', 'prototype', 'npm', 'yarn', 'pnpm', 'node', 'deno', 'bun'
    ],
    frontend: [
        'frontend', 'front-end', 'ui', 'ux', 'css', 'html', 'tailwind', 'style',
        'responsive', 'flexbox', 'grid', 'dom', 'browser', 'web', 'sass', 'bootstrap',
        'accessibility', 'a11y', 'canvas', 'svg'
    ],
    backend: [
        'backend', 'back-end', 'server', 'sunucu', 'api', 'rest', 'graphql', 'grpc',
        'express', 'fastify', 'django', 'flask', 'fastapi', 'spring', 'go', 'golang',
        'rust', 'ruby', 'rails', 'php', 'laravel'
    ],
    database: [
        'database', 'veritabani', 'db', 'sql', 'postgres', 'postgresql', 'mysql',
        'sqlite', 'indexeddb', 'mongodb', 'redis', 'prisma', 'orm', 'query', 'nosql',
        'migration', 'index'
    ],
    devops: [
        'devops', 'docker', 'container', 'kubernetes', 'k8s', 'ci', 'cd', 'deploy',
        'deployment', 'aws', 'cloud', 'bulut', 'linux', 'serverless', 'nginx', 'git',
        'github', 'actions', 'vercel', 'netlify'
    ],
    security: [
        'guvenlik', 'security', 'auth', 'authentication', 'authorization', 'kimlik',
        'jwt', 'oauth', 'token', 'cors', 'csrf', 'xss', 'sql-injection', 'ssl', 'tls',
        'crypto', 'hash', 'password', 'sifre', 'vulnerability', 'owasp'
    ],
    ai_ml: [
        'ai', 'yapay-zeka', 'ml', 'machine-learning', 'makine-ogrenimi', 'deep-learning',
        'derin-ogrenme', 'llm', 'gpt', 'openai', 'gemini', 'claude', 'transformer',
        'prompt', 'rag', 'embedding', 'vektor', 'vector', 'neural', 'nlp', 'vision',
        'diffusion', 'huggingface', 'ollama'
    ],
    testing: [
        'test', 'testing', 'unit-test', 'integration-test', 'e2e', 'vitest', 'jest',
        'playwright', 'cypress', 'tdd', 'mock', 'assert', 'qa'
    ],
    mobile: [
        'mobil', 'mobile', 'ios', 'android', 'swift', 'swiftui', 'kotlin', 'react-native',
        'flutter', 'pwa', 'apk', 'app-store'
    ],
    design: [
        'tasarim', 'design', 'ux', 'ui', 'figma', 'sketch', 'icon', 'typography',
        'renk', 'color', 'bento', 'linktree', 'portfolio', 'wireframe', 'prototype',
        'design-system'
    ],
    productivity: [
        'uretkenlik', 'productivity', 'zaman', 'time', 'not', 'note', 'organizer',
        'todo', 'task', 'workflow', 'otomasyon', 'automation', 'verimlilik', 'pomodoro',
        'notion', 'obsidian', 'bookmark'
    ],
    finance: [
        'finans', 'finance', 'kripto', 'crypto', 'bitcoin', 'ethereum', 'yatirim',
        'stock', 'borsa', 'para', 'money', 'budget', 'fintech'
    ],
    career: [
        'kariyer', 'career', 'mulakat', 'interview', 'cv', 'resume', 'is', 'remote',
        'freelance', 'salary', 'maas', 'hiring'
    ]
};

// Vector dimensionality: Fixed 128 dimensions for compact storage & rapid SIMD-style dot products
export const VECTOR_DIMENSION = 128;

/**
 * Normalizes text by removing diacritics, punctuation, and lowercase conversion.
 */
export function normalizeSemanticText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Tokenizes text into meaningful semantic tokens, removing common stopwords.
 */
export function tokenizeText(text) {
    const normalized = normalizeSemanticText(text);
    if (!normalized) return [];

    const rawTokens = normalized.split(/\s+/);
    const tokens = [];

    for (const raw of rawTokens) {
        if (!raw || raw.length < 2) continue;
        if (STOP_WORDS.has(raw)) continue;
        tokens.push(raw);

        // Also split dashed / compound identifiers (e.g. use-memo -> usememo, use, memo)
        if (raw.includes('-')) {
            const dehyphenated = raw.replace(/-/g, '');
            if (dehyphenated.length >= 2 && !STOP_WORDS.has(dehyphenated)) {
                tokens.push(dehyphenated);
            }
            const parts = raw.split('-').filter(p => p.length >= 2 && !STOP_WORDS.has(p));
            tokens.push(...parts);
        }
    }

    return tokens;
}

/**
 * 32-bit fast string hash function (FNV-1a variant).
 */
function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/**
 * Generates a normalized 128-dimensional dense concept vector from input text.
 * Integrates direct term hashing + concept cluster activations.
 */
export function generateEmbedding(text) {
    const vector = new Float32Array(VECTOR_DIMENSION);
    const tokens = tokenizeText(text);

    if (tokens.length === 0) {
        return vector;
    }

    const clusterKeys = Object.keys(CONCEPT_CLUSTERS);
    const clusterCount = clusterKeys.length;

    // 1. Term frequency map
    const termFreq = new Map();
    for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    // 2. Project terms into vector using Feature Hashing (Hashing Trick)
    for (const [term, freq] of termFreq.entries()) {
        const weight = 1 + Math.log(freq);
        const h1 = hashString(term);
        const idx1 = h1 % VECTOR_DIMENSION;
        const sign1 = (h1 & 0x10000) === 0 ? 1 : -1;
        vector[idx1] += sign1 * weight;

        // Substring 3-grams for typo & morphological tolerance
        if (term.length >= 4) {
            for (let i = 0; i <= term.length - 3; i++) {
                const gram = term.substring(i, i + 3);
                const hg = hashString(gram);
                const idxg = hg % VECTOR_DIMENSION;
                const signg = (hg & 0x10000) === 0 ? 0.35 : -0.35;
                vector[idxg] += signg * weight * 0.35;
            }
        }

        // 3. Concept cluster activation
        for (let cIdx = 0; cIdx < clusterCount; cIdx++) {
            const clusterName = clusterKeys[cIdx];
            const termsInCluster = CONCEPT_CLUSTERS[clusterName];

            if (termsInCluster.includes(term)) {
                // Strong activation for the dedicated concept dimension
                const targetDim = cIdx % VECTOR_DIMENSION;
                vector[targetDim] += 3.5 * weight;

                // Also activate neighbor correlated dimensions
                const correlatedDim = (cIdx * 7 + 13) % VECTOR_DIMENSION;
                vector[correlatedDim] += 2.0 * weight;
            }
        }
    }

    // 4. L2 Normalization so dot product equals cosine similarity
    let norm = 0;
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
        norm += vector[i] * vector[i];
    }

    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < VECTOR_DIMENSION; i++) {
            vector[i] /= norm;
        }
    }

    return vector;
}

/**
 * Computes Cosine Similarity between two normalized vectors (dot product).
 * Returns a value between 0.0 and 1.0.
 */
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
    }
    // Clamped between 0 and 1
    return Math.max(0, Math.min(1, dot));
}

/**
 * Extracts all searchable text content from a bookmark object.
 */
export function getBookmarkContent(bookmark) {
    if (!bookmark) return '';
    const parts = [
        bookmark.title || '',
        bookmark.url || '',
        bookmark.newFolder || bookmark.originalFolder || '',
        bookmark.note || ''
    ];

    if (Array.isArray(bookmark.tags)) {
        parts.push(bookmark.tags.join(' '));
    } else if (typeof bookmark.tags === 'string') {
        parts.push(bookmark.tags);
    }

    if (Array.isArray(bookmark.ruleTags)) {
        parts.push(bookmark.ruleTags.join(' '));
    }

    return parts.join(' ');
}

/**
 * Performs semantic vector search on an array of bookmarks given a natural language query.
 *
 * @param {Array} bookmarks List of bookmark objects
 * @param {string} query Natural language search query
 * @param {Object} options Configuration options
 * @param {number} options.minScore Minimum similarity score (default 0.15)
 * @param {number} options.limit Maximum results to return (optional)
 * @returns {Array} Filtered and ranked bookmarks ordered by semantic similarity
 */
export function semanticSearch(bookmarks, query, options = {}) {
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) return [];
    if (!query || typeof query !== 'string' || !query.trim()) return bookmarks;

    const { minScore = 0.15, limit } = options;
    const queryVector = generateEmbedding(query);

    // Compute similarity score for each bookmark
    const scored = bookmarks.map((b) => {
        let bookmarkVector = b._semanticVector;
        if (!bookmarkVector) {
            const content = getBookmarkContent(b);
            bookmarkVector = generateEmbedding(content);
            // Optionally cache vector in object for memory efficiency during session
            b._semanticVector = bookmarkVector;
        }

        const score = cosineSimilarity(queryVector, bookmarkVector);
        return { item: b, score };
    });

    // Filter by threshold and sort descending by score
    const results = scored
        .filter(entry => entry.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.item);

    // If no results meet strict threshold, check for fallback matching
    if (results.length === 0 && scored.length > 0) {
        // Fallback: take top 3 if their score is at least > 0.05
        const fallback = scored
            .filter(entry => entry.score > 0.05)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(entry => entry.item);

        return limit ? fallback.slice(0, limit) : fallback;
    }

    return limit ? results.slice(0, limit) : results;
}
