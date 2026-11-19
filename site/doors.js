// The doors on the website: knock, and the door opens, and whatever lives behind it pops out.
//
// This is the game's OWN door show (play/src/door.js: the card drops in, three knocks, the door
// swings open, light pours out, the thing pops out in a burst of confetti, and says its line),
// drawn on one small canvas. Nothing of the game itself runs: no ride, no home screen, nothing to
// play. The card goes by itself after a few seconds, or when it is tapped.
//
// index.html asks for it with window.peekDoor(n) (n is the door number, 1 to 30).
import { Season } from './play/src/camp.js';
import { doorCard, stepDoor, drawDoor, closeDoor, doorBox } from './play/src/door.js';
import { W, H } from './play/src/config.js';
import { PROFILES } from './play/profiles.js';

// The calendar the page talks about starts on Thanksgiving 2026. Whatever day it really is, the
// show is told it is the 4th of December of that season, so the dates on the doors never move.
const store = { settings: { seasonStart: '', dayOffset: 0, gifts: true }, data: { rides: [] }, get rides() { return this.data.rides; }, clearRides() { this.data.rides = []; }, save() {} };
const season = new Season(store, PROFILES);
store.settings.dayOffset = Math.round((new Date(2026, 11, 4) - new Date()) / 864e5);

const dlg = document.getElementById('peek'), cv = document.getElementById('peekcanvas');
const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const box = doorBox(), MARGIN = 0;
cv.width = box.w + MARGIN * 2; cv.height = box.h + MARGIN * 2;
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const stage = document.createElement('canvas');            // the card is drawn the size of the game's screen, then the card itself is cut out
stage.width = W; stage.height = H;
const sg = stage.getContext('2d');
sg.imageSmoothingEnabled = false;

let card = null, raf = 0, last = 0, shownAt = 0;
function frame(now) {
  if (!card) return;
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  const going = stepDoor(card, dt, null);
  sg.clearRect(0, 0, W, H);
  drawDoor(sg, card, PROFILES, now / 1000);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(stage, box.x - MARGIN, box.y - MARGIN, cv.width, cv.height, 0, 0, cv.width, cv.height);
  if (!going) { stop(); return; }
  raf = requestAnimationFrame(frame);
}
function stop() {
  cancelAnimationFrame(raf); raf = 0; card = null;
  if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
}

/** Open door n (1 to 30) and play its show. */
window.peekDoor = function (n) {
  card = doorCard(season, n, PROFILES, null);
  shownAt = performance.now();
  if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  if (still) {                                              // no motion asked for: the finished card, held still
    card.t = 4.6;
    sg.clearRect(0, 0, W, H);
    drawDoor(sg, card, PROFILES, 4.6);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(stage, box.x - MARGIN, box.y - MARGIN, cv.width, cv.height, 0, 0, cv.width, cv.height);
    return;
  }
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
};

// A tap anywhere (the card, or the dark around it) winds the show up, as it does in the game.
// (Not in the first moment, so the second click of a double-click does not shut it.)
dlg.addEventListener('click', () => {
  if (!card || still) { stop(); return; }
  if (performance.now() - shownAt < 700) return;
  closeDoor(card);
});
dlg.addEventListener('close', () => { cancelAnimationFrame(raf); raf = 0; card = null; });
