import { AI_MODELS, DEFAULT_MODEL, resolveEffectiveModel, resolveProviderForModel } from '../services/ai-service';

/**
 * Standard pricing per 1 Million tokens (in USD).
 * Reference: Official OpenAI, Anthropic, Google Gemini, and OpenRouter pricing documentation.
 */
export const MODEL_PRICING = {
    // --- Google Gemini (Active 3.x & 4 Series) ---
    'gemini-3.5-flash-lite': { inputPerM: 0.0375, outputPerM: 0.15, name: 'Gemini 3.5 Flash-Lite', provider: 'gemini' },
    'gemini-3.6-flash': { inputPerM: 0.075, outputPerM: 0.30, name: 'Gemini 3.6 Flash', provider: 'gemini' },
    'gemini-3.8-flash': { inputPerM: 0.10, outputPerM: 0.40, name: 'Gemini 3.8 Flash', provider: 'gemini' },
    'gemini-3.5-pro': { inputPerM: 1.25, outputPerM: 5.00, name: 'Gemini 3.5 Pro', provider: 'gemini' },
    'gemini-4-argon': { inputPerM: 2.00, outputPerM: 8.00, name: 'Gemini 4 Argon', provider: 'gemini' },

    // --- OpenAI (GPT-6 Series) ---
    'gpt-6.1-sol': { inputPerM: 1.00, outputPerM: 4.00, name: 'GPT-6.1 Sol', provider: 'openai' },
    'gpt-6-luna': { inputPerM: 0.15, outputPerM: 0.60, name: 'GPT-6 Luna', provider: 'openai' },
    'gpt-6-astra': { inputPerM: 2.50, outputPerM: 10.00, name: 'GPT-6 Astra', provider: 'openai' },

    // --- Anthropic (Claude 5 Series) ---
    'claude-haiku-5-5': { inputPerM: 0.10, outputPerM: 0.50, name: 'Claude Haiku 5.5', provider: 'anthropic' },
    'claude-sonnet-5-5': { inputPerM: 2.00, outputPerM: 10.00, name: 'Claude Sonnet 5.5', provider: 'anthropic' },
    'claude-opus-5-5': { inputPerM: 4.00, outputPerM: 20.00, name: 'Claude Opus 5.5', provider: 'anthropic' },
    'claude-fable-5-1': { inputPerM: 10.00, outputPerM: 50.00, name: 'Claude Fable 5.1', provider: 'anthropic' },

    // --- Local & Browser AI (Free & Offline) ---
    'browser-builtin': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'In-Browser AI (Gemini Nano)', provider: 'browser' },
    'llama4': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Llama 4', provider: 'ollama' },
    'llama3.1': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Llama 3.1', provider: 'ollama' },
    'deepseek-r1': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'DeepSeek R1', provider: 'ollama' },
    'qwen3.8': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Qwen 3.8', provider: 'ollama' },
    'gpt-oss': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'GPT-OSS (Local)', provider: 'ollama' },

    // --- OpenRouter ---
    'google/gemini-3.6-flash': { inputPerM: 0.075, outputPerM: 0.30, name: 'Gemini 3.6 Flash (via OpenRouter)', provider: 'openrouter' },
    'google/gemini-4-argon': { inputPerM: 2.00, outputPerM: 8.00, name: 'Gemini 4 Argon (via OpenRouter)', provider: 'openrouter' },
    'anthropic/claude-sonnet-5-5': { inputPerM: 2.00, outputPerM: 10.00, name: 'Claude Sonnet 5.5 (via OpenRouter)', provider: 'openrouter' },
    'anthropic/claude-haiku-5-5': { inputPerM: 0.10, outputPerM: 0.50, name: 'Claude Haiku 5.5 (via OpenRouter)', provider: 'openrouter' },
    'openai/gpt-6.1-sol': { inputPerM: 1.00, outputPerM: 4.00, name: 'GPT-6.1 Sol (via OpenRouter)', provider: 'openrouter' },
    'deepseek/deepseek-r1': { inputPerM: 0.55, outputPerM: 2.19, name: 'DeepSeek R1 (via OpenRouter)', provider: 'openrouter' },
    'meta-llama/llama-4': { inputPerM: 0.12, outputPerM: 0.30, name: 'Llama 4 (via OpenRouter)', provider: 'openrouter' },
    'qwen/qwen-3.8': { inputPerM: 0.35, outputPerM: 0.40, name: 'Qwen 3.8 (via OpenRouter)', provider: 'openrouter' },

    // --- Legacy / Deprecated Fallback Pricing Aliases ---
    'gemini-2.5-flash-lite': { inputPerM: 0.0375, outputPerM: 0.15, name: 'Gemini 2.5 Flash-Lite (Legacy)', provider: 'gemini' },
    'gemini-2.0-flash-exp': { inputPerM: 0, outputPerM: 0, isFreeTier: true, name: 'Gemini 2.0 Flash (Exp)', provider: 'gemini' },
    'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.60, name: 'GPT-4o Mini', provider: 'openai' },
    'llama3.2': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Llama 3.2 (Legacy)', provider: 'ollama' },
};

/**
 * Get pricing definition for a given model ID.
 */
export function getModelPricing(modelId) {
    if (MODEL_PRICING[modelId]) return MODEL_PRICING[modelId];

    const resolved = resolveEffectiveModel ? resolveEffectiveModel(modelId) : modelId;
    if (MODEL_PRICING[resolved]) return MODEL_PRICING[resolved];

    const provider = resolveProviderForModel(modelId);
    if (provider === 'ollama' || provider === 'browser') {
        return { inputPerM: 0, outputPerM: 0, isLocal: true, name: modelId, provider };
    }

    const modelInfo = AI_MODELS.find(m => m.id === modelId || m.id === resolved);
    return {
        inputPerM: 0.15,
        outputPerM: 0.60,
        name: modelInfo ? modelInfo.name : (modelId || DEFAULT_MODEL),
        provider: modelInfo ? modelInfo.provider : provider
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
