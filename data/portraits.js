/* Portrait art that ships with the map.
 *
 * A static site cannot list a directory — there is no server to ask — so the
 * files in img/characters/ are named here. Adding art is two steps: drop the
 * file in, add its name below.
 *
 * Files are named `character-<playbook>-<something>.webp`. The playbook part
 * only decides which art is offered as a DEFAULT when a playbook is chosen —
 * every portrait stays selectable for every character, because a group's idea
 * of what a Skruvare looks like is not the app's business.
 */

const DIR = 'img/characters/';

/* Playbook ids, for reading the filename convention. Deliberately a copy
   rather than an import of data/sav.js: this module is about what art exists,
   and should not fail to load because the rules module moved. A name here
   that is not a playbook simply never matches. */
const PLAYBOOK_IDS = ['muscle', 'pilot', 'speaker', 'scoundrel',
                      'stitch', 'mechanic', 'mystic'];

/** Filenames in img/characters/, without the directory. */
export const PORTRAIT_FILES = [
  'character-mechanic-bwam-2.webp'
];

/**
 * The shipped portraits, as { id, file, url, playbook }.
 *
 * `id` is what a record stores — the filename without its extension, so the
 * stored value stays readable and survives the file being re-encoded to a
 * different format.
 */
export const PORTRAITS = PORTRAIT_FILES.map(file => ({
  id: file.replace(/\.[^.]+$/, ''),
  file,
  url: DIR + file,
  playbook: playbookOf(file)
}));

/** Look one up by the id a record stores. */
export function portraitById(id) {
  return PORTRAITS.find(p => p.id === id) || null;
}

/**
 * The playbook a filename claims, or null.
 *
 * The convention is `character-<playbook>-<something>.webp`, so the playbook
 * is read from its POSITION — the second dash-separated part — and whatever
 * follows is free text that may itself contain dashes. Searching the whole
 * name instead would let 'character-muscle-stitchy-1' match Stitch as readily
 * as Muscle, with the winner decided by list order.
 *
 * A file not following the convention yields null and is still offered in the
 * picker; it just never becomes a default.
 */
function playbookOf(file) {
  const parts = file.toLowerCase().replace(/\.[^.]+$/, '').split('-');
  if (parts[0] !== 'character') return null;
  return PLAYBOOK_IDS.includes(parts[1]) ? parts[1] : null;
}

/**
 * A portrait to offer a character of this playbook, chosen at random from
 * those that name it.
 *
 * Random rather than first, so a crew of four Skruvare does not arrive
 * wearing the same face. Returns null when nothing matches — the character
 * then simply has no portrait until one is picked, which is better than
 * handing them art drawn for someone else.
 */
export function defaultPortraitFor(playbook) {
  if (!playbook) return null;
  const matches = PORTRAITS.filter(p => p.playbook === playbook);
  if (!matches.length) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}
