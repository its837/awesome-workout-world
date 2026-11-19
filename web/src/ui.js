// Touch / mouse / keyboard input mapped into the low-res canvas, plus a few
// immediate-mode widgets (panel, button) drawn in the same pixel style as the game.
import { W, H } from './config.js';
import { drawText } from './font.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.taps = [];
    this.keys = new Set();
    this.pressed = [];
    this.pointer = { x: -99, y: -99, down: false };
    this.onGesture = null; // called on the first touch/key so audio can unlock
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
    };
    canvas.addEventListener('pointerdown', (e) => {
      const p = pos(e);
      this.taps.push(p);
      this.pointer = { x: p.x, y: p.y, down: true };
      if (this.onGesture) this.onGesture();
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => { const p = pos(e); this.pointer.x = p.x; this.pointer.y = p.y; });
    const up = () => { this.pointer.down = false; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { this.pointer.x = -99; this.pointer.y = -99; this.pointer.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (!e.repeat) this.pressed.push(e.key);
      this.keys.add(e.key);
      if (this.onGesture) this.onGesture();
      if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key));
  }
  over(x, y, w, h) { const p = this.pointer; return p.x >= x && p.x < x + w && p.y >= y && p.y < y + h; }
  /** True if a tap landed in the box this frame (and consumes it). */
  tapIn(x, y, w, h) {
    for (let i = 0; i < this.taps.length; i++) {
      const t = this.taps[i];
      if (t.x >= x && t.x < x + w && t.y >= y && t.y < y + h) { this.taps.splice(i, 1); return true; }
    }
    return false;
  }
  wasPressed(key) { return this.pressed.includes(key); }
  endFrame() { this.taps.length = 0; this.pressed.length = 0; }
}

/** Rounded-corner pixel panel. */
export function panel(ctx, x, y, w, h, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = o.fill || 'rgba(8,14,46,0.8)';
  ctx.fillRect(x + 2, y, w - 4, 1);
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
  ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
  const b = o.border === undefined ? 'rgba(160,190,255,0.42)' : o.border;
  if (b) {
    ctx.fillStyle = b;
    ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
    ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1);
    ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
  }
}

const KINDS = {
  red: { body: '#c8343c', hi: '#ee6468', lo: '#8a1f2c', text: '#ffffff' },
  green: { body: '#2f9a5c', hi: '#5cc884', lo: '#1c6a3e', text: '#ffffff' },
  blue: { body: '#2a3f86', hi: '#4c66b8', lo: '#18265a', text: '#dfe9ff' },
  gold: { body: '#e2a93a', hi: '#ffd978', lo: '#a06e1c', text: '#3a2408' },
  ghost: { body: 'rgba(12,20,60,0.7)', hi: 'rgba(160,190,255,0.5)', lo: 'rgba(160,190,255,0.25)', text: '#c9d8ff' },
};

/** Draws a button and returns true when it was tapped this frame. */
export function button(ctx, input, x, y, w, h, label, o = {}) {
  x = Math.round(x); y = Math.round(y);
  const k = KINDS[o.kind || 'red'];
  const hit = input.tapIn(x, y, w, h);
  const down = input.pointer.down && input.over(x, y, w, h);
  const dy = down ? 1 : 0;
  ctx.fillStyle = k.lo;
  ctx.fillRect(x + 1, y + 2, w - 2, h - 2);
  ctx.fillRect(x, y + 3, w, h - 4);
  ctx.fillStyle = k.body;
  ctx.fillRect(x + 1, y + dy, w - 2, h - 2);
  ctx.fillRect(x, y + 1 + dy, w, h - 4);
  ctx.fillStyle = k.hi;
  ctx.fillRect(x + 2, y + 1 + dy, w - 4, 1);
  if (o.selected) {
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(x + 1, y - 2, w - 2, 1); ctx.fillRect(x + 1, y + h + 1, w - 2, 1);
    ctx.fillRect(x - 2, y + 1, 1, h - 2); ctx.fillRect(x + w + 1, y + 1, 1, h - 2);
  }
  const scale = o.scale || 1;
  drawText(ctx, label, x + w / 2, y + dy + Math.floor((h - 2 - 7 * scale) / 2), { align: 'center', scale, color: k.text, shadow: o.kind === 'gold' ? null : 'rgba(0,0,0,0.35)' });
  return hit;
}

/** Horizontal meter. */
export function meter(ctx, x, y, w, h, frac, fill, back = 'rgba(8,14,46,0.8)') {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * Math.max(0, Math.min(1, frac))), h - 2);
}

export { W, H };
