// BookSmart Companion - Popup Script
const statusEl = document.getElementById('status-msg');

function showStatus(text, duration = 3000) {
    if (!statusEl) return;
    statusEl.textContent = text;
    if (duration > 0) {
        setTimeout(() => {
            if (statusEl.textContent === text) {
                statusEl.textContent = '';
            }
        }, duration);
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

                    if (warnEl && warnTextEl) {
                        warnTextEl.textContent = `Bu link kütüphanenizde zaten "${folderName}" klasöründe kayıtlı!`;
                        warnEl.style.display = 'flex';
                    }
                    if (saveBtn) {
                        saveBtn.classList.add('btn-already-saved');
                    }
                }
            });
        }
    });

    updateTabCountBadge();
}

// 1. Save Current Tab
document.getElementById('save-tab-btn')?.addEventListener('click', async () => {
    showStatus('Kaydediliyor...');
    try {
        chrome.runtime.sendMessage({ action: 'CAPTURE_CURRENT_TAB' }, (res) => {
            if (chrome.runtime.lastError || !res?.success) {
                showStatus(res?.error || 'Geçerli sayfa kaydedilemedi', 4000);
            } else if (res.bookmark?.alreadyExisted) {
                showStatus(`Zaten kayıtlı: "${(res.bookmark.title || '').slice(0, 20)}..."`, 4000);
            } else {
                showStatus(`Kaydedildi: "${(res.bookmark.title || '').slice(0, 20)}..."`, 4000);
            }
        });
    } catch (err) {
        showStatus(err.message, 4000);
    }
});

// 2. Save Open Tabs as Session Collection (OneTab style)
document.getElementById('save-session-btn')?.addEventListener('click', () => {
    const closeCheckbox = document.getElementById('close-tabs-checkbox');
    const closeTabs = Boolean(closeCheckbox?.checked);

    showStatus('Sekmeler aktarılıyor...');
    try {
        chrome.runtime.sendMessage({
            action: 'SAVE_SESSION_TABS',
            options: { closeTabs }
        }, (res) => {
            if (chrome.runtime.lastError || !res?.success) {
                showStatus(res?.error || 'Sekmeler kaydedilemedi', 4000);
            } else {
                showStatus(`Koleksiyon oluşturuldu: "${res.sessionName}" (${res.count} sekme)`, 4000);
                setTimeout(updateTabCountBadge, 500);
            }
        });
    } catch (err) {
        showStatus(err.message, 4000);
    }
});

// 3. Trigger Two-Way Sync
document.getElementById('sync-btn')?.addEventListener('click', () => {
    showStatus('BookSmart ile bağlantı kuruluyor...');
    try {
        chrome.tabs.query({ url: BOOKSMART_URL_PATTERNS }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                showStatus('Senkronizasyon başlatıldı...', 3000);
                chrome.tabs.sendMessage(tabs[0].id, { action: 'TRIGGER_TWO_WAY_SYNC' }, (response) => {
                    if (!chrome.runtime.lastError && response?.success) {
                        showStatus('Senkronizasyon tamamlanıyor!', 3500);
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
                    showStatus('BookSmart açılarak eşitleniyor...', 4000);
                });
            }
        });
    } catch (err) {
        showStatus(err.message, 4000);
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
