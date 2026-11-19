# The bike and the treadmill: what is the same, what is different

Started 17 November 2026, the evening Awesome Workout World first ran on the real
treadmill. The bike has not been connected yet. Every "expect" in the bike column comes
from other owners' reports ([tablets/WHAT_WORKS.md](tablets/WHAT_WORKS.md)), not from our
bike. Add to this page whenever something is learned on either machine.

One build of the app goes on both machines. It asks the tablet which machine it is and
behaves accordingly, so nothing below needs two versions of the code unless it says so.

## Getting connected

| | Treadmill (done) | Bike (expect) |
|---|---|---|
| Cable | USB-C, socket on the back of the screen | Micro-USB that carries data |
| Where the switch is | Settings, System, About tablet, tap Build number 7 times; then System, Developer options, USB debugging | The same path is reported |
| Surprise | After switching USB debugging on, the cable had to be unplugged and plugged in again before the Allow box appeared | Try the same if no box appears |
| Android | 10 (build `QT.260814.B`) | 11 if the Build number starts with `R`. `Q` means 10: say so first. `N` means 7: stop, those often refuse installs |
| Installing | Accepted first time, and took updates over the top | Reported working on Android 11 |
| Signing key | The same key and the same commands for both. Never make a second key |

## What the app does

| | Treadmill | Bike |
|---|---|---|
| Name, icon, home page, ALL APPS, theme song, item names, thin readout | Same build on both |
| ALL APPS list | Android 10 shows every app without being asked | Android 11 hides other apps unless the app asks; the app does ask (checked on an Android 11 emulator). MediaTek's tools are on the hidden list as well as Qualcomm's |
| Home button | Off unless switched on for that one tablet from the Mac (`tools/android.sh home-ok yes`), then the switch in Device settings. Switched on 17 November: the bar's button now comes to our page | Offered straight away: the bike has no belt |
| Other apps | No app store on the tablet. Aurora Store 4.8.4 (from F-Droid) installed 17 November to fetch Hulu and Spotify; whether Peloton closes those like Netflix is not known yet | The same route is reported for the bike |
| Volume | The tablet's buttons are round the back, so the home page (MENU, top right), the ride (bottom left) and the YouTube viewer each have quieter / louder. They move the tablet's own volume | The same |
| Spoken voice | Peloton's own speech engine (`com.onepeloton.tts`): one woman's voice, so the game plays its words back low and robotic | Not known whether the bike has that engine. `tools/android.sh voice` tells you. Without one there is only the "ho ho ho" |
| YouTube tile | Browser engine 127 | Engine 91 or 127. The video-format fix matters most here: the bike's chip plays the newer formats badly. The log line starting "viewer:" says which way the fix went in |
| Netflix | An ordinary Netflix (9.40), put there by Peloton's device manager. It opens, and 9 seconds later `com.onepeloton.systempluginui` force-closes it and Peloton's activation screen comes up: no membership. On 17 November, with the owner's say-so and the belt stopped, that one part was switched off (`tools/android.sh plugin off`; `plugin on` puts it back). The belt lock, Just Run and the sensor service were left alone and kept running. Whether Netflix now stays open, and whether the belt still behaves, is being tested | Check ALL APPS. On bikes with no membership Peloton's software is reported to close it; the reported cure (switching off `com.onepeloton.systempluginui`) is allowed on the bike only |
| Screen | 1920 by 1080, with Android's bar over the bottom 72 | 1920 by 1008 reported (the same bar, kept out of the app's area) |

## What Peloton draws over other apps

| | Treadmill (seen) | Bike (expect) |
|---|---|---|
| Lock keypad | Yes: the belt lock, about every 45 seconds while no workout is running, over any app that is not Peloton's | No belt, so no belt lock |
| Cancelled-subscription message | Yes, from Peloton's home part | Reported on newer bikes; not known for ours |
| Bar along the bottom | Android's own navigation bar. Its button goes to whatever the home app is | The same |
| Peloton's home coming forward | When the tablet or our app starts, Peloton's "Activate your Tread" screen starts a moment later and covers us, even with us as the home app. Our app now comes straight back by itself: only when it is the home app, only in the first five minutes after the tablet starts or the first half minute after it does, only if it did not open the other screen itself, and four times at most. Seen working on the treadmill with Peloton's set-up screen started over us from the Mac, and then through a real restart of the tablet (the owner, 17 November): it ended on our page | Not known. With us as the home app it should not happen |

## Reading the machine (treadmill: working; bike: not written)

On the treadmill the reader went live at 19:55 on 17 November. With the belt stopped it
read 0.0 mph and 0.0 percent, twice a second, and Peloton's service logged exactly those
two questions from us and nothing else. The service's own "board read" errors in the log
were there all evening before the reader existed, at about the same rate. A few minutes later, on a
real walk started from Peloton's Just Run, the walker in the game followed the belt (the
reader logged 1.8 mph while Peloton's own log said 1.7).

| | Treadmill | Bike |
|---|---|---|
| Service | `com.onepeloton.affernetservice` 3.3.6 | The same service, version to be read |
| Interface | `ITreadInterface`: two questions only, current speed (17) and current incline (18). Confirmed for version 3.3.6 by reading that version's own code, copied off the treadmill. The reader is written (`TreadReader.kt`) and refuses any other version | `IV1Interface`: the app registers and is then sent cadence, resistance and power |
| Rule | Ask those two questions and nothing else. Never anything that could move the belt | Listen only |

Two separate readers have to be written. Everything else in the game already takes
either kind of reading.

## Still to do on the bike, in order

1. Read the Build number off the About screen.
2. `tools/tablet-check.sh`, then `tools/android.sh install`, then `tools/android.sh run`.
3. `tools/android.sh voice`.
4. Open ALL APPS and see what is there.
5. Switch on HOME BUTTON in Device settings.
6. YouTube tile: is a video smooth?

## Things the treadmill does by itself

- **It stops when nobody is on it.** On 17 November the belt was left running at 7.0 mph
  with nobody on it and stopped itself. Peloton's log recorded a stop event with source 32,
  which its own code names `MCB_PERSON_DETECT`: the motor controller decided nobody was
  there. Nothing to do with our app, which cannot send the belt anything.
- **Peloton's own little incline and speed readout** stays on screen over other apps
  during a walk. It is drawn by `com.peloton.activity`, the part that provides Just Run,
  on a protected layer, so it cannot be hidden without losing Just Run.
- **With the app-closing part switched off** the belt, Just Run and our reader all carried
  on working during real walks the same evening.

## Sharing the rides between the two machines

Each machine keeps its own log of rides and opened doors. Syncing (built 17 November 2026,
`android/.../Sync.kt`) sends that log to one file of its own in a private GitHub repository
that holds nothing else, and reads the other machine's file; the game adds whatever it had
not seen. Rides are only ever added, so neither machine can undo the other.

- It runs a few seconds after the app starts, a few seconds after every ride, every ten
  minutes, and from DEVICE SETTINGS, FAMILY LOG, SYNC NOW.
- Each tablet needs the key once: `tools/android.sh sync-key` on the Mac, with that tablet
  on the cable. The owner types the key; it is stored only in the app's private storage.
- Tested on the emulator against a stand-in for GitHub (`tools/sync-test-server.mjs`):
  24 rides sent, 2 from a pretend bike received, 26 sent back.
- Switched on for the treadmill the same evening: at 20:35 it sent its 5 rides to the
  real repository (`logs/treadmill.json`). The bike gets its key when it is connected;
  until then there is nothing for the treadmill to receive, so the receiving half has
  only been seen on the emulator.
- The emulator never gets the real key: it is full of made-up rides.
