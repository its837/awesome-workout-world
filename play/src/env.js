// Time of day. tod runs 0 (deep night) -> 1 (sunrise). The bike ride stays in the
// moonlit end; the treadmill "dawn patrol" climbs through the whole range.
import { clamp, lerp, mix3 } from './util.js';

const KEYS = [
  { t: 0.00, amb: [0.30, 0.40, 0.74], top: [5, 9, 34], mid: [14, 26, 74], low: [34, 58, 126], stars: 1, aurora: 1, moon: 1, sun: 0, alpen: 0 },
  { t: 0.40, amb: [0.36, 0.44, 0.76], top: [9, 14, 48], mid: [24, 38, 96], low: [58, 76, 146], stars: 0.95, aurora: 0.85, moon: 1, sun: 0, alpen: 0 },
  { t: 0.65, amb: [0.60, 0.54, 0.78], top: [24, 34, 92], mid: [86, 74, 144], low: [214, 126, 136], stars: 0.4, aurora: 0.25, moon: 0.8, sun: 0, alpen: 0.85 },
  { t: 0.85, amb: [0.92, 0.76, 0.76], top: [58, 92, 168], mid: [176, 142, 182], low: [255, 180, 128], stars: 0.05, aurora: 0, moon: 0.45, sun: 0.4, alpen: 0.7 },
  { t: 1.00, amb: [1.04, 0.97, 0.90], top: [82, 142, 218], mid: [164, 202, 240], low: [255, 224, 164], stars: 0, aurora: 0, moon: 0.2, sun: 1, alpen: 0.15 },
];
const FOG_ALBEDO = [0.80, 0.88, 1.0];
const STEPS = 60;
const cache = new Map();

export function envAt(tod) {
  const step = Math.round(clamp(tod, 0, 1) * STEPS);
  let e = cache.get(step);
  if (e) return e;
  const t = step / STEPS;
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const f = clamp((t - a.t) / (b.t - a.t), 0, 1);
  const amb = mix3(a.amb, b.amb, f);
  e = {
    step, tod: t, amb,
    fog: [FOG_ALBEDO[0] * amb[0] * 255, FOG_ALBEDO[1] * amb[1] * 255, FOG_ALBEDO[2] * amb[2] * 255],
    top: mix3(a.top, b.top, f), mid: mix3(a.mid, b.mid, f), low: mix3(a.low, b.low, f),
    stars: lerp(a.stars, b.stars, f), aurora: lerp(a.aurora, b.aurora, f), moon: lerp(a.moon, b.moon, f),
    sun: lerp(a.sun, b.sun, f), alpen: lerp(a.alpen, b.alpen, f),
    night: clamp(1 - (t - 0.35) / 0.4, 0, 1),
  };
  cache.set(step, e);
  return e;
}
