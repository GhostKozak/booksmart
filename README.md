# BookSmart 📚

A modern, privacy-focused bookmark manager that runs entirely in your browser. Organize, clean up, and analyze your bookmarks with ease using advanced tools and analytics.

![BookSmart Screenshot](/images/homepage_screenshot.png)

## ✨ Features

- **📂 Privacy First**: 100% local processing. No data ever leaves your browser.
- **🪄 AI Magic Sort**: Automatically categorize bookmarks into folders and generate smart tags using Local AI (Ollama) or cloud providers (OpenAI, Google Gemini, Anthropic).
- **🧹 Duplicate Cleaner**: Find, merge, or delete duplicate bookmarks with a single click.
- **📊 Analytics Dashboard**: Visualize your collection habits, top domains, and folder statistics.
- **🔗 Dead Link Checker**: Automatically identifies broken links (404s) and timeouts to keep your library clean.
- **🏷️ Smart Rules**: "If this, then that" automation to organize bookmarks by URL patterns or keywords.
- **⚡ Advanced Search**: Fuzzy search (typo-tolerant), Regex support, and date range filters.
- **🌍 Internationalization**: Fully localized interface in English and Turkish (Türkçe).
- **🛡️ Data Safety**: Automatic local backups for settings and full JSON export capability.
- **↩️ Version History**: Robust Undo/Redo system ensures mistake-proof organization.
- **🌗 Dark Mode**: Sleek, eye-friendly dark theme support.
- **📱 PWA Support**: Install as a native app on desktop and mobile devices.

## 📝 Roadmap

- [x] **AI Integration**: Auto-categorization and tagging via local (Ollama) and cloud APIs.
- [x] **PWA Support**: Install as a native app on desktop and mobile.
- [x] **Keyboard Shortcuts**: Navigate and manage bookmarks with keyboard.
- [x] **Undo/Redo**: Mistake-proof management.
- [x] **Internationalization**: English & Turkish support.
- [ ] **Browser Extension**: Capture bookmarks directly from the toolbar.
- [ ] **Sync Server**: Optional self-hosted sync server.
- [ ] **Archivebox Integration**: Auto-archive content for offline access.

## 🛠️ Tech Stack

- **Core**: React 19, Vite
- **State/Database**: Dexie.js (IndexedDB), Zustand
- **Styling**: TailwindCSS, Shadcn/UI
- **Performance**: Web Workers, React Virtuoso (Virtualization)
- **AI Integration**: Internal API clients for OpenAI, Anthropic, Gemini, and Ollama
- **Internationalization**: i18next
- **Icons**: Lucide React
- **Charts**: Recharts

## 🚀 Getting Started

### For Users

1.  **Export** your bookmarks from your browser (Chrome, Firefox, Edge, etc.) as an HTML file.
2.  **Open** BookSmart and drag & drop your bookmarks file.
3.  **Setup AI (Optional)**: Head to Settings and configure your preferred AI provider (Ollama, OpenAI, Gemini, or Anthropic) to enable Magic Sort.
4.  **Analyze** your collection using the Dashboard to understand your habits.
5.  **Organize** by using Magic Sort, creating Rules, or filtering manually.
6.  **Clean** up duplicates and broken links with the built-in tools.
7.  **Export** the organized list back to your browser when done.

### For Developers

To run the project locally:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/booksmart.git
    cd booksmart
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```

4.  **Build for production**:
    ```bash
    npm run build
    ```

## 📂 Project Structure

```
src/
├── components/     # Reusable UI components
├── db/             # Dexie database configuration
├── hooks/          # Custom React hooks
├── locales/        # i18n translation files
├── store/          # Zustand state management stores
├── utils/          # Helper functions and utilities
└── workers/        # Web Workers for background processing
```

## ⚠️ Known Issues

-   **Large Files**: Importing massive bookmark files (>10k items) may cause a momentary freeze during initial indexing.
-   **CORS**: The "Dead Link Checker" is limited by browser CORS policies. Some sites may appear as "Unknown" or "Dead" if they block cross-origin requests. Use the "Open" button to verify manually.

## 💡 FAQ

**Q: Is my data safe?**
A: Yes! Everything runs locally in your browser's IndexedDB. We do not track you or send data to any server.

**Q: Does the AI feature send my bookmarks to the cloud?**
A: By default, no. If you use Local AI via Ollama, everything remains on your machine. If you securely configure cloud providers like OpenAI or Gemini in your settings, only the specific bookmarks you select for "Magic Sort" will be sent to those APIs for processing. Your API keys are saved locally.

**Q: Which browsers are supported?**
A: Chrome, Firefox, Edge, Safari (latest versions).

**Q: How do I backup my rules and tags?**
A: Go to Settings > Backup & Data to download a full configuration snapshot.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## 📄 License

This project is licensed under the GNU General Public License v3.0 or later - see the [LICENSE](LICENSE) file for details.
