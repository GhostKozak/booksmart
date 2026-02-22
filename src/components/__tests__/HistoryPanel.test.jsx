import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HistoryPanel } from '../HistoryPanel';

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

describe('HistoryPanel', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        past: [],
        future: [],
        onUndo: vi.fn(),
        onRedo: vi.fn()
    };

    it('returns null when closed', () => {
        const { container } = render(<HistoryPanel {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders empty state when no history', () => {
        render(<HistoryPanel {...defaultProps} />);
        expect(screen.getByText('history.noHistory')).toBeInTheDocument();
        expect(screen.queryByText('history.redoNext')).not.toBeInTheDocument();
    });

    it('displays past commands correctly', () => {
        const past = [
            { description: 'First action' },
            { description: 'Second action' }
        ];
        render(<HistoryPanel {...defaultProps} past={past} />);

        expect(screen.getByText('First action')).toBeInTheDocument();
        expect(screen.getByText('Second action')).toBeInTheDocument();
        expect(screen.getByText('history.undoLast')).toBeInTheDocument();
    });

    it('displays future commands correctly', () => {
        const future = [
            { description: 'Redoable action' }
        ];
        render(<HistoryPanel {...defaultProps} future={future} />);

        expect(screen.getByText('Redoable action')).toBeInTheDocument();
        expect(screen.getByText('history.redoNext')).toBeInTheDocument();
    });

    it('calls onUndo when undo button is clicked', () => {
        const past = [{ description: 'Action' }];
        render(<HistoryPanel {...defaultProps} past={past} />);

        fireEvent.click(screen.getByText('history.undoLast'));
        expect(defaultProps.onUndo).toHaveBeenCalled();
    });

    it('calls onRedo when redo button is clicked', () => {
        const future = [{ description: 'Action' }];
        render(<HistoryPanel {...defaultProps} future={future} />);

        fireEvent.click(screen.getByText('history.redoNext'));
        expect(defaultProps.onRedo).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', () => {
        render(<HistoryPanel {...defaultProps} />);
        // Find the close button (it's a ghost button with X icon)
        const closeBtn = screen.getByRole('button', { name: '' }); // Since it's icon only
        // Filter by its container or inner SVG class if needed, or better, add aria-label if it's missing.
        // Looking at code: Button has variant="ghost" size="icon"
        fireEvent.click(closeBtn);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});
