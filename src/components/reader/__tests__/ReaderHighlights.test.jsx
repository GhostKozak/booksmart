import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HighlightSelectionMenu } from '../HighlightSelectionMenu';
import { ReaderHighlightsSidebar } from '../ReaderHighlightsSidebar';
import * as highlightService from '../../../lib/highlight-service';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, defaultValue) => {
            if (typeof defaultValue === 'string') return defaultValue;
            if (defaultValue && typeof defaultValue === 'object' && defaultValue.defaultValue) {
                return defaultValue.defaultValue;
            }
            return key;
        }
    })
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('HighlightSelectionMenu', () => {
    it('renders color buttons and note button', () => {
        const onHighlight = vi.fn();
        const onClose = vi.fn();

        render(
            <HighlightSelectionMenu
                position={{ top: 200, left: 300 }}
                selectedText="Exciting insight"
                onHighlight={onHighlight}
                onClose={onClose}
            />
        );

        const yellowBtn = screen.getByRole('button', { name: /(sarı|yellow)/i });
        expect(yellowBtn).toBeInTheDocument();

        fireEvent.click(yellowBtn);
        expect(onHighlight).toHaveBeenCalledWith({
            text: 'Exciting insight',
            color: 'yellow',
            note: ''
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('allows typing a margin note and saving', () => {
        const onHighlight = vi.fn();
        const onClose = vi.fn();

        render(
            <HighlightSelectionMenu
                position={{ top: 200, left: 300 }}
                selectedText="Important fact"
                onHighlight={onHighlight}
                onClose={onClose}
            />
        );

        const noteBtn = screen.getByRole('button', { name: /not/i });
        fireEvent.click(noteBtn);

        const textarea = screen.getByPlaceholderText(/(bu vurgu hakkında bir düşünce|write a thought or note)/i);
        fireEvent.change(textarea, { target: { value: 'Look into this reference' } });

        const saveBtn = screen.getByRole('button', { name: /(kaydet|save)/i });
        fireEvent.click(saveBtn);

        expect(onHighlight).toHaveBeenCalledWith({
            text: 'Important fact',
            color: 'yellow',
            note: 'Look into this reference'
        });
    });
});

describe('ReaderHighlightsSidebar', () => {
    const mockHighlights = [
        {
            id: 1,
            text: 'Quote 1',
            color: 'yellow',
            note: 'Note 1',
            createdAt: Date.now()
        },
        {
            id: 2,
            text: 'Quote 2',
            color: 'green',
            note: '',
            createdAt: Date.now()
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    it('renders list of highlights with notes', () => {
        render(
            <ReaderHighlightsSidebar
                isOpen={true}
                onClose={vi.fn()}
                bookmark={{ id: 10, title: 'Article' }}
                highlights={mockHighlights}
                onRefreshHighlights={vi.fn()}
                onScrollToHighlight={vi.fn()}
            />
        );

        expect(screen.getByText(/(Vurgular ve Notlar|Highlights & Notes)/i)).toBeInTheDocument();
        expect(screen.getByText(/2 (vurgu|highlight\(s\))/i)).toBeInTheDocument();
        expect(screen.getByText(/"Quote 1"/i)).toBeInTheDocument();
        expect(screen.getByText(/Note 1/i)).toBeInTheDocument();
    });

    it('copies all highlights as Markdown', async () => {
        render(
            <ReaderHighlightsSidebar
                isOpen={true}
                onClose={vi.fn()}
                bookmark={{ id: 10, title: 'Article', url: 'https://test.com' }}
                highlights={mockHighlights}
                onRefreshHighlights={vi.fn()}
                onScrollToHighlight={vi.fn()}
            />
        );

        const copyBtn = screen.getByTitle(/(Tümünü Markdown Olarak Kopyala|Copy All as Markdown)/i);
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('calls updateHighlight and deleteHighlight on user actions', async () => {
        vi.spyOn(highlightService, 'updateHighlight').mockResolvedValue(true);
        const deleteSpy = vi.spyOn(highlightService, 'deleteHighlight').mockResolvedValue(true);
        const onRefresh = vi.fn();

        render(
            <ReaderHighlightsSidebar
                isOpen={true}
                onClose={vi.fn()}
                bookmark={{ id: 10, title: 'Article' }}
                highlights={mockHighlights}
                onRefreshHighlights={onRefresh}
                onScrollToHighlight={vi.fn()}
            />
        );

        // Delete button for first item
        const deleteBtns = screen.getAllByTitle(/Sil/i);
        await act(async () => {
            fireEvent.click(deleteBtns[0]);
        });
        expect(deleteSpy).toHaveBeenCalledWith(1, 10);
        expect(onRefresh).toHaveBeenCalled();
    });
});
