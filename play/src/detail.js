// How much the picture draws. Every "how heavy is a frame" dial lives here, so the
// Settings row, the TEST drawer, the speed test and the automatic governor all turn
// the same ones. Renderers read the live values from D every frame.
//
// The far mountains, hills and horizon treeline are baked pictures and cost almost
// nothing, so no level removes them. What the levels change is how many trees stand
// beside the trail, how soon the mist swallows them, and how many glows are drawn.

/** Mist: where it starts and ends (metres ahead), and how many trail segments of scenery to draw. */
export const FOGS = [
  { name: 'CLEAR', start: 20, end: 195, segs: 132 },
  { name: 'MISTY', start: 12, end: 116, segs: 80 },
  { name: 'THICK', start: 7, end: 74, segs: 52 },
];
/** Share of the ordinary trees, bushes and drifts that are kept. */
export const TREES = [1, 0.7, 0.45, 0.25];
/** Snowflakes on screen. */
export const SNOWS = [{ name: 'LOW', n: 70 }, { name: 'MED', n: 150 }, { name: 'HIGH', n: 300 }];
/** Soft halos round fairy lights: none, only on trees close to you, or on every lit tree in range. */
export const GLOWS = ['OFF', 'NEAR', 'ALL'];

export const LEVELS = ['full', 'medium', 'light'];
export const PRESETS = {
  full: { trees: 0, fog: 0, snow: 1, glow: 2 },
  medium: { trees: 1, fog: 1, snow: 1, glow: 1 },
  light: { trees: 2, fog: 2, snow: 0, glow: 0 },
};
export const CHOICES = ['auto', 'full', 'medium', 'light'];
/**
 * What AUTO is trying for (settings.autoAim; the choice is made in picture.js):
 *   look     the fullest forest it can manage: it only lets go of a level when the tablet really struggles
 *   balance  the usual AUTO: as much forest as this tablet runs well (a treadmill at 55 frames a second keeps FULL)
 *   smooth   motion first: drops at the first stutter, and never goes above MEDIUM
 * slow / easy: frames a second below which a level is too much, and above which the next one up is worth a try.
 * work: the next level up is only tried while a frame's own work takes less than this many milliseconds.
 * top: the best level it may use (an index into LADDER). start: where it begins on a tablet it does not know yet.
 */
export const AIMS = {
  look: { name: 'BEST LOOK', slow: 36, easy: 44, work: 20, top: 0, start: 'full' },
  balance: { name: 'AUTO', slow: 45, easy: 52, work: 14, top: 0, start: 'full' },
  smooth: { name: 'SMOOTHEST', slow: 48, easy: 56, work: 6.5, top: 1, start: 'medium' },
};
const LADDER = ['full', 'medium', 'light', 'light30'];   // best look first; light30 = LIGHT drawn at a steady 30

/** Live values. `set` holds the dial positions (indexes into the tables above). */
export const D = {
  choice: 'auto',        // what Settings says: auto | full | medium | light | custom
  aim: 'balance',        // what AUTO is trying for (AIMS above)
  level: 'medium',       // the preset in force right now (auto moves this)
  set: { ...PRESETS.medium },
  trees: 0.7, fogStart: 12, fogEnd: 116, segs: 80, snow: 150, glow: 1,
  half: false,           // draw every other screen refresh: a steady 30 frames a second
  stats: { sprites: 0, lights: 0, glows: 0 },
};

function push() {
  const s = D.set, f = FOGS[s.fog] || FOGS[0];
  D.trees = TREES[s.trees] ?? 1;
  D.fogStart = f.start; D.fogEnd = f.end; D.segs = f.segs;
  D.snow = (SNOWS[s.snow] || SNOWS[1]).n;
  D.glow = s.glow | 0;
}

/** Put a preset in force. */
export function setLevel(level) {
  if (!PRESETS[level]) level = 'medium';
  D.half = false;
  D.level = level;
  D.set = { ...PRESETS[level] };
  push();
}

/** Apply what is saved in Settings: settings.detail, plus settings.detailCustom for 'custom'. */
export function applyDetail(settings) {
  const choice = settings.detail || 'auto';
  D.choice = choice;
  if (choice === 'custom' && settings.detailCustom) {
    D.level = 'custom';
    D.set = { ...PRESETS.medium, ...settings.detailCustom };
    push();
  } else if (choice === 'auto') {
    // start where AUTO last settled on this tablet, but no higher than its aim allows
    D.aim = AIMS[settings.autoAim] ? settings.autoAim : 'balance';
    const aim = AIMS[D.aim];
    let at = LADDER.indexOf(settings.autoLevel);
    if (at < 0) at = LADDER.indexOf(aim.start);
    at = Math.max(at, aim.top);
    setLevel(at === 3 ? 'light' : LADDER[at]);
    D.half = at === 3;
  } else setLevel(choice);
}

/** TEST drawer: move one dial to its next position. Returns the settings patch to save. */
export function cycleDial(name) {
  const size = { trees: TREES.length, fog: FOGS.length, snow: SNOWS.length, glow: GLOWS.length }[name];
  D.set[name] = (D.set[name] + 1) % size;
  D.choice = 'custom'; D.level = 'custom';
  push();
  return { detail: 'custom', detailCustom: { ...D.set } };
}

export function dialLabel(name) {
  const s = D.set;
  if (name === 'trees') return `TREES ${Math.round(TREES[s.trees] * 100)}%`;
  if (name === 'fog') return `FOG ${FOGS[s.fog].name}`;
  if (name === 'snow') return `SNOW ${SNOWS[s.snow].name}`;
  return `GLOW ${GLOWS[s.glow]}`;
}

/**
 * The automatic setting. It watches how long real frames take while somebody is riding.
 * If the tablet cannot keep up it drops a step: FULL, MEDIUM, LIGHT, and last of all LIGHT
 * drawn on every other screen refresh, because a steady 30 frames a second looks far
 * better than a frame rate that wobbles between 40 and 55. It climbs back a step only
 * after a long comfortable stretch, and gives up on a level it has fallen out of twice.
 * How hard it hangs on to the look depends on what it is aiming for (AIMS above).
 */
export class Governor {
  constructor() { this.reset(); this.changed = null; }
  reset() { this.n = 0; this.time = 0; this.work = 0; this.slowWindows = 0; this.easyWindows = 0; this.hold = 6; this.sinceDrop = 999; this.fell = {}; }

  /** rawMs: time since the previous frame. workMs: time this frame spent computing and drawing. */
  sample(rawMs, workMs) {
    if (rawMs > 250) return;                 // the app was in the background, or something stalled once
    this.hold -= rawMs / 1000;
    this.sinceDrop += rawMs / 1000;
    if (this.hold > 0) return;               // let a level change settle before judging it
    this.n++; this.time += rawMs; this.work += workMs;
    if (this.time < 2000) return;
    const fps = (this.n * 1000) / this.time, work = this.work / this.n;
    this.n = 0; this.time = 0; this.work = 0;
    if (D.choice !== 'auto') return;
    const aim = AIMS[D.aim] || AIMS.balance, at = D.half ? 3 : LADDER.indexOf(D.level);
    if (at < 0) return;
    // at a steady 30 the frame rate says nothing, so judge by how long our own work takes
    const slow = D.half ? fps < 26 : fps < aim.slow;
    const easy = D.half ? work < 8 : fps > aim.easy && work < aim.work;
    this.slowWindows = slow ? this.slowWindows + 1 : 0;
    this.easyWindows = easy ? this.easyWindows + 1 : 0;
    const go = (to, down) => {
      setLevel(to === 3 ? 'light' : LADDER[to]);
      D.half = to === 3;
      this.changed = { level: LADDER[to], fps: Math.round(fps) };
      this.slowWindows = 0; this.easyWindows = 0; this.hold = 6;
      if (down) { this.sinceDrop = 0; this.fell[at] = (this.fell[at] || 0) + 1; }
    };
    if (this.slowWindows >= 2) { if (at < 3) go(at + 1, true); }
    else if (this.easyWindows >= 15 && this.sinceDrop > 180 && at > aim.top && (this.fell[at - 1] || 0) < 2) go(at - 1, false);
  }

  /** Returns the last change once (so the caller can save it and tell the rider). */
  take() { const c = this.changed; this.changed = null; return c; }
}
