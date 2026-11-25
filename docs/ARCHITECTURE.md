# How Awesome Workout World and Merry Miles fit together

The decisions behind the build, and the ones still open. The evidence for the
Peloton-specific parts is in
[reports/Peloton tablet modding methods.md](../reports/Peloton%20tablet%20modding%20methods.md).

## Three layers

| Layer | What it is | How it changes |
| --- | --- | --- |
| **Shell** | The Android app in `android/`. Shows the page, reads sensors, opens other apps, downloads updates, can be the tablet's home screen. | USB cable and `adb install`. Should change rarely. |
| **Game bundle** | Everything in `web/`: the Awesome Workout World home page, Merry Miles, map, calendar, songs, art. | Over Wi-Fi from Awesome Workout World → Device settings → Check for updates. This is the part we will keep changing. |
| **Family data** | The log of finished rides, plus settings. Lives on each tablet. | Grows as people ride. Never touched by an update. |

The home screen is part of the bundle on purpose: a new season can re-theme the whole
tablet without a cable.

## Getting home, always

Inside our own screens there is one rule: the back button is always top-left, and from
anywhere two taps reach Awesome Workout World. A ride is never abandoned by accident: Back and Home
during a ride only pause it.

Across apps (leaving Netflix, say) there are three mechanisms that other projects have
running on Peloton tablets. We use the first and keep the others in reserve:

1. **Be the home screen.** Once Awesome Workout World holds Android's home role, the tablet's own Home
   control returns to it from any app. Built: Awesome Workout World → Device settings → Home button. On the treadmill we
   may choose not to (see the treadmill constraint below) and open Awesome Workout World as an ordinary app.
2. **A small always-on-top Home button** drawn over other apps. Needs a one-time permission
   granted over USB. Not built; add it if the tablet's own Home control turns out to be
   awkward on our machines.
3. **An accessibility service** that can trigger Home from, for example, a long press of a
   volume button. Not built; last resort.

Device settings also has a way into Android's own settings, so Wi-Fi, volume and Bluetooth are
never out of reach.

## Getting back to Peloton, always

Covered in full in [REWIND.md](REWIND.md). The design rule is that every layer has its own
way out that does not depend on the layer above it working: a tile in the game, a native
rescue screen in the shell that needs no game, a self-rescue that needs no person, a script
on the Mac that needs no working app, and a factory reset that needs none of the above.
The family's rides are mirrored to a plain file on the tablet and copied to the Mac before
anything risky.

## Updates

Described in [android/README.md](../android/README.md#game-updates). The properties that matter:

- A tablet only moves to a build with a higher number, every file is checked against its
  fingerprint, and the switch is all-or-nothing.
- A new version is on probation until it reports that it started. A version that fails is
  deleted, the tablet returns to the one before, and that build is never offered again.
- Family data is stored against one fixed address, so no update can lose it.
- The shell itself is not updated this way. Replacing an installed Android app always needs
  either a cable or a person tapping through Android's installer screens.

**Still to decide: where updates live.** For now it is this Mac's dev server, which only
works while the Mac is on and on the same Wi-Fi. A permanent home needs to be a plain file
host. Two things to weigh:

- Anything public (GitHub Pages, say) should not include `web/photos/`. Family photos would
  go onto each tablet separately.
- Whoever can write to that host can change what runs on the tablets. Signing the manifest
  with a key that stays on this Mac closes that; it is the next hardening step.

## The family trail: does it need a server?

**On one tablet, no.** Tents, the map and the advent calendar all work from the ride log
stored on that tablet, with nothing else involved.

**Across the bike and the treadmill, something has to carry the log between them.** They
are two separate computers, so for a tent pitched on the treadmill to show up on the bike,
both need to reach a shared copy. The log was designed for this: rides are only ever added,
never edited, so combining two tablets' logs is just "keep every ride either one has seen".
There is no way for them to disagree.

The options:

| Option | Works when | Cost |
| --- | --- | --- |
| **A small online store** both tablets read and write | Always | One free account to create; a few dozen lines to add |
| The two tablets talk directly over home Wi-Fi | Only while both are switched on | No account, but tents update late |
| This Mac acts as the hub | Only while the Mac is on | No account |

Recommendation: the small online store. It is the only one where you finish a ride, walk
over to the other machine, and your tent is already there. It can be the same place the
updates are hosted. Until it exists, each machine keeps its own trail.

**Decided 14 November 2026:** the online store is the goal, after the first tests on the
real tablets. It will also hold the family's own details (names, looks, photos), so that
the code can be published without them. The order of work is in the README under
"What's next".

## Sensors

Written for the Tread and the original Bike (`android/.../sensors/`), and checked on our own two machines in November 2026. Not written for the Bike+ or the Tread+. What the research says:

- **Every machine** exposes its sensors through one Peloton system service. Which machine
  we are on has to be read from a Peloton setting (`peloton_platform`); the tablet's model
  name is not enough, because Bike+, Tread and Row share a tablet.
- **Bike:** the service calls us back with a block of numbers. The first six are the same
  in every version anyone has seen (cadence, power, two internal values, resistance, target
  resistance), so we read those and ignore the rest. Power arrives in hundredths of a watt.
  Speed is not reported; it is worked out from power, as the game already does.
- **Bike+:** a different interface on the same service, asked for readings several times a second.
- **Tread:** the safest published approach asks two questions twice a second, "current
  speed?" and "current incline?", and registers nothing. That is the one we will copy. Both
  answers come in tenths (of mph, of a percent).
- **Tread+:** nobody has published a way to read it.
- **Ours** are an original Bike (tablet `PLTN-RB1VQ`) and a 2021 Tread (tablet
  `PLTN-TTR01`), read off the screens on 17 November 2026 and not yet confirmed over a
  cable: [tablets/README.md](tablets/README.md). So the two readers to write are the Bike's
  and the Tread's; the Bike+ and Tread+ cases are not ours.
- The existing readers we learn from are a mix of licences (one has none at all), so ours
  will be written fresh from the documented layouts, with credit, not copied.

### The treadmill constraint

This is the finding that changes the plan. According to one person's analysis of an older
version of Peloton's sensor service, it switches the belt off after five seconds unless one
of Peloton's own screens is connected to it. The one project that replaces Peloton's
treadmill screen entirely gets round this by sending the service unlock, enable and
set-speed commands, which is exactly what we have ruled out.

So on the treadmill, **Awesome Workout World sits alongside Peloton's software, it does not replace
it**. The belt is started the normal way (Peloton's Just Run), and our app listens. Two
things are unknown until we try it on our own Tread: whether that watchdog still exists in
the current version, and whether the belt keeps running while our app is on screen on a
machine with no membership (the two reports that exist disagree).

In code, the treadmill reader will be able to send exactly two calls. Every other call the
service understands, including about forty that are known to move, lock or unlock the
machine, is refused before it leaves our app.

## What the research says to expect on the real tablets

- **The biggest risk is getting installed at all.** Some tablets without an active
  membership refuse every install over USB with "keys mismatch. install denied". It is
  reported mostly on the oldest (Android 7) tablets and on never-activated units; the
  community workaround (factory reset, then install before the tablet updates itself) works
  for some owners and not others. The first thing to do with each tablet is read its model
  and build number and try installing one harmless app, before we invest in anything else
  for that machine.
- Tread and Tread+ are the least proven. There are far fewer success reports than for the
  bikes, and none for a Tread+ in the last two years.
- Nothing deeper than installing apps is proven anywhere: no root, no replacement operating
  system. Our plan does not need either.
- Apps get 1920×1008 on the Bike's tablet, not 1080. The game already adapts.
- After about 30 minutes idle, Peloton's software puts its own screen in front. The Home
  control brings ours back; the shell is set up not to be killed when that happens.
- Without a membership, two Peloton system apps can close or cover other apps. Other
  owners switch them off over USB. That is a per-tablet step to do carefully and only if
  we see the problem, and the sensor service must never be switched off.
- A system update or a factory reset undoes all of it, so we should stop the tablets
  updating before we start.
- Streaming, as checked against our two models on 17 November
  ([tablets/WHAT_WORKS.md](tablets/WHAT_WORKS.md)): Netflix runs as a normal phone app, but
  Peloton's software closes it on tablets with no membership unless one Peloton part is
  switched off (allowed on the bike, ruled out on the treadmill). Spotify has one thin
  report. Hulu installs but nobody has confirmed it plays. The official YouTube app wants
  Google's services, which the tablets lack. Our YouTube tile opens the website in our own
  viewer, which nobody has reported on a Peloton: the reported routes are a small embedded
  player (with a fix so the bike is sent a video format its chip can play) or a real
  browser app. We keep the website because the embedded player cannot search or browse,
  and our viewer now carries the same fix (`WatchActivity.kt`: it tells YouTube the tablet
  cannot play VP9 or AV1, so YouTube sends H.264). Signed out only.
- Signing: one fixed key signs every build, kept in `android/signing/` with a second copy
  on the Mac ([android/signing/README.md](../android/signing/README.md)). A tablet takes
  updates only from the key its first copy was signed with, so the key never changes, and
  `tools/android.sh install` refuses to put any other build on a real tablet. That folder
  and `docs/tablets/` are private: leave both out of any copy other people can see.

## Keeping a frame cheap

The picture is a 640-pixel-wide canvas scaled up three times, drawn with ordinary 2D canvas
calls. On a slow tablet the cost of a frame is, above all, **how many drawing calls it
makes**: every call crosses from JavaScript into the browser and is replayed later for the
graphics chip. The first version made about 5,300 a frame. These are the things that
brought it to roughly 900 to 2,300 (light to full, with every tree lit), and they are worth
keeping in mind before adding anything that draws:

- **The ground is one picture.** Trail, banks, tracks and the frozen lake are painted into a
  pixel buffer row by row and put on screen in a single step (`World.render`).
- **Sprites are drawn once and tinted cheaply.** `sprites.js` keeps every sprite's untinted
  pixels for good; a time-of-day step only re-tints, a few sprites per frame. (A step used to
  re-draw everything and cost three slow frames in a row.)
- **Fairy lights are part of the tree unless the tree is close.** Two baked pictures per
  tree, swapped to twinkle. Only the nearest trees get individual dots, and their halos are
  two ready-made layers per tree, not one halo per light.
- **Things that animate remember their poses.** The rider, the dogs and the buddies cut
  their motion into a fixed number of poses and draw each one once (`Frames` in `sprites.js`).
- **Stars are four pictures, the aurora is one small one** repainted a few times a second.
- **Letters carry their own shadow**, so text is one call per letter, not two.

`detail.js` holds the dials (trees, fog distance, snow, glows), the three presets, and the
governor behind AUTO. `bench.js` is the speed test. Both are reachable from the TEST drawer's
LOOK page, and `tools/android.sh speedtest` prints the same numbers from the Mac.

## Awesome Workout World is the device; Merry Miles is one app on it

Decided 15 November 2026. Awesome Workout World (`launcher.js`, `device.js`, `retro.js`) is the
tablet's home page and knows nothing about riding: apps, the build number, device
settings (updates, the Home button, the ways back to Peloton and to Android's settings).
No trail map, no test controls, no game settings there. The game's own switches are
inside the game (`settings.js`). The screen where somebody sets off (their own advent
calendar, in `home.js`) takes over the whole display: no menu behind it.

**Test controls are for one person** (16 November 2026): the profile marked `tester: true`. `App.canTest(profile)` is the only gate. The tester gets a TEST button on their
own calendar (the Workshop) and on their own rides (the drawer); nobody else sees one.
The drawer's THINGS page lists the whole catalog and sets off any of it through each
thing's `open` and `show` hooks, whatever the calendar says, without saving anything.

## Doors, miles, advent things and rewards

Decided 15 November 2026, replacing "a door at every trail mile":

- **The goal** of an outing is today's mile (walked or ridden; a mile is a mile, decided 16 November), less
  what has been done today. `Session` now has a distance goal, and the sunrise follows
  distance, not minutes.
- **Doors are unlocked by riding and opened by tapping** (16 November, later; before that a
  minute opened every missed door by itself). Each minute ridden (`OPEN_AFTER` in
  `camp.js`) unlocks the next door whose day has come. An unlocked door hovers beside the
  rider until tapped (`RideScreen._knock`), then opens in the side card
  (`drawDoorSide` in `door.js`); or it is tapped later on the rider's own calendar
  (`Season.openNext`). One at a time, in order. `Season._doors(id)` gives
  `{ unlocked, open }`: a ride record carries `unlocked` and `opened` (how far its rider
  had got when it ended), a door opened on the calendar is a record in `store.opens`
  (grow-only, merged like the rides), and an older ride with only `open: 1` counts as
  having opened everything up to its day.
- **Who is about** on a ride is decided in one place, `RideScreen._direct`: usually one or
  two buddies and one dog, changing every 22 to 77 seconds, with `gather()` bringing
  everybody for half a minute every five to twelve minutes. Buddies leave through
  `Buddies.leave`; a dog is kept away with `Companion.benched`.
- **Your items** (`RideScreen._items`): the feasts the rider has, each usable again
  `ITEM_EVERY` seconds of riding after it was eaten. They are no longer on the reward cards.
- **Advent things versus rewards.** Everything behind a door (`gifts.js`: buddies, the
  dogs, feasts, surprises; not songs, which are all free since 16 November) is held out of the game until that door is open, then kept for
  good: `Season.unlocks(id)`. The one rule: *whatever is behind a door stays out until it
  is open; anything not behind a door is always there.* The ride applies it in one place
  (`RideScreen.has`), which switches off dogs, buddies, locked songs (`Sound.locked`),
  and the hidden sights (`World.hide`, `Sky.noSleigh`, `Sky.noAurora`). Mile rewards
  (`rewards.js`) are cookies and sparkle only, are never gated, and last for the ride they
  were picked on (a new `Rider` starts plain).
- **A door opening is one show**, in `door.js` (`doorCard`, `stepDoor`, `drawDoor`), used
  by the ride, by a replay on your own calendar, and by TEST. A thing's `quip` is what it says.
- **Who is here.** `Season.here(p)`: a person with `arrives` is behind that day's door
  (`join:0`, the first to arrive) and joins when somebody opens it, or the day after; a dog with
  `unlockedBy` joins when those people have opened its door. Every screen that lists the
  family uses `Season.family()`, `people()`, `dogsHere()` or `roster()`.
- **Nobody rides as a dog** (15 November). A dog earns its own miles: whatever a rider
  covers while the dog is beside them is added to that ride's record as
  `dogs: { <the dog's id>: { m, poops, sprinkles } }`, and `Season.dogStats` adds them up.

## One catalog, so things can keep being added

Decided 15 November 2026, after nine things were added in one day. Everything you can get
is in `web/src/gifts.js`, and nothing else in the game names a particular thing:

- **A thing** has an id, a kind (`set`), a name, a line of words, a picture, and up to
  three hooks: `start` (bring it into a ride), `hold` (keep it out), `open` (its door has
  just opened). A kind supplies default hooks (`KINDS`); a surprise brings its own (`SIGHTS`).
- **A ride** walks the catalog once at the start and calls `start` or `hold` on every
  thing, and calls `open` when a door opens. `RideScreen` offers the hooks a few plain
  verbs (`arrive`, `bringDog`, `newSong`, `eat`, `stepOut`) and some switches.
- **Three ways to get things:** a door (`DOOR_GIFTS`, or the order in `tweaks.js`), a rule
  worked out from the ride log (`EARNED`: a streak, for now), or a card every mile
  (`rewards.js`).
- **A door can hold several things** (`['penguin', 'flurry']`), so a new thing never has to
  push another off the calendar. Anything on no door is in the game from day one.
- **Things that come and go do it at random** (16 November): each buddy picks its next move
  and how long for (`buddies.js`), and each visiting surprise has a "next due" time with a
  wide spread (`relativeAt`, `bearAt`, `discoAt` in `ride.js`). Nothing repeats on a beat.
- **Adding a thing** is one entry in the catalog (or in `profiles.js` / `carols.js`) plus a
  place on the calendar. The steps are at the top of `gifts.js`.

What this does not solve: the calendar, the dogs' three-person rule and everybody's miles
are worked out from the ride log **on each tablet separately**. Until the bike and the
treadmill share one log (the online home), somebody who uses both has two calendars.

## Open decisions

1. A name for the home screen. "Awesome Workout World" is a placeholder that fits the tents; it is one line to change.
2. Where updates and the shared trail live (see above).
3. The door order in `gifts.js`, the things Claude invented to replace the songs (disco snow, drop bear, kangaroo, fireworks), every thing's quip, and how the relative who flies in is drawn (`relative.js`; who it is comes from `family.js`) are Claude's choices. A mile is a mile on either machine (his call, 16 November: the old five-to-one rule for the bike is gone), so somebody who rides the bike for twenty minutes covers about six miles of a thirty-mile trail. The name of the challenge ("The Merry Mile-a-thon") is a placeholder he can retype. A dog collects miles from everybody's rides, so it will lead the map: say if a dog's place should be worked out another way. The style asked for two of the songs could not be identified from a web search; the two brassy tunes were written on a guess.
3a. Added 17 November, and Claude's choices within what he asked for: Edward's door (December 14) and Sexy Santa's (December 23; he said only "late"), which two foods gave up their doors (the flat white and prime rib: they are mile treats now), what the two of them shout, and keeping Edward a send-up of the type, with no film or book names and no quoted lines in the game. Sexy Santa's look is drawn in `web/src/santa.js`.
4. What the family actually look like: Google Photos had no named faces, so only the heights are real so far.
