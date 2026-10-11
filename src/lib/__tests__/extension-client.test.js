import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    initExtensionBridge,
    pingExtension,
    isExtensionConnected,
    getExtensionState,
    subscribeExtensionStatus,
    checkLinksWithExtension,
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
})
