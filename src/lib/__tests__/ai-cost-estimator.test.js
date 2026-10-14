import { describe, it, expect } from 'vitest';
import {
    estimateTokens,
    calculateCost,
    formatCost,
    formatTokenCount,
    estimateBatchOperation,
    getModelPricing,
    MODEL_PRICING
} from '../ai-cost-estimator';

describe('ai-cost-estimator', () => {
    const mockBookmarks = [
        { id: '1', title: 'React Docs', url: 'https://react.dev' },
        { id: '2', title: 'Vite Guide', url: 'https://vitejs.dev' },
        { id: '3', title: 'Tailwind CSS', url: 'https://tailwindcss.com' }
    ];

    describe('estimateTokens', () => {
        it('should return 0 tokens for empty bookmarks', () => {
            const result = estimateTokens('magicSort', []);
            expect(result.totalTokens).toBe(0);
            expect(result.inputTokens).toBe(0);
            expect(result.outputTokens).toBe(0);
            expect(result.chunkCount).toBe(0);
        });

        it('should estimate tokens for magicSort', () => {
            const result = estimateTokens('magicSort', mockBookmarks);
            expect(result.chunkCount).toBe(1);
            expect(result.inputTokens).toBeGreaterThan(0);
            expect(result.outputTokens).toBe(mockBookmarks.length * 30);
            expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
        });

        it('should estimate tokens for fixTitles', () => {
            const result = estimateTokens('fixTitles', mockBookmarks);
            expect(result.chunkCount).toBe(1);
            expect(result.outputTokens).toBe(mockBookmarks.length * 20);
        });

        it('should estimate tokens for smartDuplicates with 50 chunk size', () => {
            const sixtyBookmarks = Array.from({ length: 60 }, (_, i) => ({
                id: `id-${i}`,
                title: `Title ${i}`,
                url: `https://example.com/${i}`
            }));
            const result = estimateTokens('smartDuplicates', sixtyBookmarks);
            expect(result.chunkCount).toBe(2);
            expect(result.chunkSize).toBe(50);
        });
    });

    describe('calculateCost', () => {
        it('should calculate cost for gpt-4o-mini accurately', () => {
            // 1,000,000 input = $0.15, 1,000,000 output = $0.60
            const result = calculateCost(1000000, 1000000, 'gpt-4o-mini');
            expect(result.inputCost).toBeCloseTo(0.15);
            expect(result.outputCost).toBeCloseTo(0.60);
            expect(result.totalCost).toBeCloseTo(0.75);
            expect(result.isLocal).toBe(false);
            expect(result.isFree).toBe(false);
        });

        it('should report $0 and isLocal=true for Ollama models', () => {
            const result = calculateCost(50000, 20000, 'llama3.2');
            expect(result.totalCost).toBe(0);
            expect(result.isLocal).toBe(true);
            expect(result.isFree).toBe(true);
            expect(result.formattedCost).toContain('Local');
        });

        it('should report $0 and isFree=true for experimental free tier models', () => {
            const result = calculateCost(50000, 20000, 'gemini-2.0-flash-exp');
            expect(result.totalCost).toBe(0);
            expect(result.isFree).toBe(true);
        });

        it('should fallback to default pricing for unknown models', () => {
            const result = calculateCost(10000, 5000, 'unknown-model-xyz');
            expect(result.pricing).toBeDefined();
            expect(result.totalCost).toBeGreaterThan(0);
        });
    });

    describe('formatCost', () => {
        it('should format local models as Free', () => {
            expect(formatCost(0, true)).toBe('$0.00 (Local)');
        });

        it('should format 0 as $0.00', () => {
            expect(formatCost(0)).toBe('$0.00');
        });

        it('should format tiny amounts as < $0.0001', () => {
            expect(formatCost(0.00005)).toBe('< $0.0001');
        });

        it('should format small amounts with 4 decimals', () => {
            expect(formatCost(0.00456)).toBe('$0.0046');
        });

        it('should format regular amounts with 3 decimals', () => {
            expect(formatCost(0.125)).toBe('$0.125');
        });
    });

    describe('formatTokenCount', () => {
        it('should format token counts with commas', () => {
            expect(formatTokenCount(1250000)).toBe('1,250,000');
            expect(formatTokenCount(0)).toBe('0');
            expect(formatTokenCount(null)).toBe('0');
        });
    });

    describe('estimateBatchOperation', () => {
        it('should provide full operational summary', () => {
            const summary = estimateBatchOperation('magicSort', mockBookmarks, 'gpt-4o-mini');
            expect(summary.itemCount).toBe(3);
            expect(summary.totalTokens).toBeGreaterThan(0);
            expect(summary.totalCost).toBeGreaterThan(0);
            expect(summary.formattedCost).toBeDefined();
            expect(summary.pricing.name).toBe('GPT-4o Mini');
        });
    });

    describe('getModelPricing', () => {
        it('should return pricing for known models', () => {
            const pricing = getModelPricing('claude-3-5-haiku-20241022');
            expect(pricing.inputPerM).toBe(0.80);
            expect(pricing.outputPerM).toBe(4.00);
        });

        it('should return correct pricing for newly added models', () => {
            const geminiPricing = getModelPricing('gemini-3.5-flash-lite');
            expect(geminiPricing.inputPerM).toBe(0.0375);
            expect(geminiPricing.outputPerM).toBe(0.15);

            const o3Pricing = getModelPricing('o3-mini');
            expect(o3Pricing.inputPerM).toBe(1.10);
            expect(o3Pricing.outputPerM).toBe(4.40);

            const claude37Pricing = getModelPricing('claude-3-7-sonnet-20250219');
            expect(claude37Pricing.inputPerM).toBe(3.00);
            expect(claude37Pricing.outputPerM).toBe(15.00);
        });

        it('should resolve legacy models through aliases', () => {
            const legacyPricing = getModelPricing('gemini-2.5-flash-lite');
            expect(legacyPricing).toBeDefined();
            expect(legacyPricing.inputPerM).toBe(0.0375);
        });
    });
});
