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

// 1. Save Current Tab
document.getElementById('save-tab-btn')?.addEventListener('click', async () => {
    showStatus('Saving bookmark...');
    try {
        chrome.runtime.sendMessage({ action: 'CAPTURE_CURRENT_TAB' }, (res) => {
            if (chrome.runtime.lastError || !res?.success) {
                showStatus(res?.error || 'Could not save current page', 4000);
            } else if (res.bookmark?.alreadyExisted) {
                showStatus(`Already in BookSmart: "${(res.bookmark.title || '').slice(0, 20)}..."`, 4000);
            } else {
                showStatus(`Saved & synced: "${(res.bookmark.title || '').slice(0, 20)}..."`, 4000);
            }
        });
    } catch (err) {
        showStatus(err.message, 4000);
    }
});

// 2. Trigger Two-Way Sync
document.getElementById('sync-btn')?.addEventListener('click', () => {
    showStatus('Connecting to BookSmart...');
    try {
        chrome.tabs.query({ url: BOOKSMART_URL_PATTERNS }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                showStatus('Dispatched sync to active BookSmart tab...', 3000);
                chrome.tabs.sendMessage(tabs[0].id, { action: 'TRIGGER_TWO_WAY_SYNC' }, (response) => {
                    if (!chrome.runtime.lastError && response?.success) {
                        showStatus('Sync started in BookSmart tab!', 3500);
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
                    showStatus('Opening BookSmart to sync...', 4000);
                });
            }
        });
    } catch (err) {
        showStatus(err.message, 4000);
    }
});

// 3. Open BookSmart Web Application
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
