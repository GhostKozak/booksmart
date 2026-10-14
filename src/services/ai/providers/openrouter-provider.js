import { withRetry, cleanJsonString } from '../ai-utils';

export async function callOpenRouter({ messages, apiKey, model, asJson = true, signal }) {
    const body = {
        model: model,
        messages: messages
    };
    if (asJson) {
        body.response_format = { type: "json_object" };
    }

    const response = await withRetry(async () => {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": typeof window !== 'undefined' ? window.location.href : 'https://booksmart.local',
                "X-Title": "BookSmart"
            },
            body: JSON.stringify(body),
            signal
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || "OpenRouter API Error");
        }
        return res;
    }, signal);

    const data = await response.json();
    const text = data.choices[0].message.content;

    if (asJson) {
        try {
            return JSON.parse(cleanJsonString(text));
        } catch (e) {
            console.error("Failed to parse OpenRouter response", e);
            return {};
        }
    }
    return text;
}
