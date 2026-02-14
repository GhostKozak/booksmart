import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { SidebarTags } from './SidebarTags'
import { SidebarFolders } from './SidebarFolders'
import { SmartFilters } from './SmartFilters'
import { RulesPanel } from './RulesPanel'

export function Sidebar({
    isSidebarOpen, setIsSidebarOpen,
    // Accordion
    collapsedSections, toggleSection,
    // Tags
    uniqueTags, availableTags, discoveredTags, activeTag, setActiveTag,
    // Folders
    availableFolders, uniqueFolders, discoveredFolders, bookmarks, activeFolder, setActiveFolder,
    // Smart Filters
    smartFilter, setSmartFilter, smartCounts, deadLinkCount,
    // Rules
    rules, startEditing, deleteRule, openNewRuleModal,
    // Taxonomy
    saveToTaxonomy
}) {
    return (
        <aside
            className={cn(
                "bg-card border-r flex flex-col transition-all duration-300 ease-in-out z-30 h-full overflow-y-auto",
                "lg:static lg:flex",
                "absolute inset-y-0 left-0 h-full shadow-2xl lg:shadow-none",
                isSidebarOpen ? "w-80 p-4 translate-x-0" : "w-0 p-0 -translate-x-full lg:w-0 lg:translate-x-0 lg:p-0 overflow-hidden"
            )}
        >
            <SidebarTags
                uniqueTags={uniqueTags}
                availableTags={availableTags}
                discoveredTags={discoveredTags}
                activeTag={activeTag}
                setActiveTag={setActiveTag}
                saveToTaxonomy={saveToTaxonomy}
                collapsed={collapsedSections.tags}
                onToggle={() => toggleSection('tags')}
            />

            {/* Mobile Close Button - rendered inside the first section header in original, 
           but we put it as a standalone button here */}
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden absolute top-4 right-4"
                onClick={() => setIsSidebarOpen(false)}
            >
                <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>

            <SidebarFolders
                availableFolders={availableFolders}
                uniqueFolders={uniqueFolders}
                discoveredFolders={discoveredFolders}
                bookmarks={bookmarks}
                activeFolder={activeFolder}
                setActiveFolder={setActiveFolder}
                saveToTaxonomy={saveToTaxonomy}
                collapsed={collapsedSections.folders}
                onToggle={() => toggleSection('folders')}
            />

            <SmartFilters
                smartFilter={smartFilter}
                setSmartFilter={setSmartFilter}
                smartCounts={smartCounts}
                deadLinkCount={deadLinkCount}
                collapsed={collapsedSections.filters}
                onToggle={() => toggleSection('filters')}
            />

            <RulesPanel
                rules={rules}
                startEditing={startEditing}
                deleteRule={deleteRule}
                openNewRuleModal={openNewRuleModal}
                collapsed={collapsedSections.rules}
                onToggle={() => toggleSection('rules')}
            />
        </aside>
    )
}
