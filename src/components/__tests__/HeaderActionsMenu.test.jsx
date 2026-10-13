import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HeaderActionsMenu } from '../layout/HeaderActionsMenu';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, opts) => {
            if (typeof opts === 'string') return opts;
            if (opts && typeof opts === 'object') {
                if (opts.defaultValue) return opts.defaultValue;
                if (opts.count !== undefined) return `${opts.count} ${key}`;
            }
            return key;
        },
        i18n: { language: 'tr', changeLanguage: vi.fn() }
    })
}));

describe('HeaderActionsMenu', () => {
    const defaultProps = {
        isExtensionConnected: true,
        twoWaySync: vi.fn(),
        isSyncing: false,
        importFromBrowser: vi.fn(),
        pushToBrowser: vi.fn(),
        openExtensionGuide: vi.fn(),
        hasMaintenanceActions: true,
        duplicateCount: 3,
        mergeDuplicates: vi.fn(),
        removeDuplicates: vi.fn(),
        cleanableCount: 2,
        cleanAllUrls: vi.fn(),
        checkAllLinks: vi.fn(),
        isCheckingLinks: false,
        setIsCommandPaletteOpen: vi.fn(),
        setIsShortcutsOpen: vi.fn(),
        setIsRssReaderOpen: vi.fn(),
        totalUnreadRss: 4,
        bookmarkCount: 15,
        viewMode: 'grid',
        setViewMode: vi.fn(),
        showThumbnails: true,
        setShowThumbnails: vi.fn(),
        sortBy: 'default',
        setSortBy: vi.fn(),
        theme: 'dark',
        setTheme: vi.fn(),
        openSettings: vi.fn(),
        hasFileLoaded: true,
        openExportModal: vi.fn(),
        closeFile: vi.fn(),
        clearAll: vi.fn()
    };

    it('renders the trigger button and toggles menu on click', () => {
        render(<HeaderActionsMenu {...defaultProps} />);
        const trigger = screen.getByRole('button', { name: /İşlemler/i });
        expect(trigger).toBeInTheDocument();

        // Initially menu is closed
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        // Click to open
        fireEvent.click(trigger);
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Check tabs exist
        expect(screen.getByRole('button', { name: /Görünüm/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Tercihler/i })).toBeInTheDocument();
    });

    it('displays extension actions when extension is connected', () => {
        render(<HeaderActionsMenu {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /İşlemler/i }));

        const syncBtn = screen.getByText(/İki Yönlü Eşitle/i);
        expect(syncBtn).toBeInTheDocument();
        fireEvent.click(syncBtn);
        expect(defaultProps.twoWaySync).toHaveBeenCalled();
    });

    it('displays guide button when extension is disconnected', () => {
        render(<HeaderActionsMenu {...defaultProps} isExtensionConnected={false} />);
        fireEvent.click(screen.getByRole('button', { name: /İşlemler/i }));

        const guideBtn = screen.getByText(/Eklenti Rehberi/i);
        expect(guideBtn).toBeInTheDocument();
        fireEvent.click(guideBtn);
        expect(defaultProps.openExtensionGuide).toHaveBeenCalled();
    });

    it('switches tabs to view mode and changes view options', () => {
        render(<HeaderActionsMenu {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /İşlemler/i }));

        // Click Görünüm tab
        const viewTab = screen.getByRole('button', { name: /Görünüm/i });
        fireEvent.click(viewTab);

        // Click List view mode
        const listModeBtn = screen.getByText(/Liste/i);
        fireEvent.click(listModeBtn);
        expect(defaultProps.setViewMode).toHaveBeenCalledWith('list');

        // Click Sort option
        const sortTitleAz = screen.getByText(/Başlık \(A → Z\)/i);
        fireEvent.click(sortTitleAz);
        expect(defaultProps.setSortBy).toHaveBeenCalledWith('title-az');
    });

    it('switches tabs to preferences and toggles theme and opens settings', () => {
        render(<HeaderActionsMenu {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /İşlemler/i }));

        // Click Tercihler tab
        const prefTab = screen.getByRole('button', { name: /Tercihler/i });
        fireEvent.click(prefTab);

        // Change Theme to light
        const lightThemeBtn = screen.getByRole('button', { name: /Açık/i });
        fireEvent.click(lightThemeBtn);
        expect(defaultProps.setTheme).toHaveBeenCalledWith('light');

        // Open Settings
        const settingsBtn = screen.getByText(/Genel Ayarlar & Kurallar/i);
        fireEvent.click(settingsBtn);
        expect(defaultProps.openSettings).toHaveBeenCalledWith('folders');
    });

    it('closes on Escape key press', () => {
        render(<HeaderActionsMenu {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /İşlemler/i }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders mobile bottom sheet via portal into document.body on mobile viewport', () => {
        window.innerWidth = 390;
        fireEvent(window, new Event('resize'));

        render(<HeaderActionsMenu {...defaultProps} />);
        const trigger = screen.getByRole('button', { name: /İşlemler/i });
        fireEvent.click(trigger);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(document.body.contains(dialog)).toBe(true);

        // Click close button to dismiss
        const closeBtn = screen.getByRole('button', { name: /Kapat/i });
        fireEvent.click(closeBtn);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        // Restore window width
        window.innerWidth = 1024;
        fireEvent(window, new Event('resize'));
    });
});
