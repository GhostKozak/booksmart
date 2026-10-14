import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditBookmarkModal } from '../EditBookmarkModal';
import * as metadataFetcher from '../../lib/metadata-fetcher';

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
        error: vi.fn(),
        info: vi.fn()
    }
}));

describe('EditBookmarkModal', () => {
    const mockBookmark = {
        id: 77,
        title: 'Vite Next Generation Frontend Tooling',
        url: 'https://vitejs.dev',
        originalFolder: 'Development',
        newFolder: 'Frontend',
        tags: ['tooling', 'vite', 'frontend'],
        note: 'Fast dev server with native ESM support.'
    };

    const mockFolders = [
        { id: '1', name: 'Development' },
        { id: '2', name: 'Frontend' },
        { id: '3', name: 'Design' }
    ];

    const mockTags = [
        { id: '1', name: 'tooling' },
        { id: '2', name: 'vite' },
        { id: '3', name: 'react' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('automatically populates all form inputs with bookmark data upon opening', () => {
        render(
            <EditBookmarkModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={vi.fn()}
                onSave={vi.fn()}
                availableFolders={mockFolders}
                availableTags={mockTags}
            />
        );

        const titleInput = screen.getByDisplayValue('Vite Next Generation Frontend Tooling');
        const urlInput = screen.getByDisplayValue('https://vitejs.dev');
        const noteInput = screen.getByDisplayValue('Fast dev server with native ESM support.');

        expect(titleInput).toBeInTheDocument();
        expect(urlInput).toBeInTheDocument();
        expect(noteInput).toBeInTheDocument();

        // Check folder combobox input
        expect(screen.getByDisplayValue('Frontend')).toBeInTheDocument();

        // Check tags badges
        expect(screen.getByText('tooling')).toBeInTheDocument();
        expect(screen.getByText('vite')).toBeInTheDocument();
        expect(screen.getByText('frontend')).toBeInTheDocument();
    });

    it('correctly handles comma-separated string tags', () => {
        const bookmarkWithStringTags = {
            ...mockBookmark,
            tags: 'javascript, react, performance'
        };

        render(
            <EditBookmarkModal
                isOpen={true}
                bookmark={bookmarkWithStringTags}
                onClose={vi.fn()}
                onSave={vi.fn()}
                availableFolders={mockFolders}
                availableTags={mockTags}
            />
        );

        expect(screen.getByText('javascript')).toBeInTheDocument();
        expect(screen.getByText('react')).toBeInTheDocument();
        expect(screen.getByText('performance')).toBeInTheDocument();
    });

    it('allows updating title and saving changes', async () => {
        const onSaveMock = vi.fn().mockResolvedValue(true);
        const onCloseMock = vi.fn();

        render(
            <EditBookmarkModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={onCloseMock}
                onSave={onSaveMock}
                availableFolders={mockFolders}
                availableTags={mockTags}
            />
        );

        const titleInput = screen.getByDisplayValue('Vite Next Generation Frontend Tooling');
        fireEvent.change(titleInput, { target: { value: 'Updated Vite Title' } });

        const saveButton = screen.getByRole('button', { name: 'common.save' });
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(onSaveMock).toHaveBeenCalledWith({
            id: 77,
            title: 'Updated Vite Title',
            url: 'https://vitejs.dev',
            note: 'Fast dev server with native ESM support.',
            folder: 'Frontend',
            tags: ['tooling', 'vite', 'frontend']
        });
        expect(onCloseMock).toHaveBeenCalled();
    });

    it('auto-fetches metadata from URL and populates title and description', async () => {
        const fetchSpy = vi.spyOn(metadataFetcher, 'fetchMetadataForUrl').mockResolvedValue({
            title: 'Auto-fetched Title from Page',
            description: 'Auto-fetched Description from OG tags.'
        });

        const bookmarkWithoutNote = {
            ...mockBookmark,
            note: ''
        };

        render(
            <EditBookmarkModal
                isOpen={true}
                bookmark={bookmarkWithoutNote}
                onClose={vi.fn()}
                onSave={vi.fn()}
                availableFolders={mockFolders}
                availableTags={mockTags}
            />
        );

        const fetchBtn = screen.getByTitle('Sayfadan başlık ve açıklamayı otomatik çek');
        await act(async () => {
            fireEvent.click(fetchBtn);
        });

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith('https://vitejs.dev', { forceRefresh: true });
            expect(screen.getByDisplayValue('Auto-fetched Title from Page')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Auto-fetched Description from OG tags.')).toBeInTheDocument();
        });
    });

    it('syncs input values when a different bookmark is selected', () => {
        const { rerender } = render(
            <EditBookmarkModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={vi.fn()}
                onSave={vi.fn()}
                availableFolders={mockFolders}
                availableTags={mockTags}
            />
        );

        expect(screen.getByDisplayValue('Vite Next Generation Frontend Tooling')).toBeInTheDocument();

        const anotherBookmark = {
            id: 88,
            title: 'MDN Web Docs',
            url: 'https://developer.mozilla.org',
            originalFolder: 'Documentation',
            tags: ['mdn', 'web'],
            note: 'Resources for developers.'
        };

        rerender(
            <EditBookmarkModal
                isOpen={true}
                bookmark={anotherBookmark}
                onClose={vi.fn()}
                onSave={vi.fn()}
                availableFolders={mockFolders}
                availableTags={mockTags}
            />
        );

        expect(screen.getByDisplayValue('MDN Web Docs')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://developer.mozilla.org')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Resources for developers.')).toBeInTheDocument();
    });
});
