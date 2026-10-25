import { withRetry, cleanJsonString, sanitizeOllamaUrl } from '../ai-utils';

/**
 * Checks connection health to a local Ollama server.
 * @param {string} [baseUrl]
 * @returns {Promise<{ ok: boolean, version?: string, error?: string }>}
 */
export async function checkOllamaHealth(baseUrl) {
    try {
        const cleanUrl = sanitizeOllamaUrl(baseUrl);
        const res = await fetch(`${cleanUrl}/api/version`, {
            method: 'GET'
        });
        if (!res.ok) {
            return { ok: false, error: `HTTP ${res.status}` };
        }
        const data = await res.json().catch(() => ({}));
        return { ok: true, version: data.version || 'running' };
    } catch (err) {
        return { ok: false, error: err.message || 'Sunucuya ulaşılamadı' };
    }
}

/**
 * Fetches all installed models from local Ollama instance (GET /api/tags).
 * @param {string} [baseUrl]
 * @returns {Promise<Array<{ id: string, name: string, provider: 'ollama', isLocal: boolean, size: number }>>}
 */
export async function fetchOllamaModels(baseUrl) {
    try {
        const cleanUrl = sanitizeOllamaUrl(baseUrl);
        const res = await fetch(`${cleanUrl}/api/tags`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return [];

        const data = await res.json();
        const list = Array.isArray(data?.models) ? data.models : [];
        return list.map(m => {
            const rawSize = m.size || 0;
            const sizeGb = Math.round((rawSize / (1024 * 1024 * 1024)) * 10) / 10;
            const sizeLabel = sizeGb > 0 ? ` (${sizeGb} GB)` : '';
            return {
                id: m.name,
                name: `${m.name}${sizeLabel} [Yerel Ollama]`,
                provider: 'ollama',
                isLocal: true,
                size: rawSize
            };
        });
    } catch {
        return [];
    }
}

export async function callOllama({ messages, apiKey: baseUrl, model, asJson = true, signal }) {
    const cleanUrl = sanitizeOllamaUrl(baseUrl);
    const url = `${cleanUrl}/v1/chat/completions`;

    const body = {
        model: model,
        messages: messages
    };
    if (asJson) {
        body.response_format = { type: "json_object" };
    }

    const response = await withRetry(async () => {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            signal
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error?.message || "Ollama API Error. Is Ollama running?");
        }
        return res;
    }, signal);

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
