import { ShieldCheck, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Label } from '../ui/label'
import packageJson from '../../../package.json'

export function AboutTab({
    bookmarkCount = 0,
    collectionCount = 0,
    foldersCount = 0,
    tagsCount = 0,
    snapshotCount = 0
}) {
    const { t } = useTranslation()

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Hero Card */}
            <div className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-lg shadow-sm">
                            B
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">BookSmart</h3>
                            <p className="text-xs text-muted-foreground">
                                {t('settings.about.desc', 'Privacy-first, local, and modern bookmark manager')}
                            </p>
                        </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        v{packageJson.version}
                    </span>
                </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t('settings.about.privacyTitle', '100% Local & Privacy-Focused')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('settings.about.privacyDesc', "All your bookmarks, folders, tags, and encrypted API keys are stored solely in this browser's IndexedDB. Your data is never sent to external servers or cloud.")}
                </p>
            </div>

            {/* Live Stats */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('settings.about.stats', 'Local Database Statistics')}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                        <div className="text-lg font-bold text-foreground">{bookmarkCount}</div>
                        <div className="text-[11px] text-muted-foreground">{t('settings.about.totalBookmarks', 'Bookmarks')}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                        <div className="text-lg font-bold text-foreground">{collectionCount}</div>
                        <div className="text-[11px] text-muted-foreground">{t('settings.about.totalCollections', 'Collections')}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                        <div className="text-lg font-bold text-foreground">{foldersCount}</div>
                        <div className="text-[11px] text-muted-foreground">{t('settings.about.totalFolders', 'Folders')}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                        <div className="text-lg font-bold text-foreground">{tagsCount}</div>
                        <div className="text-[11px] text-muted-foreground">{t('settings.about.totalTags', 'Tags')}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                        <div className="text-lg font-bold text-foreground">{snapshotCount}</div>
                        <div className="text-[11px] text-muted-foreground">{t('settings.about.totalSnapshots', 'Offline Snapshots')}</div>
                    </div>
                </div>
            </div>

            {/* External Links */}
            <div className="border-t border-border/50 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <a
                    href="https://github.com/GhostKozak/booksmart"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors cursor-pointer"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('settings.about.github', 'GitHub Repository')}</span>
                </a>
                <span>{t('settings.about.license', 'Open Source MIT License')}</span>
            </div>
        </div>
    )
}
