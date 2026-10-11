import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBrowserSync } from '../use-browser-sync'
import { db } from '../../db'
import * as extensionClient from '../../lib/extension-client'

vi.mock('../../db', () => ({
    db: {
        bookmarks: {
            bulkAdd: vi.fn(),
            bulkDelete: vi.fn(),
            clear: vi.fn()
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
})
