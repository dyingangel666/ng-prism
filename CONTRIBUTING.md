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

### First-Time Setup

This walkthrough takes a fresh clone to a fully running test workspace. Follow each step in order.

#### 1. Clone and install root dependencies

```bash
git clone https://github.com/<your-username>/ng-prism.git
cd ng-prism
npm install
```

`npm install` activates **npm workspaces** under `packages/*` and installs all monorepo dev dependencies (Nx, Angular SDK, Jest, etc.).

#### 2. Verify the core builds and tests

```bash
npx nx build ng-prism       # Build the core package
npx nx test ng-prism        # Run tests
npx nx lint ng-prism        # Lint
```

All three should complete without errors. If any fail, fix the environment before continuing — the test-workspace setup depends on a working core build.

#### 3. Start the local registry (separate terminal)

The `test-workspace/` resolves transitive dependencies through a local **Verdaccio** registry. Open a **second terminal** and keep it running:

```bash
npx nx run ng-prism-workspace:local-registry
```

Wait until `http address - http://localhost:4873/` appears. This terminal stays open for the entire dev session.

Why Verdaccio? See [Why a local registry?](#why-a-local-registry) below.

#### 4. Install and bootstrap the test workspace

Back in your **first terminal**:

```bash
npm run test:workspace:install
```

This does two things:
- `npm install` inside `test-workspace/` (resolves `@ng-prism/*` via `file:` links, everything else via Verdaccio → proxied to npmjs.org)
- Creates `ng-prism.config.ts` from `ng-prism.config.example.ts` if it doesn't exist (the actual config file is gitignored)

#### 5. Run the demo

```bash
npm run test:workspace:serve
```

The Prism dev server starts on `http://localhost:4400`. Open it to verify your setup works end-to-end.

You're done — your local setup is ready for development.

## Development Setup

ng-prism is an **Nx 22 monorepo** using **npm workspaces**. All packages live under `packages/`.

### Key Dependencies

| Dependency       | Version | Purpose                              |
| ---------------- | ------- | ------------------------------------ |
| Angular          | 21      | Framework                            |
| TypeScript       | 5.9     | Language                             |
| Nx               | 22      | Monorepo tooling, task orchestration |
| Jest + SWC       | 30      | Testing                              |

### Test Workspace

The `test-workspace/` directory is a real Angular workspace used as a live demo and integration test target for the local `@ng-prism/*` packages (linked via `file:../packages/*`).

#### Why a local registry?

`test-workspace/` resolves transitive dependencies through a local **Verdaccio** registry (`http://localhost:4873`). This serves two purposes:

1. **Isolated transitive resolution** — Angular and other transitive deps of the in-repo packages are fetched through Verdaccio, which proxies to `https://registry.npmjs.org/` for unknown packages (see `.verdaccio/config.yml`).
2. **No global config pollution** — `test-workspace/.npmrc` pins the registry to `localhost:4873` for this directory only. Your global `~/.npmrc` (e.g. a corporate registry) stays untouched. The `local-registry` Nx target also passes `location: none` so Verdaccio itself leaves your global config alone.

#### The `ng-prism.config.ts` file

`test-workspace/ng-prism.config.ts` configures plugins, theme, and other Prism options. It is **gitignored** because it is environment/setup specific — the schematic that ships with `@ng-prism/core` creates a minimal version, and contributors may add or remove plugins as they like.

`test-workspace/ng-prism.config.example.ts` is **committed** as a reference. It enables all five official plugins (figma, jsdoc, perf, coverage, box-model). The `test:workspace:install` script copies it to `ng-prism.config.ts` on first run if the latter doesn't exist.

#### Scripts reference

| Script                       | Purpose                                                                 |
| ---------------------------- | ----------------------------------------------------------------------- |
| `test:workspace:setup`       | Build `ng-prism` core (skip-nx-cache) — prerequisite for serve/build    |
| `test:workspace:install`     | `npm install` inside `test-workspace/` and copy `ng-prism.config.example.ts` → `ng-prism.config.ts` if missing. Requires Verdaccio running. |
| `test:workspace:serve`       | Start the Prism dev server on `http://localhost:4400`                   |
| `test:workspace:build`       | Production build of the Prism app                                       |
| `test:workspace:kill`        | Free port 4400 if a previous serve crashed                              |
| `test:workspace:clean`       | **Destructive.** Removes `test-workspace/node_modules`, `package-lock.json`, `ng-prism.config.ts` and reverts `angular.json` + `package.json` to git state. Use only for a full re-setup. |
| `test:workspace:reset`       | `clean` + `setup` + `install` in one. Use after a broken state. Requires Verdaccio running. |

#### Common workflows

**Iterating on `packages/ng-prism/` while serving the demo:**

```bash
# Terminal A (keep running): Verdaccio
npx nx run ng-prism-workspace:local-registry

# Terminal B: rebuild core after edits, then restart serve
npm run test:workspace:setup
npm run test:workspace:serve
```

**Pulled latest `main` and something broke:**

```bash
# Terminal A: Verdaccio running
npm run test:workspace:reset
npm run test:workspace:serve
```

**Accidentally ran `test:workspace:clean`:**

Same as above — `npm run test:workspace:reset` puts the workspace back into a runnable state.

#### Troubleshooting

| Symptom                                                                                | Likely cause + fix                                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install` (in test-workspace) hangs indefinitely with a spinner                    | Verdaccio is not running. Start it: `npx nx run ng-prism-workspace:local-registry`.                                                                                            |
| `Cannot find module '@angular-devkit/build-angular/package.json'` on serve             | `test-workspace/node_modules` is missing. Run `npm run test:workspace:install`.                                                                                                |
| `Angular compilation initialization failed. Error: Debug Failure` on serve             | `ng-prism.config.ts` is missing. Copy the example: `cp test-workspace/ng-prism.config.example.ts test-workspace/ng-prism.config.ts`, or run `npm run test:workspace:install`. |
| `EPERM open ~/.npmrc` when starting Verdaccio                                          | Nx tried to mutate your global config. The `local-registry` target in root `package.json` should have `"location": "none"` — verify it.                                       |
| Changes in `packages/ng-prism/` not picked up in the test workspace                    | Re-run `npm run test:workspace:setup` to rebuild the core, then restart serve.                                                                                                |
| Port 4400 already in use                                                               | `npm run test:workspace:kill`.                                                                                                                                                |

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
