import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BulkMetadataEnricherModal } from '../BulkMetadataEnricherModal';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => (typeof fallback === 'string' ? fallback : key)
    })
}));

describe('BulkMetadataEnricherModal component', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        status: 'idle',
        progress: { processed: 0, total: 10, percentage: 0, successCount: 0, updatedCount: 0, errorCount: 0 },
        analysis: {
            totalBookmarks: 10,
            missingTitleCount: 3,
            missingDescriptionCount: 5,
            missingIconCount: 4,
            needingEnrichmentCount: 6,
            fullyEnrichedCount: 4
        },
        options: {
            scope: 'needingEnrichment',
            updateBookmarkTitle: true,
            updateBookmarkNotes: false,
            updateBookmarkIcon: true,
            forceRefresh: false,
            concurrency: 3
        },
        updateOptions: vi.fn(),
        onStart: vi.fn(),
        onPause: vi.fn(),
        onResume: vi.fn(),
        onCancel: vi.fn(),
        onReset: vi.fn()
    };

    it('renders candidate stats and title', () => {
        render(<BulkMetadataEnricherModal {...defaultProps} />);

        expect(screen.getByText('Toplu Favicon ve Meta Veri Yenileyici')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // missing titles
        expect(screen.getByText('5')).toBeInTheDocument(); // missing notes
        expect(screen.getByText('4')).toBeInTheDocument(); // missing icons
        expect(screen.getByText('6')).toBeInTheDocument(); // candidates
    });

    it('calls onStart when start button is clicked', () => {
        render(<BulkMetadataEnricherModal {...defaultProps} />);

        const startBtn = screen.getByRole('button', { name: /Zenginleştirmeyi Başlat/i });
        fireEvent.click(startBtn);

        expect(defaultProps.onStart).toHaveBeenCalled();
    });

    it('renders pause and cancel buttons when status is running', () => {
        render(<BulkMetadataEnricherModal {...defaultProps} status="running" />);

        expect(screen.getByRole('button', { name: /Duraklat/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /İptal/i })).toBeInTheDocument();
    });

    it('renders resume button when status is paused', () => {
        render(<BulkMetadataEnricherModal {...defaultProps} status="paused" />);

        expect(screen.getByRole('button', { name: /Devam Et/i })).toBeInTheDocument();
    });
});
