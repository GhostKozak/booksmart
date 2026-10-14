import React from 'react';
import { Button } from '../ui/button';
import { ExternalLink, RefreshCw, Sparkles, Copy, Check } from 'lucide-react';
import { isHttpUrl } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export function PreviewIframeView({
    bookmark,
    refreshKey,
    isLoading,
    setIsLoading,
    aiSummary,
    hasCopied,
    handleCopySummary
}) {
    const { t } = useTranslation();

    return (
        <div className="flex-1 relative bg-muted/20 overflow-hidden flex flex-col">
            {aiSummary && (
                <div className="px-3 py-1.5 bg-card/90 backdrop-blur border-b text-xs flex items-center justify-between gap-2 shadow-xs shrink-0 z-10">
                    <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium truncate">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                        <span className="truncate italic">“{aiSummary}”</span>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopySummary}
                        className="h-6 px-1.5 text-[11px] shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={t('preview.copySummary', 'Özeti Kopyala')}
                    >
                        {hasCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                </div>
            )}
            <div className="flex-1 relative overflow-hidden">
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
                    src={isHttpUrl(bookmark.url) ? bookmark.url : 'about:blank'}
                    className="w-full h-full border-0 bg-white"
                    title={`Preview of ${bookmark.title}`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                    }}
                    sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                    referrerPolicy="no-referrer"
                />

                {/* Overlay for potential errors */}
                <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
                    <div className="bg-background/90 backdrop-blur border rounded-lg shadow-lg p-3 pointer-events-auto max-w-[200px] text-xs">
                        <p className="mb-2 text-muted-foreground">
                            {t('preview.error')}
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-2 cursor-pointer"
                            onClick={() => {
                                if (isHttpUrl(bookmark.url)) {
                                    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
                                }
                            }}
                        >
                            <ExternalLink className="h-3 w-3" /> {t('preview.openExternal')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
