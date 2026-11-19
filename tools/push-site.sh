#!/bin/sh
# Put the website on the web (GitHub Pages), from the PUBLIC repository.
#
#   tools/push-site.sh                      builds it, then publishes it
#   tools/push-site.sh --build-only         builds and checks it, publishes nothing
#
# It builds the site fresh (tools/build-site.mjs: only tracked files, the starter family,
# and a look through the copy for the real family's names), then pushes that copy as the
# ONLY content of the gh-pages branch of the public repository and switches Pages on.
# It refuses to go on if the leak check finds anything, or if the repository is private.
#
# Run it only after the owner has said yes to going public (see HANDOFF.md).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${REPO:-its837/awesome-workout-world}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

node "$ROOT/tools/build-site.mjs" "$TMP/site"
[ "${1:-}" = "--build-only" ] && { echo "Built and checked. Nothing was published."; exit 0; }

VIS="$(gh repo view "$REPO" --json visibility -q .visibility 2>/dev/null || echo unknown)"
[ "$VIS" = "PUBLIC" ] || { echo "$REPO is not public ($VIS). GitHub's free pages need a public repository. Stopping."; exit 1; }

cd "$TMP/site"
git init -q -b gh-pages
git add -A
# GitHub's own no-reply address for the login: no personal email ends up in the history
git -c user.name="its837" -c user.email="117216164+its837@users.noreply.github.com" commit -q -m "Website"
git remote add origin "https://github.com/$REPO.git"
git push -q --force origin gh-pages
echo "Pushed gh-pages."

# switch Pages on (or, if it already is, point it at gh-pages)
gh api -X POST "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 \
  || gh api -X PUT "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 \
  || echo "(Pages may already be on; check Settings > Pages.)"
echo "Done. It can take a minute or two to appear at: $(gh api "repos/$REPO/pages" -q .html_url 2>/dev/null || echo "https://its837.github.io/awesome-workout-world/")"
