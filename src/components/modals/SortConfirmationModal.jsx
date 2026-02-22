import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { ArrowRight, Folder, Tag, Type, AlertTriangle, X } from 'lucide-react';

export function SortConfirmationModal({ isOpen, onClose, onConfirm, updates = [] }) {
    const { t } = useTranslation();

    const [editableUpdates, setEditableUpdates] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setEditableUpdates(JSON.parse(JSON.stringify(updates)));
        } else {
            setEditableUpdates([]);
        }
    }, [isOpen, updates]);

    if (!isOpen) return null;

    // Calculate summary statistics
    const totalUpdates = editableUpdates.filter(u => {
        const hasFolderChange = u.newFolder && u.newFolder !== u.originalFolder;
        const hasTitleChange = u.originalTitle && u.title !== u.originalTitle;
        const hasRuleTags = u.ruleTags && u.ruleTags.length > 0;
        const hasNewTags = u.tags && u.tags.length > (u.originalTags?.length || 0) && u.tags.some(t => !(u.originalTags || []).includes(t));
        const hasDuplicate = u.isDuplicate || u.hasDuplicate;
        return hasFolderChange || hasTitleChange || hasRuleTags || hasNewTags || hasDuplicate;
    }).length;

    const folderChanges = editableUpdates.filter(u => u.newFolder && u.newFolder !== u.originalFolder).length;
    const titleChanges = editableUpdates.filter(u => u.originalTitle && u.title !== u.originalTitle).length;
    const duplicateChanges = editableUpdates.filter(u => u.hasDuplicate || u.isDuplicate).length;

    const handleRemoveUpdate = (id) => setEditableUpdates(prev => prev.filter(u => u.id !== id));
    const handleRevertFolder = (id) => setEditableUpdates(prev => prev.map(u => u.id === id ? { ...u, newFolder: u.originalFolder } : u));
    const handleRevertTitle = (id) => setEditableUpdates(prev => prev.map(u => u.id === id ? { ...u, title: u.originalTitle } : u));
    const handleRemoveRuleTag = (id, tagToRemove) => setEditableUpdates(prev => prev.map(u => u.id === id ? { ...u, ruleTags: u.ruleTags.filter(t => t !== tagToRemove) } : u));
    const handleRemoveTag = (id, tagToRemove) => setEditableUpdates(prev => prev.map(u => u.id === id ? { ...u, tags: u.tags.filter(t => t !== tagToRemove) } : u));
    const handleRevertDuplicate = (id) => setEditableUpdates(prev => prev.map(u => u.id === id ? { ...u, isDuplicate: false, hasDuplicate: false } : u));

    const handleConfirm = () => {
        const finalUpdates = editableUpdates.filter(u => {
            const hasFolderChange = u.newFolder !== u.originalFolder;
            const hasTitleChange = u.originalTitle && u.title !== u.originalTitle;
            const hasRuleTags = u.ruleTags && u.ruleTags.length > 0;
            const hasNewTags = u.tags && u.tags.length > (u.originalTags?.length || 0) && u.tags.some(t => !(u.originalTags || []).includes(t));
            const hasDuplicateChange = u.hasDuplicate || u.isDuplicate;
            return hasFolderChange || hasTitleChange || hasRuleTags || hasNewTags || hasDuplicateChange;
        });
        onConfirm(finalUpdates);
    };


    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('modals.sortConf.title')}
            className="max-w-2xl"
        >
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    {t('modals.sortConf.summary')}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                    <div className="bg-muted/50 p-3 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold">{totalUpdates}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">{t('modals.sortConf.stats.bookmarks')}</div>
                    </div>
                    {folderChanges > 0 && (
                        <div className="bg-muted/50 p-3 rounded-lg flex flex-col items-center justify-center">
                            <div className="text-2xl font-bold">{folderChanges}</div>
                            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">{t('modals.sortConf.stats.folders')}</div>
                        </div>
                    )}
                    {titleChanges > 0 && (
                        <div className="bg-muted/50 p-3 rounded-lg flex flex-col items-center justify-center">
                            <div className="text-2xl font-bold">{titleChanges}</div>
                            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Title Fixes</div>
                        </div>
                    )}
                    {duplicateChanges > 0 && (
                        <div className="bg-muted/50 p-3 rounded-lg flex flex-col items-center justify-center">
                            <div className="text-2xl font-bold">{duplicateChanges}</div>
                            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Duplicates</div>
                        </div>
                    )}
                </div>

                <div className="border rounded-md max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 sticky top-0">
                            <tr>
                                <th className="p-2 font-medium">{t('modals.sortConf.cols.title')}</th>
                                <th className="p-2 font-medium">{t('modals.sortConf.cols.changes')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {editableUpdates.map((u) => {
                                const hasFolderChange = u.newFolder && u.newFolder !== u.originalFolder && u.newFolder.toLowerCase() !== (u.originalFolder || '').toLowerCase();
                                const hasTitleChange = u.originalTitle && u.title !== u.originalTitle;
                                const hasRuleTags = u.ruleTags && u.ruleTags.length > 0;
                                const newTags = (u.tags || []).filter(t => !(u.originalTags || []).includes(t));
                                const hasNewTags = newTags.length > 0;
                                const hasDuplicate = u.isDuplicate || u.hasDuplicate;

                                if (!hasFolderChange && !hasTitleChange && !hasRuleTags && !hasNewTags && !hasDuplicate) {
                                    return null;
                                }

                                return (
                                    <tr key={u.id} className="hover:bg-muted/20">
                                        <td className="p-2 max-w-[200px] truncate" title={u.originalTitle || u.title}>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRemoveUpdate(u.id)}
                                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                                    title={t('common.cancel')}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                                <span className="truncate">{u.originalTitle || u.title || u.url}</span>
                                            </div>
                                        </td>
                                        <td className="p-2 space-y-1">
                                            {hasTitleChange && (
                                                <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 group/item">
                                                    <Type className="h-3 w-3 shrink-0" />
                                                    <span className="font-medium truncate max-w-[200px]" title={u.title}>{u.title}</span>
                                                    <button onClick={() => handleRevertTitle(u.id)} className="opacity-0 group-hover/item:opacity-100 hover:text-destructive ml-1 shrink-0"><X className="h-3 w-3" /></button>
                                                </div>
                                            )}
                                            {hasFolderChange && (
                                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 group/item">
                                                    <Folder className="h-3 w-3 shrink-0" />
                                                    <span className="opacity-50 line-through text-xs text-muted-foreground truncate max-w-[80px]" title={u.originalFolder}>{u.originalFolder || t('common.uncategorized')}</span>
                                                    <ArrowRight className="h-3 w-3 shrink-0" />
                                                    <span className="font-medium truncate max-w-[80px]" title={u.newFolder}>{u.newFolder}</span>
                                                    <button onClick={() => handleRevertFolder(u.id)} className="opacity-0 group-hover/item:opacity-100 hover:text-destructive ml-1 shrink-0"><X className="h-3 w-3" /></button>
                                                </div>
                                            )}
                                            {hasRuleTags && (
                                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 flex-wrap">
                                                    <Tag className="h-3 w-3 shrink-0" />
                                                    {u.ruleTags.map(tag => (
                                                        <span key={tag} className="bg-emerald-100 dark:bg-emerald-900/30 px-1 rounded text-xs flex items-center gap-1 group/tag">
                                                            +{tag}
                                                            <button onClick={() => handleRemoveRuleTag(u.id, tag)} className="opacity-0 group-hover/tag:opacity-100 hover:text-destructive shrink-0"><X className="h-2 w-2" /></button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {hasNewTags && (
                                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 flex-wrap">
                                                    <Tag className="h-3 w-3 shrink-0" />
                                                    {newTags.map(tag => (
                                                        <span key={tag} className="bg-emerald-100 dark:bg-emerald-900/30 px-1 rounded text-xs flex items-center gap-1 group/tag">
                                                            {tag === 'ai-dupe' ? <AlertTriangle className="h-3 w-3 shrink-0" /> : null}
                                                            +{tag}
                                                            <button onClick={() => handleRemoveTag(u.id, tag)} className="opacity-0 group-hover/tag:opacity-100 hover:text-destructive shrink-0"><X className="h-2 w-2" /></button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {hasDuplicate && (
                                                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mt-1 group/item">
                                                    <span className="text-xs">Marked as duplicate</span>
                                                    <button onClick={() => handleRevertDuplicate(u.id)} className="opacity-0 group-hover/item:opacity-100 hover:text-destructive ml-1 shrink-0"><X className="h-3 w-3" /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="ghost" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleConfirm}>
                        {t('modals.sortConf.confirm')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    );
}
