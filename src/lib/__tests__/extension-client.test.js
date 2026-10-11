import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    initExtensionBridge,
    pingExtension,
    isExtensionConnected,
    getExtensionState,
    subscribeExtensionStatus,
    checkLinksWithExtension,
    getBrowserBookmarks,
    pushBookmarksToBrowser,
    syncBrowserBookmarks,
    captureActiveTab,
    _resetExtensionStateForTesting
} from '../extension-client'

describe('extension-client', () => {
    beforeEach(() => {
        _resetExtensionStateForTesting()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('initializes extension bridge and listens for ready messages', () => {
        initExtensionBridge()

        window.dispatchEvent(
            new MessageEvent('message', {
                data: {
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_EXTENSION_READY',
                    version: '1.0.0'
                }
            })
        )

        expect(isExtensionConnected()).toBe(true)
        expect(getExtensionState().version).toBe('1.0.0')
    })

    it('subscribes to status changes and receives updates', () => {
        initExtensionBridge()
        const callback = vi.fn()
        const unsubscribe = subscribeExtensionStatus(callback)

        // Initial call
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({
            available: false
        }))

        // Trigger announcement
        window.dispatchEvent(
            new MessageEvent('message', {
                data: {
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_PONG',
                    version: '1.2.0'
                }
            })
        )

        expect(callback).toHaveBeenCalledWith(expect.objectContaining({
            available: true,
            version: '1.2.0'
        }))

        unsubscribe()
    })

    it('pingExtension resolves with available true when extension responds with PONG', async () => {
        const pingPromise = pingExtension(500)

        // Simulate extension replying to ping
        window.dispatchEvent(
            new MessageEvent('message', {
                data: {
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_PONG',
                    version: '1.0.0'
                }
            })
        )

        const result = await pingPromise
        expect(result.available).toBe(true)
        expect(result.version).toBe('1.0.0')
    })

    it('pingExtension resolves with available false when timeout expires', async () => {
        const result = await pingExtension(50)
        expect(result.available).toBe(false)
    })

    it('checkLinksWithExtension handles empty url array', async () => {
        const onComplete = vi.fn()
        const results = await checkLinksWithExtension([], { onComplete })
        expect(results).toEqual([])
        expect(onComplete).toHaveBeenCalled()
    })

    it('checkLinksWithExtension receives streaming batches and completes', async () => {
        const urls = ['https://react.dev', 'https://vitejs.dev']
        const onProgress = vi.fn()
        const onComplete = vi.fn()

        const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation((data) => {
            if (data?.source === 'BOOKSMART_PAGE' && data.type === 'BOOKSMART_CHECK_LINKS') {
                const requestId = data.requestId

                // Respond immediately via dispatchEvent
                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_LINK_STATUS_UPDATE',
                            requestId,
                            results: [
                                { url: 'https://react.dev', status: 'alive', statusCode: 200 }
                            ],
                            processed: 1,
                            total: 2
                        }
                    })
                )

                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_LINK_STATUS_UPDATE',
                            requestId,
                            results: [
                                { url: 'https://vitejs.dev', status: 'alive', statusCode: 200 }
                            ],
                            processed: 2,
                            total: 2
                        }
                    })
                )

                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_LINKS_CHECKED_COMPLETE',
                            requestId
                        }
                    })
                )
            }
        })

        const finalResults = await checkLinksWithExtension(urls, { onProgress, onComplete })

        expect(finalResults).toHaveLength(2)
        expect(onProgress).toHaveBeenCalledTimes(2)
        expect(onComplete).toHaveBeenCalledTimes(1)
        postMessageSpy.mockRestore()
    })

    it('checkLinksWithExtension handles extension error', async () => {
        const urls = ['https://error-test.com']
        const onError = vi.fn()

        const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation((data) => {
            if (data?.source === 'BOOKSMART_PAGE' && data.type === 'BOOKSMART_CHECK_LINKS') {
                const requestId = data.requestId
                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_LINKS_CHECKED_ERROR',
                            requestId,
                            error: 'Service worker unavailable'
                        }
                    })
                )
            }
        })

        await expect(checkLinksWithExtension(urls, { onError })).rejects.toThrow('Service worker unavailable')
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
        postMessageSpy.mockRestore()
    })

    it('checkLinksWithExtension aborts when AbortSignal fires', async () => {
        const controller = new AbortController()
        const checkPromise = checkLinksWithExtension(['https://slow.com'], { signal: controller.signal })

        controller.abort()

        await expect(checkPromise).rejects.toThrow('Link check cancelled by user')
    })

    it('getBrowserBookmarks resolves with bookmarks list', async () => {
        const mockBookmarks = [
            { id: '1', title: 'Test 1', url: 'https://test1.com', originalFolder: 'Bar' }
        ]

        const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation((data) => {
            if (data?.type === 'BOOKSMART_GET_BROWSER_BOOKMARKS') {
                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_BROWSER_BOOKMARKS_RESULT',
                            requestId: data.requestId,
                            success: true,
                            bookmarks: mockBookmarks
                        }
                    })
                )
            }
        })

        const result = await getBrowserBookmarks(500)
        expect(result).toEqual(mockBookmarks)
        postMessageSpy.mockRestore()
    })

    it('pushBookmarksToBrowser resolves with created count and folder', async () => {
        const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation((data) => {
            if (data?.type === 'BOOKSMART_PUSH_BROWSER_BOOKMARKS') {
                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_BROWSER_PUSH_RESULT',
                            requestId: data.requestId,
                            success: true,
                            count: 5,
                            folder: 'BookSmart'
                        }
                    })
                )
            }
        })

        const result = await pushBookmarksToBrowser([{ url: 'https://a.com' }], { targetFolderName: 'BookSmart' }, 500)
        expect(result).toEqual({ count: 5, folder: 'BookSmart' })
        postMessageSpy.mockRestore()
    })

    it('syncBrowserBookmarks resolves with sync statistics', async () => {
        const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation((data) => {
            if (data?.type === 'BOOKSMART_SYNC_BROWSER_BOOKMARKS') {
                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_BROWSER_SYNC_RESULT',
                            requestId: data.requestId,
                            success: true,
                            importedBookmarks: [{ title: 'New', url: 'https://new.com' }],
                            exportedCount: 2,
                            totalInBrowser: 10,
                            totalInApp: 12
                        }
                    })
                )
            }
        })

        const result = await syncBrowserBookmarks([], {}, 500)
        expect(result.importedBookmarks).toHaveLength(1)
        expect(result.exportedCount).toBe(2)
        expect(result.totalInApp).toBe(12)
        postMessageSpy.mockRestore()
    })

    it('captureActiveTab resolves with captured bookmark', async () => {
        const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation((data) => {
            if (data?.type === 'BOOKSMART_CAPTURE_TAB') {
                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_CAPTURE_TAB_RESULT',
                            requestId: data.requestId,
                            success: true,
                            bookmark: { title: 'Current Page', url: 'https://curr.com' }
                        }
                    })
                )
            }
        })

        const result = await captureActiveTab({}, 500)
        expect(result.url).toBe('https://curr.com')
        postMessageSpy.mockRestore()
    })

    it('syncBrowserBookmarks strips uncloneable DOM events and non-serializable properties', async () => {
        let sentPayload = null
        const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation((data) => {
            if (data?.type === 'BOOKSMART_SYNC_BROWSER_BOOKMARKS') {
                sentPayload = data.payload
                window.dispatchEvent(
                    new MessageEvent('message', {
                        data: {
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_BROWSER_SYNC_RESULT',
                            requestId: data.requestId,
                            success: true,
                            importedBookmarks: [],
                            exportedCount: 0
                        }
                    })
                )
            }
        })

        const mockPointerEvent = {
            nativeEvent: {},
            preventDefault: vi.fn(),
            type: 'click'
        }

        await syncBrowserBookmarks([{ id: 1, title: 'Safe', url: 'https://safe.com' }], mockPointerEvent, 500)

        expect(sentPayload).not.toBeNull()
        expect(sentPayload.options).toEqual({})
        expect(sentPayload.bookmarks[0].url).toBe('https://safe.com')
        postMessageSpy.mockRestore()
    })
})
