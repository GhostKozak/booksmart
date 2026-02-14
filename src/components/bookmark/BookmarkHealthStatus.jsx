import { Loader2, CheckCircle2, XCircle, History as HistoryIcon, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export function BookmarkHealthStatus({ url, status, onToggleIgnore, mini = false }) {
    if (status === 'checking') {
        return (
            <div className="flex justify-center" title="Checking...">
                <Loader2 className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-blue-500 animate-spin")} />
            </div>
        )
    }

    if (status === 'alive') {
        return (
            <div className="flex justify-center" title="Alive">
                <CheckCircle2 className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-emerald-500")} />
            </div>
        )
    }

    if (status === 'dead') {
        return (
            <div className="flex items-center gap-1 group">
                <div className="flex justify-center" title="Network Error (Likely Dead)">
                    <XCircle className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-red-500")} />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(mini ? "h-6 w-6 -mr-1" : "h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity")}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://web.archive.org/web/*/${url}`, '_blank');
                    }}
                    title="Search in Archive (Wayback Machine)"
                >
                    <HistoryIcon className={cn(mini ? "h-4 w-4" : "h-3 w-3", "text-muted-foreground hover:text-primary")} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(mini ? "h-6 w-6 -mr-1" : "h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity")}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleIgnore(url);
                    }}
                    title="Ignore Error (Whitelist)"
                >
                    <ShieldAlert className={cn(mini ? "h-4 w-4 text-red-500" : "h-3 w-3 text-muted-foreground hover:text-primary")} />
                </Button>
            </div>
        )
    }

    if (status === 'ignored') {
        return (
            <div className="flex items-center gap-1 group">
                <div className="flex justify-center" title="Ignored (Whitelisted)">
                    <ShieldCheck className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-blue-500")} />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(mini ? "h-6 w-6 -mr-1" : "h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity")}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleIgnore(url);
                    }}
                    title="Un-ignore"
                >
                    <XCircle className={cn(mini ? "h-4 w-4 text-blue-500" : "h-3 w-3 text-muted-foreground hover:text-red-500")} />
                </Button>
            </div>
        )
    }

    return (
        <div className="flex justify-center" title="Unknown">
            <HelpCircle className={cn(mini ? "h-4 w-4" : "h-4 w-4", "text-muted-foreground/30")} />
        </div>
    )
}
