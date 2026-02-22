import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { SidebarTags } from './SidebarTags'
import { SidebarFolders } from './SidebarFolders'
import { SidebarCollections } from './SidebarCollections'
import { SmartFilters } from './SmartFilters'
import { RulesPanel } from './RulesPanel'
import packageJson from '../../../package.json'
import { useAppStore } from '../../store/useAppStore'

export function Sidebar({
    // Tags
    uniqueTags, availableTags, discoveredTags,
    // Folders
    availableFolders, uniqueFolders, discoveredFolders, bookmarks,
    // Smart Filters
    smartCounts, deadLinkCount,
    // Rules
    rules, startEditing, deleteRule, openNewRuleModal,
    // Taxonomy
    saveToTaxonomy,
    // Collections
    collections, onCreateCollection, onEditCollection, onDeleteCollection, onShareCollection
}) {
    const { isSidebarOpen, setIsSidebarOpen, collapsedSections } = useAppStore()

    return (
        <aside
            className={cn(
                "bg-card border-r flex flex-col transition-all duration-300 ease-in-out z-30 h-full overflow-y-auto",
                "lg:static lg:flex",
                "absolute inset-y-0 left-0 h-full shadow-2xl lg:shadow-none",
                isSidebarOpen ? "w-80 p-4 translate-x-0" : "w-0 p-0 -translate-x-full lg:w-0 lg:translate-x-0 lg:p-0 overflow-hidden"
            )}
        >
            <div className={cn("mb-4 flex flex-col transition-all duration-300", !collapsedSections.tags ? "flex-1 min-h-0" : "flex-shrink-0")}>
                <SidebarTags
                    uniqueTags={uniqueTags}
                    availableTags={availableTags}
                    discoveredTags={discoveredTags}
                    saveToTaxonomy={saveToTaxonomy}
                />
            </div>

            {/* Mobile Close Button */}
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden absolute top-4 right-4"
                onClick={() => setIsSidebarOpen(false)}
            >
                <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>

            <div className={cn("mb-4 flex flex-col transition-all duration-300", !collapsedSections.folders ? "flex-1 min-h-0" : "flex-shrink-0")}>
                <SidebarFolders
                    availableFolders={availableFolders}
                    uniqueFolders={uniqueFolders}
                    discoveredFolders={discoveredFolders}
                    bookmarks={bookmarks}
                    saveToTaxonomy={saveToTaxonomy}
                />
            </div>

            <div className={cn("mb-4 flex flex-col transition-all duration-300", !collapsedSections.collections ? "flex-1 min-h-0" : "flex-shrink-0")}>
                <SidebarCollections
                    collections={collections}
                    onCreateCollection={onCreateCollection}
                    onEditCollection={onEditCollection}
                    onDeleteCollection={onDeleteCollection}
                    onShareCollection={onShareCollection}
                />
            </div>

            <div className={cn("mb-4 flex flex-col transition-all duration-300", !collapsedSections.filters ? "flex-1 min-h-0" : "flex-shrink-0")}>
                <SmartFilters
                    smartCounts={smartCounts}
                    deadLinkCount={deadLinkCount}
                />
            </div>

            <div className={cn("mb-4 flex flex-col transition-all duration-300", !collapsedSections.rules ? "flex-1 min-h-0" : "flex-shrink-0")}>
                <RulesPanel
                    rules={rules}
                    startEditing={startEditing}
                    deleteRule={deleteRule}
                    openNewRuleModal={openNewRuleModal}
                />
            </div>

            <div className="mt-auto pt-6 pb-2 px-2 border-t border-border/50">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                    <a
                        href="https://github.com/GhostKozak/booksmart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                        title="View on GitHub"
                    >
                        BookSmart v{packageJson.version}
                    </a>
                    <span>© 2026</span>
                </div>
            </div>
        </aside>
    )
}
