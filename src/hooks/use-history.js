import { useState, useCallback, useEffect } from 'react';

const MAX_HISTORY_LENGTH = 50;

export function useHistory(initialState) {
    const [history, setHistory] = useState({
        past: [],
        present: initialState,
        future: []
    });

    const { past, present, future } = history;

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    const undo = useCallback(() => {
        if (!canUndo) return;

        setHistory(curr => {
            const previous = curr.past[curr.past.length - 1];
            const newPast = curr.past.slice(0, curr.past.length - 1);

            return {
                past: newPast,
                present: previous,
                future: [curr.present, ...curr.future]
            };
        });
    }, [canUndo]);

    const redo = useCallback(() => {
        if (!canRedo) return;

        setHistory(curr => {
            const next = curr.future[0];
            const newFuture = curr.future.slice(1);

            return {
                past: [...curr.past, curr.present],
                present: next,
                future: newFuture
            };
        });
    }, [canRedo]);

    const set = useCallback((newPresent) => {
        setHistory(curr => {
            if (curr.present === newPresent) return curr;

            const newPast = [...curr.past, curr.present];
            if (newPast.length > MAX_HISTORY_LENGTH) {
                newPast.shift();
            }

            return {
                past: newPast,
                present: newPresent,
                future: []
            };
        });
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    redo();
                } else {
                    e.preventDefault();
                    undo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return {
        state: present,
        set,
        undo,
        redo,
        canUndo,
        canRedo,
        past,
        future
    };
}
