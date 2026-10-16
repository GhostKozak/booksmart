import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBrowserSync } from '../use-browser-sync'
import { db } from '../../db'
import * as extensionClient from '../../lib/extension-client'
import { toast } from 'sonner'

vi.mock('../../db', () => ({
    db: {
        bookmarks: {
            bulkAdd: vi.fn(),
            bulkDelete: vi.fn(),
            clear: vi.fn(),
            toArray: vi.fn().mockResolvedValue([]),
            add: vi.fn().mockResolvedValue(1),
            delete: vi.fn().mockResolvedValue(1)
        },
        transaction: vi.fn((mode, table, cb) => cb())
    }
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    }
}))

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => (typeof fallback === 'object' ? fallback.defaultValue : fallback) || key
    })
}))

describe('useBrowserSync', () => {
    const addCommand = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('importFromBrowser imports all bookmarks when local library is empty', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        vi.spyOn(extensionClient, 'getBrowserBookmarks').mockResolvedValue([
            { id: '1', title: 'React', url: 'https://react.dev' },
            { id: '2', title: 'Vite', url: 'https://vitejs.dev' }
        ])

        const { result } = renderHook(() => useBrowserSync({ rawBookmarks: [], addCommand }))

        let res
        await act(async () => {
            res = await result.current.importFromBrowser()
        })

        expect(res.success).toBe(true)
        expect(res.count).toBe(2)
        expect(db.bookmarks.bulkAdd).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ url: 'https://react.dev' })
        ]))
        expect(addCommand).toHaveBeenCalled()
    })

    it('importFromBrowser filters out duplicate URLs when local library is not empty', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        vi.spyOn(extensionClient, 'getBrowserBookmarks').mockResolvedValue([
            { id: '1', title: 'React', url: 'https://react.dev' },
            { id: '2', title: 'Vue', url: 'https://vuejs.org' }
        ])

        const rawBookmarks = [
            { id: 'existing', title: 'React Official', url: 'https://react.dev' }
        ]

        const { result } = renderHook(() => useBrowserSync({ rawBookmarks, addCommand }))

        let res
        await act(async () => {
            res = await result.current.importFromBrowser()
        })

        expect(res.success).toBe(true)
        expect(res.count).toBe(1) // Only Vue was imported
        expect(db.bookmarks.bulkAdd).toHaveBeenCalledWith([
            expect.objectContaining({ url: 'https://vuejs.org' })
        ])
    })

    it('pushToBrowser sends bookmarks to extension', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        vi.spyOn(extensionClient, 'pushBookmarksToBrowser').mockResolvedValue({
            count: 3,
            folder: 'BookSmart'
        })

        const rawBookmarks = [
            { id: '1', title: 'A', url: 'https://a.com' }
        ]

        const { result } = renderHook(() => useBrowserSync({ rawBookmarks, addCommand }))

        let res
        await act(async () => {
            res = await result.current.pushToBrowser(rawBookmarks)
        })

        expect(res.success).toBe(true)
        expect(res.count).toBe(3)
        expect(res.folder).toBe('BookSmart')
    })

    it('twoWaySync imports missing bookmarks and reports sync statistics', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        vi.spyOn(extensionClient, 'syncBrowserBookmarks').mockResolvedValue({
            importedBookmarks: [{ id: 'b1', title: 'New from Browser', url: 'https://browser.com' }],
            exportedCount: 4,
            totalInBrowser: 14,
            totalInApp: 15
        })

        const rawBookmarks = [{ id: '1', title: 'Local', url: 'https://local.com' }]
        const { result } = renderHook(() => useBrowserSync({ rawBookmarks, addCommand }))

        let res
        await act(async () => {
            res = await result.current.twoWaySync()
        })

        expect(res.success).toBe(true)
        expect(res.importedBookmarks).toHaveLength(1)
        expect(res.exportedCount).toBe(4)
        expect(db.bookmarks.bulkAdd).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ url: 'https://browser.com' })])
        )
        expect(addCommand).toHaveBeenCalled()
    })

    it('twoWaySync handles updated bookmarks and calls toast with updated count', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        vi.spyOn(extensionClient, 'syncBrowserBookmarks').mockResolvedValue({
            importedBookmarks: [],
            exportedCount: 0,
            updatedCount: 2,
            totalInBrowser: 10,
            totalInApp: 10
        })

        const rawBookmarks = [{ id: '1', title: 'Local', url: 'https://local.com' }]
        const { result } = renderHook(() => useBrowserSync({ rawBookmarks, addCommand }))

        let res
        await act(async () => {
            res = await result.current.twoWaySync()
        })

        expect(res.success).toBe(true)
        expect(res.updatedCount).toBe(2)
        expect(toast.success).toHaveBeenCalledWith(
            expect.stringContaining('2 updated/moved in browser')
        )
    })

    it('importFromBrowser deduplicates internally even when rawBookmarks is empty', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        vi.spyOn(extensionClient, 'getBrowserBookmarks').mockResolvedValue([
            { id: '1', title: 'React', url: 'https://react.dev' },
            { id: '2', title: 'React Duplicate', url: 'https://react.dev/' }
        ])

        const { result } = renderHook(() => useBrowserSync({ rawBookmarks: [], addCommand }))

        let res
        await act(async () => {
            res = await result.current.importFromBrowser()
        })

        expect(res.success).toBe(true)
        // Even though browser returned 2, only 1 should be added!
        expect(res.count).toBe(1)
        expect(db.bookmarks.bulkAdd).toHaveBeenCalledWith([
            expect.objectContaining({ id: '1', url: 'https://react.dev' })
        ])
    })

    it('undo command invokes bulkDelete with imported IDs rather than clearing all DB', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        vi.spyOn(extensionClient, 'getBrowserBookmarks').mockResolvedValue([
            { id: 'imp_1', title: 'React', url: 'https://react.dev' }
        ])

        const { result } = renderHook(() => useBrowserSync({ rawBookmarks: [], addCommand }))

        await act(async () => {
            await result.current.importFromBrowser()
        })

        expect(addCommand).toHaveBeenCalled()
        const commandArg = addCommand.mock.calls[0][0]
        expect(typeof commandArg.undo).toBe('function')

        // Calling undo should call bulkDelete with ['imp_1'], NEVER clear()
        commandArg.undo()
        expect(db.bookmarks.bulkDelete).toHaveBeenCalledWith(['imp_1'])
        expect(db.bookmarks.clear).not.toHaveBeenCalled()
    })

    it('automatically triggers twoWaySync and cleans query param when ?sync=auto is present', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        vi.spyOn(extensionClient, 'syncBrowserBookmarks').mockResolvedValue({
            importedBookmarks: [],
            exportedCount: 0
        })

        const originalLocation = window.location
        const replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})

        try {
            delete window.location
            window.location = new URL('http://localhost:5173/?sync=auto')

            vi.useFakeTimers()
            renderHook(() => useBrowserSync({ rawBookmarks: [], addCommand }))

            expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/')

            await act(async () => {
                vi.advanceTimersByTime(500)
            })

            expect(extensionClient.syncBrowserBookmarks).toHaveBeenCalled()
        } finally {
            vi.useRealTimers()
            window.location = originalLocation
        }
    })

    it('safely handles PointerEvent / DOM events passed as arguments without error', async () => {
        vi.spyOn(extensionClient, 'isExtensionConnected').mockReturnValue(true)
        const syncSpy = vi.spyOn(extensionClient, 'syncBrowserBookmarks').mockResolvedValue({
            importedBookmarks: [],
            exportedCount: 0
        })
        const pushSpy = vi.spyOn(extensionClient, 'pushBookmarksToBrowser').mockResolvedValue({
            count: 1,
            folder: 'BookSmart'
        })

        const rawBookmarks = [{ id: '1', title: 'Local', url: 'https://local.com' }]
        const { result } = renderHook(() => useBrowserSync({ rawBookmarks, addCommand }))

        const mockPointerEvent = {
            nativeEvent: {},
            preventDefault: vi.fn(),
            stopPropagation: vi.fn()
        }

        // twoWaySync called directly as onClick handler
        await act(async () => {
            await result.current.twoWaySync(mockPointerEvent)
        })
        expect(syncSpy).toHaveBeenCalledWith(expect.any(Array), {})

        // pushToBrowser called directly as onClick handler
        await act(async () => {
            await result.current.pushToBrowser(mockPointerEvent)
        })
        expect(pushSpy).toHaveBeenCalledWith(expect.any(Array), { targetFolderName: 'BookSmart', clean: false })
    })
})
