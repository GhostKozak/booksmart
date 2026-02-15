import { Download, File } from 'lucide-react'
import { SimpleModal } from '../ui/SimpleModal'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation, Trans } from 'react-i18next'

export function ExportModal({
    isOpen, onClose,
    exportFormat, setExportFormat,
    exportOnlySelected,
    selectedCount,
    onExport
}) {
    const { t } = useTranslation()
    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={exportOnlySelected ? t('modals.export.titleSelected', { count: selectedCount }) : t('modals.export.title')}
        >
            <div className="space-y-4">
                {exportOnlySelected && (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                        <Download className="h-4 w-4 text-primary shrink-0" />
                        <span>
                            <Trans i18nKey="modals.export.selectedCount" count={selectedCount}>
                                <strong>{{ count: selectedCount }}</strong> bookmark selected for export.
                            </Trans>
                        </span>
                    </div>
                )}
                <p className="text-sm text-muted-foreground">{t('modals.export.formatSelect')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { key: 'html', label: t('modals.export.formats.html.label'), desc: t('modals.export.formats.html.desc'), color: 'bg-orange-100 text-orange-600' },
                        { key: 'json', label: t('modals.export.formats.json.label'), desc: t('modals.export.formats.json.desc'), color: 'bg-blue-100 text-blue-600' },
                        { key: 'csv', label: t('modals.export.formats.csv.label'), desc: t('modals.export.formats.csv.desc'), color: 'bg-green-100 text-green-600' },
                        { key: 'md', label: t('modals.export.formats.md.label'), desc: t('modals.export.formats.md.desc'), color: 'bg-slate-100 text-slate-600' },
                    ].map(fmt => (
                        <div
                            key={fmt.key}
                            className={cn(
                                "cursor-pointer border rounded-lg p-4 transition-all hover:bg-muted/50",
                                exportFormat === fmt.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                            )}
                            onClick={() => setExportFormat(fmt.key)}
                        >
                            <div className="flex items-center gap-2 font-semibold mb-1">
                                <div className={cn("p-1.5 rounded-md", fmt.color)}><File className="h-4 w-4" /></div>
                                {fmt.label}
                            </div>
                            <p className="text-xs text-muted-foreground">{fmt.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button onClick={onExport}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('modals.export.download')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
