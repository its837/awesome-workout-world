# The 2026 Holiday Walk-a-thon WRAPPED

On Christmas Day the walk-a-thon ends. This page is how you turn the whole season into a
highlights video: who walked how far, who never missed a day, which dog pooped the most,
who got the most Christmas cheer. It is not a feature of the game. It is **a prompt**: you
give your AI the season's ride logs and the prompt below, and it builds the video.

The prompt only works if your AI can read the rides. There are two ways to get them there.

**The default way (local): off the Peloton with a cable.** Every ride is saved on the
Peloton it was done on. After Christmas, for each Peloton:

1. Plug it into your computer, with the cable you installed with
   ([INSTALL.md](INSTALL.md), steps 5 and 6).
2. In the project folder, run:

   ```bash
   tools/tablet-backup.sh
   ```

   This only **reads**. It copies that Peloton's save file (and its one-a-day copies) to
   `backups/<tablet>/<date and time>/` on your computer, and says how many rides it found.
   (It reads the file through `adb run-as`, which works with the debug builds that
   `tools/android.sh build` makes.)
3. Do the same for the other Peloton, if you have two. Rides are only ever added and each has
   its own id, so if the same ride turns up in two files nothing is counted twice.

**The advanced way: the rides are already in a private GitHub repository.** If you set up
ride sharing ([ADVANCED_SETUP.md](ADVANCED_SETUP.md)), the rides of every Peloton are in
`logs/bike.json` and `logs/treadmill.json` in that repository. Clone it (or pull it) next to
the project and point your AI there. No cable needed.

Either way, also tell your AI where your `family/` folder is: it has everybody's names.

When you have the rides, open Claude, paste the prompt below, and tell it where the files are.
Everything it makes goes in `family/wrapped/`, which git never sees. The video shows your
family: do not post it anywhere you have not decided to.

## What we know about each ride

Written here so your AI does not have to guess. Each ride in the log has: `id` (starts
with the time of the ride, in base 36 milliseconds: you can work out the time of day),
`who` (the person's id in `family/profiles.js`), `day` (`YYYY-MM-DD`, the day it counts
for), `kind` (`bike` or `tread`), `min` (active minutes), `m` (metres), `climb` (metres
climbed, on the treadmill), `cheer` (Christmas cheer points), `kcal`, `trees` (trees lit),
`rewards` (treats picked from the mile cards, by id), `stage` (trail miles done), `open`
(1 if it was long enough to open that day's door), `unlocked` and `opened` (how far along the
calendar they were; only when the calendar was on), and `dogs`: for each dog that ran beside
them, `{m: metres, poops: how many stops, sprinkles}`. There is also `opens`: doors somebody
opened on the calendar outside a ride (`who`, `n` the door number, `day`). Rides marked
`demo` are pretend: leave them out. The first calendar day is Thanksgiving, November 26,
2026, and the last is Christmas Day.

What the game does **not** write down is listed at the end. The prompt below tells your AI
not to make those up.

---

## The prompt

You are the editor of our family's **2026 HOLIDAY WALK-A-THON: WRAPPED**, a highlights video
of the whole season, in the style of a music-streaming year in review: big friendly numbers,
quick awards, jokes, and everybody gets a moment. We walked or rode a mile a day, Thanksgiving
(November 26, 2026) to Christmas Day, in Awesome Workout World and its game Merry Miles, on a
Peloton. You will build the video from the real ride logs.

**The rules**
- Be kind and funny. Everybody gets a moment, including the person who did the fewest miles
  (find the angle: they never missed a Tuesday, they did the cold one on the 24th). Nobody is
  shamed. Never rank children against each other in a way that could hurt.
- Use only numbers that are really in the logs. Never invent a ride, a mile or a moment. If I want
  funny moments the game did not record, ask me and I will tell you from memory: those become
  text cards.
- Keep it private: put everything in `family/wrapped/` (git never sees it). Do not upload
  anything. Do not search the web about us.
- Ask me before you start, one question at a time: where are the logs (the `backups/` folder,
  or a cloned log repository) and the `family/` folder; widescreen or vertical; how long
  (60 to 90 seconds is good); do we include a guest appearance by the relatives who fly in on
  the calendar (`relatives` in `family/family.js`) at the end, or not (some families would
  rather not); and are there days to leave out (the person who set the game up may have tested
  things before Thanksgiving, or used the DEV buttons).

**Step 1: read and clean.** Merge every ride from every file into one list by `id`, so none
is counted twice. Drop anything marked `demo` and anything outside November 26 to December
25, 2026 (and the days I told you to leave out). Turn each `who` into a name using
`family/profiles.js`. Dogs are in there too, with their ids. Write the clean list and what you did to
`family/wrapped/data.json`. Tell me in two lines how many rides, how many people, and which
machines.

**Step 2: the numbers.** Work out, with plain arithmetic you could show me:
- the family's total miles (metres divided by 1609.344), total minutes, total calories,
  trees lit, and Christmas cheer points; bike against treadmill;
- per person: miles, minutes, rides, climb, calories, cheer, their favourite treat (the most
  picked in `rewards`), and their best single ride;
- days when everyone did their mile; the biggest day; the longest streak of days in a row,
  per person and for the family; the first ride of the season and the last; the earliest
  and the latest time of day (from the `id`);
- the dogs: each dog's miles, and its number of poop breaks (from each ride's `dogs`), and which
  person it ran beside most;
- doors: who opened which door first, from `opens` and each ride's `opened`.

**Step 3: the awards.** Invent eight to twelve awards with silly names that fit the numbers,
for example: "Most Christmas Cheer" (highest `cheer`; the spirit meter itself is not saved, so
say cheer points), "Early Bird", "Night Owl", "Never Missed a Day", "Comeback Kid" (rode again
after the longest gap), "Climber" (most climb), "Dog Whisperer" (the most dog miles beside one
person), "Poop Break Champion" (the dog, not a person), "Showed Up On Christmas Eve". Everybody
wins at least one. Show me the list and the reasons and let me change it before you build.

**Step 4: the story.** Write the script as a list of cards, each with the words, the number,
how many seconds, and who it is about. Open big ("In 30 days we walked X miles, and the dogs
did Y of them"). Go quickly. End warmly, with a thank-you to the family and, if I said yes, the
relatives' guest appearance. Let me read it and change it.

**Step 5: build it.** Make one self-contained page, `family/wrapped/wrapped.html`, that plays
the whole thing by itself from `data.json`: cards, big numbers counting up, bars, confetti, in a
chunky pixel look. You can borrow the game's own drawing and fonts from `web/src/` (it draws
text with `web/src/font.js`; the people and dogs are drawn by `web/src/figure.js`), but the
page must work from a local file, with no internet. Then offer me a few ways to get a video:
1. **Easiest, always works:** I open the page full screen and press Shift, Command and 5 on the
   Mac to record the screen.
3. **Automatic:** you work out a way to capture the page frame by frame (the Mac's Chrome can run
   with no window, as `tools/site-shots.sh` does for pictures) and join the frames with ffmpeg
   into an mp4. Nobody has done this in this project yet, so if it fights you, drop back to
   number 1.

Run it, look at it, and fix what is wrong before you show me. Tell me exactly where the finished
file is.

---

## What the game records, and what it does not (yet)

**Recorded since 19 November 2026:** every ride that has funny moments carries a `moments` list,
for example `[{"at": 312, "text": "YOU BROKE THE LAMP!"}, {"at": 340, "text": "TIMBER!"}]` (`at` is
seconds into the ride; `text` is what the game's toast said, without the points). It is written
by `finish()` in `web/src/ride.js` and sits on the ride, next to `who`, `day` and the miles. Rides
made before that day do not have it, and a quiet ride may have none. A ride's DEV toasts are left
out. Use it for the "funniest moments" cards, and never invent one that is not in a list.

**Not recorded, so the prompt cannot use them, and your AI should not pretend it can:**

- which tools were used, how often, and on what (snowballs, the finger, the laser gun, the volleyball),
  other than what shows up as a toast in `moments`;
- which trail buddies showed up, and when the relatives flew in;
- the top speed or power of a ride, and the spirit meter's peak;
- the exact moment each calendar door was opened and what was behind it.

If you want any of those, ask your AI to add a list like `moments` before the walk-a-thon starts
(`finish()` in `web/src/ride.js` is the place), and the video gets a lot funnier.
