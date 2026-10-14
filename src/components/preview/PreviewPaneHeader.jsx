import React from 'react';
import { Button } from '../ui/button';
import {
    ExternalLink,
    X,
    RefreshCw,
    StickyNote,
    Wand2,
    Loader2,
    BookOpen,
    QrCode,
    Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

export function PreviewPaneHeader({
    bookmark,
    onClose,
    isNoteOpen,
    setIsNoteOpen,
    handleSummarize,
    isSummarizing,
    handleReload,
    isLoading
}) {
    const { t } = useTranslation();
    const { openReaderMode } = useAppStore();

    return (
        <div className="flex items-center justify-between p-3 border-b bg-card">
            <div className="flex-1 min-w-0 mr-4">
                <h3 className="font-semibold text-sm truncate" title={bookmark.title}>
                    {bookmark.title || t('common.untitled')}
                </h3>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        {bookmark.url} <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                    onClick={() => openReaderMode(bookmark)}
                    title={t('reader.openReaderMode', 'Temiz Okuma Modunda Aç')}
                >
                    <BookOpen className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer"
                    onClick={() => useAppStore.getState().openQrCode(bookmark)}
                    title={t('qr.title', 'QR Kod ile Telefona Aktar')}
                >
                    <QrCode className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 hover:bg-amber-500/10 cursor-pointer",
                        bookmark?.reminderAt ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => useAppStore.getState().openReminderModal(bookmark)}
                    title={t('reminders.setReminder', 'Daha Sonra Hatırlat')}
                >
                    <Bell className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-purple-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    title={t('preview.summarize') || 'Summarize Content'}
                >
                    {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
                <Button
                    variant={isNoteOpen ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsNoteOpen(!isNoteOpen)}
                    title={t('notes.toggle')}
                >
                    <StickyNote className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReload} title={t('preview.reload')}>
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title={t('preview.close')}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
