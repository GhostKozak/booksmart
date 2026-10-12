import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import helper methods from extension/background.js
const {
    isPrivateOrLoopbackUrl,
    normalizeBookmarkUrl,
    flattenBookmarkTree,
    pushBookmarksToBrowser,
    syncBrowserBookmarks,
    captureCurrentTab,
    isSenderAuthorized,
    fetchOgMetadata,
    decodeHtmlEntities,
    toAbsoluteUrl
} = await import('../../../extension/background.js')

describe('Extension background script helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Mock global chrome object
        globalThis.chrome = {
            bookmarks: {
                getTree: vi.fn(),
                getChildren: vi.fn(),
                getSubTree: vi.fn(),
                create: vi.fn().mockImplementation(async (data) => ({ id: 'mock_' + Math.random().toString(36).slice(2, 6), ...data })),
                removeTree: vi.fn()
            },
            tabs: {
                query: vi.fn(),
                sendMessage: vi.fn().mockResolvedValue({})
            }
        }
    })

    describe('Security: isSenderAuthorized', () => {
        it('allows localhost and local dev origins', () => {
            expect(isSenderAuthorized({ url: 'http://localhost:5173/' })).toBe(true)
            expect(isSenderAuthorized({ url: 'http://127.0.0.1:3000/' })).toBe(true)
        })

        it('allows official booksmart.app and github.io pages domain', () => {
            expect(isSenderAuthorized({ url: 'https://booksmart.app/' })).toBe(true)
            expect(isSenderAuthorized({ url: 'https://ghostkozak.github.io/booksmart/' })).toBe(true)
        })

        it('allows internal chrome-extension and moz-extension callers', () => {
            expect(isSenderAuthorized({ url: 'chrome-extension://abcdef/popup.html' })).toBe(true)
            expect(isSenderAuthorized({ url: 'moz-extension://abcdef/popup.html' })).toBe(true)
        })

        it('rejects random attacker origins on github.io or internet', () => {
            expect(isSenderAuthorized({ url: 'https://malicious.github.io/steal' })).toBe(false)
            expect(isSenderAuthorized({ url: 'https://attacker.com/' })).toBe(false)
        })
    })

    describe('SSRF Protection: isPrivateOrLoopbackUrl', () => {
        it('blocks loopback and private IP addresses', () => {
            expect(isPrivateOrLoopbackUrl('http://127.0.0.1:8080')).toBe(true)
            expect(isPrivateOrLoopbackUrl('http://localhost:3000')).toBe(true)
            expect(isPrivateOrLoopbackUrl('http://192.168.1.1/admin')).toBe(true)
            expect(isPrivateOrLoopbackUrl('http://10.0.0.1')).toBe(true)
            expect(isPrivateOrLoopbackUrl('http://172.16.0.1')).toBe(true)
        })

        it('allows public web URLs', () => {
            expect(isPrivateOrLoopbackUrl('https://example.com')).toBe(false)
            expect(isPrivateOrLoopbackUrl('https://github.com')).toBe(false)
        })
    })

    describe('normalizeBookmarkUrl', () => {
        it('normalizes scheme, hostname, default ports, and trailing slash', () => {
            expect(normalizeBookmarkUrl('https://WWW.Example.com:443/test/')).toBe('https://example.com/test')
            expect(normalizeBookmarkUrl('http://Example.com:80/')).toBe('http://example.com')
        })

        it('preserves query strings and hash anchors', () => {
            expect(normalizeBookmarkUrl('https://example.com/path?q=1#anchor/')).toBe('https://example.com/path?q=1#anchor')
        })
    })

    describe('flattenBookmarkTree', () => {
        it('filters non-web schemes (javascript:, place:, about:, chrome:)', () => {
            const mockTree = [
                {
                    id: '0',
                    title: '',
                    children: [
                        { id: '1', title: 'Bookmarks bar', children: [
                            { id: 'b1', title: 'Web Page', url: 'https://react.dev' },
                            { id: 'b2', title: 'Bookmarklet', url: 'javascript:void(0)' },
                            { id: 'b3', title: 'Firefox place', url: 'place:sort=8' },
                            { id: 'b4', title: 'Internal', url: 'chrome://settings' }
                        ]}
                    ]
                }
            ]

            const result = flattenBookmarkTree(mockTree)
            expect(result).toHaveLength(1)
            expect(result[0].title).toBe('Web Page')
            expect(result[0].url).toBe('https://react.dev')
            expect(result[0].originalFolder).toBe('Root')
        })

        it('normalizes system root container folders (bar, toolbar, menu)', () => {
            const mockTree = [
                {
                    id: '0',
                    children: [
                        { id: 'toolbar_____', title: 'Bookmarks Toolbar', children: [
                            { id: 'b1', title: 'Page', url: 'https://test.com' },
                            { id: 'f1', title: 'Subfolder', children: [
                                { id: 'b2', title: 'Nested', url: 'https://nested.com' }
                            ]}
                        ]}
                    ]
                }
            ]

            const result = flattenBookmarkTree(mockTree)
            expect(result).toHaveLength(2)
            expect(result[0].originalFolder).toBe('Root')
            expect(result[1].originalFolder).toBe('Subfolder')
        })
    })

    describe('pushBookmarksToBrowser duplicate prevention', () => {
        it('does not create duplicate bookmarks when pushed multiple times', async () => {
            const mockRoot = [{
                id: '0',
                children: [{ id: '1', title: 'Bookmarks bar', children: [] }]
            }]
            chrome.bookmarks.getTree.mockResolvedValue(mockRoot)
            chrome.bookmarks.create.mockImplementation(async (data) => ({
                id: 'gen_' + Math.random(),
                ...data
            }))

            // Target folder initially has one bookmark
            let folderChildren = [
                { id: 'c1', title: 'Existing', url: 'https://react.dev' }
            ]
            chrome.bookmarks.getChildren.mockImplementation(async () => folderChildren)

            const bookmarksToPush = [
                { title: 'React', url: 'https://react.dev', originalFolder: 'Root' },
                { title: 'Vite', url: 'https://vitejs.dev', originalFolder: 'Root' }
            ]

            const res = await pushBookmarksToBrowser(bookmarksToPush)

            expect(res.success).toBe(true)
            // React already existed, so only Vite should be created
            expect(res.count).toBe(1)
            expect(chrome.bookmarks.create).toHaveBeenCalledWith(
                expect.objectContaining({ url: 'https://vitejs.dev' })
            )
        })
    })

    describe('captureCurrentTab duplicate handling', () => {
        it('returns existing bookmark without creating duplicate if active tab already bookmarked', async () => {
            chrome.tabs.query.mockResolvedValue([
                { id: 99, title: 'React Dev', url: 'https://react.dev' }
            ])
            const mockRoot = [{
                id: '0',
                children: [{ id: '1', title: 'Bookmarks bar', children: [] }]
            }]
            chrome.bookmarks.getTree.mockResolvedValue(mockRoot)
            chrome.bookmarks.getChildren.mockResolvedValue([
                { id: 'exist_1', title: 'React Dev', url: 'https://react.dev' }
            ])

            const result = await captureCurrentTab()

            expect(result.alreadyExisted).toBe(true)
            expect(result.browserId).toBe('exist_1')
            // Should not call chrome.bookmarks.create for the bookmark
            expect(chrome.bookmarks.create).not.toHaveBeenCalledWith(
                expect.objectContaining({ url: 'https://react.dev' })
            )
        })
    })

    describe('syncBrowserBookmarks', () => {
        it('identifies imported and exported bookmarks accurately', async () => {
            const mockTree = [
                {
                    id: '0',
                    children: [{
                        id: '1',
                        title: 'Bookmarks bar',
                        children: [
                            { id: 'b_browser', title: 'Browser Only', url: 'https://browser-only.com' }
                        ]
                    }]
                }
            ]
            chrome.bookmarks.getTree.mockResolvedValue(mockTree)
            chrome.bookmarks.getChildren.mockResolvedValue([])

            const appBookmarks = [
                { id: 'app_1', title: 'App Only', url: 'https://app-only.com', originalFolder: 'Root' }
            ]

            const res = await syncBrowserBookmarks(appBookmarks)

            expect(res.success).toBe(true)
            expect(res.importedBookmarks).toHaveLength(1)
            expect(res.importedBookmarks[0].url).toBe('https://browser-only.com')
            expect(res.exportedCount).toBe(1)
        })
    })

    describe('OpenGraph extraction helpers', () => {
        it('decodes HTML entities properly', () => {
            expect(decodeHtmlEntities('&amp; &lt; &gt; &quot; &#39; &#x2F;')).toBe('& < > " \' /')
            expect(decodeHtmlEntities('GitHub &amp; React: Modern &quot;Dev&quot;')).toBe('GitHub & React: Modern "Dev"')
        })

        it('resolves relative URLs to absolute URLs', () => {
            expect(toAbsoluteUrl('/images/og.png', 'https://example.com/blog/article')).toBe('https://example.com/images/og.png')
            expect(toAbsoluteUrl('https://cdn.example.com/og.png', 'https://example.com')).toBe('https://cdn.example.com/og.png')
            expect(toAbsoluteUrl('invalid:url', 'https://example.com')).toBeNull()
        })

        it('fetches and parses OpenGraph metadata from HTML response', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Fallback Title</title>
                    <meta property="og:title" content="Awesome Site &amp; Tools" />
                    <meta property="og:description" content="The best tools on the web." />
                    <meta property="og:image" content="/assets/cover.png" />
                    <meta property="og:site_name" content="Awesome Inc." />
                    <link rel="apple-touch-icon" href="/icons/apple-icon.png" />
                </head>
                <body>Hello</body>
                </html>
            `

            const originalFetch = globalThis.fetch
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                url: 'https://awesome.org/home',
                text: async () => mockHtml
            })

            const result = await fetchOgMetadata('https://awesome.org')

            expect(result.success).toBe(true)
            expect(result.metadata.title).toBe('Awesome Site & Tools')
            expect(result.metadata.description).toBe('The best tools on the web.')
            expect(result.metadata.image).toBe('https://awesome.org/assets/cover.png')
            expect(result.metadata.siteName).toBe('Awesome Inc.')
            expect(result.metadata.favicon).toBe('https://awesome.org/icons/apple-icon.png')

            globalThis.fetch = originalFetch
        })

        it('handles private and loopback URLs by blocking them', async () => {
            const result = await fetchOgMetadata('http://127.0.0.1:8080')
            expect(result.success).toBe(false)
            expect(result.error).toBe('restricted_private_network')
        })
    })
})
