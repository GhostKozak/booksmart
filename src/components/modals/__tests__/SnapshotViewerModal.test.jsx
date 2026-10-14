import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SnapshotViewerModal } from '../SnapshotViewerModal';
import * as snapshotService from '../../../lib/snapshot-service';

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

describe('SnapshotViewerModal', () => {
    const mockBookmark = {
        id: 101,
        title: 'React 19 Deep Dive',
        url: 'https://react.dev/blog/2024/04/25/react-19'
    };

    const mockSnapshot = {
        url: 'https://react.dev/blog/2024/04/25/react-19',
        bookmarkId: 101,
        title: 'React 19 Deep Dive',
        html: '<p>React 19 brings exciting features!</p>',
        byteSize: 2048,
        savedAt: new Date('2026-10-14T08:00:00Z').toISOString()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'open').mockImplementation(() => null);
    });

    it('renders snapshot details and iframe when snapshot is available', async () => {
        vi.spyOn(snapshotService, 'getSnapshot').mockResolvedValue(mockSnapshot);

        render(
            <SnapshotViewerModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('React 19 Deep Dive')).toBeInTheDocument();
        });

        const iframe = screen.getByTitle('Offline Snapshot');
        expect(iframe).toBeInTheDocument();
        expect(iframe.getAttribute('srcDoc')).toContain('React 19 brings exciting features!');
        expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('handles download snapshot button click', async () => {
        vi.spyOn(snapshotService, 'getSnapshot').mockResolvedValue(mockSnapshot);
        const downloadSpy = vi.spyOn(snapshotService, 'downloadSnapshotFile').mockImplementation(() => {});

        render(
            <SnapshotViewerModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('HTML İndir')).toBeInTheDocument();
        });

        const downloadBtn = screen.getByText('HTML İndir');
        await act(async () => {
            fireEvent.click(downloadBtn);
        });

        expect(downloadSpy).toHaveBeenCalledWith(mockSnapshot);
    });

    it('handles delete snapshot button click', async () => {
        vi.spyOn(snapshotService, 'getSnapshot').mockResolvedValue(mockSnapshot);
        const deleteSpy = vi.spyOn(snapshotService, 'deleteSnapshot').mockResolvedValue(true);
        const onSnapshotDeleted = vi.fn();
        const onClose = vi.fn();

        render(
            <SnapshotViewerModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={onClose}
                onSnapshotDeleted={onSnapshotDeleted}
            />
        );

        await waitFor(() => {
            expect(screen.getByTitle('Sil')).toBeInTheDocument();
        });

        const deleteBtn = screen.getByTitle('Sil');
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        expect(deleteSpy).toHaveBeenCalledWith(mockSnapshot.url, mockBookmark.id);
        expect(onSnapshotDeleted).toHaveBeenCalledWith(mockBookmark.id);
        expect(onClose).toHaveBeenCalled();
    });

    it('renders empty fallback when no snapshot exists and links to Wayback Machine', async () => {
        vi.spyOn(snapshotService, 'getSnapshot').mockResolvedValue(null);

        render(
            <SnapshotViewerModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Henüz yerel çevrimdışı kopya yok')).toBeInTheDocument();
        });

        const waybackButtons = screen.getAllByText(/Wayback Machine/i);
        expect(waybackButtons.length).toBeGreaterThan(0);

        await act(async () => {
            fireEvent.click(waybackButtons[0]);
        });

        expect(window.open).toHaveBeenCalledWith(
            expect.stringContaining('web.archive.org'),
            '_blank'
        );
    });

    it('does not render when isOpen is false', () => {
        const { container } = render(
            <SnapshotViewerModal
                isOpen={false}
                bookmark={mockBookmark}
                onClose={vi.fn()}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });
});
