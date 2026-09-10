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
 * `startingAction` is the single dot the playbook begins with; `abilities`
 * and `items` are the ids to choose from. Names live in the string catalogue,
 * descriptions in the book.
 */
export const PLAYBOOKS = {
  muscle: {
    id: 'muscle', startingAction: 'scrap',
    abilities: ['battle-hardened', 'bodyguard', 'ghost-fighter', 'mule',
                'not-to-be-trifled-with', 'savage', 'vigorous'],
    items: ['blade-or-baton', 'heavy-pistol', 'scary-weapon', 'armor',
            'heavy-armor', 'breaching-charge']
  },
  pilot: {
    id: 'pilot', startingAction: 'helm',
    abilities: ['ace', 'born-to-the-black', 'hard-burn', 'reflexes',
                'sixth-sense', 'wingman', 'fly-casual'],
    items: ['flight-suit', 'toolkit', 'lucky-charm', 'spare-parts',
            'docking-clamps', 'nav-charts']
  },
  speaker: {
    id: 'speaker', startingAction: 'consort',
    abilities: ['like-part-of-the-family', 'mesmerism', 'subterfuge',
                'trust-me', 'well-connected', 'jaded', 'weird-contacts'],
    items: ['fine-clothes', 'documents', 'credit-chits', 'recorder',
            'disguise-kit', 'gift']
  },
  scoundrel: {
    id: 'scoundrel', startingAction: 'skulk',
    abilities: ['ghost-echo', 'infiltrator', 'shadow', 'slippery',
                'cloak-and-dagger', 'scout', 'thief'],
    items: ['climbing-gear', 'lockpicks', 'silenced-pistol', 'stealth-suit',
            'scanner', 'smoke-grenade']
  },
  stitch: {
    id: 'stitch', startingAction: 'doctor',
    abilities: ['alchemist', 'battlefield-medic', 'physicker', 'surgeon',
                'bedside-manner', 'chemist', 'ghost-ward'],
    items: ['medkit', 'surgical-kit', 'drugs', 'sedatives',
            'bio-scanner', 'stim-injector']
  },
  mechanic: {
    id: 'mechanic', startingAction: 'rig',
    abilities: ['ancient-interface', 'artificer', 'bantam', 'functional',
                'grease-monkey', 'tinkerer', 'overclock'],
    items: ['toolkit', 'heavy-tools', 'spare-parts', 'welding-gear',
            'repair-drone', 'diagnostic-scanner']
  },
  mystic: {
    id: 'mystic', startingAction: 'attune',
    abilities: ['ghost-voice', 'precognition', 'the-way', 'warded',
                'ritual', 'compel', 'tempest']
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

/** Gear every character can carry, independent of playbook. */
export const COMMON_ITEMS = [
  'blaster', 'blade', 'throwing-blades', 'comms-unit', 'rebreather',
  'armor', 'tools', 'rations', 'rope', 'med-patch'
];

export const XP_TRACKS = { playbook: 8, attribute: 6 };

/* ------------------------------------------------------------------ ships */

/**
 * Ship frames.
 *
 * `systems` are the modules a frame starts with; `slots` is how many upgrades
 * it can take. Numbers are the mechanical shape of the frame, not a
 * description of it.
 */
export const FRAMES = {
  cerberus: { id: 'cerberus', hull: 2, engines: 2,
              comms: 1, weapons: 2, slots: 6 },
  stardancer: { id: 'stardancer', hull: 2, engines: 2,
                comms: 2, weapons: 1, slots: 6 },
  firedrake: { id: 'firedrake', hull: 3, engines: 1,
               comms: 1, weapons: 2, slots: 6 }
};
export const FRAME_LIST = Object.values(FRAMES);

/** Ship systems, each rated 0-3. Damage marks a system; repairs clear it. */
export const SHIP_SYSTEMS = ['engines', 'hull', 'comms', 'weapons',
                             'craft', 'gambit'];
export const MAX_SYSTEM_RATING = 3;

/** Upgrades a ship can take, by the area they belong to. */
export const SHIP_UPGRADES = {
  engines: ['superior-engines', 'bulk-fuel', 'silent-running', 'boost-thrusters'],
  hull:    ['reinforced-hull', 'armor-plating', 'cargo-hold', 'hidden-hold'],
  comms:   ['sensor-array', 'jamming-suite', 'encrypted-comms', 'long-range-array'],
  weapons: ['turret', 'heavy-cannon', 'missiles', 'point-defence'],
  crew:    ['medical-bay', 'workshop', 'galley', 'quarters', 'brig']
};

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
