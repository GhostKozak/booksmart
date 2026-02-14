import { cn } from '../../lib/utils'

export function BookmarkFolderBadge({ folderName, availableFolders = [], isMatched = false, className }) {
    if (!folderName) return null

    const folderConfig = availableFolders?.find(f => f.name === folderName);
    const customColor = folderConfig?.color;

    const style = !isMatched && customColor ? {
        borderColor: customColor + '40',
        backgroundColor: customColor + '10',
        color: customColor
    } : {};

    return (
        <span
            className={cn(
                "inline-flex items-center px-1.5 py-1 rounded-md text-xs border truncate max-w-full",
                isMatched
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-medium"
                    : "bg-muted text-muted-foreground border-transparent",
                className
            )}
            style={style}
        >
            {folderName}
        </span>
    )
}
