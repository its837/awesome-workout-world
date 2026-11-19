# Always being able to go back

The rule for this project: **nothing we do to a tablet is a one-way door.** This page lists
every way back, from a single tap to a full reset, and the habits that keep it true.

## The ladder, gentlest first

| # | Where | What you do | What it undoes |
| --- | --- | --- | --- |
| 1 | Awesome Workout World home screen | Tap the **PELOTON** tile | Nothing needs undoing: it just opens Peloton's own screens. Awesome Workout World stays installed. |
| 2 | Awesome Workout World → Device settings | **Home button: OFF** | The tablet's Home button goes back to Peloton. Awesome Workout World becomes an ordinary app again. |
| 3 | Awesome Workout World → Device settings | **WAYS BACK** | Opens the rescue screen (below) on purpose. |
| 4 | Automatic | Nothing | If Awesome Workout World fails to start three times running, it hands the Home button back to Peloton by itself and shows the rescue screen. |
| 5 | Automatic | Nothing | A game update that does not start is thrown away after 30 seconds and the previous version comes back. |
| 6 | This Mac, USB cable | `tools/tablet-restore.sh --apply` | Switches back on anything switched off since the baseline, gives Home back, removes our app. Copies the save data to the Mac first. |
| 7 | The tablet's Android settings | Factory reset | Everything. The tablet is as Peloton shipped it (on its current system version). |

### The rescue screen

A plain Android screen with no game behind it, so it works when the game does not:

- Open the original home screen
- Give the Home button back
- Use the built-in game (forget downloaded updates; rides are kept)
- Android settings (Wi-Fi, apps, factory reset)
- Try Awesome Workout World again

From the Mac it can be opened at any time with:

```bash
adb shell am start -n com.merrymiles.app/.RescueActivity
```

## Before we touch a tablet

`tools/android.sh install` does both of these by itself the first time it meets a real
tablet; they can also be run by hand.

```bash
tools/tablet-check.sh
```

Reads the tablet and reports what it is. Changes nothing.

```bash
tools/tablet-snapshot.sh
```

Takes the **baseline**: every package and whether it is switched on, what the Home button
opens, and the system settings, saved under `docs/tablets/<tablet>/baseline/`. A baseline is
never overwritten. It is what "back" means for that tablet.

At any later point, this shows exactly what differs from the baseline, without changing anything:

```bash
tools/tablet-restore.sh
```

## Save data

The family's rides live in the game's storage on each tablet. The tablet app also writes
them to a plain file after every change, and keeps one copy per day for 30 days.

```bash
tools/tablet-backup.sh
```

Copies that file and its daily history to `backups/<tablet>/<date-time>/` on this Mac. That
folder is in Google Drive, so it is off the house as well. It runs automatically before
every reinstall and before a restore removes our app.

```bash
tools/tablet-backup.sh restore backups/<tablet>/<date-time>/save.json
```

Puts a backup back. Restoring **merges**: rides are only ever added, so an old backup can
never remove a ride that happened since. After a factory reset, or on a replacement tablet,
this brings the whole history back. To undo an accidental "Erase all rides", restore
yesterday's dated file.

What is *not* protected until we set up sharing: a ride done after the last backup, on a
tablet that is then factory reset or dies. Backing up is one command; do it before anything risky.

## What we never do

- **Never switch off `com.onepeloton.affernetservice`.** It is the sensor and belt controller.
- **Never uninstall anything of Peloton's.** Switching a package off can be switched back
  on; an uninstall can only be undone by a factory reset. Our tools have no uninstall
  command for anything but our own app.
- **Never switch anything off on the treadmill.** Peloton's software has to stay in charge
  of the belt. On a treadmill Awesome Workout World also refuses to take the Home button.
- **Never send the treadmill anything but "what is the speed?" and "what is the incline?".**
- **Never change something on a tablet without a baseline.**
- **Do not let a tablet take a Peloton system update mid-experiment.** A system update is the
  one thing a factory reset does not rewind.

## What a factory reset does and does not do

It removes our app, every other sideloaded app, our save file, and any package we switched
off comes back on. It does **not** roll the tablet back to an older Peloton system version;
whatever version it was on, it stays on. So a reset always gets back to "stock Peloton", but
if Peloton has tightened something in a newer version, the reset will not loosen it.

## Tested, and not

Tested on the emulator: the Peloton tile opening the original home screen, the rescue
screen, self-rescue after repeated failed starts, rollback of a broken game update, the
snapshot and restore scripts, and backing up and restoring save data across a full wipe.

Not tested anywhere: any of this on a real Peloton. The emulator's "original home screen"
is plain Android's, not Peloton's.

## Switched off on the treadmill: one Peloton part

Since 17 November 2026 the treadmill has `com.onepeloton.systempluginui` switched off
(it was closing Netflix nine seconds after it opened). Its owner said yes to this one; the
rule for everything else of Peloton's on the treadmill has not changed.

- Put it back: `tools/android.sh plugin on`
- The record of the tablet just before: the dated snapshot in that tablet's own folder under `docs/tablets/` (private, not in the repository)
- `tools/tablet-restore.sh` also lists it as a difference from the baseline and can undo it.
- Never switch off: the belt lock (`com.onepeloton.sensorstateindicator`), Just Run
  (`com.peloton.activity`) or the sensor service (`com.onepeloton.affernetservice`).
- Seen afterwards: Peloton's home part tries to reconnect to the missing part every three
  seconds and logs that it cannot. Nothing else reacted.

## Allowed on a tablet, if its owner says so: coming back to the front after a sleep

On a Peloton with no membership, Peloton puts its "Activate" screen on top of ours while
the screen is off, so the tablet wakes up on it. Android 10 does not let an app step back
in front by itself unless it holds the "display over other apps" permission. We never draw
over anything; holding it is only what lets us come forward.

- Allow it: `tools/android.sh front yes` (one tablet at a time, with the cable in).
- Take it away: `tools/android.sh front no`. Uninstalling the app also removes it.
- Without it nothing breaks: after a sleep, press the Home button on the bar along the
  bottom and our page comes back.
- Switched on for the treadmill on 18 November 2026, on its owner's say-so. Tested there
  that day, both ways: without it Android refuses the step forward ("Background activity
  start" in the log); with it, our page was back in front 0.3 seconds after the screen
  came on, with another app left on top of it during the sleep.
