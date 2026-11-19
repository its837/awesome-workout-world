#!/bin/bash
# First contact with a real Peloton tablet.
#
# Plug the tablet into this Mac with a DATA-capable USB cable (micro-USB on the back of the
# original Bike's screen, USB-C on Bike+ and Tread), turn on USB debugging on the tablet,
# accept the "allow this computer" prompt, then run:
#
#   tools/tablet-check.sh
#
# It only READS. Nothing is installed, changed or switched off. The answers tell us which
# machine and software this is, and what to expect, before we try anything.
# A copy of the report is saved under docs/tablets/.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
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

if ! "$ADB" get-state >/dev/null 2>&1; then
  echo "No tablet found. Check the cable carries data (many only charge), that USB debugging"
  echo "is on, and that you tapped Allow on the tablet. 'adb devices' shows what is connected:"
  "$ADB" devices
  exit 1
fi

sh() { "$ADB" shell "$@" 2>/dev/null | tr -d '\r'; }
prop() { sh getprop "$1"; }

MODEL="$(prop ro.product.model)"
BUILD="$(prop ro.build.display.id)"
PLATFORM="$(sh settings get global peloton_platform)"
OUT="$ROOT/docs/tablets"
mkdir -p "$OUT"
FILE="$OUT/$(echo "${MODEL:-unknown}" | tr ' /' '__')-$(date +%Y-%m-%d).txt"

{
  echo "Tablet check, $(date)"
  echo
  echo "Model:             $MODEL  (maker: $(prop ro.product.manufacturer), device: $(prop ro.product.device))"
  echo "Android:           $(prop ro.build.version.release)  (API $(prop ro.build.version.sdk))"
  echo "Build:             $BUILD"
  echo "Security patch:    $(prop ro.build.version.security_patch)"
  echo "Peloton platform:  ${PLATFORM:-not set}   (v1 = Bike, titan = Bike+, prism = Tread, aurora = Tread+, caesar = Row)"
  echo "Screen:            $(sh wm size | head -1)   $(sh wm density | head -1)"
  echo "Processor:         $(prop ro.product.cpu.abilist)   board: $(prop ro.board.platform)"
  echo "Memory:            $(sh cat /proc/meminfo | head -1)"
  echo "Free storage:      $(sh df -h /data | sed -n 2p)"
  echo
  echo "System WebView:    $(sh dumpsys package com.android.webview | grep -m1 versionName) $(sh dumpsys package com.google.android.webview | grep -m1 versionName)"
  SENSOR_VER="$(sh dumpsys package com.onepeloton.affernetservice | grep versionName | head -1 | sed 's/^ *//')"
  echo "Sensor service:    ${SENSOR_VER:-com.onepeloton.affernetservice NOT FOUND}"
  echo "Older sensor svc:  $(sh pm list packages com.peloton.service.SensorData || true)"
  echo "Home screen now:   $(sh cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME | tail -1)"
  echo
  echo "More read-only facts (what each one decides is in docs/tablets/WHAT_WORKS.md):"
  LOG_TAG="$(prop log.tag)"
  echo "Log level:         ${LOG_TAG:-not set, so ordinary log lines are kept}   (W would mean they are thrown away)"
  echo "Screen sleeps at:  $(sh settings get system screen_off_timeout) ms"
  echo "Speech engine:     $(sh settings get secure tts_default_synth)"
  echo "Engine in use:     $(sh dumpsys webviewupdate | grep -i -m1 'current webview package' | sed 's/^ *//')"
  echo "Tablet offers:     $(sh pm list features | grep -i -E 'leanback|picture_in_picture|freeform' | sed 's/^feature://' | tr '\n' ' ')"
  echo "Streaming, Google: $(sh pm list packages | grep -i -E 'netflix|hulu|youtube|spotify|google|vending|firefox|aurora' | sed 's/^package://' | tr '\n' ' ')"
  echo "Switched off:      $(sh pm list packages -d | sed 's/^package://' | tr '\n' ' ')"
  echo "Overlays showing:  $(sh dumpsys window windows | grep -i -c -E 'SECURE_SYSTEM_OVERLAY|APPLICATION_OVERLAY')"
  echo "Home screens there are:"
  sh cmd package query-activities --components -a android.intent.action.MAIN -c android.intent.category.HOME | sed 's/^/  /'
  echo "Who is connected to the sensor service now:"
  sh dumpsys activity services com.onepeloton.affernetservice | grep -i -E "ConnectionRecord|ServiceRecord" | head -12 | sed 's/^ */  /'
  echo
  echo "Peloton packages installed:"
  sh pm list packages | grep -i -E "peloton|affernet" | sort | sed 's/^/  /'
  echo
  echo "What the build name suggests (first letter tracks the Android release):"
  case "$BUILD" in
    N*) echo "  Android 7 era. These are the tablets most often reported to refuse installs" ;
        echo "  ('keys mismatch. install denied'). Expect trouble; test with one harmless app first." ;;
    Q*) echo "  Android 10 era (Bike+ / Tread tablets). USB installs reported working in late 2026." ;;
    R*) echo "  Android 11 era (the original Bike's newer tablet). USB installs reported working in late 2026." ;;
    T*) echo "  Android 13 era (2025+ hardware). USB installs reported working; subscription overlay reported." ;;
    *)  echo "  Not a build name we have notes on." ;;
  esac
  case "$PLATFORM" in
    aurora*) echo "  This is a Tread+. Nobody has published a way to read its sensors yet." ;;
    prism*)  echo "  This is a Tread. Sensor reading is published; our reader must stay listen-only." ;;
    v1)      echo "  This is an original Bike." ;;
    titan)   echo "  This is a Bike+." ;;
  esac
  # What we expect from our own two machines (docs/tablets/README.md), so a surprise stands out.
  case "$MODEL" in
    PLTN-TTR01*) case "$PLATFORM" in prism*) ;; *) echo "  NOT WHAT WE EXPECTED: our PLTN-TTR01 is on the treadmill, so the platform should be prism." ;; esac
                 case "$BUILD" in Q*) ;; *) echo "  NOT WHAT WE EXPECTED: this model was on Android 10 (build Q...) in every report we have." ;; esac ;;
    PLTN-RB1VQ*) case "$PLATFORM" in v1) ;; *) echo "  NOT WHAT WE EXPECTED: our PLTN-RB1VQ is on the bike, so the platform should be v1." ;; esac
                 case "$BUILD" in
                   R*) ;;
                   N*) echo "  This bike tablet is still on Android 7. Those often refuse installs. Stop here and tell Claude." ;;
                   Q*) echo "  This bike tablet is on Android 10. Some of this generation sit there and cannot update. Tell Claude before going on." ;;
                   *)  echo "  NOT WHAT WE EXPECTED: this model was on Android 11 (build R...) in the reports we have." ;;
                 esac ;;
    *) echo "  This is not one of the two models we wrote down (PLTN-TTR01, PLTN-RB1VQ)." ;;
  esac
} | tee "$FILE"

echo
echo "Saved to: $FILE"
