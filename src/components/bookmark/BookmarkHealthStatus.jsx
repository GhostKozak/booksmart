import { Loader2, CheckCircle2, XCircle, History as HistoryIcon, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

export function BookmarkHealthStatus({ url, status, onToggleIgnore, mini = false }) {
    const { t } = useTranslation();

    if (status === 'checking') {
        return (
            <div className="flex justify-center" title={t('bookmarks.health.checking')}>
                <Loader2 className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-blue-500 animate-spin")} />
            </div>
        )
    }

    if (status === 'alive') {
        return (
            <div className="flex justify-center" title={t('bookmarks.health.alive')}>
                <CheckCircle2 className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-emerald-500")} />
            </div>
        )
    }

    if (status === 'dead') {
        return (
            <div className="flex items-center justify-center group relative w-full h-8">
                <div title={t('bookmarks.health.dead')}>
                    <XCircle className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-red-500")} />
                </div>
                {!mini && (
                    <div className="absolute left-[calc(50%+12px)] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md px-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://web.archive.org/web/*/${url}`, '_blank');
                            }}
                            title={t('bookmarks.health.archive')}
                        >
                            <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleIgnore(url);
                            }}
                            title={t('bookmarks.health.ignore')}
                        >
                            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    if (status === 'ignored') {
        return (
            <div className="flex items-center justify-center group relative w-full h-8">
                <div title={t('bookmarks.health.ignored')}>
                    <ShieldCheck className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-blue-500")} />
                </div>
                {!mini && (
                    <div className="absolute left-[calc(50%+12px)] flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md px-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleIgnore(url);
                            }}
                            title={t('bookmarks.health.unignore')}
                        >
                            <XCircle className="h-3.5 w-3.5 text-blue-500 hover:text-red-500" />
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex justify-center" title={t('bookmarks.status.unknown')}>
            <HelpCircle className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-muted-foreground/30")} />
        </div>
    )
}
