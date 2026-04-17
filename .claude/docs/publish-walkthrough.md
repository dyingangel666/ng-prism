# ng-prism: Publishing Walkthrough

Step-by-step Anleitung vom GitHub Repo bis zum npm Publish.

---

## Phase 1: GitHub Repository erstellen

### 1.1 Repo auf GitHub anlegen

1. Gehe zu https://github.com/new
2. Einstellungen:
   - **Repository name:** `ng-prism`
   - **Description:** `Lightweight Angular-native component showcase — no story files needed.`
   - **Visibility:** Public (für npm Open Source) oder Private (für internes npm-Registry)
   - **Initialize:** NICHTS ankreuzen (kein README, kein .gitignore, keine License) — wir pushen ein existierendes Repo
3. **Create repository** klicken

### 1.2 Remote hinzufügen und pushen

```bash
cd /Users/alexanderspies/source/javascript/ng-prism

# Remote setzen (ersetze USERNAME mit deinem GitHub User/Org)
git remote add origin git@github.com:USERNAME/ng-prism.git

# Verify
git remote -v

# Push alles
git push -u origin main
```

### 1.3 Repository Settings

Nach dem Push in GitHub → Settings:

**General:**
- Features: ✅ Issues, ✅ Discussions (optional, für Community Q&A)
- Merge button: ✅ Squash merging (empfohlen für saubere History)

**Branches:**
- Default branch: `main`
- Branch protection rule für `main`:
  - ✅ Require pull request before merging (optional, wenn Team > 1)
  - ✅ Require status checks to pass before merging (wenn CI existiert)

**Pages (für Dokumentation):**
- Source: Deploy from a branch
- Branch: `main`
- Folder: `/docs`
- Save → Docs sind erreichbar unter `https://USERNAME.github.io/ng-prism/`

---

## Phase 2: package.json vorbereiten

### 2.1 Core Package `ng-prism`

In `packages/ng-prism/package.json`:

```json
{
  "name": "ng-prism",
  "version": "21.0.0",
  "description": "Lightweight Angular-native component showcase — no story files needed.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/USERNAME/ng-prism.git",
    "directory": "packages/ng-prism"
  },
  "homepage": "https://USERNAME.github.io/ng-prism/",
  "bugs": "https://github.com/USERNAME/ng-prism/issues",
  "keywords": [
    "angular",
    "storybook-alternative",
    "component-library",
    "styleguide",
    "showcase",
    "component-documentation",
    "angular-signals"
  ]
}
```

**Prüfe:** `repository.url`, `homepage`, `bugs` müssen auf dein echtes Repo zeigen.

### 2.2 Plugin Packages `@ng-prism/plugin-*`

Jedes Plugin-Package braucht die gleichen Felder. Prüfe für jedes:

```bash
# Prüfe alle Plugins auf einmal
for pkg in packages/plugin-*/package.json; do
  echo "=== $(dirname $pkg) ==="
  node -e "const p=require('./$pkg'); console.log('name:', p.name, '| version:', p.version, '| license:', p.license ?? 'MISSING')"
done
```

Jedes Plugin sollte haben:
- `"license": "MIT"`
- `"repository"` mit korrektem `directory`-Pfad
- `"homepage"` und `"bugs"`

### 2.3 npm Scope `@ng-prism` registrieren

Die Plugins nutzen den Scope `@ng-prism`. Du musst ihn auf npm registrieren:

1. Gehe zu https://www.npmjs.com/org/create
2. **Org name:** `ng-prism`
3. **Plan:** Free (Open Source)
4. Create

Falls `@ng-prism` bereits vergeben ist, musst du einen anderen Scope wählen und alle `package.json` anpassen.

---

## Phase 3: npm Login

### 3.1 npm Account erstellen (falls noch nicht vorhanden)

1. https://www.npmjs.com/signup
2. E-Mail verifizieren
3. 2FA aktivieren (empfohlen, npm verlangt es für Publishing)

### 3.2 Login im Terminal

```bash
npm login
```

Folge den Prompts (Username, Password, Email, OTP falls 2FA aktiv).

Verify:

```bash
npm whoami
# → dein username
```

---

## Phase 4: Build & Publish vorbereiten

### 4.1 Alle Packages bauen

```bash
cd /Users/alexanderspies/source/javascript/ng-prism

# Core zuerst (Plugins hängen davon ab)
npx nx build ng-prism

# Plugins
npx nx run-many -t build --projects=plugin-*
```

### 4.2 Build-Output prüfen

```bash
# Core
ls packages/ng-prism/dist/
# Sollte enthalten: esm2022/, fesm2022/, package.json, *.d.ts, etc.

# Ein Plugin exemplarisch
ls packages/plugin-jsdoc/dist/
```

### 4.3 Dry Run — was würde publisht?

```bash
# Core
cd packages/ng-prism/dist
npm pack --dry-run
# Zeigt alle Dateien die im Tarball landen würden

# Plugin
cd ../../plugin-jsdoc/dist
npm pack --dry-run

cd /Users/alexanderspies/source/javascript/ng-prism
```

**Prüfe:**
- Sind `dist/` Dateien enthalten (nicht `src/`)?
- Ist `package.json` enthalten?
- Keine `.spec.ts` Files oder Test-Fixtures?

### 4.4 .npmignore prüfen

Falls du Files aus dem Publish ausschließen willst, erstelle `.npmignore` in jedem Package:

```
# packages/ng-prism/.npmignore
src/
*.spec.ts
__fixtures__/
jest.config.*
tsconfig.*
```

Alternativ: `"files"` Array in `package.json` (whitelist-Ansatz, sicherer):

```json
{
  "files": [
    "dist/",
    "schematics/",
    "builders.json",
    "collection.json",
    "README.md",
    "LICENSE"
  ]
}
```

---

## Phase 5: Erster Publish

### 5.1 Core Package publishen

```bash
cd packages/ng-prism/dist

# Erster Publish (--access public nötig für scoped UND unscoped erstmalig)
npm publish --access public

cd /Users/alexanderspies/source/javascript/ng-prism
```

Verify: https://www.npmjs.com/package/ng-prism

### 5.2 Plugin Packages publishen

```bash
# Jedes Plugin einzeln
for plugin in packages/plugin-*/dist; do
  echo "Publishing $(basename $(dirname $plugin))..."
  cd "$plugin"
  npm publish --access public
  cd /Users/alexanderspies/source/javascript/ng-prism
done
```

Verify: https://www.npmjs.com/org/ng-prism

### 5.3 Verify Installation

In einem frischen Projekt testen:

```bash
mkdir /tmp/ng-prism-test && cd /tmp/ng-prism-test
npm init -y
npm install ng-prism @ng-prism/plugin-jsdoc

# Prüfe ob alles da ist
ls node_modules/ng-prism/
ls node_modules/@ng-prism/plugin-jsdoc/
```

---

## Phase 6: GitHub Release erstellen

### 6.1 Git Tag setzen

```bash
cd /Users/alexanderspies/source/javascript/ng-prism

# Tag für die Version
git tag v21.0.0 -m "Release v21.0.0"

# Push Tag
git push origin v21.0.0
```

### 6.2 GitHub Release erstellen

1. Gehe zu `https://github.com/USERNAME/ng-prism/releases/new`
2. **Tag:** `v21.0.0` (den gerade gepushten)
3. **Release title:** `v21.0.0`
4. **Description:** Release Notes schreiben:

```markdown
## ng-prism v21.0.0

First public release of ng-prism — lightweight, Angular-native component showcase.

### Highlights

- **@Showcase decorator** — annotate components directly, no story files
- **TypeScript Compiler API scanner** — auto-discovers components at build time
- **Signal-native** — full support for `input()` / `output()` signals
- **Directive support** — showcase directives with configurable host elements
- **Component Pages** — free-form demo pages for complex components
- **Plugin architecture** — JSDoc, A11y, Figma, Box Model, Performance plugins
- **Live Controls** — auto-generated input controls with type-aware editors
- **Code Snippets** — live-updating Angular template snippets per variant
- **URL state sync** — deep-linking and state persistence across reloads
- **Themeable** — full CSS custom property system, replaceable UI sections

### Official Plugins

| Package | Description |
|---|---|
| `@ng-prism/plugin-jsdoc` | API documentation from JSDoc comments |
| `@ng-prism/plugin-a11y` | axe-core accessibility audit per variant |
| `@ng-prism/plugin-figma` | Figma design embed + visual diff |
| `@ng-prism/plugin-box-model` | CSS box model inspector overlay |
| `@ng-prism/plugin-perf` | Render performance profiling |

### Requirements

- Angular >= 21
- TypeScript >= 5.9
- Components must use `input()` / `output()` signals

### Documentation

https://USERNAME.github.io/ng-prism/
```

5. **Pre-release:** Nicht ankreuzen (es sei denn du willst es als Beta taggen)
6. **Publish release**

---

## Phase 7: Zukünftige Releases

### 7.1 Versionierung

ng-prism folgt Angular-Version-Alignment: `ng-prism@21.x` für Angular 21.

Für Patches/Features innerhalb einer Major:

```bash
# Patch (bug fixes)
npm version patch -w packages/ng-prism    # 21.0.0 → 21.0.1

# Minor (new features, backward compatible)
npm version minor -w packages/ng-prism    # 21.0.1 → 21.1.0
```

### 7.2 Alle Packages synchron halten

Alle Packages (core + plugins) sollten die gleiche Version haben:

```bash
# Version in allen Packages setzen
VERSION=21.1.0
for pkg in packages/ng-prism packages/plugin-*; do
  node -e "const p=require('./$pkg/package.json'); p.version='$VERSION'; require('fs').writeFileSync('./$pkg/package.json', JSON.stringify(p, null, 2)+'\n')"
done

git add -A && git commit -m "chore: bump version to $VERSION"
```

### 7.3 Release-Workflow

```bash
# 1. Sicherstellen dass main sauber ist
git checkout main
git pull

# 2. Tests + Build
npx nx run-many -t test,build

# 3. Version bump (alle Packages)
VERSION=21.1.0
# ... (wie oben)

# 4. Commit + Tag
git add -A
git commit -m "release: v$VERSION"
git tag "v$VERSION" -m "Release v$VERSION"
git push && git push --tags

# 5. Publish
cd packages/ng-prism/dist && npm publish && cd -
for plugin in packages/plugin-*/dist; do cd "$plugin" && npm publish && cd -; done

# 6. GitHub Release erstellen (manuell oder via gh CLI)
gh release create "v$VERSION" --title "v$VERSION" --notes "Release notes here"
```

### 7.4 Optional: Automatisierung mit GitHub Actions

Für automatisches Publishing bei Tag-Push, erstelle `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org

      - run: npm ci
      - run: npx nx run-many -t test,build

      - run: cd packages/ng-prism/dist && npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - run: |
          for plugin in packages/plugin-*/dist; do
            cd "$plugin" && npm publish --provenance --access public && cd -
          done
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Dafür brauchst du:
1. npm Access Token erstellen: https://www.npmjs.com/settings/USERNAME/tokens → Generate New Token → Automation
2. In GitHub Repo: Settings → Secrets → Actions → New secret → Name: `NPM_TOKEN`, Value: der Token

---

## Checkliste vor dem ersten Publish

- [ ] GitHub Repo erstellt und Remote gesetzt
- [ ] `repository.url` in allen `package.json` zeigt auf echtes Repo
- [ ] `homepage` und `bugs` URLs korrekt
- [ ] `npm whoami` zeigt deinen Username
- [ ] `@ng-prism` Scope auf npm registriert (für Plugins)
- [ ] LICENSE File existiert im Root und in jedem Package
- [ ] README.md im Core Package ist aktuell
- [ ] Alle Tests grün: `npx nx run-many -t test`
- [ ] Alle Builds grün: `npx nx run-many -t build`
- [ ] `npm pack --dry-run` zeigt nur gewünschte Files
- [ ] Keine Secrets (.env, Tokens) in den publishten Dateien
- [ ] Git History sauber (keine riesigen Binaries committed)
- [ ] GitHub Pages aktiviert (Settings → Pages → /docs)
- [ ] Docs-Site erreichbar und vollständig

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| `npm ERR! 403 Forbidden` | Scope `@ng-prism` nicht registriert, oder `--access public` vergessen |
| `npm ERR! 402 Payment Required` | Private Package auf Free Plan — `--access public` hinzufügen |
| `npm ERR! ENEEDAUTH` | `npm login` nicht ausgeführt |
| Package Name bereits vergeben | Anderen Namen wählen oder beim npm Support anfragen |
| `Cannot find module 'ng-prism'` nach Install | Prüfe ob `dist/` korrekt gebaut wurde und `main`/`exports` in package.json stimmen |
| GitHub Pages zeigt 404 | Branch und Folder korrekt unter Settings → Pages konfiguriert? |
| Tag bereits existiert | `git tag -d v21.0.0 && git push origin :refs/tags/v21.0.0` zum Löschen, dann neu erstellen |
