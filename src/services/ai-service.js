export const AI_MODELS = [
    // --- OpenAI ---
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },

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
export async function categorizeBookmarks(bookmarks, apiKey, modelId, onProgress) {
    // Determine provider from modelId
    const modelInfo = AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
    const provider = modelInfo.provider;

    const chunks = [];
    for (let i = 0; i < bookmarks.length; i += CHUNK_SIZE) {
        chunks.push(bookmarks.slice(i, i + CHUNK_SIZE));
    }

    let processedCount = 0;
    const results = {};

    // Helper to process a single chunk
    const processChunk = async (chunk) => {
        try {
            const categories = await fetchCategories(chunk, apiKey, provider, modelId);
            Object.assign(results, categories);
        } catch (error) {
            console.error("Error processing chunk:", error);
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
                const chunk = queue.shift();
                await processChunk(chunk);
            }
        })());
    }

    await Promise.all(workers);
    return results;
}

async function fetchCategories(bookmarks, apiKey, provider, modelId) {
    const simplified = bookmarks.map(b => ({
        id: b.id,
        title: b.title,
        url: b.url
    }));

    const systemPrompt = `You are a bookmark organizer. Analyze the following list of bookmarks. 
  Return a JSON object where the key is the ID and the value is a short, concise category name (e.g., 'Development', 'News', 'Shopping', 'Entertainment', 'Tools', 'Reading'). 
  Use Title Case for categories. Do not return any explanations, just the JSON.`;

    if (provider === 'openai') {
        return callOpenAI(simplified, apiKey, modelId, systemPrompt);
    } else if (provider === 'gemini') {
        return callGemini(simplified, apiKey, modelId, systemPrompt);
    } else if (provider === 'openrouter') {
        return callOpenRouter(simplified, apiKey, modelId, systemPrompt);
    }

    throw new Error("Invalid provider");
}

async function callOpenAI(bookmarks, apiKey, model, systemPrompt) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify(bookmarks) }
            ],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "OpenAI API Error");
    }

    const data = await response.json();
    try {
        return JSON.parse(data.choices[0].message.content);
    } catch (e) {
        console.error("Failed to parse OpenAI response", e);
        return {};
    }
}

async function callGemini(bookmarks, apiKey, model, systemPrompt) {
    // Use the specific model provided, fallback to current assumption if needed
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: systemPrompt + "\n\n" + JSON.stringify(bookmarks)
                }]
            }],
            generationConfig: {
                response_mime_type: "application/json"
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Gemini API Error");
    }

    const data = await response.json();
    try {
        const text = data.candidates[0].content.parts[0].text;
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse Gemini response", e);
        return {};
    }
}

async function callOpenRouter(bookmarks, apiKey, model, systemPrompt) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.href, // Required by OpenRouter
            "X-Title": "BookSmart"
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: JSON.stringify(bookmarks) }
            ],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "OpenRouter API Error");
    }

    const data = await response.json();
    try {
        return JSON.parse(data.choices[0].message.content);
    } catch (e) {
        console.error("Failed to parse OpenRouter response", e);
        return {};
    }
}
