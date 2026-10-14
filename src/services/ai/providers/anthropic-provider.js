import { withRetry, cleanJsonString } from '../ai-utils';

export async function callAnthropic({ messages, apiKey, model, asJson = true, signal }) {
    const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const body = {
        model: model,
        max_tokens: 4096,
        messages: chatMessages.map(m => ({ role: m.role, content: m.content }))
    };
    if (systemMessages) {
        body.system = systemMessages;
    }

    const response = await withRetry(async () => {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true"
            },
            body: JSON.stringify(body),
            signal
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error?.message || "Anthropic API Error");
        }
        return res;
    }, signal);

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    if (asJson) {
        try {
            return JSON.parse(cleanJsonString(text));
        } catch (e) {
            console.error("Failed to parse Anthropic response", e);
            return {};
        }
    }
    return text;
}
