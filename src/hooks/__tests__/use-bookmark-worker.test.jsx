import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBookmarkWorker } from '../use-bookmark-worker'
import * as extensionClient from '../../lib/extension-client'

vi.mock('../../workers/processing.worker.js?worker', () => {
    class MockWorker {
        constructor() {
            this.postMessage = vi.fn()
            this.terminate = vi.fn()
            this.onmessage = null
        }
    }
    return { default: MockWorker }
})

describe('useBookmarkWorker', () => {
    const defaultProps = {
        rawBookmarks: [
            { id: '1', url: 'https://react.dev', title: 'React' },
            { id: '2', url: 'https://vitejs.dev', title: 'Vite' }
        ],
        rules: [],
        searchQuery: '',
        searchMode: 'simple',
        activeTag: null,
        activeFolder: null,
        activeCollection: null,
        smartFilter: 'all',
        dateFilter: {},
        sortBy: 'date-desc',
        fuseOptions: {}
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('initializes state correctly', () => {
        const { result } = renderHook(() => useBookmarkWorker(defaultProps))
        expect(result.current.isCheckingLinks).toBe(false)
        expect(result.current.linkHealth).toEqual({})
        expect(result.current.deadLinkCount).toBe(0)
    })

    it('runs link check via extension when extension is available', async () => {
        const pingSpy = vi.spyOn(extensionClient, 'pingExtension').mockResolvedValue({
            available: true,
            version: '1.0.0'
        })

        const checkSpy = vi.spyOn(extensionClient, 'checkLinksWithExtension').mockImplementation(
            (urls, { onProgress, onComplete }) => {
                onProgress([
                    { url: 'https://react.dev', status: 'alive' },
                    { url: 'https://vitejs.dev', status: 'dead' }
                ])
                onComplete()
                return Promise.resolve()
            }
        )

        const { result } = renderHook(() => useBookmarkWorker(defaultProps))

        // Set mock bookmarks on worker return
        await act(async () => {
            await result.current.checkAllLinks()
        })

        expect(pingSpy).toHaveBeenCalled()
        expect(checkSpy).toHaveBeenCalledWith(
            expect.arrayContaining(['https://react.dev', 'https://vitejs.dev']),
            expect.any(Object)
        )
        expect(result.current.linkHealth['https://react.dev']).toBe('alive')
        expect(result.current.linkHealth['https://vitejs.dev']).toBe('dead')
        expect(result.current.isCheckingLinks).toBe(false)

        pingSpy.mockRestore()
        checkSpy.mockRestore()
    })

    it('falls back to worker when extension is unavailable', async () => {
        const pingSpy = vi.spyOn(extensionClient, 'pingExtension').mockResolvedValue({
            available: false,
            version: null
        })

        const { result } = renderHook(() => useBookmarkWorker(defaultProps))

        await act(async () => {
            await result.current.checkAllLinks()
        })

        expect(pingSpy).toHaveBeenCalled()
        expect(result.current.isCheckingLinks).toBe(true)

        pingSpy.mockRestore()
    })
})
