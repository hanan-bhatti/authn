# Contributing

Thank you for your interest in contributing to Authn! All contributions — bug reports, feature suggestions, documentation improvements, and code changes — are welcome.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Getting Help](#getting-help)

---

## Code of Conduct

This project follows our [Code of Conduct](https://github.com/hanan-bhatti/authn/blob/main/CODE_OF_CONDUCT.md). Report unacceptable behavior to [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com).

---

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/hanan-bhatti/authn/issues) first.
2. If none found, open a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment: OS, Node.js version, MongoDB version

### Suggesting Features

1. Check the [roadmap](https://github.com/hanan-bhatti/authn/blob/main/FEATURES.md) and existing issues.
2. Open a new issue with the `enhancement` label.
3. Describe the feature, the problem it solves, and any implementation ideas.

### Improving Documentation

PRs fixing typos, clarifying explanations, or adding examples are always welcome.

### Code Contributions

See [Development Setup](#development-setup) below.

---

## Development Setup

### Prerequisites

- Node.js ≥ 16.0.0
- npm ≥ 8.0.0
- MongoDB ≥ 5.0 (local or Atlas)
- Git

### Steps

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/authn.git
cd authn

# 2. Add the upstream remote
git remote add upstream https://github.com/hanan-bhatti/authn.git

# 3. Install all dependencies
npm install

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your development values

# 5. Start the development server (auto-reload)
npm run dev
```

### Running Linter

```bash
npm run lint
```

### Running Tests

```bash
npm test
```

---

## Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the [Coding Standards](#coding-standards).

3. **Lint and test** before committing:
   ```bash
   npm run lint && npm test
   ```

4. **Commit** using [Conventional Commits](#commit-message-guidelines).

5. **Keep your branch up to date**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push and open a PR** against `main`.

### PR Checklist

- [ ] Code follows the project style (ESLint passes)
- [ ] Tests added or updated where applicable
- [ ] Documentation updated if needed
- [ ] Branch is up to date with `main`
- [ ] Commit messages follow the convention

---

## Coding Standards

- Use `const` / `let` (no `var`)
- Prefer arrow functions
- Use `async`/`await` over raw Promises
- Use destructuring and template literals
- Meaningful variable names
- Always wrap route handlers in `asyncHandler`
- Throw `ApiError` with descriptive messages and codes

```javascript
// Good example
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
  res.json(new ApiResponse({ data: user }));
});
```

---

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Scopes**: `auth`, `user`, `2fa`, `device`, `session`, `email`, `security`, `api`

**Examples**:
```
feat(auth): add magic link authentication
fix(user): resolve avatar upload issue
docs(readme): update installation steps
chore(deps): bump express to 4.22.0
```

---

## Getting Help

- **Email**: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)
- **Issues**: [github.com/hanan-bhatti/authn/issues](https://github.com/hanan-bhatti/authn/issues)
- **Discussions**: [github.com/hanan-bhatti/authn/discussions](https://github.com/hanan-bhatti/authn/discussions)
