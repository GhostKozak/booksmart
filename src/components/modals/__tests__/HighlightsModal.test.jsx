import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HighlightsModal } from '../HighlightsModal';
import * as highlightService from '../../../lib/highlight-service';

vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: vi.fn(() => [
        {
            id: 1,
            url: 'https://react.dev/learn',
            pageTitle: 'Quick Start – React',
            text: 'React components are regular JavaScript functions',
            color: 'green',
            note: 'Important principle',
            createdAt: Date.now()
        },
        {
            id: 2,
            url: 'https://vite.dev',
            pageTitle: 'Vite | Next Generation Frontend Tooling',
            text: 'Lightning fast HMR',
            color: 'yellow',
            note: '',
            createdAt: Date.now() - 5000
        }
    ])
}));

vi.mock('../../../lib/highlight-service', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        syncExtensionHighlightsToDb: vi.fn().mockResolvedValue({ imported: 2, total: 2 }),
        deleteHighlight: vi.fn().mockResolvedValue(true),
        updateHighlight: vi.fn().mockResolvedValue(true),
        downloadMarkdownFile: vi.fn()
    };
});

describe('HighlightsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders highlights and group headers', () => {
        render(<HighlightsModal isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText('Quick Start – React')).toBeInTheDocument();
        expect(screen.getByText(/React components are regular JavaScript functions/i)).toBeInTheDocument();
        expect(screen.getByText('Vite | Next Generation Frontend Tooling')).toBeInTheDocument();
        expect(screen.getByText(/Lightning fast HMR/i)).toBeInTheDocument();
    });

    it('filters highlights by search query', () => {
        render(<HighlightsModal isOpen={true} onClose={vi.fn()} />);

        const searchInput = screen.getByPlaceholderText(/Vurgularda veya notlarda ara/i);
        fireEvent.change(searchInput, { target: { value: 'JavaScript' } });

        expect(screen.getByText(/React components/i)).toBeInTheDocument();
        expect(screen.queryByText(/Lightning fast HMR/i)).not.toBeInTheDocument();
    });

    it('filters highlights with notes when only notes button is clicked', () => {
        render(<HighlightsModal isOpen={true} onClose={vi.fn()} />);

        const onlyNotesBtn = screen.getByRole('button', { name: /(Notlular|With Notes)/i });
        fireEvent.click(onlyNotesBtn);

        expect(screen.getByText(/Important principle/i)).toBeInTheDocument();
        expect(screen.queryByText(/Lightning fast HMR/i)).not.toBeInTheDocument();
    });

    it('calls syncExtensionHighlightsToDb when sync button is clicked', async () => {
        render(<HighlightsModal isOpen={true} onClose={vi.fn()} />);

        const syncBtn = screen.getByRole('button', { name: /(Eklentiden Eşitle|Sync from Extension)/i });
        fireEvent.click(syncBtn);

        await waitFor(() => {
            expect(highlightService.syncExtensionHighlightsToDb).toHaveBeenCalled();
        });
    });

    it('calls export function when Obsidian .md download button is clicked', () => {
        render(<HighlightsModal isOpen={true} onClose={vi.fn()} />);

        const exportBtn = screen.getByRole('button', { name: /Obsidian \.md/i });
        fireEvent.click(exportBtn);

        expect(highlightService.downloadMarkdownFile).toHaveBeenCalled();
    });
});
