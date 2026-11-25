# Your family, and keeping it to yourself

The game is about a family: the people who walk and ride, their dogs, the relatives who fly
in to say hello, whose birthday the cake is for. The repository cannot hold a real family,
so it holds **one made-up person, Nerd**, and some dashed outlines where the rest of the
family goes ("ADD SOMEONE: HAVE A FAMILY MEETING"). You swap in your own, and yours never
leaves your computer and your tablets.

## The easy way: have a family meeting

Give [FAMILY_MEETING.md](FAMILY_MEETING.md) to your AI (paste it into Claude, or point
Claude Code at it). It interviews you, one question at a time, about your people, your pets,
the family who are not here any more, what you eat, and your weird stupid stuff, and then
writes the files below for you. To change something later, hold the meeting again: it keeps
short minutes in `family/MEETING_MINUTES.md`. New to AI helpers? Read
[../FOR_STUPID_PEOPLE_USING_AI_TO_DO_THINGS_THEY_SHOULDNT.md](../FOR_STUPID_PEOPLE_USING_AI_TO_DO_THINGS_THEY_SHOULDNT.md) first.

## Or go rogue

The family meeting fills in blanks the game already has. For things it does not have yet (a
relative who throws snowballs back, your own street at mile 25), give
[ROGUE_MEETING.md](ROGUE_MEETING.md) to your AI instead, or after. You say the dream, it
builds it into the game while you watch, and it commits after each one so a broken dream can
be put back. It writes `family/ROGUE_MINUTES.md` at the end.

## By hand

1. Make a folder called `family` next to `web` (at the top of the project).
2. Copy three files into it: `web/profiles.js`, `web/family.js`, `web/tweaks.js`.
3. Change the copies to your family. By hand, or by having a [Family Meeting](FAMILY_MEETING.md) (your AI asks, then writes them for you).

That is all. `family/` is listed in `.gitignore`, so git never sees it.

| File | What is in it |
|---|---|
| `family/profiles.js` | Who rides: a name, a height, hair, a jacket colour, a hat. Dogs too. Who arrives part-way through and when (`arrives: '12-09'`). Which one person is the Dev (`tester: true`, below). Everything is explained at the top of the file. |
| `family/family.js` | The rest. `relatives`: any number of family who are not here any more and fly in as friendly spirits (each has a `name`, a `title`, what they say as `says`, a `jacket` and a `look`; the older single `relative` still works as one of them). `days`: a greeting for a day of the year (`'12-24': 'HAPPY BIRTHDAY, NANA!'`). `things`: your own words for anything in the game (the cake can be "NANA'S BIRTHDAY CAKE"). `home`: which TV and music tiles go on the home screen. |
| `family/tweaks.js` | The name of your challenge and the line under it, changes to the places, and which thing is behind which door. Start with it empty. |
| `family/private-words.txt` | Words that must never be published, one per line: a surname, an email address. The leak check (below) reads it. |
| `family/MEETING_MINUTES.md` | What the family meeting decided, for the next meeting. Written by your AI. |

The advent calendar has places waiting for your family, so you do not have to touch it:
your first, second and third dog (`dog:0`, `dog:1`, `dog:2`), the first people to arrive
part-way through (`join:0`), and the relatives (`relative`). The two brass-band tunes take
the names of your first two dogs.

### The Dev, and the DEV buttons

One person in `profiles.js` can have `tester: true`. That person is the **Dev**. Only the Dev
sees the **DEV buttons** (open any door on the calendar, set off any thing in the game,
jump the calendar about), and only on their own calendar and their own rides. Nobody else
ever sees them.

- The person setting this up also rides: put `tester: true` on their profile.
- The person setting this up does not ride: add one more rider, `{id: 'dev', name: 'DEV',
  photo: '', jacket: [...], look: {...}, tester: true}`. They will show up on the welcome
  screen as a person called DEV.
- Nobody wants the buttons: put `tester: true` on nobody.

### The home screen: `home` in family.js

`home` is a list of tiles that go between the game and ALL APPS. The choices are `'youtube'`,
`'netflix'`, `'hulu'` and `'music'`. It starts empty, which means **just the game and ALL
APPS**, no TV apps. None of those apps are on a Peloton: to use a tile you must first add an
app store yourself (see "Get other apps" in [INSTALL.md](INSTALL.md)), sign in on the tablet
with your own fingers, and install the app. The tile only opens an app that is installed.

### Your own words for things: `things` in family.js

Any food, treat, tool, trail buddy or surprise can have your own name and lines, by its id
(`wormsoup`, `cake`, `owl`, `yeti`, `lasergun`, and so on: see `web/src/rewards.js` and
the `SIGHTS` list in `web/src/gifts.js`). Each can have `name`, `tag` (the short name), `blurb`
(what it is), `say` (the word that pops up with a bite), `quip` (the funny line on its door)
and `speak` (what the tablet says out loud). **The picture does not change**, only the words.
Text is drawn in a capital-letter pixel font: A to Z, 0 to 9 and `. , ! ? : - + / % ' " ( ) & # * =`, with no
accents, semicolons, at signs or underscores. Pets other than dogs cannot be drawn: give them a line instead.

### Visitors: `stays` in profiles.js

Somebody who is only with you for a few days (cousins at Thanksgiving) gets
`stays: ['11-25', '11-28']`: the first and the last day they are here. They are on the
welcome screen, the map and the calendar for those days and then they have gone home; their
miles only count toward the family's goal for the days they are here. They stay in
`profiles.js`, and their rides stay in the log.

### More ways to draw somebody: `look` in profiles.js

Besides height, hair, glasses and beards: `hat: 'sauna'` (a felt sauna hat) or `'wizard'`
(a pointy one), `shirtless: true`, and `babySled: true` (a baby in a little red sled on
their back: the baby is part of that person, not a rider).

### Birthdays and presents: `days`, `presents` and `only` in family.js

- `days: { '12-01': 'HAPPY BIRTHDAY, SOMEBODY!' }` puts your words on that day's door.
- `presents: { '12-01': ['wizardhat', 'birthdaycake'] }` puts extra things behind that
  day's door, after the day's own thing. `wizardhat` is a hat somebody wears on every ride
  from the moment they open that door; `birthdaycake` is a cake to eat on rides.
- Give a thing `only: 'their-id'` in `things` and it is that one person's present: nobody
  else's door has it. Leave `only` off and everybody gets it.

### Only in the season: `seasonOnly` in family.js

`seasonOnly: true` keeps everybody waiting: until the trail opens (Thanksgiving, unless you
move it in the game's Settings) the welcome screen only counts the days, nobody is on it and
nobody can ride. It starts off, so the game can be tried on any day of the year. Each tablet
can switch it in the game's Settings (ONLY IN THE SEASON).

### Photos

The game can show a photo instead of a drawn face (`photo:` in `profiles.js`, with the file
in `web/photos/`). But that folder is **not** kept out of git yet, and the private `family/`
folder does not carry photos, so the family meeting skips them. If you want photos, ask your AI to
keep `web/photos/` out of git first.

## Where your family is used, and where it is not

- **The game on your Mac** (`tools/serve.mjs`): yours, whenever `family/` is there.
- **The tablet app you build** (`tools/android.sh build`): yours. **An app built on your Mac
  has your family inside it. Do not hand that file to anybody.**
- **The website preview** (`tools/site.mjs`) and the published website: always the made-up
  family. (`node tools/site.mjs --family` shows yours, on your Mac only.)
- **The repository:** never.

## Before you push anything to a public place

```bash
node tools/leak-check.mjs
```

It reads the names out of your `family/` folder (every person and dog, the relatives) and
looks for them in every file git would publish. Add anything else that must not get out
(a surname, an email address, a tablet's serial number) to `family/private-words.txt`,
one per line. It cannot read pictures: take screenshots for the docs and the website with
the made-up family. `tools/site-shots.sh` retakes the website's pictures that way.

## More than one Peloton, or friends

By default everything stays local: your family files are baked into the app on each Peloton
you install it on, and each Peloton keeps its own rides. Each tablet gets your family when you
install the app on it. To keep the rides of a bike and a treadmill in step, to back up
`family/` privately, or to let your AI read the whole season for the Wrapped video, see
[ADVANCED_SETUP.md](ADVANCED_SETUP.md). Who gets what is also in "Sharing the rides" in
[BIKE_AND_TREADMILL.md](BIKE_AND_TREADMILL.md). At the end of the season,
[WRAPPED.md](WRAPPED.md) is the prompt for a highlights video.
