import { cn } from '../../lib/utils'

export function BookmarkTags({ tags, ruleTags = [], availableTags = [], className }) {
    if (!tags || tags.length === 0) return null

    return (
        <div className={cn("flex gap-1 mt-1 flex-wrap", className)}>
            {tags.map(tag => {
                const isRuleTag = ruleTags?.includes(tag);
                const tagConfig = availableTags?.find(t => t.name === tag);
                const customColor = tagConfig ? tagConfig.color : null;

                // Dynamic style if custom color exists, else fallback to classes
                const style = customColor ? {
                    backgroundColor: customColor + '15', // 15% opacity (note: original had 15 in mobile, 10 in desktop comments but code used customColor + '15')
                    color: customColor,
                    borderColor: customColor + '40' // 25% opacity
                } : {};

                return (
                    <span key={tag}
                        style={style}
                        className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                            !customColor && (isRuleTag
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800")
                        )}>
                        #{tag}
                    </span>
                )
            })}
        </div>
    )
}
