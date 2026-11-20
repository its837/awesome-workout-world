// Mile rewards: every so often the ride offers a few things and you tap one. These are
// the EXTRAS: cookies refill your spirit, sparkle dresses you up. They are in the game
// from day one.
//
// The trail buddies and the feasts are listed here too, because their art lives in this
// file, but they are ADVENT THINGS (advent: true): each arrives through its door on the
// calendar (gifts.js). A buddy then comes and goes on your rides. A feast is eaten on the
// spot when its door opens, and after that it is in YOUR ITEMS on the left of a ride, to
// eat again every two minutes. (A food that is NOT behind a door is just a treat on the
// mile cards, like the cookies: set 'cookie'. Prime rib and the flat white are.)
// All the art is drawn by code, like everything else.
import { Pix, C, LIGHT_COLS } from './sprites.js';
import { MILK } from './milk.js';

export const REWARDS = {
  // tag: the short name on the TEST buttons. quip: what its advent door says when it opens.
  owl: { set: 'buddy', advent: true, name: 'SNOWY OWL', tag: 'OWL', blurb: 'SWOOPS IN AND OUT ON EVERY RIDE', quip: 'WHO? YOU.' },
  fox: { set: 'buddy', advent: true, name: 'RED FOX', tag: 'FOX', blurb: 'TROTS AT YOUR SIDE ON EVERY RIDE', quip: 'WHAT DOES THE FOX SAY? NOTHING. IT IS BUSY.' },
  penguin: { set: 'buddy', advent: true, name: 'PENGUIN', tag: 'PENGUIN', blurb: 'WADDLES TO KEEP UP ON EVERY RIDE', quip: 'ANYONE THIRSTY?' },
  cardinal: { set: 'buddy', advent: true, name: 'CARDINAL', tag: 'CARDINAL', blurb: 'FLITS ROUND YOUR HAT ON EVERY RIDE', quip: 'NICE HAT. MINE NOW.' },
  turkey: { set: 'buddy', advent: true, name: 'THE TURKEY', tag: 'TURKEY', blurb: 'STRUTS ALONG ON EVERY RIDE', quip: 'GOBBLE GOBBLE!', speak: 'Gobble gobble!' },
  kangaroo: { set: 'buddy', advent: true, name: 'KANGAROO', tag: 'KANGAROO', blurb: 'HOPS ALONG ON EVERY RIDE', quip: 'BOING. BOING. BOING.' },
  gingerbread: { set: 'cookie', name: 'GINGERBREAD', blurb: 'FILLS YOUR SPIRIT' },
  sugarstar: { set: 'cookie', name: 'SUGAR STAR', blurb: 'FILLS YOUR SPIRIT' },
  chocchip: { set: 'cookie', name: 'CHOC CHIP', blurb: 'FILLS YOUR SPIRIT' },
  // Two foods that used to be behind doors, and are plain mile treats now that Sexy Santa and Edward have those doors:
  primerib: { set: 'cookie', name: 'PRIME RIB', blurb: 'A WHOLE DINNER' },
  flatwhite: { set: 'cookie', name: 'FLAT WHITE', blurb: 'A PROPER COFFEE', say: 'SIP!' },
  lights: { set: 'bling', name: 'FAIRY LIGHTS', blurb: 'TWINKLE ALL OVER YOU' },
  antlers: { set: 'bling', name: 'ANTLERS', blurb: 'REINDEER MODE' },
  flag: { set: 'bling', name: 'CANDY FLAG', blurb: 'FLIES BEHIND YOU' },
  bells: { set: 'bling', name: 'JINGLE BELLS', blurb: 'JINGLE AS YOU GO' },
  // feasts: eaten like a cookie (say: the word that pops up with each bite)
  wormsoup: { set: 'feast', advent: true, name: 'HOT BOWL OF WORM SOUP', tag: 'WORM SOUP', blurb: 'PIPING HOT', say: 'SLURP!', quip: 'THEY WIGGLE ON THE WAY DOWN.' },
  dynamite: { set: 'feast', advent: true, name: 'DYNAMITE', tag: 'DYNAMITE', blurb: "(IT'S JUST A SLOPPY JOE)", quip: "RELAX. IT'S JUST A SLOPPY JOE." },
  avotoast: { set: 'feast', advent: true, name: 'FANCY AVO TOAST', tag: 'AVO TOAST', blurb: 'VERY FANCY', quip: 'THERE GOES THE HOUSE DEPOSIT.' },
  // Penguin milk comes out of the penguin: it shares the penguin's door, and its show (milk.js) fills the glass.
  // wait: how long after the door's thing has popped out this one is handed over (the glass has to be filled first).
  penguinmilk: { set: 'feast', advent: true, name: 'PENGUIN MILK', tag: 'PENGUIN MILK', blurb: 'FRESH FROM THE PENGUIN', say: 'GLUG!', quip: 'DO NOT ASK HOW.', wait: MILK.done },
  // A cake, the day before Christmas. If that is somebody's birthday in your house, give it their
  // name and their own words: `things` in family.js (gifts.js lays those over this catalog).
  cake: { set: 'feast', advent: true, name: 'CHRISTMAS EVE CAKE', tag: 'CAKE', blurb: 'ONE MORE SLEEP', say: 'YUM!', quip: 'SAVE ME A SLICE!', speak: 'Cake!' },
};
// Cookies and sparkle last for the ride you pick them on. (Advent things are kept for good.)
const SETS = [
  { key: 'cookie', title: 'PICK A TREAT' },
  { key: 'bling', title: 'SPARKLE FOR THIS RIDE' },
];

/**
 * The nth offer of a ride (0-based): a title and up to three reward ids. Sparkle you already
 * have is not offered again. treats: the feasts this rider has had out of the calendar (a
 * Set of ids); they join the cookies.
 */
export function offer(n, owned, treats) {
  for (let k = 0; k < SETS.length; k++) {
    const set = SETS[(n + k) % SETS.length];
    let ids = Object.keys(REWARDS).filter((id) => {
      const r = REWARDS[id];
      if (set.key === 'cookie') return r.set === 'cookie' || (r.set === 'feast' && !!treats && treats.has(id));
      return !r.advent && r.set === set.key && !owned.includes(id);
    });
    if (ids.length < 2) continue;
    ids = ids.sort(() => Math.random() - 0.5).slice(0, 3);
    return { title: set.title, options: ids };
  }
  return { title: SETS[0].title, options: ['gingerbread', 'sugarstar', 'chocchip'] };
}

const ORANGE = [234, 122, 52], ORANGE_D = [196, 94, 44], DARK = [64, 42, 40], BLACK = [38, 42, 60], BEAK = [244, 150, 50];
const RED1 = [222, 46, 50], RED2 = [160, 30, 44], COOKIE = [178, 112, 62], ANTLER = [176, 128, 82];

/** Art for each reward. Sizes in metres (buddies) or arbitrary units (icons); ph is an animation phase. */
export const ART = {
  owl: {
    uw: 2.0, uh: 1.3,
    // the picture on the reward card: facing you
    icon: {
      uw: 1.7, uh: 1.1,
      draw(p, ph) {
        const a = Math.sin(ph), cx = 0.85;
        for (const sd of [-1, 1]) {
          const tipY = 0.5 - 0.3 * a;
          p.poly([cx + sd * 0.12, 0.42, cx + sd * 0.5, 0.44 - 0.2 * a, cx + sd * 0.82, tipY, cx + sd * 0.74, tipY + 0.14, cx + sd * 0.45, 0.62 - 0.12 * a, cx + sd * 0.12, 0.68], sd < 0 ? C.furS : C.fur);
          p.rect(cx + sd * 0.76 - 0.05, tipY + 0.01, 0.1, 0.05, [90, 96, 118]);
          p.rect(cx + sd * 0.6 - 0.04, tipY + 0.1 + 0.07 * a, 0.08, 0.04, [120, 128, 150]);
        }
        p.poly([cx - 0.1, 0.84, cx + 0.1, 0.84, cx, 1.04], C.furS);
        p.ell(cx, 0.64, 0.2, 0.26, C.furS); p.ell(cx + 0.03, 0.62, 0.17, 0.23, C.fur);
        p.ell(cx, 0.36, 0.17, 0.15, C.fur);
        p.rect(cx - 0.07, 0.6, 0.04, 0.03, [130, 138, 160]); p.rect(cx + 0.05, 0.7, 0.04, 0.03, [130, 138, 160]); p.rect(cx - 0.02, 0.78, 0.04, 0.03, [130, 138, 160]);
        p.rect(cx - 0.11, 0.32, 0.07, 0.07, [250, 206, 60]); p.rect(cx + 0.04, 0.32, 0.07, 0.07, [250, 206, 60]);
        p.rect(cx - 0.09, 0.34, 0.03, 0.035, C.coal); p.rect(cx + 0.06, 0.34, 0.03, 0.035, C.coal);
        p.rect(cx - 0.015, 0.4, 0.035, 0.05, [70, 70, 84]);
      },
    },
    /**
     * On the trail: seen from behind, because it is flying the same way you are going.
     * o.bank (-1..1) tips the wings into a turn; o.look turns the head right round to face you.
     */
    draw(p, ph, o = {}) {
      const a = Math.sin(ph), cx = 1.0, bank = o.bank || 0;
      const BAR = [96, 102, 124], FLECK = [146, 156, 182];
      for (const sd of [-1, 1]) {
        const lift = -0.34 * a + sd * bank * 0.22;          // + is down the picture
        const tipY = 0.6 + lift, midY = 0.54 + lift * 0.55;
        const root = [cx + sd * 0.1, 0.84], mid = [cx + sd * 0.5, midY + 0.2], tip = [cx + sd * 0.86, tipY + 0.13];
        p.poly([cx + sd * 0.1, 0.56, cx + sd * 0.5, midY - 0.04, cx + sd * 0.93, tipY, tip[0], tip[1], mid[0], mid[1], root[0], root[1]], sd < 0 ? C.furS : C.fur);
        // dark bars on the flight feathers, following the trailing edge
        for (let k = 0; k < 4; k++) {
          const t = 0.24 + k * 0.21;
          const A = t < 0.5 ? root : mid, B = t < 0.5 ? mid : tip, u = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
          const wx = A[0] + (B[0] - A[0]) * u, wy = A[1] + (B[1] - A[1]) * u;
          p.rect(wx - 0.05, wy - 0.075, 0.1, 0.04, BAR);
          if (k % 2 === 0) p.rect(wx - 0.035, wy - 0.16, 0.07, 0.03, FLECK);
        }
      }
      // tail fan
      p.poly([cx - 0.09, 0.9, cx + 0.09, 0.9, cx + 0.2, 1.1, cx + 0.1, 1.17, cx, 1.2, cx - 0.1, 1.17, cx - 0.2, 1.1], C.furS);
      p.poly([cx, 0.9, cx + 0.09, 0.9, cx + 0.2, 1.1, cx + 0.1, 1.17, cx + 0.02, 1.19], C.fur);
      for (const fx of [-0.14, -0.05, 0.04, 0.13]) p.rect(cx + fx - 0.025, 1.1 + 0.04 * (1 - Math.abs(fx) * 6), 0.05, 0.035, BAR);
      p.rect(cx - 0.07, 0.99, 0.045, 0.03, FLECK); p.rect(cx + 0.04, 1.02, 0.045, 0.03, FLECK);
      // back and head
      p.ell(cx, 0.74, 0.2, 0.24, C.furS); p.ell(cx + 0.03, 0.72, 0.17, 0.21, C.fur);
      p.rect(cx - 0.09, 0.66, 0.045, 0.03, FLECK); p.rect(cx + 0.05, 0.7, 0.045, 0.03, FLECK); p.rect(cx - 0.03, 0.78, 0.045, 0.03, FLECK); p.rect(cx + 0.07, 0.84, 0.045, 0.03, FLECK); p.rect(cx - 0.1, 0.86, 0.045, 0.03, FLECK);
      p.ell(cx, 0.46, 0.17, 0.15, C.fur);
      if (o.look) {
        p.rect(cx - 0.11, 0.42, 0.07, 0.07, [250, 206, 60]); p.rect(cx + 0.04, 0.42, 0.07, 0.07, [250, 206, 60]);
        p.rect(cx - 0.09, 0.44, 0.03, 0.035, C.coal); p.rect(cx + 0.06, 0.44, 0.03, 0.035, C.coal);
        p.rect(cx - 0.015, 0.5, 0.035, 0.05, [70, 70, 84]);
      } else {
        p.rect(cx - 0.07, 0.38, 0.04, 0.03, FLECK); p.rect(cx + 0.04, 0.41, 0.04, 0.03, FLECK); p.rect(cx - 0.01, 0.48, 0.04, 0.03, FLECK);
      }
    },
  },
  fox: {
    uw: 1.1, uh: 1.0,
    draw(p, ph) {
      const cx = 0.55, s = Math.sin(ph);
      p.rect(cx - 0.17, 0.72 - 0.06 * Math.max(0, s), 0.09, 0.26, DARK);
      p.rect(cx + 0.08, 0.72 - 0.06 * Math.max(0, -s), 0.09, 0.26, DARK);
      p.ell(cx, 0.62, 0.22, 0.2, ORANGE); p.ell(cx + 0.07, 0.66, 0.13, 0.14, ORANGE_D);
      p.ell(cx, 0.36, 0.16, 0.13, ORANGE);
      p.poly([cx - 0.16, 0.3, cx - 0.12, 0.1, cx - 0.03, 0.27], ORANGE); p.poly([cx + 0.16, 0.3, cx + 0.12, 0.1, cx + 0.03, 0.27], ORANGE_D);
      p.poly([cx - 0.14, 0.18, cx - 0.12, 0.1, cx - 0.09, 0.18], DARK); p.poly([cx + 0.14, 0.18, cx + 0.12, 0.1, cx + 0.09, 0.18], DARK);
      const tx = cx + 0.27 * s;
      p.line(cx, 0.72, tx, 0.42, 0.2, ORANGE);
      p.ell(tx, 0.32, 0.11, 0.12, C.white);
    },
  },
  penguin: {
    uw: 0.9, uh: 1.0,
    // the picture on the reward card
    icon: {
      uw: 0.9, uh: 1.0,
      draw(p, ph) {
        const s = Math.sin(ph), cx = 0.45 + 0.03 * s;
        p.rect(cx - 0.17, 0.92 - 0.04 * Math.max(0, s), 0.13, 0.07, BEAK);
        p.rect(cx + 0.04, 0.92 - 0.04 * Math.max(0, -s), 0.13, 0.07, BEAK);
        p.ell(cx - 0.26, 0.58 + 0.03 * s, 0.06, 0.2, BLACK); p.ell(cx + 0.26, 0.58 - 0.03 * s, 0.06, 0.2, BLACK);
        p.ell(cx, 0.6, 0.24, 0.34, BLACK);
        p.ell(cx + 0.13, 0.64, 0.1, 0.25, C.white);
        p.ell(cx, 0.24, 0.16, 0.15, BLACK);
        p.ell(cx + 0.09, 0.27, 0.06, 0.07, C.white);
        p.rect(cx + 0.08, 0.23, 0.03, 0.03, C.coal);
        p.poly([cx + 0.14, 0.24, cx + 0.28, 0.28, cx + 0.14, 0.31], BEAK);
        p.rect(cx - 0.17, 0.37, 0.34, 0.06, [70, 190, 120]); p.rect(cx - 0.2, 0.4, 0.07, 0.16, [50, 150, 96]);
      },
    },
    /** On the trail: waddling away from us, so we see its back. */
    draw(p, ph) {
      const s = Math.sin(ph), cx = 0.45 + 0.035 * s, tilt = 0.03 * s;
      p.rect(cx - 0.17, 0.92 - 0.045 * Math.max(0, s), 0.13, 0.07, BEAK);
      p.rect(cx + 0.04, 0.92 - 0.045 * Math.max(0, -s), 0.13, 0.07, BEAK);
      // a sliver of white belly shows either side of the black back
      p.ell(cx, 0.61, 0.25, 0.33, C.white);
      p.ell(cx, 0.6, 0.21, 0.34, BLACK);
      p.ell(cx - 0.27, 0.56 + 0.04 * s, 0.055, 0.2, BLACK); p.ell(cx + 0.27, 0.56 - 0.04 * s, 0.055, 0.2, BLACK);
      p.poly([cx - 0.06, 0.9, cx + 0.06, 0.9, cx, 0.98], BLACK);
      p.ell(cx + tilt, 0.24, 0.16, 0.15, BLACK);
      p.rect(cx - 0.17 + tilt, 0.37, 0.34, 0.06, [70, 190, 120]);
      p.line(cx + 0.1 + tilt, 0.4, cx + 0.2 + 0.04 * s, 0.6, 0.07, [50, 150, 96]);
    },
  },
  cardinal: {
    uw: 0.7, uh: 0.6,
    draw(p, ph) {
      const a = Math.sin(ph);
      p.poly([0.1, 0.34, 0.24, 0.3, 0.24, 0.4, 0.04, 0.46], RED2);
      p.ell(0.36, 0.36, 0.17, 0.11, RED1);
      p.ell(0.52, 0.27, 0.09, 0.085, RED1);
      p.poly([0.46, 0.2, 0.5, 0.05, 0.57, 0.2], RED1);
      p.rect(0.55, 0.26, 0.06, 0.055, C.coal);
      p.poly([0.6, 0.25, 0.7, 0.3, 0.6, 0.33], BEAK);
      p.poly([0.26, 0.34, 0.46, 0.34, 0.34, 0.32 - 0.25 * a], RED2);
    },
  },
  turkey: {
    uw: 1.1, uh: 1.2,
    /** Strutting away from us, so we see the back of the fan; the head pokes over the top and looks round. */
    draw(p, ph) {
      const s = Math.sin(ph), cx = 0.55, bob = 0.035 * Math.sin(ph * 2);
      const DK = [96, 58, 36], MID = [168, 100, 48], HOT = [228, 150, 60], TIP = [246, 228, 196];
      for (const sd of [-1, 1]) {
        const up = 0.06 * Math.max(0, sd * s);
        p.rect(cx + sd * 0.12 - 0.025, 0.98 - up, 0.05, 0.18, BEAK);
        p.rect(cx + sd * 0.12 - 0.07, 1.14 - up, 0.14, 0.045, BEAK);
      }
      // the fan, rings from the outside in
      p.ell(cx, 0.68, 0.5, 0.44, DK); p.ell(cx, 0.69, 0.45, 0.39, TIP); p.ell(cx, 0.71, 0.4, 0.35, MID); p.ell(cx, 0.73, 0.33, 0.29, HOT); p.ell(cx, 0.76, 0.26, 0.23, DK);
      for (let k = -3; k <= 3; k++) p.line(cx, 0.82, cx + Math.sin(k * 0.4) * 0.45, 0.82 - Math.cos(k * 0.4) * 0.52, 0.022, [78, 46, 30]);
      // its back
      p.ell(cx, 0.86, 0.2, 0.18, [70, 44, 34]); p.ell(cx + 0.04, 0.84, 0.13, 0.12, [92, 60, 44]);
      // neck and head, over the top of the fan
      p.rect(cx - 0.035, 0.14 + bob, 0.07, 0.22, [150, 168, 198]);
      p.ell(cx, 0.12 + bob, 0.08, 0.075, [176, 194, 220]);
      p.rect(cx - 0.055, 0.1 + bob, 0.03, 0.03, C.coal); p.rect(cx + 0.03, 0.1 + bob, 0.03, 0.03, C.coal);
      p.poly([cx - 0.03, 0.13 + bob, cx + 0.03, 0.13 + bob, cx, 0.2 + bob], BEAK);
      p.rect(cx + 0.02, 0.17 + bob, 0.04, 0.1, C.red);                    // the wattle
    },
  },
  kangaroo: {
    uw: 1.0, uh: 1.5,
    /** Hopping away from us. The legs tuck as it leaves the ground. */
    draw(p, ph) {
      const s = Math.sin(ph), cx = 0.5, tuck = 0.07 * Math.max(0, s);
      const TAN = [198, 142, 94], TAN_D = [160, 108, 70], TAN_L = [232, 186, 140];
      p.line(cx, 1.04, cx + 0.05 * s, 1.44 - tuck * 0.5, 0.13, TAN_D);         // that tail
      p.rect(cx - 0.32, 1.4 - tuck, 0.22, 0.08, TAN_D); p.rect(cx + 0.1, 1.4 - tuck, 0.22, 0.08, TAN_D);   // big feet
      p.ell(cx - 0.18, 1.16 - tuck, 0.14, 0.21, TAN); p.ell(cx + 0.18, 1.16 - tuck, 0.14, 0.21, TAN_D);
      p.ell(cx, 0.9, 0.24, 0.36, TAN); p.ell(cx + 0.07, 0.93, 0.14, 0.27, TAN_D);
      p.ell(cx, 0.56, 0.17, 0.18, TAN);
      p.ell(cx, 0.33, 0.13, 0.13, TAN);
      p.ell(cx - 0.11, 0.14, 0.055, 0.14, TAN); p.ell(cx + 0.11, 0.14, 0.055, 0.14, TAN_D);
      p.ell(cx - 0.11, 0.15, 0.025, 0.09, TAN_L);
    },
  },
  dropbear: {
    // a koala, holding on
    uw: 0.8, uh: 0.8,
    draw(p, ph) {
      const GREY = [152, 158, 172], GREY_D = [112, 118, 134], GREY_L = [210, 214, 226];
      const w = 0.02 * Math.sin(ph);                                       // the ears twitch
      p.ell(0.13, 0.52, 0.1, 0.07, GREY_D); p.ell(0.67, 0.52, 0.1, 0.07, GREY_D);   // arms, hugging
      p.ell(0.4, 0.58, 0.22, 0.2, GREY); p.ell(0.4, 0.62, 0.13, 0.13, GREY_L);
      p.ell(0.26, 0.74, 0.07, 0.05, GREY_D); p.ell(0.54, 0.74, 0.07, 0.05, GREY_D);
      p.ell(0.2, 0.2 + w, 0.13, 0.13, GREY_D); p.ell(0.6, 0.2 - w, 0.13, 0.13, GREY_D);
      p.ell(0.2, 0.21 + w, 0.07, 0.07, GREY_L); p.ell(0.6, 0.21 - w, 0.07, 0.07, GREY_L);
      p.ell(0.4, 0.32, 0.2, 0.17, GREY);
      p.rect(0.3, 0.27, 0.04, 0.04, C.coal); p.rect(0.46, 0.27, 0.04, 0.04, C.coal);
      p.ell(0.4, 0.36, 0.05, 0.07, [40, 40, 52]);                          // that nose
    },
  },
  cake: {
    uw: 0.7, uh: 0.62,
    draw(p) {
      const ICE = [250, 244, 236], SPONGE = [232, 176, 110], PINK = [240, 130, 160];
      p.ell(0.35, 0.565, 0.33, 0.05, [200, 210, 230]);                  // the plate
      p.rect(0.1, 0.3, 0.5, 0.24, SPONGE); p.ell(0.35, 0.54, 0.25, 0.04, SPONGE);
      p.rect(0.1, 0.42, 0.5, 0.035, [196, 70, 90]);                     // the jam in the middle
      p.ell(0.35, 0.3, 0.25, 0.06, ICE); p.rect(0.1, 0.3, 0.5, 0.05, ICE);
      [[0.13, 0.07], [0.25, 0.04], [0.4, 0.08], [0.52, 0.05]].forEach(([x, len]) => p.rect(x, 0.34, 0.05, len, ICE));   // icing running down
      [[0.2, 0], [0.3, 1], [0.4, 2], [0.5, 0]].forEach(([x, k]) => {
        p.rect(x - 0.012, 0.16, 0.028, 0.13, [[120, 190, 255], [255, 214, 90], PINK][k]);
        p.unlit = true; p.ell(x, 0.12, 0.03, 0.045, [255, 180, 60]); p.rect(x - 0.008, 0.105, 0.02, 0.03, [255, 246, 196]); p.unlit = false;
      });
    },
  },
  // A sled with a Christmas tree on it, seen from behind: the tree lies with its trunk towards you.
  sled: {
    uw: 1.1, uh: 0.8,
    draw(p) {
      const G1 = [28, 104, 62], G2 = [44, 140, 84], G3 = [20, 76, 48], WOOD = [150, 100, 60], RED = [190, 44, 52], REDD = [120, 28, 36];
      p.rect(0.2, 0.66, 0.08, 0.1, RED); p.rect(0.82, 0.66, 0.08, 0.1, RED);              // the runners
      p.rect(0.16, 0.75, 0.16, 0.035, REDD); p.rect(0.78, 0.75, 0.16, 0.035, REDD);
      p.rect(0.18, 0.58, 0.74, 0.09, WOOD); p.rect(0.18, 0.58, 0.74, 0.025, [186, 132, 84]);
      p.ell(0.55, 0.36, 0.5, 0.3, G3);                                                    // the tree: a big round bush of branches
      p.ell(0.55, 0.33, 0.43, 0.26, G1);
      p.ell(0.5, 0.29, 0.3, 0.17, G2);
      for (const [x, y] of [[0.14, 0.42], [0.3, 0.16], [0.74, 0.16], [0.92, 0.42], [0.52, 0.08]]) p.rect(x, y, 0.07, 0.05, G3);
      p.rect(0.49, 0.36, 0.12, 0.17, [110, 72, 44]); p.ell(0.55, 0.36, 0.06, 0.035, [196, 150, 104]);   // the cut end of the trunk
      p.rect(0.1, 0.46, 0.9, 0.02, [226, 214, 180]);                                      // the rope holding it on
      p.unlit = true;                                                                     // somebody could not wait to put the lights on
      [[0.24, 0.3], [0.4, 0.2], [0.66, 0.22], [0.84, 0.32], [0.34, 0.4]].forEach(([x, y], i) => p.rect(x, y, 0.035, 0.035, LIGHT_COLS[i % 5]));
      p.unlit = false;
    },
  },
  wormsoup: {
    uw: 0.66, uh: 0.6,
    draw(p) {
      const BOWL = [226, 232, 244], WORM = [236, 130, 150];
      for (const [x, y, hgt] of [[0.22, 0.05, 0.09], [0.33, 0.01, 0.11], [0.44, 0.06, 0.08]]) p.rect(x, y, 0.03, hgt, [200, 214, 240]);   // steam
      p.poly([0.03, 0.33, 0.63, 0.33, 0.57, 0.48, 0.45, 0.55, 0.21, 0.55, 0.09, 0.48], BOWL);
      p.ell(0.33, 0.33, 0.3, 0.1, BOWL);
      p.ell(0.33, 0.33, 0.26, 0.075, [150, 96, 52]);                    // the broth
      p.ell(0.24, 0.31, 0.05, 0.02, [182, 124, 70]); p.rect(0.4, 0.34, 0.05, 0.02, [96, 140, 60]);
      p.line(0.16, 0.34, 0.26, 0.29, 0.035, WORM); p.line(0.26, 0.29, 0.33, 0.35, 0.035, WORM);
      p.line(0.4, 0.3, 0.5, 0.33, 0.035, WORM);
      p.line(0.52, 0.31, 0.61, 0.36, 0.035, WORM); p.line(0.61, 0.36, 0.6, 0.47, 0.035, WORM);   // one over the rim
      p.rect(0.59, 0.46, 0.035, 0.03, [214, 104, 126]);
      p.rect(0.21, 0.53, 0.24, 0.04, [196, 204, 224]);
    },
  },
  dynamite: {
    // it is a sloppy joe
    uw: 0.66, uh: 0.56,
    draw(p) {
      const BUN = [226, 172, 104], MEAT = [150, 62, 40];
      p.ell(0.33, 0.45, 0.28, 0.075, [206, 152, 90]);
      p.ell(0.33, 0.36, 0.31, 0.1, MEAT);
      p.rect(0.07, 0.36, 0.05, 0.11, [172, 72, 44]); p.rect(0.5, 0.38, 0.05, 0.1, [172, 72, 44]); p.rect(0.3, 0.42, 0.04, 0.08, [172, 72, 44]);
      p.rect(0.18, 0.33, 0.04, 0.03, [196, 96, 60]); p.rect(0.42, 0.35, 0.04, 0.03, [196, 96, 60]);
      p.poly([0.06, 0.26, 0.1, 0.14, 0.22, 0.08, 0.44, 0.08, 0.56, 0.14, 0.6, 0.26], BUN);
      p.ell(0.33, 0.25, 0.27, 0.04, BUN);
      p.ell(0.27, 0.15, 0.1, 0.035, [244, 200, 140]);
      for (const [x, y] of [[0.2, 0.2], [0.33, 0.12], [0.44, 0.18], [0.38, 0.22], [0.26, 0.24]]) p.rect(x, y, 0.03, 0.018, C.white);
    },
  },
  avotoast: {
    uw: 0.66, uh: 0.56,
    draw(p) {
      p.rect(0.06, 0.16, 0.54, 0.32, [176, 124, 70]);                    // the crust
      p.rect(0.09, 0.19, 0.48, 0.26, [226, 184, 122]);
      p.rect(0.11, 0.2, 0.44, 0.23, [150, 196, 84]);                     // smashed avocado
      p.rect(0.13, 0.22, 0.16, 0.06, [182, 218, 110]); p.rect(0.36, 0.34, 0.14, 0.05, [182, 218, 110]); p.rect(0.2, 0.36, 0.08, 0.04, [120, 168, 66]);
      p.ell(0.37, 0.3, 0.12, 0.08, C.white); p.ell(0.38, 0.3, 0.05, 0.04, [250, 196, 50]);    // an egg on top, obviously
      for (const [x, y] of [[0.16, 0.31], [0.24, 0.25], [0.5, 0.25], [0.46, 0.4], [0.15, 0.39]]) p.rect(x, y, 0.02, 0.02, [214, 60, 50]);   // chilli
      p.rect(0.27, 0.13, 0.03, 0.08, [70, 160, 90]); p.rect(0.31, 0.11, 0.03, 0.09, [96, 190, 110]);   // micro herbs
      p.rect(0.02, 0.5, 0.62, 0.03, [200, 210, 230]);
    },
  },
  flatwhite: {
    uw: 0.6, uh: 0.6,
    draw(p) {
      const CUP = [244, 244, 248];
      for (const [x, y, hgt] of [[0.2, 0.03, 0.09], [0.3, 0.0, 0.1]]) p.rect(x, y, 0.03, hgt, [200, 214, 240]);
      p.rect(0.12, 0.2, 0.32, 0.25, CUP); p.ell(0.28, 0.45, 0.15, 0.05, CUP);
      p.rect(0.44, 0.24, 0.08, 0.035, CUP); p.rect(0.5, 0.24, 0.035, 0.14, CUP); p.rect(0.44, 0.35, 0.08, 0.035, CUP);   // the handle
      p.ell(0.28, 0.2, 0.16, 0.05, CUP);
      p.ell(0.28, 0.2, 0.135, 0.035, [176, 120, 70]);                    // the coffee
      p.ell(0.28, 0.2, 0.06, 0.018, [244, 230, 208]); p.rect(0.27, 0.185, 0.02, 0.03, [244, 230, 208]);   // the art on top
      p.rect(0.36, 0.26, 0.04, 0.15, [226, 228, 238]);
      p.ell(0.3, 0.52, 0.27, 0.045, [214, 220, 236]);                    // the saucer
    },
  },
  penguinmilk: {
    // a tall glass of it, with a little penguin on the glass so nobody mistakes it for ordinary milk
    uw: 0.5, uh: 0.62,
    draw(p) {
      const GLASS = [176, 204, 240], MILK = [252, 252, 255], SHADE = [212, 222, 244];
      p.rect(0.09, 0.05, 0.32, 0.53, GLASS);
      p.rect(0.12, 0.05, 0.26, 0.5, [96, 122, 176]);                   // the empty top of the glass
      p.rect(0.12, 0.13, 0.26, 0.42, MILK);
      p.rect(0.32, 0.15, 0.04, 0.38, SHADE);
      p.ell(0.25, 0.13, 0.13, 0.03, C.white);
      p.ell(0.22, 0.38, 0.06, 0.085, BLACK); p.ell(0.228, 0.4, 0.034, 0.055, C.white);   // the penguin on the glass
      p.rect(0.235, 0.325, 0.04, 0.022, BEAK);
    },
  },
  primerib: {
    uw: 0.7, uh: 0.56,
    draw(p) {
      p.ell(0.35, 0.47, 0.33, 0.07, [214, 220, 236]);                    // the plate
      p.ell(0.33, 0.3, 0.3, 0.2, [110, 62, 40]);                         // the crust
      p.ell(0.33, 0.3, 0.25, 0.155, [206, 96, 100]);
      p.ell(0.35, 0.3, 0.15, 0.09, [232, 136, 134]);
      p.ell(0.11, 0.26, 0.06, 0.1, [246, 234, 212]);                     // the fat cap
      p.rect(0.56, 0.23, 0.11, 0.055, [240, 236, 224]); p.ell(0.67, 0.255, 0.035, 0.05, C.white);   // the bone
      p.rect(0.2, 0.44, 0.08, 0.025, [120, 70, 44]); p.rect(0.4, 0.45, 0.1, 0.025, [120, 70, 44]);   // gravy
    },
  },
  gingerbread: {
    uw: 0.6, uh: 0.62,
    draw(p) {
      p.line(0.1, 0.3, 0.5, 0.3, 0.1, COOKIE); p.line(0.24, 0.44, 0.17, 0.56, 0.1, COOKIE); p.line(0.36, 0.44, 0.43, 0.56, 0.1, COOKIE);
      p.rect(0.21, 0.23, 0.18, 0.25, COOKIE); p.ell(0.3, 0.14, 0.12, 0.12, COOKIE);
      p.rect(0.25, 0.1, 0.035, 0.035, C.white); p.rect(0.33, 0.1, 0.035, 0.035, C.white); p.rect(0.26, 0.17, 0.09, 0.025, C.white);
      p.rect(0.285, 0.28, 0.04, 0.04, C.red); p.rect(0.285, 0.37, 0.04, 0.04, [70, 190, 110]);
      p.rect(0.07, 0.27, 0.03, 0.07, C.white); p.rect(0.5, 0.27, 0.03, 0.07, C.white);
      p.rect(0.13, 0.54, 0.08, 0.03, C.white); p.rect(0.39, 0.54, 0.08, 0.03, C.white);
    },
  },
  sugarstar: {
    uw: 0.6, uh: 0.6,
    draw(p) {
      const star = (r1, r2) => { const pts = []; for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? r2 : r1; pts.push(0.3 + Math.cos(ang) * r, 0.32 + Math.sin(ang) * r); } return pts; };
      p.poly(star(0.3, 0.13), [226, 180, 110]);
      p.poly(star(0.23, 0.1), [255, 244, 200]);
      const dots = [[0.3, 0.2, C.red], [0.22, 0.3, [70, 190, 110]], [0.38, 0.3, [80, 150, 250]], [0.3, 0.36, [250, 200, 70]], [0.25, 0.42, C.red], [0.36, 0.42, [70, 190, 110]]];
      for (const [x, y, c] of dots) p.rect(x - 0.02, y - 0.02, 0.04, 0.04, c);
    },
  },
  chocchip: {
    uw: 0.6, uh: 0.6,
    draw(p) {
      p.ell(0.3, 0.31, 0.27, 0.27, [196, 142, 82]); p.ell(0.28, 0.28, 0.24, 0.24, [222, 170, 104]);
      for (const [x, y] of [[0.16, 0.2], [0.36, 0.14], [0.42, 0.33], [0.22, 0.4], [0.3, 0.27], [0.12, 0.32], [0.38, 0.46]]) p.rect(x, y, 0.065, 0.06, [84, 52, 40]);
    },
  },
  lights: {
    uw: 1.0, uh: 0.6,
    draw(p) {
      let px = 0.06, py = 0.14;
      for (let i = 0; i < 6; i++) {
        const x = 0.1 + i * 0.16, y = 0.16 + 0.2 * Math.sin((i / 5) * Math.PI);
        p.line(px, py, x, y, 0.025, [60, 70, 90]);
        px = x; py = y;
      }
      p.line(px, py, 0.96, 0.12, 0.025, [60, 70, 90]);
      for (let i = 0; i < 6; i++) p.ell(0.1 + i * 0.16, 0.24 + 0.2 * Math.sin((i / 5) * Math.PI), 0.06, 0.075, LIGHT_COLS[i % 5]);
    },
  },
  antlers: {
    uw: 0.9, uh: 0.7,
    draw(p) {
      for (const m of [0, 1]) {
        const X = (x) => (m ? 0.9 - x : x);
        p.line(X(0.32), 0.68, X(0.2), 0.1, 0.07, ANTLER);
        p.line(X(0.27), 0.44, X(0.06), 0.3, 0.06, ANTLER);
        p.line(X(0.23), 0.26, X(0.36), 0.06, 0.06, ANTLER);
      }
    },
  },
  flag: {
    uw: 0.7, uh: 0.9,
    draw(p) {
      p.line(0.12, 0.9, 0.12, 0.04, 0.05, [200, 204, 216]);
      p.poly([0.14, 0.06, 0.64, 0.22, 0.14, 0.38], C.red);
      p.poly([0.14, 0.17, 0.4, 0.22, 0.14, 0.27], C.white);
    },
  },
  bells: {
    uw: 0.7, uh: 0.7,
    draw(p) {
      for (const bx of [0.22, 0.48]) {
        p.ell(bx, 0.44, 0.16, 0.18, C.gold); p.ell(bx - 0.04, 0.4, 0.06, 0.07, [255, 236, 150]);
        p.rect(bx - 0.09, 0.5, 0.18, 0.03, [150, 104, 30]); p.rect(bx - 0.02, 0.5, 0.04, 0.09, [150, 104, 30]);
      }
      p.ell(0.27, 0.17, 0.09, 0.07, C.red); p.ell(0.43, 0.17, 0.09, 0.07, C.red); p.rect(0.32, 0.14, 0.06, 0.07, C.redD);
    },
  },
};

const icons = new Map();
/** A static, full-brightness picture of a reward that fits inside maxW x maxH pixels. */
export function rewardIcon(id, maxW, maxH) {
  const key = id + '|' + maxW + '|' + maxH;
  let c = icons.get(key);
  if (c) return c;
  const art = ART[id].icon || ART[id];
  const p = new Pix(art.uw, art.uh, Math.max(4, Math.floor(Math.min(maxW / art.uw, maxH / art.uh))));
  p.unlit = true;
  art.draw(p, 0.6);
  p.finish([1, 1, 1], [0, 0, 0], 0);
  c = p.toCanvas();
  icons.set(key, c);
  return c;
}

const frames = new Map();
/** One frame of a thing's art at full brightness: res pixels to the metre, ph its animation phase. */
export function artCanvas(id, res, ph = 0.6) {
  const key = id + '|' + res + '|' + Math.round(ph * 8);
  let c = frames.get(key);
  if (c) return c;
  const art = ART[id];
  const p = new Pix(art.uw, art.uh, res);
  p.unlit = true;
  art.draw(p, ph);
  p.finish([1, 1, 1], [0, 0, 0], 0);
  c = p.toCanvas();
  frames.set(key, c);
  return c;
}
