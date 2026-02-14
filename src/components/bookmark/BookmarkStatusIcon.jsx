import { Check, XCircle, Layers } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

export function BookmarkStatusIcon({ bookmark, className }) {
    const { t } = useTranslation();

    if (bookmark.isDuplicate) {
        return (
            <div className={cn("flex justify-center", className)} title={t('bookmarks.status.duplicate')}>
                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <XCircle className="h-3.5 w-3.5" />
                </div>
            </div>
        )
    }

    if (bookmark.hasDuplicate) {
        return (
            <div className={cn("flex justify-center", className)} title={t('bookmarks.status.original')}>
                <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                    <Layers className="h-3.5 w-3.5" />
                </div>
            </div>
        )
    }

    if (bookmark.status === 'matched') {
        return (
            <div className={cn("flex justify-center", className)} title={t('bookmarks.status.matched')}>
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5" />
                </div>
            </div>
        )
    }

    return (
        <div className={cn("flex justify-center", className)} title={t('bookmarks.status.unknown')}>
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            </div>
        </div>
    )
}
