# Contributing to Authn

Thank you for your interest in contributing to Authn! We're excited to welcome contributions from the community. Whether it's a bug report, a new feature, documentation improvement, or code optimization, your help is valued and appreciated.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Guidelines](#issue-guidelines)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com).

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/hanan-bhatti/authn/issues) to avoid duplicates.

#### How to Submit a Good Bug Report

Bug reports should include:

1. **Clear and Descriptive Title**
   - Use a clear title that describes the problem

2. **Detailed Description**
   - Explain the problem and include additional details
   - Describe the exact steps to reproduce the issue
   - Provide specific examples

3. **Expected vs Actual Behavior**
   - Describe what you expected to happen
   - Describe what actually happened

4. **Environment Details**
   - OS: [e.g., Ubuntu 20.04, Windows 10, macOS 12.0]
   - Node.js version: [e.g., 16.14.0]
   - npm version: [e.g., 8.5.0]
   - MongoDB version: [e.g., 5.0.5]

5. **Additional Context**
   - Screenshots (if applicable)
   - Error messages and stack traces
   - Configuration files (without sensitive data)

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g., Ubuntu 20.04]
 - Node.js Version: [e.g., 16.14.0]
 - MongoDB Version: [e.g., 5.0.5]

**Additional context**
Add any other context about the problem here.
```

### ✨ Suggesting Features

Feature suggestions are welcome! Please:

1. **Check Existing Requests**
   - Search [existing feature requests](https://github.com/hanan-bhatti/authn/issues?q=is%3Aissue+label%3Aenhancement)
   - Check the [Roadmap](FEATURES.md) for planned features

2. **Use the Feature Request Template**
   ```markdown
   **Is your feature request related to a problem?**
   A clear description of what the problem is.
   
   **Describe the solution you'd like**
   A clear description of what you want to happen.
   
   **Describe alternatives you've considered**
   Alternative solutions or features you've considered.
   
   **Additional context**
   Any other context, screenshots, or examples.
   
   **Potential Implementation**
   (Optional) Suggestions on how this could be implemented.
   ```

3. **Provide Use Cases**
   - Explain why this feature would be useful
   - Provide real-world scenarios
   - Describe the benefits to users

### 📝 Improving Documentation

Documentation improvements are always welcome! You can help by:

- Fixing typos or grammatical errors
- Improving clarity and readability
- Adding more examples
- Updating outdated information
- Translating documentation
- Adding missing API documentation

### 💻 Code Contributions

We welcome code contributions! See the [Development Setup](#development-setup) section below.

---

## Development Setup

### Prerequisites

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **MongoDB**: >= 5.0 (local or cloud instance)
- **Git**: Latest version
- **Code Editor**: VS Code recommended (with ESLint extension)

### Initial Setup

1. **Fork the Repository**
   - Visit https://github.com/hanan-bhatti/authn
   - Click the "Fork" button in the top right

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/authn.git
   cd authn
   ```

3. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/hanan-bhatti/authn.git
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URL=mongodb://localhost:27017/authn-dev
   JWT_SECRET=your-development-secret-min-32-chars
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-dev-email@gmail.com
   SMTP_PASS=your-app-password
   EMAIL_FROM=noreply@localhost
   ```

6. **Start MongoDB** (if running locally)
   ```bash
   mongod --dbpath /path/to/your/data
   ```

7. **Run the Application**
   ```bash
   npm run dev
   ```

8. **Verify Setup**
   - Open http://localhost:5000/health
   - You should see a health check response

### Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow the [Coding Standards](#coding-standards)
   - Add comments where necessary
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   # Run linting
   npm run lint
   
   # Run tests (when available)
   npm test
   
   # Manual testing
   npm run dev
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```
   
   Follow our [Commit Message Guidelines](#commit-message-guidelines)

5. **Keep Your Branch Updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Fill out the PR template
   - Submit for review

---

## Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] All tests pass (if applicable)
- [ ] ESLint shows no errors
- [ ] Documentation is updated
- [ ] Commit messages follow guidelines
- [ ] Branch is up to date with `main`

### PR Title Format

Use conventional commits format:
```
<type>(<scope>): <short description>
```

Examples:
- `feat(auth): add magic link authentication`
- `fix(user): resolve avatar upload issue`
- `docs(readme): update installation instructions`

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issues
Fixes #(issue number)
Closes #(issue number)

## Testing
Describe the tests you ran and how to reproduce them

## Screenshots (if applicable)
Add screenshots showing the changes

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective
- [ ] New and existing tests pass locally
```

### Review Process

1. **Automated Checks**
   - Linting (ESLint)
   - Test suite (when available)
   - Build verification

2. **Code Review**
   - At least one maintainer review required
   - Address all review comments
   - Make requested changes

3. **Approval & Merge**
   - Maintainer approves PR
   - Squash and merge to `main`
   - Branch deleted after merge

---

## Coding Standards

### JavaScript Style Guide

We follow modern JavaScript best practices:

#### General Rules

```javascript
// Use const for variables that don't change
const API_BASE_URL = '/api';

// Use let for variables that change
let userCount = 0;

// Prefer arrow functions
const getUserById = (id) => {
  return User.findById(id);
};

// Use async/await over promises
async function fetchUser(id) {
  try {
    const user = await User.findById(id);
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Use destructuring
const { username, email } = req.body;

// Use template literals
const message = `Welcome, ${username}!`;

// Use meaningful variable names
const isUserAuthenticated = true; // Good
const flag = true; // Bad
```

#### Error Handling

```javascript
// Always use try-catch for async operations
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new ApiError('Operation failed', 500);
}

// Use ApiError class for custom errors
throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

// Use asyncHandler for route handlers
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(new ApiResponse({ data: user }));
}));
```

#### Comments

```javascript
/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object with token
 * @throws {ApiError} If authentication fails
 */
async function authenticateUser(email, password) {
  // Implementation
}

// Use inline comments for complex logic
// Calculate expiration time (7 days from now)
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
```

### File Organization

```javascript
// 1. External dependencies
const express = require('express');
const jwt = require('jsonwebtoken');

// 2. Internal dependencies
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../utils/helpers');

// 3. Constants
const TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 10;

// 4. Middleware
const authenticate = asyncHandler(async (req, res, next) => {
  // Implementation
});

// 5. Route handlers
const login = asyncHandler(async (req, res) => {
  // Implementation
});

// 6. Exports
module.exports = {
  authenticate,
  login
};
```

### ESLint Configuration

The project uses ESLint. Run before committing:

```bash
npm run lint
```

Common issues to avoid:
- Unused variables
- Missing semicolons
- Inconsistent spacing
- Console.log in production code (use proper logging)

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi-colons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Changes to build process, dependencies, or tooling

### Scope

The scope is optional and can be anything specifying the place of the commit change:

- `auth` - Authentication related
- `user` - User management
- `2fa` - Two-factor authentication
- `device` - Device management
- `session` - Session handling
- `email` - Email service
- `security` - Security features
- `api` - API changes
- `ui` - User interface
- `deps` - Dependencies

### Subject

- Use imperative, present tense: "add" not "added" nor "adds"
- Don't capitalize the first letter
- No period (.) at the end
- Maximum 72 characters

### Body (Optional)

- Explain the motivation for the change
- Include before/after behavior comparison

### Footer (Optional)

- Reference issues: `Closes #123` or `Fixes #456`
- Note breaking changes: `BREAKING CHANGE: description`

### Examples

```bash
# Feature addition
git commit -m "feat(auth): add magic link authentication"

# Bug fix
git commit -m "fix(user): resolve avatar upload issue for large files"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "refactor(api): change response format

BREAKING CHANGE: API responses now use ApiResponse class format.
Update all clients to expect { success, data, message } structure."

# Multiple related changes
git commit -m "feat(2fa): add backup codes

- Generate 10 backup codes on 2FA setup
- Allow one-time use of backup codes
- Add regenerate backup codes endpoint

Closes #123"
```

---

## Issue Guidelines

### Creating Issues

#### Bug Reports

Use the bug report template:
- Clear title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Screenshots if applicable

#### Feature Requests

Use the feature request template:
- Clear description
- Use cases
- Benefits
- Potential implementation approach

### Working on Issues

1. **Comment Before Starting**
   - Comment on the issue you want to work on
   - Wait for assignment or confirmation

2. **Ask Questions**
   - Don't hesitate to ask for clarification
   - Discuss implementation approach

3. **Keep Issues Updated**
   - Comment with progress updates
   - Mention blockers or challenges

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `security` - Security related
- `performance` - Performance improvements
- `breaking change` - Introduces breaking changes

---

## Community

### Getting Help

- **Email**: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)
- **Issues**: [GitHub Issues](https://github.com/hanan-bhatti/authn/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hanan-bhatti/authn/discussions)

### Code Review Guidelines

When reviewing code:

**Be Respectful**
- Provide constructive feedback
- Focus on the code, not the person
- Explain why changes are needed
- Suggest alternatives

**Be Thorough**
- Check for security issues
- Verify error handling
- Test edge cases
- Review documentation

**Be Timely**
- Review PRs within 2-3 days
- Provide initial feedback quickly
- Follow up on updates

### Recognition

Contributors are recognized in:
- README.md Contributors section
- CHANGELOG.md for significant contributions
- Release notes
- GitHub insights

---

## Questions?

Don't hesitate to ask questions! We're here to help:

- Open a [discussion](https://github.com/hanan-bhatti/authn/discussions)
- Email: [hannanbhatti2006@gmail.com](mailto:hannanbhatti2006@gmail.com)
- Comment on relevant issues

---

## Thank You!

Your contributions make Authn better for everyone. We appreciate your time and effort!

---

**Last Updated**: November 6, 2025  
**Maintained by**: Abdul Hannan Bhatti