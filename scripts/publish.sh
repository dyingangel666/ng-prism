#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PACKAGES=(
  "packages/ng-prism"
  "packages/plugin-box-model"
  "packages/plugin-figma"
  "packages/plugin-jsdoc"
  "packages/plugin-perf"
)

# ─── Colors ───
VIOLET='\033[0;35m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

info()  { echo -e "${BLUE}▸${RESET} $1" >&2; }
ok()    { echo -e "${GREEN}✔${RESET} $1" >&2; }
warn()  { echo -e "${YELLOW}⚠${RESET} $1" >&2; }
err()   { echo -e "${RED}✘${RESET} $1" >&2; }
header(){ echo -e "\n${VIOLET}━━━ $1 ━━━${RESET}\n" >&2; }

# ─── Current version ───
current_version() {
  node -e "console.log(require('./packages/ng-prism/package.json').version)"
}

# ─── Menu ───
show_menu() {
  local version
  version=$(current_version)

  echo -e "\n${VIOLET}◈ ng-prism publish${RESET}  ${DIM}v${version}${RESET}\n"
  echo "  1) Patch release    (bug fixes)"
  echo "  2) Minor release    (new features, backward compatible)"
  echo "  3) Major release    (breaking changes, Angular version bump)"
  echo "  4) Publish current  (no version bump, just build + publish)"
  echo "  5) Dry run          (build + pack, no publish)"
  echo ""
  echo -e "  ${DIM}0) Exit${RESET}"
  echo ""
}

# ─── Bump version across all packages ───
bump_version() {
  local bump_type="$1"
  local old_version new_version

  old_version=$(current_version)

  case "$bump_type" in
    patch) new_version=$(node -e "const [a,b,c]=process.argv[1].split('.'); console.log([a,b,+c+1].join('.'))" "$old_version") ;;
    minor) new_version=$(node -e "const [a,b]=process.argv[1].split('.'); console.log([a,+b+1,0].join('.'))" "$old_version") ;;
    major) new_version=$(node -e "const [a]=process.argv[1].split('.'); console.log([+a+1,0,0].join('.'))" "$old_version") ;;
  esac

  header "Bumping $old_version → $new_version"

  for pkg in "${PACKAGES[@]}"; do
    node -e "
      const fs = require('fs');
      const path = './$pkg/package.json';
      const p = JSON.parse(fs.readFileSync(path, 'utf-8'));
      p.version = '$new_version';
      fs.writeFileSync(path, JSON.stringify(p, null, 2) + '\n');
    "
    info "$(basename "$pkg") → $new_version"
  done

  ok "All packages bumped to $new_version"
  echo "$new_version"
}

# ─── Checks ───
preflight_checks() {
  header "Preflight checks"

  if ! npm whoami --userconfig=.npmrc &>/dev/null; then
    warn "Not logged in to npm"
    echo ""
    read -rp "  Run npm login? (y/n) " answer
    if [[ "$answer" == "y" ]]; then
      npm login --userconfig=.npmrc
    else
      err "Cannot publish without npm login"
      exit 1
    fi
  fi
  ok "npm authenticated as $(npm whoami --userconfig=.npmrc)"

  if [[ -n "$(git status --porcelain)" ]]; then
    warn "Working directory has uncommitted changes"
    git status --short
    echo ""
    read -rp "  Continue anyway? (y/n) " answer
    [[ "$answer" != "y" ]] && exit 1
  else
    ok "Working directory clean"
  fi
}

# ─── Tests ───
run_tests() {
  header "Running tests"
  npx nx test ng-prism 2>&1 | tail -3
  ok "Tests passed"
}

# ─── Build ───
build_all() {
  header "Building all packages"

  info "Building @ng-prism/core..."
  npx nx build ng-prism 2>&1 | tail -1

  info "Building plugins..."
  npx nx run-many -t build --projects='plugin-box-model,plugin-figma,plugin-jsdoc,plugin-perf' 2>&1 | tail -1

  ok "All packages built"
}

# ─── Dry run ───
dry_run() {
  header "Dry run — checking package contents"

  for pkg in "${PACKAGES[@]}"; do
    local name
    name=$(node -e "console.log(require('./$pkg/package.json').name)")
    echo -e "\n${DIM}─── $name ───${RESET}"
    cd "$pkg"
    npm pack --dry-run 2>&1 | grep "total files"
    cd "$ROOT_DIR"
  done
}

# ─── Publish ───
publish_all() {
  header "Publishing to npm"

  for pkg in "${PACKAGES[@]}"; do
    local name version
    name=$(node -e "console.log(require('./$pkg/package.json').name)")
    version=$(node -e "console.log(require('./$pkg/package.json').version)")

    info "Publishing $name@$version..."
    cd "$pkg"
    npm publish --access public --userconfig="$ROOT_DIR/.npmrc"
    cd "$ROOT_DIR"
    ok "$name@$version published"
  done
}

# ─── Git tag + push ���──
tag_and_push() {
  local version="$1"

  header "Git tag + push"

  git add -A
  git commit -m "release: v$version" || true
  git tag "v$version" -m "Release v$version"

  echo ""
  read -rp "  Push to origin? (y/n) " answer
  if [[ "$answer" == "y" ]]; then
    git push origin main --tags
    ok "Pushed v$version to origin"
  else
    warn "Skipped push. Run manually: git push origin main --tags"
  fi
}

# ─── Main ───
main() {
  show_menu
  read -rp "  Select: " choice

  case "$choice" in
    1|2|3)
      local bump_type
      case "$choice" in
        1) bump_type="patch" ;;
        2) bump_type="minor" ;;
        3) bump_type="major" ;;
      esac

      preflight_checks
      local new_version
      new_version=$(bump_version "$bump_type")
      run_tests
      build_all
      dry_run

      echo ""
      read -rp "  Ready to publish v$new_version? (y/n) " answer
      [[ "$answer" != "y" ]] && { warn "Aborted."; exit 0; }

      publish_all
      tag_and_push "$new_version"

      echo ""
      ok "Release v$new_version complete!"
      echo -e "  ${DIM}https://www.npmjs.com/package/@ng-prism/core${RESET}"
      ;;

    4)
      preflight_checks
      build_all
      publish_all
      ok "Published current version $(current_version)"
      ;;

    5)
      build_all
      dry_run
      ok "Dry run complete — nothing published"
      ;;

    0)
      exit 0
      ;;

    *)
      err "Invalid choice"
      exit 1
      ;;
  esac
}

main
