const MAX_HISTORY = 50;

export function useUndoRedo() {
    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    const addCommand = useCallback((command) => {
        setPast((prev) => {
            const next = [...prev, command];
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });
        setFuture([]); // Clear future on new action
    }, []);

    const undo = useCallback(async () => {
        const commandToRun = past[past.length - 1];
        if (!commandToRun) return;
        setPast((prev) => prev.slice(0, -1));
        try {
            await commandToRun.undo();
            setFuture((prev) => [commandToRun, ...prev]);
        } catch (error) {
            console.error("Undo failed:", error);
            setPast((prev) => [...prev, commandToRun]);
        }
    }, [past]);

    const redo = useCallback(async () => {
        const commandToRun = future[0];
        if (!commandToRun) return;
        setFuture((prev) => prev.slice(1));
        try {
            await commandToRun.redo();
            setPast((prev) => [...prev, commandToRun]);
        } catch (error) {
            console.error("Redo failed:", error);
            setFuture((prev) => [commandToRun, ...prev]);
        }
    }, [future]);

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
