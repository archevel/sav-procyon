/* Notes pinned to a place.
 *
 * A note is addressed by a composite path — 'rin', 'rin/aleph',
 * 'rin/aleph/warren', 'rin/gate:iota' — never by a bare body id. Ids repeat
 * across systems and the sector data moves, so the system has to be part of
 * the key or a note would follow whichever body happened to inherit its id.
 *
 * A note whose target no longer resolves is kept and shown apart, never
 * dropped: the sector data changing is not a reason to lose what the player
 * wrote about it.
 */

import { t } from '../data/i18n.js';
import { SECTOR } from '../data/sector.js';
import * as store from './store.js';
import { el, note as noteControl, newNote } from './sheet-parts.js';
import { bodyAt, targetName, isGatePath, GATE_PREFIX } from './fleet.js';

/** Path for a place. `bodyPath` is null for the system itself. */
export function placePath(sysId, bodyPath = null) {
  return bodyPath ? `${sysId}/${bodyPath}` : sysId;
}

/** Split a stored path back into its system and body parts. */
export function splitPath(path) {
  const i = String(path).indexOf('/');
  return i < 0 ? { sysId: path, bodyPath: null }
               : { sysId: path.slice(0, i), bodyPath: path.slice(i + 1) };
}

/** Human-readable place name, or null when the path no longer resolves. */
export function describePlace(path, tr = t) {
  const { sysId, bodyPath } = splitPath(path);
  const sys = SECTOR.systems[sysId];
  if (!sys) return null;
  const sysName = tr(sys.key + '.name');
  if (!bodyPath) return { system: sysName, detail: null };
  const b = bodyAt(sysId, bodyPath);
  return b ? { system: sysName, detail: targetName(b, tr) } : null;
}

/**
 * Render the notes for one place into `host`.
 *
 * Used by the location panel and by the standalone notes list, which is why
 * it takes a path rather than a body.
 */
export async function renderPlaceNotes(host, path, { onChange } = {}) {
  const rows = await store.notesFor(path);
  host.innerHTML = '';

  const save = async rec => {
    await store.put('notes', rec);
    onChange?.();
    renderPlaceNotes(host, path, { onChange });
  };

  for (const rec of rows) {
    /* A stored note record wraps one editable note. The note control is the
       same one the sheets use, so a note reads and behaves identically
       wherever it appears. */
    host.appendChild(noteControl(
      { id: rec.id, title: rec.title, body: rec.body, images: rec.images || [] },
      {
        onChange: v => save({ ...rec, title: v.title, body: v.body }),
        onDelete: async () => {
          if (!confirm(t('notes.confirmDelete').replace('%s', rec.title || '—'))) return;
          await store.remove('notes', rec.id);
          onChange?.();
          renderPlaceNotes(host, path, { onChange });
        },
        onAddImage: async file => {
          const a = await store.putAsset(file);
          save({ ...rec, images: [...(rec.images || []), { assetId: a.id, caption: '' }] });
        },
        onRemoveImage: img => save({ ...rec,
          images: (rec.images || []).filter(i => i.assetId !== img.assetId) })
      }));
  }

  const add = el('button', 'sheet-add', '+ ' + t('sheet.addNote'));
  add.type = 'button';
  add.addEventListener('click', async () => {
    await store.put('notes', { ...newNote(), target: path, images: [] });
    onChange?.();
    renderPlaceNotes(host, path, { onChange });
  });
  host.appendChild(add);
}

/** How many notes a place has — for the badge on the chart. */
export async function noteCount(path) {
  return (await store.notesFor(path)).length;
}

/**
 * Every place that has notes, grouped, with unresolvable targets last.
 *
 * The orphan group is the point of this view: a note whose body was renamed
 * or removed from the sector data is still the player's writing, and needs
 * somewhere to be seen rather than silently vanishing.
 */
export async function notesIndex() {
  const all = await store.all('notes');
  const byTarget = new Map();
  for (const n of all) {
    if (!byTarget.has(n.target)) byTarget.set(n.target, []);
    byTarget.get(n.target).push(n);
  }
  const known = [], orphans = [];
  for (const [path, notes] of byTarget) {
    const place = describePlace(path);
    (place ? known : orphans).push({ path, place, notes });
  }
  known.sort((a, b) => (a.place.system + (a.place.detail || ''))
    .localeCompare(b.place.system + (b.place.detail || '')));
  return { known, orphans };
}
