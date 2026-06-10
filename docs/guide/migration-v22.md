# Migration to v22

`@ng-prism/core@22.0.0` moves the auto-generated `prism-manifest.ts` out of your source tree into a workspace-level cache directory and switches the import to a tsconfig path mapping. This is a **breaking change** — the previous layout will not work against the new pipeline.

> The upgrade is automated. Run `ng update @ng-prism/core` once and you are done. The rest of this page documents what the migration changes and how to perform the same edits manually if you can't use `ng update`.

## TL;DR — recommended upgrade

```bash
ng update @ng-prism/core
```

That's it. The Angular CLI will pull in `22.0.0`, run the migration schematic, and leave your workspace in the new layout. Manual `main.ts` customizations (component pages, zoneless setup, custom providers) are preserved — only the manifest import line is touched.

After the update, verify:

```bash
ng run my-lib:prism        # dev server still starts
ng run my-lib:prism-build  # production build still succeeds
```

You should see the manifest generated at `<workspaceRoot>/.ng-prism/<my-lib>-prism/prism-manifest.ts` (where `<my-lib>` is your library project name).

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
      "ng-prism.config": ["ng-prism.config.ts"],
      "my-lib": ["projects/my-lib/src/public-api.ts"],
+     "prism-manifest/*": [".ng-prism/*/prism-manifest.ts"]
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
"prism-manifest/*": [".ng-prism/*/prism-manifest.ts"]
```

So `from 'prism-manifest/test-lib-prism'` resolves to `.ng-prism/test-lib-prism/prism-manifest.ts`, and `from 'prism-manifest/test-ui-kit-prism'` resolves to `.ng-prism/test-ui-kit-prism/prism-manifest.ts`. Each project's `main.ts` imports its own specifier — no per-tsconfig.app.json overrides needed.

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
      "prism-manifest/*": [".ng-prism/*/prism-manifest.ts"]
    }
  }
}
```

This entry is a single line workspace-wide — it covers all prism projects via the `*` wildcard.

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
