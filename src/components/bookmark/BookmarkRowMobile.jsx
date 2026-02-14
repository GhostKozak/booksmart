import { Checkbox } from '../ui/checkbox'
import { Favicon } from '../Favicon'
import { BookmarkStatusIcon } from './BookmarkStatusIcon'
import { BookmarkHealthStatus } from './BookmarkHealthStatus'
import { BookmarkTags } from './BookmarkTags'
import { BookmarkFolderBadge } from './BookmarkFolderBadge'
import { cn } from '../../lib/utils'
import { ArrowRight, XCircle, Layers, Check } from 'lucide-react'

export function BookmarkRowMobile({
    bookmark,
    isSelected,
    healthStatus,
    toggleSelection,
    toggleIgnoreUrl,
    availableFolders,
    availableTags
}) {
    return (
        <div className="lg:hidden flex flex-col gap-2">
            {/* Row 1: Checkbox, Icon, Title */}
            <div className="flex items-start gap-3">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(bookmark.id)}
                    className="mt-1 bg-card shrink-0 z-20"
                />

                <Favicon url={bookmark.url} className="w-5 h-5 mt-0.5 shrink-0" />

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <span className={cn(
                            "font-medium text-sm break-words leading-snug",
                            bookmark.status === 'matched' && "text-emerald-700 dark:text-emerald-300",
                            healthStatus === 'dead' && "text-red-600 dark:text-red-400 decoration-red-500/30 line-through decoration-2"
                        )}>{bookmark.title}</span>

                        {/* Status Icons Mini */}
                        <div className="flex items-center gap-1 shrink-0">
                            {bookmark.isDuplicate && <XCircle className="h-4 w-4 text-red-500" />}
                            {bookmark.hasDuplicate && <Layers className="h-4 w-4 text-yellow-500" />}
                            {bookmark.status === 'matched' && <Check className="h-4 w-4 text-emerald-500" />}

                            <BookmarkHealthStatus
                                url={bookmark.url}
                                status={healthStatus}
                                onToggleIgnore={toggleIgnoreUrl}
                                mini={true}
                            />
                        </div>
                    </div>

                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground block truncate mt-0.5 hover:underline">
                        {bookmark.url}
                    </a>
                </div>
            </div>

            {/* Row 2: Metadata Badges */}
            <div className="flex flex-col gap-1 pl-8 text-xs">
                {/* Folder Path */}
                <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
                    {bookmark.originalFolder !== bookmark.newFolder ? (
                        <>
                            <BookmarkFolderBadge
                                folderName={bookmark.originalFolder}
                                availableFolders={availableFolders}
                                className="whitespace-normal text-left"
                            />
                            <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                            <BookmarkFolderBadge
                                folderName={bookmark.newFolder}
                                availableFolders={availableFolders}
                                isMatched={true}
                                className="whitespace-normal text-left"
                            />
                        </>
                    ) : (
                        <BookmarkFolderBadge
                            folderName={bookmark.originalFolder}
                            availableFolders={availableFolders}
                            className="bg-muted/50 whitespace-normal text-left"
                        />
                    )}
                </div>

                {/* Tags */}
                <BookmarkTags
                    tags={bookmark.tags}
                    ruleTags={bookmark.ruleTags}
                    availableTags={availableTags}
                />
            </div>
        </div>
    )
}
