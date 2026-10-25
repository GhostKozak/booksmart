import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBrowserAICapability, callBrowserAI } from '../providers/browser-ai-provider';
import { checkOllamaHealth, fetchOllamaModels, callOllama } from '../providers/ollama-provider';
import { isLocalAIProvider } from '../../ai-service';

global.fetch = vi.fn();

describe('Local AI Providers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete window.ai;
        delete globalThis.ai;
    });

    describe('isLocalAIProvider', () => {
        it('returns true for ollama and browser', () => {
            expect(isLocalAIProvider('ollama')).toBe(true);
            expect(isLocalAIProvider('browser')).toBe(true);
            expect(isLocalAIProvider('openai')).toBe(false);
            expect(isLocalAIProvider('gemini')).toBe(false);
            expect(isLocalAIProvider('anthropic')).toBe(false);
        });
    });

    describe('Browser AI Provider (Prompt API / Gemini Nano)', () => {
        it('reports unavailable when window.ai is missing', async () => {
            const cap = await getBrowserAICapability();
            expect(cap.supported).toBe(false);
            expect(cap.status).toBe('unavailable');
        });

        it('reports supported when window.ai.languageModel is available', async () => {
            window.ai = {
                languageModel: {
                    capabilities: vi.fn().mockResolvedValue({ available: 'readily' })
                }
            };

            const cap = await getBrowserAICapability();
            expect(cap.supported).toBe(true);
            expect(cap.status).toBe('readily');
        });

        it('executes prompt through window.ai.languageModel session', async () => {
            const mockPrompt = vi.fn().mockResolvedValue('{"result": "success"}');
            const mockDestroy = vi.fn();
            const mockCreate = vi.fn().mockResolvedValue({
                prompt: mockPrompt,
                destroy: mockDestroy
            });

            window.ai = {
                languageModel: {
                    create: mockCreate
                }
            };

            const result = await callBrowserAI({
                messages: [
                    { role: 'system', content: 'You are an assistant' },
                    { role: 'user', content: 'Say hello' }
                ],
                asJson: true
            });

            expect(mockCreate).toHaveBeenCalled();
            expect(mockPrompt).toHaveBeenCalledWith(expect.stringContaining('Say hello'), expect.any(Object));
            expect(mockDestroy).toHaveBeenCalled();
            expect(result).toEqual({ result: 'success' });
        });

        it('throws helpful error if browser AI is not available when called', async () => {
            await expect(callBrowserAI({ messages: [] })).rejects.toThrow(/In-browser local AI|Prompt API/i);
        });
    });

    describe('Ollama Provider', () => {
        it('checks Ollama health successfully', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ version: '0.3.14' })
            });

            const res = await checkOllamaHealth('http://localhost:11434');
            expect(res.ok).toBe(true);
            expect(res.version).toBe('0.3.14');
        });

        it('handles Ollama health check failure gracefully', async () => {
            fetch.mockRejectedValueOnce(new Error('Connection refused'));

            const res = await checkOllamaHealth('http://localhost:11434');
            expect(res.ok).toBe(false);
            expect(res.error).toContain('Connection refused');
        });

        it('fetches installed Ollama models and formats sizes', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    models: [
                        { name: 'llama3:latest', size: 4.7 * 1024 * 1024 * 1024 },
                        { name: 'mistral:latest', size: 4.1 * 1024 * 1024 * 1024 }
                    ]
                })
            });

            const models = await fetchOllamaModels('http://localhost:11434');
            expect(models).toHaveLength(2);
            expect(models[0].id).toBe('llama3:latest');
            expect(models[0].name).toContain('4.7 GB');
            expect(models[0].isLocal).toBe(true);
        });

        it('calls Ollama chat completion API with proper payload', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: JSON.stringify({ category: 'News' })
                        }
                    }]
                })
            });

            const response = await callOllama({
                messages: [{ role: 'user', content: 'Categorize' }],
                apiKey: 'http://localhost:11434',
                model: 'llama3.2',
                asJson: true
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:11434/v1/chat/completions',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: expect.stringContaining('"model":"llama3.2"')
                })
            );
            expect(response).toEqual({ category: 'News' });
        });
    });
});
