// THE CATALOG: every thing you can get in the game, how you get it, and what it does.
//
// There are three piles, kept apart on purpose:
//
//   ADVENT THINGS  the cool stuff. Each is behind exactly one door of the calendar
//                  (DOOR_GIFTS below, door 1 first). It is not in your game at all until
//                  you open that door; from then on it is yours for every ride.
//                  WHATEVER IS BEHIND A DOOR STAYS OUT OF THE GAME UNTIL THAT DOOR IS OPEN.
//                  Take something off the calendar and it is simply always there.
//   EARNED THINGS  not behind a door: you get them by doing something hard, and keep them
//                  only while you keep it up (EARNED below).
//   REWARDS        the extras picked from a card every mile: cookies and sparkle
//                  (rewards.js). In from day one, nothing to do with doors.
//
// HOW TO ADD A THING
//   a trail buddy or a food   an entry in REWARDS and its picture in ART (rewards.js), with
//                             advent: true and set: 'buddy' or 'feast'
//   a surprise                an entry in SIGHTS below: its words, and what holds it out of
//                             a ride / brings it in (hold / start / open)
//   a song                    write it in carols.js. Songs are NOT advent things: every song
//                             is in the songbook from day one.
//   a dog, or somebody who    add them to profiles.js (a dog: species 'dog'; a person who
//   arrives part-way          arrives late: arrives: 'MM-DD'). The calendar has places for
//                             them already: 'dog:0' is your first dog, 'join:0' the first to arrive
//   your own words for a      `things` in family.js: a name, a line, what its door says
//   thing in this catalog
//   somebody who turns up     a Visitor of their own (visitor.js; santa.js and edward.js are two),
//   to cheer you on           a line in FANS in ride.js, and an entry in SIGHTS made with fan()
//   something you earn        an entry in EARNED below
// ...and then, for an advent thing, put its id in DOOR_GIFTS (or pick it for a door in the
// studio). Nothing else needs to change: the calendar, the ride, your own calendar screen
// and the studio all read this catalog.
//
// Every thing can also carry:
//   quip   the funny line its door says when it opens (door.js draws the opening)
//   tag    its short name on the TEST buttons
//   show   what its TEST button does, when "open" alone would not show it straight away
// TEST (the THINGS page of the in-ride test drawer, workshop.js) lists this whole catalog
// and can set off any of it, whatever the calendar says.
//
// A door opens once its day has come and you have ridden for a minute (camp.js).
import { REWARDS, ART, rewardIcon } from './rewards.js';
import { TWEAKS } from '../tweaks.js';
import { CAROLS } from './carols.js';
import { songSlug } from './audio.js';
import { makeCanvas } from './util.js';
import { ballPicture } from './tools.js';
import { drawText } from './font.js';
import { uiSprite, DEFS } from './sprites.js';
import { portrait, drawPortrait } from './portraits.js';
import { RELATIVE, RELATIVES, RELATIVE_SAYS } from './relative.js';
import { FAMILY } from '../family.js';
import { SANTA, SANTA_SAYS, santaSprite } from './santa.js';
import { EDWARD, EDWARD_SAYS, edwardSprite } from './edward.js';

// The calendar: what is behind each door, door 1 (the first day of the season) first.
// The last door, on Christmas Day, is always HOME. The dates are for a season that starts
// on Thanksgiving 2026. The studio can change the order (it is saved as TWEAKS.doors).
//
// A DOOR CAN HOLD MORE THAN ONE THING: write a list, ['penguin', 'flurry']. The first is
// the one pictured on the door. So there is always room for another thing, and adding one
// never pushes something else off the calendar (anything that is on no door at all is in
// the game from day one).
export const DOOR_GIFTS = [
  'turkey',               //  1  Nov 26  Thanksgiving: gobble gobble
  ['cardinal', 'finger'], //  2  Nov 27  ...and the long smelly finger: there are snowmen to push over from day one
  'dog:0',                //  3  Nov 28  your first dog (the dogs in profiles.js, in the order they are written)
  ['wormsoup', 'lasergun'],   //  4  Nov 29  ...and the laser gun, the day before the reindeer come out of the trees
  'deer',                 //  5  Nov 30
  'flurry',               //  6  Dec 1
  ['fox', 'volleyball'],  //  7  Dec 2   ...and a volleyball: serve it at a streetlamp
  'dynamite',             //  8  Dec 3
  'poop',                 //  9  Dec 4
  'dog:1',                // 10  Dec 5   your second dog
  'sleigh',               // 11  Dec 6
  'discosnow',            // 12  Dec 7
  ['penguin', 'penguinmilk'],   // 13  Dec 8   the penguin, and what comes out of it
  'join:0',               // 14  Dec 9   the first people to arrive part-way (arrives: in profiles.js): the day they get here
  'igloo',                // 15  Dec 10
  'rudolph',              // 16  Dec 11
  'dog:2',                // 17  Dec 12  your third dog. This one flies in from Australia...
  'avotoast',             // 18  Dec 13  ...and so does the rest of this week
  'edward',               // 19  Dec 14  (the flat white used to be here: it is a mile treat now)
  'relative',             // 20  Dec 15  the relative who flies in (family.js)
  'dropbear',             // 21  Dec 16
  'aurora',               // 22  Dec 17
  'sled',                 // 23  Dec 18
  'owl',                  // 24  Dec 19
  'kangaroo',             // 25  Dec 20
  'sunrise',              // 26  Dec 21  the winter solstice
  'yeti',                 // 27  Dec 22
  'sexysanta',            // 28  Dec 23  late on purpose (prime rib used to be here: it is a mile treat now)
  'cake',                 // 29  Dec 24  (somebody's birthday, in our house: `things` in family.js gives it your own words)
];

// ---------------------------------------------------------------------------
// What each KIND of thing does in a ride. `r` is the ride (ride.js), `t` the thing.
//   start(r, t)        the rider has it: bring it into this ride
//   hold(r, t)         the rider does not have it yet: keep it out of this ride
//   open(r, t, quiet)  its door has just opened, mid-ride (quiet: part of a catch-up,
//                      so without the show)
// A thing can carry hooks of its own (the surprises do); otherwise its kind's are used.
// ---------------------------------------------------------------------------
export const KINDS = {
  buddy: { label: 'Trail buddy', start: (r, t) => r.arrive(t.id), open: (r, t) => r.star(t.id), show: (r, t) => { r.star(t.id); r.rider.pack.poke(t.id); } },
  dog: { label: 'Dog', start: (r, t) => { if (!t.self) r.bringDog(t.dog, false); }, open: (r, t) => { if (!t.self) r.bringDog(t.dog, true); }, show: (r, t) => r.callDog(t.dog) },
  tune: { label: 'Song', open: (r, t, quiet) => r.newSong(t.slug, !quiet) },   // (only if somebody puts a song behind a door again)
  feast: { label: 'Feast', start: (r, t) => r.treats.add(t.id), open: (r, t, quiet) => { if (quiet) r.treats.add(t.id); else r.newItem(t.id); } },
  sight: { label: 'Surprise' },
  join: { label: 'Family' },
  home: { label: 'Home', open: (r) => r.openEverything() },
  none: { label: 'Nothing' },
};
/** The hooks for one thing: its own if it has them, else its kind's. */
export function hooksOf(t) {
  const k = KINDS[t.set] || {};
  return { start: t.start || k.start, hold: t.hold || k.hold, open: t.open || k.open, show: t.show || k.show };
}

// The surprises: things out on the trail and up in the sky. Each says how it is held out
// of a ride and what happens the moment its door opens.
const hideIt = (key, type, v, x) => ({
  hold: (r) => r.world.hide.add(key),
  open: (r, t, quiet) => { r.world.hide.delete(key); if (!quiet && type) r.stepOut(type, v, x); },
});
const fan = (key) => ({
  hold: (r) => { r.noFan[key] = true; },
  open: (r, t, quiet) => { r.noFan[key] = false; if (!quiet) r.callFan(key, 1.5); },
  show: (r) => r.callFan(key, 0),
});
// A tool: something you pick up from the TOOLS strip in a ride and then use by tapping the trail (tools.js).
const tool = (id) => ({
  start: (r) => r.tools.add(id),
  hold: (r) => { r.tools.delete(id); if (r.tool === id) r.tool = null; },
  open: (r, t, quiet) => { r.tools.add(id); if (!quiet) r.newTool(id); },
  show: (r) => { r.tools.add(id); r.tool = id; },
});
const SIGHTS = {
  lasergun: Object.assign({ name: 'LASER GUN', tag: 'LASER GUN', blurb: 'PICK IT UP, THEN TAP WHAT YOU WANT TO ZAP', quip: 'PEW. PEW PEW.' }, tool('lasergun')),
  volleyball: Object.assign({ name: 'VOLLEYBALL', tag: 'VOLLEYBALL', blurb: 'PICK IT UP, THEN SERVE IT AT THINGS. TRY A STREETLAMP', quip: 'SET. SPIKE. SORRY ABOUT THE LAMP.' }, tool('volleyball')),
  finger: Object.assign({ name: 'LONG SMELLY FINGER', tag: 'FINGER', blurb: 'PICK IT UP, THEN POKE THINGS WITH IT', quip: 'DO NOT SMELL IT.' }, tool('finger')),
  flurry: { name: 'SNOW FLURRIES', tag: 'FLURRY', blurb: 'NOW AND THEN IT REALLY SNOWS', quip: 'HATS ON.', hold: (r) => { r.noFlurry = true; }, open: (r, t, quiet) => { r.noFlurry = false; if (!quiet) { r.snow.heavy = true; r.flurryLeft = 60; } } },
  poop: { name: 'POOP BREAKS', tag: 'POOP', blurb: 'ABOUT ONCE A MILE A DOG HAS TO GO', quip: 'WHEN YOU HAVE TO GO, YOU HAVE TO GO.', hold: (r) => { r.noPoop = true; }, open: (r) => { r.noPoop = false; r.nextPoop = 0; }, show: (r) => r.poopNow() },
  deer: Object.assign({ name: 'REINDEER', tag: 'REINDEER', blurb: 'WATCHING FROM THE TREES. TAP ONE!', quip: 'THEY WERE WATCHING THE WHOLE TIME.' }, hideIt('deer', 'deer', 0)),
  rudolph: Object.assign({ name: 'RUDOLPH', tag: 'RUDOLPH', blurb: 'ONE REINDEER IN SEVEN HAS A RED NOSE', quip: 'YES. THAT ONE.' }, hideIt('rudolph', 'deer', 1)),
  yeti: Object.assign({ name: 'THE YETI', tag: 'YETI', blurb: 'HE HIDES IN THE WHISPERING PINES', quip: 'HE IS MORE SCARED OF YOU.' }, hideIt('yeti', 'yeti', 0)),
  igloo: Object.assign({ name: 'THE IGLOO', tag: 'IGLOO', blurb: 'OUT ON THE FROZEN LAKE', quip: 'COLD OUTSIDE. ALSO COLD INSIDE.' }, hideIt('igloo', 'igloo', 0, 8.5)),
  // (The North Pole in the village and the fireworks when your mile is done are not behind doors any more: everybody has them.)
  sled: { name: 'THE TREE SLED', tag: 'TREE SLED', blurb: 'YOU TOW A CHRISTMAS TREE BEHIND YOU', quip: 'ONE TREE, COMING THROUGH!', start: (r) => { r.rider.sled = true; }, hold: (r) => { r.rider.sled = false; }, open: (r) => { r.rider.sled = true; } },
  sleigh: { name: "SANTA'S SLEIGH", tag: 'SLEIGH', blurb: 'KEEP AN EYE ON THE MOON', quip: 'HE IS DOING A PRACTICE LAP.', hold: (r) => { r.world.sky.noSleigh = true; }, open: (r, t, quiet) => { r.world.sky.noSleigh = false; if (!quiet) r.world.sky.sleighAt = r.t + 2; } },
  aurora: { name: 'NORTHERN LIGHTS', tag: 'AURORA', blurb: 'THEY GLOW AS YOUR SPIRIT FILLS', quip: 'SOMEBODY LEFT THE SKY ON.', hold: (r) => { r.world.sky.noAurora = true; }, open: (r, t, quiet) => { r.world.sky.noAurora = false; if (!quiet) r.session.spirit = 1; }, show: (r) => { if (r.env.night < 0.5) r.skyLock = 0.1; } },
  sunrise: { name: 'SUNRISE', tag: 'SUNRISE', blurb: 'FINISH YOUR MILE AND THE SUN COMES UP', quip: 'THE SUN WAS WAITING FOR YOU.', hold: (r) => { r.noSunrise = true; }, open: (r) => { r.noSunrise = false; }, show: (r) => { r.skyLock = r.skyLock === 0.86 ? null : 0.86; } },
  relative: { name: RELATIVE.title, tag: RELATIVE.name.slice(0, 12), blurb: RELATIVES.length > 1 ? 'THEY TAKE TURNS FLYING IN TO SAY HELLO' : `FLIES IN TO SAY "${RELATIVE_SAYS}"`, quip: RELATIVE_SAYS, hold: (r) => { r.noRelative = true; }, open: (r, t, quiet) => { r.noRelative = false; if (!quiet) r.relativeAt = r.t + 1.5; }, show: (r) => { r.relative = null; r.relativeAt = r.t; } },
  dropbear: { name: 'DROP BEAR', tag: 'DROP BEAR', blurb: 'NOW AND THEN ONE LANDS ON YOUR BACK', quip: "DON'T LOOK UP.", hold: (r) => { r.noBear = true; }, open: (r, t, quiet) => { r.noBear = false; if (!quiet) r.bearAt = r.t + 1.5; }, show: (r) => { r.bear = null; r.bearAt = r.t; } },
  // The two who turn up beside you to cheer you on (visitor.js; the ride calls them fans and has one at a time).
  sexysanta: Object.assign({ name: 'SEXY SANTA', tag: 'SEXY SANTA', blurb: 'BELLY DANCES IN TO CHEER YOU ON', quip: SANTA_SAYS }, fan('santa')),
  edward: Object.assign({ name: 'EDWARD', tag: 'EDWARD', blurb: 'BROODS. SPARKLES. CHEERS YOU ON', quip: EDWARD_SAYS }, fan('edward')),
  discosnow: { name: 'DISCO SNOW', tag: 'DISCO SNOW', blurb: 'NOW AND THEN THE SNOW GOES RAINBOW', quip: 'THE FOREST HAS A DJ NOW.', hold: (r) => { r.noDisco = true; }, open: (r, t, quiet) => { r.noDisco = false; if (!quiet) r.discoAt = r.t + 1; }, show: (r) => { r.discoLeft = 0; r.discoAt = r.t; } },
};
// (How the relative who flies in is drawn, and how they fly, is in relative.js. Sexy Santa is in santa.js, Edward in edward.js.)
export { RELATIVE, SANTA, EDWARD };

// YOUR OWN WORDS FOR THINGS (`things` in family.js): a name, a line, what its door says.
for (const [id, words] of Object.entries(FAMILY.things || {})) {
  const t = REWARDS[id] || SIGHTS[id];
  if (t && words) for (const k of ['name', 'tag', 'blurb', 'say', 'quip', 'speak']) if (typeof words[k] === 'string') t[k] = words[k];
}

// ---------------------------------------------------------------------------
// THINGS YOU EARN. Not behind a door. `progress` is worked out from the ride log
// (season: camp.js; extra: trail miles done on the outing still under way). It is yours
// while have >= need, and gone again when it is not.
// ---------------------------------------------------------------------------
export const EARNED = {
  sprinklepoop: {
    name: 'SPRINKLE POWER POOP', blurb: 'EVERY POOP BREAK SPARKLES AND PAYS OUT',
    how: 'DO YOUR MILE THREE DAYS IN A ROW',
    progress: (season, id, extra) => ({ have: Math.min(3, season.mileStreak(id, extra)), need: 3, unit: 'DAYS IN A ROW' }),
    tag: 'SPRINKLE',
    start: (r) => { r.sprinkle = true; },
    show: (r) => r.poopNow(),
  },
};
/** Where somebody stands with each thing that is earned: [{ id, name, blurb, how, have, need, unit, on }]. */
export function earnedFor(season, id, extra = 0) {
  return Object.keys(EARNED).map((key) => {
    const e = EARNED[key], p = e.progress(season, id, extra);
    return Object.assign({ id: key, name: e.name, blurb: e.blurb, how: e.how, on: p.have >= p.need }, p);
  });
}

// ---------------------------------------------------------------------------
const isDog = (p) => !!(p.look && p.look.species === 'dog');
const dogsOf = (profiles) => (profiles || []).filter(isDog);
/** 'dog:0' (your first dog) or 'dog:<its id>' -> that dog's profile. */
function dogOf(id, profiles) {
  const key = id.slice(4), dogs = dogsOf(profiles);
  return dogs.find((d) => d.id === key) || (/^\d+$/.test(key) ? dogs[Number(key)] : null) || null;
}
/** The gift id that brings a dog: 'dog:' and its id. */
export const dogGift = (profile) => 'dog:' + profile.id;
/** People who arrive part-way through, grouped by the day they come, earliest first: [[profile, ...], ...]. */
function arrivals(profiles) {
  const days = new Map();
  for (const p of profiles || []) if (p.arrives && !p.guest && !isDog(p)) days.set(p.arrives, (days.get(p.arrives) || []).concat(p));
  const md = (d) => d.split('-').slice(-2).map((n) => n.padStart(2, '0')).join('-');
  return [...days.keys()].sort((a, b) => (md(a) < md(b) ? -1 : 1)).map((d) => days.get(d));
}
/** 'join:0' (the first to arrive) or 'join:<id>+<id>' -> those people's profiles: family who arrive part-way through the season. */
function joinersOf(id, profiles) {
  const key = id.slice(5);
  if (/^\d+$/.test(key)) return arrivals(profiles)[Number(key)] || [];
  return key.split('+').map((k) => (profiles || []).find((p) => p.id === k)).filter(Boolean);
}
/** One spelling for the gift that brings these people: 'join:' and their ids. */
const joinGift = (people) => 'join:' + people.map((p) => p.id).join('+');
/** The door gift that brings this person (a 'join:...' on the calendar that includes them), or null. */
export function joinGiftOf(profile, profiles) {
  const id = doorList().flatMap(listAt).find((g) => g.startsWith('join:') && joinersOf(g, profiles).includes(profile));
  return id ? canon(id, profiles) : null;
}

const listAt = (entry) => (Array.isArray(entry) ? entry : [entry]);
/** The calendar, first door first (the studio's version if there is one). An entry is one thing's id, or a list of them. */
export function doorList() {
  return Array.isArray(TWEAKS.doors) && TWEAKS.doors.length ? TWEAKS.doors : DOOR_GIFTS;
}
/** Everything that is behind a door, and so stays out of the game until that door opens. */
export function gatedGifts(profiles) {
  const out = new Set();
  for (const entry of doorList()) for (const id of listAt(entry)) out.add(canon(id, profiles));
  return out;
}
/** One spelling for each gift ('dog:0' and 'dog:<that dog's id>' are the same thing; so are 'join:0' and 'join:<their ids>'). */
function canon(id, profiles) {
  if (id.startsWith('dog:')) { const d = dogOf(id, profiles); return d ? dogGift(d) : id; }
  if (id.startsWith('join:')) { const who = joinersOf(id, profiles); return who.length ? joinGift(who) : id; }
  return id;
}

/**
 * Every advent thing there is: [{ id, set, name, blurb, ... }]. The studio's pickers use
 * it, and a ride walks it to bring each thing in or hold it out.
 * profile: whose ride or door it is (a dog does not visit itself).
 */
export function allGifts(profiles, profile) {
  const ids = Object.keys(REWARDS).filter((id) => REWARDS[id].advent);
  dogsOf(profiles).forEach((d) => ids.push(dogGift(d)));
  // people who arrive part-way through: one door for everybody arriving on the same day
  for (const who of arrivals(profiles)) ids.push(joinGift(who));
  ids.push(...Object.keys(SIGHTS));
  // (songs are not here: every song is in the songbook from the start. A 'tune:...' id on
  //  a door still works, if anybody ever wants one behind a door again.)
  ids.push('home');
  return ids.map((id) => giftInfo(id, profiles, profile));
}

/** { id, set, name, blurb } (and its hooks, if it has its own) for a gift id. */
export function giftInfo(id, profiles, profile) {
  if (REWARDS[id]) return Object.assign({ id }, REWARDS[id]);
  if (SIGHTS[id]) return Object.assign({ id, set: 'sight' }, SIGHTS[id]);
  if (id === 'home') return { id, set: 'home', name: 'HOME FOR CHRISTMAS', blurb: 'EVERYTHING COMES ALONG TODAY', quip: 'YOU MADE IT. EVERYBODY IN!' };
  if (id.startsWith('tune:')) {
    const song = CAROLS.find((s) => songSlug(s.title) === id.slice(5));
    if (song) return { id, set: 'tune', name: song.title, blurb: song.original ? 'A BRAND NEW TUNE IN YOUR SONGBOOK' : 'A CAROL FOR YOUR SONGBOOK', slug: id.slice(5), original: !!song.original };
  }
  if (id.startsWith('dog:')) {
    const dog = dogOf(id, profiles);
    if (dog) {
      if (profile && profile.id === dog.id) return { id: dogGift(dog), set: 'dog', name: 'A DAY OFF', blurb: 'NOBODY TO KEEP UP WITH BUT YOU', dog, self: true };
      return { id: dogGift(dog), set: 'dog', name: dog.name, tag: dog.name.slice(0, 10), blurb: dog.story ? `${dog.story}. NOW ON YOUR RIDES` : 'COMES ALONG ON YOUR RIDES', quip: dog.quip || 'WOOF!', dog };
    }
  }
  if (id.startsWith('join:')) {
    const who = joinersOf(id, profiles);
    if (who.length) {
      id = joinGift(who);
      if (profile && who.includes(profile)) return { id, set: 'join', name: 'YOU MADE IT!', blurb: 'WELCOME TO THE TRAIL', quip: 'ABOUT TIME!', people: who, self: true };
      const names = who.map((p) => p.name);
      const name = names.length > 1 ? `${names.slice(0, -1).join(', ')} AND ${names[names.length - 1]}` : names[0];
      return { id, set: 'join', name, blurb: `${who.length > 1 ? 'THEY ARE' : name + ' IS'} HERE! RIDING FROM TOMORROW`, quip: 'SAVE THEM SOME COOKIES.', people: who };
    }
  }
  if (id.startsWith('dog:') || id.startsWith('join:')) return { id, set: 'none', name: 'AN EMPTY DOOR', blurb: 'A FAMILY MEETING FILLS THIS ONE', quip: 'WHO LIVES HERE? ...EXACTLY.' };
  return { id, set: 'none', name: 'A QUIET DAY', blurb: 'NOTHING BEHIND THIS ONE' };
}

/** Everything behind door n (1-based) of a calendar with `total` doors: the one pictured first. */
export function giftsAt(n, total, profiles) {
  if (n >= total) return ['home'];
  const list = doorList();
  return n >= 1 && n <= list.length ? listAt(list[n - 1]).map((id) => canon(id, profiles)) : ['none'];
}
/** The thing pictured on door n. */
export function giftAt(n, total, profiles) { return giftsAt(n, total, profiles)[0]; }

// --- pictures ----------------------------------------------------------------
const icons = new Map();
function box(maxW, maxH, draw) {
  const c = makeCanvas(maxW, maxH), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g, maxW, maxH);
  return c;
}
function spriteIcon(type, v, maxW, maxH) {
  const d = DEFS[type];
  return uiSprite(type, v, Math.max(2, Math.floor(Math.min(maxW / d.uw, maxH / d.uh))));
}
/** The classic three-tier swirl. sprinkles: the sparkling kind. */
function swirl(g, w, h, sprinkles) {
  const u = Math.max(1, Math.floor(Math.min(w / 11, h / 10))), x0 = Math.floor((w - 11 * u) / 2), y0 = Math.floor((h - 10 * u) / 2);
  const r = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x0 + x * u, y0 + y * u, ww * u, hh * u); };
  r(1, 7, 9, 3, '#5a3a26'); r(0, 8, 11, 2, '#5a3a26'); r(2, 4, 7, 3, '#6b4630'); r(4, 2, 4, 2, '#7a5238'); r(5, 1, 2, 1, '#7a5238');
  r(2, 8, 3, 1, '#7a5238'); r(3, 5, 2, 1, '#86603f'); r(5, 2, 1, 1, '#9a7350');
  if (sprinkles) [[2, 7, '#ff5c8a'], [6, 8, '#5cd6ff'], [8, 7, '#fff23f'], [4, 5, '#7dff3f'], [7, 5, '#ff9a3f'], [5, 3, '#c77dff'], [1, 9, '#fff23f'], [9, 9, '#ff5c8a'], [0, 1, '#fff23f'], [10, 2, '#5cd6ff'], [1, 3, '#ff5c8a'], [9, 0, '#7dff3f']].forEach(([x, y, c]) => r(x, y, 1, 1, c));
  else { r(0, 2, 1, 2, '#c9d8ff'); r(1, 0, 1, 2, '#c9d8ff'); r(9, 1, 1, 2, '#c9d8ff'); r(10, 3, 1, 2, '#c9d8ff'); }
}
/** A little picture on a grid of 11 by 8 squares: cells are [x, y, w, h, colour]. */
function grid(g, w, h, cells) {
  const u = Math.max(1, Math.floor(Math.min(w / 11, h / 8))), x0 = Math.floor((w - 11 * u) / 2), y0 = Math.floor((h - 8 * u) / 2);
  for (const [x, y, ww, hh, c] of cells) { g.fillStyle = c; g.fillRect(x0 + x * u, y0 + y * u, ww * u, hh * u); }
}
const DRAWN = {
  // a snowball (a tool you have from the start; it is not behind any door)
  snowball: (g, w, h) => grid(g, w, h, [[3, 1, 5, 1, '#ffffff'], [2, 2, 7, 4, '#ffffff'], [3, 6, 5, 1, '#c9d8ff'], [2, 5, 7, 1, '#dfe8ff'], [7, 3, 2, 2, '#dfe8ff'], [4, 2, 2, 1, '#f4f8ff']]),
  // a volleyball, as it is in the ride (tools.js)
  volleyball: (g, w, h) => { const r = Math.max(3, Math.floor(Math.min(w, h) / 2) - 1), pic = ballPicture(r, 0.4); g.drawImage(pic, Math.floor((w - pic.width) / 2), Math.floor((h - pic.height) / 2)); },
  // a ray gun: silver barrel with two green coils, a red end, a grip
  lasergun: (g, w, h) => grid(g, w, h, [[3, 2, 7, 2, '#c9d2e8'], [3, 4, 7, 1, '#8f9bb8'], [0, 2, 3, 3, '#8f9bb8'], [1, 5, 2, 3, '#5a6482'], [3, 5, 1, 1, '#5a6482'],
    [5, 1, 1, 4, '#3fe6a0'], [7, 1, 1, 4, '#3fe6a0'], [10, 2, 1, 2, '#ff3b3b'], [1, 1, 1, 1, '#5a6482'], [9, 3, 1, 1, '#ffffff']]),
  // a pointing finger with a grubby nail, and what is coming off it
  finger: (g, w, h) => grid(g, w, h, [[0, 4, 9, 3, '#e8be9c'], [0, 6, 9, 1, '#b98f70'], [9, 4, 2, 3, '#e8be9c'], [9, 4, 2, 1, '#f3e3cf'], [9, 3, 2, 1, '#6b5a1e'],
    [3, 4, 1, 3, '#cfa482'], [6, 4, 1, 3, '#cfa482'], [9, 0, 1, 2, '#a4d93c'], [7, 1, 1, 2, '#a4d93c'], [10, 1, 1, 1, '#a4d93c'], [8, 0, 1, 1, '#a4d93c']]),
  poop: (g, w, h) => swirl(g, w, h, false),
  sprinklepoop: (g, w, h) => swirl(g, w, h, true),
  sleigh(g, w, h) {
    // the moon, and a little sleigh crossing it
    const r = Math.floor(Math.min(w, h) * 0.42), cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    g.fillStyle = '#e9f0ff';
    for (let y = -r; y <= r; y++) { const half = Math.floor(Math.sqrt(r * r - y * y)); g.fillRect(cx - half, cy + y, half * 2, 1); }
    g.fillStyle = '#c3cfee'; g.fillRect(cx - Math.floor(r / 2), cy - Math.floor(r / 3), Math.max(1, r >> 2), Math.max(1, r >> 2)); g.fillRect(cx + Math.floor(r / 4), cy + Math.floor(r / 4), Math.max(1, r >> 2), Math.max(1, r >> 3));
    const u = Math.max(1, Math.floor(w / 22)), y = cy - u;
    g.fillStyle = '#10182e';
    g.fillRect(cx - 8 * u, y, 5 * u, 2 * u); g.fillRect(cx - 9 * u, y - u, 2 * u, 2 * u); g.fillRect(cx - 8 * u, y + 2 * u, 6 * u, u);   // sleigh
    for (let k = 0; k < 3; k++) { g.fillRect(cx - u + k * 3 * u, y + u - k * Math.max(1, u >> 1), 2 * u, u); g.fillRect(cx + u + k * 3 * u, y - k * Math.max(1, u >> 1), u, u); }
    g.fillStyle = '#ff4a4a'; g.fillRect(cx + 8 * u, y - u, u, u);
  },
  aurora(g, w, h) {
    const cols = ['#3fe6a0', '#58f0c8', '#7ad0ff', '#a98bff'];
    for (let x = 0; x < w; x++) {
      const top = Math.floor(h * (0.18 + 0.14 * Math.sin(x * 0.45) + 0.08 * Math.sin(x * 0.17 + 1)));
      const len = Math.floor(h * (0.5 + 0.2 * Math.sin(x * 0.3 + 2)));
      for (let y = 0; y < len; y++) {
        g.globalAlpha = (1 - y / len) * (x % 2 ? 0.9 : 0.6);
        g.fillStyle = cols[(Math.floor(x / Math.max(2, w / 8)) + (y > len / 2 ? 1 : 0)) % cols.length];
        g.fillRect(x, top + y, 1, 1);
      }
    }
    g.globalAlpha = 1;
  },
  sunrise(g, w, h) {
    const hy = Math.floor(h * 0.7), r = Math.floor(Math.min(w * 0.3, h * 0.45)), cx = Math.floor(w / 2);
    g.fillStyle = '#ffb347';
    for (let k = 0; k < 7; k++) { const a = Math.PI * (k + 0.5) / 7, x = cx + Math.cos(a) * (r + 3), y = hy - Math.sin(a) * (r + 3); g.fillRect(Math.round(x), Math.round(y), Math.max(1, w >> 4), Math.max(1, w >> 4)); }
    g.fillStyle = '#ffe27a';
    for (let y = 0; y <= r; y++) { const half = Math.floor(Math.sqrt(r * r - y * y)); g.fillRect(cx - half, hy - y, half * 2, 1); }
    g.fillStyle = '#fff6c8'; for (let y = 0; y <= r >> 1; y++) { const rr = r >> 1, half = Math.floor(Math.sqrt(rr * rr - y * y)); g.fillRect(cx - half, hy - y, half * 2, 1); }
    g.fillStyle = '#dfe9ff'; g.fillRect(0, hy + 1, w, Math.max(1, h - hy - 1));
    g.fillStyle = '#9fb6ee'; g.fillRect(0, hy + 1, w, 1);
  },
  flurry(g, w, h) {
    const scale = Math.max(1, Math.floor(Math.min(w / 7, h / 8)));
    drawText(g, '❄', Math.floor((w - 7 * scale) / 2), Math.floor((h - 8 * scale) / 2), { scale, color: '#dff0ff', shadow: null });
  },
  discosnow(g, w, h) {
    // snowflakes in every colour
    const u = Math.max(1, Math.floor(Math.min(w, h) / 12));
    [[2, 1, '#ff5c8a'], [8, 2, '#5cd6ff'], [5, 5, '#fff23f'], [1, 7, '#7dff3f'], [9, 8, '#c77dff'], [4, 10, '#ff9a3f'], [10, 5, '#ff5c8a'], [6, 0, '#7dff3f']].forEach(([x, y, c]) => {
      g.fillStyle = c;
      g.fillRect(x * u, (y + 1) * u, 3 * u, u); g.fillRect((x + 1) * u, y * u, u, 3 * u);
    });
  },
  fireworks(g, w, h) {
    const cx = Math.floor(w / 2), cy = Math.floor(h * 0.42), r = Math.floor(Math.min(w, h) * 0.42), u = Math.max(1, Math.floor(r / 6));
    const cols = ['#ff5c8a', '#fff23f', '#5cd6ff', '#7dff3f', '#ff9a3f', '#c77dff'];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      for (let d = 2; d <= 6; d++) { g.fillStyle = cols[(k + d) % cols.length]; g.globalAlpha = d < 4 ? 0.55 : 1; g.fillRect(Math.round(cx + Math.cos(a) * d * u), Math.round(cy + Math.sin(a) * d * u), u, u); }
    }
    g.globalAlpha = 1;
    g.fillStyle = '#fff6c8'; g.fillRect(cx - u, cy - u, u * 2, u * 2);
    g.fillStyle = '#c9a27a'; g.fillRect(cx, cy + r, 1, h - cy - r);            // the trail it left going up
  },
  sexysanta(g, w, h) {
    // all of him, mid-dance, when there is room; just his face when there is not
    if (Math.min(w, h) < 40) { const s = Math.min(w, h); drawPortrait(g, SANTA, Math.floor((w - s) / 2), Math.floor((h - s) / 2), s); return; }
    const k = santaSprite(Math.max(8, Math.floor(Math.min(w / 1.6, h / 2.0))), 3);
    g.drawImage(k.canvas, Math.floor((w - k.canvas.width) / 2), h - k.canvas.height);
  },
  edward(g, w, h) {
    if (Math.min(w, h) < 40) { const s = Math.min(w, h); drawPortrait(g, EDWARD, Math.floor((w - s) / 2), Math.floor((h - s) / 2), s); return; }
    const k = edwardSprite(Math.max(8, Math.floor(Math.min(w / 1.9, h / 2.3))), 'flex', 1, 1);
    g.drawImage(k.canvas, Math.floor((w - k.canvas.width) / 2), h - k.canvas.height);
  },
  relative(g, w, h) {
    // a friendly glow with their face in it
    const s = Math.floor(Math.min(w, h) * 0.84), top = Math.min(w, h) - s;
    g.globalAlpha = 0.3; g.fillStyle = '#bfe0ff'; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.92;
    drawPortrait(g, RELATIVE, Math.floor((w - s) / 2), Math.floor((h - Math.min(w, h)) / 2) + top, s);
    g.globalAlpha = 1;
  },
};

/** A picture of a gift (or of something earned) that fits inside maxW x maxH pixels. */
export function giftIcon(id, maxW, maxH, profiles) {
  if (ART[id]) return rewardIcon(id, maxW, maxH);
  const key = id + '|' + maxW + '|' + maxH;
  let c = icons.get(key);
  if (c) return c;
  if (id === 'snowball') { c = box(maxW, maxH, DRAWN.snowball); icons.set(key, c); return c; }   // (not a gift: it has no entry in the catalog)
  const info = giftInfo(id, profiles);
  if (info.set === 'dog') c = portrait(info.dog, Math.min(maxW, maxH));
  else if (info.set === 'join') {
    // the faces of whoever is arriving, side by side
    const n = info.people.length, size = Math.max(8, Math.min(maxH, Math.floor(maxW / Math.max(1, n * 0.72 + 0.28))));
    const step = Math.round(size * 0.72), w = step * (n - 1) + size;
    c = box(w, size, (g) => info.people.forEach((p, i) => g.drawImage(portrait(p, size), i * step, 0)));
  } else if (info.set === 'home') c = spriteIcon('cabin', 0, maxW, maxH);
  else if (id === 'deer' || id === 'rudolph') c = spriteIcon('deer', id === 'rudolph' ? 1 : 0, maxW, maxH);
  else if (id === 'yeti' || id === 'igloo' || id === 'northpole') c = spriteIcon(id, 0, maxW, maxH);
  else if (DRAWN[id]) c = box(maxW, maxH, DRAWN[id]);
  else {
    const scale = Math.max(1, Math.floor(Math.min(maxW / 7, maxH / 8)));
    c = makeCanvas(7 * scale, 8 * scale);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    drawText(g, info.set === 'tune' ? '♪' : '•', 0, 0, { scale, color: info.set === 'tune' ? (info.original ? '#ffd76a' : '#ff9fb0') : '#dff0ff', shadow: null });
  }
  icons.set(key, c);
  return c;
}
