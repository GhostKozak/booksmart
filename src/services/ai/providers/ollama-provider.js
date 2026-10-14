import { withRetry, cleanJsonString, sanitizeOllamaUrl } from '../ai-utils';

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
