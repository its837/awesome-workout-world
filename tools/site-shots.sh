#!/bin/sh
# Retake the website's pictures (site/img/) from the game itself, with the STARTER family.
#
#   tools/site-shots.sh
#
# It starts the website preview on a spare port (that server never uses family/, so nobody
# real can end up in a public picture), opens each scene in Chrome with no window, lets the
# game run for a few seconds, and saves what is on the screen. Needs Google Chrome.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "Google Chrome is not at: $CHROME (set CHROME=/path/to/chrome)"; exit 1; }
PORT="${PORT:-5289}"
TMP="$(mktemp -d)"
node "$ROOT/tools/site.mjs" "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$TMP"' EXIT
sleep 1
ME="rider=nerd&plain=1&goal=1"
shot() {   # shot <file> <milliseconds of game time> <address after /play/>
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --mute-audio --no-first-run --user-data-dir="$TMP/profile" \
    --force-device-scale-factor=1 --window-size=1280,720 --virtual-time-budget="$2" \
    --screenshot="$ROOT/site/img/$1" "http://localhost:$PORT/play/$3" >/dev/null 2>&1
  echo "site/img/$1"
}
shot home.png  3000 ""
shot gang.png  4000 "?$ME&at=0.4&zone=whispering-pines&time=night&buddies=all&unlock=1&gang=1&skip=7"
shot santa.png 4000 "?$ME&at=0.5&zone=north-pole-village&time=night&thing=sexysanta&unlock=1&skip=6"
