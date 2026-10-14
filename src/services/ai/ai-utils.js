const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export async function withRetry(fn, signal) {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            return await fn();
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            lastError = error;
            const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit');
            const isServerError = error.message?.includes('500') || error.message?.includes('502') || error.message?.includes('503');
            if (!isRateLimit && !isServerError) throw error;
            if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

export function cleanJsonString(text) {
    if (!text) return "{}";
    let cleaned = text.trim();
    // Remove markdown code blocks — handles multi-line fences and extra backticks
    const fenceMatch = cleaned.match(/^`{3,}(?:json)?\s*\n?([\s\S]*?)`{3,}\s*$/);
    if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
    }
    return cleaned;
}

/**
 * Sanitize language code to prevent prompt injection.
 * Only allows valid BCP 47-like codes (e.g., 'en', 'tr', 'zh-CN').
 */
export function sanitizeLanguageCode(lang) {
    if (!lang || typeof lang !== 'string') return 'en';
    // Allow only alphanumeric, hyphens, underscores (max 10 chars)
    const sanitized = lang.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10);
    return sanitized || 'en';
}

/**
 * Validate and sanitize Ollama base URL to prevent SSRF.
 * Only allows http/https protocols and localhost/private network addresses.
 */
export function sanitizeOllamaUrl(baseUrl) {
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

export function getProxiedUrl(url, corsProxy) {
    if (!corsProxy) return url;
    const cleanProxy = corsProxy.trim();
    if (!cleanProxy) return url;
    if (cleanProxy.includes('?url=')) {
        return `${cleanProxy}${encodeURIComponent(url)}`;
    }
    if (cleanProxy.endsWith('/')) {
        return `${cleanProxy}${url}`;
    }
    return `${cleanProxy}/${url}`;
}
