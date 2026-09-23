/* Scum & Villainy — the mechanical skeleton of a sheet.
 *
 * IDENTIFIERS, structure and numbers only. Every entry here is a key, never a
 * display name: what the player reads comes from data/i18n/strings.js under
 * `sav.<id>`, so the sheets are as translatable as the rest of the map.
 *
 * What an ability or an item DOES is not reproduced anywhere: that text is
 * Evil Hat's, and the sheets give every entry a free notes field for the
 * player to keep their own summary. This file says what fields exist, how
 * many dots go where and how long a track is — nothing that substitutes for
 * owning the book.
 *
 * A group running a variant edits this file and adds the matching strings;
 * both sheets follow.
 */

/* ------------------------------------------------------------- characters */

/** The three attributes, each covering four actions. */
export const ATTRIBUTES = [
  { id: 'insight', actions: ['doctor', 'hack', 'rig', 'study'] },
  { id: 'prowess', actions: ['helm', 'scramble', 'scrap', 'skulk'] },
  { id: 'resolve', actions: ['attune', 'command', 'consort', 'sway'] }
];

/** Flat list of action ids, in sheet order. */
export const ACTIONS = ATTRIBUTES.flatMap(a => a.actions);

/** Which attribute an action belongs to — resistance rolls count the dots in
    the attribute, so the sheet has to group them. */
export const ACTION_ATTRIBUTE = Object.fromEntries(
  ATTRIBUTES.flatMap(a => a.actions.map(x => [x, a.id]))
);

export const MAX_ACTION_RATING = 4;   // dots per action
export const STARTING_DOTS = 7;       // dots to spend at creation, beyond the
                                      // playbook's own starting rating

/**
 * Playbooks.
 *
 * `startingAction` is the single dot the playbook begins with. `starting` is
 * the ability every character of the playbook has from the outset — it is not
 * chosen, so it is kept apart from `abilities`, the list one is picked from.
 *
 * `veteran` closes every playbook's ability list in the book ("choose a
 * special ability from another source"). It is a real choice on the sheet, so
 * it is listed like the rest.
 *
 * `items` are the playbook's own gear, offered alongside COMMON_ITEMS. Names
 * live in the string catalogue, the rules text in the book.
 */
export const PLAYBOOKS = {
  muscle: {
    id: 'muscle', startingAction: 'scrap',
    starting: 'unstoppable',
    abilities: ['wrecking-crew', 'backup', 'battleborn', 'bodyguard',
                'flesh-wound', 'predator', 'ready-for-anything', 'scary',
                'veteran'],
    items: ['krieger-blaster-pistol', 'vera-sniper-rifle', 'zmei-flamethrower',
            'sunder-vibro-blade', 'zarathustra-detonator-launcher',
            'martial-arts-style', 'mystic-ammunition']
  },
  pilot: {
    id: 'pilot', startingAction: 'helm',
    starting: 'ace-pilot',
    abilities: ['keen-eye', 'side-job', 'exceed-specs', 'leaf-on-the-wind',
                'hedonist', 'commander', 'traveler', 'punch-it',
                'veteran'],
    items: ['customized-spacesuit', 'small-urbot', 'mechanics-kit',
            'grappling-hook', 'guild-license', 'victory-cigars']
  },
  speaker: {
    id: 'speaker', startingAction: 'consort',
    starting: 'air-of-respectability',
    abilities: ['favors-owed', 'player', 'infiltrator', 'subterfuge',
                'heart-to-heart', 'old-friends', 'disarming', 'purpose',
                'veteran'],
    items: ['fine-clothes', 'legitimate-id', 'luxury-item', 'large-luxury-item',
            'memento-past-encounter']
  },
  scoundrel: {
    id: 'scoundrel', startingAction: 'skulk',
    starting: 'serendipitous',
    abilities: ['never-tell-me-the-odds', 'i-know-a-guy', 'tenacious',
                'when-the-chips-are-down', 'devils-own-luck', 'daredevil',
                'shoot-first', 'ask-questions-later',
                'veteran'],
    items: ['fine-blaster-pistol', 'fine-coat', 'loaded-dice',
            'forged-documents', 'mystic-ammunition', 'personal-memento']
  },
  stitch: {
    id: 'stitch', startingAction: 'doctor',
    starting: 'im-a-doctor-not-a',
    abilities: ['physicker', 'patch', 'welcome-anywhere', 'under-pressure',
                'combat-medic', 'moral-compass', 'dr-strange', 'book-learning',
                'veteran'],
    items: ['fine-medkit', 'fine-bedside-manner', 'fine-clothing',
            'recognizable-medic-garb', 'candies-and-treats',
            'syringes-and-applicators']
  },
  mechanic: {
    id: 'mechanic', startingAction: 'rig',
    starting: 'tinker',
    abilities: ['bailing-wire-and-mech-tape', 'construct-whisperer',
                'junkyard-hunter', 'hacker', 'fixed', 'mechanics-heart',
                'overclock', 'analyst',
                'veteran'],
    items: ['fine-hacking-rig', 'fine-ship-repair-tools', 'small-drone',
            'vision-enhancing-goggles', 'spare-parts', 'genius-pet']
  },
  mystic: {
    id: 'mystic', startingAction: 'attune',
    starting: 'the-way',
    abilities: ['kinetics', 'psy-blade', 'center', 'way-shield', 'warded',
                'psy-dancing', 'visions', 'sundering',
                'veteran'],
    items: ['fine-melee-weapon', 'offerings', 'trappings-of-religion',
            'outdated-religious-outfit', 'memento-of-your-travels',
            'precursor-artifact']
  }
};

/** Playbooks as a list, for menus. */
export const PLAYBOOK_LIST = Object.values(PLAYBOOKS);

/** Heritages and backgrounds — origin fields. */
export const HERITAGES   = ['coreworlder', 'rim-dweller', 'voidborn',
                            'colonist', 'xeno', 'synthetic'];
export const BACKGROUNDS = ['academic', 'labor', 'military', 'noble',
                            'trade', 'underworld', 'wanderer'];

/** Vices — what a character indulges to clear stress. */
export const VICES = ['faith', 'gambling', 'luxury', 'obligation',
                      'pleasure', 'stupor', 'weird'];

/* Tracks. Stress fills up and is cleared by indulging a vice; taking stress
   past the end of the track inflicts trauma. */
export const STRESS_MAX  = 9;
export const TRAUMA_MAX  = 4;
export const TRAUMAS = ['cold', 'haunted', 'obsessed', 'paranoid',
                        'reckless', 'soft', 'unstable', 'vicious'];

/** Harm, by severity. Each level has a fixed number of slots. */
export const HARM_LEVELS = [
  { level: 3, slots: 1, id: 'severe' },
  { level: 2, slots: 2, id: 'moderate' },
  { level: 1, slots: 2, id: 'lesser' }
];
export const HEALING_CLOCK = 4;

/** Load determines how many item slots are carried, not which. */
export const LOADS = [
  { id: 'light',  slots: 3 },
  { id: 'normal', slots: 5 },
  { id: 'heavy',  slots: 6 }
];

/**
 * Gear every character can carry, independent of playbook — the right-hand
 * column of the sheet, in the book's own order.
 *
 * `slots` is what the item costs against load; the entries carrying 2 are the
 * ones the sheet draws with a double box. Playbook items carry their own cost
 * in the same way, and italic items on the sheet cost nothing.
 */
export const COMMON_ITEMS = [
  'blaster-pistol', 'second-blaster-pistol', 'melee-weapon', 'heavy-blaster',
  'detonator', 'hacking-tools', 'repair-tools', 'medkit', 'spy-gear',
  'illicit-drugs', 'communicator', 'armor', 'spacesuit'
];

export const XP_TRACKS = { playbook: 8, attribute: 6 };

/* ------------------------------------------------------------------ ships */

/**
 * Ship frames.
 *
 * `systems` are the ratings the ship starts with, and `max` the ceiling each
 * one can be raised to. The ceilings differ per ship and per system — the
 * Cerberus can never take hull past 2, the Stardancer never weapons past 2 —
 * so they are part of the frame rather than one constant for every vessel.
 *
 * `installed` are the modules the ship already carries at creation;
 * `auxiliary` and `training` are its starting upgrades. `gambits` is what the
 * crew banks at the start of every job.
 */
export const FRAMES = {
  stardancer: {
    id: 'stardancer', size: 'freighter', gambits: 2,
    systems: { crew: 0, engines: 1, hull: 2, comms: 0, weapons: 0 },
    max:     { crew: 3, engines: 4, hull: 4, comms: 3, weapons: 2 },
    installed: ['jump-drive', 'cargo-hold', 'smuggling-compartments'],
    auxiliary: ['galley'], training: 'insight',
    upgrades: ['false-ship-papers', 'dark-hyperspace-lane-maps',
               'smugglers-rigging', 'lucky-charm', 'thrillseekers'],
    abilities: ['the-getaway', 'cargo-eye', 'field-repairs', 'leverage',
                'just-passing-through', 'home-cooking', 'problem-solvers']
  },
  cerberus: {
    id: 'cerberus', size: 'freighter', gambits: 1,
    systems: { crew: 0, engines: 1, hull: 0, comms: 2, weapons: 1 },
    max:     { crew: 3, engines: 4, hull: 2, comms: 4, weapons: 3 },
    installed: ['jump-drive', 'long-range-scanner', 'grappling-hooks'],
    auxiliary: ['brig'], training: 'prowess',
    upgrades: ['tracers', 'stun-weapons', 'personal-vehicles', 'hard-knocks',
               'smooth-criminals'],
    abilities: ['licensed', 'on-the-trail', 'light-touch', 'snatch-n-grab',
                'loaded-for-bear', 'play-both-sides', 'deadly']
  },
  firedrake: {
    id: 'firedrake', size: 'corvette', gambits: 2,
    systems: { crew: 0, engines: 1, hull: 1, comms: 0, weapons: 1 },
    max:     { crew: 3, engines: 3, hull: 2, comms: 4, weapons: 3 },
    installed: ['jump-drive', 'crew-quarters', 'particle-cannons'],
    auxiliary: ['shields'], training: null, gear: ['shuttle'],
    upgrades: ['black-market-contacts', 'secret-base', 'popular-support',
               'way-blessed', 'driven'],
    abilities: ['old-hands', 'forged-in-fire', 'sympathizers',
                'natural-enemies', 'spark-of-rebellion', 'just-cause',
                'hearts-and-minds']
  }
};
export const FRAME_LIST = Object.values(FRAMES);

/** Ship sizes. A freighter can land on a planet; a corvette cannot. */
export const SHIP_SIZES = ['freighter', 'corvette'];

/**
 * The rated systems, in the order the sheet lists them. `crew` is the crew's
 * own quality rather than a part of the vessel, but it is rated and rolled
 * exactly like the rest, so it lives in the same list.
 */
export const SHIP_SYSTEMS = ['crew', 'engines', 'hull', 'comms', 'weapons'];

/** The ceiling when no frame is chosen — the highest any frame allows. */
export const MAX_SYSTEM_RATING = 4;

/**
 * Modules, by the system they belong to.
 *
 * A ship may carry no more modules in a system than it has quality in that
 * system. Auxiliary modules are exempt from that rule, which is why they are
 * kept apart rather than folded in as another area.
 */
export const SHIP_MODULES = {
  hull:    ['cargo-hold', 'crew-quarters', 'landing-bay',
            'smuggling-compartments'],
  engines: ['afterburners', 'cloaking-device', 'gravitic-field-generator',
            'jump-drive'],
  comms:   ['fake-transponder', 'long-range-scanner', 'nexus-link',
            'quantum-encryptor', 'targeting-computer'],
  weapons: ['coherence-cannon', 'grappling-hooks', 'mining-drill', 'missiles',
            'particle-cannons']
};

/** Auxiliary modules. Shields cost two upgrades rather than one. */
export const AUXILIARY_MODULES = ['ai-module', 'armory', 'brig', 'galley',
                                  'medical-bay', 'science-bay', 'shields'];

/** Ship upgrades every crew may buy, whatever their vessel. */
export const SHIP_UPGRADE_GEAR = ['holo-emitters', 'intruder-alarm',
                                  'land-rover', 'power-reserves', 'shuttle',
                                  'stasis-pods', 'vault'];

/** Crew gear, bought the same way. */
export const CREW_GEAR = ['alien-pet', 'land-transport', 'recon-drone',
                          'survival-gear', 'workshop'];

/** Training tracks. A Training upgrade earns 2 xp instead of 1. */
export const TRAINING = ['insight', 'prowess', 'resolve', 'playbook'];

export const SHIP_XP_TRACK = 8;
/** Gambit pips a crew banks to boost rolls. */
export const GAMBIT_MAX = 6;

/* ------------------------------------------------------------- standing */

/** A contact is a friend, a rival, or neither — the book has each character
    mark one close friend and one rival among their contacts, so those are
    the only rungs a contact needs. */
export const CONTACT_RELATIONS = ['friend', 'neutral', 'rival'];

/** Faction status is just a number the fiction pushes up and down. Tracked
    per SHIP: the crew's standing belongs to their vessel, not to any one
    character. */
export const STATUS_MIN = -5;
export const STATUS_MAX = 5;

/* ------------------------------------------------------------------ clocks */

/** Segment counts a clock may have. Anything else is not a Blades clock. */
export const CLOCK_SIZES = [4, 6, 8, 12];
export const DEFAULT_CLOCK_SIZE = 4;
