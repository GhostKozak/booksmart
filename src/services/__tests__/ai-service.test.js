import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categorizeBookmarks, summarizeContent, AI_MODELS } from '../ai-service';

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

        // Mock proxy fetch
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ contents: '<html><body>Main content</body></html>' })
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
});
