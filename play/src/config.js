// Shared constants. Everything is drawn into a small internal canvas and scaled up
// with nearest-neighbour, which is where the chunky-pixel look comes from.
// 640 wide x3 = 1920, the width of every Peloton tablet.

// The tablet's home page and the riding game that lives inside it. (The home page was
// called Basecamp until the first evening on a real tablet, 17 November 2026.)
export const HOME_NAME = 'AWESOME WORKOUT WORLD';
export const HOME_SHORT = 'HOME';        // for the small buttons that lead back to it
export const APP_NAME = 'MERRY MILES';
export const VERSION = '0.11.0';

export const W = 640;
// Height follows the screen's aspect ratio (the original Bike tablet only gives apps
// 1920x1008, the others 1920x1080), so layout code must read H at draw time.
export let H = 360;
export function setViewHeight(h) { H = h; }

// --- Trail camera ---------------------------------------------------------
export const SEG = 1.5;          // metres per trail segment
export const DRAW_SEGS = 132;    // ~200 m draw distance
export const FOCAL = 300;        // focal length in pixels
export const HORIZON = 132;      // screen row of the level horizon
export const CAM_H = 2.4;        // camera height above the trail, metres
export const RIDER_DIST = 7.0;   // how far ahead of the camera the rider sits
export const TRAIL_HW = 0.75;    // half-width of the groomed track, metres
// (how far you can see, and how many trees there are, now live in detail.js)

// --- Feel -----------------------------------------------------------------
export const MPH_TO_MPS = 0.44704;
// Scenery moves a bit faster than real speed so walking pace still feels alive.
export const VISUAL_SPEED = { bike: 1.0, tread: 1.7 };
