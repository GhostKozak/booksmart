import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QrCodeModal } from '../QrCodeModal';

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

describe('QrCodeModal', () => {
    const mockBookmark = {
        id: '123',
        title: 'BookSmart Documentation',
        url: 'https://github.com/booksmart'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    it('renders modal when open with SVG QR code and bookmark info', () => {
        render(
            <QrCodeModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('Telefona Aktar (QR Kod)')).toBeInTheDocument();
        expect(screen.getByText('BookSmart Documentation')).toBeInTheDocument();
        expect(screen.getByText('https://github.com/booksmart')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: /QR code for BookSmart Documentation/i })).toBeInTheDocument();
    });

    it('copies link to clipboard on button click', async () => {
        render(
            <QrCodeModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={vi.fn()}
            />
        );

        const copyBtn = screen.getByRole('button', { name: /Bağlantıyı Kopyala/i });
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://github.com/booksmart');
    });


    it('does not render when isOpen is false', () => {
        const { container } = render(
            <QrCodeModal
                isOpen={false}
                bookmark={mockBookmark}
                onClose={vi.fn()}
            />
        );

        expect(container).toBeEmptyDOMElement();
    });
});
