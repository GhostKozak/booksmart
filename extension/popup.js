// BookSmart Companion - Popup Script
const statusEl = document.getElementById('status-msg');

function showStatus(text, type = 'info', duration = 3000) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'status-msg status-' + type;
    statusEl.style.display = 'block';

    if (duration > 0) {
        setTimeout(() => {
            if (statusEl.textContent === text) {
                statusEl.style.display = 'none';
                statusEl.textContent = '';
            }
        }, duration);
    }
}

function triggerNotification(title, message, isWarning = false) {
    try {
        chrome.runtime.sendMessage({
            action: 'SHOW_NOTIFICATION',
            title,
            message,
            isWarning
        });
    } catch {
        // Ignored
    }
}

const BOOKSMART_URL_PATTERNS = [
    '*://localhost/*',
    '*://127.0.0.1/*',
    '*://booksmart.app/*',
    '*://*.booksmart.app/*',
    '*://ghostkozak.github.io/booksmart/*'
];

function getAppUrl(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['lastBooksmartUrl'], (data) => {
            callback(data?.lastBooksmartUrl || 'http://localhost:5173');
        });
    } else {
        callback('http://localhost:5173');
    }
}

function updateTabCountBadge() {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (!tabs) return;
        const valid = tabs.filter(t => {
            if (!t.url) return false;
            const u = t.url.toLowerCase();
            return !u.startsWith('chrome://') &&
                   !u.startsWith('chrome-extension://') &&
                   !u.startsWith('moz-extension://') &&
                   !u.startsWith('about:') &&
                   !u.startsWith('edge://');
        });
        const badge = document.getElementById('tab-count-badge');
        if (badge) {
            badge.textContent = `${valid.length} sekme`;
        }
    });
}

// 0. Initial load: Duplicate checking & Tab Count
if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]?.url) {
            const activeTab = tabs[0];
            chrome.runtime.sendMessage({
                action: 'CHECK_URL_DUPLICATE',
                url: activeTab.url
            }, (res) => {
                if (chrome.runtime.lastError) return;
                if (res && res.isDuplicate) {
                    const warnEl = document.getElementById('duplicate-warning');
                    const warnTextEl = document.getElementById('duplicate-warning-text');
                    const saveBtn = document.getElementById('save-tab-btn');
                    const folderName = res.folder || 'Kütüphane';
                    const msg = `Bu link kütüphanenizde zaten "${folderName}" klasöründe kayıtlı!`;

                    if (warnEl && warnTextEl) {
                        warnTextEl.textContent = msg;
                        warnEl.style.display = 'flex';
                    }
                    if (saveBtn) {
                        saveBtn.classList.add('btn-already-saved');
                        saveBtn.innerHTML = '<span>⚠️ Zaten Kayıtlı</span>';
                    }
                    showStatus(msg, 'warning', 0);
                }
            });
        }
    });

    updateTabCountBadge();
}

// 1. Save Current Tab
document.getElementById('save-tab-btn')?.addEventListener('click', async () => {
    showStatus('Kaydediliyor...', 'info', 0);
    try {
        chrome.runtime.sendMessage({ action: 'CAPTURE_CURRENT_TAB' }, (res) => {
            if (chrome.runtime.lastError || !res?.success) {
                const errMsg = res?.error || 'Geçerli sayfa kaydedilemedi';
                showStatus(errMsg, 'error', 4000);
                triggerNotification('BookSmart - Hata', errMsg, true);
            } else if (res.bookmark?.alreadyExisted) {
                const folderName = res.bookmark.folder || res.bookmark.newFolder || 'Kütüphane';
                const title = (res.bookmark.title || 'Sayfa').slice(0, 35);
                const warnMsg = `Bu sayfa kütüphanenizde zaten "${folderName}" klasöründe kayıtlı!`;

                showStatus(`⚠️ ${warnMsg}`, 'warning', 5000);
                triggerNotification(
                    'BookSmart - Zaten Kayıtlı!',
                    `"${title}" zaten "${folderName}" klasöründe kayıtlı.`,
                    true
                );

                const warnEl = document.getElementById('duplicate-warning');
                const warnTextEl = document.getElementById('duplicate-warning-text');
                if (warnEl && warnTextEl) {
                    warnTextEl.textContent = warnMsg;
                    warnEl.style.display = 'flex';
                }
            } else {
                const folderName = res.bookmark.folder || res.bookmark.newFolder || 'BookSmart';
                const title = (res.bookmark.title || 'Sayfa').slice(0, 35);
                showStatus(`✓ "${title}" "${folderName}" klasörüne kaydedildi!`, 'success', 4000);
                triggerNotification(
                    'BookSmart - Kaydedildi',
                    `"${title}" "${folderName}" klasörüne başarıyla eklendi.`,
                    false
                );
            }
        });
    } catch (err) {
        showStatus(err.message, 'error', 4000);
    }
});

// 2. Save Open Tabs as Session Collection (OneTab style)
document.getElementById('save-session-btn')?.addEventListener('click', () => {
    const closeCheckbox = document.getElementById('close-tabs-checkbox');
    const closeTabs = Boolean(closeCheckbox?.checked);

    showStatus('Sekmeler aktarılıyor...', 'info', 0);
    try {
        chrome.runtime.sendMessage({
            action: 'SAVE_SESSION_TABS',
            options: { closeTabs }
        }, (res) => {
            if (chrome.runtime.lastError || !res?.success) {
                const errMsg = res?.error || 'Sekmeler kaydedilemedi';
                showStatus(errMsg, 'error', 4000);
                triggerNotification('BookSmart - Hata', errMsg, true);
            } else {
                const msg = `Koleksiyon oluşturuldu: "${res.sessionName}" (${res.count} sekme)`;
                showStatus(`✓ ${msg}`, 'success', 4500);
                triggerNotification(
                    'BookSmart - Sekmeler Kaydedildi',
                    msg,
                    false
                );
                setTimeout(updateTabCountBadge, 500);
            }
        });
    } catch (err) {
        showStatus(err.message, 'error', 4000);
    }
});

// 3. Trigger Two-Way Sync
document.getElementById('sync-btn')?.addEventListener('click', () => {
    showStatus('BookSmart ile bağlantı kuruluyor...', 'info', 3000);
    try {
        chrome.tabs.query({ url: BOOKSMART_URL_PATTERNS }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                showStatus('Senkronizasyon başlatıldı...', 'info', 3000);
                chrome.tabs.sendMessage(tabs[0].id, { action: 'TRIGGER_TWO_WAY_SYNC' }, (response) => {
                    if (!chrome.runtime.lastError && response?.success) {
                        showStatus('Senkronizasyon tamamlanıyor!', 'success', 3500);
                    }
                });
            } else {
                getAppUrl((appUrl) => {
                    try {
                        const urlObj = new URL(appUrl);
                        urlObj.searchParams.set('sync', 'auto');
                        chrome.tabs.create({ url: urlObj.toString() });
                    } catch {
                        chrome.tabs.create({ url: 'http://localhost:5173?sync=auto' });
                    }
                    showStatus('BookSmart açılarak eşitleniyor...', 'info', 4000);
                });
            }
        });
    } catch (err) {
        showStatus(err.message, 'error', 4000);
    }
});

// 4. Open BookSmart Web Application
document.getElementById('open-app-btn')?.addEventListener('click', () => {
    chrome.tabs.query({ url: BOOKSMART_URL_PATTERNS }, (tabs) => {
        if (tabs && tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
        } else {
            getAppUrl((appUrl) => {
                chrome.tabs.create({ url: appUrl });
            });
        }
    });
});
