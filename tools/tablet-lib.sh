#!/bin/bash
# Shared helpers for the tablet-* scripts. Not run on its own.
#   ROOT and ADB must be set by the caller.

# With the emulator AND a real tablet attached, adb has to be told which one. The real
# tablet wins, unless ANDROID_SERIAL already says otherwise.
if [ -z "${ANDROID_SERIAL:-}" ]; then
  REAL_TABLETS="$("$ADB" devices 2>/dev/null | awk 'NR>1 && $2=="device" && $1 !~ /^emulator-/ {print $1}')"
  ALL_DEVICES="$("$ADB" devices 2>/dev/null | awk 'NR>1 && $2=="device" {print $1}')"
  if [ "$(printf '%s\n' "$REAL_TABLETS" | grep -c . || true)" = "1" ] && [ "$(printf '%s\n' "$ALL_DEVICES" | grep -c . || true)" -gt 1 ]; then
    export ANDROID_SERIAL="$REAL_TABLETS"
    echo "(Both the emulator and a tablet are attached: using the tablet, $ANDROID_SERIAL.)" >&2
  fi
fi

PKG=com.merrymiles.app
# The save files live in the app's private folder; adb reaches them "as" the app.
SAVE_DIR=files/save
as_app() { "$ADB" shell run-as "$PKG" "$@" 2>/dev/null | tr -d '\r'; }

sh() { "$ADB" shell "$@" 2>/dev/null | tr -d '\r'; }

need_tablet() {
  if ! "$ADB" get-state >/dev/null 2>&1; then
    echo "No tablet found. Check the cable carries data (many only charge), that USB debugging"
    echo "is on, and that you tapped Allow on the tablet."
    "$ADB" devices
    exit 1
  fi
}

is_emulator() { [ "$(sh getprop ro.kernel.qemu)" = "1" ] || [[ "$("$ADB" get-serialno 2>/dev/null)" == emulator-* ]]; }

# Is this a treadmill? (Peloton's own setting; variants like prism-l count.)
is_treadmill() { case "$(sh settings get global peloton_platform)" in prism*|aurora*) return 0 ;; *) return 1 ;; esac; }

# One folder per physical tablet: model plus the last characters of its serial number.
tablet_dir() {
  local model serial
  model="$(sh getprop ro.product.model | tr ' /' '__')"
  serial="$("$ADB" get-serialno 2>/dev/null | tr -d '\r')"
  echo "$ROOT/docs/tablets/${model:-unknown}-${serial: -6}"
}

current_home() { sh cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME | tail -1; }

# Write the facts we would need to put a tablet back: which packages exist and which are
# switched off, what the Home button opens, and the system settings.
snapshot_into() {
  local out="$1"
  {
    echo "taken:    $(date)"
    echo "model:    $(sh getprop ro.product.model)"
    echo "build:    $(sh getprop ro.build.display.id)"
    echo "android:  $(sh getprop ro.build.version.release)"
    echo "platform: $(sh settings get global peloton_platform)"
  } > "$out/about.txt"
  sh pm list packages -e | sed 's/^package://' | sort > "$out/packages-enabled.txt"
  sh pm list packages -d | sed 's/^package://' | sort > "$out/packages-disabled.txt"
  sh pm list packages -3 | sed 's/^package://' | sort > "$out/packages-added.txt"
  current_home > "$out/home.txt"
  for ns in global secure system; do sh settings list "$ns" | sort > "$out/settings-$ns.txt"; done
  sh getprop | sort > "$out/props.txt"
}
