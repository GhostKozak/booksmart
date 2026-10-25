import { executeAIRequest } from './ai/provider-dispatcher';
import { cleanJsonString, sanitizeLanguageCode, getProxiedUrl } from './ai/ai-utils';

export const MODEL_ALIASES = {
    // Deprecated legacy models mapped to modern replacements
    'gemini-2.5-flash': 'gemini-3.6-flash',
    'gemini-2.5-pro': 'gemini-3.5-pro',
    'gemini-2.5-flash-lite': 'gemini-3.5-flash-lite',
    'gemini-2.0-flash': 'gemini-3.6-flash',
    'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite',
    'gemini-1.5-flash': 'gemini-3.5-flash-lite',
    'gemini-1.5-flash-8b': 'gemini-3.5-flash-lite',
    'gemini-1.5-pro': 'gemini-3.5-pro',
    'gemini-3.5-flash': 'gemini-3.6-flash',

    'claude-3-7-sonnet-20250219': 'claude-sonnet-5-5',
    'claude-3-5-sonnet-20241022': 'claude-sonnet-5-5',
    'claude-3-5-haiku-20241022': 'claude-haiku-5-5',
    'claude-3-opus-20240229': 'claude-opus-5-5',
    'claude-sonnet-4-20250514': 'claude-sonnet-5-5',

    'gpt-4o-mini': 'gpt-6.1-sol',
    'gpt-4o': 'gpt-6-astra',
    'gpt-4.5-preview': 'gpt-6-astra',
    'gpt-3.5-turbo': 'gpt-6-luna',
    'o1': 'gpt-6-astra',
    'o1-mini': 'gpt-6.1-sol',
    'o3-mini': 'gpt-6.1-sol',

    'llama3.2': 'llama3.1',
    'llama3.3': 'llama4',
};

export function isLocalAIProvider(provider) {
    return provider === 'ollama' || provider === 'browser';
}

export const AI_MODELS = [
    // --- Local & Privacy-First (No API Key Required) ---
    { id: 'browser-builtin', name: 'In-Browser AI (Chrome Gemini Nano - Local)', provider: 'browser' },
    { id: 'llama4', name: 'Llama 4 (Ollama Local)', provider: 'ollama' },
    { id: 'llama3.1', name: 'Llama 3.1 (Ollama Local)', provider: 'ollama' },
    { id: 'deepseek-r1', name: 'DeepSeek R1 (Ollama Local)', provider: 'ollama' },
    { id: 'qwen3.8', name: 'Qwen 3.8 (Ollama Local)', provider: 'ollama' },
    { id: 'gpt-oss', name: 'GPT-OSS (Ollama Local)', provider: 'ollama' },

    // --- Google Gemini (Active 3.x & 4 Series) ---
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Fastest & Cost-Efficient)', provider: 'gemini' },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Production Stable)', provider: 'gemini' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (High Speed & Multimodal)', provider: 'gemini' },
    { id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro (Deep Reasoning)', provider: 'gemini' },
    { id: 'gemini-4-argon', name: 'Gemini 4 Argon (Flagship Autonomous)', provider: 'gemini' },

    // --- OpenAI (GPT-6 Series) ---
    { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol (Recommended)', provider: 'openai' },
    { id: 'gpt-6-luna', name: 'GPT-6 Luna (Fast & Low Cost)', provider: 'openai' },
    { id: 'gpt-6-astra', name: 'GPT-6 Astra (Flagship)', provider: 'openai' },

    // --- Anthropic (Claude 5 Series) ---
    { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5 (Balanced Workhorse)', provider: 'anthropic' },
    { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5 (Fast & Lightweight)', provider: 'anthropic' },
    { id: 'claude-opus-5-5', name: 'Claude Opus 5.5 (Advanced Agentic)', provider: 'anthropic' },
    { id: 'claude-fable-5-1', name: 'Claude Fable 5.1 (High Reasoning & Research)', provider: 'anthropic' },

    // --- OpenRouter ---
    { id: 'google/gemini-3.6-flash', name: 'Gemini 3.6 Flash (via OpenRouter)', provider: 'openrouter' },
    { id: 'google/gemini-4-argon', name: 'Gemini 4 Argon (via OpenRouter)', provider: 'openrouter' },
    { id: 'anthropic/claude-sonnet-5-5', name: 'Claude Sonnet 5.5 (via OpenRouter)', provider: 'openrouter' },
    { id: 'anthropic/claude-haiku-5-5', name: 'Claude Haiku 5.5 (via OpenRouter)', provider: 'openrouter' },
    { id: 'openai/gpt-6.1-sol', name: 'GPT-6.1 Sol (via OpenRouter)', provider: 'openrouter' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OpenRouter)', provider: 'openrouter' },
    { id: 'meta-llama/llama-4', name: 'Llama 4 (via OpenRouter)', provider: 'openrouter' },
    { id: 'qwen/qwen-3.8', name: 'Qwen 3.8 (via OpenRouter)', provider: 'openrouter' },
];

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

/**
 * Resolves any deprecated or legacy model ID to its modern supported replacement.
 * @param {string} [modelId]
 * @returns {string}
 */
export function resolveEffectiveModel(modelId) {
    if (!modelId) return DEFAULT_MODEL;
    return MODEL_ALIASES[modelId] || modelId;
}

/**
 * Accurately determines the backend provider ('openai' | 'gemini' | 'anthropic' | 'openrouter' | 'ollama' | 'browser')
 * for any given model ID, supporting both pre-configured static models and dynamically detected Ollama models.
 * @param {string} [modelId]
 * @param {string} [explicitProvider]
 * @returns {string}
 */
export function resolveProviderForModel(modelId, explicitProvider = null) {
    if (explicitProvider) return explicitProvider;
    if (!modelId) return 'gemini';

    const effective = resolveEffectiveModel(modelId);
    const staticInfo = AI_MODELS.find(m => m.id === effective || m.id === modelId);
    if (staticInfo) return staticInfo.provider;

    if (modelId === 'browser-builtin' || modelId.startsWith('browser')) return 'browser';
    if (modelId.includes('/') || modelId.startsWith('anthropic/') || modelId.startsWith('deepseek/') || modelId.startsWith('meta-llama/') || modelId.startsWith('google/') || modelId.startsWith('qwen/') || modelId.startsWith('openai/')) return 'openrouter';
    if (modelId.startsWith('claude-')) return 'anthropic';
    if (modelId.startsWith('gemini-')) return 'gemini';
    if (modelId.startsWith('gpt-')) return 'openai';

    // Ollama patterns: contains colon tag (e.g. "mistral:latest") or known local family keyword
    const localFamilies = ['llama', 'qwen', 'deepseek', 'mistral', 'phi', 'gemma', 'codellama', 'vicuna', 'llava', 'nomic', 'tinyllama', 'oss'];
    const lower = modelId.toLowerCase();
    if (modelId.includes(':') || localFamilies.some(f => lower.includes(f))) {
        return 'ollama';
    }

    return 'openai';
}

const CHUNK_SIZE = 20;
const MAX_CONCURRENCY = 3;

/**
 * Categorize a list of bookmarks using an LLM.
 * @param {Array} bookmarks - List of { id, title, url }
 * @param {string} apiKey - API Key
 * @param {string} modelId - The specific model ID to use
 * @param {function} onProgress - Callback (processedCount, total)
 * @returns {Promise<Object>} - Map of { id: category }
 */
export async function categorizeBookmarks(bookmarks, apiKey, modelId, onProgress, { abortSignal } = {}) {
    const effectiveModel = resolveEffectiveModel(modelId);
    const provider = resolveProviderForModel(effectiveModel);

    const chunks = [];
    for (let i = 0; i < bookmarks.length; i += CHUNK_SIZE) {
        chunks.push(bookmarks.slice(i, i + CHUNK_SIZE));
    }

    let processedCount = 0;
    const results = {};
    let processingError = null;

    const processChunk = async (chunk) => {
        if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            const categories = await fetchCategories(chunk, apiKey, provider, effectiveModel, abortSignal);
            if (!abortSignal?.aborted) Object.assign(results, categories);
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error("Error processing chunk:", error);
            processingError = error;
            queue.length = 0;
        } finally {
            processedCount += chunk.length;
            onProgress?.(processedCount, bookmarks.length);
        }
    };

    const queue = [...chunks];
    const workers = [];

    for (let i = 0; i < MAX_CONCURRENCY; i++) {
        workers.push((async () => {
            while (queue.length > 0) {
                if (abortSignal?.aborted) break;
                const chunk = queue.shift();
                await processChunk(chunk);
            }
        })());
    }

    await Promise.all(workers);
    if (processingError) throw processingError;
    return results;
}

async function fetchCategories(bookmarks, apiKey, provider, modelId, signal) {
    const simplified = bookmarks.map(b => ({
        id: b.id,
        title: b.title,
        url: b.url
    }));

    const lang = sanitizeLanguageCode(localStorage.getItem('i18nextLng') || 'en');
    const systemPrompt = `You are a bookmark organizer. Analyze the following list of bookmarks. 
  IMPORTANT: The user's preferred language is '${lang}'. You MUST translate all generated folder names and tags into '${lang}' natively.
  Return a JSON object where the key is the ID and the value is an object containing:
  - "folder": A short, concise category name (e.g. 'Development', 'News', or their localized equivalents). Use Title Case.
  - "tags": An array of specific, lowercase tags conceptually relevant in '${lang}'.
  
  Do not return any explanations, just the JSON.`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(simplified) }
    ];

    return executeAIRequest({ provider, messages, apiKey, model: modelId, asJson: true, signal });
}

export async function summarizeContent(url, apiKey, modelId, { abortSignal, corsProxy } = {}) {
    const effectiveModel = resolveEffectiveModel(modelId);
    const provider = resolveProviderForModel(effectiveModel);

    const systemPrompt = `You are a helpful assistant. Summarize the main content, topic, and purpose of the given URL or text in a short paragraph (2-3 sentences). Write the summary in the same language as the website content. Do not include introductory phrases.`;

    let pageText = `URL: ${url}`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const onParentAbort = () => controller.abort();
        if (abortSignal) {
            if (abortSignal.aborted) {
                controller.abort();
            } else {
                abortSignal.addEventListener('abort', onParentAbort);
            }
        }
        try {
            const fetchUrl = corsProxy ? getProxiedUrl(url, corsProxy) : url;
            const res = await fetch(fetchUrl, { signal: controller.signal });
            if (res.ok) {
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const textOnly = doc.body ? doc.body.textContent.replace(/\s+/g, ' ').substring(0, 15000) : html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 15000);
                pageText = `Content from URL (${url}):\n\n${textOnly}`;
            }
        } finally {
            clearTimeout(timeoutId);
            if (abortSignal) {
                abortSignal.removeEventListener('abort', onParentAbort);
            }
        }
    } catch (e) {
        console.warn("Could not fetch page content directly (CORS or timeout), summarizing from URL only.", e);
    }

    const lang = sanitizeLanguageCode(localStorage.getItem('i18nextLng') || 'en');
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please summarize this page in '${lang}'. The summary MUST be translated natively to the language code '${lang}':\n${pageText}` }
    ];

    return executeAIRequest({ provider, messages, apiKey, model: effectiveModel, asJson: false, signal: abortSignal });
}

/**
 * Cleans a one-sentence summary to ensure it is crisp, without markdown, quotes or conversational filler.
 * @param {string} text
 * @returns {string}
 */
export function cleanOneSentenceSummary(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();
    // Remove enclosing markdown code fences
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
    // Remove enclosing quotes
    cleaned = cleaned.replace(/^["'“‘«»]+|["'”’«»]+$/g, '').trim();
    // Remove leading prefixes like "Summary:", "Özet:", etc.
    cleaned = cleaned.replace(/^(summary|özet|résumé|zusammenfassung|resumen)\s*:\s*/i, '').trim();
    // If the model produced multiple lines, take the first non-empty line
    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
        cleaned = lines[0];
    }
    // Remove enclosing quotes again if line was individually quoted
    cleaned = cleaned.replace(/^["'“‘«»]+|["'”’«»]+$/g, '').trim();
    return cleaned;
}

/**
 * Generates an automatic one-sentence summary ("Bu sayfa ne anlatıyor?") for a bookmark.
 * Utilizes title, URL, OpenGraph preview description, and extracted page content.
 *
 * @param {{ url: string, title?: string }} bookmark
 * @param {string} apiKey
 * @param {string} modelId
 * @param {Object} [options]
 * @param {AbortSignal} [options.abortSignal]
 * @param {string} [options.corsProxy]
 * @param {Object} [options.previewMetadata]
 * @returns {Promise<string>}
 */
export async function generateOneSentenceSummary(bookmark, apiKey, modelId, { abortSignal, corsProxy, previewMetadata } = {}) {
    if (!bookmark || !bookmark.url) {
        throw new Error("Bookmark URL is required");
    }

    const effectiveModel = resolveEffectiveModel(modelId);
    const provider = resolveProviderForModel(effectiveModel);
    const url = bookmark.url;
    const title = bookmark.title || previewMetadata?.title || '';

    // Collect context
    const contextParts = [];
    contextParts.push(`URL: ${url}`);
    if (title) {
        contextParts.push(`Title: ${title}`);
    }
    if (previewMetadata?.siteName) {
        contextParts.push(`Website / Brand: ${previewMetadata.siteName}`);
    }
    if (previewMetadata?.description) {
        contextParts.push(`Page Description (OpenGraph): ${previewMetadata.description}`);
    }

    // Try fetching content if possible (with 5s timeout)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const onParentAbort = () => controller.abort();
        if (abortSignal) {
            if (abortSignal.aborted) {
                controller.abort();
            } else {
                abortSignal.addEventListener('abort', onParentAbort);
            }
        }
        try {
            const fetchUrl = corsProxy ? getProxiedUrl(url, corsProxy) : url;
            const res = await fetch(fetchUrl, { signal: controller.signal });
            if (res.ok) {
                const html = await res.text();
                if (typeof DOMParser !== 'undefined') {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const textOnly = doc.body ? doc.body.textContent.replace(/\s+/g, ' ').substring(0, 8000) : '';
                    if (textOnly) {
                        contextParts.push(`Page Text Excerpt: ${textOnly}`);
                    }
                }
            }
        } finally {
            clearTimeout(timeoutId);
            if (abortSignal) {
                abortSignal.removeEventListener('abort', onParentAbort);
            }
        }
    } catch {
        // Fall back gracefully to URL, title, and OpenGraph metadata
    }

    const lang = sanitizeLanguageCode(localStorage.getItem('i18nextLng') || 'en');
    const systemPrompt = `You are an expert web content summarizer.
Your goal is to answer the question: "What is this page about?" in EXACTLY ONE clear, concise, and informative sentence.
Rules:
1. Return EXACTLY ONE sentence.
2. The sentence MUST directly explain what this website, tool, article, or product is and what it does.
3. Do NOT use introductory filler like "This page is...", "This website offers...", "Here is a summary:".
4. Do NOT use quotation marks, bullet points, or markdown formatting.
5. Write the summary natively in the language corresponding to language code '${lang}'.`;

    const userContent = `Analyze the following webpage information and write a single-sentence "What is this page about?" summary in '${lang}':\n\n${contextParts.join('\n')}`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
    ];

    const rawSummary = await executeAIRequest({ provider, messages, apiKey, model: effectiveModel, asJson: false, signal: abortSignal });
    return cleanOneSentenceSummary(rawSummary);
}

export async function fixTitles(bookmarks, apiKey, modelId, onProgress, { abortSignal } = {}) {
    const effectiveModel = resolveEffectiveModel(modelId);
    const provider = resolveProviderForModel(effectiveModel);

    const chunks = [];
    for (let i = 0; i < bookmarks.length; i += CHUNK_SIZE) {
        chunks.push(bookmarks.slice(i, i + CHUNK_SIZE));
    }

    let processedCount = 0;
    const results = {};
    let processingError = null;

    const processChunk = async (chunk) => {
        if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            const simplified = chunk.map(b => ({ id: b.id, title: b.title, url: b.url }));
            const lang = sanitizeLanguageCode(localStorage.getItem('i18nextLng') || 'en');
            const systemPrompt = `You are a helpful bookmark assistant. Review the following bookmarks. Some have broken, messy, or missing titles.
Fix the titles to be clean, readable, and professional based on their URL and current title.
IMPORTANT: The user's preferred language is '${lang}'. If you need to generate a completely new title, and the URL is language-agnostic, attempt to write the new title natively in '${lang}'. Note that original names of brands/companies should remain untouched.
Return a JSON object where the key is the bookmark ID and the value is the "fixedTitle" string.
Only return the IDs of the bookmarks you chose to fix. Do not return explanations.`;

            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify(simplified) }
            ];

            const chunkResults = await executeAIRequest({ provider, messages, apiKey, model: effectiveModel, asJson: true, signal: abortSignal });
            if (!abortSignal?.aborted && chunkResults && typeof chunkResults === 'object') {
                Object.assign(results, chunkResults);
            }
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error("Error processing titles chunk:", error);
            processingError = error;
            queue.length = 0;
        } finally {
            processedCount += chunk.length;
            onProgress?.(processedCount, bookmarks.length);
        }
    };

    const queue = [...chunks];
    const workers = [];

    for (let i = 0; i < MAX_CONCURRENCY; i++) {
        workers.push((async () => {
            while (queue.length > 0) {
                if (abortSignal?.aborted) break;
                const chunk = queue.shift();
                await processChunk(chunk);
            }
        })());
    }

    await Promise.all(workers);
    if (processingError) throw processingError;
    return results;
}

export async function findSmartDuplicates(bookmarks, apiKey, modelId, onProgress, { abortSignal } = {}) {
    const effectiveModel = resolveEffectiveModel(modelId);
    const provider = resolveProviderForModel(effectiveModel);

    const DEDUPE_CHUNK_SIZE = 50;
    const chunks = [];
    for (let i = 0; i < bookmarks.length; i += DEDUPE_CHUNK_SIZE) {
        chunks.push(bookmarks.slice(i, i + DEDUPE_CHUNK_SIZE));
    }

    let processedCount = 0;
    const duplicateGroups = [];
    let processingError = null;

    const processChunk = async (chunk) => {
        if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            const simplified = chunk.map(b => ({ id: b.id, title: b.title, url: b.url }));
            const systemPrompt = `You are an AI assistant helping to clean up bookmarks. Analyze the list of bookmarks and find semantic duplicates. These are bookmarks that point to the exact same content even if URLs have different tracking parameters or slightly different domains/paths.
Return a JSON array of arrays, where each inner array contains the string IDs of the bookmarks that are duplicates of each other.
Example output: [["id1", "id2"], ["id3", "id4", "id5"]]. Only return the JSON array, no explanation.`;

            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify(simplified) }
            ];

            const raw = await executeAIRequest({ provider, messages, apiKey, model: effectiveModel, asJson: false, signal: abortSignal });
            let resultJson = [];
            try {
                resultJson = JSON.parse(cleanJsonString(raw));
            } catch (e) {
                console.error("Failed to parse", e);
                resultJson = [];
            }

            if (!abortSignal?.aborted && Array.isArray(resultJson)) {
                const validGroups = resultJson.filter(g => Array.isArray(g) && g.length > 1);
                duplicateGroups.push(...validGroups);
            }
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error("Error processing dedupe chunk:", error);
            processingError = error;
            queue.length = 0;
        } finally {
            processedCount += chunk.length;
            onProgress?.(processedCount, bookmarks.length);
        }
    };

    const queue = [...chunks];
    const workers = [];

    for (let i = 0; i < MAX_CONCURRENCY; i++) {
        workers.push((async () => {
            while (queue.length > 0) {
                if (abortSignal?.aborted) break;
                const chunk = queue.shift();
                await processChunk(chunk);
            }
        })());
    }

    await Promise.all(workers);
    if (processingError) throw processingError;
    return duplicateGroups;
}
