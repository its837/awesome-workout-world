// Sound: a small Web Audio synth that plays the songbook in carols.js plus the game's
// sound effects. The traditional carols get music-box bells, a soft arpeggio, bass and
// sleigh bells; the tunes written for the game get a rhythm section (drums, bass,
// piano, pad or guitar) in their own style. Everything is generated live, so there are no audio
// files to ship or license.
import { CAROLS, HOME_THEME } from './carols.js';
import { clamp } from './util.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midiOf(tok) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(tok);
  if (!m) return 60;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
/** 'NEON SNOWFALL' -> 'neon-snowfall', for picking a song from the address bar. */
export const songSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// where a swung tune puts the four quarters of a beat (the off-beat arrives late)
const SWING = [0, 0.33, 0.67, 0.33];

function parseChord(tok, transpose) {
  const m = /^([A-G])([#b]?)(m?)([75]?)$/.exec(tok) || ['', 'C', '', '', ''];
  const root = (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + transpose + 120) % 12;
  if (m[4] === '5') return { root, tones: [0, 7, 12] };   // bare fifth, e.g. "D5"
  const tones = [0, m[3] ? 3 : 4, 7];
  if (m[4]) tones.push(10);
  return { root, tones };
}

// The 'brass' voice is two trumpets: the second shadows the melody a third below. A third
// is three semitones or four, so take whichever lands on a note of the chord playing. A
// melody note sitting on the chord's root has no chord note a third under it: drop to the
// chord's third instead, a sixth below. A passing note (not in the chord) keeps to the scale
// of the chord the tune ends on. Returns a midi note.
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
function secondTrumpet(midi, ch, home) {
  const inChord = (m) => ch.tones.includes((m - ch.root + 120) % 12);
  const inKey = (m) => SCALE[home.tones[1] === 3 ? 'minor' : 'major'].includes((m - home.root + 120) % 12);
  for (const d of [3, 4]) if (inChord(midi - d)) return midi - d;
  if (inChord(midi)) for (const d of [8, 9]) if (inChord(midi - d)) return midi - d;
  for (const d of [3, 4]) if (inKey(midi - d)) return midi - d;
  return midi - 3;
}

function compile(song) {
  const tr = song.transpose || 0;
  const mel = new Map();
  let t = 0;
  for (const tok of song.melody.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [n, d] = tok.split(':');
    const len = Math.max(1, Math.round((d ? Number(d) : 1) * 4));
    if (n !== 'R') mel.set(t, { midi: midiOf(n) + tr, len });
    t += len;
  }
  const bars = song.chords.split(/\s+/).filter((c) => c && c !== '|').map((c) => c.split(',').map((x) => parseChord(x, tr)));
  const barTicks = song.meter * 4;
  if ((song.voices || []).includes('brass') && bars.length) {
    // the second trumpet's part, worked out once against the chord under each melody note
    const end = bars[bars.length - 1], home = end[end.length - 1];
    for (const [k, m] of mel) {
      const chords = bars[Math.floor(k / barTicks) % bars.length];
      m.harm = secondTrumpet(m.midi, chords[Math.min(chords.length - 1, Math.floor(((k % barTicks) / barTicks) * chords.length))], home);
    }
  }
  const total = Math.max(Math.ceil(t / barTicks), bars.length) * barTicks;
  return { title: song.title, bpm: song.bpm, meter: song.meter, voices: song.voices || ['bell'], mel, bars, barTicks, total, style: song.style || '', swing: !!song.swing, original: !!song.original };
}

/** Deal a few special things evenly through a longer list, so they never bunch up: [a a S a a S a ...]. */
function spread(most, few) {
  if (!few.length) return most.slice();
  const out = [], gap = (most.length + few.length) / few.length;
  let m = 0;
  for (let k = 0; k < few.length; k++) {
    const at = Math.round(gap * (k + 0.5));
    while (out.length < at - 1 && m < most.length) out.push(most[m++]);
    out.push(few[k]);
  }
  while (m < most.length) out.push(most[m++]);
  return out;
}

// How the tablet's spoken words are changed (playSpeech): rate below 1 is deeper and slower;
// buzz is the robot's hum in hertz; robot and plain are how much of each is mixed in.
const VOICE = { rate: 0.78, buzz: 62, robot: 1.0, plain: 0.5, loud: 1.7 };

export class Sound {
  constructor() {
    this.ctx = null;
    // The songbook's own order: the tunes written for this game are spread right through
    // the carols, not kept in a block at the end.
    this.songs = spread(CAROLS.filter((s) => !s.original), CAROLS.filter((s) => s.original)).map(compile);
    this.theme = compile(HOME_THEME);      // the home page's tune: looped, and never in the shuffle
    this.order = [];
    this.cur = null;
    this.tick = 0;
    this.nextTime = 0;
    this.playing = false;
    this.tempoScale = 1;
    this.tempoMin = 0.8; this.tempoMax = 1.25;   // how far tempoScale may push a song
    this.musicOn = true;
    this.muted = false;
    this.loud = 1;
    this.title = '';
    this.voice = 'bell';   // lead instrument for the current song
    this.feel = 0;         // accompaniment pattern for the current song
    this.wanted = '';      // a song asked for by name (its slug); played next
    this.locked = new Set();   // slugs of songs not in the songbook yet (an advent door brings each one)
  }

  /** The songbook, for the on-screen list. */
  get titles() { return this.songs.map((s) => s.title); }
  get index() { return this.songs.indexOf(this.cur); }
  isOriginal(i) { return !!(this.songs[i] && this.songs[i].original); }
  /** Not in the songbook yet: never picked at random, and hidden from the on-screen list. */
  isLocked(i) { return !!this.songs[i] && this.locked.has(songSlug(this.songs[i].title)); }
  /** Play song number i now. */
  play(i) { if (this.ctx && this.songs[i]) { this.playing = true; this._load(i); } }

  /** Must be called from a touch/click/key handler the first time (browser autoplay rules). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.8 * this.loud;
      const comp = c.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(c.destination);
      this.musicOut = c.createGain(); this.musicOut.gain.value = this.musicOn ? 1 : 0; this.musicOut.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.connect(this.musicOut);   // gets echo
      this.dryBus = c.createGain(); this.dryBus.connect(this.musicOut);       // bass + sleigh bells
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      const delay = c.createDelay(1); delay.delayTime.value = 0.31;
      const fb = c.createGain(); fb.gain.value = 0.3;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      const wet = c.createGain(); wet.gain.value = 0.24;
      this.musicBus.connect(delay); this.sfxBus.connect(delay);
      delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(this.master);
      this.arpBus = c.createBiquadFilter(); this.arpBus.type = 'lowpass'; this.arpBus.frequency.value = 1500; this.arpBus.connect(this.musicBus);
      const len = c.sampleRate;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  setMusic(on) { this.musicOn = on; if (this.ctx) this.musicOut.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05); }
  setMuted(m) { this.muted = m; if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8 * this.loud, this.ctx.currentTime, 0.05); }
  /** The game's own loudness, 0 to 1 (volume.js; on a tablet the tablet's own volume is used instead). */
  setLoud(v) { this.loud = v; this.setMuted(this.muted); }

  // --- instruments ---------------------------------------------------------
  _env(g, t, peak, len, attack = 0.006) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  }
  bell(t, f, dur, vel, bus) {
    const c = this.ctx, out = bus || this.musicBus;
    const len = Math.max(0.4, dur * 1.3);
    const g = c.createGain(); this._env(g, t, vel, len); g.connect(out);
    const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = f; o1.connect(g);
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2.002;
    const g2 = c.createGain(); g2.gain.value = 0.26; o2.connect(g2); g2.connect(g);
    const o3 = c.createOscillator(); o3.type = 'sine'; o3.frequency.value = f * 4.07;
    const g3 = c.createGain(); this._env(g3, t, vel * 0.3, 0.09, 0.002); o3.connect(g3); g3.connect(out);
    for (const o of [o1, o2]) { o.start(t); o.stop(t + len + 0.05); }
    o3.start(t); o3.stop(t + 0.12);
  }
  /** One trumpet: a saw through a filter that snaps open (bright, a little nasal), scooped up
   *  to the note, with vibrato arriving once a long note has settled. */
  horn(t, f, dur, vel) {
    const c = this.ctx, len = Math.max(0.09, dur * 0.86);   // tongued: a little air between notes
    const open = Math.min(4200, 1400 + f * 2.6), hold = Math.max(0.04, len - 0.05);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.5;
    lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(open, t + 0.03); lp.frequency.exponentialRampToValueAtTime(open * 0.7, t + len);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.linearRampToValueAtTime(vel * 0.8, t + 0.035);
    g.gain.setValueAtTime(vel * 0.8, t + hold);
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    o.connect(lp); lp.connect(g); g.connect(this.musicBus);
    o.start(t); o.stop(t + len + 0.02);
    if (len > 0.3) {
      const lfo = c.createOscillator(); lfo.frequency.value = 5.6;
      const lg = c.createGain(); lg.gain.value = 0;
      lg.gain.setValueAtTime(0, t + 0.14); lg.gain.linearRampToValueAtTime(f * 0.007, t + 0.3);
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + len + 0.02);
    }
  }
  /** The melody, in whichever instrument this play-through drew. harm: the midi note of the
   *  second trumpet, for the 'brass' voice (see secondTrumpet). */
  lead(t, f, dur, harm) {
    const c = this.ctx;
    if (this.voice === 'brass') {
      // 1960s "Ameriachi" trumpets: the lead, and a quieter second one a third below, a hair late and sharp
      this.horn(t, f, dur, 0.095);
      if (harm) this.horn(t + 0.007, hz(harm) * 1.003, dur, 0.055);
      return;
    }
    if (this.voice === 'toot') {
      // one trumpet for the tune; any note below the G under middle C is not played on a trumpet
      if (f < 200) this.parp(t, f, dur); else this.horn(t, f, dur, 0.1);
      return;
    }
    if (this.voice === 'glock') return this.bell(t, f * 2, dur * 0.7, 0.2);
    if (this.voice === 'chip') {
      const len = Math.max(0.1, dur * 0.92);
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.008);
      g.gain.linearRampToValueAtTime(0.07, t + len * 0.5);
      g.gain.linearRampToValueAtTime(0.0001, t + len);
      o.connect(lp); lp.connect(g); g.connect(this.musicBus);
      o.start(t); o.stop(t + len + 0.02);
      return;
    }
    if (this.voice === 'flute') {
      const len = Math.max(0.18, dur * 0.98);
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f;
      const g2 = c.createGain(); g2.gain.value = 0.35;
      const lfo = c.createOscillator(); lfo.frequency.value = 5.2;
      const lg = c.createGain(); lg.gain.value = f * 0.006;
      lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.05);
      g.gain.setValueAtTime(0.24, t + Math.max(0.06, len - 0.08));
      g.gain.linearRampToValueAtTime(0.0001, t + len);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.musicBus);
      for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + len + 0.02); }
      return;
    }
    if (this.voice === 'synth') {
      // 1980s lead: two saws a hair out of tune, a filter that opens on each note, a little vibrato
      const len = Math.max(0.16, dur * 0.95);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
      lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(3200, t + 0.04); lp.frequency.exponentialRampToValueAtTime(1400, t + len);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.015);
      g.gain.setValueAtTime(0.085, t + Math.max(0.02, len - 0.06));
      g.gain.linearRampToValueAtTime(0.0001, t + len);
      const lfo = c.createOscillator(); lfo.frequency.value = 5.5;
      const lg = c.createGain(); lg.gain.value = f * 0.004; lfo.connect(lg);
      for (const det of [-7, 7]) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        lg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(t + len + 0.02);
      }
      lfo.start(t); lfo.stop(t + len + 0.02);
      lp.connect(g); g.connect(this.musicBus);
      return;
    }
    if (this.voice === 'twang') {
      // 1950s guitar: a bright pluck that dies away fast, an octave down
      const len = Math.max(0.22, dur * 1.1), ff = f / 2;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
      lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.18);
      const g = c.createGain(); this._env(g, t, 0.3, len, 0.003);
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = ff;
      const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = ff * 2;
      const g2 = c.createGain(); g2.gain.value = 0.25;
      o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(this.musicBus);
      for (const x of [o, o2]) { x.start(t); x.stop(t + len + 0.05); }
      return;
    }
    if (this.voice === 'sax') {
      // honking saxophone: square and saw together, a soft start and a growl, an octave down
      const len = Math.max(0.14, dur * 0.9), ff = f / 2;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = 2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.13, t + 0.03);
      g.gain.setValueAtTime(0.11, t + Math.max(0.04, len - 0.05));
      g.gain.linearRampToValueAtTime(0.0001, t + len);
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = ff;
      const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = ff * 1.003;
      const g2 = c.createGain(); g2.gain.value = 0.6;
      const lfo = c.createOscillator(); lfo.frequency.value = 28;
      const lg = c.createGain(); lg.gain.value = ff * 0.012; lfo.connect(lg); lg.connect(o.frequency);
      o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(this.musicBus);
      for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + len + 0.02); }
      return;
    }
    this.bell(t, f, dur, 0.3);
  }

  // --- the rhythm section, for the tunes written for the game -----------------
  kick(t, vel) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    const g = c.createGain(); this._env(g, t, vel, 0.18, 0.003);
    o.connect(g); g.connect(this.dryBus);
    o.start(t); o.stop(t + 0.22);
  }
  snare(t, vel, len = 0.13) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2100; bp.Q.value = 0.7;
    const g = c.createGain(); this._env(g, t, vel, len, 0.002);
    s.connect(bp); bp.connect(g); g.connect(this.dryBus);
    s.start(t, Math.random() * 0.5); s.stop(t + len + 0.03);
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.07);
    const g2 = c.createGain(); this._env(g2, t, vel * 0.7, 0.09, 0.002);
    o.connect(g2); g2.connect(this.dryBus);
    o.start(t); o.stop(t + 0.12);
  }
  hat(t, vel, len = 0.035) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
    const g = c.createGain(); this._env(g, t, vel, len, 0.001);
    s.connect(hp); hp.connect(g); g.connect(this.dryBus);
    s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
  }
  /** A held chord on soft strings-like synth. */
  pad(t, freqs, dur, vel) {
    const c = this.ctx;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.12);
    g.gain.setValueAtTime(vel, t + Math.max(0.15, dur - 0.1));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.15);
    lp.connect(g); g.connect(this.musicBus);
    for (const f of freqs) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 14;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.2);
    }
  }
  piano(t, f, dur, vel) {
    const c = this.ctx;
    const g = c.createGain(); this._env(g, t, vel, Math.max(0.12, dur), 0.004); g.connect(this.dryBus);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g);
    o.start(t); o.stop(t + dur + 0.1);
  }
  arp(t, f, dur, vel) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const g = c.createGain(); this._env(g, t, vel, Math.max(0.12, dur)); o.connect(g); g.connect(this.arpBus);
    o.start(t); o.stop(t + dur + 0.1);
  }
  bass(t, f, dur, vel) {
    const c = this.ctx;
    const g = c.createGain(); this._env(g, t, vel, Math.max(0.2, dur), 0.012); g.connect(this.dryBus);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g);
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = f;
    const g2 = c.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g);
    for (const x of [o, o2]) { x.start(t); x.stop(t + dur + 0.1); }
  }
  /** A dry wooden knock: a rim click up high, a conga lower down. */
  /** A raspberry: a low buzz that sags in pitch while something flaps. (The 'toot' voice's low notes.) */
  parp(t, f, dur) {
    const c = this.ctx, len = Math.max(0.24, dur * 0.85);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 1.08, t); o.frequency.exponentialRampToValueAtTime(f * 0.62, t + len);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 640; lp.Q.value = 3;
    const flap = c.createGain(); flap.gain.value = 0.55;
    const lfo = c.createOscillator(); lfo.type = 'square';
    lfo.frequency.setValueAtTime(34, t); lfo.frequency.linearRampToValueAtTime(18, t + len);
    const depth = c.createGain(); depth.gain.value = 0.45; lfo.connect(depth); depth.connect(flap.gain);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.setValueAtTime(0.18, t + len * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + len);
    o.connect(lp); lp.connect(flap); flap.connect(g); g.connect(this.dryBus);
    o.start(t); lfo.start(t); o.stop(t + len + 0.05); lfo.stop(t + len + 0.05);
  }
  /** A didgeridoo's drone: one low note with its tone slowly opening and closing. */
  didge(t, f, dur) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 4; bp.frequency.setValueAtTime(380, t);
    const lfo = c.createOscillator(); lfo.frequency.value = 2.6;
    const d = c.createGain(); d.gain.value = 250; lfo.connect(d); d.connect(bp.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.08);
    g.gain.setValueAtTime(0.12, t + Math.max(0.1, dur - 0.06)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(bp); bp.connect(g); g.connect(this.dryBus);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  }
  /** A wobble board. */
  boing(t) {
    const c = this.ctx, o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(430, t + 0.09); o.frequency.exponentialRampToValueAtTime(160, t + 0.22);
    const g = c.createGain(); this._env(g, t, 0.12, 0.26, 0.01);
    o.connect(g); g.connect(this.dryBus);
    o.start(t); o.stop(t + 0.3);
  }
  knock(t, f, vel, len = 0.045) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f * 1.4, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
    const g = c.createGain(); this._env(g, t, vel, len, 0.002);
    o.connect(g); g.connect(this.dryBus);
    o.start(t); o.stop(t + len + 0.03);
  }
  /** A quick strum of nylon guitar: the strings a few milliseconds apart, bright for an instant, then damped. */
  strum(t, freqs, dur, vel) {
    const c = this.ctx, len = Math.max(0.1, dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.09);
    lp.connect(this.dryBus);
    freqs.forEach((f, i) => {
      const tt = t + i * 0.009;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const g = c.createGain(); this._env(g, tt, vel, len, 0.003);
      o.connect(g); g.connect(lp);
      o.start(tt); o.stop(tt + len + 0.05);
    });
  }
  sleigh(t, vel, bus) {
    const c = this.ctx;
    for (let i = 0; i < 2; i++) {
      const s = c.createBufferSource(); s.buffer = this.noise;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 6200 + i * 1700; bp.Q.value = 2.2;
      const g = c.createGain(); const tt = t + i * 0.021;
      this._env(g, tt, vel * (i ? 0.7 : 1), 0.085, 0.002);
      s.connect(bp); bp.connect(g); g.connect(bus || this.dryBus);
      s.start(tt, Math.random() * 0.5); s.stop(tt + 0.12);
    }
  }

  // --- sequencer -----------------------------------------------------------
  startMusic() {
    if (!this.ctx || (this.playing && this.cur !== this.theme)) return;   // (the home page's tune gives way to the songbook)
    this.playing = true;
    this._load();
  }
  /** The home page's own tune, round and round. */
  playTheme() {
    if (!this.ctx || (this.playing && this.cur === this.theme)) return;
    this.playing = true;
    this.cur = this.theme;
    this.title = '';
    this.voice = this.theme.voices[0];
    this.feel = 0;
    this.tick = 0;
    this.nextTime = this.ctx.currentTime + 0.25;
  }
  stopMusic() { this.playing = false; this.title = ''; }
  nextSong() { if (this.ctx && this.playing) this._load(); }
  _load(index) {
    if (index === undefined && this.wanted) {
      const i = this.songs.findIndex((s) => songSlug(s.title) === this.wanted);
      this.wanted = '';
      if (i >= 0) index = i;
    }
    if (index === undefined) {
      this.order = this.order.filter((i) => !this.isLocked(i));
      if (!this.order.length) {
        // a fresh shuffle each time round, with the game's own tunes spread evenly through it
        const free = this.songs.map((_, i) => i).filter((i) => !this.isLocked(i)), mixed = (list) => list.sort(() => Math.random() - 0.5);
        this.order = spread(mixed(free.filter((i) => !this.isOriginal(i))), mixed(free.filter((i) => this.isOriginal(i))));
        if (!this.order.length) this.order = [0];
        if (this.cur && this.songs[this.order[0]] === this.cur && this.order.length > 1) this.order.push(this.order.shift());
      }
      index = this.order.shift();
    }
    this.cur = this.songs[index];
    this.title = this.cur.title;
    // the same carol never sounds quite the same twice
    this.voice = this.cur.voices[(Math.random() * this.cur.voices.length) | 0];
    this.feel = Math.random() < 0.5 ? 0 : 1;
    this.tick = 0;
    this.nextTime = this.ctx.currentTime + 0.25;
  }

  /** Call every frame; schedules notes a short way ahead of the audio clock. */
  update() {
    if (!this.ctx || !this.playing || !this.cur || this.ctx.state !== 'running') return;
    if (!this.musicOn) return;   // paused: the tune waits where it was
    const now = this.ctx.currentTime;
    if (this.nextTime < now - 0.25) this.nextTime = now + 0.05; // tab was asleep
    while (this.nextTime < now + 0.2) {
      const td = 60 / (this.cur.bpm * clamp(this.tempoScale, this.tempoMin, this.tempoMax)) / 4;
      this._tick(this.tick, this.nextTime + (this.cur.swing ? SWING[this.tick % 4] * td : 0), td);
      this.nextTime += td;
      this.tick++;
      if (this.cur === this.theme) { if (this.tick >= this.cur.total) this.tick = 0; }   // straight round again
      else if (this.tick >= this.cur.total + this.cur.barTicks) this._load();
    }
  }

  _tick(k, t, td) {
    const s = this.cur;
    if (k >= s.total) return; // breath between songs
    const m = s.mel.get(k);
    if (m) this.lead(t, hz(m.midi), m.len * td, m.harm);
    const bar = Math.floor(k / s.barTicks), pos = k - bar * s.barTicks;
    const chords = s.bars[bar % s.bars.length];
    const ch = chords[Math.min(chords.length - 1, Math.floor((pos / s.barTicks) * chords.length))];
    if (s.style) { this._band(s, ch, chords.length, pos, bar, t, td); return; }
    const root = 48 + ch.root;
    const fifth = hz(root + (ch.root > 5 ? -5 : 7));
    if (s.meter === 4) {
      if (pos === 0) this.bass(t, hz(root), td * 7, 0.2);
      else if (pos === 8) this.bass(t, fifth, td * 7, 0.16);
      if (this.feel === 0) {
        // rolling arpeggio
        if (pos % 2 === 0) {
          const tone = ch.tones[[0, 2, 1, 2][(pos / 2) % 4] % ch.tones.length];
          this.arp(t, hz(60 + ch.root + tone), td * 1.8, 0.05);
        }
      } else if (pos === 4 || pos === 12) {
        // oom-pah: chord stabs on the off-beats
        this.arp(t, hz(60 + ch.root + ch.tones[1]), td * 2.5, 0.045);
        this.arp(t, hz(60 + ch.root + ch.tones[2]), td * 2.5, 0.045);
      }
      if (pos % 4 === 0) this.sleigh(t, pos % 8 === 0 ? 0.085 : 0.06);
      else if (pos % 4 === 2) this.sleigh(t, 0.03);
    } else {
      if (pos === 0) this.bass(t, hz(root), td * 10, 0.2);
      if (this.feel === 0) {
        // waltz: bass, chord, chord
        if (pos === 4 || pos === 8) {
          this.arp(t, hz(60 + ch.root + ch.tones[1]), td * 3, 0.045);
          this.arp(t, hz(60 + ch.root + ch.tones[2]), td * 3, 0.045);
        }
      } else if (pos % 2 === 0) {
        // flowing broken chord
        const tone = ch.tones[[0, 1, 2, 1, 2, 1][(pos / 2) % 6] % ch.tones.length];
        this.arp(t, hz(60 + ch.root + tone), td * 1.8, 0.045);
      }
      if (pos % 4 === 0) this.sleigh(t, pos === 0 ? 0.07 : 0.035);
    }
  }

  /**
   * Accompaniment for a tune with a rhythm section. pos is the sixteenth within the bar
   * (0..15), inBar how many chords share this bar.
   *   synthpop  four-on-the-floor kick, big snare on 2 and 4, octave-bouncing bass, held pad
   *   shuffle   swung: pounding piano chords and sleigh bells on every eighth, backbeat snare
   *   rock      swung: walking boogie bass, off-beat chord stabs, backbeat snare, ticking hat
   *   chacha    1960s "Ameriachi" brass band: two-beat bass (root on 1, fifth on 3, then the
   *             chord's third on 4), nylon guitar "chick" on every "and", maracas, a rim click
   *             on 2 and congas saying "cha-cha-cha" on 4, 4-and, 1
   *   twostep   the same band playing oom-pah: bass and soft kick on 1 and 3, guitar and rim
   *             click on 2 and 4, a shaker on every eighth
   * `feel` (picked at random each play) adds or changes one layer, so it varies. For the
   * last two it adds a marimba that answers at the end of every second bar, where the
   * trumpets have left room.
   */
  _band(s, ch, inBar, pos, bar, t, td) {
    const beat = pos % 4 === 0, eighth = pos % 2 === 0, n = pos >> 2;
    const low = 41 + ((ch.root + 7) % 12);                 // bass note between F2 and E3
    const third = ch.tones[1];
    const chord = (base) => ch.tones.map((x) => hz(base + ch.root + x));
    if (s.style === 'synthpop') {
      if (beat) this.kick(t, 0.42);
      if (pos === 4 || pos === 12) { this.snare(t, 0.2, 0.2); this.sleigh(t, 0.05); }
      if (eighth) {
        this.hat(t, beat ? 0.03 : 0.05);
        this.bass(t, hz(beat ? low : low + 12), td * 1.7, beat ? 0.2 : 0.13);
      }
      const seg = s.barTicks / inBar;
      if (pos % seg === 0) this.pad(t, chord(60), seg * td, 0.028);
      if (this.feel) this.arp(t, hz(72 + ch.root + ch.tones[[0, 1, 2, 1][pos % 4] % ch.tones.length]), td * 1.4, 0.018);
    } else if (s.style === 'shuffle') {
      if (pos === 0 || pos === 8) this.kick(t, 0.4);
      if (pos === 4 || pos === 12) this.snare(t, 0.17);
      if (eighth) {
        this.sleigh(t, beat ? 0.07 : 0.04);
        for (const f of chord(60)) this.piano(t, f, td * 1.6, beat ? 0.05 : 0.035);
      }
      if (beat) this.bass(t, hz(low + (n % 2 ? 7 : 0)), td * 3.4, 0.2);
      if (this.feel && pos === 0) this.bell(t, hz(84 + ch.root + 7), td * 6, 0.07);
    } else if (s.style === 'bush') {
      // an Australian bush band: a didgeridoo under everything, clapsticks on the beat, a
      // lagerphone shaking the eighths, a bouncing bass, and now and then a wobble board
      if (pos === 0) this.didge(t, hz(low - 12 < 29 ? low : low - 12), td * s.barTicks);
      if (beat) this.knock(t, 1700, 0.09, 0.03);
      if (eighth) this.hat(t, beat ? 0.02 : 0.05);
      if (pos === 0 || pos === 8) this.bass(t, hz(pos ? low + 7 : low), td * 3, 0.17);
      if (pos === 4 || pos === 12) this.strum(t, chord(60), td * 1.3, 0.04);
      if (this.feel && bar % 2 && pos === 14) this.boing(t);
    } else if (s.style === 'chacha' || s.style === 'twostep') {
      const cha = s.style === 'chacha';
      if (pos === 0 || pos === 8) {
        // two-beat bass: root on 1, fifth on 3 (or the new root, when the chord changes there)
        this.kick(t, pos ? 0.2 : 0.28);
        this.bass(t, hz(pos && inBar === 1 ? low + (low > 45 ? -5 : 7) : low), td * 3.2, pos ? 0.17 : 0.2);
      } else if (cha && pos === 12) this.bass(t, hz(low + third), td * 2.4, 0.13);
      if (cha ? pos % 4 === 2 : pos === 4 || pos === 12) this.strum(t, chord(ch.root > 6 ? 48 : 60), td * 1.3, 0.04);
      if (cha) {
        if (pos % 8 === 0) this.hat(t, 0.045, 0.08);                 // maracas: long, short-short
        else if (eighth && pos % 8 >= 4) this.hat(t, 0.03);
        if (pos === 4) this.knock(t, 1300, 0.07);
        if (pos === 12 || pos === 14) this.knock(t, 300, 0.2, 0.13); // congas: cha-cha...
        else if (pos === 0) this.knock(t, 225, 0.22, 0.16);          // ...cha
      } else {
        if (eighth) this.hat(t, beat ? 0.025 : 0.045);
        if (pos === 4 || pos === 12) this.knock(t, 1300, 0.08);
      }
      if (this.feel && bar % 2 && (pos === 10 || pos === 12 || pos === 14)) {
        // marimba: three notes up the chord, if no melody note starts after beat 3 of this bar
        let room = true;
        for (let i = 9; i < 16; i++) if (s.mel.has(bar * s.barTicks + i)) room = false;
        if (room) this.bell(t, hz((ch.root > 6 ? 60 : 72) + ch.root + [third, 7, 12][(pos - 10) / 2]), td * 2, 0.1);
      }
    } else {
      if (pos === 0 || pos === 8) this.kick(t, 0.4);
      if (pos === 4 || pos === 12) { this.snare(t, 0.2); this.sleigh(t, 0.04); }
      if (eighth) this.hat(t, beat ? 0.045 : 0.025, 0.05);
      // up the chord one bar (1 3 5 6), back down the next (b7 6 5 3)
      const walk = bar % 2 ? [10, 9, 7, third] : [0, third, 7, 9];
      if (beat) this.bass(t, hz(low + walk[n]), td * 3.2, 0.2);
      else if (this.feel && pos % 4 === 2) this.bass(t, hz(low + walk[n]), td * 1.2, 0.11);
      if (pos % 4 === 2) for (const f of chord(60)) this.piano(t, f, td * 1.1, 0.04);
    }
  }

  // --- sound effects -------------------------------------------------------
  _now() { return this.ctx.currentTime + 0.01; }
  collect(step = 0) {
    if (!this.ready) return;
    const scale = [84, 86, 88, 91, 93, 96];
    const t = this._now(), m = scale[step % scale.length];
    this.bell(t, hz(m), 0.12, 0.2, this.sfxBus);
    this.bell(t + 0.06, hz(m + 7), 0.16, 0.16, this.sfxBus);
  }
  sparkle() {
    if (!this.ready) return;
    const t = this._now();
    this.bell(t, hz([88, 91, 96, 100][(Math.random() * 4) | 0]), 0.25, 0.07, this.sfxBus);
  }
  chime() {
    if (!this.ready) return;
    const t = this._now();
    [79, 84, 88].forEach((m, i) => this.bell(t + i * 0.11, hz(m), 0.5, 0.2, this.sfxBus));
  }
  fanfare() {
    if (!this.ready) return;
    const t = this._now();
    [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => this.bell(t + i * 0.13, hz(m), i === 6 ? 1.2 : 0.3, 0.26, this.sfxBus));
    for (let i = 0; i < 8; i++) this.sleigh(t + i * 0.11, 0.1, this.sfxBus);
  }
  /** One soft sleigh-bell shake (the Jingle Bells reward, once per pedal stroke or step). */
  jingle() {
    if (!this.ready) return;
    this.sleigh(this._now(), 0.045, this.sfxBus);
  }
  /** A bite out of a cookie. */
  crunch() {
    if (!this.ready) return;
    const c = this.ctx, t0 = this._now();
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.035;
      const s = c.createBufferSource(); s.buffer = this.noise;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + i * 900; bp.Q.value = 1.2;
      const g = c.createGain(); this._env(g, t, 0.3 - i * 0.07, 0.05, 0.002);
      s.connect(bp); bp.connect(g); g.connect(this.sfxBus);
      s.start(t, Math.random() * 0.5); s.stop(t + 0.08);
    }
  }
  tap() {
    if (!this.ready) return;
    this.bell(this._now(), hz(81), 0.06, 0.12, this.sfxBus);
  }
  /** A squirt of milk: a short hiss that drops, and a plink as it lands in the glass. */
  squirt() {
    if (!this.ready) return;
    const c = this.ctx, t = this._now();
    const s = c.createBufferSource(); s.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(5200, t); bp.frequency.exponentialRampToValueAtTime(1700, t + 0.15);
    const g = c.createGain(); this._env(g, t, 0.24, 0.16, 0.004);
    s.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + 0.2);
    this.bell(t + 0.3, hz(94 + ((Math.random() * 3) | 0) * 2), 0.07, 0.07, this.sfxBus);
  }
  /** The laser gun. */
  pew() {
    if (!this.ready) return;
    const c = this.ctx, t = this._now();
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(2100, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.22);
    const g = c.createGain(); this._env(g, t, 0.2, 0.24, 0.004); o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.3);
  }
  /** The long smelly finger going out: a rubbery boing. */
  poke() {
    if (!this.ready) return;
    const c = this.ctx, t = this._now();
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(560, t + 0.12); o.frequency.exponentialRampToValueAtTime(240, t + 0.3);
    const g = c.createGain(); this._env(g, t, 0.3, 0.34, 0.01); o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.4);
  }
  thump() {
    if (!this.ready) return;
    const c = this.ctx, t = this._now();
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.16);
    const g = c.createGain(); this._env(g, t, 0.4, 0.2, 0.004); o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.25);
  }
  /** A volleyball tossed up: a short airy rise. */
  toss() {
    if (!this.ready) return;
    const c = this.ctx, t = this._now();
    const s = c.createBufferSource(); s.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.3);
    const g = c.createGain(); this._env(g, t, 0.1, 0.3, 0.05);
    s.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + 0.34);
  }
  /** The serve: the smack of a hand on a ball, and the whoosh after it. */
  whack() {
    if (!this.ready) return;
    const c = this.ctx, t = this._now();
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.1);
    const g = c.createGain(); this._env(g, t, 0.55, 0.14, 0.002); o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 0.18);
    const s = c.createBufferSource(); s.buffer = this.noise;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200;
    const g2 = c.createGain(); this._env(g2, t, 0.4, 0.05, 0.001);
    s.connect(hp); hp.connect(g2); g2.connect(this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + 0.07);
    const w = c.createBufferSource(); w.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(3000, t + 0.02); bp.frequency.exponentialRampToValueAtTime(700, t + 0.22);
    const g3 = c.createGain(); this._env(g3, t + 0.02, 0.16, 0.2, 0.01);
    w.connect(bp); bp.connect(g3); g3.connect(this.sfxBus);
    w.start(t, Math.random() * 0.5); w.stop(t + 0.26);
  }
  /** Glass breaking: a bright crash, and tinkles falling after it. */
  shatter() {
    if (!this.ready) return;
    const c = this.ctx, t = this._now();
    const s = c.createBufferSource(); s.buffer = this.noise;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3800;
    const g = c.createGain(); this._env(g, t, 0.5, 0.32, 0.001);
    s.connect(hp); hp.connect(g); g.connect(this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + 0.36);
    const thud = c.createOscillator(); thud.type = 'sine'; thud.frequency.setValueAtTime(220, t); thud.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    const gt = c.createGain(); this._env(gt, t, 0.3, 0.1, 0.002); thud.connect(gt); gt.connect(this.sfxBus);
    thud.start(t); thud.stop(t + 0.14);
    // the bits landing: a scatter of tiny high pings
    for (let i = 0; i < 9; i++) this.bell(t + 0.06 + Math.random() * 0.45, hz(96 + ((Math.random() * 9) | 0)), 0.05, 0.05 + Math.random() * 0.05, this.sfxBus);
  }
  /** Three jolly synth "ho"s with sleigh bells, used when no speech voice is available. */
  hoHoHo() {
    if (!this.ready) return;
    const c = this.ctx, t0 = this._now();
    [147, 131, 110].forEach((f, i) => {
      const t = t0 + i * 0.3;
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 1.12, t); o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.22);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.22);
      const g = c.createGain(); this._env(g, t, 0.34, 0.25, 0.02);
      o.connect(lp); lp.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.3);
      this.sleigh(t, 0.09, this.sfxBus); this.sleigh(t + 0.15, 0.05, this.sfxBus);
    });
  }
  /**
   * Words from the tablet's own speech engine, as a sound file (base64), played through our
   * mixer instead of by the engine: slowed down so the voice drops, and multiplied by a low
   * buzz (a ring modulator, the old film-robot trick), with some of the plain voice left in
   * so the words stay clear. The music ducks under it. VOICE holds the numbers to tune.
   */
  playSpeech(base64) {
    try {
      this.unlock();
      const c = this.ctx;
      if (!c) return;
      const raw = atob(base64), bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      c.decodeAudioData(bytes.buffer, (buffer) => {
        const src = c.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = VOICE.rate;
        const ring = c.createGain(); ring.gain.value = 0;
        const buzz = c.createOscillator(); buzz.type = 'sine'; buzz.frequency.value = VOICE.buzz; buzz.connect(ring.gain);
        const robot = c.createGain(); robot.gain.value = VOICE.robot;
        const plain = c.createGain(); plain.gain.value = VOICE.plain;
        const out = c.createGain(); out.gain.value = VOICE.loud;
        src.connect(ring); ring.connect(robot); robot.connect(out);
        src.connect(plain); plain.connect(out);
        out.connect(this.master);
        const t = c.currentTime + 0.03, secs = buffer.duration / VOICE.rate;
        if (this.musicOn) { this.musicOut.gain.setTargetAtTime(0.3, t, 0.08); this.musicOut.gain.setTargetAtTime(1, t + secs, 0.25); }
        buzz.start(t); src.start(t); buzz.stop(t + secs + 0.1);
        if (window.MerryHost && window.MerryHost.note) window.MerryHost.note(`speech: the game is playing ${secs.toFixed(1)} seconds of it`);
      }, () => { if (window.MerryHost && window.MerryHost.note) window.MerryHost.note('speech: the game could not read the sound file'); });
    } catch (e) { /* no sound engine: nothing to play it with */ }
  }

  /** Spoken greeting: native voice on the tablet, browser speech on a computer. */
  speak(text) {
    try {
      if (window.MerryHost && window.MerryHost.speak) { window.MerryHost.speak(text); return true; }
      const s = window.speechSynthesis;
      if (!s || this.muted) return false;
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 0.5; u.rate = 0.9; u.volume = 1;
      s.cancel(); s.speak(u);
      return true;
    } catch (e) { return false; }
  }
}
