import { withRetry, cleanJsonString } from '../ai-utils';

export async function callGemini({ messages, apiKey, model, asJson = true, signal }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    let systemInstruction = undefined;
    const contents = [];

    messages.forEach(msg => {
        if (msg.role === 'system') {
            systemInstruction = {
                parts: [{ text: msg.content }]
            };
        } else {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        }
    });

    const body = { contents };
    if (systemInstruction) {
        body.system_instruction = systemInstruction;
    }
    if (asJson) {
        body.generationConfig = { response_mime_type: "application/json" };
    }

    const response = await withRetry(async () => {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify(body),
            signal
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error?.message || "Gemini API Error");
        }
        return res;
    }, signal);

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (asJson) {
        try {
            return JSON.parse(cleanJsonString(text));
        } catch (e) {
            console.error("Failed to parse Gemini response", e);
            return {};
        }
    }
    return text;
}
