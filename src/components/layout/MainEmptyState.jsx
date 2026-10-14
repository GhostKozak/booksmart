import { Search, Folder, Hash, Filter, X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

export function MainEmptyState({
    hasAnyActiveFilter,
    searchQuery,
    setSearchQuery,
    activeFolder,
    setActiveFolder,
    activeTag,
    setActiveTag,
    smartFilter,
    setSmartFilter,
    clearAllFilters
}) {
    const { t } = useTranslation();

    return (
        <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-6 focus:outline-none overflow-x-hidden overflow-y-auto">
            <div className="slide-in-from-bottom-4 flex flex-col justify-center items-center p-8 h-full max-w-md mx-auto text-center animate-in duration-500 fade-in">
                <div className="bg-muted/70 ring-8 ring-muted/30 shadow-xs mb-6 p-6 rounded-2xl animate-float">
                    <Logo className="opacity-40 grayscale w-12 h-12" />
                </div>
                <h3 className="mb-2 font-bold text-xl tracking-tight text-foreground">{t('main.empty.title')}</h3>
                <p className="mb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {t('main.empty.desc')}
                </p>

                {/* Active Filter Chips in Empty State */}
                {hasAnyActiveFilter && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mb-5 max-w-sm">
                        {searchQuery && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border/80 text-foreground font-mono">
                                <Search className="w-3 h-3 text-muted-foreground" />
                                <span>&ldquo;{searchQuery}&rdquo;</span>
                                <button type="button" onClick={() => setSearchQuery('')} className="hover:text-red-500 ml-1 cursor-pointer">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {activeFolder && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border/80 text-foreground">
                                <Folder className="w-3 h-3 text-muted-foreground" />
                                <span>{activeFolder}</span>
                                <button type="button" onClick={() => setActiveFolder(null)} className="hover:text-red-500 ml-1 cursor-pointer">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {activeTag && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border/80 text-foreground">
                                <Hash className="w-3 h-3 text-muted-foreground" />
                                <span>{activeTag}</span>
                                <button type="button" onClick={() => setActiveTag(null)} className="hover:text-red-500 ml-1 cursor-pointer">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {smartFilter && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border/80 text-foreground">
                                <Filter className="w-3 h-3 text-muted-foreground" />
                                <span>{t(`sidebar.smartFilters.${smartFilter}`, smartFilter)}</span>
                                <button type="button" onClick={() => setSmartFilter(null)} className="hover:text-red-500 ml-1 cursor-pointer">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                    </div>
                )}

                <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="rounded-xl border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer font-medium text-xs sm:text-sm px-4 h-9"
                >
                    {t('main.empty.clearSearch')}
                </Button>
            </div>
        </main>
    );
}
