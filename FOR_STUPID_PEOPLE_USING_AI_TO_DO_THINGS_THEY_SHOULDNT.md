# For stupid people using AI to do things they shouldn't

**Point your Claude here, plug shit in, and go nuts. Good luck. It might break!**

That is the whole plan. The rest of this page is what you should know before you do it, short
enough to read on a treadmill. (Turn the belt off first.)

## What you are about to do

You are putting a home screen and a Christmas walking and riding game on the tablet of your
Peloton Bike or Tread. You do not need a Peloton membership. You will use an AI to do most of
it: to interview your family so the game is yours, to build the app, and to walk you through
putting it on the machine one tap at a time.

This is not made by, approved by, or known to Peloton. Peloton can break it any time with an update.

## What it touches

- **The tablet.** One app gets added. On some machines, the Home button gets pointed at it.
  On a machine with no membership, you may also switch off one Peloton part that keeps closing
  other apps. All of that is separate, optional, and has a way back.
- **The machine itself: we only listen.** On the treadmill the app asks Peloton's sensor
  service two questions, how fast is the belt and how steep is it, and there is no code in it
  that can start, stop, speed up, slow down or lock a belt. On the bike the reader is not
  written yet, and when it is, it will only listen too.
- **Nothing is unlocked, rooted or erased.** You switch on USB debugging, which is a
  switch in the tablet's own settings.

## What could go wrong

- **Peloton keeps fighting for the screen.** Its "Activate" screen can pop up on top of
  ours, especially after the tablet sleeps. On a treadmill, a lock keypad for the belt asks
  for a code about every 45 seconds when nobody is walking, over any app that is not
  Peloton's. That is annoying and it is on purpose: it is what stops a child starting the
  belt. Leave it.
- **A Peloton system update can wipe what you did,** remove the app and switch developer mode
  back off. Keep the tablet off Wi-Fi updates while you experiment. A system update is the one
  thing a factory reset does not undo.
- **An app that will not stay open.** On a machine with no membership, Peloton's software
  closes some apps (Netflix, on ours, nine seconds after it opened).
- **You lose Peloton's own home screen.** Only if you hand the Home button to our app. It is
  always still there under ALL APPS, PELOTON.
- **The tablet looks broken.** It probably is not. The community reports we read have no
  bricked tablet in them, and ours has not been bricked, but the cable, the switch and the
  screen all have to cooperate. A cable that only charges is the usual reason nothing happens.
- **Your warranty.** Nobody knows. People online disagree and none of them is Peloton. Assume
  you have no warranty. It is your machine and your risk.

## Ways back

From gentlest to nuclear (all of it is in [docs/REWIND.md](docs/REWIND.md)):

1. Tap the **PELOTON** tile on our home screen. It opens Peloton's own screens.
2. DEVICE SETTINGS, Home button, OFF.
3. DEVICE SETTINGS, WAYS BACK: a rescue screen that works even if the game does not.
4. Automatic: if our app fails to start three times running, it hands the Home button back
   and opens the rescue screen by itself.
5. With the cable in, `tools/tablet-restore.sh --apply` puts the tablet back the way it was
   before we touched it and removes our app. (`tools/android.sh install` takes that record the
   first time, before it changes anything.)
6. A factory reset, from the tablet's Android settings. Peloton's own instructions also have a
   recovery menu you reach with Volume Up and Power from power-off. We have not tried that one.

## What your AI must never do

Put this in front of it. It is the short list from [docs/INSTALL.md](docs/INSTALL.md) and
[docs/REWIND.md](docs/REWIND.md):

- **Never command the belt or the incline.** Not one command, not "just to test".
- **Never switch off** `com.onepeloton.affernetservice` (the sensor and belt controller),
  `com.onepeloton.sensorstateindicator` (the belt lock) or `com.peloton.activity` (Just Run
  and Just Ride).
- **Never uninstall anything of Peloton's.** A switched-off part can be switched back on.
  An uninstall can only be undone by a factory reset.
- **Never change a tablet without the saved record** that `tools/android.sh install` takes
  first.
- **Never type your passwords, keys or codes on your behalf,** never create an account for
  you, and never ask you to paste a key into a chat. Those taps are yours.
- **Do not hand out the app it built.** It has your family inside it.
- Test with the **belt stopped and nobody on it**, and keep kids and dogs off a machine while
  you are changing it.

## The order to do it in

1. Read this page. You just did.
2. Hold a meeting. Either **have a family meeting**: [docs/FAMILY_MEETING.md](docs/FAMILY_MEETING.md).
   Your AI interviews you about your people, your pets, the relatives who are not here any
   more, what you eat, and your weird stupid stuff, and writes it all into the game.
   Or **go rogue**: [docs/ROGUE_MEETING.md](docs/ROGUE_MEETING.md). You say your family's
   dreams, and your AI builds them into the game while you watch. (Do both if you like: the
   family meeting first.) You can do this on a laptop with no Peloton in the room.
3. **Put it on the Peloton:** [docs/INSTALL.md](docs/INSTALL.md). Start with *side by side*
   (one more app, Peloton untouched). Do *full takeover* later, a step at a time, if you want
   it.
4. At the end of the season, ask for the **Wrapped** video:
   [docs/WRAPPED.md](docs/WRAPPED.md).

Only if you have two machines, or friends: [docs/ADVANCED_SETUP.md](docs/ADVANCED_SETUP.md).
Everything else stays on your computer and on the Peloton.

## What to tell your Claude

Open Claude in this folder (Claude Code works best), and say:

> Read FOR_STUPID_PEOPLE_USING_AI_TO_DO_THINGS_THEY_SHOULDNT.md, then docs/FAMILY_MEETING.md,
> then docs/INSTALL.md. Run the family meeting with me first, one question at a time (or, if I
> say I want to go rogue, run docs/ROGUE_MEETING.md instead). After that,
> walk me through the install in plain words, one tap at a time on the tablet. Follow the
> "never" list. Do not type my passwords or make accounts for me, and do not change anything on
> the tablet that is not in INSTALL.md without asking me first.

Then go nuts. Good luck. It might break!
