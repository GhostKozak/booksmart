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

// 1. Save Current Tab
document.getElementById('save-tab-btn')?.addEventListener('click', async () => {
    showStatus('Saving bookmark...');
    try {
        chrome.runtime.sendMessage({ action: 'CAPTURE_CURRENT_TAB' }, (res) => {
            if (chrome.runtime.lastError || !res?.success) {
                showStatus(res?.error || 'Could not save current page', 4000);
            } else {
                showStatus(`Saved: "${(res.bookmark.title || '').slice(0, 24)}..."`, 4000);
            }
        });
    } catch (err) {
        showStatus(err.message, 4000);
    }
});

// 2. Trigger Two-Way Sync
document.getElementById('sync-btn')?.addEventListener('click', () => {
    showStatus('Syncing bookmarks...');
    try {
        // Query for open BookSmart tabs to get current app bookmarks or trigger sync
        chrome.tabs.query({ url: ['*://localhost/*', '*://127.0.0.1/*', '*://*/*booksmart*'] }, (tabs) => {
            if (tabs && tabs.length > 0) {
                // Focus the BookSmart tab and initiate sync
                chrome.tabs.update(tabs[0].id, { active: true });
                showStatus('Syncing with BookSmart tab...', 3000);
            } else {
                chrome.runtime.sendMessage({ action: 'GET_BROWSER_BOOKMARKS' }, (res) => {
                    if (res?.success) {
                        showStatus(`${res.bookmarks?.length || 0} browser bookmarks ready`, 3500);
                    } else {
                        showStatus('Open BookSmart to complete sync', 3500);
                    }
                });
            }
        });
    } catch (err) {
        showStatus(err.message, 4000);
    }
});

// 3. Open BookSmart Web Application
document.getElementById('open-app-btn')?.addEventListener('click', () => {
    chrome.tabs.query({ url: ['*://localhost/*', '*://127.0.0.1/*', '*://*/*booksmart*'] }, (tabs) => {
        if (tabs && tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
        } else {
            chrome.tabs.create({ url: 'http://localhost:5173' });
        }
    });
});
