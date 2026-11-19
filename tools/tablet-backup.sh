#!/bin/bash
# The family's save data (every ride, the trail, settings): copy it off a tablet, or put it back.
#
#   tools/tablet-backup.sh                  copy the tablet's save file, and its one-a-day
#                                           history, into backups/<tablet>/<date-time>/
#   tools/tablet-backup.sh restore <file>   merge a saved file back into the tablet
#   tools/tablet-backup.sh list             show the backups on this Mac
#
# Restoring MERGES: rides are only ever added, so putting an old backup back can never
# remove a ride that happened since. To rewind to an older day instead (undo an accidental
# erase, say), erase the rides in the game's Settings first, then restore that day's file.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
source "$ROOT/tools/tablet-lib.sh"

if [ "${1:-}" = "list" ]; then
  find "$ROOT/backups" -name "save*.json" 2>/dev/null | sort | sed "s|$ROOT/||" || true
  exit 0
fi
need_tablet
NAME="$(basename "$(tablet_dir)")"

if [ "${1:-}" = "restore" ]; then
  FILE="${2:?usage: tools/tablet-backup.sh restore <file.json>}"
  python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print('This backup holds', len(d.get('rides', [])), 'rides.')" "$FILE" || { echo "That file is not a save file."; exit 1; }
  sh am force-stop "$PKG"
  as_app mkdir -p "$SAVE_DIR"
  "$ADB" shell "run-as $PKG sh -c 'cat > $SAVE_DIR/restore.json'" < "$FILE" || { echo "Could not copy it to the tablet."; exit 1; }
  [ -n "$(as_app ls "$SAVE_DIR" | grep -x restore.json)" ] || { echo "Could not copy it to the tablet (is our app installed?)."; exit 1; }
  sh am start -n "$PKG/.MainActivity" >/dev/null
  echo "Sent. The app has restarted and merged it in."
  exit 0
fi

OUT="$ROOT/backups/$NAME/$(date +%Y-%m-%d-%H%M%S)"
FILES="$(as_app ls "$SAVE_DIR" | grep -E '^save.*\.json$' || true)"
if [ -z "$FILES" ]; then
  echo "No save data on this tablet yet."
  exit 1
fi
mkdir -p "$OUT"
for f in $FILES; do "$ADB" exec-out run-as "$PKG" cat "$SAVE_DIR/$f" > "$OUT/$f" 2>/dev/null; done
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print('Backed up', len(d.get('rides', [])), 'rides.')" "$OUT/save.json" 2>/dev/null || true
echo "Saved to: $OUT"
