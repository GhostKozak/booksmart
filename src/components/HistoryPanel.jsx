import React from 'react';
import { History, RotateCcw, RotateCw, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function HistoryPanel({ isOpen, onClose, past, future, onUndo, onRedo }) {
    if (!isOpen) return null;

    return (
        <div className="absolute top-16 right-4 w-80 bg-popover text-popover-foreground border rounded-lg shadow-xl z-50 flex flex-col max-h-[80vh] animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Version History
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                    <X className="h-3 w-3" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {/* Future (Redo) */}
                {future.length > 0 && (
                    <div className="space-y-1">
                        <h4 className="text-xs font-medium text-muted-foreground px-2 uppercase tracking-wider">Redo (Future)</h4>
                        {future.map((cmd, idx) => (
                            <div
                                key={`future-${idx}`}
                                className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/50 rounded-md opacity-60"
                            >
                                <div className="min-w-[4px] h-4 rounded-full bg-slate-300 dark:bg-slate-700" />
                                <span className="truncate">{cmd.description || 'Unknown Action'}</span>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-1 h-7 text-xs"
                            onClick={onRedo}
                        >
                            <RotateCw className="h-3 w-3 mr-1" /> Redo Next
                        </Button>
                    </div>
                )}

                {future.length > 0 && past.length > 0 && <div className="border-t my-2" />}

                {/* Past (Undo) */}
                <div className="space-y-1">
                    <h4 className="text-xs font-medium text-muted-foreground px-2 uppercase tracking-wider">History (Past)</h4>
                    {past.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-2 py-4 text-center italic">No history yet.</p>
                    ) : (
                        [...past].reverse().map((cmd, idx) => (
                            <div
                                key={`past-${idx}`}
                                className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                            >
                                <div className="min-w-[4px] h-4 rounded-full bg-primary" />
                                <span className="truncate font-medium">{cmd.description || 'Unknown Action'}</span>
                            </div>
                        ))
                    )}

                    {past.length > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full mt-2 h-8"
                            onClick={onUndo}
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Undo Last Action
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
