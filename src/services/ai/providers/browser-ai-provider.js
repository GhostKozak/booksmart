import { cleanJsonString } from '../ai-utils';

/**
 * Resolves the underlying Chrome / browser language model API object across
 * various Chrome versions and experimental contexts.
 */
function getLanguageModelApi() {
    if (typeof window === 'undefined' && typeof globalThis === 'undefined') return null;
    const globalObj = typeof window !== 'undefined' ? window : globalThis;
    const aiObj = globalObj.ai || (typeof globalThis !== 'undefined' ? globalThis.ai : null);
    
    // Chrome 131+ W3C Prompt API / Chrome 128-130 / Early assistant API / Extension Origin Trial
    return (
        aiObj?.languageModel ||
        aiObj?.assistant ||
        (globalObj.chrome?.aiOriginTrial?.languageModel) ||
        null
    );
}

/**
 * Checks whether the browser has built-in Prompt API / Gemini Nano support.
 * @returns {Promise<{ supported: boolean, status: string, needsDownload?: boolean, message?: string, error?: string }>}
 */
export async function getBrowserAICapability() {
    if (typeof window === 'undefined') {
        return { supported: false, status: 'unavailable', message: 'Environment not supported' };
    }

    const lm = getLanguageModelApi();
    if (!lm) {
        return {
            supported: false,
            status: 'unavailable',
            message: 'In-browser AI API not found (Chrome 128+ with Prompt API flag required).'
        };
    }

    try {
        // Modern Prompt API spec (Chrome 131+)
        if (typeof lm.availability === 'function') {
            const availability = await lm.availability();
            const isSupported = availability !== 'no' && availability !== 'none';
            return {
                supported: isSupported,
                status: availability || (isSupported ? 'readily' : 'no'),
                needsDownload: availability === 'after-download'
            };
        }

        // Capabilities API (Chrome 128-130)
        if (typeof lm.capabilities === 'function') {
            const caps = await lm.capabilities();
            const available = caps?.available || 'readily';
            return {
                supported: available !== 'no',
                status: available,
                needsDownload: available === 'after-download'
            };
        }

        // Fallback if lm exists and has create
        if (typeof lm.create === 'function') {
            return { supported: true, status: 'readily', needsDownload: false };
        }

        return { supported: false, status: 'unavailable', message: 'Language model API incomplete' };
    } catch (err) {
        return { supported: false, status: 'error', error: err.message };
    }
}

/**
 * Dispatches a prompt to the browser's built-in local language model.
 * Completely private, offline, and requires no API keys.
 */
export async function callBrowserAI({ messages, asJson = true, signal }) {
    const lm = getLanguageModelApi();
    if (!lm || typeof lm.create !== 'function') {
        throw new Error('In-browser local AI (Chrome Prompt API) is not available in this browser. Please open chrome://flags/#prompt-api-for-gemini-nano in Chrome 128+ or use Ollama.');
    }

    let systemPrompt = '';
    const parts = [];

    for (const msg of messages || []) {
        if (msg.role === 'system') {
            systemPrompt += (msg.content || '') + '\n';
        } else {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            parts.push(`${role}: ${msg.content || ''}`);
        }
    }

    const promptText = `${parts.join('\n\n')}\n\nAssistant:`;

    let session;
    try {
        const createOptions = systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : undefined;
        session = await lm.create(createOptions);
    } catch (e) {
        throw new Error(`Failed to initialize in-browser model session: ${e.message}`);
    }

    try {
        const responseText = await session.prompt(promptText, { signal });
        if (asJson) {
            try {
                return JSON.parse(cleanJsonString(responseText));
            } catch (jsonErr) {
                console.error('Failed to parse Browser AI output as JSON:', jsonErr);
                return {};
            }
        }
        return responseText;
    } finally {
        if (session && typeof session.destroy === 'function') {
            session.destroy();
        }
    }
}
