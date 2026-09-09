/* Scum & Villainy — the mechanical skeleton of a sheet.
 *
 * Names, structure and numbers only. What an ability or an item DOES is not
 * reproduced here: that text is Evil Hat's, and the sheets give every entry a
 * free notes field for the player to paste or paraphrase their own copy. This
 * file exists so a sheet knows what fields exist, how many dots go where, and
 * what a track's length is — nothing that substitutes for owning the book.
 *
 * Everything is data, so a group running a variant can edit this file alone
 * and both sheets follow.
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
 * `startingAction` is the single dot the playbook begins with; `abilities` are
 * the special-ability NAMES to choose from, and `items` the playbook-specific
 * gear. Descriptions belong in the book.
 */
export const PLAYBOOKS = {
  muscle: {
    id: 'muscle', name: 'Muscle', startingAction: 'scrap',
    abilities: ['Battle-Hardened', 'Bodyguard', 'Ghost Fighter', 'Mule',
                'Not to be Trifled With', 'Savage', 'Vigorous'],
    items: ['Blade or Baton', 'Heavy Pistol', 'Scary Weapon', 'Armor',
            'Heavy Armor', 'Breaching Charge']
  },
  pilot: {
    id: 'pilot', name: 'Pilot', startingAction: 'helm',
    abilities: ['Ace', 'Born to the Black', 'Hard Burn', 'Reflexes',
                'Sixth Sense', 'Wingman', 'Fly Casual'],
    items: ['Flight Suit', 'Toolkit', 'Lucky Charm', 'Spare Parts',
            'Docking Clamps', 'Nav Charts']
  },
  speaker: {
    id: 'speaker', name: 'Speaker', startingAction: 'consort',
    abilities: ['Like Part of the Family', 'Mesmerism', 'Subterfuge',
                'Trust Me', 'Well Connected', 'Jaded', 'Weird Contacts'],
    items: ['Fine Clothes', 'Documents', 'Credit Chits', 'Recorder',
            'Disguise Kit', 'Gift']
  },
  scoundrel: {
    id: 'scoundrel', name: 'Scoundrel', startingAction: 'skulk',
    abilities: ['Ghost Echo', 'Infiltrator', 'Shadow', 'Slippery',
                'Cloak and Dagger', 'Scout', 'Thief'],
    items: ['Climbing Gear', 'Lockpicks', 'Silenced Pistol', 'Stealth Suit',
            'Scanner', 'Smoke Grenade']
  },
  stitch: {
    id: 'stitch', name: 'Stitch', startingAction: 'doctor',
    abilities: ['Alchemist', 'Battlefield Medic', 'Physicker', 'Surgeon',
                'Bedside Manner', 'Chemist', 'Ghost Ward'],
    items: ['Medkit', 'Surgical Kit', 'Drugs', 'Sedatives',
            'Bio-Scanner', 'Stim Injector']
  },
  mechanic: {
    id: 'mechanic', name: 'Mechanic', startingAction: 'rig',
    abilities: ['Ancient Interface', 'Artificer', 'Bantam', 'Functional',
                'Grease Monkey', 'Tinkerer', 'Overclock'],
    items: ['Toolkit', 'Heavy Tools', 'Spare Parts', 'Welding Gear',
            'Repair Drone', 'Diagnostic Scanner']
  },
  mystic: {
    id: 'mystic', name: 'Mystic', startingAction: 'attune',
    abilities: ['Ghost Voice', 'Precognition', 'The Way', 'Warded',
                'Ritual', 'Compel', 'Tempest']
  }
};

/** Playbooks as a list, for menus. */
export const PLAYBOOK_LIST = Object.values(PLAYBOOKS);

/** Heritages and backgrounds — origin fields, chosen or written freely. */
export const HERITAGES   = ['Coreworlder', 'Rim Dweller', 'Voidborn',
                            'Colonist', 'Xeno', 'Synthetic'];
export const BACKGROUNDS = ['Academic', 'Labor', 'Military', 'Noble',
                            'Trade', 'Underworld', 'Wanderer'];

/** Vices — what a character indulges to clear stress. */
export const VICES = ['Faith', 'Gambling', 'Luxury', 'Obligation',
                      'Pleasure', 'Stupor', 'Weird'];

/* Tracks. Stress fills up and is cleared by indulging a vice; taking stress
   past the end of the track inflicts trauma. */
export const STRESS_MAX  = 9;
export const TRAUMA_MAX  = 4;
export const TRAUMAS = ['Cold', 'Haunted', 'Obsessed', 'Paranoid',
                        'Reckless', 'Soft', 'Unstable', 'Vicious'];

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
  'Blaster', 'Blade', 'Throwing Blades', 'Comms Unit', 'Rebreather',
  'Armor', 'Tools', 'Rations', 'Rope', 'Med Patch'
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
  cerberus: { id: 'cerberus', name: 'Cerberus', hull: 2, engines: 2,
              comms: 1, weapons: 2, slots: 6 },
  stardancer: { id: 'stardancer', name: 'Stardancer', hull: 2, engines: 2,
                comms: 2, weapons: 1, slots: 6 },
  firedrake: { id: 'firedrake', name: 'Firedrake', hull: 3, engines: 1,
               comms: 1, weapons: 2, slots: 6 }
};
export const FRAME_LIST = Object.values(FRAMES);

/** Ship systems, each rated 0-3. Damage marks a system; repairs clear it. */
export const SHIP_SYSTEMS = ['engines', 'hull', 'comms', 'weapons',
                             'craft', 'gambit'];
export const MAX_SYSTEM_RATING = 3;

/** Upgrades a ship can take, by the area they belong to. */
export const SHIP_UPGRADES = {
  engines: ['Superior Engines', 'Bulk Fuel', 'Silent Running', 'Boost Thrusters'],
  hull:    ['Reinforced Hull', 'Armor Plating', 'Cargo Hold', 'Hidden Hold'],
  comms:   ['Sensor Array', 'Jamming Suite', 'Encrypted Comms', 'Long-Range Array'],
  weapons: ['Turret', 'Heavy Cannon', 'Missiles', 'Point Defence'],
  crew:    ['Medical Bay', 'Workshop', 'Galley', 'Quarters', 'Brig']
};

export const SHIP_XP_TRACK = 8;
/** Gambit pips a crew banks to boost rolls. */
export const GAMBIT_MAX = 6;

/* ------------------------------------------------------------------ clocks */

/** Segment counts a clock may have. Anything else is not a Blades clock. */
export const CLOCK_SIZES = [4, 6, 8, 12];
export const DEFAULT_CLOCK_SIZE = 4;
