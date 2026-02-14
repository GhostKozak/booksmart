import { useState, useCallback } from 'react';

export function useUndoRedo() {
    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    const addCommand = useCallback((command) => {
        // command: { undo: () => Promise<void>, redo: () => Promise<void>, description: string }
        setPast((prev) => [...prev, command]);
        setFuture([]); // Clear future on new action
    }, []);

    const undo = useCallback(async () => {
        if (!canUndo) return;

        const command = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        try {
            await command.undo();
            setPast(newPast);
            setFuture((prev) => [command, ...prev]);
        } catch (error) {
            console.error("Undo failed:", error);
            // Optionally keep the command in past if it failed? Or discard?
            // tailored for simple usage: if it fails, maybe we are out of sync.
        }
    }, [past, canUndo]);

    const redo = useCallback(async () => {
        if (!canRedo) return;

        const command = future[0];
        const newFuture = future.slice(1);

        try {
            await command.redo();
            setFuture(newFuture);
            setPast((prev) => [...prev, command]);
        } catch (error) {
            console.error("Redo failed:", error);
        }
    }, [future, canRedo]);

    const clear = useCallback(() => {
        setPast([]);
        setFuture([]);
    }, []);

    return {
        addCommand,
        undo,
        redo,
        canUndo,
        canRedo,
        clear,
        past,
        future
    };
}
