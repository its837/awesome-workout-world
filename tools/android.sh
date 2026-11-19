#!/bin/bash
# Build, install and emulate the tablet app.
#   tools/android.sh build              compile the APK (bundles the current web/ folder)
#   tools/android.sh emulator           start the Peloton-sized emulator (creates it the first time)
#   tools/android.sh emulator headless  the same with no window (macOS slows the emulator to a crawl
#                                       whenever its window is covered, so use this to measure speed)
#   tools/android.sh install            install the APK on whatever adb sees (emulator or tablet)
#   tools/android.sh run                launch the app with its on-screen simulator (use the Workshop to switch machines)
#   tools/android.sh run bike|tread     launch it fed with made-up sensor readings through the real bridge
#   tools/android.sh publish            stamp web/ as a new game version the tablet can download
#   tools/android.sh scene k=v ...      open the app in a chosen situation, for example:
#       scene machine=tread                              the treadmill version, at the home screen
#       scene machine=bike rider=nerd zone=frozen-lake    a bike ride as the nerd on the frozen lake
#       scene machine=tread rider=alex at=0.95           Alex's climb just before sunrise
#       scene rider=riley reward=1                       Riley, with a reward choice on screen
#       scene demo=1 day=+20 screen=map                  the map, 20 days from now, with pretend tents
#       scene rider=nerd buddies=owl time=night           the owl, under a night sky
#       scene rider=alex detail=light slow=6             light detail, pretending the screen is 6x slower
#       scene bench=1                                    run the speed test (result also goes to the log)
#     keys: machine rider zone at goal reward buddies song time detail slow bench day demo screen
#           (tools/android.sh scenes lists the values)
#   tools/android.sh speedtest          run the speed test and print its numbers
#   tools/android.sh shot <file.png>    save a screenshot of the device
#   tools/android.sh make-key           (once) make the key your builds are signed with
#   tools/android.sh voice [words]      have the device say a sentence, and print what its speech engine did
#   tools/android.sh home-ok yes|no     (treadmills) let this one tablet offer the HOME BUTTON switch, or not
#   tools/android.sh plugin off|on      switch Peloton's app-closing part off, or back on
#   tools/android.sh sync-key [off]     give this device the key to the family's shared ride log (you type it)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
OUT="$HOME/Library/Caches/MerryMiles"      # build output stays out of Google Drive
ADB="$ANDROID_HOME/platform-tools/adb"
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
APK="$OUT/build/app/outputs/apk/debug/app-debug.apk"
AVD=MerryMilesTablet
PKG=com.merrymiles.app
# The fingerprint of the key the built APK was signed with (lower case, no colons).
signed_by() {
  local tool; tool="$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | sort | tail -1 || true)"
  [ -n "$tool" ] && [ -f "$APK" ] || return 0
  "$tool" verify --print-certs "$APK" 2>/dev/null | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' | head -1
}
# Where the app should look for game updates: what UPDATE_URL says, else this Mac when the
# device is the emulator, else nowhere (a real tablet keeps whatever it was told before).
update_url() {
  if [ -n "${UPDATE_URL:-}" ]; then echo "$UPDATE_URL"
  elif [ "$("$ADB" shell getprop ro.kernel.qemu 2>/dev/null | tr -d '\r')" = "1" ]; then echo "http://10.0.2.2:5173"; fi
}

case "${1:-}" in
  build)
    node "$ROOT/tools/publish.mjs"
    cd "$ROOT/android"
    ./gradlew --project-cache-dir "$OUT/gradle-project-cache" -Pkotlin.project.persistent.dir="$OUT/kotlin" assembleDebug
    echo "APK: $APK"
    ;;
  emulator)
    if ! "$ANDROID_HOME/emulator/emulator" -list-avds | grep -qx "$AVD"; then
      echo no | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd -n "$AVD" \
        -k "system-images;android-30;default;arm64-v8a" -d pixel_c --force
      CFG="$HOME/.android/avd/$AVD.avd/config.ini"
      # Make it look like a Peloton screen: 1920x1080, landscape, no phone frame.
      for kv in hw.lcd.width=1920 hw.lcd.height=1080 hw.lcd.density=240 hw.initialOrientation=landscape \
                showDeviceFrame=no hw.keyboard=yes hw.gpu.enabled=yes hw.gpu.mode=host hw.ramSize=3072 skin.name=1920x1080; do
        k="${kv%%=*}"
        grep -v "^$k=" "$CFG" > "$CFG.tmp" || true
        echo "$kv" >> "$CFG.tmp"
        mv "$CFG.tmp" "$CFG"
      done
      grep -v "^skin.path" "$CFG" > "$CFG.tmp" || true; mv "$CFG.tmp" "$CFG"
    fi
    # Fixed public DNS servers: otherwise the emulator keeps whatever this Mac used when it
    # booted and loses the internet (blank YouTube and so on) when the Mac changes network.
    WINDOW=""; [ "${2:-}" = "headless" ] && WINDOW="-no-window"
    nohup "$ANDROID_HOME/emulator/emulator" -avd "$AVD" -no-snapshot -no-boot-anim -gpu host $WINDOW -dns-server 8.8.8.8,1.1.1.1 > "$OUT/emulator.log" 2>&1 &
    "$ADB" wait-for-device
    until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
    echo "Emulator is up."
    ;;
  install)
    # A real tablet (not the emulator) is photographed before we ever install on it, and
    # its save data is copied to this Mac before every reinstall, so we can always go back.
    if [ "$("$ADB" shell getprop ro.kernel.qemu 2>/dev/null | tr -d '\r')" != "1" ]; then
      # Only a build signed with the family key goes on a real tablet: a tablet accepts
      # updates only from the key its first copy was signed with (android/signing/README.md).
      WANT="$(cat "$ROOT/android/signing/fingerprint.txt" 2>/dev/null || true)"
      GOT="$(signed_by)"
      if [ -z "$WANT" ] || [ "$GOT" != "$WANT" ]; then
        echo "Not installing: this build is not signed with the family key."
        echo "  expected: ${WANT:-(android/signing/fingerprint.txt is missing)}"
        echo "  this build: ${GOT:-(could not read it; has it been built?)}"
        echo "Nothing has changed on the tablet. Run tools/android.sh build, or see android/signing/README.md."
        exit 1
      fi
      "$ROOT/tools/tablet-snapshot.sh" || exit 1
      "$ROOT/tools/tablet-backup.sh" >/dev/null 2>&1 && echo "Save data copied to backups/." || true
    fi
    if ! RESULT="$("$ADB" install -r "$APK" 2>&1)"; then
      echo "$RESULT"
      echo
      if echo "$RESULT" | grep -q -E "INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match"; then
        echo "The copy already on this device was signed with a different key, so it will not take"
        echo "this one as an update. Nothing has changed. On a real tablet: stop and tell Claude."
        exit 1
      fi
      # A Peloton that refuses installs says why in its OWN log, not here (owners report the Mac side failing "with a blank reason").
      echo "The install was refused. What the tablet's own log says about it:"
      "$ADB" logcat -d 2>/dev/null | grep -i -E "keys mismatch|install denied|Install not allowed|INSTALL_FAILED" | tail -6 || echo "  (nothing about it in the log)"
      echo "Nothing has changed on the tablet. 'keys mismatch' or 'install denied' means it refuses"
      echo "installs as it stands: stop there and tell Claude."
      exit 1
    fi
    echo "$RESULT"
    ;;
  run)
    "$ADB" shell am force-stop "$PKG"
    # On the emulator, 10.0.2.2 is this Mac: game updates come from the dev server (node tools/serve.mjs).
    # On a real tablet no address is set unless you give one: UPDATE_URL=http://<this Mac>:5173
    UPD=(); U="$(update_url)"; [ -n "$U" ] && UPD=(--es update_url "$U")
    if [ -n "${2:-}" ]; then "$ADB" shell am start -n "$PKG/.MainActivity" ${UPD[@]+"${UPD[@]}"} --es demo "$2"
    else "$ADB" shell am start -n "$PKG/.MainActivity" ${UPD[@]+"${UPD[@]}"}; fi
    # On a Peloton, restarting us lets Peloton's own home slip in for a moment, and on a
    # machine with no membership it then throws its "Activate" screen over the top of us.
    # So look again a few seconds later and, if we are not in front, come forward once more.
    if [ "$("$ADB" shell getprop ro.kernel.qemu 2>/dev/null | tr -d '\r')" != "1" ]; then
      for _ in 1 2 3; do
        sleep 4
        "$ADB" shell dumpsys activity activities 2>/dev/null | grep -m1 mResumedActivity | grep -q "$PKG/" && break
        "$ADB" shell am start -n "$PKG/.MainActivity" >/dev/null 2>&1 || true
      done
    fi
    ;;
  publish)
    node "$ROOT/tools/publish.mjs"
    ;;
  scene)
    shift
    Q="$(IFS='&'; echo "$*")"
    "$ADB" shell am force-stop "$PKG"
    UPD=(); U="$(update_url)"; [ -n "$U" ] && UPD=(--es update_url "$U")
    "$ADB" shell am start -n "$PKG/.MainActivity" ${UPD[@]+"${UPD[@]}"} --es scene "'$Q'"
    ;;
  scenes)
    echo "machine: bike tread"
    PEOPLE="$ROOT/web/profiles.js"; [ -f "$ROOT/family/profiles.js" ] && PEOPLE="$ROOT/family/profiles.js"   # (your own family, if you keep one)
    echo "rider:   $(grep -o "id: '[a-z]*'" "$PEOPLE" | sed "s/id: '//;s/'//" | tr '\n' ' ')"
    echo "zone:    $(grep -o "name: '[A-Z ]*'" "$ROOT/web/src/world.js" | sed "s/name: '//;s/'//" | tr 'A-Z ' 'a-z-' | tr '\n' ' ')"
    echo "at:      0 to 1 (how far through the ride's goal; the sun comes up at 1)"
    echo "goal:    miles, e.g. 1 (walked or ridden, a mile is a mile); 0 is a free ride"
    echo "unlock:  1 (pretend every advent door is open; not saved)"
    echo "preview: 1 (a pretend family history on day ten of the season; nothing is saved)"
    echo "reward:  1 (a reward choice appears straight away)"
    echo "buddies: owl cardinal fox penguin turkey kangaroo, comma-separated, or all"
    echo "door:    a door number, e.g. 12: its opening plays as the ride starts"
    echo "thing:   an advent thing happens as the ride starts: relative dropbear discosnow fireworks poop sleigh flurry yeti deer turkey ..."
    echo "test:    1 (the TEST button on the ride, whoever is riding)"
    echo "empty:   1 (the rider is left out: a bare trail for trying new art on)"
    echo "song:    $(grep -o "title: ['\"][^,]*['\"]," "$ROOT/web/src/carols.js" | sed "s/title: .//;s/.,\$//" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]\{1,\}/-/g;s/-$//' | tr '\n' ' ')"
    echo "time:    auto night dawn sunup day (pins the sky)"
    echo "detail:  auto full medium light (saved, same as Settings > PICTURE DETAIL)"
    echo "slow:    a number, e.g. 4 or 6: pretend the screen is that many times slower"
    echo "bench:   1 (run the speed test)"
    echo "day:     +N or -N days from today"
    echo "demo:    1 (pretend family history, so the map has tents)"
    echo "screen:  people setup map advent settings device workshop (setup needs rider=)"
    ;;
  shot)
    "$ADB" exec-out screencap -p > "${2:?usage: android.sh shot file.png}"
    ;;
  speedtest)
    # Runs the busiest scene at each detail level on whatever adb sees and prints the result.
    # Extra arguments are passed on as scene options, e.g. `tools/android.sh speedtest slow=6`.
    shift
    TAG="t$(date +%s)"
    Q="$(IFS='&'; echo "bench=1&benchtag=$TAG${*:+&$*}")"
    "$ADB" logcat -c || true
    "$ADB" shell am force-stop "$PKG"
    UPD=(); U="$(update_url)"; [ -n "$U" ] && UPD=(--es update_url "$U")
    "$ADB" shell am start -n "$PKG/.MainActivity" ${UPD[@]+"${UPD[@]}"} --es scene "'$Q'" >/dev/null
    echo "Running (about 25 seconds)..."
    for _ in $(seq 1 45); do
      LINE="$("$ADB" logcat -d -s chromium:I MerryMiles:W 2>/dev/null | grep -o "SPEEDTEST $TAG {.*}" | tail -1 || true)"
      [ -n "$LINE" ] && break
      sleep 1
    done
    [ -n "${LINE:-}" ] || { echo "No result. Is the app installed and on screen? (On a real tablet the log may have dropped the line:"; echo "the same numbers are on the screen, on the tester's calendar under TEST, SPEED TEST.)"; exit 1; }
    echo "${LINE#SPEEDTEST $TAG }" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print("pretend-slow factor:", d.get("slow", 1))
print("%-8s %8s %12s %10s %8s %7s" % ("detail", "fps", "slow frames", "our work", "sprites", "lights"))
for r in d["results"]:
    print("%-8s %8.1f %9.0f ms %7.1f ms %8d %7d" % (r["level"], r["fps"], r["slow"], r["work"], r["sprites"], r["lights"]))
'
    ;;
  voice)
    # Opens the app, has it say one sentence, and prints each step the speech engine reported.
    WORDS="${2:-Ho ho ho. Merry miles to you.}"
    "$ADB" logcat -c || true
    "$ADB" shell am force-stop "$PKG"
    "$ADB" shell am start -n "$PKG/.MainActivity" --es scene "'say=${WORDS// /+}'" >/dev/null
    echo "Asking it to say: $WORDS"
    sleep 10
    "$ADB" logcat -d -s MerryMiles:W 2>/dev/null | grep -o "speech: .*" || echo "Nothing about speech in the device's log."
    ;;
  make-key)
    # Make the one key every build of YOUR copy of the app is signed with. Do this once,
    # before the first install on a tablet. A tablet only takes updates signed with the key
    # its first copy had, so keep a copy of android/signing/ somewhere safe and never make a
    # second key. (That folder is private: it is left out of git.)
    K="$ROOT/android/signing"
    if [ -e "$K/merry-miles.jks" ]; then
      echo "There is already a key in android/signing/. Never replace it once a tablet has the app."
      exit 1
    fi
    mkdir -p "$K"; umask 077
    MM_PASS="$(openssl rand -hex 20)"; export MM_PASS
    "$JAVA_HOME/bin/keytool" -genkeypair -keystore "$K/merry-miles.jks" -storetype PKCS12 -alias merrymiles -keyalg RSA -keysize 2048 \
      -validity 36500 -dname "CN=Awesome Workout World" -storepass:env MM_PASS -keypass:env MM_PASS >/dev/null 2>&1
    printf 'storeFile=merry-miles.jks\nstorePassword=%s\nkeyAlias=merrymiles\nkeyPassword=%s\n' "$MM_PASS" "$MM_PASS" > "$K/signing.properties"
    "$JAVA_HOME/bin/keytool" -list -v -keystore "$K/merry-miles.jks" -alias merrymiles -storepass:env MM_PASS 2>/dev/null \
      | grep -E "SHA256:" | sed 's/.*SHA256: *//' | tr -d ':' | tr 'A-F' 'a-f' > "$K/fingerprint.txt"
    unset MM_PASS
    echo "Made your signing key in android/signing/. Copy that folder somewhere safe now."
    echo "Then: tools/android.sh build"
    ;;
  sync-key)
    # Give this device the key to the family's private log repository, so its rides are
    # shared with the other machine (android/app/.../Sync.kt). The key is typed here, by
    # you, and goes straight into the app's private storage on the tablet: it is never
    # shown, never in the project, never in the log.
    #   tools/android.sh sync-key            asks for the key (typing is hidden)
    #   tools/android.sh sync-key clipboard  takes the key from the Mac's clipboard instead
    #   tools/android.sh sync-key off    take the key off this device again
    if [ "${2:-}" = "off" ]; then
      "$ADB" shell "run-as $PKG rm -f files/sync.json"
      echo "This device no longer shares its rides."
      exit 0
    fi
    if [ "$("$ADB" shell getprop ro.kernel.qemu 2>/dev/null | tr -d '\r')" = "1" ]; then
      echo "That is the emulator, which is full of made-up rides: it never gets the real key."
      echo "Plug in a tablet and try again."
      exit 1
    fi
    REPO="$(cat "$ROOT/android/signing/log-repo.txt" 2>/dev/null || true)"
    [ -n "$REPO" ] || { printf "Log repository (owner/name): "; read -r REPO; }
    echo "Repository: $REPO"
    if [ "${2:-}" = "clipboard" ]; then
      # Some terminals will not take a paste at a hidden prompt. Copy the key on GitHub,
      # then run this: the key is read straight from the Mac's clipboard and never shown.
      KEY="$(pbpaste | tr -d '[:space:]')"
      case "$KEY" in
        github_pat_*|ghp_*) echo "Found a GitHub key on the clipboard." ;;
        *) echo "The clipboard does not hold a GitHub key (they start with github_pat_)."
           echo "On GitHub, press the copy button beside the new key, then run this again. Nothing was changed."
           exit 1 ;;
      esac
    else
      printf "Paste the key, then press Return (it will not show): "
      read -r -s KEY; echo
    fi
    [ -n "$REPO" ] && [ -n "$KEY" ] || { echo "Nothing was changed."; exit 1; }
    # try the key from here first (it goes to GitHub in a header, not on a command line)
    CODE="$(printf 'Authorization: Bearer %s\n' "$KEY" | curl -s -o /dev/null -w '%{http_code}' -H @- -H 'X-GitHub-Api-Version: 2022-11-28' "https://api.github.com/repos/$REPO")"
    case "$CODE" in
      200) echo "GitHub accepts the key for that repository." ;;
      401) echo "GitHub says that is not a valid key. Nothing was changed."; exit 1 ;;
      404) echo "That key cannot see $REPO. When making the key, pick that repository under 'Only select repositories'. Nothing was changed."; exit 1 ;;
      *)   echo "GitHub answered $CODE. Nothing was changed."; exit 1 ;;
    esac
    printf '{"repo":"%s","key":"%s"}' "$REPO" "$KEY" | "$ADB" shell "run-as $PKG sh -c 'cat > files/sync.json && chmod 600 files/sync.json'"
    KEY=""
    "$ADB" shell am force-stop "$PKG"
    "$ADB" shell am start -n "$PKG/.MainActivity" >/dev/null
    echo "Done. The app has restarted and will share its rides within a few seconds."
    echo "On the tablet: DEVICE SETTINGS, FAMILY LOG shows how it went."
    ;;
  plugin)
    # Peloton's "system plugin" closes other apps (Netflix, nine seconds after it opens) on a
    # machine with no membership, and draws Peloton's bars and overlays over them.
    #   tools/android.sh plugin off    switch that one part off (needs the owner's say-so)
    #   tools/android.sh plugin on     put it back exactly as it was
    # It is NOT the belt lock (sensorstateindicator), NOT Just Run (peloton.activity) and NOT
    # the sensor service: this command cannot touch those, and nothing here ever should.
    PLUGIN=com.onepeloton.systempluginui
    case "${2:-}" in
      off) "$ADB" shell pm disable-user --user 0 "$PLUGIN" ;;
      on)  "$ADB" shell pm enable --user 0 "$PLUGIN" ;;
      *)   echo "usage: tools/android.sh plugin off|on" ;;
    esac
    echo "Switched off on this device now: $("$ADB" shell pm list packages -d | tr -d '\r' | sed 's/^package://' | tr '\n' ' ')"
    ;;
  front)
    # After a sleep, a Peloton with no membership wakes up on Peloton's "Activate" screen:
    # Peloton puts it on top of us while the screen is off, and Android 10 will not let an
    # app step back in front by itself. It will if the app holds the "display over other
    # apps" permission. We never draw over anything; this is only so we may come forward.
    #   tools/android.sh front yes    allow it on the attached tablet (the owner's say-so)
    #   tools/android.sh front no     take it away again (back to how Android had it)
    case "${2:-}" in
      yes) "$ADB" shell appops set "$PKG" SYSTEM_ALERT_WINDOW allow && echo "This tablet now lets $PKG come back to the front after a sleep." ;;
      no)  "$ADB" shell appops set "$PKG" SYSTEM_ALERT_WINDOW default && echo "Taken away: $PKG can no longer step in front by itself." ;;
      *)   echo "usage: tools/android.sh front yes|no" ;;
    esac
    echo "Now: $("$ADB" shell appops get "$PKG" SYSTEM_ALERT_WINDOW | tr -d '\r' | tail -1)"
    ;;
  home-ok)
    # A treadmill never offers the HOME BUTTON switch unless its owner says so, here, for that
    # one tablet. This only shows or hides the switch (Device settings); it changes nothing else.
    case "${2:-}" in yes|no) ;; *) echo "usage: tools/android.sh home-ok yes|no"; exit 1 ;; esac
    "$ADB" shell am force-stop "$PKG"
    "$ADB" shell am start -n "$PKG/.MainActivity" --es home_ok "$2" >/dev/null
    [ "$2" = yes ] && echo "This tablet now offers the HOME BUTTON switch in Device settings." || echo "This tablet no longer offers the HOME BUTTON switch."
    ;;
  *)
    sed -n '2,28p' "$0"; exit 1 ;;
esac
