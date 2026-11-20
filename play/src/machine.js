// One interface for "the thing you are exercising on", whatever is behind it:
//   - the Android shell on a real Peloton, which pushes sensor packets in, or
//   - a simulator (driven from the Workshop panel or the arrow keys) everywhere else.
//
// Bridge contract with the Android shell (see android/README.md):
//   window.MerryHost.getMachineInfo() -> JSON string { kind: 'bike'|'tread', model, platform }
//   window.MerryHost.speak(text)        (optional, native text-to-speech)
//   window.MerryMiles.onTelemetry(obj)  called by native code, roughly 4-20x per second:
//       bike:  { kind: 'bike',  cadence: rpm, resistance: 0-100, power: watts }
//       tread: { kind: 'tread', speedMph, inclinePct }
// This app only ever READS the machine. It never sends speed or incline commands.
import { clamp, MPH } from './util.js';

/** Peloton-style speed from power (community curve fit; the bike reports no speed of its own). */
export function bikeSpeedMph(power) {
  if (power <= 0) return 0;
  const r = Math.sqrt(power);
  return power < 26
    ? Math.max(0, 0.057 - 0.172 * r + 0.759 * r * r - 0.079 * r * r * r)
    : -1.635 + 2.325 * r - 0.064 * r * r + 0.001 * r * r * r;
}

/** Rough flywheel model, only used by the simulator. */
function simPower(cadence, resistance) {
  if (cadence < 5) return 0;
  return 1.64e-4 * Math.pow(cadence, 1.35) * Math.pow(Math.max(1, resistance), 2.05);
}

export class Machine {
  constructor() {
    this.kind = 'bike';
    this.source = 'sim';
    this.model = 'SIMULATOR';
    this.cadence = 0; this.resistance = 0; this.power = 0;
    this.speedMph = 0; this.inclinePct = 0;
    this.lastPacket = 0;
    this.clock = 0;
    this.locked = false;   // true during a ride: the simulator may not swap machines mid-workout

    // The tablet shell says which machine this is. kind "none" means it has no sensor
    // reader for this device, so we fall back to the simulator.
    const host = window.MerryHost;
    if (host && host.getMachineInfo) {
      try {
        const info = JSON.parse(host.getMachineInfo());
        if (info.kind === 'tread' || info.kind === 'bike') {
          this.source = 'device';
          this.kind = info.kind;
          this.model = String(info.model || 'PELOTON').toUpperCase();
        } else if (/^(prism|aurora)/.test(String(info.platform || ''))) this.kind = 'tread';   // no reader yet, but the tablet is a treadmill's: pretend to be one
      } catch (e) { /* keep defaults */ }
    }
    if (this.source === 'sim') {
      // ?machine=tread in the address bar starts the simulator as a treadmill
      const want = new URLSearchParams(location.search).get('machine');
      if (want === 'tread' || want === 'bike') this.kind = want;
    }
    window.MerryMiles = window.MerryMiles || {};
    window.MerryMiles.onTelemetry = (data) => {
      try { this._packet(typeof data === 'string' ? JSON.parse(data) : data); } catch (e) { /* ignore bad packet */ }
    };
    this.sim = this.source === 'sim' ? new Simulator(this) : null;
  }

  get isSim() { return this.source === 'sim'; }
  get speedMps() { return this.speedMph * MPH; }
  /** True when real hardware is attached but has gone quiet. */
  get stale() { return this.source === 'device' && this.clock - this.lastPacket > 3; }

  /** Simulator only: pretend to be the other machine. Real hardware decides this for itself. */
  setKind(kind) {
    if (this.source !== 'sim' || this.locked || kind === this.kind) return;
    this.kind = kind;
    this.cadence = this.resistance = this.power = this.speedMph = this.inclinePct = 0;
  }

  _packet(d) {
    if (!d) return;
    this.lastPacket = this.clock;
    if (d.kind === 'tread') {
      this.kind = 'tread';
      this.speedMph = clamp(Number(d.speedMph) || 0, 0, 15);
      this.inclinePct = clamp(Number(d.inclinePct) || 0, -5, 20);
    } else {
      this.kind = 'bike';
      this.cadence = clamp(Number(d.cadence) || 0, 0, 200);
      this.resistance = clamp(Number(d.resistance) || 0, 0, 100);
      this.power = clamp(Number(d.power) || 0, 0, 2500);
      this.speedMph = bikeSpeedMph(this.power);
    }
  }

  update(dt) {
    this.clock += dt;
    if (this.sim) this.sim.update(dt);
    else if (this.stale) { this.cadence = 0; this.power = 0; this.speedMph = 0; }
  }
}

/**
 * Stands in for a real machine. Its targets are set from the Workshop panel (workshop.js)
 * or the keyboard: up/down = cadence or speed, left/right = resistance or incline, A = auto.
 */
class Simulator {
  constructor(m) {
    this.m = m;
    this.auto = true;
    this.t = 0;
    this.target = { cadence: 80, resistance: 40, speed: 3.2, incline: 5 };
    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowUp') this.faster(1);
      else if (e.key === 'ArrowDown') this.faster(-1);
      else if (e.key === 'ArrowRight') this.harder(1);
      else if (e.key === 'ArrowLeft') this.harder(-1);
      else if (e.key === 'a' || e.key === 'A') this.auto = !this.auto;
    });
  }

  /** Nudge cadence (bike) or belt speed (treadmill). */
  faster(dir) {
    const T = this.target;
    this.auto = false;
    if (this.m.kind === 'bike') T.cadence = clamp(T.cadence + dir * 5, 0, 130);
    else T.speed = clamp(Math.round((T.speed + dir * 0.3) * 10) / 10, 0, 12.5);
  }
  /** Nudge resistance (bike) or incline (treadmill). */
  harder(dir) {
    const T = this.target;
    this.auto = false;
    if (this.m.kind === 'bike') T.resistance = clamp(T.resistance + dir * 4, 0, 100);
    else T.incline = clamp(T.incline + dir * 1, 0, 12.5);
  }
  stop() { this.auto = false; this.target.cadence = 0; this.target.speed = 0; }
  refresh() { /* kept for callers; the panel reads state directly */ }

  update(dt) {
    const T = this.target, m = this.m;
    this.t += dt;
    if (this.auto) {
      const t = this.t;
      T.cadence = 80 + 13 * Math.sin(t * 0.11) + 6 * Math.sin(t * 0.37);
      T.resistance = 41 + 11 * Math.sin(t * 0.07 + 1);
      T.speed = 3.3 + 0.7 * Math.sin(t * 0.09);
      T.incline = 5.5 + 4.5 * Math.sin(t * 0.05 + 2);
    }
    if (m.kind === 'bike') {
      m.cadence += (T.cadence - m.cadence) * Math.min(1, dt * 2);
      m.resistance += (T.resistance - m.resistance) * Math.min(1, dt * 4);
      m.power = simPower(m.cadence, m.resistance);
      m.speedMph = bikeSpeedMph(m.power);
    } else {
      m.speedMph += clamp(T.speed - m.speedMph, -0.7 * dt, 0.7 * dt);
      m.inclinePct += clamp(T.incline - m.inclinePct, -1.2 * dt, 1.2 * dt);
    }
  }
}
