import { withRetry, cleanJsonString, sanitizeOllamaUrl } from '../ai-utils';

/**
 * Checks connection health to a local Ollama server with timeout.
 * First checks /api/version, falls back to /api/tags if /api/version is not supported.
 * @param {string} [baseUrl]
 * @param {number} [timeoutMs=2500]
 * @returns {Promise<{ ok: boolean, version?: string, url?: string, error?: string }>}
 */
export async function checkOllamaHealth(baseUrl, timeoutMs = 2500) {
    try {
        const cleanUrl = sanitizeOllamaUrl(baseUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            let res = await fetch(`${cleanUrl}/api/version`, {
                method: 'GET',
                signal: controller.signal
            });

            // If /api/version returned 404 (older Ollama releases), fall back to /api/tags
            if (res && res.status === 404) {
                res = await fetch(`${cleanUrl}/api/tags`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });
            }

            if (res && res.ok) {
                const data = await res.json().catch(() => ({}));
                return { ok: true, version: data.version || 'running', url: cleanUrl };
            }
            return { ok: false, error: res ? `HTTP ${res.status}` : 'No response from Ollama', url: cleanUrl };
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (err) {
        return {
            ok: false,
            error: err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Could not connect to Ollama server'),
            url: baseUrl || 'http://localhost:11434'
        };
    }
}

/**
 * Fetches all installed models from local Ollama instance (GET /api/tags).
 * @param {string} [baseUrl]
 * @param {number} [timeoutMs=3500]
 * @returns {Promise<Array<{ id: string, name: string, provider: 'ollama', isLocal: boolean, size: number, details?: object }>>}
 */
export async function fetchOllamaModels(baseUrl, timeoutMs = 3500) {
    try {
        const cleanUrl = sanitizeOllamaUrl(baseUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(`${cleanUrl}/api/tags`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!res.ok) return [];

        const data = await res.json();
        const list = Array.isArray(data?.models) ? data.models : [];
        return list.map(m => {
            const rawSize = m.size || 0;
            const sizeGb = Math.round((rawSize / (1024 * 1024 * 1024)) * 10) / 10;
            const sizeLabel = sizeGb > 0 ? ` (${sizeGb} GB)` : '';
            const paramSize = m.details?.parameter_size ? ` [${m.details.parameter_size}]` : '';
            return {
                id: m.name,
                name: `${m.name}${paramSize}${sizeLabel}`,
                provider: 'ollama',
                isLocal: true,
                size: rawSize,
                details: m.details || {}
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
