# The advanced set-up: more than one Peloton, or friends

**Do you need this? Probably not.** The normal way is local: your family files stay in the
`family/` folder on your computer, they are baked into the app on your Peloton, and the
rides are saved on the Peloton itself. Nothing goes on the internet. Skip this page unless:

- you have a **bike and a treadmill** and want them to share one calendar and one trail, or
- you want your AI to be able to **read the whole season's rides** later to build the
  "Wrapped" video ([WRAPPED.md](WRAPPED.md)) without cables, or
- you want a **private backup** of your family files, or a second computer to have them, or
- you want to do the walk-a-thon with **friends**.

## What exists today, and what is only a plan

Built and working:

- **Ride log sharing between machines.** Each Peloton keeps its own log of rides and opened
  advent doors. With a key, it sends that log to one file of its own in a private GitHub
  repository (`logs/bike.json`, `logs/treadmill.json`) and reads the other machine's file.
  The game adds whatever it had not seen. Rides are only ever added, so neither machine can
  undo the other. It runs a few seconds after the app starts, a few seconds after every ride,
  every ten minutes, and from DEVICE SETTINGS, FAMILY LOG, SYNC NOW. (The code is
  `android/app/src/main/java/com/merrymiles/app/Sync.kt`; the story is in
  [BIKE_AND_TREADMILL.md](BIKE_AND_TREADMILL.md), "Sharing the rides between the two machines".)
- **Honest status:** the treadmill's sending was seen working on a real tablet and a real
  repository. The receiving half was only seen on the emulator, against a stand-in for
  GitHub, because the bike was not connected yet.

Not built, only a plan:

- **Your family's people, dogs and relatives over the air.** Today each Peloton gets them
  when you install an app built on your computer. Change the family, rebuild, install again.
  (The plan is in the README's "What's next".)
- **Friends and other households.** Each machine's file is named after its kind: `bike`,
  `treadmill` or `tablet`. So **two bikes, or two treadmills, would overwrite each other's file.**
  One bike and one treadmill: fine. Anything bigger needs a code change first.
- **A "Wrapped" that records itself.** Since 19 November 2026 each ride writes down its funny
  moments (the toasts the game showed). Tools used, buddies seen and door-opening times are not
  recorded yet (see the end of [WRAPPED.md](WRAPPED.md)).

## Sharing rides between a bike and a treadmill

You do this part; your AI can help with the steps, but it must never see the key.

1. **Make the repository.** On GitHub, make a new repository. Make it **Private**. Tick
   "Add a README" so it is not empty. Call it anything (`family-log` will do). Put nothing
   else in it: it will hold ride logs and nothing else.
2. **Make a key** that can read and write that one repository and nothing else. On GitHub:
   your profile picture, Settings, Developer settings, Personal access tokens, Fine-grained
   tokens, Generate new token. Under "Repository access" pick "Only select repositories"
   and pick that one. Under "Repository permissions" set **Contents** to "Read and write".
   Pick an expiry you can live with: when it runs out, syncing stops until you make a new
   one. GitHub moves its buttons around; the words to look for are "fine-grained",
   "only select repositories" and "Contents". The key starts with `github_pat_` and GitHub
   shows it **once**. Do not paste it into a chat. Do not save it in a file.
3. **Tell the project which repository.** Put its name, as `owner/name`, in
   `android/signing/log-repo.txt` (the folder is kept out of git). That is not a secret.
4. **Give each Peloton the key, one at a time.** With the tablet on the cable, and the key
   copied with GitHub's copy button so it is on your clipboard:

   ```bash
   tools/android.sh sync-key clipboard
   ```

   (Or run `tools/android.sh sync-key` and paste at the hidden prompt.) It checks the key
   against the repository first, then stores it in the app's private storage on that
   tablet, and nowhere else. It refuses to put it on the emulator.
5. **Look.** On the tablet: DEVICE SETTINGS, FAMILY LOG should say it is in step. Press
   SYNC NOW. A file named for that machine appears in the repository under `logs/`.
6. **Take the key off** a tablet any time: `tools/android.sh sync-key off`.

If it does not work, FAMILY LOG says why: "THE KEY WAS REFUSED" (wrong or expired: make a
new one), "THE KEY MAY NOT DO THAT" (the key was not given Contents, read and write), "THE
LOG REPOSITORY WAS NOT FOUND" (the name in `log-repo.txt` is wrong, or the key was not
given that repository), "COULD NOT REACH GITHUB" (Wi-Fi).

## Keeping your family files somewhere safe, or on a second computer

`family/` is just a folder, and the main project's git ignores it. If you want it backed up,
or the same on another computer, make it its own private git repository. This is ordinary
git: nothing in this project does it for you.

1. On GitHub, make a **new private** repository for the family. It will hold the names of
   your children and your relatives, so **never make it public**.
2. In a terminal, in the project folder: `cd family`, then `git init`, `git add -A`,
   `git commit -m "family"`, then the two lines GitHub shows you for pushing an existing
   repository.
3. On a second computer, clone it as the folder called `family` next to `web`.

Never put the ride-log key (above) in it, and keep it separate from the ride-log repository.

## Friends

Not built. The honest version: the game is made for one household. The pieces that stop it
today are the machine names above and the fact that your friends' people would have to be in
your `family/profiles.js` (and yours in theirs). An idea that should work, untried: two
households, one with a bike and one with a treadmill, sharing one log repository and the same
people file. Do not count on it. Ask your AI to look at `Sync.kt` and the "online home" ideas
in the README before you promise anybody a leaderboard.

## Then: Wrapped

Once the logs are in a repository your AI can read (clone it, or pull it), it can build the
end-of-season highlights video from them. See [WRAPPED.md](WRAPPED.md).
