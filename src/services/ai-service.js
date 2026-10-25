import { executeAIRequest } from './ai/provider-dispatcher';
import { cleanJsonString, sanitizeLanguageCode, getProxiedUrl } from './ai/ai-utils';

export const MODEL_ALIASES = {
    // Deprecated or mistyped aliases mapped to modern stable models
    'gemini-3.5-flash-lite': 'gemini-2.0-flash-lite',
    'gemini-3.5-flash': 'gemini-2.5-flash',
    'gemini-3.5-pro': 'gemini-2.5-pro',
    'gemini-2.5-flash-lite': 'gemini-2.0-flash-lite',
    'gemini-1.5-flash-8b': 'gemini-2.0-flash-lite',
    'claude-sonnet-4-20250514': 'claude-3-7-sonnet-20250219',
    'gpt-3.5-turbo': 'gpt-4o-mini',
};

export function isLocalAIProvider(provider) {
    return provider === 'ollama' || provider === 'browser';
}

export const AI_MODELS = [
    // --- Local & Privacy-First (No API Key Required) ---
    { id: 'browser-builtin', name: 'In-Browser AI (Chrome Gemini Nano - Local)', provider: 'browser' },
    { id: 'llama3.2', name: 'Llama 3.2 (Ollama Local)', provider: 'ollama' },
    { id: 'llama3.3', name: 'Llama 3.3 70B (Ollama Local)', provider: 'ollama' },
    { id: 'deepseek-r1', name: 'DeepSeek R1 (Ollama Local)', provider: 'ollama' },
    { id: 'qwen2.5', name: 'Qwen 2.5 (Ollama Local)', provider: 'ollama' },
    { id: 'mistral', name: 'Mistral 7B (Ollama Local)', provider: 'ollama' },
    { id: 'phi4', name: 'Microsoft Phi-4 (Ollama Local)', provider: 'ollama' },
    { id: 'gemma2', name: 'Google Gemma 2 (Ollama Local)', provider: 'ollama' },

    // --- OpenAI ---
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cheap)', provider: 'openai' },
    { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal)', provider: 'openai' },
    { id: 'gpt-4.5-preview', name: 'GPT-4.5 (Preview)', provider: 'openai' },
    { id: 'o3-mini', name: 'o3-mini (Fast Reasoning)', provider: 'openai' },
    { id: 'o1', name: 'o1 (Deep Reasoning)', provider: 'openai' },
    { id: 'o1-mini', name: 'o1-mini', provider: 'openai' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Legacy)', provider: 'openai' },

    // --- Google Gemini (Modern 2.5 & 2.0) ---
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)', provider: 'gemini' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning)', provider: 'gemini' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Stable)', provider: 'gemini' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite (Fast & Low Cost)', provider: 'gemini' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (LTS)', provider: 'gemini' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (LTS)', provider: 'gemini' },

    // --- Anthropic (Direct) ---
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)', provider: 'anthropic' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (v2)', provider: 'anthropic' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)', provider: 'anthropic' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },

    // --- OpenRouter ---
    { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (via OpenRouter)', provider: 'openrouter' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)', provider: 'openrouter' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OpenRouter)', provider: 'openrouter' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (via OpenRouter)', provider: 'openrouter' },
    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (via OpenRouter)', provider: 'openrouter' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (via OpenRouter)', provider: 'openrouter' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (via OpenRouter)', provider: 'openrouter' },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B (via OpenRouter)', provider: 'openrouter' },
];

export const DEFAULT_MODEL = 'gpt-4o-mini';

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
    if (!modelId) return 'openai';

    const effective = resolveEffectiveModel(modelId);
    const staticInfo = AI_MODELS.find(m => m.id === effective || m.id === modelId);
    if (staticInfo) return staticInfo.provider;

    if (modelId === 'browser-builtin' || modelId.startsWith('browser')) return 'browser';
    if (modelId.includes('/') || modelId.startsWith('anthropic/') || modelId.startsWith('deepseek/') || modelId.startsWith('meta-llama/') || modelId.startsWith('google/') || modelId.startsWith('qwen/')) return 'openrouter';
    if (modelId.startsWith('claude-')) return 'anthropic';
    if (modelId.startsWith('gemini-')) return 'gemini';
    if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai';

    // Ollama patterns: contains colon tag (e.g. "mistral:latest") or known local family keyword
    const localFamilies = ['llama', 'qwen', 'deepseek', 'mistral', 'phi', 'gemma', 'codellama', 'vicuna', 'llava', 'nomic', 'tinyllama'];
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
