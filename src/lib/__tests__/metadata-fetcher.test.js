import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock db with in-memory preview store
const previewStore = new Map()

vi.mock('../../db', () => ({
    db: {
        previews: {
            get: vi.fn(async (url) => previewStore.get(url) || null),
            put: vi.fn(async (record) => {
                previewStore.set(record.url, record)
                return record.url
            }),
            clear: vi.fn(async () => {
                previewStore.clear()
            }),
            count: vi.fn(async () => previewStore.size)
        }
    }
}))

import {
    normalizeUrlForPreview,
    fetchMetadataForUrl,
    batchEnrichBookmarks,
    clearPreviewCache
} from '../metadata-fetcher'
import { db } from '../../db'
import * as extensionClient from '../extension-client'

describe('metadata-fetcher', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        previewStore.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('normalizeUrlForPreview', () => {
        it('normalizes hostnames, stripping www and lowercasing', () => {
            expect(normalizeUrlForPreview('https://WWW.Example.COM/path/')).toBe('https://example.com/path')
            expect(normalizeUrlForPreview('http://Sub.Domain.org/')).toBe('http://sub.domain.org')
        })

        it('removes default ports 80 and 443', () => {
            expect(normalizeUrlForPreview('https://example.com:443/docs')).toBe('https://example.com/docs')
            expect(normalizeUrlForPreview('http://example.com:80/')).toBe('http://example.com')
        })

        it('handles invalid or empty inputs gracefully', () => {
            expect(normalizeUrlForPreview('')).toBe('')
            expect(normalizeUrlForPreview(null)).toBe('')
            expect(normalizeUrlForPreview('not a url')).toBe('not a url')
        })
    })

    describe('fetchMetadataForUrl', () => {
        it('returns null for non-http/https URLs', async () => {
            expect(await fetchMetadataForUrl('javascript:void(0)')).toBeNull()
            expect(await fetchMetadataForUrl('')).toBeNull()
        })

        it('returns cached preview if available and not expired', async () => {
            const cachedItem = {
                url: 'https://cached.org',
                rawUrl: 'https://cached.org/',
                title: 'Cached Page',
                description: 'Cached Description',
                image: 'https://cached.org/img.png',
                updatedAt: Date.now()
            }
            previewStore.set('https://cached.org', cachedItem)

            const spyExtension = vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(false)
            const result = await fetchMetadataForUrl('https://cached.org')

            expect(result.title).toBe('Cached Page')
            expect(spyExtension).not.toHaveBeenCalled()
        })

        it('deduplicates simultaneous in-flight fetches for the same normalized URL', async () => {
            vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
            const fetchOgSpy = vi.spyOn(extensionClient, 'fetchOgMetadataWithExtension').mockImplementation(async () => {
                await new Promise(r => setTimeout(r, 20))
                return {
                    title: 'Async In-flight Page',
                    description: 'Fetched once',
                    image: 'https://dedup.test/og.jpg',
                    siteName: 'dedup.test',
                    favicon: null
                }
            })

            const [p1, p2] = await Promise.all([
                fetchMetadataForUrl('https://dedup.test/page/'),
                fetchMetadataForUrl('https://dedup.test/page')
            ])

            expect(fetchOgSpy).toHaveBeenCalledTimes(1)
            expect(p1.title).toBe('Async In-flight Page')
            expect(p2.title).toBe('Async In-flight Page')
        })

        it('falls back to synthetic preview when extension is not connected and external fetch fails', async () => {
            vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(false)
            const originalFetch = globalThis.fetch
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

            const result = await fetchMetadataForUrl('https://external-fallback.org/article')

            expect(result).not.toBeNull()
            expect(result.url).toBe('https://external-fallback.org/article')
            expect(result.image).toContain('wordpress.com/mshots')
            expect(result.siteName).toBe('external-fallback.org')

            globalThis.fetch = originalFetch
        })
    })

    describe('batchEnrichBookmarks', () => {
        it('handles empty or null bookmark list', async () => {
            const res = await batchEnrichBookmarks([])
            expect(res).toEqual({ processed: 0, total: 0, successCount: 0 })
        })

        it('processes multiple bookmarks and reports progress', async () => {
            const bookmarks = [
                { id: 1, url: 'https://site-a.com' },
                { id: 2, url: 'https://site-b.com' }
            ]

            vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
            vi.spyOn(extensionClient, 'fetchOgMetadataWithExtension').mockResolvedValue({
                title: 'Sample Site',
                description: 'Description',
                image: 'https://site.com/image.png'
            })

            const progressUpdates = []
            const res = await batchEnrichBookmarks(bookmarks, {
                concurrency: 2,
                onProgress: (p) => progressUpdates.push(p)
            })

            expect(res.total).toBe(2)
            expect(res.processed).toBe(2)
            expect(res.successCount).toBe(2)
            expect(progressUpdates.length).toBeGreaterThanOrEqual(2)
        })

        it('stops gracefully when abort signal is triggered', async () => {
            const bookmarks = [
                { id: 1, url: 'https://site-1.com' },
                { id: 2, url: 'https://site-2.com' },
                { id: 3, url: 'https://site-3.com' }
            ]

            const controller = new AbortController()
            controller.abort() // Immediately aborted

            const res = await batchEnrichBookmarks(bookmarks, {
                concurrency: 1,
                signal: controller.signal
            })

            expect(res.processed).toBe(0)
        })
    })

    describe('clearPreviewCache', () => {
        it('clears all preview records from database', async () => {
            previewStore.set('https://to-clear.com', {
                url: 'https://to-clear.com',
                title: 'To Clear',
                updatedAt: Date.now()
            })

            expect(await db.previews.count()).toBe(1)
            await clearPreviewCache()
            expect(await db.previews.count()).toBe(0)
        })
    })
})
