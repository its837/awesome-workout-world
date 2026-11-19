#!/bin/bash
# Put a tablet back the way it was when we first met it.
#
#   tools/tablet-restore.sh             show what is different from the baseline (changes nothing)
#   tools/tablet-restore.sh --apply     put it back: switch back on anything that was switched
#                                       off since, give the Home button back to its original
#                                       owner, and remove our app
#   tools/tablet-restore.sh --apply --keep-app    the same, but leave our app installed
#
# Before removing our app it copies the family's save data to this Mac (backups/).
# It never switches anything OFF, never uninstalls anything of Peloton's and never touches
# system settings: every action is one that returns the tablet toward its baseline.
# If this is not enough, a factory reset from the tablet's own Settings restores everything.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
source "$ROOT/tools/tablet-lib.sh"
need_tablet

APPLY=0; KEEP=0
for a in "$@"; do case "$a" in --apply) APPLY=1 ;; --keep-app) KEEP=1 ;; esac; done

BASE="$(tablet_dir)/baseline"
if [ ! -d "$BASE" ]; then
  echo "There is no baseline for this tablet ($BASE)."
  echo "Without one this script cannot know what 'back' means. What it can still do safely:"
  echo "  adb uninstall $PKG        removes our app (and with it any claim on the Home button)"
  exit 1
fi

NOW="$(mktemp -d)"
snapshot_into "$NOW"

TO_ENABLE="$(comm -23 "$NOW/packages-disabled.txt" "$BASE/packages-disabled.txt")"
MISSING="$(comm -23 "$BASE/packages-enabled.txt" <(sort "$NOW/packages-enabled.txt" "$NOW/packages-disabled.txt"))"
ADDED="$(comm -23 "$NOW/packages-added.txt" "$BASE/packages-added.txt")"
HOME_WAS="$(cat "$BASE/home.txt")"; HOME_NOW="$(cat "$NOW/home.txt")"
OURS="$(grep -x "$PKG" "$NOW/packages-added.txt" || true)"

echo "Baseline taken:  $(sed -n 1p "$BASE/about.txt" | sed 's/^taken: *//')"
echo
echo "Home button:     $HOME_NOW"
[ "$HOME_NOW" != "$HOME_WAS" ] && echo "   was:          $HOME_WAS   <- will be given back"
echo "Switched off since the baseline:  ${TO_ENABLE:-nothing}"
echo "Apps added since the baseline:    $(echo ${ADDED:-nothing})"
[ -n "$MISSING" ] && echo "REMOVED since the baseline (only a factory reset brings these back): $(echo $MISSING)"
for ns in global secure system; do
  n="$(comm -3 "$BASE/settings-$ns.txt" "$NOW/settings-$ns.txt" | wc -l | tr -d ' ')"
  [ "$n" != "0" ] && echo "Settings ($ns) lines that differ: $n   (compare $BASE/settings-$ns.txt; not changed by this script)"
done
echo

if [ "$APPLY" != "1" ]; then
  echo "Nothing was changed. Run again with --apply to put it back."
  rm -rf "$NOW"; exit 0
fi

if [ -n "$OURS" ]; then
  echo "Copying save data to this Mac first..."
  "$ROOT/tools/tablet-backup.sh" || echo "  (no save data could be copied; carrying on)"
fi
for p in $TO_ENABLE; do
  echo "Switching back on: $p"
  sh pm enable "$p" >/dev/null || echo "  could not enable $p"
done
if [ "$HOME_NOW" != "$HOME_WAS" ] && [ -n "$HOME_WAS" ]; then
  echo "Giving the Home button back to: $HOME_WAS"
  sh cmd package set-home-activity "$HOME_WAS" >/dev/null || echo "  could not set it; removing our app below also releases it"
fi
if [ -n "$OURS" ] && [ "$KEEP" != "1" ]; then
  echo "Removing our app ($PKG)"
  "$ADB" uninstall "$PKG" >/dev/null && echo "  removed" || echo "  could not remove it"
fi

AFTER="$(mktemp -d)"; snapshot_into "$AFTER"
echo
LEFT="$(comm -23 "$AFTER/packages-disabled.txt" "$BASE/packages-disabled.txt")"
if [ -z "$LEFT" ] && [ "$(cat "$AFTER/home.txt")" = "$HOME_WAS" ]; then
  echo "Done. Home button and switched-off packages match the baseline."
else
  echo "Not everything matched afterwards:"
  [ -n "$LEFT" ] && echo "  still switched off: $LEFT"
  [ "$(cat "$AFTER/home.txt")" != "$HOME_WAS" ] && echo "  Home button is $(cat "$AFTER/home.txt"), baseline was $HOME_WAS"
  echo "A factory reset from the tablet's Settings puts everything back."
fi
rm -rf "$NOW" "$AFTER"
