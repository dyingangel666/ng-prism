# Migration to v22

`@ng-prism/core@22.0.0` moves the auto-generated `prism-manifest.ts` out of your source tree into a workspace-level cache directory and switches the import to a tsconfig path mapping. This is a **breaking change** — the previous layout will not work against the new pipeline.

> **This guide is for existing ng-prism installations** being upgraded from `21.x` to `22.x`. If you have not used ng-prism in this workspace before, you want a fresh install instead — see [Installation & Setup](installation.md).

## Prerequisites

- Angular CLI **22+** in your workspace. The migration schematic is shipped as ESM; older CLI versions silently skip it or report "package does not provide any `ng add` actions". Run `ng version` to check.
- Node.js **22+** (Angular CLI 22 requirement).

## TL;DR — upgrade an existing 21.x install

Update **core AND every installed `@ng-prism/plugin-*` in a single call** so peer dependencies resolve together. While `22.0.0` is in beta, use the `@beta` dist-tag:

```bash
ng update @ng-prism/core@beta \
  @ng-prism/plugin-box-model@beta \
  @ng-prism/plugin-coverage@beta \
  @ng-prism/plugin-figma@beta \
  @ng-prism/plugin-jsdoc@beta \
  @ng-prism/plugin-perf@beta
```

Drop any plugins you don't have installed. Once `22.0.0` stable is published, the `@beta` suffix can be omitted:

```bash
ng update @ng-prism/core @ng-prism/plugin-box-model @ng-prism/plugin-coverage \
  @ng-prism/plugin-figma @ng-prism/plugin-jsdoc @ng-prism/plugin-perf
```

The Angular CLI will pull in the new versions, run the migration schematic, and leave your workspace in the new layout. Manual `main.ts` customizations (component pages, zoneless setup, custom providers) are preserved — only the manifest import line is touched.

> **Why core + plugins together?** Each plugin declares `@ng-prism/core` as a peer dependency pinned to its major. If you update core to `22` without bumping plugins, npm rejects the install with a peer-dependency conflict. Bundling them in one `ng update` call lets the CLI resolve the whole set at once.

If you see peer-dependency warnings about `@angular-devkit/architect`, `@angular-devkit/core`, or `@angular-devkit/schematics`, those packages are available transitively via `@angular/cli` / `@angular-devkit/build-angular` in any Angular workspace. The warning is npm being strict about direct declarations — add `--force` to acknowledge:

```bash
ng update @ng-prism/core@beta @ng-prism/plugin-...@beta --force
```

After the update, verify:

```bash
ng run my-lib:prism        # dev server still starts
ng run my-lib:prism-build  # production build still succeeds
```

You should see the manifest generated at `<workspaceRoot>/.ng-prism/<my-lib>-prism/prism-manifest.ts` (where `<my-lib>` is your library project name).

## Troubleshooting

**`ng update` says "Package '@ng-prism/core' does not exist within the registry"**

You probably used `--next=true`. That flag looks for a `next` dist-tag specifically; ng-prism uses `beta` instead. Use `@beta` (or pin the explicit version) as shown above.

**`ng update` says "already up to date"**

You don't have an older ng-prism installed — there is nothing to migrate. If you intended a fresh install, use `ng add @ng-prism/core@beta` (see [Installation & Setup](installation.md)). If `ng add` reports "Package does not provide any `ng add` actions", run the schematic directly:

```bash
ng generate @ng-prism/core:ng-add --project=<your-library>
```

(Replace `<your-library>` with the name of your Angular library project from `angular.json`.)

**`ng update` runs but my `main.ts` and `tsconfig.json` look unchanged**

Confirm your Angular CLI is on version 22 or newer (`ng version`). ng-prism's schematics are ESM modules; older CLI versions cannot load them and may skip them silently. Upgrade CLI first:

```bash
ng update @angular/cli @angular/core --next
```

Then re-run the ng-prism migration.

**`ng update` fails with "Incompatible peer dependencies found"**

You probably bumped `@ng-prism/core` without also bumping the plugin packages (which still pin to the previous major). Re-run the combined update above so core and every installed `@ng-prism/plugin-*` move in lockstep.

## What the migration does

The migration schematic runs four steps per prism project found in your `angular.json`, plus one workspace-level step:

### 1. Rewrites `main.ts` import

```diff
- import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
+ import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/<lib>-prism';
```

The new specifier is project-specific (it ends with your prism project name). This is what makes multi-project workspaces coexist cleanly — see the [wildcard mapping section](#wildcard-path-mapping) below.

The regex tolerates whitespace and quote-style variations and is anchored to line-start, so commented-out lines (`// import ...`) are left untouched.

### 2. Adds a wildcard path mapping to `tsconfig.json`

```diff
  "compilerOptions": {
    "paths": {
      "ng-prism.config": ["./ng-prism.config.ts"],
      "my-lib": ["./projects/my-lib/src/public-api.ts"],
+     "prism-manifest/*": ["./.ng-prism/*/prism-manifest.ts"]
    }
  }
```

### 3. Deletes the legacy in-tree manifest

```
- projects/<lib>-prism/src/prism-manifest.ts
```

(If you previously committed the file by accident, `git status` will show it as deleted after the migration — stage the deletion as part of your migration commit.)

### 4. Removes the stale `.gitignore` entry

```diff
- projects/<lib>-prism/src/prism-manifest.ts
```

### 5. Adds a single workspace-wide ignore (runs once, not per project)

```diff
+ .ng-prism/
```

## Wildcard path mapping

If you have **multiple prism projects** in the same workspace, the wildcard mapping resolves each one to its own cache file:

```jsonc
"prism-manifest/*": ["./.ng-prism/*/prism-manifest.ts"]
```

So `from 'prism-manifest/test-lib-prism'` resolves to `./.ng-prism/test-lib-prism/prism-manifest.ts`, and `from 'prism-manifest/test-ui-kit-prism'` resolves to `./.ng-prism/test-ui-kit-prism/prism-manifest.ts`. Each project's `main.ts` imports its own specifier — no per-tsconfig.app.json overrides needed.

## Manual migration

If you can't use `ng update` (e.g., locked CLI version, vendored dependencies), apply the same edits by hand. For each prism project in your `angular.json`:

### Step 1 — Edit `projects/<lib>-prism/src/main.ts`

Change the import line:

```diff
- import { PRISM_RUNTIME_MANIFEST } from './prism-manifest';
+ import { PRISM_RUNTIME_MANIFEST } from 'prism-manifest/<lib>-prism';
```

Replace `<lib>-prism` with the actual prism project name (the value of `prismProject` in your `@ng-prism/core:serve` builder options, typically `<library-name>-prism`).

### Step 2 — Edit `tsconfig.json`

Add the wildcard mapping under `compilerOptions.paths`:

```jsonc
{
  "compilerOptions": {
    "paths": {
      // ... your existing mappings ...
      "prism-manifest/*": ["./.ng-prism/*/prism-manifest.ts"]
    }
  }
}
```

This entry is a single line workspace-wide — it covers all prism projects via the `*` wildcard. The leading `./` is required for TypeScript 6 when `baseUrl` is not set.

### Step 3 — Delete the legacy manifest file

```bash
rm projects/<lib>-prism/src/prism-manifest.ts
```

Plus the `.d.ts` companion if it exists:

```bash
rm projects/<lib>-prism/src/prism-manifest.d.ts
```

### Step 4 — Update `.gitignore`

Remove any per-project manifest lines:

```diff
- projects/<lib>-prism/src/prism-manifest.ts
```

Add a single workspace-wide ignore:

```diff
+ .ng-prism/
```

### Step 5 — Run a build to populate the cache

```bash
ng run my-lib:prism-build
```

The pipeline will generate `<workspaceRoot>/.ng-prism/<lib>-prism/prism-manifest.ts` on first run. The Angular bundle should compile cleanly.

## What if I skip the migration?

If you upgrade to `@ng-prism/core@22.0.0` and **don't** run `ng update` or apply the manual steps, expect one of two outcomes:

- **Stale `src/prism-manifest.ts` still present** (the file was previously generated): your `main.ts` still imports the old file via the relative path. The build succeeds, but you are reading **stale data** — components added since the last pipeline run won't appear in your styleguide. Run `ng update @ng-prism/core` to fix.
- **Old file deleted** (e.g., wiped by `git clean -fdx`): TypeScript fails with `Cannot find module './prism-manifest'`. Clear signal — apply the migration.

In either case, the fix is the same: run `ng update @ng-prism/core` or follow the manual steps above.

## Angular version compatibility

`@ng-prism/core@22.0.0` supports **Angular 20, 21, and 22** in a single release (peerDependency `>=20.0.0`). You do not need to be on Angular 22 to upgrade — if you're on 20 or 21, the manifest cache-dir migration is independent of your Angular major.

## `cacheDir` builder option

A new optional `cacheDir` option on both `@ng-prism/core:serve` and `@ng-prism/core:build` lets you override the default cache directory. Useful for CI sandboxes with constrained filesystem layouts or non-standard workspace setups.

```json
{
  "architect": {
    "prism": {
      "builder": "@ng-prism/core:serve",
      "options": {
        "entryPoint": "projects/my-lib",
        "prismProject": "my-lib-prism",
        "cacheDir": "tmp/prism-cache"
      }
    }
  }
}
```

Relative paths resolve against `workspaceRoot`. If you set this option, also update the tsconfig path mapping target accordingly.

## Related

- ADR 006: [`prism-manifest.ts` lebt in `.ng-prism/`](../adr/006-manifest-cache-dir.md)
- Issue [#13](https://github.com/dyingangel666/ng-prism/issues/13)
- Follow-up RFC [#14](https://github.com/dyingangel666/ng-prism/issues/14) — drop the separate `<lib>-prism` project entirely
