export const AI_MODELS = [
    // --- OpenAI ---
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },

    // --- Local ---
    { id: 'llama3.2', name: 'Llama 3.2 (Ollama Local)', provider: 'ollama' },
    { id: 'qwen2.5', name: 'Qwen 2.5 (Ollama Local)', provider: 'ollama' },
    { id: 'deepseek-r1', name: 'DeepSeek-r1 (Ollama Local)', provider: 'ollama' },

    // --- Gemini 3.0 (Preview) ---
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', provider: 'gemini' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', provider: 'gemini' },

    // --- Gemini 2.5 (Stable/Preview) ---
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'gemini' },

    // --- Gemini 2.0 ---
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', provider: 'gemini' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', provider: 'gemini' },

    // --- Gemini 1.5 ---
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B', provider: 'gemini' },

    // --- Deep Research ---
    { id: 'deep-research-pro-preview-12-2025', name: 'Deep Research Pro (Preview)', provider: 'gemini' },

    // --- OpenRouter ---
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)', provider: 'openrouter' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus (via OpenRouter)', provider: 'openrouter' },
    { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (via OpenRouter)', provider: 'openrouter' },
];

export const DEFAULT_MODEL = 'gpt-4o-mini';

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
    // Determine provider from modelId
    const modelInfo = AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
    const provider = modelInfo.provider;

    const chunks = [];
    for (let i = 0; i < bookmarks.length; i += CHUNK_SIZE) {
        chunks.push(bookmarks.slice(i, i + CHUNK_SIZE));
    }

    let processedCount = 0;
    const results = {};
    let processingError = null;

    // Helper to process a single chunk
    const processChunk = async (chunk) => {
        if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            const categories = await fetchCategories(chunk, apiKey, provider, modelId, abortSignal);
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

    // Concurrency Control
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

    if (provider === 'openai') {
        return callOpenAI(messages, apiKey, modelId, true, signal);
    } else if (provider === 'gemini') {
        return callGemini(messages, apiKey, modelId, true, signal);
    } else if (provider === 'openrouter') {
        return callOpenRouter(messages, apiKey, modelId, true, signal);
    } else if (provider === 'ollama') {
        return callOllama(messages, apiKey, modelId, true, signal);
    }

    throw new Error("Invalid provider");
}

async function callOpenAI(messages, apiKey, model, asJson = true, signal) {
    const body = {
        model: model,
        messages: messages
    };
    if (asJson) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "OpenAI API Error");
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    if (asJson) {
        try {
            return JSON.parse(cleanJsonString(text));
        } catch (e) {
            console.error("Failed to parse OpenAI response", e);
            return {};
        }
    }
    return text;
}

async function callGemini(messages, apiKey, model, asJson = true, signal) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    // Convert standard messages to Gemini format
    let systemInstruction = undefined;
    const contents = [];

    messages.forEach(msg => {
        if (msg.role === 'system') {
            systemInstruction = {
                parts: [{ text: msg.content }]
            };
        } else {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        }
    });

    const body = { contents };
    if (systemInstruction) {
        body.system_instruction = systemInstruction;
    }
    if (asJson) {
        body.generationConfig = { response_mime_type: "application/json" };
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
        },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Gemini API Error");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (asJson) {
        try {
            return JSON.parse(cleanJsonString(text));
        } catch (e) {
            console.error("Failed to parse Gemini response", e);
            return {};
        }
    }
    return text;
}

function cleanJsonString(text) {
    if (!text) return "{}";
    let cleaned = text.trim();
    // Remove markdown code blocks if present
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?/, '').replace(/```$/, '');
    }
    return cleaned.trim();
}

/**
 * Sanitize language code to prevent prompt injection.
 * Only allows valid BCP 47-like codes (e.g., 'en', 'tr', 'zh-CN').
 */
function sanitizeLanguageCode(lang) {
    if (!lang || typeof lang !== 'string') return 'en';
    // Allow only alphanumeric, hyphens, underscores (max 10 chars)
    const sanitized = lang.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10);
    return sanitized || 'en';
}

/**
 * Validate and sanitize Ollama base URL to prevent SSRF.
 * Only allows http/https protocols and localhost/private network addresses.
 */
function sanitizeOllamaUrl(baseUrl) {
    const cleanUrl = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    try {
        const parsed = new URL(cleanUrl);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol for Ollama URL. Only http and https are allowed.');
        }
        // Only allow localhost and private network addresses
        const hostname = parsed.hostname.toLowerCase();
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
        const isPrivateNetwork = hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname);
        if (!isLocalhost && !isPrivateNetwork) {
            throw new Error('Ollama URL must point to localhost or a private network address.');
        }
        return parsed.origin;
    } catch (e) {
        if (e.message.includes('Ollama')) throw e;
        throw new Error('Invalid Ollama URL format.');
    }
}

async function callOpenRouter(messages, apiKey, model, asJson = true, signal) {
    const body = {
        model: model,
        messages: messages
    };
    if (asJson) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.href, // Required by OpenRouter
            "X-Title": "BookSmart"
        },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "OpenRouter API Error");
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    if (asJson) {
        try {
            return JSON.parse(cleanJsonString(text));
        } catch (e) {
            console.error("Failed to parse OpenRouter response", e);
            return {};
        }
    }
    return text;
}

async function callOllama(messages, baseUrl, model, asJson = true, signal) {
    const cleanUrl = sanitizeOllamaUrl(baseUrl);
    const url = `${cleanUrl}/v1/chat/completions`;

    const body = {
        model: model,
        messages: messages
    };
    if (asJson) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || "Ollama API Error. Is Ollama running?");
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    if (asJson) {
        try {
            return JSON.parse(cleanJsonString(text));
        } catch (e) {
            console.error("Failed to parse Ollama response", e);
            return {};
        }
    }
    return text;
}

export async function summarizeContent(url, apiKey, modelId, { abortSignal } = {}) {
    const modelInfo = AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
    const provider = modelInfo.provider;

    const systemPrompt = `You are a helpful assistant. Summarize the main content, topic, and purpose of the given URL or text in a short paragraph (2-3 sentences). Write the summary in the same language as the website content. Do not include introductory phrases.`;

    let pageText = `URL: ${url}`;
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, { signal: abortSignal });
        const data = await res.json();
        if (data.contents) {
            // Strip html tags roughly
            const doc = new DOMParser().parseFromString(data.contents, 'text/html');
            const textOnly = doc.body ? doc.body.textContent.replace(/\s+/g, ' ').substring(0, 15000) : data.contents.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 15000);
            pageText = `Content from URL (${url}):\n\n${textOnly}`;
        }
    } catch (e) {
        console.warn("Failed to fetch proxy content, falling back to URL only", e);
    }

    const lang = sanitizeLanguageCode(localStorage.getItem('i18nextLng') || 'en');
    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please summarize this page in '${lang}'. The summary MUST be translated natively to the language code '${lang}':\n${pageText}` }
    ];

    if (provider === 'openai') {
        return callOpenAI(messages, apiKey, modelId, false, abortSignal);
    } else if (provider === 'gemini') {
        return callGemini(messages, apiKey, modelId, false, abortSignal);
    } else if (provider === 'openrouter') {
        return callOpenRouter(messages, apiKey, modelId, false, abortSignal);
    } else if (provider === 'ollama') {
        return callOllama(messages, apiKey, modelId, false, abortSignal);
    }
    throw new Error("Invalid provider");
}

export async function fixTitles(bookmarks, apiKey, modelId, onProgress, { abortSignal } = {}) {
    const modelInfo = AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
    const provider = modelInfo.provider;

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

            let chunkResults = {};
            if (provider === 'openai') {
                chunkResults = await callOpenAI(messages, apiKey, modelId, true, abortSignal);
            } else if (provider === 'gemini') {
                chunkResults = await callGemini(messages, apiKey, modelId, true, abortSignal);
            } else if (provider === 'openrouter') {
                chunkResults = await callOpenRouter(messages, apiKey, modelId, true, abortSignal);
            } else if (provider === 'ollama') {
                chunkResults = await callOllama(messages, apiKey, modelId, true, abortSignal);
            }
            if (!abortSignal?.aborted) Object.assign(results, chunkResults);
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
    const modelInfo = AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
    const provider = modelInfo.provider;

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

            let resultJson = [];
            const handleResponse = async (callFn) => {
                const raw = await callFn(messages, apiKey, modelId, false, abortSignal);
                try {
                    return JSON.parse(cleanJsonString(raw));
                } catch (e) {
                    console.error("Failed to parse", e);
                    return [];
                }
            };

            if (provider === 'openai') {
                resultJson = await handleResponse(callOpenAI);
            } else if (provider === 'gemini') {
                resultJson = await handleResponse(callGemini);
            } else if (provider === 'openrouter') {
                resultJson = await handleResponse(callOpenRouter);
            } else if (provider === 'ollama') {
                resultJson = await handleResponse(callOllama);
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

