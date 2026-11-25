# What works on our two tablets

Written 17 November 2026. It checks every feature Awesome Workout World has, or plans, against what
other owners have reported for our two exact tablet models. It was made from our own
research notes (14 November) and our code as it stands today. No web lookups were done.
Nothing was plugged in, built or run.

**This page was written before anything of ours had been on either tablet: every line
below is somebody else's report, or a gap. What we have since seen on our own Tread and
our own Bike is in [../BIKE_AND_TREADMILL.md](../BIKE_AND_TREADMILL.md).**

## The short version

1. **Getting installed and reading the machine look good on both.** Other owners report
   installs over a cable, and the sensor readings we want, on both of our exact models in
   2026. (Since then both of our readers have been written and checked on our own machines.)
2. **The bike is the well-trodden one.** Being the home screen, the 1920 by 1008 screen
   area and the 30-minute idle behaviour all have reports on a `PLTN-RB1VQ`.
3. **The treadmill is where the streaming tiles are in doubt.** On the one Tread studied,
   Peloton's own software closed Netflix-type apps and covered the screen. The only known
   fix is switching Peloton parts off, which we have ruled out there.
4. **YouTube is not set up the proven way.** Our tile opens YouTube's website in our own
   viewer. Nobody has reported that. The reported ways are a small embedded player with a
   video-format fix, or a real browser app. (The video-format fix was added to our viewer
   the same evening: see "Mismatches in our code".)
5. **Three things nobody has reported at all:** picture quality (HD or not) in Netflix,
   how fast a game like ours runs, and how to open Awesome Workout World on the treadmill without the Mac.

## How to read this

Each cell starts with one verdict:

- **Reported working on this exact model**: somebody did it on a `PLTN-TTR01` or
  `PLTN-RB1VQ`. The note says which software version and when.
- **Reported working on a related model only**: done on a sister tablet, not ours.
- **Reported failing or blocked**: somebody tried and Peloton's software got in the way.
- **No report: must be measured on our tablet**: nobody has written it down.
- **Only by doing something we have ruled out**: it has been done, but only by breaking
  one of our rules.

Our rules, which change some verdicts:

- On the treadmill we switch nothing off, remove nothing, and never become the home screen.
- On either machine we never switch off `com.onepeloton.affernetservice` (the part that
  talks to the machine) and never remove anything of Peloton's.
- The treadmill reader may ask two questions only: current speed, current incline.
- Every change to a tablet needs a baseline first and a way back.

Words used below:

- **Viewer**: the plain web page window inside our app (`WatchActivity`).
- **Browser engine**: the part of Android that draws web pages. Our whole game runs in it.
  Its version number matters (91 is old, 127 is recent).
- **Package**: an app or system part, called by its internal name, like `com.netflix.mediaclient`.
- **Overlay**: a window drawn on top of whatever app is in front.
- **Google's helper apps**: Play services and friends. Many Google apps refuse to run without them.
- **H.264 and VP9**: two ways of packing video. The bike's chip plays H.264 easily and VP9 badly.

Where each fact comes from: the numbered notes under each table. `apps:43` means line 43 of
`apps_launcher_updates.md`. The files are:

| Short name | File |
|---|---|
| `apps` | [research_notes/Peloton tablet modding methods/apps_launcher_updates.md](../../research_notes/Peloton%20tablet%20modding%20methods/apps_launcher_updates.md) |
| `openride` | [research_notes/Peloton tablet modding methods/openride.md](../../research_notes/Peloton%20tablet%20modding%20methods/openride.md) |
| `openpelo` | [research_notes/Peloton tablet modding methods/openpelo.md](../../research_notes/Peloton%20tablet%20modding%20methods/openpelo.md) |
| `community` | [research_notes/Peloton tablet modding methods/community_methods.md](../../research_notes/Peloton%20tablet%20modding%20methods/community_methods.md) |
| `sensors` | [research_notes/Peloton tablet modding methods/sensor_protocol.md](../../research_notes/Peloton%20tablet%20modding%20methods/sensor_protocol.md) |
| `pip` | [research_notes/Picture in picture options.md](../../research_notes/Picture%20in%20picture%20options.md) |
| `report` | [reports/Peloton tablet modding methods.md](../../reports/Peloton%20tablet%20modding%20methods.md) |

The notes keep the strength of each claim: **first-hand** (the person did it),
**documented** (a project's own write-up), **user report**, **second-hand**,
**generic Android** (true of Android in general, not checked on a Peloton), or **a guess**
by whoever wrote the note.

---

## A. Watching and listening: YouTube, Netflix, Hulu, Spotify

How every tile works today: the page passes a short name to the shell
(`web/src/main.js` lines 219 to 226). The shell looks for the service's own app by package
name. If the app is there it opens it. If not, it opens the service's website in our viewer
(`HostBridge.kt` lines 62 to 73 and 190 to 195). On the first evening no streaming app
will be installed, so every tile will open a website.

| Feature | Treadmill (PLTN-TTR01) | Bike (PLTN-RB1VQ) | What our app does today |
|---|---|---|---|
| **1. YouTube, the way our tile does it now** (YouTube's phone website in our viewer) | **No report: must be measured on our tablet.** Nearest reports are for other ways in: a small embedded YouTube player inside an app plays on this tablet model on a Bike+ (engine 127) [A1]; "YouTube works via browser" on a Bike+ in a real browser app [A2]. Nobody has measured which video formats this chip plays smoothly [A6]. No Google sign-in is possible in a viewer like ours [A3]. | **No report: must be measured on our tablet.** Nearest report: the embedded player works on an Android 11 original Bike, but only smoothly once a small script makes YouTube send H.264 [A1][A4]. Left alone, YouTube sent VP9 and the tablet dropped about 40% of the picture frames, then fell to low quality within 45 seconds. With the script: about 2% dropped at 720p [A4]. On engine 91 the automatic step up to 1080p froze the picture [A5]. One rider says Firefox on the bike plays the same video well [A2]. | Looks for `com.google.android.youtube`, then a TV build. Neither will be there. Opens `https://m.youtube.com/` in the viewer (`HostBridge.kt` 191, `WatchActivity.kt` 87). **There is no H.264 script.** In our emulator the site opened signed out [A22]. |
| **1b. YouTube, the official app** | **Only by doing something we have ruled out**, as reported. It did play on this exact model (2021 Tread, Android 10, YouTube 21.42.243, November 2026), signed out only, never able to add a Google account. It needed two Google helper apps (about 540 MB with YouTube), two Google parts switched off afterwards, and it was on a Tread whose Peloton parts were already switched off [A7]. With everything left on: no report. The owner's own advice: if you can live without it, leave Google's parts off [A7]. | **No report: must be measured on our tablet.** How Google's helper apps behave is only written up for the Tread [A8]. An older article says the official apps "won't work" for lack of them (second-hand) [A8]. | Would open it if installed. We do not install it. |
| **2. Netflix** | **Only by doing something we have ruled out**, on the evidence so far. The phone app `com.netflix.mediaclient` (about 122 MB, put on over the cable, no Google helper needed) worked on this exact model on 8 November 2026. But on that Tread Peloton's `com.onepeloton.systempluginui` was force-closing it until that part was switched off [A9]. One hopeful counter-report: another owner runs a speed overlay "over Netflix" on a stock Tread of this model. He does not say whether he has a membership [A10]. So: install it, leave everything on, and watch whether it gets closed. | **Reported failing or blocked**, as the tablet stands. Since about November 2025, on Bike and Bike+ tablets with no membership, Netflix closes straight after opening with a "subscription required" message. The reported fix is switching off `com.onepeloton.systempluginui` over the cable. That is allowed on the bike under our rules, and has a one-line undo. It worked for most; one user still had the problem on 6 November 2026. OpenPelo warns it "can break" other system features [A11]. The reports do not name the tablet model. Peloton ships its own Netflix on bikes under the same package name, so our tile may open that one [A12]. | Looks for `com.netflix.mediaclient`, then a TV build (`HostBridge.kt` 192). If neither: opens `netflix.com` in the viewer. Research expects that page to refuse us: Netflix supports no Android browser [A13]. The viewer does already grant the copy-protection request a page makes (`WatchActivity.kt` 82 to 85) [A14]. In our emulator the site said "Update required" [A22]. |
| **3. Hulu** | **Reported working on a related model only**, and only as far as installing. A Bike+ owner (same tablet model) "sideloaded Hulu" and says everything "installed nicely", with no word on playing (June 2026) [A16]. Same risk of Peloton closing it as Netflix. | **Reported working on a related model only.** `com.hulu.plus` version 6.34.0, fetched with Aurora Store, on a `PLTN_RB1VO_2` (the sister bike tablet), Android 11: installs, opens, sign-in completes (1 November 2026). One user gets a "location services" error after signing in; unresolved. **Nobody has confirmed a show actually playing** on any Peloton [A15]. | Looks for `com.hulu.plus`, then a TV build (`HostBridge.kt` 193). If neither: `hulu.com` in the viewer, which the research guesses will be refused like Netflix [A13]. |
| **4. Spotify** | **No report: must be measured on our tablet.** The one Spotify report says "on the bike" [A17]. | **Reported working on this exact model**, with thin detail. OpenRide lists Spotify as "tested with … on the bike" for its music controls. Its bikes are a `PLTN-RB1VQ` and a Bike+; the note does not say which, and gives no version, date, install or sign-in detail [A17]. | Looks for `com.spotify.music`, then a TV build (`HostBridge.kt` 194). If neither: `open.spotify.com` in the viewer. In our emulator the site said "Unsupported browser" [A22]. |
| **Google's helper apps** (needed by the official YouTube app, not by Netflix) | **Reported failing or blocked.** The Tread ships without them. Installed by hand, the main one crashes; the Play Store cannot sign in; the usual stand-in (microG) cannot work on this software [A18]. | **No report: must be measured on our tablet** [A8]. | Needs none. |
| **Picture quality** (the copy-protection level, called Widevine: L1 allows HD, L3 means standard definition) | **No report: must be measured on our tablet.** No source gives the level or the picture size Netflix sends, on any Peloton [A19]. Read it in Netflix: App Settings, then Playback Specification. | **No report: must be measured on our tablet.** Same [A19]. | Nothing. |
| **Which kind of app file** | **Reported on this exact model:** only phone and tablet builds. TV builds refuse to install, because the tablet does not say it is a TV [A20]. Files came from APKMirror and were put on over the cable [A21]. | **Reported working on a related model only:** Aurora Store (a free app store that needs no Google account) installs big-name apps on the tablet itself, on the Android 11 sister tablet [A21]. | Our list of apps to look for includes four TV builds that can never be there (`AndroidManifest.xml` 15, 17, 19, 21). Harmless. |

Storage each app took on the Tread studied: YouTube about 270 MB, Google's Play services
about 268 MB, Prime Video about 197 MB, Netflix about 122 MB, Firefox about 319 MB [A7].
No sizes are reported for Hulu or Spotify.

Notes for table A:

- **A1.** `apps:46`. First-hand, OpenRide. Embedded YouTube player loaded under a proper web address, on a Bike+ (Android 10, engine 127) and an original Bike (Android 11, engine 91). [YouTubeEmbed.kt](https://github.com/digitalducktape/OpenRide/blob/main/app/src/main/java/dev/digitalducktape/openride/ui/classes/YouTubeEmbed.kt), [DEVICE.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/DEVICE.md). Also `pip:160`. No YouTube test on any Tread: `openride:379`.
- **A2.** `apps:47`, first-hand user, 23 December 2025, [OpenPelo #24](https://github.com/doudar/Openpelo/issues/24). `openride:369`, user report, [OpenRide #69](https://github.com/digitalducktape/OpenRide/issues/69).
- **A3.** `apps:96`. Generic (Google's own announcement), not checked on a Peloton. [Google Developers Blog](https://developers.googleblog.com/en/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/).
- **A4.** `apps:85` and `apps:86`; `openride:306`. Documented by OpenRide, measured on a bike of our generation on 11 November 2026. H.264 at 1080p and 60 frames a second still dropped about 20%. [YouTubeEmbed.kt](https://github.com/digitalducktape/OpenRide/blob/main/app/src/main/java/dev/digitalducktape/openride/ui/classes/YouTubeEmbed.kt), [OpenRide PR #89](https://github.com/digitalducktape/OpenRide/pull/89).
- **A5.** `apps:87`; `openride:305`, `openride:307`, `openride:308`. User report. Engine 91 also lacks the usual hook (`addDocumentStartJavaScript`) for adding such a script, so it would need adding another way. [OpenRide #73](https://github.com/digitalducktape/openride/issues/73).
- **A6.** `apps:107` (no measurement for the Bike+ or Tread chip); `apps:103` is a guess that it may play VP9 in hardware.
- **A7.** `apps:43` (first-hand, one Tread), [Peloton-Tread AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md). The three settings: `apps:121`, [Peloton-Tread README](https://github.com/MichaelCyger/Peloton-Tread/blob/main/README.md). The Peloton parts switched off on that Tread: `apps:162`, `sensors:373`. Sizes: `apps:320`. Advice to leave Google's parts off: `apps:123`.
- **A8.** `apps:137` (gap). `apps:45`, second-hand, 2022, [RobotPoweredHome](https://robotpoweredhome.com/can-you-watch-tv-on-peloton/).
- **A9.** `apps:33` and `apps:24`. First-hand, one 2021 Tread, Android 10, 8 November 2026. [Peloton-Tread README](https://github.com/MichaelCyger/Peloton-Tread/blob/main/README.md), [AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md).
- **A10.** `sensors:378`. Documented, [OpenPelo #46](https://github.com/doudar/Openpelo/issues/46), [overlay README](https://github.com/vmudinas/OpenPeloton_Metrics_Overlay/blob/280834eb3a/README.md). A vendor says sideloaded Netflix "typically shuts itself down after 10-20 minutes" with no membership: `community:206`, [FitSwitch](https://fitswitch.io/blogs/learn/netflix-on-peloton).
- **A11.** `apps:25`, `community:205`. First-hand users, November 2025 to November 2026, [OpenPelo #24](https://github.com/doudar/Openpelo/issues/24). The warning: `openride:158`, [OpenPelo home_screen.dart](https://github.com/doudar/Openpelo/blob/main/lib/screens/home_screen.dart).
- **A12.** `apps:34`. First-hand, [OpenPelo #24](https://github.com/doudar/Openpelo/issues/24).
- **A13.** `apps:95` (generic: [Netflix supported browsers](https://help.netflix.com/node/30081)); `apps:101` and `pip:175` are guesses; `apps:109` says nobody has actually tried Netflix or Hulu in a viewer on a Peloton.
- **A14.** `apps:97`. Generic Android, [PermissionRequest](https://developer.android.com/reference/android/webkit/PermissionRequest#RESOURCE_PROTECTED_MEDIA_ID).
- **A15.** `apps:42`, `apps:73`. First-hand (the OpenPelo maintainer), [OpenPelo #67](https://github.com/doudar/Openpelo/issues/67).
- **A16.** `apps:37`. First-hand user, 21 June 2026, [OpenPelo #41](https://github.com/doudar/Openpelo/issues/41).
- **A17.** `apps:51`; `openride:366`; `report:57`. [OpenRide README](https://github.com/digitalducktape/OpenRide/blob/main/README.md). OpenPelo has nothing on Spotify: `openpelo:351`.
- **A18.** `apps:120` to `apps:122`. First-hand, one Tread, [Peloton-Tread AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md).
- **A19.** `apps:82`, `apps:106`, `report:59`. Where to read it: `apps:94`, generic, [Netflix help](https://help.netflix.com/en/node/23939). `apps:100` is a guess that the newer tablets are HD-capable because Peloton ships Netflix itself.
- **A20.** `apps:60`, `apps:61`, `apps:295`. First-hand, [Peloton-Tread AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md).
- **A21.** `apps:125` ([OpenPelo #67](https://github.com/doudar/Openpelo/issues/67)); `apps:129` ([Peloton-Tread AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md)).
- **A22.** Our own check in the emulator on 14 November 2026: project `README.md` lines 569 to 571. It says nothing about the real tablets.

---

## B. Getting in, being home, getting back

| Feature | Treadmill (PLTN-TTR01) | Bike (PLTN-RB1VQ) | What our app does today |
|---|---|---|---|
| **5. Getting installed over the USB cable** | **Reported working on this exact model.** Apps were put on a 2021 Tread, Android 10, over the cable in November 2026 [B1]. The same tablet on a Bike+ took an install on 4 October 2026 (build `QT.231113.B`) [B2]. Success reports for Treads are "thin" compared with bikes [B3]. | **Reported working on this exact model.** `PLTN-RB1VQ`, Android 11, build `RQ.260424.A`, 23 October 2026 [B4]. | `tools/android.sh install` (lines 81 to 89): takes the baseline, copies any save data, then installs. |
| **The "keys mismatch, install denied" refusal** | **No report on this model.** Every report of it is from an Android 7 tablet [B5]. | **No report on this model.** The Android 11 reports "do not mention it" [B5]. It bites if the Build number starts with `N` (Android 7). Some bikes of this generation are said to sit on Android 10 (`Q`) and be unable to update [B6]. | `FIRST_TEST.md` line 77 says to stop if the install "prints" those words. In the reports the words are in the tablet's own log, not in what the Mac prints [B5]. See Mismatches. |
| **6. Being the home screen** | **Only by doing something we have ruled out.** One project is the home screen on this exact model, but it switched off three Peloton parts and then had to command the belt itself [B7]. Never for us. | **Reported working on this exact model.** OpenRide's way (the app switches on its own home entry, then Android asks "set as default home app?") was tested on an `RB1VQ`, Android 11, October 2026. The cable cannot do this step; the app must [B8]. It survives a restart [B9]. Still unknown on Android 11: whether Peloton covers a home screen that is not its own (see C) [B10]. | The same method (`HostBridge.kt` 163 to 183, `AndroidManifest.xml` 53 to 63). Refused on a treadmill (`HostBridge.kt` 135). Tested in the emulator only. |
| **7. Going back to Peloton's own home screen** (the PELOTON tile) | **No report: must be measured on our tablet.** Nobody describes an app opening Peloton's home screen by name. What is known: on one Android 10 Tread it is `com.peloton.launcher/.LauncherActivity` [B11]. | **No report: must be measured on our tablet.** A Bike+ package list includes `com.peloton.launcher` [B11]. Guides say Peloton stays reachable from another home screen's app list (second-hand) [B12]. | Finds the first home screen whose package name contains "peloton" and opens it (`Safety.kt` 22 to 44). That matches the name above. Also on the rescue screen. |
| **Opening Awesome Workout World again once Peloton's screen is in front** | **No report: must be measured on our tablet.** This is a gap. The old hidden app list is dead [B13]. We are never the home screen here. The only proven way back on this model is a small always-on-top button, which we have not built [B14]. | **Reported working on this exact model, once we are the home screen:** the Home control "just brings" the home app back [B15]. Before that, the same gap as the treadmill. | From the Mac: `tools/android.sh run`. Nothing on the tablet itself. |
| **17a. After a restart** | **No report: must be measured on our tablet.** Not being home, we will not start by ourselves. The one Tread project starts itself with a start-up hook plus an overlay; we have neither [B14]. | **Reported working on this exact model:** a home app starts by itself after a restart, no extra hook needed [B9]. | No start-up hook. Relies on being home. |

Notes for table B:

- **B1.** `apps:33`, `apps:129`. First-hand, [Peloton-Tread README](https://github.com/MichaelCyger/Peloton-Tread/blob/main/README.md).
- **B2.** `community:88`, `community:163`, `community:167`. First-hand, [OpenRide #47](https://github.com/digitalducktape/OpenRide/issues/47).
- **B3.** `community:94`. [DC Rainmaker comments](https://www.dcrainmaker.com/2020/06/zwift-trainerroad-peloton.html), [OpenPelo #8](https://github.com/doudar/Openpelo/issues/8).
- **B4.** `community:81`. First-hand, [OpenRide #47](https://github.com/digitalducktape/OpenRide/issues/47).
- **B5.** `apps:247` (the words appear in the tablet's log), `community:158`, `community:162`, `report:105`. [OpenPelo #55](https://github.com/doudar/Openpelo/issues/55), [OpenPelo #22](https://github.com/doudar/Openpelo/issues/22). "Android 11 reports do not mention it" is the note-writer's reading: `community:183`. A membership is not required on every unit: `community:207`.
- **B6.** `openride:292`, `report:94`. Documented, [OpenRide DEVICE.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/DEVICE.md).
- **B7.** `apps:151`, `sensors:373`, `report:127`. [Peloton-Tread apply.sh](https://github.com/MichaelCyger/Peloton-Tread/blob/main/app/apply.sh), [AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md).
- **B8.** `openride:87` (documented; tested on Gen 2 only), `apps:153`, `apps:154`. [OpenRide PR #64](https://github.com/digitalducktape/OpenRide/pull/64), [OpenRide #47](https://github.com/digitalducktape/openride/issues/47), [HomeScreenLauncher.kt](https://github.com/digitalducktape/OpenRide/blob/main/app/src/main/java/dev/digitalducktape/openride/ui/profile/HomeScreenLauncher.kt).
- **B9.** `apps:155`, `openride:103`. [OpenRide #47](https://github.com/digitalducktape/openride/issues/47), [INSTALL.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/INSTALL.md).
- **B10.** `openride:179`, `report:182`.
- **B11.** `apps:151` and `report:85` (Tread); `apps:165` (Bike+ list, [OpenPelo #41](https://github.com/doudar/Openpelo/issues/41)).
- **B12.** `community:235`. Second-hand, [BGR](https://www.bgr.com/1959593/how-to-watch-netflix-peloton-sideload/), [FitSwitch](https://fitswitch.io/pages/bike-installation).
- **B13.** `report:20`, `community:116`. [DC Rainmaker](https://www.dcrainmaker.com/2020/06/zwift-trainerroad-peloton.html).
- **B14.** `apps:179`, `apps:207` (row B), `apps:219` (a guess at the design). [Peloton-Tread CoverService.java](https://github.com/MichaelCyger/Peloton-Tread/blob/main/app/src/com/treadcover/CoverService.java), [BootReceiver.java](https://github.com/MichaelCyger/Peloton-Tread/blob/main/app/src/com/treadcover/BootReceiver.java).
- **B15.** `openride:114`. User report, [OpenRide PR #62](https://github.com/digitalducktape/OpenRide/pull/62).

---

## C. The screen, and what Peloton's software does to other apps

| Feature | Treadmill (PLTN-TTR01) | Bike (PLTN-RB1VQ) | What our app does today |
|---|---|---|---|
| **8. Full screen, the strip at the bottom, usable size** | **Reported failing or blocked** for a true full screen. On one Tread, Android 10: "The tablet hides its bottom row only for a window marked as a Peloton window". That project used a hidden trick to mark its window that way [C1]. Peloton's `systempluginui` also draws a bar across the top [C2]. The size an ordinary app gets: **no report, must be measured.** | **Reported failing or blocked** for a true full screen, on this exact model: every app window is 1920 by 1008 (build `RQ.260424.A`, 21 October 2026). Eight different tricks failed to get the last 72 rows back [C3]. This does not hurt us: the game already redraws for 1008. The bike has no recent-apps button [C4]. | Asks for full screen the old way (`MainActivity.kt` 203 to 212), which is one of the tricks that did not win the strip back. The game fits itself to the height it is given (`web/src/main.js` 97 to 105). Device settings shows the size it got (`web/src/device.js` 76). The viewer does not ask for full screen at all. |
| **9. Peloton putting its own screen in front after idle** | **No report: must be measured on our tablet.** Manuals say the Tread sleeps after 20 minutes (second-hand) [C5]. When the screen goes off, the belt controller sleeps and locks itself [C6]. | **Reported working on this exact model**, in the sense that an app survives it. On OpenRide's bike the display times out at 30 minutes and Peloton then starts its own set-up screen. An app hidden from the recent-apps list was killed at that moment; one that was not hidden survived [C7]. Manuals say 20 minutes (second-hand) [C5]. What the rider sees on waking is not described [C8]. | Not hidden from recent apps, on purpose (`MainActivity.kt` 41 to 43). But we keep the screen on the whole time Awesome Workout World is in front (`MainActivity.kt` 55), so this timeout will not come while we are showing. |
| **10. What Peloton's software does to other apps with no membership** | **Reported failing or blocked on this exact model** (one Tread, Android 10). Three parts: `com.peloton.activity` draws "Activate your Tread" and a subscription message over everything, as a protected overlay no app can block. `com.onepeloton.systempluginui` force-closes Netflix-type apps. `com.onepeloton.sensorstateindicator` draws the Tread Lock keypad [C9]. The fix, switching them off, is **only by doing something we have ruled out**. It also trips a five-second belt lock, according to one person's reading of an older version of the sensor service [C10]. A counter-report exists: see A10. | Two separate things. **Closing apps: reported failing or blocked** on Bike and Bike+ tablets (model not named) since about November 2025, by `com.onepeloton.systempluginui` [C11]. **Covering a home screen: no report on Android 11, must be measured.** It has only been seen on the newest Android 13 tablet, from `com.peloton.activity` [C12]. Both have a reversible switch-off over the cable, allowed on the bike. Switching off `com.peloton.activity` also removes Peloton's Just Ride, and a full ride with it off was never confirmed [C13]. | Nothing. We switch nothing off. `tools/tablet-restore.sh` can only switch things back on. |
| **17b. Keeping the screen awake** | **Reported working on this exact model:** the Tread home-screen project keeps the screen on while it is showing, and deliberately never wakes a sleeping screen [C14]. | **Reported working on this exact model:** OpenRide keeps it on during a ride only, and lets it sleep otherwise [C15]. | Always on while Awesome Workout World or the viewer is in front (`MainActivity.kt` 55, `WatchActivity.kt` 35). |

Notes for table C:

- **C1.** `apps:171`. First-hand, [Peloton-Tread HomeActivity.java](https://github.com/MichaelCyger/Peloton-Tread/blob/main/app/src/com/treadcover/HomeActivity.java).
- **C2.** `apps:24`, `apps:162`. First-hand, [Peloton-Tread AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md).
- **C3.** `apps:169`, `openride:297`, `openride:298`. Documented by OpenRide, [OpenRide #57](https://github.com/digitalducktape/openride/issues/57). The suspected cause is a Peloton part that updated itself on 30 September 2026: `openride:157`. Whether switching that part off brings the rows back is untested: `apps:190`.
- **C4.** `apps:170`. [OpenRide MainActivity.kt](https://github.com/digitalducktape/OpenRide/blob/main/app/src/main/java/dev/digitalducktape/openride/MainActivity.kt).
- **C5.** `apps:299`. Second-hand snippets, [Bike manual mirror](https://manualshive.com/en/manual/peloton/bike/1523448?page=8), [PeloBuddy](https://www.pelobuddy.com/tread-screen-sleep-fix/).
- **C6.** `sensors:375`. [Peloton-Tread TreadController.java](https://github.com/MichaelCyger/Peloton-Tread/blob/94137eebf6/app/src/com/treadcover/TreadController.java#L96-L104). Tread Lock is said to come back after 45 seconds idle: `community:209`; the note-writer could not confirm that from Peloton: `sensors:403`.
- **C7.** `apps:163`, `openride:109`, `openride:327`. Documented, one bike, [OpenRide GAMES.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/GAMES.md).
- **C8.** `openride:128` (gap).
- **C9.** `apps:162`, `report:129`. First-hand, [Peloton-Tread AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md), [apply.sh](https://github.com/MichaelCyger/Peloton-Tread/blob/main/app/apply.sh).
- **C10.** `sensors:371` (documented, from one reading of version 2.4.508); nobody has checked newer versions: `sensors:401`. [tread research](https://github.com/aaearon/grupetto/blob/327e860630/docs/tread-support-research.md#L369-L378).
- **C11.** `apps:25`, `community:205`. [OpenPelo #24](https://github.com/doudar/Openpelo/issues/24). Undo commands: `community:292`.
- **C12.** `apps:161`, `openride:147` to `openride:149`, `openride:179`. User report, [OpenRide #63](https://github.com/digitalducktape/openride/issues/63).
- **C13.** `report:121`, `openride:150`, `community:214`. [OpenRide #63](https://github.com/digitalducktape/OpenRide/issues/63).
- **C14.** `apps:297`. [Peloton-Tread HomeActivity.java](https://github.com/MichaelCyger/Peloton-Tread/blob/main/app/src/com/treadcover/HomeActivity.java).
- **C15.** `apps:296`, `openride:107`. [OpenRide MainActivity.kt](https://github.com/digitalducktape/OpenRide/blob/main/app/src/main/java/dev/digitalducktape/openride/MainActivity.kt).

---

## D. Updates

| Feature | Treadmill (PLTN-TTR01) | Bike (PLTN-RB1VQ) | What our app does today |
|---|---|---|---|
| **11a. Game updates over Wi-Fi** (our own downloader) | **No report: must be measured on our tablet.** No Peloton project updates web content this way. The parts it is built from are ordinary Android [D1]. | **No report: must be measured on our tablet.** Same [D1]. | Built (`Updater.kt`): fetches a list of files, checks each one's fingerprint, switches all at once. The address is empty until set per tablet (`Updater.kt` 175). Tested in the emulator only. |
| **11b. Rollback of a bad game update** | **No report: must be measured on our tablet.** The pattern is borrowed from other app frameworks, not from a Peloton [D2]. | **No report: must be measured on our tablet.** Same [D2]. | Built: a new version has 30 seconds to say it started, or it is thrown away (`Updater.kt` 71 to 84, `MainActivity.kt` 119 to 132). Tested in the emulator only. |
| **11c. Updating the app itself without a cable** | **Reported working on a related model only**, and that is a reading, not a test: OpenRide's in-app updater has shipped four versions to Bike+ owners (same tablet) with no complaint on record [D3]. Nothing for a Tread. | **Reported working on a related model only.** Aurora Store installs apps on the tablet itself on the Android 11 sister tablet [D4]. OpenRide's updater has no recorded test of Android's install screen finishing on a bike [D5]. | Not built. Every app update is by cable. A person must always tap to approve: silent updates do not exist on Android 10 or 11 [D6]. |
| **11d. Updating the app by cable** | **Reported working on this exact model**, as for installing (B1). One install on the Tread failed for lack of space [D7]. | **Reported working on this exact model** (B4). | `adb install -r`, which keeps saved rides. It only works while every build is signed with the same key [D8]. |
| **Peloton's own updates undoing things** | **No report** of what a Peloton update does to sideloaded apps on a Tread. | **Reported on this exact model:** a Peloton part updated itself and shrank every app's window (C3). In 2021 an update took the home screen back [D9]. Nobody has a lasting way to stop updates except keeping the tablet offline [D9]. | Nothing. `FIRST_TEST.md` says to refuse update prompts. |

Notes for table D:

- **D1.** `apps:275`, `report:51`, `report:69`. The Android part we use: `apps:262`, generic, [WebViewAssetLoader](https://developer.android.com/reference/androidx/webkit/WebViewAssetLoader).
- **D2.** `apps:260`, vendor page, [Capgo](https://capgo.app/blog/cordova-hot-code-push-alternative/). The recipe the notes suggest is a guess: `apps:266`, `apps:267`.
- **D3.** `openride:274` (the note-writer's reading from an absence of complaints). How it works: `apps:240` to `apps:242`, [UpdateRepository.kt](https://github.com/digitalducktape/OpenRide/blob/main/app/src/main/java/dev/digitalducktape/openride/core/update/UpdateRepository.kt), [INSTALL.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/INSTALL.md).
- **D4.** `apps:244`. [OpenPelo #67](https://github.com/doudar/Openpelo/issues/67).
- **D5.** `apps:243`, `apps:272`, `apps:273`. [OpenRide #22](https://github.com/digitalducktape/openride/issues/22).
- **D6.** `apps:255`. Generic Android, [PackageInstaller.SessionParams](https://developer.android.com/reference/android/content/pm/PackageInstaller.SessionParams#setRequireUserAction(int)).
- **D7.** `apps:249`. [Peloton-Tread AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md).
- **D8.** `apps:248`, `report:171`. [OpenRide INSTALL.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/INSTALL.md).
- **D9.** `community:146`, `community:175`, `report:29`, `apps:164`. [DC Rainmaker comments](https://www.dcrainmaker.com/2020/06/zwift-trainerroad-peloton.html), [PREVENTING-UPDATES.md](https://github.com/nate-santos/peloton-without-subscription-guide/blob/main/PREVENTING-UPDATES.md).

---

## E. The machine and the game

| Feature | Treadmill (PLTN-TTR01) | Bike (PLTN-RB1VQ) | What our app does today |
|---|---|---|---|
| **12. Reading the machine** | **Reported working on this exact model.** Asking only question 17 (current speed) and question 18 (current incline), twice a second, registering nothing: on a `PLTN-TTR01`, Android 10 (June 2026, service version not stated) [E1]. The same two questions on service version 3.2.1 (November 2026) [E2], and readings checked on version 2.4.508, build `QT.250804.A` (August 2026) [E3]. Answers come in tenths. Readings flow even when the Tread is locked [E4]. | **Reported working on this exact model.** The call-back interface (`IV1Interface`) on a `PLTN-RB1VQ`, Android 11, build `RQ.250113.A`: standing still, then a 90-second ride [E5]. A second `RB1VQ` on service version 3.0.1 [E6]. It works whatever the membership state [E7]. The service can go silent for hours until the bike is switched off and on [E8]. | **Not written.** `Sensors.kt` 96 to 97 returns no reader, so the game runs on its pretend machine. Readings stop whenever our app is not in front (`MainActivity.kt` 150 to 153). |
| **Does the belt keep running with our app in front?** | **No report: must be measured on our tablet.** The two statements that exist disagree: one owner runs an overlay over Netflix on a stock Tread; an unsigned review site says Tread Lock stops the belt when another app opens [E9]. | Not a question on a bike. | Nothing. This is step 6 of `FIRST_TEST.md`. |
| **The permission line in our app's manifest** (`onepeloton.permission.ACCESS_SENSOR_SERVICE`) | **Not needed, reported on this exact model:** the two Tread projects that read successfully do not declare it [E10]. | **Not needed, reported on this exact model:** OpenRide does not declare it and reads fine [E10]. The note-writer's guess is that declaring it is harmless and does nothing [E11]. | Declared (`AndroidManifest.xml` line 7). We also list the sensor service among the apps we talk to (lines 11 and 12), which costs nothing [E11]. |
| **13a. The browser engine the game runs in** | **Reported working on a related model only:** Chromium 127.0.6533.9 on a Bike+ with this tablet, build `QT.250804.A` [E12]. On the Tread itself, Peloton is seen to update the engine, but no version is written down [E13]. | **No report we can trust: must be measured on our tablet.** The notes conflict. One user reports an Android 11 original Bike "stuck at 91". OpenRide's own bike of our generation had 127 when it measured video. The notes say these were never squared with each other [E14]. | Draws with plain 2D canvas. Our emulator's engine is version 83, older than either. The check script reads the version (`tools/tablet-check.sh` 57). |
| **13b. How fast the game runs** | **No report: must be measured on our tablet.** Nobody has timed a canvas game in the browser engine on any Peloton [E15]. Spec sheets say Qualcomm QCS605 and 4 GB of memory (second-hand) [E16]. The guess is that it is comfortably faster than the bike [E17]. | **No report: must be measured on our tablet** [E15]. Known about the tablet: PowerVR GX6250 graphics, about 2 GB of memory [E18]. Hints from a different kind of game engine on this model: program code ran about five times slower than on a desktop, and big see-through layers were the costly thing [E19]. | A 640-wide picture scaled up three times, with a speed test built in (TEST, then SPEED TEST). Never run on a real tablet. |

Notes for table E:

- **E1.** `sensors:87`, `sensors:488`. Read in source, [AffernetTreadClient.kt](https://github.com/vmudinas/OpenPeloton_Metrics_Overlay/blob/280834eb3a/app/src/main/java/org/openpelo/beltstatusdump/AffernetTreadClient.kt#L52-L121).
- **E2.** `sensors:86`, `sensors:487`. Read in source, [Peloton-Tread TreadController.java](https://github.com/MichaelCyger/Peloton-Tread/blob/94137eebf6/app/src/com/treadcover/TreadController.java#L33-L44). The question numbers matched across both versions: `sensors:362`.
- **E3.** `sensors:481`. Documented, [tread research](https://github.com/aaearon/grupetto/blob/327e860630/docs/tread-support-research.md#L51-L72).
- **E4.** `sensors:73`, `sensors:74`, `sensors:315`. [tread research](https://github.com/aaearon/grupetto/blob/327e860630/docs/tread-support-research.md#L100-L108). The forty-odd questions we must never send: `sensors:336` to `sensors:357`. Do not ask while the screen is asleep (it woke the tablet): `apps:297`, `report:151`.
- **E5.** `sensors:484`. Documented, [OpenRide SENSOR_PROTOCOL.md](https://github.com/digitalducktape/OpenRide/blob/7c00b1a03d/docs/SENSOR_PROTOCOL.md#L199-L246). How the call works: `sensors:30`, `sensors:31`, `report:115`.
- **E6.** `sensors:482`. [tread research](https://github.com/aaearon/grupetto/blob/327e860630/docs/tread-support-research.md#L70-L72).
- **E7.** `sensors:313`. Documented, [PelotonBikeDataSource.kt](https://github.com/digitalducktape/OpenRide/blob/7c00b1a03d/app/src/main/java/dev/digitalducktape/openride/core/sensor/PelotonBikeDataSource.kt#L25-L29).
- **E8.** `sensors:310`. [OpenRide #56](https://github.com/digitalducktape/OpenRide/issues/56).
- **E9.** `sensors:378`, `sensors:379`, `sensors:402`, `report:129`. [OpenPelo #46](https://github.com/doudar/Openpelo/issues/46), [zelpio review](https://www.zelpio.com/blog/peloton-tread-review/).
- **E10.** `sensors:286` (read in source); the apps that do declare it: `sensors:285`. The service asks for no permission: `sensors:21`.
- **E11.** `sensors:319`, `sensors:320`. Both are the note-writer's guesses. Other apps' lists: `sensors:291`, `sensors:292`.
- **E12.** `apps:88`, `openride:304`. Documented, [OpenRide DEVICE.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/DEVICE.md).
- **E13.** `apps:89`. [Peloton-Tread AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md).
- **E14.** `openride:304` (127, documented, [OpenRide PR #89](https://github.com/digitalducktape/OpenRide/pull/89)); `openride:305` (91, user report, [OpenRide #73](https://github.com/digitalducktape/OpenRide/issues/73)); `openride:351` (never reconciled). Whether a stuck engine can be replaced is unknown: `apps:110`.
- **E15.** `apps:339`, `openride:353`.
- **E16.** `apps:286`, `apps:287`. Second-hand, [PeloBuddy](https://www.pelobuddy.com/specs-differences-new-features-and-faqs-about-new-premium-peloton-bike/).
- **E17.** `apps:335`. A guess.
- **E18.** `apps:323`, `openride:294`. Documented, [OpenRide MAIN_UI_REFRESH.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/MAIN_UI_REFRESH.md).
- **E19.** `openride:339`, `apps:324`. Documented, [OpenRide GAMES.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/GAMES.md). These are for the Godot game engine, not a web page.

---

## F. Sound and storage

| Feature | Treadmill (PLTN-TTR01) | Bike (PLTN-RB1VQ) | What our app does today |
|---|---|---|---|
| **14a. Speakers and Bluetooth headphones** | **Reported working on this exact model.** Headphones (AirPods too) pair as ordinary Bluetooth headphones. Bluetooth "was off until someone opened Settings" [F1]. | **Reported working on this exact model** (documented by OpenRide). Pair once in Android's settings; sound follows the headphones and falls back to the bike's speakers. The app does nothing [F1]. | Device settings has a button into Android's own settings (`web/src/device.js` 70 to 71). |
| **14b. Who gets the sound: a video app and our game** | **No report: must be measured on our tablet.** | **No report for a game like ours: must be measured.** The one finding is about video in a web page, on a bike on 11 November 2026: Android gives the sound to one app at a time; a web page's video claims it unless silent from its first frame; a music app starting would pause that video [F2]. Our game makes its sound a different way, so this may or may not apply. | The game stops its music before it opens any tile (`web/src/main.js` 219 to 220). Nothing stops the music if another screen comes in front by itself. |
| **Santa's spoken greeting** (the tablet's speech engine) | **No report: must be measured on our tablet.** A Peloton speech part (`com.onepeloton.tts`) is on the Tread; whether an ordinary app can use it is not said [F3]. | **No report: must be measured on our tablet.** OpenPelo offers to install Google's speech engine on these tablets, which hints that some have none [F3]. | Uses the engine if there is one; if not, the game plays its own "ho ho ho" (`HostBridge.kt` 33 to 42). |
| **Loudness, sound quality, lip-sync over Bluetooth** | **No report** [F4]. | **No report** [F4]. | Nothing. |
| **15. Storage room** | **Reported working on this exact model, but tight.** Room for apps and data is about 4 GB in all. With nine streaming apps it was down to 407 MB free, and installs began to fail. Keep 500 MB free [F5]. The space saver that owner used was removing a Peloton game, which we have ruled out. | **No report: must be measured on our tablet.** The spec sheet says 16 GB. But the Bike+ spec sheet says 16 GB too, and its real room for apps is about 4 GB. Nobody gives the real figure for our bike tablet [F6]. | The updater keeps at most three copies of the game (`Updater.kt` 143 to 144). It does not check free space before downloading. The check script reads free space (`tools/tablet-check.sh` 55). |

Notes for table F:

- **F1.** `apps:91`, `openride:314`. [OpenRide INSTALL.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/INSTALL.md), [Peloton-Tread README](https://github.com/MichaelCyger/Peloton-Tread/blob/main/README.md).
- **F2.** `apps:90`, `openride:311`. Documented, [YouTubeEmbed.kt](https://github.com/digitalducktape/OpenRide/blob/main/app/src/main/java/dev/digitalducktape/openride/ui/classes/YouTubeEmbed.kt). A home screen can also pause whatever is playing: `apps:92`.
- **F3.** `apps:320` (the Peloton part), `apps:127` ([OpenPelo README](https://github.com/doudar/Openpelo/blob/main/README.md)).
- **F4.** `apps:108` (gap).
- **F5.** `apps:320`, `apps:249`. First-hand, 8 November 2026, [Peloton-Tread README](https://github.com/MichaelCyger/Peloton-Tread/blob/main/README.md), [AGENTS.md](https://github.com/MichaelCyger/Peloton-Tread/blob/main/AGENTS.md).
- **F6.** `apps:286` (spec, second-hand), `apps:317`, `apps:321` ([OpenPelo #41](https://github.com/doudar/Openpelo/issues/41)), `apps:340` (gap).

---

## G. Watching video while riding (research only, nothing built)

| Feature | Treadmill (PLTN-TTR01) | Bike (PLTN-RB1VQ) | What our app does today |
|---|---|---|---|
| **16a. Our ride numbers in a small window on top of Netflix or Hulu** | **Reported working on this exact model.** Two separate projects draw their own small window over Netflix on a 2021 Tread, Android 10. One grants the needed permission with a single cable command [G1]. Peloton's protected overlay (C9) can still sit above it [G2]. | **Reported working on a related model only.** Grupetto does this on "Bike and Bike+"; its checks were on an original Bike with Android 11, tablet model not named [G3]. | Not built. First our sensor reading would have to keep going when the game is not in front; today it stops (`MainActivity.kt` 150 to 153) [G4]. |
| **16b. YouTube beside the game, inside our own app** | **Reported working on a related model only:** OpenRide, on a Bike+ with this tablet (engine 127) [G5]. | **Reported working on this exact model:** OpenRide, on an Android 11 Bike, with the H.264 fix (A4) [G5]. Game and video running together is unmeasured [G6]. | Not built. |
| **16c. The streaming app shrinking to a small floating window over our game** (Android's own picture-in-picture) | **No report: must be measured on our tablet.** Two read-only commands will say whether the tablet offers it [G7]. | **No report: must be measured on our tablet** [G7]. | Not built. Pressing Home sends our game back to its front page today, which would need care [G8]. |
| **16d. Split screen** | **Reported working on a related model only**, long ago: a Bike+ in 2022, second-hand, needing an extra app and settings changes. Unknown on 2026 software [G9]. | **No report.** Also, a home-screen app cannot be one half of a split [G9]. | Not built. Lowest priority in the notes. |

Notes for table G:

- **G1.** `pip:122` to `pip:127`, `pip:132`. [Peloton-Tread apply.sh](https://github.com/MichaelCyger/Peloton-Tread/blob/main/app/apply.sh), [CoverService.java](https://github.com/MichaelCyger/Peloton-Tread/blob/main/app/src/com/treadcover/CoverService.java), [overlay README](https://github.com/vmudinas/OpenPeloton_Metrics_Overlay/blob/main/README.md).
- **G2.** `pip:147`. How long such a window survives is unproven: `pip:149`.
- **G3.** `pip:36`, `pip:112` to `pip:118`, `report:39`. [grupetto README](https://github.com/doudar/grupetto/blob/develop/README.md).
- **G4.** `pip:146`, `pip:186`.
- **G5.** `pip:160`, `pip:161`. [YouTubeEmbed.kt](https://github.com/digitalducktape/OpenRide/blob/main/app/src/main/java/dev/digitalducktape/openride/ui/classes/YouTubeEmbed.kt), [OpenRide #73](https://github.com/digitalducktape/openride/issues/73).
- **G6.** `pip:178`.
- **G7.** `pip:15`, `pip:33`, `pip:45`, `pip:207`. Generic Android, [picture-in-picture guide](https://developer.android.com/develop/ui/views/picture-in-picture).
- **G8.** `pip:62`.
- **G9.** `pip:96`, `pip:100`, `pip:102`. Second-hand, [Connect The Watts video](https://www.youtube.com/watch?v=O8Vq-JK1um8), [RobotPoweredHome](https://robotpoweredhome.com/can-you-watch-tv-on-peloton/).

---

## H. Working on the tablets from the Mac

| Feature | Treadmill (PLTN-TTR01) | Bike (PLTN-RB1VQ) | What our app does today |
|---|---|---|---|
| **17c. Debugging over Wi-Fi instead of the cable** | **No report: must be measured on our tablet.** Android 10 has no "Wireless debugging" switch at all, by design [H1]. The fallback (one command over the cable that opens a Wi-Fi door) is what OpenPelo uses, and it is lost at every restart [H2]. No Tread owner reports using it. | **Reported failing or blocked** on many tablets: since late November 2025 several owners find no "Wireless debugging" switch, even after a reset. USB debugging still worked for all of them. Ours is unknown: look in Developer options [H3]. The cable fallback is the same as the treadmill's [H2]. | None of our tools use Wi-Fi debugging. The game's own updates use plain Wi-Fi and do not need it. Never leave it on where strangers share the network [H4]. |
| **Copying save data off the tablet** (our backup reaches into the app "as" the app) | **No report: must be measured on our tablet.** | **Reported working on a related basis:** OpenRide's instructions use the same Android feature on its bikes, and it works only for a test-style build like ours [H5]. | `tools/tablet-backup.sh`. Tested in the emulator only. |
| **Seeing our own log lines** | **No report.** | **Reported on this exact model:** the tablet throws away ordinary log lines; only warnings and errors are kept unless raised by a command after every restart [H6]. | Our speed-test command reads an ordinary log line (`tools/android.sh` 146). See Mismatches. |
| **Last-resort recovery without a working screen** | **Reported for this tablet family** by Peloton: hold Volume Up and Power from off, choose Recovery, then factory reset [H7]. | **Reported for this tablet** by Peloton: hold Volume Up and Power from off [H7]. | `docs/REWIND.md` lists factory reset as the last rung. |

Notes for table H:

- **H1.** `community:122`. The note-writer's reading of Android versions.
- **H2.** `openpelo:182`, `openpelo:208`, `report:17`. Read in source, [wireless_connection_manager.dart](https://github.com/doudar/Openpelo/blob/86de70f/lib/services/wireless_connection_manager.dart#L106-L112). Wi-Fi debugging also "drops" on the bike: `openride:332`.
- **H3.** `community:71`, `community:156`, `openpelo:365`. User reports, cause unknown, [OpenPelo #23](https://github.com/doudar/Openpelo/issues/23).
- **H4.** `report:174`. [PREVENTING-UPDATES guide](https://github.com/nate-santos/peloton-without-subscription-guide).
- **H5.** `openride:92` to `openride:99`, `community:242`. Documented, [OpenRide INSTALL.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/INSTALL.md).
- **H6.** `openride:332`, `report:53`. Documented, [OpenRide GAMES.md](https://github.com/digitalducktape/OpenRide/blob/main/docs/GAMES.md).
- **H7.** `community:287`, `community:288`, `report:121`. [Peloton status page](https://status.onepeloton.com/incidents/118vkqhv2d9v).

---

## Mismatches in our code

Places where the code as written when this check was made would not do what the research
says these two tablets need. Most important first.

**Fixed the same day (17 November), after the check:** row 3 (the Netflix, Hulu and Spotify
tiles now say the app is not on this tablet yet), row 4 (the Home switch is offered only
where Peloton's own setting says bike), row 6 (a refused install now prints the reason from
the tablet's log), row 7 (the speed test's result also goes through the shell, which writes it as a warning), row 10 (the
wording), row 13 (the speech-engine entry) and row 16 (the check script reads the extra
facts). **Fixed that evening, before the first real install:**

- **Row 12, the signing key.** One fixed key now signs every build. It lives in
  `android/signing/` (private) with a second copy on the Mac; see
  [android/signing/README.md](../../android/signing/README.md). `tools/android.sh install`
  refuses to put a build signed with anything else on a real tablet. Checked on the
  emulator: the old copy (signed with the Mac's throwaway key) refused the new build as an
  update, exactly as a tablet would; after a clean install, an update went on normally.
- **Row 1, the H.264 script.** The viewer now answers "cannot play that" for VP8, VP9 and
  AV1 on YouTube's pages. Engines that have the hook get it before each page runs; engines
  that lack it (reported for the bike's engine 91) get it slipped in as the page loads.
  Checked on the emulator, whose engine (83) lacks the hook: the same public video came as
  VP9 (format 244) before and as H.264 at 720p and 60 frames a second (format 298) after.
  **Not checked:** the hook route on a newer engine, and anything on the bike's own chip.
  The tablet's log says which route it took (`adb logcat -d -s MerryMiles:W`, the line
  starting "viewer:").

**Row 2 stays as it is, on purpose.** The embedded player can only play a video we have
already chosen; it has no search and no browsing. A tile called YouTube needs the whole
website, so that route stays, now with the fix. The fallback if it stutters on the bike is
still a real browser app.

**Still open:** rows 2, 5, 8, 9, 11, 14 and 15. Also still unmeasured: the picture freezing
when YouTube steps up from 720p to 1080p on engine 91 [A5] (choosing 720p or 1080p by hand
in YouTube's own gear menu is the reported way round it).

| # | Where | What is wrong | What the fix would be |
|---|---|---|---|
| 1 | `android/app/src/main/java/com/merrymiles/app/WatchActivity.kt` lines 50 to 57 and 87 | **No H.264 fix for YouTube.** On the bike's chip YouTube will pick VP9 and drop about 40% of frames [A4]. | Add the small script that tells YouTube the tablet cannot play VP9 or AV1, so it sends H.264. Our build already includes the library that has the hook. On engine 91 that hook is reported missing, so the script needs another way in and a test on the bike [A5]. |
| 2 | `HostBridge.kt` line 191 | **The YouTube tile uses a route nobody has reported.** It opens the whole phone website in our viewer. The reported routes are the small embedded player under a proper web address, or a real browser app [A1][A2]. | Try it as it is on the first evening. If it stutters or fails: switch to the embedded player, or open a real browser (Firefox) when one is installed. Either way YouTube is signed out [A3]. |
| 3 | `HostBridge.kt` lines 192 to 194 (falls through to lines 70 to 72) | **Netflix, Hulu and Spotify fall back to websites that are expected to refuse us** [A13][A22]. A family member tapping the tile would see a dead page. The copy-protection permission is *not* the missing piece: it is already granted (`WatchActivity.kt` 82 to 85). | When the app is not installed, say so plainly ("Netflix is not on this tablet yet") instead of opening the site. |
| 4 | `HostBridge.kt` line 135 with `sensors/Sensors.kt` lines 22 to 30 | **The "may we be the home screen?" test fails open.** If Peloton's setting that names the machine cannot be read, the tablet counts as "not a Peloton" and the Home switch is offered, even on the treadmill. The tablet's model name cannot rescue this: the Tread shares it with the Bike+ [B-note below]. | Allow the Home switch only when the setting positively says `v1` (the bike). Refuse in every other case. |
| 5 | `android/app/src/main/AndroidManifest.xml` lines 4 to 7 (nothing declared for it) | **On the treadmill there is no way back to Awesome Workout World** from Netflix, from Peloton's screen, or after a restart, except the Mac. The hidden app list is dead [B13] and we are never home there. | The research's answer is a small always-on-top Home button run from a background service, with a start-up hook. It needs the "draw over other apps" permission, granted once over the cable [B14]. Not built. Test first whether anything on the Tread's own screen can open Awesome Workout World. |
| 6 | `tools/android.sh` line 88 and `docs/FIRST_TEST.md` line 77 | **The install-refused words are looked for in the wrong place.** "keys mismatch" and "install denied" appear in the tablet's log. Owners describe the Mac side failing "with a blank reason" [B5]. | When an install fails, have the script read the tablet's log for those words and print them. |
| 7 | `tools/android.sh` line 146 and `web/src/bench.js` line 91 | **The speed-test command will probably print "No result" on a real tablet.** It waits for an ordinary log line, and the tablet is reported to throw those away [H6]. The on-screen speed test is not affected. | Raise the log level for that one tag before the run (it resets at restart), or have the game write the result as a warning. |
| 8 | `MainActivity.kt` line 55 and `WatchActivity.kt` line 35 | **The screen never sleeps while Awesome Workout World is in front**, riding or not. As the bike's home screen that means never. The projects on these tablets keep it awake only during a ride, or show a screensaver [C14][C15]. | Let the game tell the shell when a ride is on, and keep the screen awake only then. |
| 9 | `WatchActivity.kt` lines 33 to 48; `MainActivity.kt` lines 162 to 165 | **The viewer never hides the system bars**, and the game re-hides them only when it regains focus. On the bike, playing media in a web page brings the bars back with no focus change [C4 and `openride:116`]. | Hide the bars in the viewer too, and re-hide whenever the bars reappear, not only on focus. |
| 10 | `android/README.md` lines 143 to 144 | **Our own page states the treadmill rule wrongly.** It says the reader sends "register-callback and unregister-callback" calls. The rule, and `Sensors.kt` lines 65 to 75, say two questions only: 17 and 18. | Reword that paragraph to match the rule. |
| 11 | `Updater.kt` lines 109 to 146 | **The game updater does not check free space** before downloading (the Tread has about 4 GB in all [F5]), does not sign its file list (already noted in `android/README.md` lines 111 to 112), and has no "needs browser engine X or newer" field [D2]. | Refuse a download when space is low. Add the signature. Add a minimum engine version to the file list. |
| 12 | `android/app/build.gradle.kts` lines 6 to 22 | **No fixed signing key.** Builds are signed with a key that lives only on this Mac. If it is ever lost or the build moves, the tablets refuse the update and the only way on is removing the app [D8]. | Keep one key file, backed up, and point the build at it before the first install on a real tablet. |
| 13 | `AndroidManifest.xml` lines 10 to 27, with `build.gradle.kts` line 13 | **The speech engine may be invisible to us on the bike.** On Android 11, an app built the way ours is must list the kinds of other apps it talks to [`sensors:290`]. Speech engines are not on our list. This last point is general Android knowledge, not from our notes. | Add the speech-service entry to that list. Low cost. Santa falls back to "ho ho ho" either way. |
| 14 | `AndroidManifest.xml` lines 15, 17, 19, 21; `HostBridge.kt` lines 66 and 191 to 194 | **Four TV builds are on our list and can never be installed** on these tablets [A20]. Harmless clutter. Nothing is listed for a real browser, which is the research's fallback for YouTube. | Drop the TV names. Add a browser once we have chosen one. |
| 15 | `AndroidManifest.xml` line 7 | **The sensor permission line is not needed** [E10]. Harmless. | Leave it or remove it. No effect expected either way. |
| 16 | `tools/tablet-check.sh` lines 44 to 88 | **The read-only check misses facts the research says decide the plan:** whether the tablet offers TV mode or picture-in-picture, who is already connected to the sensor service, the log level, which Google and streaming packages are present (Peloton's own Netflix on the bike), what is switched off, what overlays are showing, and the screen time-out. | Add those read-only lines. They are listed in the next section. |

Checked and found fine: the lowest and target Android versions in
`android/app/build.gradle.kts` lines 12 to 13 suit both tablets (Android 10 and 11). The
name our code looks for to find Peloton's home screen matches the one reported
(`Safety.kt` line 28, [B11]). The app is not hidden from recent apps, which is what kept
OpenRide alive at the idle time-out [C7]. Treadmill names such as `prism-l` are handled
(`Sensors.kt` line 29).

Note for row 4: the shared model name is at `sensors:446` and `report:80`; another project
refuses to treat an unreadable setting as a treadmill for the same reason, at `sensors:439`.

---

## What to measure on the first evening, in order

Read-only checks come first. Nothing in parts 1 to 3 changes a tablet.

### 1. Before any cable

- Read the **Build number** on the About screen. Bike: `R` first is expected. `Q` means
  Android 10 (possible on this generation [B6]). `N` means Android 7: stop. Treadmill: `Q`.
- In Developer options, **look** (do not switch): is there a "Wireless debugging" entry? [H3]
- By eye, as Peloton left it: what does each machine show with no membership? Is Just Ride
  or Just Run offered? Does the Tread ask for its Tread Lock code? Do the stop button and
  the safety key stop the belt? [`report:138`] Is there a Netflix icon on the bike? [A12]

### 2. With the cable: the check script

```bash
tools/tablet-check.sh
```

It already reads: model, Android version, build, which machine (`peloton_platform`), the
sensor service's version, the browser engine's version, free storage, and what the Home
button opens now. Compare:

- Sensor service version. Treadmill: 2.4.508 and 3.2.1 are the checked ones. Bike: 3.0.1,
  and 2.4.490 on the sister tablet [`sensors:472` to `sensors:487`].
- Browser engine on the bike: 91 or 127? This settles E14.
- Free storage on the bike: the real figure nobody has published [F6].

### 3. With the cable: read-only extras the script does not have yet

```bash
adb shell pm list features | grep -i -E "leanback|picture_in_picture|freeform"
adb shell dumpsys webviewupdate | grep -i "current webview package"
adb shell pm list packages | grep -i -E "netflix|hulu|youtube|spotify|google|vending|firefox|aurora"
adb shell pm list packages -d
adb shell dumpsys activity services com.onepeloton.affernetservice
adb shell dumpsys window windows | grep -i -E "SECURE_SYSTEM_OVERLAY|APPLICATION_OVERLAY"
adb shell cmd package query-activities --components -a android.intent.action.MAIN -c android.intent.category.HOME
adb shell getprop log.tag
adb shell settings get system screen_off_timeout
adb shell settings get secure tts_default_synth
adb shell am supports-multiwindow
adb shell getprop ro.config.low_ram
```

What each answers: is picture-in-picture offered (G7); which browser engine package is in
use; is Netflix or anything of Google's already there; is anything already switched off; who
is connected to the sensor service before we ever are; is a Peloton overlay up right now
(C9, C12); the exact name of Peloton's home screen (B11); will our log lines be dropped
(H6); how long until the screen sleeps (C5); is there a speech engine (F3). The first, third
and sixth lines come from `pip:204` to `pip:221`; the fifth from `report:83`.

### 4. First change: install

```bash
tools/android.sh install
```

It takes the baseline first. If it fails, read the tablet's log for the reason:

```bash
adb logcat -d | grep -i -E "keys mismatch|install denied|Install not allowed"
```

### 5. Open Awesome Workout World and look (no sign-ins, nothing switched off)

1. **Screen size.** Awesome Workout World, then DEVICE SETTINGS: read the SCREEN line. Bike: expect
   1920 by 1008. Treadmill: unknown; note whether Peloton's top bar or bottom row is showing.
2. **PELOTON tile.** Does Peloton's own home screen come back? (B, row 7.)
3. **Getting back to Awesome Workout World.** With Peloton's screen in front, is there any way on the
   tablet itself to open Awesome Workout World again? Try Android's Settings, Apps, Awesome Workout World. On the
   treadmill this decides mismatch 5.
4. **Speed test** on the screen (the tester's calendar, TEST, SPEED TEST). Write the numbers down.
5. **Sound.** Do the carols play through the speakers? Does Santa speak, or only "ho ho ho"?
6. **YouTube tile.** Does a public video play in our viewer? Is it smooth? On the bike, does
   it start sharp and then go blurry within a minute (the VP9 sign, A4)?
7. **Netflix, Hulu and Spotify tiles.** No apps are installed yet, so each opens a website.
   Write down exactly what each page says.
8. **Leave Awesome Workout World in front for an hour.** Does Peloton cover it with a message (C9, C12)?

### 6. Treadmill only, and only if everything above was clean

The belt test in `FIRST_TEST.md` step 6: one adult, walking pace, safety key clipped on.
Does the belt keep moving with Awesome Workout World in front, does Tread Lock come on, do the knobs
work, do stop and the safety key still stop it (E9).

### Later evenings

- Install Netflix (bike: check first whether Peloton's own is already there). Does it open?
  Is it closed after 10 to 20 minutes [A10]? In Netflix: App Settings, Playback
  Specification: write down the Widevine level and the picture size [A19].
- Hulu and Spotify: does a show or a song actually play? Nobody has confirmed Hulu.
- Bike only: Home button ON, restart, then leave it an hour.
- A game update over Wi-Fi, then a deliberately broken one to see the rollback.
- Bluetooth headphones: pair, then check who keeps the sound when a video app opens (F2).
- The sensor readers, once written: standing still first, then a short ride.
