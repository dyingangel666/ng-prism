# Contributing to ng-prism

Thank you for your interest in contributing to ng-prism! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Plugin Development](#plugin-development)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- **Git**

### Fork & Clone

```bash
git clone https://github.com/<your-username>/ng-prism.git
cd ng-prism
npm install
```

### Verify Your Setup

```bash
npx nx build ng-prism       # Build the core package
npx nx test ng-prism        # Run tests
npx nx lint ng-prism        # Lint
```

All three commands should complete without errors.

## Development Setup

ng-prism is an **Nx 22 monorepo** using **npm workspaces**. All packages live under `packages/`.

### Key Dependencies

| Dependency       | Version | Purpose                              |
| ---------------- | ------- | ------------------------------------ |
| Angular          | 21      | Framework                            |
| TypeScript       | 5.9     | Language                             |
| Nx               | 22      | Monorepo tooling, task orchestration |
| Jest + SWC       | 30      | Testing                              |

### Running the Test Workspace

The `test-workspace/` directory contains a real Angular workspace used for integration testing.

```bash
npm run test:workspace:setup   # Build ng-prism core
npm run test:workspace:serve   # Serve the demo app
```

### Viewing Documentation Locally

```bash
npm run docs   # Starts docsify on http://localhost:3000
```

## Project Structure

```
ng-prism/
├── packages/
│   ├── ng-prism/              # Core library (@ng-prism/core)
│   │   └── src/
│   │       ├── decorator/     # @Showcase decorator + types
│   │       ├── plugin/        # Plugin API types, defineConfig()
│   │       ├── builder/       # Angular Builder (scanner, watcher, manifest)
│   │       ├── schematics/    # ng add schematic
│   │       └── app/           # Styleguide runtime app
│   ├── plugin-box-model/      # @ng-prism/plugin-box-model
│   ├── plugin-coverage/       # @ng-prism/plugin-coverage
│   ├── plugin-figma/          # @ng-prism/plugin-figma
│   ├── plugin-jsdoc/          # @ng-prism/plugin-jsdoc
│   └── plugin-perf/           # @ng-prism/plugin-perf
├── test-workspace/            # Integration test workspace
├── docs/                      # Documentation (docsify)
│   └── adr/                   # Architecture Decision Records
├── scripts/                   # Build & publish scripts
└── SPEC.md                    # Product specification (source of truth)
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feat/my-feature
```

Use a descriptive branch name with a prefix:

| Prefix       | Use for                      |
| ------------ | ---------------------------- |
| `feat/`      | New features                 |
| `fix/`       | Bug fixes                    |
| `refactor/`  | Code refactoring             |
| `docs/`      | Documentation changes        |
| `test/`      | Test additions or fixes      |
| `chore/`     | Maintenance, dependencies    |

### 2. Make Your Changes

- Work in small, focused increments
- Keep changes scoped to a single concern
- Run tests frequently

### 3. Run the Full Check Suite

```bash
npx nx test ng-prism         # Unit tests
npx nx lint ng-prism         # Linting
npx nx build ng-prism        # Build verification
```

For plugin work, also build and test the specific plugin:

```bash
npx nx test plugin-figma
npx nx build plugin-figma
```

### 4. Submit a Pull Request

Push your branch and open a PR against `main`. See [Pull Request Process](#pull-request-process) for details.

## Coding Standards

### Language

- **Code, filenames, identifiers:** English
- **Documentation:** English

### TypeScript

- Use `.js` extensions in all imports (ESM-compatible)
- Use `index.ts` barrel files for public API exports
- Avoid code comments unless they explain non-obvious logic
- Follow SOLID principles (SRP, OCP, LSP, ISP, DIP)

### Angular

- Use **standalone components** exclusively
- Use Signal-based APIs: `input()`, `output()`, `signal()`, `computed()`
- Do **not** use legacy `@Input()` / `@Output()` decorators
- Use `inject()` instead of constructor injection

### General

- No unnecessary abstractions for one-time operations
- No speculative code for hypothetical future requirements
- Prefer simple, readable code over clever solutions

## Testing

### Framework

Tests use **Jest 30** with **SWC** for fast TypeScript transformation.

### Conventions

- Test files are colocated with source: `foo.spec.ts` next to `foo.ts`
- Test fixtures go in `__fixtures__/` directories
- Test environment is `node` (not `jsdom`) unless specifically required

### Running Tests

```bash
# All tests for a package
npx nx test ng-prism

# Single test file
npx nx test ng-prism -- --testPathPatterns=scanner

# All packages
npx nx run-many -t test
```

### Writing Tests

- Test behavior, not implementation details
- Use descriptive test names that read as specifications
- Keep test fixtures minimal and focused

## Commit Guidelines

This project follows **Conventional Commits**.

### Format

```
<type>: <description>
```

### Types

| Type         | Description                                    |
| ------------ | ---------------------------------------------- |
| `feat`       | A new feature                                  |
| `fix`        | A bug fix                                      |
| `refactor`   | Code change that neither fixes a bug nor adds a feature |
| `docs`       | Documentation only changes                     |
| `test`       | Adding or correcting tests                     |
| `chore`      | Maintenance tasks, dependency updates          |
| `release`    | Version bump and release                       |

### Examples

```
feat: add buildInfo config option for version pill in header
fix: resolve tsconfig path aliases in manifest scanner
refactor: remove reflect-metadata from Showcase decorator
docs: update plugin API reference
```

### Rules

- Use the imperative mood ("add feature" not "added feature")
- Keep the first line under 72 characters
- Reference issues when applicable: `fix: resolve scanner crash (#42)`

## Pull Request Process

### Before Submitting

1. Ensure all tests pass: `npx nx test ng-prism`
2. Ensure linting passes: `npx nx lint ng-prism`
3. Ensure the build succeeds: `npx nx build ng-prism`
4. Update documentation in `docs/` if your change affects public APIs or behavior
5. Rebase on latest `main` if your branch has fallen behind

### PR Requirements

- **Title:** Follow the commit message format (`feat: ...`, `fix: ...`, etc.)
- **Description:** Explain _what_ changed and _why_
- **Scope:** Keep PRs focused — one feature or fix per PR
- **Tests:** Include tests for new functionality or bug fixes
- **Docs:** Update relevant documentation

### Review Process

- All PRs require review before merging
- CI must pass (lint, test, build via GitHub Actions)
- Address review feedback with new commits (don't force-push during review)

## Plugin Development

ng-prism has a plugin architecture. Plugins live under `packages/plugin-*/` and are published as `@ng-prism/plugin-*`.

### Creating a Plugin

1. Create a new package under `packages/plugin-<name>/`
2. Implement the `NgPrismPlugin` interface
3. Export a factory function (e.g., `myPlugin(options?)`)
4. Use lazy-loading for Angular components (`loadComponent` instead of `component`)

### Plugin Hooks

| Hook                 | Phase     | Purpose                                |
| -------------------- | --------- | -------------------------------------- |
| `onComponentScanned` | Build     | Enrich component metadata              |
| `onPageScanned`      | Build     | Modify or add pages                    |
| `wrapComponent`      | Runtime   | Wrap rendered components               |
| `panels`             | Runtime   | Add custom panels to the UI            |

### Plugin Conventions

- Use `peerDependencies` for Angular and ng-prism (never bundle them)
- Build with `ngc` and depend on `ng-prism:build`
- Keep runtime components lazy-loaded to avoid Node.js/browser conflicts
- Provide configuration through `@Showcase({ meta: { ... } })`

Refer to existing plugins (e.g., `plugin-figma`, `plugin-jsdoc`) as reference implementations.

## Reporting Issues

### Bug Reports

When filing a bug, please include:

- **ng-prism version** and **Angular version**
- **Steps to reproduce** the issue
- **Expected behavior** vs. **actual behavior**
- **Error messages** or stack traces if applicable
- **Minimal reproduction** (a GitHub repo or StackBlitz is ideal)

### Feature Requests

For feature requests, please describe:

- The **problem** you're trying to solve
- Your **proposed solution** (if you have one)
- Any **alternatives** you've considered

### Where to Report

Open an issue on the [GitHub repository](https://github.com/nicobrinkkemper/ng-prism/issues).

---

## License

By contributing to ng-prism, you agree that your contributions will be licensed under the [MIT License](LICENSE).
