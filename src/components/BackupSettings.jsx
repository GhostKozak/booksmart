import React, { useState, useEffect } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, History } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { createBackup, downloadBackup, restoreBackup, getLastAutoBackupTime } from '../lib/backup-manager';

export function BackupSettings() {
    const [lastBackupTime, setLastBackupTime] = useState(null);
    const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState(null); // 'success' | 'error'

    useEffect(() => {
        // Load initial state
        const autoEnabled = localStorage.getItem('booksmart_auto_backup_enabled') === 'true';
        setIsAutoBackupEnabled(autoEnabled);

        // Check last backup time
        const time = getLastAutoBackupTime();
        if (time) {
            setLastBackupTime(new Date(time).toLocaleString());
        }
    }, []);

    const handleToggleAutoBackup = () => {
        const newValue = !isAutoBackupEnabled;
        setIsAutoBackupEnabled(newValue);
        localStorage.setItem('booksmart_auto_backup_enabled', String(newValue));
    };

    const handleManualBackup = async () => {
        try {
            const data = await createBackup();
            downloadBackup(data);
        } catch (e) {
            console.error("Backup failed", e);
        }
    };

    const handleRestore = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsRestoring(true);
        setRestoreStatus(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target.result);
                await restoreBackup(json);
                setRestoreStatus('success');
                // Reload page to reflect changes? Or rely on live query?
                // Live query should update, but let's show success first.
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                console.error("Restore failed", err);
                setRestoreStatus('error');
            } finally {
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium">Auto-Backup</h3>
                        <p className="text-xs text-muted-foreground">Automatically save a local snapshot when rules change.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="auto-backup"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={isAutoBackupEnabled}
                            onChange={handleToggleAutoBackup}
                        />
                    </div>
                </div>

                {lastBackupTime && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
                        <History className="h-3 w-3" />
                        Last local snapshot: {lastBackupTime}
                    </div>
                )}
            </div>

            <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Manual Backup</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                        <div className="flex items-center gap-2 font-medium text-sm">
                            <Download className="h-4 w-4 text-primary" />
                            Export Configuration
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Download all your rules, folders, and tags as a JSON file.
                        </p>
                        <Button onClick={handleManualBackup} size="sm" className="w-full">
                            Backup Now
                        </Button>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                        <div className="flex items-center gap-2 font-medium text-sm">
                            <Upload className="h-4 w-4 text-primary" />
                            Restore Configuration
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Restore your settings from a previous backup file.
                        </p>
                        <div className="relative">
                            <Button variant="outline" size="sm" className="w-full relative overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    {isRestoring ? "Restoring..." : "Select File..."}
                                </span>
                                <Input
                                    type="file"
                                    accept=".json"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleRestore}
                                    disabled={isRestoring}
                                />
                            </Button>
                        </div>
                        {restoreStatus === 'success' && (
                            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                                <CheckCircle2 className="h-3 w-3" /> Restored! Reloading...
                            </div>
                        )}
                        {restoreStatus === 'error' && (
                            <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                                <AlertCircle className="h-3 w-3" /> Invalid backup file.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900 p-3 rounded-md flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                    Backups include your Rules, Folders, Tags, and Ignored URLs. They do <strong>not</strong> include your actual bookmarks. Use "Export" on the main page for bookmarks.
                </p>
            </div>
        </div>
    );
}
