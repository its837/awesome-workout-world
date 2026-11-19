#!/bin/bash
# Photograph a tablet's software state BEFORE we change anything, so there is always
# something exact to compare against and go back to.
#
#   tools/tablet-snapshot.sh            take the baseline (refuses if one already exists)
#   tools/tablet-snapshot.sh now        save a dated snapshot alongside it (for comparing later)
#
# It only READS the tablet. The baseline is kept in docs/tablets/<tablet>/baseline/ and is
# what tools/tablet-restore.sh puts things back to. tools/android.sh install takes one
# automatically the first time it meets a real tablet.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
source "$ROOT/tools/tablet-lib.sh"
need_tablet

DIR="$(tablet_dir)"
if [ "${1:-}" = "now" ]; then OUT="$DIR/snapshot-$(date +%Y-%m-%d-%H%M%S)"
else
  OUT="$DIR/baseline"
  if [ -d "$OUT" ]; then
    echo "A baseline already exists for this tablet and is never overwritten:"
    echo "  $OUT"
    echo "Use 'tools/tablet-snapshot.sh now' for a dated snapshot to compare against it."
    exit 0
  fi
fi
mkdir -p "$OUT"
snapshot_into "$OUT"
echo "Saved $(ls "$OUT" | wc -l | tr -d ' ') files to: $OUT"
echo "Home screen:        $(cat "$OUT/home.txt")"
echo "Packages:           $(wc -l < "$OUT/packages-enabled.txt" | tr -d ' ') enabled, $(wc -l < "$OUT/packages-disabled.txt" | tr -d ' ') disabled"
