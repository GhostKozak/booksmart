import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRuleManager } from '../use-rule-manager';
import { db } from '../../db';

// Mock dependencies
vi.mock('../../db', () => ({
    db: {
        rules: {
            add: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        }
    }
}));

vi.mock('../../lib/utils', () => ({
    generateUUID: vi.fn(() => 'mock-uuid')
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('useRuleManager', () => {
    const defaultRules = [
        { id: 'rule-1', type: 'keyword', value: 'react', targetFolder: 'Frontend', tags: 'js' },
        { id: 'rule-2', type: 'domain', value: 'github.com', targetFolder: 'Code', tags: '' }
    ];

    let mockAddCommand;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddCommand = vi.fn();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useRuleManager({ rules: defaultRules, addCommand: mockAddCommand }));

        expect(result.current.newRule).toEqual({ type: 'keyword', value: '', targetFolder: '', tags: '' });
        expect(result.current.editingRuleId).toBeNull();
        expect(result.current.isRuleModalOpen).toBe(false);
    });

    it('should open new rule modal', () => {
        const { result } = renderHook(() => useRuleManager({ rules: defaultRules, addCommand: mockAddCommand }));

        act(() => {
            result.current.openNewRuleModal();
        });

        expect(result.current.isRuleModalOpen).toBe(true);
        expect(result.current.editingRuleId).toBeNull();
        expect(result.current.newRule).toEqual({ type: 'keyword', value: '', targetFolder: '', tags: '' });
    });

    it('should start editing an existing rule', () => {
        const { result } = renderHook(() => useRuleManager({ rules: defaultRules, addCommand: mockAddCommand }));

        act(() => {
            result.current.startEditing(defaultRules[0]);
        });

        expect(result.current.isRuleModalOpen).toBe(true);
        expect(result.current.editingRuleId).toBe('rule-1');
        expect(result.current.newRule).toEqual({
            type: 'keyword',
            value: 'react',
            targetFolder: 'Frontend',
            tags: 'js'
        });
    });

    it('should cancel editing', () => {
        const { result } = renderHook(() => useRuleManager({ rules: defaultRules, addCommand: mockAddCommand }));

        act(() => {
            result.current.startEditing(defaultRules[0]);
        });

        act(() => {
            result.current.cancelEditing();
        });

        expect(result.current.isRuleModalOpen).toBe(false);
        expect(result.current.editingRuleId).toBeNull();
        expect(result.current.newRule).toEqual({ type: 'keyword', value: '', targetFolder: '', tags: '' });
    });

    it('should add a new rule and dispatch command', async () => {
        const { result } = renderHook(() => useRuleManager({ rules: defaultRules, addCommand: mockAddCommand }));

        act(() => {
            result.current.setNewRule({
                type: 'keyword',
                value: 'test',
                targetFolder: 'Tests',
                tags: 'testing'
            });
        });

        await act(async () => {
            await result.current.addRule();
        });

        expect(db.rules.add).toHaveBeenCalledWith({
            id: 'mock-uuid',
            type: 'keyword',
            value: 'test',
            targetFolder: 'Tests',
            tags: 'testing'
        });
        expect(mockAddCommand).toHaveBeenCalled();
        expect(mockAddCommand.mock.calls[0][0].description).toBe('Add Rule');
        expect(result.current.isRuleModalOpen).toBe(false);
    });

    it('should update an existing rule and dispatch command', async () => {
        const { result } = renderHook(() => useRuleManager({ rules: defaultRules, addCommand: mockAddCommand }));

        act(() => {
            result.current.startEditing(defaultRules[0]);
        });

        act(() => {
            result.current.setNewRule({
                ...result.current.newRule,
                value: 'reactjs'
            });
        });

        await act(async () => {
            await result.current.addRule();
        });

        expect(db.rules.update).toHaveBeenCalledWith('rule-1', {
            type: 'keyword',
            value: 'reactjs',
            targetFolder: 'Frontend',
            tags: 'js'
        });
        expect(mockAddCommand).toHaveBeenCalled();
        expect(mockAddCommand.mock.calls[0][0].description).toBe('Update Rule');
        expect(result.current.editingRuleId).toBeNull();
        expect(result.current.isRuleModalOpen).toBe(false);
    });

    it('should delete a rule and dispatch command', async () => {
        const { result } = renderHook(() => useRuleManager({ rules: defaultRules, addCommand: mockAddCommand }));

        await act(async () => {
            await result.current.deleteRule('rule-1');
        });

        expect(db.rules.delete).toHaveBeenCalledWith('rule-1');
        expect(mockAddCommand).toHaveBeenCalled();
        expect(mockAddCommand.mock.calls[0][0].description).toBe('Delete Rule');
    });

    it('should not delete a rule if id is not found', async () => {
        const { result } = renderHook(() => useRuleManager({ rules: defaultRules, addCommand: mockAddCommand }));

        await act(async () => {
            await result.current.deleteRule('non-existent');
        });

        expect(db.rules.delete).not.toHaveBeenCalled();
        expect(mockAddCommand).not.toHaveBeenCalled();
    });
});
