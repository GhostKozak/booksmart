import { useState, useMemo } from 'react'
import { getExportPayload } from '../lib/exporter'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export function useExport({ bookmarks, selectedIds, setSelectedIds }) {
    const { t } = useTranslation()
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportFormat, setExportFormat] = useState('html')
    const [exportOnlySelected, setExportOnlySelected] = useState(false)
    const [selectedFolder, setSelectedFolder] = useState('all')

    const openExportModal = (initialFolder = 'all') => {
        setExportOnlySelected(false)
        setSelectedFolder(initialFolder)
        setIsExportModalOpen(true)
    }

    const openExportSelectedModal = () => {
        setExportOnlySelected(true)
        setIsExportModalOpen(true)
    }

    const dataToExport = useMemo(() => {
        let list = bookmarks || []
        if (exportOnlySelected) {
            list = list.filter(b => selectedIds.has(b.id))
        } else if (selectedFolder && selectedFolder !== 'all') {
            list = list.filter(b => {
                const folder = b.newFolder || 'Root'
                return folder === selectedFolder || folder.startsWith(selectedFolder + ' > ')
            })
        }
        return list
    }, [bookmarks, exportOnlySelected, selectedIds, selectedFolder])

    const exportPayload = useMemo(() => {
        return getExportPayload(dataToExport, exportFormat)
    }, [dataToExport, exportFormat])

    const performExport = () => {
        const { content, type, extension } = exportPayload

        let filename = 'bookmarks_organized'
        if (exportOnlySelected) {
            filename = 'bookmarks_selected'
        } else if (selectedFolder && selectedFolder !== 'all') {
            const sanitized = selectedFolder.replace(/[^a-zA-Z0-9_-]/g, '_')
            filename = `bookmarks_${sanitized}`
        }

        const blob = new Blob([content], { type })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.${extension}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setIsExportModalOpen(false)
        if (exportOnlySelected) setSelectedIds(new Set())
        toast.success(t('toast.exportSuccess'))
    }

    return {
        isExportModalOpen,
        setIsExportModalOpen,
        exportFormat,
        setExportFormat,
        exportOnlySelected,
        selectedFolder,
        setSelectedFolder,
        dataToExport,
        exportPayload,
        openExportModal,
        openExportSelectedModal,
        performExport
    }
}
