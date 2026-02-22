import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsModal } from '../SettingsModal';

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

// Mock Dialog and other UI components if necessary
// But standard Radix UI Dialog might need a root provider or proper triggering
// For speed, let's assume Dialog behaves like a standard div/modal for tests

// Mock LocalStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SettingsModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    it('renders correctly when open', () => {
        render(<SettingsModal {...defaultProps} />);
        expect(screen.getByText('settings.ai.title')).toBeInTheDocument();
        expect(screen.getByLabelText('settings.ai.model')).toBeInTheDocument();
        expect(screen.getByLabelText('settings.ai.apiKey')).toBeInTheDocument();
    });

    it('loads settings from localStorage on open', () => {
        localStorageMock.setItem('bs_api_key', 'test-key');
        localStorageMock.setItem('bs_model', 'gpt-4o');

        render(<SettingsModal {...defaultProps} />);

        expect(screen.getByLabelText('settings.ai.apiKey').value).toBe('test-key');
        expect(screen.getByLabelText('settings.ai.model').value).toBe('gpt-4o');
    });

    it('updates state when inputs change', () => {
        render(<SettingsModal {...defaultProps} />);

        const keyInput = screen.getByLabelText('settings.ai.apiKey');
        const modelSelect = screen.getByLabelText('settings.ai.model');

        fireEvent.change(keyInput, { target: { value: 'new-key' } });
        fireEvent.change(modelSelect, { target: { value: 'gemini-2.0-flash' } });

        expect(keyInput.value).toBe('new-key');
        expect(modelSelect.value).toBe('gemini-2.0-flash');
    });

    it('saves settings and calls onSave and onClose', () => {
        render(<SettingsModal {...defaultProps} />);

        fireEvent.change(screen.getByLabelText('settings.ai.apiKey'), { target: { value: 'save-key' } });
        fireEvent.change(screen.getByLabelText('settings.ai.model'), { target: { value: 'gpt-4o' } });

        fireEvent.click(screen.getByText('modals.settings.saveContinue'));

        expect(localStorageMock.setItem).toHaveBeenCalledWith('bs_api_key', 'save-key');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('bs_model', 'gpt-4o');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('bs_provider', 'openai');

        expect(defaultProps.onSave).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel is clicked', () => {
        render(<SettingsModal {...defaultProps} />);
        fireEvent.click(screen.getByText('modals.settings.cancel'));
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});
