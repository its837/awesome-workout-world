# Putting Awesome Workout World on a Peloton

There are two ways to do this. Pick one; you can move from the first to the second later.

| | **Side by side** | **Full takeover** |
|---|---|---|
| What you get | One more app on the tablet. Peloton is exactly as it was | The tablet starts up into Awesome Workout World. Peloton becomes one of the apps |
| For you if | You still use Peloton's classes, or it is somebody else's machine | You have stopped using Peloton's app and want the screen for yourself |
| What changes on the tablet | USB debugging switched on. One app added | The same, plus: the Home button, and on a machine with no membership, one Peloton part switched off |
| Undo | Uninstall the app | One switch and one command, or `tools/tablet-restore.sh` |

Everything here was worked out on two machines: a 2021 Tread (`PLTN-TTR01`, Android 10) and
an original Bike with its newer tablet (`PLTN-RB1VQ`). As of 17 November 2026 only the Tread
has had any of this done to it for real; the bike column of
[BIKE_AND_TREADMILL.md](BIKE_AND_TREADMILL.md) is still other owners' reports. Other
models: see [tablets/WHAT_WORKS.md](tablets/WHAT_WORKS.md) before you start.

**This is not made by, approved by, or known to Peloton.** It can stop working after any
Peloton update. Nothing here needs you to unlock, root or erase the tablet.

## What you need

- A Mac (the scripts assume one; Linux should work with small changes).
- A USB cable **that carries data**: USB-C for the Tread, Bike+ and Row; micro-USB for the
  original Bike. Charge-only cables are the usual reason nothing happens.
- Android's command-line tools (`adb`, and the SDK to build), Java 17, and Node.
- A nerd, ideally. If you are not one, find one.

## Both ways start the same

1. **Get the code** and open a terminal in its folder.
2. **Make your signing key.** Once, ever:

   ```bash
   tools/android.sh make-key
   ```

   Every build is signed with it, and a tablet will only take an update signed with the
   key its first copy had. Copy the `android/signing/` folder somewhere safe. It is left
   out of git on purpose.
3. **Make it your family's.** The easy way is the family meeting: give
   [FAMILY_MEETING.md](FAMILY_MEETING.md) to your AI and answer its questions. It writes your
   family into the private `family/` folder. (Or do it by hand: [YOUR_FAMILY.md](YOUR_FAMILY.md).
   Or skip this and meet the starter, one made-up person called Nerd, first.) New to all this?
   Read [../FOR_STUPID_PEOPLE_USING_AI_TO_DO_THINGS_THEY_SHOULDNT.md](../FOR_STUPID_PEOPLE_USING_AI_TO_DO_THINGS_THEY_SHOULDNT.md) first.
4. **Build the app:**

   ```bash
   tools/android.sh build
   ```

5. **Switch on USB debugging on the tablet.** Open the tablet's settings (the time or a
   menu in the top-right corner of Peloton's screen; three dots in the bottom-right on
   some versions), then Device settings, System, About tablet. Tap **Build number** seven
   times. Go back one screen, open Developer options, and switch on **USB debugging**.
   Change nothing else there.
6. **Plug in the cable** and tap **Allow** on the tablet (tick "Always allow from this
   computer"). If no box appears, unplug the cable and plug it in again: on our Tread the
   box only appeared after that.
7. **Read the tablet. This changes nothing.**

   ```bash
   tools/tablet-check.sh
   ```

   Stop if it says the build starts with `N` (Android 7: those often refuse installs), or
   that the platform is `aurora` (a Tread+: nobody has published how to read one).
8. **Install.** The first time, this saves a record of the tablet exactly as Peloton left
   it, then adds the app.

   ```bash
   tools/android.sh install
   ```

9. **Open it.**

   ```bash
   tools/android.sh run
   ```

That is **side by side**, finished. The app is one more app. To open it without the Mac:
the tablet's Settings, Apps, Awesome Workout World, Open. Peloton's home screen is under
ALL APPS, PELOTON. To remove it completely: `tools/tablet-restore.sh --apply`.

On a machine with no Peloton membership you will see Peloton's own screens push in front
of it from time to time, and Peloton's software closes some other apps (Netflix, on our
Tread, nine seconds after it opened). Side by side leaves all of that alone.

## Full takeover

Do the steps above first. Each step below is separate: stop wherever you like.

### 1. Make it the home screen

On a **bike**: on the home page, DEVICE SETTINGS, HOME BUTTON, tap OFF, and pick Awesome
Workout World when Android asks.

On a **treadmill** the switch is hidden until you say so from the Mac, because a treadmill
has a belt and this is a bigger decision there:

```bash
tools/android.sh home-ok yes
```

Then use the same switch. From then on the button on the bar along the bottom of the
screen comes to our page from anywhere, and the tablet starts up into it. (Peloton's
"Activate" screen starts itself a moment after the tablet does; the app comes back to the
front by itself.)

Undo: the same switch. Or `tools/android.sh home-ok no`.

After a **sleep** the tablet can still wake up on Peloton's "Activate" screen (Peloton puts
it on top while the screen is off). The Home button on the bottom bar brings our page back.
To have it come back by itself, allow our app to step in front:

```bash
tools/android.sh front yes
```

Undo: `tools/android.sh front no`. (Why this is needed is in [REWIND.md](REWIND.md).)

### 2. Stop Peloton closing other apps

Only matters with no membership. One part of Peloton's software, the "system plugin",
closes apps like Netflix and draws Peloton's overlays over them.

```bash
tools/android.sh plugin off
```

Do it **with the belt stopped**, then check that the belt still starts and stops from
Peloton's Just Run before anyone walks on it. On our Tread it did.

Undo: `tools/android.sh plugin on`.

### 3. Get other apps

The tablet has no app store. One way is Aurora Store, an unofficial open-source app that
fetches real apps from Google Play. Install its `.apk` with `adb install`, then open it
from ALL APPS and install what you want. Anything you install shows up in ALL APPS.
Signing in, and every tap inside the store, is yours: your AI must not type your passwords.

By default the home screen is just the game and ALL APPS: no TV apps. If you want YouTube,
Netflix, Hulu or a music app as tiles on the home screen, say so in the family meeting (it is
the `home` list in `family/family.js`, see [YOUR_FAMILY.md](YOUR_FAMILY.md)). A tile only opens
an app that is installed, so you need this step first. On a machine with no membership,
Peloton's own software may close Netflix a few seconds after it opens; see step 2 above.

### 4. Share the rides between two machines

(This is the **advanced set-up**; the plain-words version, with what is built and what is only
a plan, is [ADVANCED_SETUP.md](ADVANCED_SETUP.md). Most people never need it.)

Each machine keeps its own log of rides. To keep two in step, make a private repository
that holds nothing else, put its name in `android/signing/log-repo.txt` (`owner/name`),
make a key that can read and write that one repository, and with each tablet on the cable:

```bash
tools/android.sh sync-key clipboard
```

(with the key on the clipboard). See "Sharing the rides" in
[BIKE_AND_TREADMILL.md](BIKE_AND_TREADMILL.md).

## What the app does to the machine

It **reads** it. On a treadmill it asks Peloton's sensor service two questions, "what is
the belt speed" and "what is the incline", and cannot ask anything else: there is no code
in it that can start, stop, speed up, lock or unlock a belt. On an original Bike it asks to
be told the bike's numbers (cadence, resistance, power) and can ask for nothing else.

It only talks to a version of that service whose numbering somebody has read for themselves
(`TreadReader.kt`, `BikeReader.kt`); with any other version it asks nothing and the game
runs on pretend numbers. **Peloton updates that service by itself.** If the home page says
"(SIMULATOR)" under the machine's name, that is what has happened: see "When Peloton
updates its sensor service" in [BIKE_AND_TREADMILL.md](BIKE_AND_TREADMILL.md). A Bike+ or a
Tread+ has no reader yet and always shows the simulator.

## What never to do

- **Never switch off the belt lock** (`com.onepeloton.sensorstateindicator`). It asks for
  a code about every 45 seconds while nobody is walking, over any app that is not
  Peloton's. That is annoying. It is also what stops a child starting the belt.
- **Never switch off the sensor service** (`com.onepeloton.affernetservice`) or the part
  that provides Just Ride and Just Run (`com.peloton.activity`).
- Never uninstall anything of Peloton's.
- Never change a tablet without the saved record `tools/android.sh install` makes first.

## Things Peloton still does, even after a full takeover (on a Tread, with no membership)

- The lock keypad, as above.
- A "your subscription was cancelled" message over every app, and a small incline and
  speed readout during a walk. Both come from the part that provides Just Run.
- It stops the belt by itself if nobody is on it.

## Going back

- Peloton's own home screen: ALL APPS, PELOTON, at any time.
- `tools/tablet-restore.sh` shows what differs from the saved record; with `--apply` it
  removes the app and puts everything back.
- The full list of ways back is in [REWIND.md](REWIND.md).
