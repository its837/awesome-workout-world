// WHO RIDES HERE -- the family. THIS ONE IS THE STARTER: just one person, NERD, so the game has
// somebody in it the first time you run it. The game draws dashed outlines for everybody who
// is not here yet. To fill them in, have a FAMILY MEETING: point your AI at
// docs/FAMILY_MEETING.md and it asks about your people, pets and in-jokes, then writes
// family/profiles.js for you. (Or edit by hand.)
// Your own family lives in family/profiles.js (a folder next to web/ that is left out of the
// repository). When that file is there, the game uses it instead of this one.
//
//   name    shown on the home screen (keep it short; it is drawn in capitals)
//   photo   optional. Drop a picture in the web/photos/ folder and put its file name
//           here, e.g. photo: 'sam.jpg'. A roughly square, face-centred photo works
//           best. It replaces the drawn face in the round portrait.
//   jacket  the colour of this person's on-screen rider: [red, green, blue], 0-255
//   look    how they are drawn (all optional; colours are [red, green, blue]):
//             height:  in centimetres (183 is six foot)
//             build:   'slim' | 'medium' | 'broad'
//             skin, hair, eyes, pants: colours. hair may also be a name:
//                      'brown' | 'blonde' | 'red' | 'black' | 'gray' | 'auburn'
//             style:   'bald' | 'buzz' | 'short' | 'bob' | 'shoulder' | 'long' | 'pony' | 'bun' | 'braids'
//             curly: true, fringe: true, freckles: true
//             face:    'round' | 'oval' | 'long' | 'square'
//             beard:   'stubble' | 'short' | 'full' | 'moustache'   (beardCol: its colour, if not the hair's)
//             glasses: 'round' | 'square' | 'sun'
//             hat:     'santa' | 'beanie' | 'cap' | 'none'   (hatCol: a beanie's or cap's colour; capMark: 'B' puts that letter on a cap, markCol its colour)
//             species: 'dog' | 'frog'   (everyone else is a person)
//             breed:   'mastiff' | 'lab'   (for dogs), and coat: { fur, furD, head, ear, paw, mask, chin, stripe, blaze, patch }
//                      to change a dog's colours
//             poop:    for a dog, how often it has to stop next to another dog (1 is usual, 3 is a lot)
//   dog     optional. The id of a dog (below) that stays closer when this person rides.
//   arrives optional. 'MM-DD': the day somebody gets here. They are behind that day's door
//           on the advent calendar ('join:0' in src/gifts.js): they join the
//           welcome screen, the map and the calendar when somebody opens it, or the next
//           day at the latest. Their mile a day counts from the day after they arrive.
//   unlockedBy  optional, for a dog: it joins the family once every person in this list
//           has opened its door on the advent calendar. Nobody rides as a dog: a dog runs
//           along on people's rides and earns miles (and poop breaks) of its own.
//   story   optional, a few words shown on a dog's door: 'ARRIVED BY SLEIGH'.
//   quip    optional, for a dog: what its door says when it opens: 'DID SOMEBODY SAY RUN?'
//   tester  optional. true for the one person who is the DEV: they see the DEV buttons (open any
//           door, set off any thing, for testing) on their own calendar and their own rides.
//           Nobody else ever sees them. Nobody marked as the dev means no DEV buttons at all.
//
// The entry marked guest: true is for visitors; its rides are not saved.
export const PROFILES = [
  {id: 'nerd', name: 'NERD', photo: '', jacket: [60, 150, 220], look: {height: 178, hair: 'brown', style: 'short', glasses: 'round', hat: 'beanie', hatCol: [220, 70, 60]}, tester: true},
  {id: 'guest', name: 'GUEST', photo: '', jacket: [244, 196, 60], look: {species: 'frog'}, guest: true},
  // ...and here is how the rest of a family looks (a dog; somebody who arrives for the holidays):
  // {id: 'waffle', name: 'WAFFLE', photo: '', jacket: [46, 132, 82], look: {species: 'dog', breed: 'mastiff', poop: 3}, quip: 'HOLD ON. HE HAS TO GO. AGAIN.', unlockedBy: ['nerd']},
  // {id: 'nana', name: 'NANA', photo: '', jacket: [56, 186, 176], look: {height: 158, hair: 'gray', style: 'bun', glasses: 'round'}, arrives: '12-09'},
];
