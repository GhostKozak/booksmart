import React from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { ArrowRight, Folder, Tag } from 'lucide-react';

export function SortConfirmationModal({ isOpen, onClose, onConfirm, updates = [] }) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    // Calculate summary statistics
    const totalUpdates = updates.length;
    const folderChanges = updates.filter(u => u.newFolder && u.newFolder !== u.originalFolder).length;
    const tagChanges = updates.reduce((acc, u) => acc + (u.ruleTags?.length || 0) + (u.tags?.length || 0) - (u.originalTags?.length || 0), 0);
    // Note: tag calculation is rough, better to just count bookmarks getting new tags if possible, 
    // or just say "x bookmarks updated". 
    // Let's stick to "Bookmarks to update", "Folder moves", "Tag additions".

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('modals.sortConf.title', 'Confirm Changes')}
            className="max-w-2xl"
        >
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    {t('modals.sortConf.summary', 'Please review the proposed changes before applying them.')}
                </p>

                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold">{totalUpdates}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('modals.sortConf.stats.bookmarks', 'Bookmarks')}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold">{folderChanges}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('modals.sortConf.stats.folders', 'Folder Moves')}</div>
                    </div>
                    {/* We can add more stats if needed */}
                </div>

                <div className="border rounded-md max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 sticky top-0">
                            <tr>
                                <th className="p-2 font-medium">{t('modals.sortConf.cols.title', 'Title')}</th>
                                <th className="p-2 font-medium">{t('modals.sortConf.cols.changes', 'Changes')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {updates.map((u) => (
                                <tr key={u.id} className="hover:bg-muted/20">
                                    <td className="p-2 max-w-[200px] truncate" title={u.title}>
                                        {u.title || u.url}
                                    </td>
                                    <td className="p-2 space-y-1">
                                        {u.newFolder &&
                                            u.newFolder !== u.originalFolder &&
                                            u.newFolder.toLowerCase() !== (u.originalFolder || '').toLowerCase() && (
                                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                    <Folder className="h-3 w-3" />
                                                    <span className="opacity-50 line-through text-xs text-muted-foreground">{u.originalFolder || 'Uncategorized'}</span>
                                                    <ArrowRight className="h-3 w-3" />
                                                    <span className="font-medium">{u.newFolder}</span>
                                                </div>
                                            )}
                                        {(u.ruleTags && u.ruleTags.length > 0) && (
                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 flex-wrap">
                                                <Tag className="h-3 w-3 shrink-0" />
                                                {u.ruleTags.map(tag => (
                                                    <span key={tag} className="bg-emerald-100 dark:bg-emerald-900/30 px-1 rounded text-xs">
                                                        +{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {/* If there are regular tags being added (less common in current logic but possible) */}
                                        {(u.tags && u.tags.length > (u.originalTags?.length || 0)) && (
                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 flex-wrap">
                                                <Tag className="h-3 w-3 shrink-0" />
                                                {/* Simple diff visualization might be complex, just showing all tags or new ones if we can calculate */}
                                                <span className="text-xs">Tags updated</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="ghost" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={onConfirm}>
                        {t('modals.sortConf.confirm', 'Apply Changes')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    );
}
