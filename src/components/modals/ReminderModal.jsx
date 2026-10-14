import { useState } from 'react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { Favicon } from '../Favicon';
import {
    setReminder,
    removeReminder,
    getReminderPresets,
    getReminderStatus,
    requestNotificationPermission
} from '../../lib/reminder-service';
import { Bell, Calendar, Clock, Trash2, Check, BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

function formatLocalIso(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ReminderModal({ isOpen, bookmark, onClose }) {
    const { t } = useTranslation();
    const presets = getReminderPresets();

    const initialTimestamp = bookmark?.reminderAt ? Number(bookmark.reminderAt) : presets[0].getTimestamp();
    const [selectedTimestamp, setSelectedTimestamp] = useState(initialTimestamp);
    const [customDateTime, setCustomDateTime] = useState(() => formatLocalIso(initialTimestamp));
    const [prevBookmarkId, setPrevBookmarkId] = useState(bookmark?.id);
    const [prevReminderAt, setPrevReminderAt] = useState(bookmark?.reminderAt);
    const [isSaving, setIsSaving] = useState(false);
    const [notifPermission, setNotifPermission] = useState(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });

    if (bookmark && (bookmark.id !== prevBookmarkId || bookmark.reminderAt !== prevReminderAt)) {
        setPrevBookmarkId(bookmark.id);
        setPrevReminderAt(bookmark.reminderAt);
        const nextTs = bookmark.reminderAt ? Number(bookmark.reminderAt) : presets[0].getTimestamp();
        setSelectedTimestamp(nextTs);
        setCustomDateTime(formatLocalIso(nextTs));
    }


    if (!isOpen || !bookmark) return null;

    const currentStatus = bookmark.reminderAt ? getReminderStatus(bookmark.reminderAt, t) : null;

    const handleSelectPreset = (getTimestamp) => {
        const ts = getTimestamp();
        setSelectedTimestamp(ts);
        const date = new Date(ts);
        const pad = (n) => String(n).padStart(2, '0');
        setCustomDateTime(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`);
    };

    const handleCustomChange = (e) => {
        const val = e.target.value;
        setCustomDateTime(val);
        if (val) {
            const parsed = new Date(val).getTime();
            if (!isNaN(parsed)) {
                setSelectedTimestamp(parsed);
            }
        }
    };

    const handleRequestPermission = async () => {
        const res = await requestNotificationPermission();
        setNotifPermission(res);
        if (res === 'granted') {
            toast.success(t('reminders.permissionGranted', 'Bildirim izni verildi!'));
        }
    };

    const handleSave = async () => {
        if (!selectedTimestamp) return;
        setIsSaving(true);
        try {
            await setReminder(bookmark.id, selectedTimestamp);
            toast.success(t('reminders.savedSuccess', 'Hatırlatıcı kuruldu!'));
            onClose();
        } catch (err) {
            console.error('Failed to save reminder:', err);
            toast.error(t('common.error', 'Kaydedilemedi'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async () => {
        setIsSaving(true);
        try {
            await removeReminder(bookmark.id);
            toast.success(t('reminders.removedSuccess', 'Hatırlatıcı kaldırıldı.'));
            onClose();
        } catch (err) {
            console.error('Failed to remove reminder:', err);
            toast.error(t('common.error', 'Kaldırılamadı'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('reminders.modalTitle', 'Daha Sonra Hatırlat')}
        >
            <div className="space-y-4">
                {/* Bookmark Summary */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border">
                    <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center shrink-0 border">
                        <Favicon url={bookmark.url} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate" title={bookmark.title}>
                            {bookmark.title || t('common.untitled', 'İsimsiz')}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate" title={bookmark.url}>
                            {bookmark.url}
                        </p>
                    </div>
                </div>

                {/* Current Active Reminder Banner */}
                {currentStatus && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <BellRing className="w-4 h-4 shrink-0" />
                            <span>
                                {t('reminders.activeAlarm', 'Kurulu Alarm:')} <strong>{currentStatus.fullDate}</strong> ({currentStatus.text})
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemove}
                            disabled={isSaving}
                            className="h-7 px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            {t('reminders.remove', 'Kaldır')}
                        </Button>
                    </div>
                )}

                {/* Quick Presets */}
                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        {t('reminders.quickPresets', 'Hızlı Seçenekler')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {presets.map((preset) => {
                            const ts = preset.getTimestamp();
                            const isSelected = selectedTimestamp && Math.abs(selectedTimestamp - ts) < 60000;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset.getTimestamp)}
                                    className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-border hover:bg-muted/50 text-foreground'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 opacity-70" />
                                        {t(preset.labelKey, preset.defaultLabel)}
                                    </span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Date & Time Picker */}
                <div>
                    <label htmlFor="custom-reminder-datetime" className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {t('reminders.customDateTime', 'Özel Tarih ve Saat')}
                    </label>
                    <input
                        id="custom-reminder-datetime"
                        type="datetime-local"
                        value={customDateTime}
                        onChange={handleCustomChange}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-hidden"
                    />
                </div>

                {/* Browser Notification Permission Prompt */}
                {notifPermission === 'default' && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-700 dark:text-sky-300">
                        <div className="flex items-center gap-1.5">
                            <Bell className="w-4 h-4 shrink-0" />
                            <span>{t('reminders.enablePush', 'Masaüstü bildirimlerini açmak ister misiniz?')}</span>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRequestPermission}
                            className="h-6 px-2 text-xs border-sky-500/50 hover:bg-sky-500/20"
                        >
                            {t('reminders.allow', 'İzin Ver')}
                        </Button>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        {t('common.cancel', 'Vazgeç')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !selectedTimestamp}
                    >
                        <Bell className="w-4 h-4 mr-1.5" />
                        {t('common.save', 'Kaydet')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    );
}
