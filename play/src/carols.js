// The songbook, written out as notes and played by the built-in synth (audio.js), so no
// recordings are needed. Two kinds of tune live here:
//   - traditional, public-domain carols;
//   - tunes written for this game (marked `original: true`). Each of those borrows a
//     musical STYLE (1980s synth-pop, big bouncy 1960s-style pop, 1950s rock and roll,
//     1960s "Ameriachi" brass) but the melodies are our own: none of them quotes an
//     existing song.
//
// melody: NOTE[:beats] tokens, 1 beat if omitted. R = rest. "|" marks bars and is ignored.
// chords: one entry per bar; "C,G" means two chords sharing the bar.
// transpose: semitones applied to everything (keeps each tune in a nice bell range).
// voices: which lead instruments suit the tune (one is picked at random each time it
//         plays): 'bell' music box, 'glock' high chimes, 'chip' retro square wave, 'flute',
//         'synth' 1980s lead, 'twang' 1950s guitar, 'sax', 'brass' a pair of 1960s trumpets
//         (the second one follows the melody a third below, fitted to the chords), 'toot' one
//         trumpet whose notes below the G under middle C come out as raspberries.
// style:  leave out for the carols' music-box backing. 'synthpop', 'shuffle', 'rock',
//         'chacha' or 'twostep' adds a rhythm section (see Sound._band). The last two are
//         the same 1960s brass band's rhythm players: two-beat bass, off-beat nylon guitar,
//         maracas and congas for the cha-cha, an oom-pah with a rim click for the two-step.
//         'bush' is an Australian bush band: a didgeridoo drone, clapsticks, a lagerphone,
//         a bouncing bass and the odd wobble board.
//         swing: true plays the off-beats late.
// Two of the tunes belong to the family's dogs and are named after them: the first dog in
// profiles.js gets the cha-cha, the second the two-step. (No dog: the tune keeps a name of its own.)
import { PROFILES } from '../profiles.js';
const DOGS = PROFILES.filter((p) => p.look && p.look.species === 'dog');
const dogSong = (n, title, plain) => (DOGS[n] ? title(DOGS[n].name) : plain);

export const CAROLS = [
  {
    title: 'JINGLE BELLS', voices: ['bell', 'chip', 'glock'], bpm: 116, meter: 4, transpose: 0,
    melody: `
      G4 E5 D5 C5 | G4:3 G4:.5 G4:.5 | G4 E5 D5 C5 | A4:4 | A4 F5 E5 D5 | B4:4 | G5 G5 F5 D5 | E5:4 |
      G4 E5 D5 C5 | G4:4 | G4 E5 D5 C5 | A4:3 A4 | A4 F5 E5 D5 | G5 G5 G5 G5 | A5 G5 F5 D5 | C5:2 G5:2 |
      E5 E5 E5:2 | E5 E5 E5:2 | E5 G5 C5:1.5 D5:.5 | E5:4 | F5 F5 F5:1.5 F5:.5 | F5 E5 E5 E5:.5 E5:.5 | E5 D5 D5 E5 | D5:2 G5:2 |
      E5 E5 E5:2 | E5 E5 E5:2 | E5 G5 C5:1.5 D5:.5 | E5:4 | F5 F5 F5:1.5 F5:.5 | F5 E5 E5 E5:.5 E5:.5 | G5 G5 F5 D5 | C5:4`,
    chords: `C C C F | F G G7 C | C C C F | F C G7 C,G7 | C C C C | F C D7 G7 | C C C C | F C G7 C`,
  },
  {
    title: 'DECK THE HALLS', voices: ['bell', 'chip', 'flute'], bpm: 120, meter: 4, transpose: 0,
    melody: `
      G5:1.5 F5:.5 E5 D5 | C5 D5 E5 C5 | D5:.5 E5:.5 F5:.5 D5:.5 E5:1.5 D5:.5 | C5 B4 C5:2 |
      G5:1.5 F5:.5 E5 D5 | C5 D5 E5 C5 | D5:.5 E5:.5 F5:.5 D5:.5 E5:1.5 D5:.5 | C5 B4 C5:2 |
      D5:1.5 E5:.5 F5 D5 | E5:1.5 F5:.5 G5 D5 | E5:.5 F#5:.5 G5 A5:.5 B5:.5 C6 | B5 A5 G5:2 |
      G5:1.5 F5:.5 E5 D5 | C5 D5 E5 C5 | A5:.5 A5:.5 A5:.5 A5:.5 G5:1.5 F5:.5 | E5 D5 C5:2`,
    chords: `C C G7,C G7,C | C C G7,C G7,C | G7 C C,D7 G | C C F,C G7,C`,
  },
  {
    title: 'WE WISH YOU A MERRY CHRISTMAS', voices: ['bell', 'chip', 'glock'], bpm: 132, meter: 3, transpose: 0,
    melody: `
      R:2 G4 |
      C5 C5:.5 D5:.5 C5:.5 B4:.5 | A4 A4 A4 | D5 D5:.5 E5:.5 D5:.5 C5:.5 | B4 G4 G4 |
      E5 E5:.5 F5:.5 E5:.5 D5:.5 | C5 A4 G4:.5 G4:.5 | A4 D5 B4 | C5:2 G4 |
      C5 C5 C5 | B4:2 B4 | C5 B4 A4 | G4:2 D5 | E5 D5 C5 | G5 G4 G4:.5 G4:.5 | A4 D5 B4 | C5:3`,
    chords: `C | C F D7 G | E7 Am G7 C | C G Am G | C C G7 C`,
  },
  {
    title: 'JOY TO THE WORLD', voices: ['bell', 'flute', 'chip'], bpm: 108, meter: 4, transpose: 5,
    melody: `
      C5:2 B4:1.5 A4:.5 | G4:3 F4 | E4:2 D4:2 | C4:3 G4 | A4:3 A4 | B4:3 B4 | C5:3 C5 |
      C5 B4 A4 G4 | G4:1.5 F4:.5 E4 C5 | C5 B4 A4 G4 | G4:1.5 F4:.5 E4 E4 |
      E4 E4 E4 E4:.5 F4:.5 | G4:3 F4:.5 E4:.5 | D4 D4 D4 D4:.5 E4:.5 | F4:3 E4:.5 D4:.5 |
      C4 C5:2 A4 | G4:1.5 F4:.5 E4 F4 | E4:2 D4:2 | C4:4`,
    chords: `C C,G7 C,G7 C F G C | C G7,C C G7,C | C C G7 G7 | C,F C,G7 C,G7 C`,
  },
  {
    title: 'SILENT NIGHT', voices: ['bell', 'flute'], bpm: 84, meter: 3, transpose: 5,
    melody: `
      G4:1.5 A4:.5 G4 | E4:3 | G4:1.5 A4:.5 G4 | E4:3 | D5:2 D5 | B4:3 | C5:2 C5 | G4:3 |
      A4:2 A4 | C5:1.5 B4:.5 A4 | G4:1.5 A4:.5 G4 | E4:3 | A4:2 A4 | C5:1.5 B4:.5 A4 | G4:1.5 A4:.5 G4 | E4:3 |
      D5:2 D5 | F5:1.5 D5:.5 B4 | C5:3 | E5:3 | C5:1.5 G4:.5 E4 | G4:1.5 F4:.5 D4 | C4:3 | R:3`,
    chords: `C C C C G7 G7 C C | F F C C F F C C | G7 G7 C C C G7 C C`,
  },
  {
    title: 'GOOD KING WENCESLAS', voices: ['bell', 'chip', 'glock'], bpm: 122, meter: 4, transpose: 0,
    melody: `
      C5 C5 C5 D5 | C5 C5 G4:2 | A4 G4 A4 B4 | C5:2 C5:2 |
      C5 C5 C5 D5 | C5 C5 G4:2 | A4 G4 A4 B4 | C5:2 C5:2 |
      G5 F5 E5 D5 | E5 D5 C5:2 | A4 G4 A4 B4 | C5:2 C5:2 |
      G4 G4 A4 B4 | C5 C5 D5:2 | G5 F5 E5 D5 | C5:2 F5:2 | C5:4`,
    chords: `C C F,G7 C | C C F,G7 C | C,G7 C F,G7 C | G7 C,G7 C,G7 C,F | C`,
  },
  {
    title: 'HARK! THE HERALD ANGELS SING', voices: ['bell', 'flute', 'glock'], bpm: 112, meter: 4, transpose: 0,
    melody: `
      G4 C5 C5:1.5 B4:.5 | C5 E5 E5 D5 | G5 G5 G5:1.5 F5:.5 | E5 D5 E5:2 |
      G4 C5 C5:1.5 B4:.5 | C5 E5 E5 D5 | G5 D5 D5:1.5 B4:.5 | B4 A4 G4:2 |
      G5 G5 G5 C5 | F5 E5 E5 D5 | G5 G5 G5 C5 | F5 E5 E5 D5 |
      A5 A5 A5 G5 | F5 E5 F5:2 | D5 E5:.5 F5:.5 G5:1.5 C5:.5 | C5 D5 E5:2 |
      A5:1.5 A5:.5 A5 G5 | F5 E5 F5:2 | D5 E5:.5 F5:.5 G5:1.5 C5:.5 | C5 D5 C5:2`,
    chords: `C C C G7,C | C C G D7,G | C F,C C F,C | F F G7,C C | F F G7,C C`,
  },
  {
    title: 'ANGELS WE HAVE HEARD ON HIGH', voices: ['bell', 'flute', 'chip'], bpm: 116, meter: 4, transpose: 0,
    melody: `
      E5 E5 E5 G5 | G5:1.5 F5:.5 E5:2 | E5 D5 E5 G5 | E5:1.5 D5:.5 C5:2 |
      E5 E5 E5 G5 | G5:1.5 F5:.5 E5:2 | E5 D5 E5 G5 | E5:1.5 D5:.5 C5:2 |
      G5:2 A5:.5 G5:.5 F5:.5 E5:.5 | F5:2 G5:.5 F5:.5 E5:.5 D5:.5 | E5:2 F5:.5 E5:.5 D5:.5 C5:.5 | D5:3 G4 | C5 D5 E5 F5 | E5:2 D5:2 |
      G5:2 A5:.5 G5:.5 F5:.5 E5:.5 | F5:2 G5:.5 F5:.5 E5:.5 D5:.5 | E5:2 F5:.5 E5:.5 D5:.5 C5:.5 | D5:3 G4 | C5 D5 E5 F5 | E5:2 D5:2 | C5:4`,
    chords: `C G7,C C G7,C | C G7,C C G7,C | C F,G7 C G7 C,F C,G7 | C F,G7 C G7 C,F C,G7 C`,
  },
  {
    title: 'THE FIRST NOEL', voices: ['bell', 'flute'], bpm: 100, meter: 3, transpose: -3,
    melody: `
      R:2 E5:.5 D5:.5 |
      C5:1.5 D5:.5 E5:.5 F5:.5 | G5:2 A5:.5 B5:.5 | C6 B5 A5 | G5:2 A5:.5 B5:.5 | C6 B5 A5 | G5 A5 B5 | C6 G5 F5 | E5:2 E5:.5 D5:.5 |
      C5:1.5 D5:.5 E5:.5 F5:.5 | G5:2 A5:.5 B5:.5 | C6 B5 A5 | G5:2 A5:.5 B5:.5 | C6 B5 A5 | G5 A5 B5 | C6 G5 F5 | E5:2 E5:.5 D5:.5 |
      C5:1.5 D5:.5 E5:.5 F5:.5 | G5:2 C6:.5 B5:.5 | A5:2 A5 | G5:3 | C6 B5 A5 | G5 A5 B5 | C6 G5 F5 | E5:3`,
    chords: `C | C C F C F G7 C C | C C F C F G7 C C | C C F C F G7 C C`,
  },
  {
    title: 'O CHRISTMAS TREE', voices: ['bell', 'chip', 'flute'], bpm: 104, meter: 3, transpose: 0,
    melody: `
      R:2 G4 |
      C5:.75 C5:.25 C5 D5 | E5:.75 E5:.25 E5:1.5 E5:.5 | D5:.5 E5:.5 F5 B4 | D5 C5 G4 |
      C5:.75 C5:.25 C5 D5 | E5:.75 E5:.25 E5:1.5 E5:.5 | D5:.5 E5:.5 F5 B4 | D5 C5 R:.5 G5:.5 |
      G5:.5 E5:.5 A5:1.5 G5:.5 | G5:.5 F5:.5 F5:1.5 F5:.5 | F5:.5 D5:.5 G5:1.5 F5:.5 | F5:.5 E5:.5 E5 G4 |
      C5:.75 C5:.25 C5 D5 | E5:.75 E5:.25 E5:1.5 E5:.5 | D5:.5 E5:.5 F5 B4 | D5 C5:2`,
    chords: `C | C C G7 C | C C G7 C | C G7 G7 C | C C G7 C`,
  },
  {
    title: 'CAROL OF THE BELLS', voices: ['bell', 'glock', 'chip'], bpm: 168, meter: 3, transpose: 0,
    melody: `
      Bb4 A4:.5 Bb4:.5 G4 | Bb4 A4:.5 Bb4:.5 G4 | Bb4 A4:.5 Bb4:.5 G4 | Bb4 A4:.5 Bb4:.5 G4 |
      D5 C5:.5 D5:.5 Bb4 | D5 C5:.5 D5:.5 Bb4 | D5 C5:.5 D5:.5 Bb4 | D5 C5:.5 D5:.5 Bb4 |
      G5 F5:.5 G5:.5 D5 | G5 F5:.5 G5:.5 D5 | G5 F5:.5 G5:.5 D5 | G5 F5:.5 G5:.5 D5 |
      D5 C5:.5 D5:.5 Bb4 | D5 C5:.5 D5:.5 Bb4 | D5 C5:.5 D5:.5 Bb4 | D5 C5:.5 D5:.5 Bb4 |
      Bb4 A4:.5 Bb4:.5 G4 | Bb4 A4:.5 Bb4:.5 G4 | Bb4 A4:.5 Bb4:.5 G4 | G4:3`,
    chords: `Gm F Eb D5 | Gm F Eb D5 | Gm F Eb D5 | Gm F Eb D5 | Gm F Eb Gm`,
  },
  {
    // 1980s synth-pop: drum machine, bouncing bass, a held pad and a soft synth lead
    title: 'NEON SNOWFALL', original: true, style: 'synthpop', voices: ['synth', 'bell'], bpm: 108, meter: 4, transpose: 0,
    melody: `
      R:.5 E5:.5 G5:.5 E5 D5:.5 C5 | D5:2.5 R:.5 B4:.5 D5:.5 | R:.5 C5:.5 E5:.5 C5 B4:.5 A4 | C5:3 R |
      R:.5 E5:.5 G5:.5 C6 B5:.5 G5 | A5:1.5 G5:.5 D5:2 | R:.5 F5:.5 A5:.5 G5 F5:.5 E5 | D5:3 R |
      R:.5 E5:.5 G5:.5 E5 D5:.5 C5 | D5:2.5 R:.5 B4:.5 D5:.5 | R:.5 C5:.5 E5:.5 C5 B4:.5 A4 | C5:3 R |
      R:.5 E5:.5 G5:.5 C6 B5:.5 G5 | A5:1.5 G5:.5 D5:2 | R:.5 F5:.5 A5:.5 G5 E5:.5 D5 | C5:3 R |
      A5:1.5 A5:.5 C6 A5 | G5:1.5 G5:.5 B5 G5 | G5 E5:.5 G5:.5 B5:2 | A5:3 R |
      A5:1.5 A5:.5 C6 A5 | G5:1.5 G5:.5 D6 B5 | C6:2 G5 E5 | E5:.5 D5:.5 C5:3`,
    chords: `C G Am F | C G F G | C G Am F | C G F,G C | F G Em Am | F G C C`,
  },
  {
    // big bouncy 1960s-style pop: swung, piano pounding the chords, sleigh bells on every eighth
    title: 'SLEIGH BELL SHUFFLE', original: true, style: 'shuffle', swing: true, voices: ['glock', 'bell', 'chip'], bpm: 150, meter: 4, transpose: 0,
    melody: `
      G4:.5 C5:.5 E5 G5 E5 | A5:1.5 G5:.5 E5:2 | F5:.5 A5:.5 C6 A5 F5 | Ab5:1.5 G5:.5 F5:2 |
      E5:.5 G5:.5 C6 G5 E5 | A5 E5:.5 C5:.5 A4:2 | D5:.5 F5:.5 A5 F5 D5 | G5:2 B5 D6 |
      G4:.5 C5:.5 E5 G5 E5 | A5:1.5 G5:.5 E5:2 | F5:.5 A5:.5 C6 A5 F5 | Ab5:1.5 G5:.5 F5:2 |
      E5:.5 G5:.5 C6 G5 E5 | A5 E5:.5 C5:.5 A4:2 | D5:.5 F5:.5 A5 G5 B4 | C5:3 R |
      C6 C6:.5 A5:.5 F5 A5 | B5 B5:.5 G5:.5 D5 G5 | G5 G5:.5 E5:.5 B4 E5 | A5:3 R |
      C6 C6:.5 A5:.5 F5 A5 | C6 Ab5:.5 F5:.5 Ab5:2 | G5 A5 B5 C6 | D6:2 R:2 |
      G4:.5 C5:.5 E5 G5 E5 | A5:1.5 G5:.5 E5:2 | F5:.5 A5:.5 C6 A5 F5 | Ab5:1.5 G5:.5 F5:2 |
      E5:.5 G5:.5 C6 G5 E5 | A5 E5:.5 C5:.5 A4:2 | D5:.5 F5:.5 A5 G5 B4 | C5:3 R`,
    chords: `C Am F Fm | C Am Dm G7 | C Am F Fm | C Am Dm,G7 C | F G Em Am | F Fm G G7 | C Am F Fm | C Am Dm,G7 C`,
  },
  {
    // 1950s rock and roll: a twelve-bar blues, swung, with a walking bass and a backbeat
    title: 'ROOFTOP BOOGIE', original: true, style: 'rock', swing: true, voices: ['twang', 'sax'], bpm: 144, meter: 4, transpose: 0,
    melody: `
      G5:.5 G5:.5 E5 G5 A5 | G5:2 R:.5 Eb5:.5 E5 | G5:.5 G5:.5 E5 G5 A5 | C6:2 R:2 |
      A5:.5 A5:.5 F5 A5 C6 | A5:2 R:.5 Ab5:.5 A5 | G5:.5 G5:.5 E5 G5 A5 | G5:2 R:2 |
      B5 B5 D6:.5 B5:.5 G5 | A5 A5 C6:.5 A5:.5 F5 | G5:.5 E5:.5 C5 E5:.5 G5:.5 C6 | R G5 G5 G5:.5 G5:.5 |
      C6:.5 C6:.5 A5 G5 E5 | G5:1.5 A5:.5 G5:2 | C6:.5 C6:.5 A5 G5 E5 | C5:2 R Bb4:.5 B4:.5 |
      C5 F5 A5 F5 | Eb5:1.5 D5:.5 C5:2 | C6:.5 C6:.5 A5 G5 E5 | G5:2 R:2 |
      D6 B5 G5 B5 | C6 A5 F5 A5 | G5 E5:.5 G5:.5 C6:2 | R:2 G5 B5 |
      G5:.5 G5:.5 E5 G5 A5 | G5:2 R:.5 Eb5:.5 E5 | G5:.5 G5:.5 E5 G5 A5 | C6:2 R:2 |
      A5:.5 A5:.5 F5 A5 C6 | A5:2 R:.5 Ab5:.5 A5 | G5:.5 G5:.5 E5 G5 A5 | G5:2 R:2 |
      B5 B5 D6:.5 B5:.5 G5 | A5 A5 C6:.5 A5:.5 F5 | G5:.5 E5:.5 C5 E5:.5 G5:.5 C6 | C6:.5 R:.5 C6:.5 R:.5 C5:2`,
    chords: `C7 C7 C7 C7 | F7 F7 C7 C7 | G7 F7 C7 G7 | C7 C7 C7 C7 | F7 F7 C7 C7 | G7 F7 C7 G7 | C7 C7 C7 C7 | F7 F7 C7 C7 | G7 F7 C7 C`,
  },
  {
    // 1960s "Ameriachi" brass-band pop: two trumpets in thirds over a cha-cha (maracas, congas,
    // off-beat nylon guitar), a brush of the minor in the middle and a held high note to come back on
    title: dogSong(0, (name) => `${name}'S CHA-CHA`, "THE GOOD DOG CHA-CHA"), original: true, style: 'chacha', voices: ['brass'], bpm: 124, meter: 4, transpose: -4,
    melody: `
      E5 G5 R C6:.5 C6:.5 | A5 G5:.5 E5:.5 G5 R | F5 A5 R D6:.5 D6:.5 | B5 A5:.5 F5:.5 G5 R |
      E5 G5 R C6:.5 C6:.5 | A5 G5:.5 E5:.5 C6 A5 | F5 A5 D6 B5:.5 B5:.5 | C6 R:3 |
      E5 G5 R C6:.5 C6:.5 | A5 G5:.5 E5:.5 G5 R | F5 A5 R D6:.5 D6:.5 | B5 A5:.5 F5:.5 G5 R |
      E5 G5 R C6:.5 C6:.5 | A5 G5:.5 E5:.5 C6 A5 | F5 A5 D6 B5:.5 B5:.5 | C6 R:3 |
      C6:1.5 A5:1.5 F5 | A5:3 R | C6:1.5 G5:1.5 E5 | G5:3 R |
      C6:1.5 Ab5:1.5 F5 | Ab5:2 F5:2 | G5:1.5 B5:1.5 C6 | D6:3 R |
      E5 G5 R C6:.5 C6:.5 | A5 G5:.5 E5:.5 G5 R | F5 A5 R D6:.5 D6:.5 | B5 A5:.5 F5:.5 G5 R |
      E5 G5 R C6:.5 C6:.5 | A5 G5:.5 E5:.5 C6 A5 | F5 A5 D6 B5:.5 B5:.5 | C6 R C6:.5 C6:.5 C6`,
    chords: `C C Dm G7 | C F Dm,G7 C,G7 | C C Dm G7 | C F Dm,G7 C,C7 | F F C C | Fm Fm G7 G7 | C C Dm G7 | C F Dm,G7 C`,
  },
  {
    // 1960s "Ameriachi" brass-band pop again, as a bouncy oom-pah two-step: trumpets in thirds,
    // bass on 1 and 3, guitar on 2 and 4, a bullring turn to the minor in the middle, then four
    // short stabs climbing back up to the tune
    title: dogSong(1, (name) => `THE ${name} TWO-STEP`, 'THE BAD DOG TWO-STEP'), original: true, style: 'twostep', voices: ['brass'], bpm: 144, meter: 4, transpose: -3,
    melody: `
      G5:.5 C6 B5:.5 G5:2 | F5:.5 B5 A5:.5 F5:2 | E5:.5 A5 G5:.5 E5:2 | D5:.5 G5 F5:.5 D5:2 |
      C6 R:.5 A5:.5 C6 R | G5 R:.5 E5:.5 G5 R | D5 G5:.5 A5:.5 B5:.5 C6:.5 D6 | C6 R:3 |
      G5:.5 C6 B5:.5 G5:2 | F5:.5 B5 A5:.5 F5:2 | E5:.5 A5 G5:.5 E5:2 | D5:.5 G5 F5:.5 D5:2 |
      C6 R:.5 A5:.5 C6 R | G5 R:.5 E5:.5 G5 R | D5 G5:.5 A5:.5 B5:.5 C6:.5 D6 | C6 R:3 |
      E5:.5 A5:.5 C6:3 | B5:.5 C6:.5 B5:.5 A5:.5 E5:2 | E5:.5 G#5:.5 B5:3 | A5:.5 B5:.5 A5:.5 G#5:.5 E5:2 |
      E5:.5 A5:.5 C6:3 | D6:.5 C6:.5 B5:.5 C6:.5 A5:2 | F#5:.5 R:1.5 A5:.5 R:1.5 | B5:.5 R:1.5 D6:.5 R:1.5 |
      G5:.5 C6 B5:.5 G5:2 | F5:.5 B5 A5:.5 F5:2 | E5:.5 A5 G5:.5 E5:2 | D5:.5 G5 F5:.5 D5:2 |
      C6 R:.5 A5:.5 C6 R | G5 R:.5 E5:.5 G5 R | D5 G5:.5 A5:.5 B5:.5 C6:.5 D6 | C6 G5:.5 G5:.5 C6 R`,
    chords: `C G7 C G7 | F C G7 C,G7 | C G7 C G7 | F C G7 C,E7 | Am Am E7 E7 | Am Am D7 G7 | C G7 C G7 | F C G7 C`,
  },
  {
    // The poop and fart holiday song. An oom-pah with a trumpet tune; every fourth bar the
    // trumpet stops and something lower answers (the low notes of the 'toot' voice).
    title: 'JINGLE SMELLS', original: true, style: 'twostep', voices: ['toot'], bpm: 132, meter: 4, transpose: 0,
    melody: `
      E5:.5 E5:.5 G5 C6 G5 | A5:.5 A5:.5 C6 A5 G5 | F5:.5 F5:.5 A5 G5 E5 | D5 R C3:2 |
      E5:.5 E5:.5 G5 C6 G5 | A5:.5 A5:.5 C6 D6 C6 | B5 A5 G5 B5 | C6 R G2:.5 C3:1.5 |
      F5 A5 C6:2 | E5 G5 C6:2 | D5 F5 A5 B5 | G5 R F3:.5 E3:.5 C3 |
      E5:.5 E5:.5 G5 C6 G5 | A5:.5 A5:.5 C6 D6 E6 | D6 C6 B5 D6 | C6 R C3:.5 C3:.5 G2`,
    chords: `C F F,C G7 | C F G7 C | F C Dm G7 | C F G7 C`,
  },
  {
    // The Australian one, for whoever flies in from there: a bush-band jig
    // over a didgeridoo. Christmas there is in summer, so it is about a barbecue.
    title: 'SNAGS ON THE BARBIE', original: true, style: 'bush', voices: ['flute', 'twang', 'chip'], bpm: 138, meter: 4, transpose: 2,
    melody: `
      G5:.5 A5:.5 C6 A5:.5 G5:.5 E5 | G5:.5 A5:.5 C6 D6:2 | E6:.5 D6:.5 C6 A5:.5 C6:.5 A5 | G5:3 R |
      G5:.5 A5:.5 C6 A5:.5 G5:.5 E5 | G5:.5 A5:.5 C6 E6:2 | D6:.5 E6:.5 D6:.5 C6:.5 A5 G5 | C6:3 R |
      E6 E6:.5 D6:.5 C6 A5 | C6 C6:.5 A5:.5 G5:2 | A5:.5 C6:.5 D6 E6:.5 D6:.5 C6 | D6:3 R |
      E6 E6:.5 D6:.5 C6 A5 | C6:.5 D6:.5 E6 G6:2 | E6:.5 D6:.5 C6 A5:.5 G5:.5 A5 | C6:3 R`,
    chords: `C C,G7 Am C | C C G7 C | C F,C F G7 | C C F,G7 C`,
  },
];

// The home page's own tune (Awesome Workout World). Asked for as "like the theme from that
// 1980s cop film": so it borrows the STYLE (a staccato synth lead hopping about over a drum
// machine and a bouncing bass, in a minor key) and nothing else. The melody is ours and
// quotes no existing tune. It loops for as long as the home page is up, and it is not in
// the songbook, so a ride never picks it.
export const HOME_THEME = {
  title: 'WORKOUT WORLD', original: true, style: 'synthpop', voices: ['synth'], bpm: 118, meter: 4, transpose: 0,
  melody: `
    A4:.5 R:.5 D5:.5 E5:.5 R:.5 F5:.5 E5:.5 D5:.5 | R:.5 A4:.5 D5:.5 F5:.5 A5 G5:.5 E5:.5 |
    F4:.5 R:.5 Bb4:.5 C5:.5 R:.5 D5:.5 C5:.5 Bb4:.5 | R:.5 G4:.5 C5:.5 E5:.5 G5 E5 |
    A4:.5 R:.5 D5:.5 E5:.5 R:.5 F5:.5 E5:.5 D5:.5 | R:.5 A4:.5 D5:.5 F5:.5 A5 C6:.5 A5:.5 |
    Bb5:.5 A5:.5 F5:.5 D5:.5 Bb4 D5:.5 F5:.5 | E5:1.5 C5:.5 C#5 E5 |
    A5 F5:.5 A5:.5 C6:1.5 A5:.5 | G5 E5:.5 G5:.5 C6 G5 |
    Bb5:.5 A5:.5 G5:.5 D5:.5 G5 Bb5 | A5:2 R:.5 E5:.5 C#5:.5 E5:.5 |
    A5 F5:.5 A5:.5 C6:1.5 D6:.5 | E6 C6:.5 G5:.5 E5 G5 |
    Bb5:.5 G5:.5 D5 C#5:.5 E5:.5 A5 | D5:.5 R:.5 D5:.5 R:.5 D6 R`,
  chords: `Dm Dm Bb C | Dm Dm Bb C,A | F C Gm A | F C Gm,A Dm`,
};
