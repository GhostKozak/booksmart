import React from 'react';
import { cn } from '../../lib/utils';

const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#64748b', // Slate
];

export function ColorPicker({ currentColor, onToggle, isOpen, onSelect }) {
    return (
        <div className="relative">
            <div
                className="w-4 h-4 rounded-full border cursor-pointer ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2"
                style={{ backgroundColor: currentColor }}
                onClick={onToggle}
            />
            {isOpen && (
                <>
                    {/* Backdrop to close picker */}
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={onToggle}
                    />
                    {/* Color Picker Popover */}
                    <div className="absolute left-0 top-full mt-2 bg-popover border rounded-md shadow-lg p-2 z-50 grid grid-cols-4 gap-1 w-32 animate-in fade-in zoom-in-95 duration-100">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                className={cn(
                                    "w-5 h-5 rounded-full border transition-transform hover:scale-110",
                                    currentColor === c && "ring-2 ring-primary ring-offset-1"
                                )}
                                style={{ backgroundColor: c }}
                                onClick={() => {
                                    onSelect(c);
                                    onToggle();
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
