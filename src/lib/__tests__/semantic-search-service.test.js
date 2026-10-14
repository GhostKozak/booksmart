import { describe, it, expect } from 'vitest';
import {
    normalizeSemanticText,
    tokenizeText,
    generateEmbedding,
    cosineSimilarity,
    getBookmarkContent,
    semanticSearch,
    VECTOR_DIMENSION
} from '../semantic-search-service';

describe('semantic-search-service', () => {
    it('normalizes Turkish characters and punctuation properly', () => {
        const text = 'React Hızlandırma & Çözümler, Şık Örnekler!';
        const normalized = normalizeSemanticText(text);
        expect(normalized).toBe('react hizlandirma cozumler sik ornekler');
    });

    it('tokenizes text and filters stopwords', () => {
        const text = 'React ile use-memo ve useCallback kullanarak daha hızlı kod yazımı';
        const tokens = tokenizeText(text);
        expect(tokens).toContain('react');
        expect(tokens).toContain('usememo');
        expect(tokens).toContain('usecallback');
        expect(tokens).toContain('hizli');
        expect(tokens).not.toContain('ile');
        expect(tokens).not.toContain('ve');
        expect(tokens).not.toContain('daha');
    });

    it('generates a normalized Float32Array vector of specified dimension', () => {
        const vec = generateEmbedding('React performance hooks useMemo');
        expect(vec).toBeInstanceOf(Float32Array);
        expect(vec.length).toBe(VECTOR_DIMENSION);

        // Vector magnitude should be approximately 1.0 (L2-normalized)
        let norm = 0;
        for (let i = 0; i < vec.length; i++) {
            norm += vec[i] * vec[i];
        }
        expect(Math.sqrt(norm)).toBeCloseTo(1.0, 3);
    });

    it('calculates cosine similarity correctly', () => {
        const vecA = generateEmbedding('React performance useMemo useCallback');
        const vecB = generateEmbedding('React hooks optimize speed');
        const vecC = generateEmbedding('Python machine learning pandas dataset');

        const simAB = cosineSimilarity(vecA, vecB);
        const simAC = cosineSimilarity(vecA, vecC);

        expect(simAB).toBeGreaterThan(0.4);
        expect(simAB).toBeGreaterThan(simAC);
    });

    it('satisfies core user requirement: "React hızlandırma" finds "useMemo ve useCallback İpuçları"', () => {
        const bookmarks = [
            {
                id: 1,
                title: 'Python Django ile Backend Geliştirme',
                url: 'https://docs.djangoproject.com',
                tags: ['python', 'backend']
            },
            {
                id: 2,
                title: 'useMemo ve useCallback İpuçları',
                url: 'https://react.dev/reference/react/useMemo',
                tags: ['hooks', 'frontend']
            },
            {
                id: 3,
                title: 'Figma UI Tasarım ve Renk Paletleri',
                url: 'https://figma.com/blog/color-palettes',
                tags: ['design', 'ui']
            }
        ];

        const query = 'React hızlandırma';
        const results = semanticSearch(bookmarks, query);

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].id).toBe(2);
        expect(results[0].title).toBe('useMemo ve useCallback İpuçları');
    });

    it('extracts comprehensive text content from bookmark fields', () => {
        const bookmark = {
            title: 'Modern CSS Grid',
            url: 'https://css-tricks.com/grid',
            newFolder: 'Frontend Guides',
            tags: ['css', 'layout'],
            ruleTags: ['web'],
            note: 'Great responsive tutorial'
        };

        const content = getBookmarkContent(bookmark);
        expect(content).toContain('Modern CSS Grid');
        expect(content).toContain('https://css-tricks.com/grid');
        expect(content).toContain('Frontend Guides');
        expect(content).toContain('css layout');
        expect(content).toContain('web');
        expect(content).toContain('Great responsive tutorial');
    });

    it('gracefully handles empty queries and edge cases', () => {
        const sample = [{ id: 1, title: 'Item 1' }];
        expect(semanticSearch([], 'query')).toEqual([]);
        expect(semanticSearch(sample, '')).toEqual(sample);
        expect(semanticSearch(sample, '   ')).toEqual(sample);
        expect(semanticSearch(null, 'query')).toEqual([]);
    });
});
