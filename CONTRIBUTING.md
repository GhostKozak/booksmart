# Contributing to BookSmart

Thank you for your interest in contributing to BookSmart! We welcome contributions from everyone.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

## How to Contribute

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally.
    ```bash
    git clone https://github.com/your-username/booksmart.git
    cd booksmart
    ```
3.  **Install dependencies**.
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```
4.  **Create a branch** for your feature or bug fix.
    ```bash
    git checkout -b feature/amazing-feature
    ```
5.  **Make your changes**.
6.  **Run the linter** to ensure code quality.
    ```bash
    npm run lint
    ```
7.  **Commit your changes**.
    ```bash
    git commit -m "Add some amazing feature"
    ```
8.  **Push to your fork**.
    ```bash
    git push origin feature/amazing-feature
    ```
9.  **Open a Pull Request** on the original repository.

## Development

-   Run `npm run dev` to start the development server.
-   Run `npm run build` to build the production application.
-   Run `npm run preview` to preview the production build locally.

## Project Structure

-   `src/`: Source code
    -   `components/`: React components
    -   `hooks/`: Custom React hooks
    -   `locales/`: Internationalization files
    -   `store/`: State management (Zustand)
    -   `db/`: Database configuration (Dexie)
    -   `utils/`: Utility functions
    -   `workers/`: Web Workers for background processing

Thank you for your contribution!
