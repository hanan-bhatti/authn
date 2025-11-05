# Contributing to Authn

Thank you for your interest in contributing to Authn! We're excited to welcome contributions from the community. Whether it's a bug report, a new feature, or an improvement to our documentation, your help is valued.

To ensure a smooth and collaborative process, please read through this guide.

## ❤️ Contribution Philosophy

Authn is an open-source project driven by its community. We believe in:
- **Collaboration:** Working together to build a better tool for everyone.
- **Transparency:** Openly discussing issues, features, and the project's direction.
- **Respect:** Creating a positive and inclusive environment where all contributors feel welcome and respected.

## 📜 Code of Conduct

We have adopted a Code of Conduct that we expect all contributors to adhere to. Please read the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## 🐛 How to Report a Bug

If you find a bug, please ensure it hasn't already been reported by searching our [GitHub Issues](https://github.com/hanan-bhatti/authn/issues).

If you can't find an existing issue, please [open a new one](https://github.com/hanan-bhatti/authn/issues/new?assignees=&labels=bug&template=bug_report.md&title=).

When filing a bug report, please include:
- A clear and descriptive title.
- A detailed description of the problem.
- Steps to reproduce the behavior.
- The expected behavior and what actually happened.
- Your environment details (Node.js version, OS, etc.).

## ✨ How to Suggest a Feature

We're always open to new ideas! If you have a feature suggestion:
1. Search the [GitHub Issues](https://github.com/hanan-bhatti/authn/issues) to see if it has been suggested before.
2. If not, [open a new feature request issue](https://github.com/hanan-bhatti/authn/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=).
3. Clearly explain the feature, why it's needed, and how it would work. This allows for a healthy discussion before any code is written.

## 🚀 Pull Request Workflow

1.  **Fork & Clone:** Fork the repository and clone it to your local machine.
    ```bash
    git clone https://github.com/YOUR_USERNAME/authn.git
    cd authn
    ```
2.  **Set Upstream:** Add the original repository as an upstream remote.
    ```bash
    git remote add upstream https://github.com/hanan-bhatti/authn.git
    ```
3.  **Branching:** Create a new branch for your changes. Use a descriptive name that follows our branching strategy.
    ```bash
    # For a new feature
    git checkout -b feature/my-awesome-feature

    # For a bug fix
    git checkout -b fix/resolve-login-bug
    ```
4.  **Develop:** Make your code changes.
    - Adhere to the existing code style. We use ESLint for linting.
    - Run `npm run lint` to check for style issues.
    - Add or update tests to cover your changes. Run `npm test` to ensure all tests pass.
5.  **Commit:** Commit your changes using our [Commit Message Guidelines](#commit-message-guidelines).
    ```bash
    git add .
    git commit -m "feat(auth): implement magic link login"
    ```
6.  **Rebase:** Before pushing, rebase your branch on the latest `main` from the upstream repository to avoid merge conflicts.
    ```bash
    git fetch upstream
    git rebase upstream/main
    ```
7.  **Push:** Push your branch to your fork.
    ```bash
    git push origin feature/my-awesome-feature
    ```
8.  **Create a Pull Request:** Open a pull request from your forked repository to the `main` branch of the `hanan-bhatti/authn` repository.
    - Provide a clear title and a detailed description of your changes.
    - Link to any relevant issues (e.g., `Closes #42`).

## 🌿 Branching Strategy

-   **`main`**: The primary branch, representing the latest stable release. All pull requests should be targeted at `main`.
-   **`feature/*`**: For developing new features (e.g., `feature/add-mfa`).
-   **`fix/*`**: For bug fixes (e.g., `fix/incorrect-password-reset-email`).
-   **`docs/*`**: For documentation-only changes.
-   **`chore/*`**: For build process, dependency updates, or other maintenance tasks.

## ✍️ Commit Message Guidelines

We use the **Conventional Commits** standard. This helps us maintain a clear and descriptive commit history and automate releases.

**Format:** `<type>(<scope>): <subject>`

-   **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
-   **scope** (optional): The part of the codebase you're changing (e.g., `auth`, `user`, `email`).
-   **subject**: A concise, imperative-tense description of the change.

**Examples:**
- `feat(auth): add support for GitHub social login`
- `fix(email): correct template path for password reset`
- `docs(readme): update installation instructions`
- `chore(deps): upgrade express to v4.18.2`

Thank you for contributing to the future of Authn!