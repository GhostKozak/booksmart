import { withRetry, cleanJsonString } from '../ai-utils';

export async function callOpenAI({ messages, apiKey, model, asJson = true, signal }) {
    const body = {
        model: model,
        messages: messages
    };
    if (asJson) {
        body.response_format = { type: "json_object" };
    }

    const response = await withRetry(async () => {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
            signal
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || "OpenAI API Error");
        }
        return res;
    }, signal);

    const data = await response.json();
    const text = data.choices[0].message.content;

    if (asJson) {
        try {
            return JSON.parse(cleanJsonString(text));
        } catch (e) {
            console.error("Failed to parse OpenAI response", e);
            return {};
        }
    }
    return text;
}
