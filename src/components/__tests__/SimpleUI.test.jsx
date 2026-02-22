import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Favicon } from '../Favicon';
import OfflineIndicator from '../OfflineIndicator';
import PWAUpdatePrompt from '../PWAUpdatePrompt';

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

// Mock virtual module for PWA
import * as pwaRegister from 'virtual:pwa-register/react';
vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: vi.fn()
}));

describe('Simple UI Components', () => {

    describe('Favicon', () => {
        it('renders an image for a valid URL', () => {
            const { container } = render(<Favicon url="https://github.com" />);
            const img = container.querySelector('img');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'https://www.google.com/s2/favicons?domain=github.com&sz=128');
        });

        it('renders a fallback icon for an invalid URL', () => {
            const { container } = render(<Favicon url="not-a-url" />);
            // lucide-react icons are usually SVGs (Globe icon)
            expect(container.querySelector('svg')).toBeInTheDocument();
        });

        it('renders a fallback icon when image fails to load', () => {
            const { container } = render(<Favicon url="https://fail.com" />);
            const img = container.querySelector('img');
            expect(img).toBeInTheDocument();

            // Trigger error
            fireEvent.error(img);

            // After error, image should be gone and fallback SVG should appear
            expect(container.querySelector('img')).not.toBeInTheDocument();
            expect(container.querySelector('svg')).toBeInTheDocument();
        });
    });

    describe('OfflineIndicator', () => {
        it('returns null when online', () => {
            Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
            const { container } = render(<OfflineIndicator />);
            expect(container.firstChild).toBeNull();
        });

        it('shows message when offline event occurs', () => {
            Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
            render(<OfflineIndicator />);

            // Go offline
            act(() => {
                window.dispatchEvent(new Event('offline'));
            });

            expect(screen.getByText('offline')).toBeInTheDocument();

            // Go back online
            act(() => {
                window.dispatchEvent(new Event('online'));
            });

            expect(screen.queryByText('offline')).not.toBeInTheDocument();
        });
    });

    describe('PWAUpdatePrompt', () => {
        it('returns null when no refresh needed', () => {
            pwaRegister.useRegisterSW.mockReturnValue({
                needRefresh: [false, vi.fn()],
                updateServiceWorker: vi.fn(),
            });

            const { container } = render(<PWAUpdatePrompt />);
            expect(container.firstChild).toBeNull();
        });

        it('shows update prompt when needRefresh is true', () => {
            const setNeedRefresh = vi.fn();
            const updateSW = vi.fn();

            pwaRegister.useRegisterSW.mockReturnValue({
                needRefresh: [true, setNeedRefresh],
                updateServiceWorker: updateSW,
            });

            render(<PWAUpdatePrompt />);
            expect(screen.getByText('pwa.updateAvailable')).toBeInTheDocument();

            // Click Update
            fireEvent.click(screen.getByText('pwa.updateButton'));
            expect(updateSW).toHaveBeenCalledWith(true);

            // Click Close
            fireEvent.click(screen.getByLabelText('pwa.close'));
            expect(setNeedRefresh).toHaveBeenCalledWith(false);
        });
    });
});
