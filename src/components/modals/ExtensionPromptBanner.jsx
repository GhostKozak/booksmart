import { useState, useEffect } from 'react'
import { Sparkles, X, Chrome, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'

const STORAGE_KEY = 'bs_ext_prompt_dismissed'

export function ExtensionPromptBanner({ isExtensionConnected, onOpenGuide }) {
    const { t } = useTranslation()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isExtensionConnected) return

        try {
            const dismissed = localStorage.getItem(STORAGE_KEY)
            if (dismissed === 'true') {
                return
            }
        } catch {
            // Storage access error fallback
        }

        // Show prompt after a short delay so user first sees the interface
        const timer = setTimeout(() => {
            setIsVisible(true)
        }, 600)

        return () => clearTimeout(timer)
    }, [isExtensionConnected])

    const handleDismiss = () => {
        setIsVisible(false)
        try {
            localStorage.setItem(STORAGE_KEY, 'true')
        } catch {
            // Storage access error fallback
        }
    }

    const handleOpenGuide = () => {
        handleDismiss()
        onOpenGuide?.()
    }

    if (!isVisible || isExtensionConnected) {
        return null
    }

    return (
        <aside
            aria-label={t('extensionPrompt.title', 'Companion Extension')}
            className={cn(
                "fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-[calc(100vw-32px)]",
                "bg-card/95 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-2xl p-4 sm:p-5",
                "animate-in slide-in-from-bottom-5 fade-in-0 duration-300 ring-1 ring-white/10"
            )}
        >
            <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-foreground leading-tight">
                            {t('extensionPrompt.title', 'Supercharge with Companion Extension')}
                        </h4>
                        <span className="text-[10px] text-primary font-medium flex items-center gap-1 mt-0.5">
                            <Sparkles className="w-3 h-3" />
                            {t('extensionPrompt.tagline', 'CORS-Free Health & 2-Way Browser Sync')}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors cursor-pointer"
                    aria-label={t('common.close', 'Close')}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <p className="text-xs text-muted-foreground mb-3.5 leading-relaxed">
                {t('extensionPrompt.desc', 'Install the lightweight companion extension to check dead links serverlessly, sync with browser bookmarks, and save active tabs in 1-click.')}
            </p>

            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    onClick={handleOpenGuide}
                    className="flex-1 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm gap-1.5 cursor-pointer"
                >
                    <Chrome className="w-3.5 h-3.5" />
                    <span>{t('extensionPrompt.installGuide', 'Setup Extension')}</span>
                    <ArrowRight className="w-3 h-3 ml-auto opacity-70" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer px-2.5"
                >
                    {t('extensionPrompt.later', 'Later')}
                </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/80 mt-2.5 text-center">
                {t('extensionPrompt.permanentTip', 'Dismissed? You can always access extension setup anytime from the ⋯ menu.')}
            </p>
        </aside>
    )
}
