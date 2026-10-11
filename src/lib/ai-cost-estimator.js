import { AI_MODELS, DEFAULT_MODEL } from '../services/ai-service';

/**
 * Standard pricing per 1 Million tokens (in USD).
 * Reference: Official OpenAI, Anthropic, Google Gemini, and OpenRouter pricing documentation.
 */
export const MODEL_PRICING = {
    // --- OpenAI ---
    'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.60, name: 'GPT-4o Mini', provider: 'openai' },
    'gpt-4o': { inputPerM: 2.50, outputPerM: 10.00, name: 'GPT-4o', provider: 'openai' },
    'gpt-3.5-turbo': { inputPerM: 0.50, outputPerM: 1.50, name: 'GPT-3.5 Turbo', provider: 'openai' },

    // --- Local Ollama (Free & Offline) ---
    'llama3.2': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Llama 3.2', provider: 'ollama' },
    'qwen2.5': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Qwen 2.5', provider: 'ollama' },
    'deepseek-r1': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'DeepSeek-r1', provider: 'ollama' },

    // --- Google Gemini 2.5 (Stable) ---
    'gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 5.00, name: 'Gemini 2.5 Pro', provider: 'gemini' },
    'gemini-2.5-flash': { inputPerM: 0.075, outputPerM: 0.30, name: 'Gemini 2.5 Flash', provider: 'gemini' },
    'gemini-2.5-flash-lite': { inputPerM: 0.0375, outputPerM: 0.15, name: 'Gemini 2.5 Flash-Lite', provider: 'gemini' },

    // --- Google Gemini 2.0 ---
    'gemini-2.0-flash': { inputPerM: 0.10, outputPerM: 0.40, name: 'Gemini 2.0 Flash', provider: 'gemini' },
    'gemini-2.0-flash-lite': { inputPerM: 0.05, outputPerM: 0.20, name: 'Gemini 2.0 Flash-Lite', provider: 'gemini' },
    'gemini-2.0-flash-exp': { inputPerM: 0, outputPerM: 0, isFreeTier: true, name: 'Gemini 2.0 Flash (Exp)', provider: 'gemini' },

    // --- Google Gemini 1.5 ---
    'gemini-1.5-pro': { inputPerM: 1.25, outputPerM: 5.00, name: 'Gemini 1.5 Pro', provider: 'gemini' },
    'gemini-1.5-flash': { inputPerM: 0.075, outputPerM: 0.30, name: 'Gemini 1.5 Flash', provider: 'gemini' },
    'gemini-1.5-flash-8b': { inputPerM: 0.0375, outputPerM: 0.15, name: 'Gemini 1.5 Flash-8B', provider: 'gemini' },

    // --- Anthropic ---
    'claude-sonnet-4-20250514': { inputPerM: 3.00, outputPerM: 15.00, name: 'Claude Sonnet 4', provider: 'anthropic' },
    'claude-3-5-haiku-20241022': { inputPerM: 0.80, outputPerM: 4.00, name: 'Claude 3.5 Haiku', provider: 'anthropic' },

    // --- OpenRouter ---
    'anthropic/claude-3.5-sonnet': { inputPerM: 3.00, outputPerM: 15.00, name: 'Claude 3.5 Sonnet', provider: 'openrouter' },
    'anthropic/claude-3-opus': { inputPerM: 15.00, outputPerM: 75.00, name: 'Claude 3 Opus', provider: 'openrouter' },
    'meta-llama/llama-3.1-405b-instruct': { inputPerM: 2.00, outputPerM: 2.00, name: 'Llama 3.1 405B', provider: 'openrouter' },
};

/**
 * Get pricing definition for a given model ID.
 */
export function getModelPricing(modelId) {
    if (MODEL_PRICING[modelId]) return MODEL_PRICING[modelId];

    const modelInfo = AI_MODELS.find(m => m.id === modelId);
    if (modelInfo && modelInfo.provider === 'ollama') {
        return { inputPerM: 0, outputPerM: 0, isLocal: true, name: modelInfo.name, provider: 'ollama' };
    }

    return {
        inputPerM: 0.15,
        outputPerM: 0.60,
        name: modelInfo ? modelInfo.name : (modelId || DEFAULT_MODEL),
        provider: modelInfo ? modelInfo.provider : 'openai'
    };
}

/**
 * Estimates token counts for a batch operation.
 */
export function estimateTokens(operation = 'magicSort', bookmarks = []) {
    if (!bookmarks || bookmarks.length === 0) {
        return { inputTokens: 0, outputTokens: 0, totalTokens: 0, chunkCount: 0, chunkSize: 20 };
    }

    const chunkSize = operation === 'smartDuplicates' ? 50 : 20;
    const chunkCount = Math.ceil(bookmarks.length / chunkSize);

    let systemPromptChars = 500;
    let outputTokensPerItem = 30;

    if (operation === 'fixTitles') {
        systemPromptChars = 550;
        outputTokensPerItem = 20;
    } else if (operation === 'smartDuplicates') {
        systemPromptChars = 450;
        outputTokensPerItem = 15;
    }

    const systemPromptTokens = Math.ceil((systemPromptChars / 3.8) * chunkCount);

    const simplified = bookmarks.map(b => ({
        id: b.id || 'id',
        title: b.title || '',
        url: b.url || ''
    }));
    const userPromptChars = JSON.stringify(simplified).length;
    const userPromptTokens = Math.ceil(userPromptChars / 3.8);

    const inputTokens = systemPromptTokens + userPromptTokens;
    const outputTokens = bookmarks.length * outputTokensPerItem;
    const totalTokens = inputTokens + outputTokens;

    return {
        inputTokens,
        outputTokens,
        totalTokens,
        chunkCount,
        chunkSize
    };
}

/**
 * Format total cost in USD for user display.
 */
export function formatCost(totalCost, isLocal = false) {
    if (isLocal) return '$0.00 (Local)';
    if (totalCost === 0) return '$0.00';
    if (totalCost < 0.0001) return '< $0.0001';
    if (totalCost < 0.01) return `$${totalCost.toFixed(4)}`;
    return `$${totalCost.toFixed(3)}`;
}

/**
 * Calculates estimated cost in USD based on token counts and model pricing.
 */
export function calculateCost(inputTokens, outputTokens, modelId = DEFAULT_MODEL) {
    const pricing = getModelPricing(modelId);

    if (pricing.isLocal) {
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            isLocal: true,
            isFree: true,
            formattedCost: '$0.00 (Local / Free)',
            pricing
        };
    }

    if (pricing.isFreeTier) {
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            isLocal: false,
            isFree: true,
            formattedCost: '$0.00 (Free Tier)',
            pricing
        };
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerM;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerM;
    const totalCost = inputCost + outputCost;

    return {
        inputCost,
        outputCost,
        totalCost,
        isLocal: false,
        isFree: false,
        formattedCost: formatCost(totalCost),
        pricing
    };
}

/**
 * Format token count with thousand separators.
 */
export function formatTokenCount(count, locale = 'en-US') {
    if (count === undefined || count === null) return '0';
    return Number(count).toLocaleString(locale);
}

/**
 * Comprehensive estimation for a batch operation.
 */
export function estimateBatchOperation(operation = 'magicSort', bookmarks = [], modelId = DEFAULT_MODEL) {
    const tokens = estimateTokens(operation, bookmarks);
    const cost = calculateCost(tokens.inputTokens, tokens.outputTokens, modelId);
    return {
        itemCount: bookmarks ? bookmarks.length : 0,
        ...tokens,
        ...cost
    };
}
