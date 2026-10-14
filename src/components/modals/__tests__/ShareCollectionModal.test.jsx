import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShareCollectionModal } from '../ShareCollectionModal';

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

vi.mock('../../../db', () => ({
    db: {
        bookmarks: {
            where: vi.fn(() => ({
                equals: vi.fn(() => ({
                    toArray: vi.fn().mockResolvedValue([
                        {
                            id: 1,
                            title: 'GitHub',
                            url: 'https://github.com',
                            note: 'Code repo',
                            tags: ['dev']
                        },
                        {
                            id: 2,
                            title: 'MDN Web Docs',
                            url: 'https://developer.mozilla.org',
                            note: 'Reference docs',
                            tags: ['docs']
                        }
                    ])
                }))
            }))
        }
    }
}));

describe('ShareCollectionModal', () => {
    const mockCollection = {
        id: 'col-1',
        name: 'Design & Code Tools',
        icon: '🎨',
        color: '#6366f1'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.URL.createObjectURL = vi.fn(() => 'blob:https://test/hub-blob');
        globalThis.URL.revokeObjectURL = vi.fn();
        globalThis.open = vi.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    it('renders collection title, icon and layout options when open', async () => {
        render(
            <ShareCollectionModal
                isOpen={true}
                collection={mockCollection}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('Design & Code Tools')).toBeInTheDocument();
        expect(screen.getByText('🎨')).toBeInTheDocument();
        expect(screen.getByText('Bento Grid')).toBeInTheDocument();
        expect(screen.getByText('Linktree')).toBeInTheDocument();
        expect(screen.getByText('Kartlar')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText((content) => content.includes('2') && content.includes('Yer'))).toBeInTheDocument();
        });
    });

    it('renders live preview iframe with srcDoc', async () => {
        render(
            <ShareCollectionModal
                isOpen={true}
                collection={mockCollection}
                onClose={vi.fn()}
            />
        );

        const iframe = screen.getByTitle('Collection Hub Preview');
        expect(iframe).toBeInTheDocument();
        await waitFor(() => {
            expect(iframe).toHaveAttribute('srcDoc');
            expect(iframe.getAttribute('srcDoc')).toContain('Design &amp; Code Tools');
        });
    });

    it('switches between layouts on button click', async () => {
        render(
            <ShareCollectionModal
                isOpen={true}
                collection={mockCollection}
                onClose={vi.fn()}
            />
        );

        const linktreeBtn = screen.getByRole('button', { name: /linktree/i });
        fireEvent.click(linktreeBtn);

        const iframe = screen.getByTitle('Collection Hub Preview');
        await waitFor(() => {
            expect(iframe.getAttribute('srcDoc')).toContain('layout-linktree');
        });

        const cardsBtn = screen.getByRole('button', { name: /kartlar/i });
        fireEvent.click(cardsBtn);
        await waitFor(() => {
            expect(iframe.getAttribute('srcDoc')).toContain('layout-cards');
        });
    });

    it('updates bio and author inputs in live preview HTML', async () => {
        render(
            <ShareCollectionModal
                isOpen={true}
                collection={mockCollection}
                onClose={vi.fn()}
            />
        );

        const bioInput = screen.getByPlaceholderText(/Yazılımcılar ve tasarımcılar için/i);
        fireEvent.change(bioInput, { target: { value: 'Best developer resources in 2026' } });

        const authorInput = screen.getByPlaceholderText(/@ghostkozak/i);
        fireEvent.change(authorInput, { target: { value: '@johndoe' } });

        const iframe = screen.getByTitle('Collection Hub Preview');
        await waitFor(() => {
            const srcDoc = iframe.getAttribute('srcDoc');
            expect(srcDoc).toContain('Best developer resources in 2026');
            expect(srcDoc).toContain('@johndoe');
        });
    });

    it('handles download HTML index.html click', async () => {
        render(
            <ShareCollectionModal
                isOpen={true}
                collection={mockCollection}
                onClose={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText((c) => c.includes('2') && c.includes('Yer'))).toBeInTheDocument();
        });

        const downloadBtn = screen.getByRole('button', { name: /HTML İndir \(index\.html\)/i });
        await act(async () => {
            fireEvent.click(downloadBtn);
        });

        expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('handles copy HTML source code button', async () => {
        render(
            <ShareCollectionModal
                isOpen={true}
                collection={mockCollection}
                onClose={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText((c) => c.includes('2') && c.includes('Yer'))).toBeInTheDocument();
        });

        const copyBtn = screen.getByRole('button', { name: /Tüm HTML Kodunu Kopyala/i });
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('toggles GitHub Pages guide accordion', async () => {
        render(
            <ShareCollectionModal
                isOpen={true}
                collection={mockCollection}
                onClose={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText((c) => c.includes('2') && c.includes('Yer'))).toBeInTheDocument();
        });

        const guideBtn = screen.getByRole('button', { name: /GitHub Pages ile Ücretsiz Nasıl Yayınlanır/i });
        expect(screen.queryByText(/github\.com\/new/i)).not.toBeInTheDocument();

        await act(async () => {
            fireEvent.click(guideBtn);
        });
        expect(screen.getByText(/github\.com\/new/i)).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(guideBtn);
        });
        expect(screen.queryByText(/github\.com\/new/i)).not.toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        const { container } = render(
            <ShareCollectionModal
                isOpen={false}
                collection={mockCollection}
                onClose={vi.fn()}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });
});
