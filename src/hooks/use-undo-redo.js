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
        let commandToRun = null;
        setPast((currentPast) => {
            if (currentPast.length === 0) return currentPast;
            commandToRun = currentPast[currentPast.length - 1];
            return currentPast.slice(0, -1);
        });

        if (commandToRun) {
            try {
                await commandToRun.undo();
                setFuture((prev) => [commandToRun, ...prev]);
            } catch (error) {
                console.error("Undo failed:", error);
                // Restore the command back to past since undo failed
                setPast((prev) => [...prev, commandToRun]);
            }
        }
    }, []);

    const redo = useCallback(async () => {
        let commandToRun = null;
        setFuture((currentFuture) => {
            if (currentFuture.length === 0) return currentFuture;
            commandToRun = currentFuture[0];
            return currentFuture.slice(1);
        });

        if (commandToRun) {
            try {
                await commandToRun.redo();
                setPast((prev) => [...prev, commandToRun]);
            } catch (error) {
                console.error("Redo failed:", error);
                // Restore the command back to future since redo failed
                setFuture((prev) => [commandToRun, ...prev]);
            }
        }
    }, []);

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
