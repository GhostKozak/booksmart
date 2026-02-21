
import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { ExternalLink, X, RefreshCw, AlertTriangle, StickyNote } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { db } from '../db';

export function PreviewPane({ bookmark, onClose, className }) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [noteValue, setNoteValue] = useState(bookmark?.note || '');
    const [isNoteOpen, setIsNoteOpen] = useState(!!(bookmark?.note));

    // Sync note state when bookmark changes
    React.useEffect(() => {
        setNoteValue(bookmark?.note || '');
        setIsNoteOpen(!!(bookmark?.note));
    }, [bookmark?.id, bookmark?.note]);

    const handleReload = () => {
        setIsLoading(true);
        setRefreshKey(prev => prev + 1);
    };

    const saveNote = useCallback(async (value) => {
        if (!bookmark?.id) return;
        setNoteValue(value);
        await db.bookmarks.update(bookmark.id, { note: value });
    }, [bookmark?.id]);

    if (!bookmark) return null;

    return (
        <div className={cn("flex flex-col h-full bg-background border-l shadow-xl", className)}>
            {/* Header */}
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

            {/* Note Area */}
            {isNoteOpen && (
                <div className="border-b bg-muted/30 p-3 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <StickyNote className="h-3 w-3" />
                            {t('notes.label')}
                        </label>
                        <span className="text-[10px] text-muted-foreground/60">
                            {t('notes.chromeWarning')}
                        </span>
                    </div>
                    <textarea
                        value={noteValue}
                        onChange={(e) => saveNote(e.target.value)}
                        placeholder={t('notes.placeholder')}
                        className="w-full bg-background/80 border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px] max-h-[120px]"
                        rows={2}
                    />
                </div>
            )}

            {/* Content */}
            <div className="flex-1 relative bg-muted/20 overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                        <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">{t('preview.loading')}</span>
                        </div>
                    </div>
                )}

                <iframe
                    key={`${bookmark.id}-${refreshKey}`}
                    src={bookmark.url}
                    className="w-full h-full border-0 bg-white"
                    title={`Preview of ${bookmark.title}`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />

                {/* Overlay for potential errors */}
                <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
                    <div className="bg-background/90 backdrop-blur border rounded-lg shadow-lg p-3 pointer-events-auto max-w-[200px] text-xs">
                        <p className="mb-2 text-muted-foreground">
                            {t('preview.error')}
                        </p>
                        <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => window.open(bookmark.url, '_blank')}>
                            <ExternalLink className="h-3 w-3" /> {t('preview.openExternal')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
