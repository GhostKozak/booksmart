import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReminderModal } from '../ReminderModal';
import * as reminderService from '../../../lib/reminder-service';

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

describe('ReminderModal', () => {
    const mockBookmark = {
        id: 101,
        title: 'Learn Spaced Repetition',
        url: 'https://en.wikipedia.org/wiki/Spaced_repetition',
        reminderAt: null
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders modal with quick presets and bookmark info', () => {
        render(
            <ReminderModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('Daha Sonra Hatırlat')).toBeInTheDocument();
        expect(screen.getByText('Learn Spaced Repetition')).toBeInTheDocument();
        expect(screen.getByText('Yarın (09:00)')).toBeInTheDocument();
        expect(screen.getByText('3 Gün Sonra')).toBeInTheDocument();
    });

    it('saves reminder when Kaydet is clicked', async () => {
        const setReminderSpy = vi.spyOn(reminderService, 'setReminder').mockResolvedValue(true);
        const onCloseMock = vi.fn();

        render(
            <ReminderModal
                isOpen={true}
                bookmark={mockBookmark}
                onClose={onCloseMock}
            />
        );

        const saveBtn = screen.getByRole('button', { name: /Kaydet/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(setReminderSpy).toHaveBeenCalledWith(101, expect.any(Number));
            expect(onCloseMock).toHaveBeenCalled();
        });
    });

    it('displays active alarm banner and allows removal when bookmark already has a reminder', async () => {
        const removeReminderSpy = vi.spyOn(reminderService, 'removeReminder').mockResolvedValue(true);
        const onCloseMock = vi.fn();

        const bookmarkWithReminder = {
            ...mockBookmark,
            reminderAt: Date.now() + 86400000
        };

        render(
            <ReminderModal
                isOpen={true}
                bookmark={bookmarkWithReminder}
                onClose={onCloseMock}
            />
        );

        expect(screen.getByText(/Kurulu Alarm:/i)).toBeInTheDocument();

        const removeBtn = screen.getByRole('button', { name: /Kaldır/i });
        fireEvent.click(removeBtn);

        await waitFor(() => {
            expect(removeReminderSpy).toHaveBeenCalledWith(101);
            expect(onCloseMock).toHaveBeenCalled();
        });
    });
});
