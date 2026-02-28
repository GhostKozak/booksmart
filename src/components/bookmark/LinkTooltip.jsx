import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Favicon } from '../Favicon';
import { ExternalLink, Globe, Folder, Calendar, StickyNote } from 'lucide-react';
import { cn, getRelativeTime } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

/**
 * A rich hover tooltip for bookmark links.
 * Shows: screenshot thumbnail, title, URL, domain, folder, date, note preview.
 * Uses React Portal to render outside Virtuoso scroll container.
 */
export function LinkTooltip({ bookmark, children, className }) {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [side, setSide] = useState('bottom'); // 'bottom' or 'top'
    const timeoutRef = useRef(null);
    const triggerRef = useRef(null);
    const TOOLTIP_WIDTH = 320;
    const TOOLTIP_HEIGHT = 280;
    const DELAY_SHOW = 400;
    const DELAY_HIDE = 200;

    const domain = (() => {
        try {
            return new URL(bookmark.url).hostname.replace('www.', '');
        } catch {
            return bookmark.url;
        }
    })();

    const handleMouseEnter = useCallback((e) => {
        clearTimeout(timeoutRef.current);
        // Capture the bounding rect immediately (before setTimeout)
        const rect = e.currentTarget.getBoundingClientRect();
        timeoutRef.current = setTimeout(() => {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Decide if tooltip goes above or below
            const spaceBelow = viewportHeight - rect.bottom;
            const tooltipSide = spaceBelow < TOOLTIP_HEIGHT + 16 ? 'top' : 'bottom';
            setSide(tooltipSide);

            let x = rect.left;
            // Clamp to stay within viewport
            if (x + TOOLTIP_WIDTH > viewportWidth - 16) {
                x = viewportWidth - TOOLTIP_WIDTH - 16;
            }
            if (x < 16) x = 16;

            const y = tooltipSide === 'bottom'
                ? rect.bottom + 8
                : rect.top - 8;

            setPosition({ x, y });
            setIsVisible(true);
        }, DELAY_SHOW);
    }, []);

    const handleMouseLeave = useCallback(() => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, DELAY_HIDE);
    }, []);

    const handleTooltipMouseEnter = useCallback(() => {
        clearTimeout(timeoutRef.current);
    }, []);

    const handleTooltipMouseLeave = useCallback(() => {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, DELAY_HIDE);
    }, []);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    const screenshotUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(bookmark.url)}?w=640&h=360`;

    const tooltip = isVisible ? createPortal(
        <div
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            className={cn(
                "fixed z-[9999] pointer-events-auto",
                "animate-in fade-in zoom-in-95 duration-200",
                side === 'top' && "slide-in-from-bottom-2",
                side === 'bottom' && "slide-in-from-top-2"
            )}
            style={{
                left: position.x,
                ...(side === 'bottom'
                    ? { top: position.y }
                    : { bottom: window.innerHeight - position.y }),
                width: TOOLTIP_WIDTH,
            }}
            data-tooltip="link-preview"
        >
            <div className="bg-popover border border-border/60 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm"
                style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.3), 0 8px 20px -6px rgba(0,0,0,0.2)' }}
            >
                {/* Screenshot Preview */}
                <div className="relative aspect-video w-full bg-muted/30 overflow-hidden border-b">
                    <img
                        src={screenshotUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {/* Gradient overlay at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
                    {/* Domain badge */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-full">
                        <Globe className="h-3 w-3" />
                        {domain}
                    </div>
                </div>

                {/* Info Section */}
                <div className="p-3 space-y-2">
                    {/* Title */}
                    <div className="flex items-start gap-2">
                        <Favicon url={bookmark.url} className="w-4 h-4 shrink-0 mt-0.5" />
                        <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
                            {bookmark.title || t('common.untitled')}
                        </h4>
                    </div>

                    {/* URL */}
                    <p className="text-[10px] text-muted-foreground truncate pl-6">
                        {bookmark.url}
                    </p>

                    {/* Note preview (if exists) */}
                    {bookmark.note && (
                        <div className="flex items-start gap-1.5 pl-6 text-[11px] text-muted-foreground/80">
                            <StickyNote className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                            <span className="line-clamp-2 italic">
                                {bookmark.note}
                            </span>
                        </div>
                    )}

                    {/* Meta row: folder + date */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground/70">
                        {bookmark.newFolder || bookmark.originalFolder ? (
                            <span className="flex items-center gap-1 truncate max-w-[60%]">
                                <Folder className="h-3 w-3 shrink-0" />
                                {bookmark.newFolder || bookmark.originalFolder}
                            </span>
                        ) : <span />}
                        {bookmark.addDate && (
                            <span className="flex items-center gap-1 shrink-0">
                                <Calendar className="h-3 w-3" />
                                {getRelativeTime(bookmark.addDate, t)}
                            </span>
                        )}
                    </div>

                    {/* Tags preview */}
                    {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap overflow-hidden max-h-5 pl-6">
                            {bookmark.tags.slice(0, 4).map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-100/50 text-purple-700/80 border border-purple-200/50 dark:bg-purple-900/20 dark:text-purple-400/80 dark:border-purple-800/30">
                                    #{tag}
                                </span>
                            ))}
                            {bookmark.tags.length > 4 && (
                                <span className="text-[9px] text-muted-foreground self-center">
                                    +{bookmark.tags.length - 4}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Action hint */}
                <div className="px-3 py-2 bg-muted/30 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground/60 cursor-pointer hover:bg-muted/50 transition-colors">
                    <span className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {t('preview.open')}
                    </span>
                    <span className="flex items-center gap-1 opacity-60">
                        <kbd className="px-1 py-0.5 rounded bg-muted border text-[8px] font-mono">Click</kbd>
                    </span>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <>
            <span
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn("inline-block", className)}
            >
                {children}
            </span>
            {tooltip}
        </>
    );
}
