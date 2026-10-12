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
    fetchFeedXml,
    decodeHtmlEntities,
    toAbsoluteUrl,
    findBookmarkInTree,
    checkUrlDuplicate,
    getDefaultSessionName,
    saveActiveTabsSession,
    showBadge,
    showNotification,
    showInPageToast,
    CONTEXT_MENU_FOLDERS,
    setupContextMenus,
    handleContextMenuClick
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
                sendMessage: vi.fn().mockResolvedValue({}),
                create: vi.fn().mockResolvedValue({ id: 101 }),
                remove: vi.fn().mockResolvedValue()
            },
            storage: {
                local: {
                    get: vi.fn().mockResolvedValue({}),
                    set: vi.fn().mockResolvedValue()
                }
            },
            contextMenus: {
                removeAll: vi.fn().mockImplementation((cb) => cb && cb()),
                create: vi.fn(),
                onClicked: { addListener: vi.fn() }
            },
            action: {
                setBadgeText: vi.fn(),
                setBadgeBackgroundColor: vi.fn()
            },
            notifications: {
                create: vi.fn()
            },
            scripting: {
                executeScript: vi.fn().mockResolvedValue([])
            },
            runtime: {
                onInstalled: { addListener: vi.fn() }
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

    describe('Duplicate detection: checkUrlDuplicate and findBookmarkInTree', () => {
        it('finds bookmark in tree and extracts correct parent folder with findBookmarkInTree', () => {
            const mockTree = [
                {
                    id: '0',
                    children: [
                        {
                            id: 'folder_dev',
                            title: 'Yazılım',
                            children: [
                                { id: 'b_1', title: 'React', url: 'https://react.dev' }
                            ]
                        }
                    ]
                }
            ]
            const match = findBookmarkInTree(mockTree, 'https://react.dev')
            expect(match).not.toBeNull()
            expect(match.found).toBe(true)
            expect(match.folder).toBe('Yazılım')
            expect(match.title).toBe('React')
        })

        it('identifies duplicates in browser bookmarks tree with correct folder name', async () => {
            const mockTree = [
                {
                    id: '0',
                    children: [
                        {
                            id: 'toolbar_____',
                            title: 'Bookmarks Bar',
                            children: [
                                {
                                    id: 'folder_dev',
                                    title: 'Yazılım',
                                    children: [
                                        { id: 'b_1', title: 'React', url: 'https://react.dev' }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
            chrome.bookmarks.getTree.mockResolvedValue(mockTree)

            const result = await checkUrlDuplicate('https://react.dev/')
            expect(result.isDuplicate).toBe(true)
            expect(result.folder).toBe('Yazılım')
            expect(result.source).toBe('browser')
        })

        it('identifies duplicates in appBookmarksCache when not in browser bookmarks', async () => {
            chrome.bookmarks.getTree.mockResolvedValue([])
            chrome.storage.local.get.mockResolvedValue({
                appBookmarksCache: {
                    'https://github.com': {
                        title: 'GitHub',
                        folder: 'Araçlar'
                    }
                }
            })

            const result = await checkUrlDuplicate('https://github.com')
            expect(result.isDuplicate).toBe(true)
            expect(result.folder).toBe('Araçlar')
            expect(result.source).toBe('booksmart')
        })

        it('returns isDuplicate: false for unique URLs', async () => {
            chrome.bookmarks.getTree.mockResolvedValue([])
            chrome.storage.local.get.mockResolvedValue({ appBookmarksCache: {} })

            const result = await checkUrlDuplicate('https://brand-new-site.org')
            expect(result.isDuplicate).toBe(false)
        })
    })

    describe('Session Saver (OneTab style): saveActiveTabsSession', () => {
        it('saves active window web tabs into a dated collection and folder', async () => {
            chrome.tabs.query.mockResolvedValue([
                { id: 1, title: 'Docs', url: 'https://docs.example.com' },
                { id: 2, title: 'Article', url: 'https://blog.example.com' },
                { id: 3, title: 'Settings', url: 'chrome://settings' }, // Should be ignored
                { id: 4, title: 'BookSmart App', url: 'https://booksmart.app/' } // Should be ignored
            ])

            const mockRoot = [{ id: '0', children: [{ id: '1', title: 'Bookmarks bar', children: [] }] }]
            chrome.bookmarks.getTree.mockResolvedValue(mockRoot)
            chrome.bookmarks.getChildren.mockResolvedValue([])

            const res = await saveActiveTabsSession({ sessionName: 'Araştırma - Test' })

            expect(res.success).toBe(true)
            expect(res.count).toBe(2)
            expect(res.sessionName).toBe('Araştırma - Test')
            expect(chrome.bookmarks.create).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Araştırma - Test' })
            )
        })

        it('closes saved tabs when closeTabs is true', async () => {
            chrome.tabs.query.mockResolvedValue([
                { id: 10, title: 'Tab 1', url: 'https://tab1.com' },
                { id: 20, title: 'Tab 2', url: 'https://tab2.com' }
            ])
            chrome.bookmarks.getTree.mockResolvedValue([{ id: '0', children: [{ id: '1', title: 'Bookmarks bar', children: [] }] }])
            chrome.bookmarks.getChildren.mockResolvedValue([])

            const res = await saveActiveTabsSession({ closeTabs: true })

            expect(res.success).toBe(true)
            expect(chrome.tabs.remove).toHaveBeenCalledWith([10, 20])
        })

        it('generates a dated default session name like "Araştırma - DD Ay"', () => {
            const name = getDefaultSessionName()
            expect(name).toMatch(/^Araştırma - \d+ \S+/)
        })
    })

    describe('Context Menus: setupContextMenus and handleContextMenuClick', () => {
        it('configures context menus with direct save and folder submenu', () => {
            setupContextMenus()
            expect(chrome.contextMenus.removeAll).toHaveBeenCalled()
            expect(chrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'booksmart_save_direct' }),
                expect.any(Function)
            )
            expect(chrome.contextMenus.create).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'booksmart_save_to_folder_root' }),
                expect.any(Function)
            )
            for (const folder of CONTEXT_MENU_FOLDERS) {
                expect(chrome.contextMenus.create).toHaveBeenCalledWith(
                    expect.objectContaining({ id: folder.id, parentId: 'booksmart_save_to_folder_root' }),
                    expect.any(Function)
                )
            }
        })

        it('saves link or page from context menu click, sets badge, and fires notification', async () => {
            chrome.bookmarks.getTree.mockResolvedValue([{ id: '0', children: [{ id: '1', title: 'Bookmarks bar', children: [] }] }])
            chrome.bookmarks.getChildren.mockResolvedValue([])

            await handleContextMenuClick({
                menuItemId: 'booksmart_folder_reading',
                pageUrl: 'https://news.ycombinator.com',
                selectionText: 'Interesting discussion about algorithms'
            }, { id: 42, title: 'Hacker News' })

            expect(chrome.bookmarks.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://news.ycombinator.com',
                    title: 'Hacker News'
                })
            )
            expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' })
            expect(chrome.notifications.create).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    title: 'BookSmart - Kaydedildi',
                    message: expect.stringContaining('Okuma Listesi')
                }),
                expect.any(Function)
            )
            expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: { tabId: 42 }
                })
            )
        })

        it('warns user via notification and in-page toast when duplicate bookmark is saved via context menu', async () => {
            // Already in Yazılım folder
            const mockTree = [{
                id: '0',
                children: [{
                    id: 'f_dev',
                    title: 'Yazılım',
                    children: [{ id: 'b_dup', title: 'React', url: 'https://react.dev' }]
                }]
            }]
            chrome.bookmarks.getTree.mockResolvedValue(mockTree)
            chrome.bookmarks.getChildren.mockResolvedValue([])

            await handleContextMenuClick({
                menuItemId: 'booksmart_save_direct',
                pageUrl: 'https://react.dev'
            }, { id: 77, title: 'React' })

            expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'VAR' })
            expect(chrome.notifications.create).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    title: 'BookSmart - Zaten Kayıtlı!',
                    priority: 2,
                    message: expect.stringContaining('Yazılım')
                }),
                expect.any(Function)
            )
            expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: { tabId: 77 }
                })
            )
        })

        it('captures custom url, title, and note in captureCurrentTab', async () => {
            chrome.bookmarks.getTree.mockResolvedValue([{ id: '0', children: [{ id: '1', title: 'Bookmarks bar', children: [] }] }])
            chrome.bookmarks.getChildren.mockResolvedValue([])

            const bookmark = await captureCurrentTab({
                url: 'https://vite.dev',
                title: 'Vite Next Gen',
                note: 'Build tool note',
                folderName: 'Yazılım'
            })

            expect(bookmark.url).toBe('https://vite.dev')
            expect(bookmark.title).toBe('Vite Next Gen')
            expect(bookmark.note).toBe('Build tool note')
            expect(bookmark.newFolder).toBe('Yazılım')
        })
    })

    describe('showNotification and showInPageToast helpers', () => {
        it('triggers chrome.notifications.create with correct payload', () => {
            showNotification('Test Başlık', 'Test Mesajı', true)
            expect(chrome.notifications.create).toHaveBeenCalledWith(
                expect.stringMatching(/^booksmart_\d+/),
                expect.objectContaining({
                    type: 'basic',
                    title: 'Test Başlık',
                    message: 'Test Mesajı',
                    priority: 2
                }),
                expect.any(Function)
            )
        })

        it('invokes chrome.scripting.executeScript for in-page toast', () => {
            showInPageToast(99, { title: 'Kaydedildi', message: 'Detay', isWarning: false })
            expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: { tabId: 99 },
                    args: ['Kaydedildi', 'Detay', false]
                })
            )
        })
    })

    describe('showBadge helper', () => {
        it('sets badge text and color safely', () => {
            showBadge('✓', '#10b981', 0)
            expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' })
            expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#10b981' })
        })
    })

    describe('fetchFeedXml helper', () => {
        it('rejects invalid or loopback URLs', async () => {
            const res1 = await fetchFeedXml('not-a-url')
            expect(res1.success).toBe(false)
            expect(res1.error).toBe('invalid_url')

            const res2 = await fetchFeedXml('http://127.0.0.1:8080/feed.xml')
            expect(res2.success).toBe(false)
            expect(res2.error).toBe('restricted_private_network')
        })

        it('fetches feed xml successfully when response is ok', async () => {
            const mockXml = '<rss><channel><title>Feed</title></channel></rss>'
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => mockXml
            })

            const res = await fetchFeedXml('https://example.com/rss.xml')
            expect(res.success).toBe(true)
            expect(res.xml).toBe(mockXml)
        })
    })
})
