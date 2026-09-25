## What & Why

<!--
What does this change, and what problem does it solve? Link the issue if there
is one: "Closes #42". If there is no issue, the description is the only context
a reviewer gets — make it count.
-->

## Type of Change

<!-- Match the PR title prefix. See CONTRIBUTING.md → Commit Guidelines. -->

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — no behaviour change
- [ ] `docs` — documentation only
- [ ] `test` — tests only
- [ ] `chore` — maintenance, dependencies

## Affected Packages

- [ ] `@ng-prism/core`
- [ ] Plugin(s): <!-- name them -->
- [ ] Builder / schematics
- [ ] Documentation (`docs/`)

## Breaking Change

- [ ] No
- [ ] Yes — described below, with the migration path for consumers

<!--
ng-prism majors track Angular majors. A breaking change inside the current
Angular major ships as a minor release, so the migration notes matter.
-->

## How Was This Verified?

<!--
Beyond `npm run check`: what did you actually run? Which showcase or variant did
you look at in the test workspace? Screenshots help for anything UI-facing.
-->

## Checklist

- [ ] `npm run check` passes clean (format, test, build, typecheck — same gate as CI)
- [ ] PR title follows the conventional commit format (`feat: …`, `fix: …`, …)
- [ ] Tests cover the new behaviour or the fixed bug
- [ ] Docs under `docs/` are updated if public API or behaviour changed
- [ ] New components use signal APIs (`input()` / `output()`) and `inject()`
- [ ] Any new plugin runtime components are lazy-loaded (`loadComponent`)
