import { useState } from 'react'
import { exportBookmarks, exportToJson, exportToCsv, exportToMarkdown } from '../lib/exporter'

export function useExport({ bookmarks, selectedIds, setSelectedIds }) {
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportFormat, setExportFormat] = useState('html')
    const [exportOnlySelected, setExportOnlySelected] = useState(false)

    const openExportModal = () => {
        setExportOnlySelected(false)
        setIsExportModalOpen(true)
    }

    const openExportSelectedModal = () => {
        setExportOnlySelected(true)
        setIsExportModalOpen(true)
    }

    const performExport = () => {
        const dataToExport = exportOnlySelected
            ? bookmarks.filter(b => selectedIds.has(b.id))
            : bookmarks

        let content = ''
        let type = ''
        let extension = ''

        switch (exportFormat) {
            case 'json':
                content = exportToJson(dataToExport)
                type = 'application/json'
                extension = 'json'
                break
            case 'csv':
                content = exportToCsv(dataToExport)
                type = 'text/csv'
                extension = 'csv'
                break
            case 'md':
                content = exportToMarkdown(dataToExport)
                type = 'text/markdown'
                extension = 'md'
                break
            case 'html':
            default:
                content = exportBookmarks(dataToExport)
                type = 'text/html'
                extension = 'html'
                break
        }

        const blob = new Blob([content], { type })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bookmarks_${exportOnlySelected ? 'selected' : 'organized'}.${extension}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setIsExportModalOpen(false)
        if (exportOnlySelected) setSelectedIds(new Set())
    }

    return {
        isExportModalOpen,
        setIsExportModalOpen,
        exportFormat,
        setExportFormat,
        exportOnlySelected,
        openExportModal,
        openExportSelectedModal,
        performExport
    }
}
