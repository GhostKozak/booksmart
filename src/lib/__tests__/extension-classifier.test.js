import { describe, it, expect } from 'vitest';
const { classifyUrlWithRules, DEFAULT_DOMAIN_RULES } = await import('../../../extension/rule-classifier.js');

describe('Extension Rule Classifier', () => {
    it('returns default fallback folder for empty url', () => {
        const result = classifyUrlWithRules('', 'Untitled');
        expect(result.folder).toBe('BookSmart');
        expect(result.tags).toEqual([]);
        expect(result.matchedRule).toBeNull();
    });

    it('classifies popular domains using built-in heuristics when no custom rules match', () => {
        const github = classifyUrlWithRules('https://github.com/facebook/react', 'React Repository');
        expect(github.folder).toBe('Yazılım & Kod');
        expect(github.tags).toContain('dev');
        expect(github.tags).toContain('github');
        expect(github.matchedRule).toContain('github.com');

        const youtube = classifyUrlWithRules('https://www.youtube.com/watch?v=123', 'Coding Tutorial');
        expect(youtube.folder).toBe('Videolar');
        expect(youtube.tags).toContain('video');

        const arxiv = classifyUrlWithRules('https://arxiv.org/abs/2401.00001', 'Attention is All You Need');
        expect(arxiv.folder).toBe('Akademik & Makaleler');
        expect(arxiv.tags).toContain('bilim');
    });

    it('prioritizes user custom domain rules over defaults', () => {
        const customRules = [
            {
                id: 'r1',
                type: 'domain',
                value: 'github.com',
                targetFolder: 'Özel Kodlarım',
                tags: 'work,oss'
            }
        ];

        const res = classifyUrlWithRules('https://github.com/my-org/project', 'My Project', customRules);
        expect(res.folder).toBe('Özel Kodlarım');
        expect(res.tags).toEqual(['work', 'oss']);
        expect(res.matchedRule).toContain('domain (github.com)');
    });

    it('matches user keyword rules against title and url content', () => {
        const customRules = [
            {
                id: 'r2',
                type: 'keyword',
                value: 'machine learning,ai,deep learning',
                targetFolder: 'Yapay Zeka',
                tags: 'ai,ml'
            }
        ];

        const res = classifyUrlWithRules('https://blog.example.com/deep-learning-notes', 'Introduction to Deep Learning', customRules);
        expect(res.folder).toBe('Yapay Zeka');
        expect(res.tags).toEqual(['ai', 'ml']);
    });

    it('matches exact title rules', () => {
        const customRules = [
            {
                id: 'r3',
                type: 'exact',
                value: 'daily dashboard',
                targetFolder: 'Günlük',
                tags: 'dashboard'
            }
        ];

        const matched = classifyUrlWithRules('https://myportal.internal', 'Daily Dashboard', customRules);
        expect(matched.folder).toBe('Günlük');
        expect(matched.tags).toEqual(['dashboard']);

        const unmatched = classifyUrlWithRules('https://myportal.internal', 'Daily Dashboard 2', customRules);
        expect(unmatched.folder).toBe('BookSmart');
    });

    it('merges tags across multiple matching custom rules without duplicates', () => {
        const customRules = [
            {
                id: 'r1',
                type: 'keyword',
                value: 'react',
                targetFolder: 'Frontend',
                tags: 'js,web'
            },
            {
                id: 'r2',
                type: 'keyword',
                value: 'hooks',
                targetFolder: 'Hooks',
                tags: 'web,advanced'
            }
        ];

        const res = classifyUrlWithRules('https://example.com/react-hooks', 'React Hooks In Depth', customRules);
        // Folder should be the first matching rule with folder
        expect(res.folder).toBe('Frontend');
        expect(res.tags).toEqual(['js', 'web', 'advanced']);
    });
});
