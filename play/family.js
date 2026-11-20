// YOUR FAMILY'S OWN THINGS that are not a person or a dog (those are in profiles.js).
// Everything here is made up: it is the starter family. Change it to yours, or better, put
// your own copy in a folder called family/ next to web/ (family/family.js, family/profiles.js,
// family/tweaks.js). That folder is left out of the repository, and the game uses what is in
// it instead of these whenever it is there. See docs/YOUR_FAMILY.md.
export const FAMILY = {
  // The relative who flies in to say hello: somebody who is not here any more, as a
  // friendly spirit (web/src/relative.js). Their door is on the calendar ('relative').
  relative: {
    name: 'UNCLE BOB',                         // under them as they fly
    title: 'THE SPIRIT OF UNCLE BOB',          // on their door
    says: 'DID YOU STRETCH FIRST?',            // their speech bubble; the tablet says it out loud too
    jacket: [150, 190, 235],                   // [red, green, blue]
    look: { hair: 'gray', style: 'short', hat: 'cap', hatCol: [40, 96, 60] },   // as in profiles.js
  },
  // More than one? List them all: each visit is one of them in turn.
  //   relatives: [ { name: 'UNCLE JOE', says: 'WHO TOOK MY HAT?' }, { name: 'AUNT MAY', says: 'EAT SOMETHING!' } ],
  // The apps on the Peloton's home page, between the game and ALL APPS: any of 'youtube',
  // 'netflix', 'hulu', 'music'. None unless you ask for them. They open an app that is
  // already on the tablet (Peloton has no app store: see docs/INSTALL.md), so add the app
  // first or the tile says it is not there yet.
  home: ['video', 'shows', 'tunes'],
  // A greeting of your own on a door's card on a particular day: 'MM-DD': 'HAPPY BIRTHDAY, NANA!'
  days: {},
  // Your own words for any thing in the catalog (web/src/rewards.js, web/src/gifts.js), by its id:
  //   cake: { name: "NANA'S BIRTHDAY CAKE", blurb: 'DECEMBER 24 IS HER BIRTHDAY', quip: 'NO SINGING!', speak: 'Happy birthday, Nana!' }
  things: {},
};
