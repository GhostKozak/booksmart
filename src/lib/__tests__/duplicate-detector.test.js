import { describe, it, expect } from 'vitest';
import {
    cleanTitleForComparison,
    computeStringSimilarity,
    normalizeUrlDeep,
    buildMergedPreview,
    findSimilarBookmarkGroups
} from '../duplicate-detector';

describe('duplicate-detector', () => {
    describe('cleanTitleForComparison', () => {
        it('removes common site suffixes and special symbols', () => {
            expect(cleanTitleForComparison('How to use React | GitHub')).toBe('how to use react');
            expect(cleanTitleForComparison('Build a Web App - YouTube')).toBe('build a web app');
            expect(cleanTitleForComparison('Functional Programming in JS · Medium')).toBe('functional programming in js');
            expect(cleanTitleForComparison('Tailwind CSS: Documentation')).toBe('tailwind css');
        });

        it('collapses multiple spaces', () => {
            expect(cleanTitleForComparison('   Learn   TypeScript   Now!   ')).toBe('learn typescript now');
        });
    });

    describe('computeStringSimilarity', () => {
        it('returns 1.0 for identical strings', () => {
            expect(computeStringSimilarity('react testing library', 'react testing library')).toBe(1.0);
            expect(computeStringSimilarity('React', 'react')).toBe(1.0);
        });

        it('returns 0.0 for completely distinct strings', () => {
            expect(computeStringSimilarity('abcdef', 'uvwxyz')).toBe(0.0);
        });

        it('calculates Dice similarity for near-identical titles', () => {
            const score = computeStringSimilarity(
                'Getting started with Vitest in React',
                'Getting started with Vitest in React 19'
            );
            expect(score).toBeGreaterThan(0.85);
        });
    });

    describe('normalizeUrlDeep', () => {
        it('strips tracking parameters and normalizes protocol & mobile subdomain', () => {
            const url1 = 'http://m.youtube.com/watch?v=123&utm_source=twitter&utm_medium=social';
            const url2 = 'https://www.youtube.com/watch?v=123';

            expect(normalizeUrlDeep(url1)).toBe(normalizeUrlDeep(url2));
        });

        it('strips trailing slashes and index.html', () => {
            expect(normalizeUrlDeep('https://example.com/blog/post/')).toBe('https://example.com/blog/post');
            expect(normalizeUrlDeep('https://example.com/index.html')).toBe('https://example.com');
        });

        it('sorts remaining query parameters consistently', () => {
            const u1 = 'https://api.github.com/repos?page=1&per_page=10';
            const u2 = 'https://api.github.com/repos?per_page=10&page=1';
            expect(normalizeUrlDeep(u1)).toBe(normalizeUrlDeep(u2));
        });
    });

    describe('buildMergedPreview', () => {
        it('merges unique tags, collections and combines notes', () => {
            const items = [
                {
                    id: 1,
                    title: 'Vite Guide',
                    url: 'https://vite.dev',
                    tags: ['frontend', 'tools'],
                    collections: ['col1'],
                    note: 'Primary note'
                },
                {
                    id: 2,
                    title: 'Vite Documentation',
                    url: 'https://vite.dev/',
                    tags: ['tools', 'build'],
                    collections: ['col2'],
                    note: 'Secondary note'
                }
            ];

            const preview = buildMergedPreview(items);
            expect(preview.tags).toEqual(expect.arrayContaining(['frontend', 'tools', 'build']));
            expect(preview.collections).toEqual(expect.arrayContaining(['col1', 'col2']));
            expect(preview.note).toContain('Primary note');
            expect(preview.note).toContain('Secondary note');
        });
    });

    describe('findSimilarBookmarkGroups', () => {
        it('finds groups with exact and variation URLs', () => {
            const bookmarks = [
                { id: 1, title: 'GitHub', url: 'https://github.com' },
                { id: 2, title: 'GitHub Home', url: 'https://github.com/?utm_source=hackernews' },
                { id: 3, title: 'Unrelated Site', url: 'https://google.com' }
            ];

            const groups = findSimilarBookmarkGroups(bookmarks);
            expect(groups.length).toBe(1);
            expect(groups[0].bookmarks.length).toBe(2);
            expect(groups[0].bookmarks.map(b => b.id)).toEqual([1, 2]);
        });

        it('finds groups with same domain and high title similarity', () => {
            const bookmarks = [
                { id: 1, title: 'Tailwind CSS - Rapidly build modern websites', url: 'https://tailwindcss.com/v4' },
                { id: 2, title: 'Tailwind CSS - Rapidly build websites | Docs', url: 'https://tailwindcss.com/docs/v4' },
                { id: 3, title: 'Other framework', url: 'https://tailwindcss.com/showcase' }
            ];

            const groups = findSimilarBookmarkGroups(bookmarks, { titleThreshold: 0.70 });
            expect(groups.length).toBe(1);
            expect(groups[0].type).toBe('similar_title');
            expect(groups[0].bookmarks.map(b => b.id)).toEqual([1, 2]);
        });
    });
});
