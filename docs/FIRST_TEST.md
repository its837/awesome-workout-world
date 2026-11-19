# The first test on a real Peloton

Written 15 November 2026, before anything of ours has touched either machine. Every step
here is unverified on our own tablets until we do it. On 17 November the owner read the model
numbers off both screens: the treadmill is a 2021 Tread (`PLTN-TTR01`), not a Tread+, and
the bike has the newer original-Bike tablet (`PLTN-RB1VQ`). What that means for each is in
[tablets/README.md](tablets/README.md). The background is in
[reports/Peloton tablet modding methods.md](../reports/Peloton%20tablet%20modding%20methods.md);
the ways back are in [REWIND.md](REWIND.md).

## Treadmill or bike first?

**The treadmill first is fine, as long as the first evening stops at step 5 below.**

What the first evening does on either machine is the same and cannot affect the belt:
read the tablet, take a baseline, install our app as an ordinary app, open it, look at it.
Our app has **no real sensor reader yet** (`SensorSources.create` returns nothing), so on a
real tablet it runs with its built-in pretend machine and never speaks to Peloton's sensor
service at all. Nothing is switched off, and on a treadmill we never take the Home button.

Reasons to start with the treadmill:

- It is the machine the family will use for the mile-a-day walks.
- Its open questions decide the design, and Thanksgiving is close: does it accept installs;
  does the belt keep running with another app in front; does a "no membership" message cover
  the screen. (Tread or Tread+ is answered: the model number says Tread.)

Reasons the bike is the easier first machine (do it first if the evening is short):

- It is the proven path: almost every success report is a bike.
- There is no belt, no Tread Lock and no five-second watchdog to think about.
- The whole design is allowed there, including being the home screen.

**Stop and tell Claude before going further if the check says any of these:**

- `Peloton platform: aurora`. That is a Tread+ (32-inch screen). Nobody has published a way
  to read its speed, so the game could not know how fast you are walking. Do the bike
  instead while we work out a plan. (Not expected any more: ours is a `PLTN-TTR01`.)
- A build name starting with `N` (Android 7). Those tablets often refuse installs. On the
  bike this is the one thing the model number does not settle: the Build number is on the
  same About screen, and it should start with `R`. (`Q`, Android 10, is possible on this
  generation: not a stop, but say so first.)
- A line beginning `NOT WHAT WE EXPECTED`. The check compares what it reads with what we
  wrote down for our two machines.
- No USB debugging switch anywhere in Developer options.

## What to bring

- This Mac, on the same Wi-Fi as the tablet (only needed later, for updates over the air).
- A USB cable that **carries data**: USB-C for our treadmill, micro-USB for our bike.
  Charge-only cables are the most common reason nothing happens. The port is on the back of
  the screen.
- Close the Android emulator on the Mac, or leave it: with both attached the scripts use the
  real tablet and say so.

## The steps

1. **Keep the tablet off system updates.** If it offers a Peloton update, say no for now.
2. **Turn on USB debugging.** On the tablet: Settings → Device settings → System → About
   tablet → tap *Build number* seven times → back → Developer options → USB debugging on.
   Plug in the cable and tap **Allow** (tick "always") when the tablet asks.
   Settings is reported in the top-right corner of Peloton's screen (the time or a menu),
   or behind three dots in the bottom-right on some versions. The treadmill's socket is
   USB-C, on the back of the screen beside the headphone socket. Change nothing else in
   Developer options.
3. **Read the tablet. This changes nothing.**

   ```bash
   tools/tablet-check.sh
   ```

   It prints which machine this is, its Android version, the sensor service and what the
   home screen is now, and saves the report under `docs/tablets/`. Check it against the
   stop list above.
4. **Install.** The first install on a real tablet takes the baseline first (every package
   and setting as Peloton left them, kept under `docs/tablets/<tablet>/baseline/`).

   ```bash
   tools/android.sh install
   ```

   The script only installs a build signed with the family's fixed key
   ([android/signing/README.md](../android/signing/README.md)); anything else it refuses
   before touching the tablet.

   If the install is refused, the script reads the reason out of the tablet's own log (the
   Mac side is reported to fail "with a blank reason"). `keys mismatch` or `install denied`
   means stop: that tablet refuses installs as it stands. Nothing has changed.
5. **Open it and look.**

   ```bash
   tools/android.sh run
   ```

   Awesome Workout World should appear. Tap around: MERRY MILES, pick the tester (test controls only show
   for the person marked `tester: true`; SAM in the starter family), LET'S GO, and use TEST → FASTER to make the pretend machine move. Then back to Awesome Workout World and tap PELOTON: Peloton's
   own home screen should come back. Run the speed test (on the tester's calendar: TEST → SPEED TEST) and
   note the numbers: that is the first real measurement of whether the tablet keeps up.

   **A good first evening ends here**, with photos of anything odd.

### Treadmill only, and only if step 5 was clean

6. **Does the belt mind?** One adult, no children nearby, safety key clipped on.
   Start **Just Run** in Peloton's own screen and walk slowly. Open Awesome Workout World with
   `tools/android.sh run` from the Mac (the tablets' old hidden app list is gone, and nothing
   on the treadmill's own screen is known to open it). Watch for four things: does the belt keep moving; does
   Tread Lock come on; do the speed and incline knobs still work; do the stop button and
   pulling the safety key still stop the belt. Then go back to Peloton's screen.
   Whatever happens is the answer we need: if the belt stops or locks, the game has to sit
   beside Peloton's screen as an overlay on the treadmill, not in front of it.

### Later, not on the first evening

- Writing the real sensor reader for that exact machine (bike: cadence, resistance, power;
  treadmill: only "what is the speed" and "what is the incline", through a wrapper that
  cannot send anything else).
- Making Awesome Workout World the home screen (bike only; never on the treadmill).
- Streaming apps.
- Updates over the air: `HOST=0.0.0.0 node tools/serve.mjs` on the Mac, then
  `UPDATE_URL=http://<this Mac's address>:5173 tools/android.sh run` once.

## Going back

- Tap PELOTON on Awesome Workout World at any time.
- `tools/tablet-restore.sh` shows what differs from the baseline; with `--apply` it removes
  our app and puts everything back (copying the save data to the Mac first).
- The last resort is a factory reset from Android's settings.

## What we never do

Never switch off `com.onepeloton.affernetservice`. Never uninstall anything of Peloton's.
Never switch anything off on the treadmill. Never send the treadmill anything but the two
read-only questions. Never change a tablet without a baseline.

## The fuller list

[tablets/WHAT_WORKS.md](tablets/WHAT_WORKS.md) ends with everything worth measuring on the
first evening, in order: what the YouTube tile does, what Peloton's software does to an
app left in front for an hour, the screen size each tablet really gives, and more.

## What to send back

The report file from step 3 (`docs/tablets/…txt`), what step 4 printed, the speed-test
numbers, and for the treadmill what happened in step 6.
