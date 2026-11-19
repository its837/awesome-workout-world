# Easter eggs (spoilers!)

Everything hidden in Merry Miles and Awesome Workout World so far. Don't show the family.

Since version 0.7 most of these arrive through the **advent calendar**: the reindeer,
Rudolph, Santa's sleigh, the northern lights, the yeti, the igloo, the tree sled, the
snow flurries, the sunrise, the trail buddies, the family's dogs, and the dogs' poop breaks
are each behind one door, and are not in anybody's game until they open it. The door
order is at the top of `web/src/gifts.js`.

## On Awesome Workout World (the tablet's home page)
- **Touch anywhere** for a rainbow explosion.
- **Tap a dancing dog** and it jumps and barks (WOOF!).
- **The hit counter** is the build number of the game that is running.
- **The marquee** along the bottom admits there is no guestbook.
- A rainbow comet crosses the stars every few seconds.

## In the sky
- **Santa's sleigh** crosses in front of the moon about 40 seconds into a ride, then every few
  minutes. Rudolph's nose is the one red pixel out front.
- **The aurora** brightens as the Christmas-spirit meter fills — and goes to full strength
  whenever *Silent Night* is playing.

## On the trail
- **Trees light up for you.** Keep moving and the spirit meter fills; the fuller it is, the
  more of the pines ahead switch on their fairy lights as you approach.
- **Tap a snowman** and his hat falls off ("Sorry, Frosty!").
- **Tap a reindeer** for a few points. About one in seven is **Rudolph** (glowing nose, bigger bonus).
- **The Yeti** very occasionally stands among the Whispering Pines in a Santa hat. Tap him for +100.
- **An igloo** glows out on the ice halfway along the Frozen Lake.
- **The North Pole** itself — a striped pole with a sign — is halfway through North Pole
  Village, just before the giant decorated tree.

## The dogs
- **Tap a dog on the welcome screen** for its numbers: miles run, poop breaks, who it runs with most.
- **One dog can stop about three times as often** as the others (`poop: 3` on that dog in the family file).
- **Sprinkle Power Poop**: do your mile three days running and every poop break is a
  sparkling one, with rainbow sprinkles on the pile and a bonus. Miss a day and it is gone.
- **The third dog flies in from Australia** on December 12. Fancy avo toast and a flat
  white follow it through the next two doors.
- **A relative of yours flies in** out of the night sky as a friendly spirit, pulls up beside you and says
  hello (who it is, what they wear and what they say are yours: `relative` in `family.js`), flies along next to you for nine to eighteen seconds (sometimes swooping over your head
  to the other side), then shoots off up the trail into the sky. Tap them for a high five: they swoop over
  you and it is worth 50. How they fly is in `web/src/relative.js`.
- **Dynamite** is just a sloppy joe. It says so.

## Who you are
- **Nobody rides as a dog** any more. The dogs run with everybody and keep their own miles.
- **The dogs turn up on everybody's rides**, one on each side, in their own time:
  out of the trees, alongside for a while, then off again (back out of the frame, into the
  woods, or bolting up the trail). Your own dog (`dog:` on your line of the family file) stays
  around more.
- **About once a mile one of them stops for a poop.** It squats, a tiny caption says so, you
  ride on, and it catches up. If you are going slowly you can see what it left.
- **Guests** ride as a frog in a yellow raincoat, eye-bumps poking out under the Santa hat.

## The family trail
- **Your camp** is beside the start arch every time you set off, fire lit.
- **Other people's tents** are in their jacket colours with their names over them. Riding
  past one is worth a little cheer.
- **A gold star** appears beside your miles on the welcome screen once today's advent door is open.
- **A door's thing shows up straight away.** When the reindeer, Rudolph, yeti, igloo or North
  Pole door opens mid-ride, it appears beside the trail just ahead; the sleigh door sends
  the sleigh across the moon within a couple of seconds.
- **Every door says something** when it opens. The turkey says GOBBLE GOBBLE.
- **Tap any door you have opened**, on your calendar or the family's, and it opens all over again in the panel on the right.
- **An unlocked door hovers beside you** on a ride and rattles until you tap it. Tap a locked one on a calendar and it only rattles.
- **Drop bears.** Once that door is open, now and then a koala lands on your back and holds
  on. Tap it off for cheer.
- **Disco snow** turns every flake a different colour for half a minute, at random.
- **Fireworks** go off when you finish your mile. Everybody has them.
- **A poop break is seen at any speed.** The dog runs on ahead first, squats, and lets go just before you get there: PLOP!, and you ride past it.
- **JINGLE SMELLS** is in the songbook: an oom-pah where, every fourth bar, the trumpet stops and something lower answers. **SNAGS ON THE BARBIE** is the Australian one: a bush-band jig over a didgeridoo.
- **The outhouse.** Every few minutes one stands beside the trail. Tap it: "AHHH. THAT IS BETTER!", 75 points, and its moon lights up. Do it again on the same ride and it says AGAIN?
- **The whole gang.** Only a couple of buddies and a dog are about at a time, but every several minutes everybody turns up together for half a minute.
- **December 24 can be somebody's birthday.** Give that day a greeting of its own (`days` in `family.js`) and the cake behind its door a name and a line (`things`). In the house this was written for, the cake does not approve of Christmas paper on birthday presents.
- **The tree sled** (December 18): you tow a Christmas tree home behind you, lights already on.
- **Christmas Day's door** is the gold one.

## Trail buddies
- **The snowy owl** flies the way you are going, so you see its back. It glides beside you,
  and every so often swoops low up the trail and climbs away, crosses over your head to the
  other side, or peels off into the trees. It always comes back, in from above.
- **About once a minute the owl turns its head right round** to check you are still there.
  That is the only time you see its face.
- **The penguin** waddles ahead of you with its scarf trailing; the **fox** trots a little in
  front on the right; the **cardinal** flits round your hat.

## Mile rewards
- Every mile on the bike, every quarter mile on the tread: cookies, then sparkle, then
  round again. Sparkle stacks up for the whole ride. (The buddies are not rewards any more:
  each arrives through its advent door and then comes on every ride, turning up one by
  one in the first half minute.)
- **Jingle Bells** (a sparkle pick) really do jingle, once per pedal stroke or step.
- A cookie gets eaten in three bites (CHOMP!) and then refills the spirit meter.
- The thin gold line under the MILES tile shows how close the next reward is.

## Things you can earn
- **12 in a row** — collect twelve pickups without stopping: "The 12 Days of Christmas".
- **25 trees lit**, and **100 trees lit**.
- **Dasher Mode** — hold 110+ rpm on the bike for five seconds.
- **Mountain Goat** — hold 10%+ incline on the tread for thirty seconds.
- A chime and bonus at every mile, and a fanfare when you finish the day's mile. That is the
  moment the sun comes up: every ride is at night until the last few minutes before it.

## Secret inputs
- **Tap the MERRY MILES logo five times** on the home screen for a blizzard (five more to stop).
- **Tap the song title** during a ride for the songbook. The three starred tunes were
  written for the game.
- **Tap the ride clock three times** for a frames-per-second readout.
- **Tap the MILES tile** to flip it: sugar cookies, candy canes, then hot cocoas burned.
- **The Konami code** (↑ ↑ ↓ ↓ ← → ← → B A, keyboard only) lights every tree at once.
  Santa notices.

## Santa says
- The greeting counts down the days ("42 days to Christmas, …!"), switches to "It's Christmas
  Eve" and "Merry Christmas" on the day, and adds a line if you ride before 5 a.m.
  ("Up late waiting for me?"), on Christmas Eve, or in the days after Christmas.
- The carols speed up slightly when you pedal or walk faster, and each one is played on a
  different instrument from one time to the next.
