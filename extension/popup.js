document.getElementById('open-app-btn').addEventListener('click', () => {
    // Look for an existing open BookSmart tab or open a new one
    chrome.tabs.query({ url: ['*://localhost/*', '*://127.0.0.1/*', '*://*/*booksmart*'] }, (tabs) => {
        if (tabs && tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
        } else {
            chrome.tabs.create({ url: 'http://localhost:5173' });
        }
    });
});
