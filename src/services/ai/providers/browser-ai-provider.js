import { cleanJsonString } from '../ai-utils';

/**
 * Checks whether the browser has built-in Prompt API / Gemini Nano support.
 * @returns {Promise<{ supported: boolean, status: string, error?: string }>}
 */
export async function getBrowserAICapability() {
    if (typeof window === 'undefined') {
        return { supported: false, status: 'unavailable', message: 'Environment not supported' };
    }

    const aiObj = window.ai || (typeof globalThis !== 'undefined' ? globalThis.ai : null);
    if (!aiObj?.languageModel) {
        return {
            supported: false,
            status: 'unavailable',
            message: 'In-browser AI API not found (Chrome 128+ with Prompt API flag required).'
        };
    }

    try {
        if (typeof aiObj.languageModel.capabilities === 'function') {
            const caps = await aiObj.languageModel.capabilities();
            return {
                supported: caps.available !== 'no',
                status: caps.available || 'readily'
            };
        }
        if (typeof aiObj.languageModel.availability === 'function') {
            const availability = await aiObj.languageModel.availability();
            return {
                supported: availability !== 'no' && availability !== 'none',
                status: availability
            };
        }
        return { supported: true, status: 'readily' };
    } catch (err) {
        return { supported: false, status: 'error', error: err.message };
    }
}

/**
 * Dispatches a prompt to the browser's built-in local language model.
 * Completely private, offline, and requires no API keys.
 */
export async function callBrowserAI({ messages, asJson = true, signal }) {
    const aiObj = (typeof window !== 'undefined' && window.ai) || (typeof globalThis !== 'undefined' ? globalThis.ai : null);
    if (!aiObj?.languageModel) {
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
        session = await aiObj.languageModel.create(createOptions);
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
