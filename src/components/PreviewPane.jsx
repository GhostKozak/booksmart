
import React, { useState } from 'react';
import { Button } from './ui/button';
import { ExternalLink, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export function PreviewPane({ bookmark, onClose, className }) {
    const [isLoading, setIsLoading] = useState(true);
    // const [hasError, setHasError] = useState(false);
    // Key to force re-render iframe on reload
    const [refreshKey, setRefreshKey] = useState(0);

    const handleReload = () => {
        setIsLoading(true);
        // setHasError(false);
        setRefreshKey(prev => prev + 1);
    };

    if (!bookmark) return null;

    return (
        <div className={cn("flex flex-col h-full bg-background border-l shadow-xl", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-card">
                <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-semibold text-sm truncate" title={bookmark.title}>
                        {bookmark.title || 'Untitled'}
                    </h3>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                            {bookmark.url} <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReload} title="Reload Preview">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Close Preview">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative bg-muted/20 overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                        <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Loading preview...</span>
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
                        // setHasError(true);
                    }}
                    // Sandbox permissions - strict but allow scripts for better compatibility
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />

                {/* Overlay for potential errors (though iframe onError is unreliable for X-Frame-Options, we provide a persistent backup) */}
                <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
                    <div className="bg-background/90 backdrop-blur border rounded-lg shadow-lg p-3 pointer-events-auto max-w-[200px] text-xs">
                        <p className="mb-2 text-muted-foreground">
                            Content not loading? Some sites block embedding.
                        </p>
                        <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => window.open(bookmark.url, '_blank')}>
                            <ExternalLink className="h-3 w-3" /> Open in New Tab
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
