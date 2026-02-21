import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'

export function ConflictNotificationBar({ conflictCount, onResolve }) {
    const { t } = useTranslation()

    return (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-amber-500/15 border border-amber-500/30 backdrop-blur-sm shadow-lg">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                        <path d="M12 9v4" /><path d="M12 17h.01" />
                    </svg>
                    <span className="font-medium whitespace-nowrap">
                        {conflictCount} {t('modals.ruleConflict.notificationText', { count: conflictCount })}
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 sm:h-7 text-[10px] sm:text-xs rounded-full border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 px-2.5 sm:px-3"
                    onClick={onResolve}
                >
                    {t('modals.ruleConflict.resolve')}
                </Button>
            </div>
        </div>
    )
}
