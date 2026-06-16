import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUndoRedo } from '../use-undo-redo';

describe('useUndoRedo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should start with empty past and future', () => {
        const { result } = renderHook(() => useUndoRedo());
        expect(result.current.past).toEqual([]);
        expect(result.current.future).toEqual([]);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should add a command to past', () => {
        const { result } = renderHook(() => useUndoRedo());
        const command = { undo: vi.fn(), redo: vi.fn(), description: 'test' };
        act(() => { result.current.addCommand(command); });
        expect(result.current.past).toHaveLength(1);
        expect(result.current.past[0]).toBe(command);
        expect(result.current.canUndo).toBe(true);
    });

    it('should undo a command', async () => {
        const { result } = renderHook(() => useUndoRedo());
        const undoFn = vi.fn();
        const redoFn = vi.fn();
        act(() => { result.current.addCommand({ undo: undoFn, redo: redoFn }); });
        await act(async () => { await result.current.undo(); });
        expect(undoFn).toHaveBeenCalledOnce();
        expect(result.current.past).toHaveLength(0);
        expect(result.current.future).toHaveLength(1);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);
    });

    it('should redo a command', async () => {
        const { result } = renderHook(() => useUndoRedo());
        const undoFn = vi.fn();
        const redoFn = vi.fn();
        act(() => { result.current.addCommand({ undo: undoFn, redo: redoFn }); });
        await act(async () => { await result.current.undo(); });
        await act(async () => { await result.current.redo(); });
        expect(redoFn).toHaveBeenCalledOnce();
        expect(result.current.past).toHaveLength(1);
        expect(result.current.future).toHaveLength(0);
    });

    it('should do nothing when undoing with empty past', async () => {
        const { result } = renderHook(() => useUndoRedo());
        await act(async () => { await result.current.undo(); });
        expect(result.current.past).toEqual([]);
        expect(result.current.future).toEqual([]);
    });

    it('should do nothing when redoing with empty future', async () => {
        const { result } = renderHook(() => useUndoRedo());
        await act(async () => { await result.current.redo(); });
        expect(result.current.past).toEqual([]);
        expect(result.current.future).toEqual([]);
    });

    it('should return the command to past on undo failure', async () => {
        const { result } = renderHook(() => useUndoRedo());
        const failingUndo = vi.fn().mockRejectedValue(new Error('fail'));
        act(() => { result.current.addCommand({ undo: failingUndo, redo: vi.fn() }); });
        await act(async () => { await result.current.undo(); });
        expect(failingUndo).toHaveBeenCalledOnce();
        expect(result.current.past).toHaveLength(1);
        expect(result.current.future).toHaveLength(0);
    });

    it('should return the command to future on redo failure', async () => {
        const { result } = renderHook(() => useUndoRedo());
        const failingRedo = vi.fn().mockRejectedValue(new Error('fail'));
        act(() => { result.current.addCommand({ undo: vi.fn(), redo: failingRedo }); });
        await act(async () => { await result.current.undo(); });
        await act(async () => { await result.current.redo(); });
        expect(failingRedo).toHaveBeenCalledOnce();
        expect(result.current.future).toHaveLength(1);
    });

    it('should clear future when a new command is added after undo', async () => {
        const { result } = renderHook(() => useUndoRedo());
        act(() => { result.current.addCommand({ undo: vi.fn(), redo: vi.fn() }); });
        act(() => { result.current.addCommand({ undo: vi.fn(), redo: vi.fn() }); });
        await act(async () => { await result.current.undo(); });
        expect(result.current.future).toHaveLength(1);
        act(() => { result.current.addCommand({ undo: vi.fn(), redo: vi.fn() }); });
        expect(result.current.future).toHaveLength(0);
    });

    it('should cap history at MAX_HISTORY (50)', () => {
        const { result } = renderHook(() => useUndoRedo());
        for (let i = 0; i < 60; i++) {
            act(() => { result.current.addCommand({ undo: vi.fn(), redo: vi.fn(), id: i }); });
        }
        expect(result.current.past).toHaveLength(50);
        expect(result.current.past[0].id).toBe(10);
        expect(result.current.past[49].id).toBe(59);
    });

    it('should clear all history', () => {
        const { result } = renderHook(() => useUndoRedo());
        act(() => { result.current.addCommand({ undo: vi.fn(), redo: vi.fn() }); });
        act(() => { result.current.addCommand({ undo: vi.fn(), redo: vi.fn() }); });
        act(() => { result.current.clear(); });
        expect(result.current.past).toEqual([]);
        expect(result.current.future).toEqual([]);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should allow full undo/redo cycle for multiple commands', async () => {
        const { result } = renderHook(() => useUndoRedo());
        const cmd1 = { undo: vi.fn(), redo: vi.fn() };
        const cmd2 = { undo: vi.fn(), redo: vi.fn() };
        act(() => { result.current.addCommand(cmd1); });
        act(() => { result.current.addCommand(cmd2); });
        await act(async () => { await result.current.undo(); });
        expect(cmd2.undo).toHaveBeenCalledOnce();
        expect(result.current.past).toHaveLength(1);
        expect(result.current.future).toHaveLength(1);
        await act(async () => { await result.current.undo(); });
        expect(cmd1.undo).toHaveBeenCalledOnce();
        expect(result.current.past).toHaveLength(0);
        expect(result.current.future).toHaveLength(2);
        await act(async () => { await result.current.redo(); });
        expect(cmd1.redo).toHaveBeenCalledOnce();
        expect(result.current.past).toHaveLength(1);
        expect(result.current.future).toHaveLength(1);
        await act(async () => { await result.current.redo(); });
        expect(cmd2.redo).toHaveBeenCalledOnce();
        expect(result.current.past).toHaveLength(2);
        expect(result.current.future).toHaveLength(0);
    });
});
