import { describe, it, expect } from 'vitest'
import { analyzeRulePatterns, extractDomain } from '../rule-suggester'

describe('rule-suggester', () => {
    describe('extractDomain', () => {
        it('extracts hostname without www', () => {
            expect(extractDomain('https://www.github.com/facebook/react')).toBe('github.com')
            expect(extractDomain('http://sub.domain.co.uk/path?q=1')).toBe('sub.domain.co.uk')
            expect(extractDomain('invalid-url')).toBe('')
        })
    })

    describe('analyzeRulePatterns', () => {
        it('detects strong domain to folder patterns', () => {
            const bookmarks = [
                { id: '1', url: 'https://github.com/a', title: 'Repo A', originalFolder: 'Yazılım > Açık Kaynak', tags: ['dev'] },
                { id: '2', url: 'https://github.com/b', title: 'Repo B', originalFolder: 'Yazılım > Açık Kaynak', tags: ['dev'] },
                { id: '3', url: 'https://github.com/c', title: 'Repo C', originalFolder: 'Yazılım > Açık Kaynak', tags: ['dev'] },
                { id: '4', url: 'https://github.com/d', title: 'Repo D', originalFolder: 'Diğer' },
                { id: '5', url: 'https://stackoverflow.com/q1', title: 'Question', originalFolder: 'Yazılım' }
            ]

            const suggestions = analyzeRulePatterns(bookmarks, [], { minCount: 2, minConfidence: 0.6 })
            expect(suggestions.length).toBeGreaterThan(0)

            const githubSuggestion = suggestions.find(s => s.value === 'github.com')
            expect(githubSuggestion).toBeDefined()
            expect(githubSuggestion.type).toBe('domain')
            expect(githubSuggestion.targetFolder).toBe('Yazılım > Açık Kaynak')
            expect(githubSuggestion.confidence).toBe(75) // 3 out of 4 = 75%
            expect(githubSuggestion.matchedCount).toBe(3)
            expect(githubSuggestion.tags).toContain('dev')
            expect(githubSuggestion.samples).toHaveLength(3)
        })

        it('ignores domains already covered by an existing rule', () => {
            const bookmarks = [
                { id: '1', url: 'https://github.com/a', title: 'Repo A', originalFolder: 'Yazılım' },
                { id: '2', url: 'https://github.com/b', title: 'Repo B', originalFolder: 'Yazılım' }
            ]
            const existingRules = [
                { id: 'r1', type: 'domain', value: 'github.com', targetFolder: 'Yazılım' }
            ]

            const suggestions = analyzeRulePatterns(bookmarks, existingRules, { minCount: 2 })
            const githubSuggestion = suggestions.find(s => s.value === 'github.com')
            expect(githubSuggestion).toBeUndefined()
        })

        it('ignores uncategorized, Root, or empty folders', () => {
            const bookmarks = [
                { id: '1', url: 'https://example.com/1', title: 'Ex 1', originalFolder: 'Root' },
                { id: '2', url: 'https://example.com/2', title: 'Ex 2', originalFolder: 'Uncategorized' },
                { id: '3', url: 'https://example.com/3', title: 'Ex 3', originalFolder: '' }
            ]

            const suggestions = analyzeRulePatterns(bookmarks, [], { minCount: 2 })
            expect(suggestions).toHaveLength(0)
        })

        it('detects strong keyword patterns in titles', () => {
            const bookmarks = [
                { id: '1', url: 'https://site1.com/a', title: 'Kubernetes Cluster Setup', originalFolder: 'DevOps' },
                { id: '2', url: 'https://site2.com/b', title: 'Kubernetes Pod Networking', originalFolder: 'DevOps' },
                { id: '3', url: 'https://site3.com/c', title: 'Kubernetes Security Guide', originalFolder: 'DevOps' },
                { id: '4', url: 'https://other.com/d', title: 'Random Page', originalFolder: 'General' }
            ]

            const suggestions = analyzeRulePatterns(bookmarks, [], { minCount: 2 })
            const k8sSuggestion = suggestions.find(s => s.value === 'kubernetes')
            expect(k8sSuggestion).toBeDefined()
            expect(k8sSuggestion.type).toBe('keyword')
            expect(k8sSuggestion.targetFolder).toBe('DevOps')
            expect(k8sSuggestion.confidence).toBe(100)
        })
    })
})
