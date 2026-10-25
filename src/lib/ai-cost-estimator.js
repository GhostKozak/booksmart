import { AI_MODELS, DEFAULT_MODEL, resolveEffectiveModel, resolveProviderForModel } from '../services/ai-service';

/**
 * Standard pricing per 1 Million tokens (in USD).
 * Reference: Official OpenAI, Anthropic, Google Gemini, and OpenRouter pricing documentation.
 */
export const MODEL_PRICING = {
    // --- OpenAI ---
    'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.60, name: 'GPT-4o Mini', provider: 'openai' },
    'gpt-4o': { inputPerM: 2.50, outputPerM: 10.00, name: 'GPT-4o', provider: 'openai' },
    'gpt-4.5-preview': { inputPerM: 75.00, outputPerM: 150.00, name: 'GPT-4.5 (Preview)', provider: 'openai' },
    'o3-mini': { inputPerM: 1.10, outputPerM: 4.40, name: 'o3-mini', provider: 'openai' },
    'o1': { inputPerM: 15.00, outputPerM: 60.00, name: 'o1', provider: 'openai' },
    'o1-mini': { inputPerM: 1.10, outputPerM: 4.40, name: 'o1-mini', provider: 'openai' },
    'gpt-3.5-turbo': { inputPerM: 0.50, outputPerM: 1.50, name: 'GPT-3.5 Turbo', provider: 'openai' },

    // --- Local & Browser AI (Free & Offline) ---
    'browser-builtin': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'In-Browser AI (Gemini Nano)', provider: 'browser' },
    'llama3.2': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Llama 3.2', provider: 'ollama' },
    'llama3.3': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Llama 3.3 70B', provider: 'ollama' },
    'deepseek-r1': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'DeepSeek R1', provider: 'ollama' },
    'qwen2.5': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Qwen 2.5', provider: 'ollama' },
    'mistral': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Mistral 7B', provider: 'ollama' },
    'phi4': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Microsoft Phi-4', provider: 'ollama' },
    'gemma2': { inputPerM: 0, outputPerM: 0, isLocal: true, name: 'Google Gemma 2', provider: 'ollama' },

    // --- Google Gemini 2.5, 2.0 & 1.5 ---
    'gemini-2.5-flash': { inputPerM: 0.075, outputPerM: 0.30, name: 'Gemini 2.5 Flash', provider: 'gemini' },
    'gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 5.00, name: 'Gemini 2.5 Pro', provider: 'gemini' },
    'gemini-2.0-flash': { inputPerM: 0.10, outputPerM: 0.40, name: 'Gemini 2.0 Flash', provider: 'gemini' },
    'gemini-2.0-flash-lite': { inputPerM: 0.05, outputPerM: 0.20, name: 'Gemini 2.0 Flash-Lite', provider: 'gemini' },
    'gemini-2.0-flash-exp': { inputPerM: 0, outputPerM: 0, isFreeTier: true, name: 'Gemini 2.0 Flash (Exp)', provider: 'gemini' },
    'gemini-1.5-pro': { inputPerM: 1.25, outputPerM: 5.00, name: 'Gemini 1.5 Pro', provider: 'gemini' },
    'gemini-1.5-flash': { inputPerM: 0.075, outputPerM: 0.30, name: 'Gemini 1.5 Flash', provider: 'gemini' },
    'gemini-1.5-flash-8b': { inputPerM: 0.0375, outputPerM: 0.15, name: 'Gemini 1.5 Flash-8B', provider: 'gemini' },
    'gemini-3.5-flash-lite': { inputPerM: 0.0375, outputPerM: 0.15, name: 'Gemini 3.5 Flash-Lite', provider: 'gemini' },
    'gemini-2.5-flash-lite': { inputPerM: 0.0375, outputPerM: 0.15, name: 'Gemini 2.5 Flash-Lite', provider: 'gemini' },

    // --- Anthropic ---
    'claude-3-7-sonnet-20250219': { inputPerM: 3.00, outputPerM: 15.00, name: 'Claude 3.7 Sonnet', provider: 'anthropic' },
    'claude-3-5-sonnet-20241022': { inputPerM: 3.00, outputPerM: 15.00, name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    'claude-3-5-haiku-20241022': { inputPerM: 0.80, outputPerM: 4.00, name: 'Claude 3.5 Haiku', provider: 'anthropic' },
    'claude-3-opus-20240229': { inputPerM: 15.00, outputPerM: 75.00, name: 'Claude 3 Opus', provider: 'anthropic' },

    // --- OpenRouter ---
    'anthropic/claude-3.7-sonnet': { inputPerM: 3.00, outputPerM: 15.00, name: 'Claude 3.7 Sonnet', provider: 'openrouter' },
    'anthropic/claude-3.5-sonnet': { inputPerM: 3.00, outputPerM: 15.00, name: 'Claude 3.5 Sonnet', provider: 'openrouter' },
    'deepseek/deepseek-r1': { inputPerM: 0.55, outputPerM: 2.19, name: 'DeepSeek R1', provider: 'openrouter' },
    'meta-llama/llama-3.3-70b-instruct': { inputPerM: 0.12, outputPerM: 0.30, name: 'Llama 3.3 70B', provider: 'openrouter' },
    'meta-llama/llama-3.1-405b-instruct': { inputPerM: 2.00, outputPerM: 2.00, name: 'Llama 3.1 405B', provider: 'openrouter' },
    'google/gemini-2.5-flash': { inputPerM: 0.075, outputPerM: 0.30, name: 'Gemini 2.5 Flash (via OpenRouter)', provider: 'openrouter' },
    'google/gemini-2.0-flash-001': { inputPerM: 0.10, outputPerM: 0.40, name: 'Gemini 2.0 Flash (via OpenRouter)', provider: 'openrouter' },
    'qwen/qwen-2.5-72b-instruct': { inputPerM: 0.35, outputPerM: 0.40, name: 'Qwen 2.5 72B', provider: 'openrouter' },
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
