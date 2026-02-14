import { Download, File } from 'lucide-react'
import { SimpleModal } from '../ui/SimpleModal'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export function ExportModal({
    isOpen, onClose,
    exportFormat, setExportFormat,
    exportOnlySelected,
    selectedCount,
    onExport
}) {
    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={exportOnlySelected ? `Export ${selectedCount} Selected Bookmarks` : 'Export Bookmarks'}
        >
            <div className="space-y-4">
                {exportOnlySelected && (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                        <Download className="h-4 w-4 text-primary shrink-0" />
                        <span><strong>{selectedCount}</strong> bookmark selected for export.</span>
                    </div>
                )}
                <p className="text-sm text-muted-foreground">Select the format you want to export your bookmarks in.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { key: 'html', label: 'HTML (Netscape)', desc: 'Standard format. Best for importing into other browsers or managers.', color: 'bg-orange-100 text-orange-600' },
                        { key: 'json', label: 'JSON', desc: 'Raw data format. Useful for developers or programmatic access.', color: 'bg-blue-100 text-blue-600' },
                        { key: 'csv', label: 'CSV', desc: 'Comma-separated values. Perfect for Excel or Google Sheets.', color: 'bg-green-100 text-green-600' },
                        { key: 'md', label: 'Markdown', desc: 'Formatted text. Great for documentation or notes apps (Obsidian, Notion).', color: 'bg-slate-100 text-slate-600' },
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
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={onExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
