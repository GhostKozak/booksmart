import { callOpenAI } from './providers/openai-provider';
import { callGemini } from './providers/gemini-provider';
import { callAnthropic } from './providers/anthropic-provider';
import { callOpenRouter } from './providers/openrouter-provider';
import { callOllama } from './providers/ollama-provider';
import { callBrowserAI } from './providers/browser-ai-provider';

const PROVIDER_STRATEGIES = {
    openai: callOpenAI,
    gemini: callGemini,
    anthropic: callAnthropic,
    openrouter: callOpenRouter,
    ollama: callOllama,
    browser: callBrowserAI
};

/**
 * Dispatches an AI prompt request to the appropriate provider adapter.
 * @param {Object} options
 * @param {string} options.provider - 'openai' | 'gemini' | 'anthropic' | 'openrouter' | 'ollama'
 * @param {Array} options.messages - [{ role, content }]
 * @param {string} options.apiKey - API Key or base URL
 * @param {string} options.model - Model identifier
 * @param {boolean} [options.asJson=true] - Whether to enforce and parse JSON response
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<any>}
 */
export async function executeAIRequest({ provider, messages, apiKey, model, asJson = true, signal }) {
    const strategy = PROVIDER_STRATEGIES[provider];
    if (!strategy) {
        throw new Error("Invalid provider");
    }
    return strategy({ messages, apiKey, model, asJson, signal });
}
