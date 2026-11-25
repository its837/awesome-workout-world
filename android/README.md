# Tablet shell (Android)

A deliberately small Android app: one full-screen WebView that shows the home screen and
the game from [../web](../web), plus the things a web page cannot do for itself: read the
machine's sensors, open other apps, download game updates, and act as the tablet's home screen.

**Status:** builds and runs in the Android 11 emulator (1920×1080, the Bike's screen size).
Tested there: the home screen, full rides driven by made-up sensor readings, the YouTube tile,
a real over-the-air game update, and automatic rollback of a deliberately broken update. It
has not been on a real Peloton yet, and the real sensor readers are not written (see below).

## Build, install, run

Everything goes through one script, run from the project folder:

```bash
tools/android.sh build
```

```bash
tools/android.sh emulator
```

```bash
tools/android.sh install
```

```bash
tools/android.sh run
```

- `build` stamps `../web` with a build number, compiles the APK and bundles the game into
  it, so a freshly installed app works with no network. Output lands in
  `~/Library/Caches/MerryMiles` (kept out of Google Drive on purpose).
- `emulator` creates (first time) and boots a Peloton-shaped tablet.
- `install` puts the APK on whatever `adb` can see: the emulator, or a real tablet over USB.
- `run` starts the app with the on-screen simulator and Workshop tools.
  `run bike` / `run tread` instead start it in **demo mode**: it reports that machine and
  feeds made-up readings through the real native-to-game path.
- `publish` re-stamps `../web` so tablets see it as a newer game version.
- `speedtest` runs the busiest scene at each picture-detail level on whatever is attached
  and prints frames per second and our own work per frame. Add `slow=6` to pretend the
  processor is six times slower.
- `emulator headless` starts the emulator with no window. Use it for speed measurements:
  macOS throttles the emulator to a crawl whenever its window is covered or minimised.

### Live development against the Mac

```bash
HOST=0.0.0.0 node tools/serve.mjs
```

```bash
adb shell am start -n com.merrymiles.app/.MainActivity --es url http://MAC-IP-ADDRESS:5173
```

Loads the game straight from the Mac, so edits show up with a reload and no reinstall.

## How it is organised

Every build is signed with one fixed key, kept in [signing/](signing/README.md). A tablet
only takes an update signed with the key of the copy it already has, so `install` refuses
to put a build signed with anything else on a real tablet.

| File | Job |
| --- | --- |
| `MainActivity.kt` | The WebView, full-screen mode, serving game files, forwarding sensor readings, Home/Back handling. |
| `HostBridge.kt` | Everything the page may ask for (`window.MerryHost`). |
| `Updater.kt` | Over-the-air game updates with hash checks and rollback. |
| `WatchActivity.kt` | Full-screen web viewer for YouTube's website (the other services refuse a viewer like this). On YouTube's pages it answers "cannot play VP9 or AV1", so YouTube sends H.264, the kind the bike's chip plays properly. |
| `Safety.kt` | Finding and opening the original home screen, handing the Home button back, the failed-start counter, the save file. |
| `RescueActivity.kt` | The way out: a plain screen with no web page behind it. Opens by itself on trouble. |
| `sensors/Sensors.kt` | Which Peloton this is, the reading types, the demo source, and where the real readers go. |

The game is always served to the WebView at one fixed address
(`https://appassets.androidplatform.net/app/...`), whichever copy is behind it, so saved
family data survives updates.

## How the page and the shell talk

| Direction | Call | Meaning |
| --- | --- | --- |
| page → shell | `MerryHost.getMachineInfo()` | JSON `{ kind: "bike", "tread" or "none", model, platform }` |
| page → shell | `MerryHost.speak(text)` | Santa's greeting through the tablet's speech engine, if it has one |
| page → shell | `MerryHost.openService(key)` | `"youtube"`, `"netflix"`, `"hulu"`, `"music"` (or `"spotify"`): opens the installed app. With no app, YouTube opens its website in the built-in viewer; the others return `false` and the page says the app is not on this tablet yet |
| page → shell | `MerryHost.getUpdateInfo()` | JSON `{ version, build, source: "built-in" or "downloaded", url }` |
| page → shell | `MerryHost.checkForUpdate()` / `applyUpdate()` / `bundleReady()` | look for a newer game / restart into it / "I started fine" |
| page → shell | `MerryHost.isHome()` / `setHome(bool)` | are we the home screen / ask Android to make us it |
| page → shell | `MerryHost.canBeHome()` | false on a treadmill: there we never take the Home button |
| page → shell | `MerryHost.openPeloton()` | bring the tablet's original home screen to the front |
| page → shell | `MerryHost.openRescue()` | open the rescue screen |
| page → shell | `MerryHost.readSave()` / `writeSave(json)` | the save data's plain-file copy (and any backup waiting to be merged) |
| page → shell | `MerryHost.openAndroidSettings()` | the tablet's own settings |
| shell → page | `MerryMiles.onTelemetry({kind:"bike", cadence, resistance, power})` | rpm, 0–100, watts |
| shell → page | `MerryMiles.onTelemetry({kind:"tread", speedMph, inclinePct})` | |
| shell → page | `MerryMiles.onUpdate({state, message, version})` | update progress: checking, downloading, ready, none, error |
| shell → page | `merry.homePressed()` / `merry.backPressed()` | the tablet's Home button / Back gesture |

There is deliberately nothing in the bridge that controls the machine.

## Game updates

`web/bundle.json` lists every game file with its SHA-256 and carries a build number.

1. The page calls `checkForUpdate()`. The shell fetches `bundle.json` from the update address.
2. If its build number is higher, the shell downloads the files whose hashes changed, verifies
   every file, and moves the finished folder into place in one step.
3. `applyUpdate()` switches to it **on probation** and reloads.
4. The new game calls `bundleReady()` once it is drawing. If that has not happened within 30
   seconds, or by the next start, the shell deletes that build, goes back to the previous one
   (or the copy inside the APK) and refuses that build number from then on.

The update address is stored per tablet: start the app once with
`--es update_url http://...` (the `run` command does this for the emulator, pointing at the
Mac). Not done yet: choosing a permanent host, and signing the manifest so that only we can
publish (today the protection is the hash check plus whoever controls the address).

## Being the home screen

The HOME entry point is a separate alias (`.HomeAlias`) that is switched off at install, so
installing the app never changes what the Home button does. Turning on **Home screen** in
our Settings enables the alias and asks Android for the home role; Android shows its own
confirmation. This has to happen inside the app: on Android 10+ `adb` is not allowed to
enable a component. The activity is `singleTask` and is *not* hidden from recents, because
Peloton's software starts its own screen after a long idle and kills hidden tasks when it does.

## Ways back

See [../docs/REWIND.md](../docs/REWIND.md). In the shell: `RescueActivity` opens on a failed
page load, a crashed WebView, or three launches in a row without the game reporting ready
(in which case the HOME alias is also switched off, returning the Home button to the
original home screen). `adb shell am start -n com.merrymiles.app/.RescueActivity` opens it
from the Mac. The save data is written to `files/save/` after every change, with a dated
copy per day; `tools/tablet-backup.sh` reads it through `adb run-as`, which needs a debug build.

Start-up extras, for testing: `--es scene "machine=tread&rider=alex&at=0.9"` opens the game
in a situation (`tools/android.sh scene ...` wraps this).

## Sensor readers: what is known, what is left

See [../reports/Peloton tablet modding methods.md](../reports/Peloton%20tablet%20modding%20methods.md)
for the research, and [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for how we plan to
use it. In short: every machine exposes its sensors through the system service
`com.onepeloton.affernetservice`; the readers go in `sensors/Sensors.kt` behind
`SensorSources.create`. There is one for the Tread (`TreadReader.kt`) and one for the
original Bike (`BikeReader.kt`); on anything else the game runs on its simulator.

**Treadmill rule:** the same service will move the belt and the incline if asked. Our reader
may ask two questions only, "current speed" and "current incline" (calls 17 and 18), and
nothing else, ever. It registers nothing.
