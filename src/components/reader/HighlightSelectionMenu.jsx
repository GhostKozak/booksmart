import React, { useState } from 'react';
import { HIGHLIGHT_COLORS } from '../../lib/highlight-service';
import { MessageSquare, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export function HighlightSelectionMenu({ position, selectedText, onHighlight, onClose }) {
    const { t } = useTranslation();
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [note, setNote] = useState('');
    const [selectedColor, setSelectedColor] = useState('yellow');

    if (!position) return null;

    const handleApply = (colorId) => {
        onHighlight({
            text: selectedText,
            color: colorId || selectedColor,
            note: note.trim()
        });
        onClose();
    };

    return (
        <div
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translate(-50%, -100%) translateY(-10px)'
            }}
            className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="bg-popover text-popover-foreground border shadow-xl rounded-xl p-1.5 flex flex-col gap-1.5 backdrop-blur-md">
                {!showNoteInput ? (
                    <div className="flex items-center gap-1">
                        {HIGHLIGHT_COLORS.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => handleApply(c.id)}
                                className={cn(
                                    "w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-125 border border-black/10 dark:border-white/10 flex items-center justify-center shadow-xs"
                                )}
                                style={{ backgroundColor: c.hex }}
                                title={t(c.nameKey, c.name)}
                                aria-label={c.name}
                            />
                        ))}

                        <div className="w-px h-4 bg-border mx-0.5" />

                        <button
                            type="button"
                            onClick={() => setShowNoteInput(true)}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            title={t('reader.highlights.addNote', 'Not Ekle')}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium pr-1">{t('reader.highlights.note', 'Not')}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            title={t('common.cancel', 'İptal')}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5 w-60 p-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                                {t('reader.highlights.addNote', 'Kenar Notu Ekle')}
                            </span>
                            <div className="flex items-center gap-1">
                                {HIGHLIGHT_COLORS.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedColor(c.id)}
                                        className={cn(
                                            "w-4 h-4 rounded-full transition-transform cursor-pointer",
                                            selectedColor === c.id ? "scale-125 ring-2 ring-primary ring-offset-1" : "opacity-75 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('reader.highlights.notePlaceholder', 'Bu vurgu hakkında bir düşünce veya not yazın...')}
                            autoFocus
                            rows={2}
                            className="w-full text-xs p-1.5 rounded-md border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden resize-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    handleApply();
                                }
                            }}
                        />

                        <div className="flex items-center justify-end gap-1 pt-0.5">
                            <button
                                type="button"
                                onClick={() => setShowNoteInput(false)}
                                className="px-2 py-0.5 rounded text-[11px] hover:bg-muted text-muted-foreground cursor-pointer"
                            >
                                {t('common.cancel', 'İptal')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApply()}
                                className="px-2 py-0.5 rounded text-[11px] bg-primary text-primary-foreground font-medium flex items-center gap-1 cursor-pointer hover:bg-primary/90"
                            >
                                <Check className="w-3 h-3" />
                                <span>{t('common.save', 'Kaydet')}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Downward triangle indicator */}
            <div className="w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-border mx-auto -mt-px opacity-80" />
        </div>
    );
}
