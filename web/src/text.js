// Shared wording: ride names and Santa's greeting.
import { daysToChristmas } from './util.js';
import { TWEAKS } from '../tweaks.js';

// The thing the family is doing together. The name and the line under it can be changed
// in the studio (saved as TWEAKS.event). goalMiles 0 means "a mile a day each".
export const EVENT = Object.assign({
  name: 'THE MERRY MILE-A-THON',
  tagline: 'A MILE A DAY, THANKSGIVING TO CHRISTMAS. LET\'S ALL GET HOME TOGETHER.',
  goalMiles: 0,
}, TWEAKS.event || {});

export const RIDES = {
  bike: { name: 'MOONLIGHT SINGLETRACK', short: 'FAT BIKE', blurb: 'FAT BIKE THROUGH THE SNOWY PINES', go: 'START PEDALING!' },
  tread: { name: 'DAWN PATROL', short: 'SKIN TRACK', blurb: 'SKIN UP THE MOUNTAIN FOR SUNRISE', go: 'START WALKING!' },
};

// Things to watch and listen to. On the tablet the shell opens the installed app if there is
// one (the app has to be on the tablet already: Peloton has no app store, so people add one
// themselves, see docs/INSTALL.md); in a desktop browser the website opens in a new tab.
// Which of them are on the home page is `home` in family.js (nothing by default).
// The last three are made up, for the website's demo: they open nothing and say so.
export const SERVICES = [
  { key: 'youtube', name: 'YOUTUBE', sub: 'WATCH', color: '#d8343c', url: 'https://www.youtube.com/' },
  { key: 'netflix', name: 'NETFLIX', sub: 'WATCH', color: '#8e1420', url: 'https://www.netflix.com/' },
  { key: 'hulu', name: 'HULU', sub: 'WATCH', color: '#1d9a63', url: 'https://www.hulu.com/' },
  { key: 'music', name: 'MUSIC', sub: 'LISTEN', color: '#1c9a52', url: 'https://open.spotify.com/', music: true },
  { key: 'video', name: 'VIDEO APP', sub: 'WATCH', color: '#3d7bd8', demo: true },
  { key: 'shows', name: 'SHOWS APP', sub: 'WATCH', color: '#9b4fd0', demo: true },
  { key: 'tunes', name: 'MUSIC APP', sub: 'LISTEN', color: '#2fa8a0', demo: true, music: true },
];

export function countdownLine(days) {
  if (days === 0) return 'MERRY CHRISTMAS!';
  if (days === 1) return "IT'S CHRISTMAS EVE!";
  return `${days} DAYS TO CHRISTMAS`;
}

/** What everybody says on Thanksgiving (the Australians have been told this is traditional). */
export const THANKSGIVING = { line: 'HAPPY THANKSGIVING!', say: 'GOBBLE GOBBLE!' };

/** What Santa says when a ride starts. holiday: 'thanksgiving' on the day. */
export function greetingFor(name, now = new Date(), holiday = '') {
  const days = daysToChristmas(now);
  const said = name.charAt(0) + name.slice(1).toLowerCase();
  let line, spoken;
  if (holiday === 'thanksgiving') return { line: `HAPPY THANKSGIVING, ${name}!`, spoken: `Happy Thanksgiving, ${said}! Gobble gobble!`, extra: 'GOBBLE GOBBLE! (THAT IS WHAT YOU SAY.)' };
  if (days === 0) { line = `MERRY CHRISTMAS, ${name}!`; spoken = `Merry Christmas, ${said}!`; }
  else if (days === 1) { line = `IT'S CHRISTMAS EVE, ${name}!`; spoken = `It's Christmas Eve, ${said}!`; }
  else { line = `${days} DAYS TO CHRISTMAS, ${name}!`; spoken = `${days} days to Christmas, ${said}!`; }
  let extra = '';
  if (now.getHours() < 5) extra = 'UP LATE WAITING FOR ME?';
  else if (now.getMonth() === 11 && now.getDate() > 25) extra = 'SAME TIME NEXT YEAR?';
  else if (now.getMonth() === 11 && now.getDate() === 24) extra = "I'M PACKING THE SLEIGH!";
  return { line, spoken, extra };
}
