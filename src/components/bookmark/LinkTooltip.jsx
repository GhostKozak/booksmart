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
                "z-9999 fixed pointer-events-auto",
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
            <div className="bg-popover shadow-2xl backdrop-blur-sm border border-border/60 rounded-xl overflow-hidden"
                style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.3), 0 8px 20px -6px rgba(0,0,0,0.2)' }}
            >
                {/* Screenshot Preview */}
                <div className="relative bg-muted/30 border-b w-full aspect-video overflow-hidden">
                    <img
                        src={screenshotUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {/* Gradient overlay at bottom */}
                    <div className="bottom-0 absolute inset-x-0 bg-linear-to-t from-black/50 to-transparent h-12" />
                    {/* Domain badge */}
                    <div className="bottom-2 left-2 absolute flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full font-medium text-[10px] text-white">
                        <Globe className="w-3 h-3" />
                        {domain}
                    </div>
                </div>

                {/* Info Section */}
                <div className="space-y-2 p-3">
                    {/* Title */}
                    <div className="flex items-start gap-2">
                        <Favicon url={bookmark.url} className="mt-0.5 w-4 h-4 shrink-0" />
                        <h4 className="font-semibold text-foreground text-sm line-clamp-2 leading-snug">
                            {bookmark.title || t('common.untitled')}
                        </h4>
                    </div>

                    {/* URL */}
                    <p className="pl-6 text-[10px] text-muted-foreground truncate">
                        {bookmark.url}
                    </p>

                    {/* Note preview (if exists) */}
                    {bookmark.note && (
                        <div className="flex items-start gap-1.5 pl-6 text-[11px] text-muted-foreground/80">
                            <StickyNote className="mt-0.5 w-3 h-3 text-amber-500 shrink-0" />
                            <span className="italic line-clamp-2">
                                {bookmark.note}
                            </span>
                        </div>
                    )}

                    {/* Meta row: folder + date */}
                    <div className="flex justify-between items-center pt-1 border-border/40 border-t text-[10px] text-muted-foreground/70">
                        {bookmark.newFolder || bookmark.originalFolder ? (
                            <span className="flex items-center gap-1 max-w-[60%] truncate">
                                <Folder className="w-3 h-3 shrink-0" />
                                {bookmark.newFolder || bookmark.originalFolder}
                            </span>
                        ) : <span />}
                        {bookmark.addDate && (
                            <span className="flex items-center gap-1 shrink-0">
                                <Calendar className="w-3 h-3" />
                                {getRelativeTime(bookmark.addDate, t)}
                            </span>
                        )}
                    </div>

                    {/* Tags preview */}
                    {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-6 max-h-5 overflow-hidden">
                            {bookmark.tags.slice(0, 4).map(tag => (
                                <span key={tag} className="bg-purple-100/50 dark:bg-purple-900/20 px-1.5 py-0.5 border border-purple-200/50 dark:border-purple-800/30 rounded-full font-medium text-[9px] text-purple-700/80 dark:text-purple-400/80">
                                    #{tag}
                                </span>
                            ))}
                            {bookmark.tags.length > 4 && (
                                <span className="self-center text-[9px] text-muted-foreground">
                                    +{bookmark.tags.length - 4}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Action hint */}
                <div className="flex justify-between items-center bg-muted/30 hover:bg-muted/50 px-3 py-2 border-border/40 border-t text-[10px] text-muted-foreground/60 transition-colors cursor-pointer">
                    <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {t('preview.open')}
                    </span>
                    <span className="flex items-center gap-1 opacity-60">
                        <kbd className="bg-muted px-1 py-0.5 border rounded font-mono text-[8px]">Click</kbd>
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
