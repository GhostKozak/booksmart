import { useState } from 'react'
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Chrome, Layers, Terminal } from 'lucide-react'
import { SimpleModal } from '../ui/SimpleModal'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'
import { pingExtension } from '../../lib/extension-client'
import { toast } from 'sonner'

export function ExtensionGuideModal({ isOpen, onClose, isConnected, onStatusChange }) {
    const { t } = useTranslation()
    const [isPinging, setIsPinging] = useState(false)

    const handleCheckConnection = async () => {
        setIsPinging(true)
        try {
            const status = await pingExtension(1500)
            if (status.available) {
                toast.success(t('settings.network.extensionDetectedToast', 'Companion extension connected successfully!'))
                onStatusChange?.(true)
            } else {
                toast.info(t('settings.network.extensionNotFoundToast', 'Extension not detected yet.'))
                onStatusChange?.(false)
            }
        } finally {
            setIsPinging(false)
        }
    }

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('modals.extensionGuide.title', 'BookSmart Companion Extension')}
            className="max-w-md"
        >
            <div className="space-y-4 text-sm">
                {/* Status Banner */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isConnected
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-muted/40 border-border/80 text-foreground'
                }`}>
                    <div className="flex items-center gap-2.5">
                        {isConnected ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <div>
                            <div className="font-semibold text-xs">
                                {isConnected
                                    ? t('settings.network.extensionConnected', 'Extension Connected (CORS-Free)')
                                    : t('settings.network.extensionNotDetected', 'Extension Not Detected')}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                {isConnected
                                    ? t('modals.extensionGuide.statusActive', 'Active in background')
                                    : t('modals.extensionGuide.statusInactive', 'Load unpacked extension to activate')}
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCheckConnection}
                        disabled={isPinging}
                        className="h-7 text-xs gap-1.5 shrink-0"
                    >
                        <RefreshCw className={`h-3 w-3 ${isPinging ? 'animate-spin' : ''}`} />
                        {t('settings.network.extensionRetryBtn', 'Check')}
                    </Button>
                </div>

                {/* Explanation */}
                <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed bg-secondary/30 p-3 rounded-lg border border-border/50">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        {t('modals.extensionGuide.whyTitle', 'Why use the extension?')}
                    </div>
                    <p>
                        {t('modals.extensionGuide.whyDesc', 'Web browsers block direct access to external status codes due to CORS policies (causing 404 dead links to falsely appear alive). The companion extension runs a serverless background script with full permissions, enabling 100% accurate, private health checks.')}
                    </p>
                </div>

                {/* Step by Step Guide */}
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('modals.extensionGuide.stepsTitle', 'Installation Steps (Chrome / Edge / Brave / Arc)')}
                    </div>

                    <ol className="text-xs space-y-2 text-muted-foreground list-decimal list-inside pl-1">
                        <li className="leading-relaxed">
                            <span className="font-medium text-foreground">
                                {t('modals.extensionGuide.step1', 'Open Extensions page')}
                            </span>
                            <div className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded mt-0.5 inline-block text-foreground select-all">
                                chrome://extensions
                            </div>
                        </li>
                        <li className="leading-relaxed">
                            <span className="font-medium text-foreground">
                                {t('modals.extensionGuide.step2', 'Enable Developer Mode')}
                            </span>
                            <span className="block text-[11px]">
                                {t('modals.extensionGuide.step2Desc', 'Toggle the switch in the top-right corner.')}
                            </span>
                        </li>
                        <li className="leading-relaxed">
                            <span className="font-medium text-foreground">
                                {t('modals.extensionGuide.step3', 'Click "Load unpacked" (Paketlenmemiş öğe yükle)')}
                            </span>
                        </li>
                        <li className="leading-relaxed">
                            <span className="font-medium text-foreground">
                                {t('modals.extensionGuide.step4', 'Select the extension folder')}
                            </span>
                            <div className="text-[11px] mt-0.5 flex items-center gap-1 font-mono bg-muted/60 px-2 py-0.5 rounded text-foreground">
                                <Terminal className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span>/extension</span>
                            </div>
                        </li>
                    </ol>
                </div>

                <div className="flex justify-end pt-2 border-t border-border/50">
                    <Button onClick={onClose} size="sm">
                        {t('common.close', 'Close')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
