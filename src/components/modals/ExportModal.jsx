import { useMemo } from 'react'
import { Download, File, Folder, Eye, Check } from 'lucide-react'
import { SimpleModal } from '../ui/SimpleModal'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation, Trans } from 'react-i18next'

export function ExportModal({
    isOpen, onClose,
    exportFormat, setExportFormat,
    exportOnlySelected,
    selectedCount = 0,
    selectedFolder = 'all',
    setSelectedFolder,
    availableFolders = [],
    dataToExport = [],
    exportPayload,
    onExport
}) {
    const { t } = useTranslation()

    const exportCount = dataToExport.length
    const previewItems = useMemo(() => dataToExport.slice(0, 3), [dataToExport])
    const remainingCount = Math.max(0, exportCount - previewItems.length)

    // Sorted unique folders
    const sortedFolders = useMemo(() => {
        const folderNames = (availableFolders || [])
            .map(f => (typeof f === 'string' ? f : f?.name))
            .filter(Boolean)
            .map(s => String(s).trim())
            .filter(s => s.length > 0)

        const set = new Set(folderNames)
        set.add('Root')
        return Array.from(set).sort((a, b) => {
            if (a === 'Root') return -1
            if (b === 'Root') return 1
            const strA = typeof a === 'string' ? a : String(a?.name || a || '')
            const strB = typeof b === 'string' ? b : String(b?.name || b || '')
            return strA.localeCompare(strB, undefined, { sensitivity: 'base' })
        })
    }, [availableFolders])

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={exportOnlySelected ? t('modals.export.titleSelected', { count: selectedCount }) : t('modals.export.title')}
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
            <div className="space-y-5">
                {exportOnlySelected ? (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-foreground">
                        <Download className="h-4 w-4 text-primary shrink-0" />
                        <span>
                            <Trans i18nKey="modals.export.selectedCount" count={selectedCount}>
                                <strong>{{ count: selectedCount }}</strong> bookmark selected for export.
                            </Trans>
                        </span>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="export-folder-select" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            <Folder className="h-3.5 w-3.5" />
                            {t('modals.export.folderSelect', 'Folder Scope')}
                        </label>
                        <select
                            id="export-folder-select"
                            value={selectedFolder || 'all'}
                            onChange={(e) => setSelectedFolder?.(e.target.value)}
                            className="w-full h-10 px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        >
                            <option value="all">
                                {t('modals.export.allFolders', { defaultValue: 'All Folders' })} ({exportCount})
                            </option>
                            {sortedFolders.map(folder => (
                                <option key={folder} value={folder}>
                                    📁 {folder}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                        {t('modals.export.formatSelect', 'Select export format:')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { key: 'html', label: t('modals.export.formats.html.label'), desc: t('modals.export.formats.html.desc'), color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
                            { key: 'json', label: t('modals.export.formats.json.label'), desc: t('modals.export.formats.json.desc'), color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
                            { key: 'csv', label: t('modals.export.formats.csv.label'), desc: t('modals.export.formats.csv.desc'), color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
                            { key: 'md', label: t('modals.export.formats.md.label'), desc: t('modals.export.formats.md.desc'), color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
                        ].map(fmt => {
                            const isSelected = exportFormat === fmt.key
                            return (
                                <button
                                    type="button"
                                    key={fmt.key}
                                    className={cn(
                                        "cursor-pointer text-left border rounded-xl p-3.5 transition-all flex flex-col justify-between relative",
                                        isSelected
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-xs"
                                            : "border-border hover:bg-muted/40 hover:border-muted-foreground/30"
                                    )}
                                    onClick={() => setExportFormat(fmt.key)}
                                >
                                    <div className="flex items-center justify-between w-full mb-1">
                                        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                                            <div className={cn("p-1.5 rounded-lg", fmt.color)}>
                                                <File className="h-4 w-4" />
                                            </div>
                                            {fmt.label}
                                        </div>
                                        {isSelected && (
                                            <div className="bg-primary text-primary-foreground p-0.5 rounded-full">
                                                <Check className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fmt.desc}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Export Preview Panel */}
                <div className="border border-border/80 bg-muted/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                            <Eye className="h-3.5 w-3.5 text-primary" />
                            {t('modals.export.preview.title', 'Export Preview')}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground font-medium rounded-md">
                                {exportCount} {t('modals.export.preview.countSuffix', 'items')}
                            </span>
                            {exportPayload?.estimatedSize && (
                                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary font-medium rounded-md">
                                    ~{exportPayload.estimatedSize}
                                </span>
                            )}
                        </div>
                    </div>

                    {exportCount === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground bg-background/50 rounded-lg border border-dashed border-border">
                            {t('modals.export.preview.noItems', 'No bookmarks to export in this scope.')}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="space-y-1.5">
                                {previewItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="p-2.5 bg-background border border-border/60 rounded-lg text-xs flex items-center justify-between gap-3 shadow-2xs"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-foreground truncate">{item.title || item.url}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">{item.url}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground truncate max-w-[100px]">
                                                {item.newFolder || 'Root'}
                                            </span>
                                            {item.tags && item.tags.length > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded truncate max-w-[80px]">
                                                    #{item.tags[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {remainingCount > 0 && (
                                <p className="text-center text-[11px] text-muted-foreground italic pt-1">
                                    {t('modals.export.preview.viewMore', { count: remainingCount, defaultValue: `+${remainingCount} more bookmarks` })}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button onClick={onExport} disabled={exportCount === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('modals.export.download')} ({exportCount})
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
