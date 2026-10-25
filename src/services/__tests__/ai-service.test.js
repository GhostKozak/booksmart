import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    categorizeBookmarks,
    summarizeContent,
    generateOneSentenceSummary,
    cleanOneSentenceSummary,
    resolveEffectiveModel,
    resolveProviderForModel,
    MODEL_ALIASES,
    AI_MODELS
} from '../ai-service';

// Mock Fetch
global.fetch = vi.fn();

describe('AI Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('categorizeBookmarks should call OpenAI API correctly', async () => {
        const bookmarks = [{ id: '1', title: 'OpenAI', url: 'https://openai.com' }];
        const apiKey = 'test-key';
        const modelId = 'gpt-4o-mini';

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({ '1': { folder: 'Tech', tags: ['ai'] } })
                    }
                }]
            })
        });

        const results = await categorizeBookmarks(bookmarks, apiKey, modelId);

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('openai.com'),
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-key'
                })
            })
        );
        expect(results['1'].folder).toBe('Tech');
    });

    it('categorizeBookmarks should handles cleanJsonString correctly (removing markdown)', async () => {
        const bookmarks = [{ id: '1', title: 'Test', url: 'test.com' }];

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: '```json\n{"1": {"folder": "Work"}}\n```'
                    }
                }]
            })
        });

        const results = await categorizeBookmarks(bookmarks, 'key', 'gpt-4o-mini');
        expect(results['1'].folder).toBe('Work');
    });

    it('summarizeContent should use proxy and call provider API', async () => {
        const url = 'https://example.com';

        // Mock direct URL content fetch
        fetch.mockResolvedValueOnce({
            ok: true,
            text: async () => '<html><body>Main content</body></html>'
        });

        // Mock AI provider fetch (OpenAI default)
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{
                    message: { content: 'Summary text' }
                }]
            })
        });

        const summary = await summarizeContent(url, 'key', 'gpt-4o-mini');

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(summary).toBe('Summary text');
    });

    it('categorizeBookmarks should handle API error', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: { message: 'Invalid API Key' } })
        });

        await expect(categorizeBookmarks([{ id: '1' }], 'key', 'gpt-4o-mini'))
            .rejects.toThrow('Invalid API Key');
    });

    describe('cleanOneSentenceSummary', () => {
        it('cleans enclosing quotes, markdown, and summary prefixes', () => {
            expect(cleanOneSentenceSummary('"A modern JavaScript framework for frontend developers."'))
                .toBe('A modern JavaScript framework for frontend developers.');
            expect(cleanOneSentenceSummary('Summary: An online bookstore with millions of titles.'))
                .toBe('An online bookstore with millions of titles.');
            expect(cleanOneSentenceSummary('Özet: Hızlı ve güvenli modern web tarayıcısı.'))
                .toBe('Hızlı ve güvenli modern web tarayıcısı.');
            expect(cleanOneSentenceSummary('```text\nOpen-source vector graphics editor.\n```'))
                .toBe('Open-source vector graphics editor.');
        });

        it('handles empty or non-string inputs safely', () => {
            expect(cleanOneSentenceSummary('')).toBe('');
            expect(cleanOneSentenceSummary(null)).toBe('');
        });
    });

    describe('generateOneSentenceSummary', () => {
        it('generates a clean one-sentence summary using bookmark context and AI response', async () => {
            const bookmark = {
                id: 1,
                title: 'Tailwind CSS',
                url: 'https://tailwindcss.com'
            };

            // Mock page content fetch
            fetch.mockResolvedValueOnce({
                ok: true,
                text: async () => '<html><body>A utility-first CSS framework for rapid UI development</body></html>'
            });

            // Mock AI response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: { content: '"A utility-first CSS framework for rapidly building modern websites."' }
                    }]
                })
            });

            const summary = await generateOneSentenceSummary(bookmark, 'api-key', 'gpt-4o-mini', {
                previewMetadata: { description: 'Rapidly build modern websites without ever leaving your HTML.' }
            });

            expect(summary).toBe('A utility-first CSS framework for rapidly building modern websites.');
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('throws error when bookmark URL is missing', async () => {
            await expect(generateOneSentenceSummary({}, 'key', 'gpt-4o-mini'))
                .rejects.toThrow('Bookmark URL is required');
        });
    });

    describe('resolveEffectiveModel & Model Aliasing', () => {
        it('maps deprecated or legacy Gemini aliases to modern supported equivalents', () => {
            expect(resolveEffectiveModel('gemini-2.5-flash')).toBe('gemini-3.6-flash');
            expect(resolveEffectiveModel('gemini-2.5-flash-lite')).toBe('gemini-3.5-flash-lite');
            expect(resolveEffectiveModel('gemini-2.5-pro')).toBe('gemini-3.5-pro');
            expect(resolveEffectiveModel('gemini-2.0-flash')).toBe('gemini-3.6-flash');
            expect(resolveEffectiveModel('gemini-2.0-flash-lite')).toBe('gemini-3.5-flash-lite');
        });

        it('maps legacy GPT-3.5 and GPT-4o to GPT-6 series', () => {
            expect(resolveEffectiveModel('gpt-3.5-turbo')).toBe('gpt-6-luna');
            expect(resolveEffectiveModel('gpt-4o-mini')).toBe('gpt-6.1-sol');
            expect(resolveEffectiveModel('gpt-4o')).toBe('gpt-6-astra');
        });

        it('retains modern supported models unchanged', () => {
            expect(resolveEffectiveModel('gemini-3.5-flash-lite')).toBe('gemini-3.5-flash-lite');
            expect(resolveEffectiveModel('gemini-3.6-flash')).toBe('gemini-3.6-flash');
            expect(resolveEffectiveModel('gemini-4-argon')).toBe('gemini-4-argon');
            expect(resolveEffectiveModel('claude-sonnet-5-5')).toBe('claude-sonnet-5-5');
            expect(resolveEffectiveModel('gpt-6.1-sol')).toBe('gpt-6.1-sol');
        });

        it('falls back to DEFAULT_MODEL when null or empty', () => {
            expect(resolveEffectiveModel(null)).toBe('gemini-3.5-flash-lite');
            expect(resolveEffectiveModel('')).toBe('gemini-3.5-flash-lite');
            expect(resolveEffectiveModel(undefined)).toBe('gemini-3.5-flash-lite');
        });

        it('routes legacy gemini-2.5-flash to gemini-3.6-flash when calling categorizeBookmarks', async () => {
            const bookmarks = [{ id: '1', title: 'Test', url: 'https://test.com' }];
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: JSON.stringify({ '1': { folder: 'Dev' } }) }] } }]
                })
            });

            await categorizeBookmarks(bookmarks, 'gemini-key', 'gemini-2.5-flash');

            // Should have made call to Gemini endpoint using gemini-3.6-flash
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('gemini-3.6-flash'),
                expect.any(Object)
            );
        });

        it('correctly resolves provider for standard, local, and dynamic models', () => {
            expect(resolveProviderForModel('gpt-6.1-sol')).toBe('openai');
            expect(resolveProviderForModel('gemini-3.6-flash')).toBe('gemini');
            expect(resolveProviderForModel('claude-sonnet-5-5')).toBe('anthropic');
            expect(resolveProviderForModel('browser-builtin')).toBe('browser');
            expect(resolveProviderForModel('llama4')).toBe('ollama');
            expect(resolveProviderForModel('llama3.1')).toBe('ollama');
            expect(resolveProviderForModel('mistral:latest')).toBe('ollama');
            expect(resolveProviderForModel('deepseek-r1:8b')).toBe('ollama');
            expect(resolveProviderForModel('anthropic/claude-sonnet-5-5')).toBe('openrouter');
            expect(resolveProviderForModel('unknown-model-xyz')).toBe('openai');
        });
    });
});
