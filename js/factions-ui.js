/* Player state on the canon factions: clocks and notes.
 *
 * The factions themselves are sourcebook data and never change. What the
 * table adds — how far along a faction's objective is, what the crew knows
 * about them — lives in the store: clocks on a per-faction record, notes as
 * ordinary note records with a `faction:<slug>` target. Both therefore travel
 * in Import/Export like everything else the players author.
 */

import { t, getLang } from '../data/i18n.js';
import * as store from './store.js';
import { goalClockSize } from '../data/faction-clocks.js';
import { el, clock, newClock } from './sheet-parts.js';
import { renderPlaceNotes, factionTarget } from './notes-ui.js';

/**
 * The stored record for a faction, created on first touch.
 *
 * Keyed by the slug itself — both `id` and `originId` — so the same faction
 * is the same record in every browser: two tables that both track the Cobalt
 * Syndicate import against each other rather than past each other.
 *
 * Creation seeds the Current Objective clock at 0, sized from the star on
 * the faction's banner (data/faction-clocks.js), named with the objective
 * text in the reader's language at the moment of creation. The name is the
 * player's to edit afterwards, like any clock.
 */
export async function factionState(faction) {
  const existing = await store.get('factions', faction.slug);
  if (existing) return existing;

  const lang = getLang() === 'debug' ? 'sv' : getLang();
  const objective = faction.sections?.['Current Objective']?.[lang]
    || faction.sections?.['Current Objective']?.sv || '';
  const goal = { ...newClock(objective), segments: goalClockSize(faction.slug) };

  return store.put('factions', {
    id: faction.slug,
    originId: faction.slug,
    name: faction.title?.en || faction.slug,
    clocks: [goal]
  }, { keepRev: true });
}

/**
 * Render the player's additions for one faction into `host` — its clocks and
 * its notes, below the sourcebook text and visually apart from it.
 */
export async function renderFactionExtras(host, faction) {
  const rec = await factionState(faction);
  host.innerHTML = '';

  const save = async patch => {
    const fresh = await store.get('factions', rec.id) || rec;
    await store.put('factions', { ...fresh, ...patch });
    renderFactionExtras(host, faction);
  };

  const wrap = el('div', 'faction-player');
  wrap.appendChild(el('h4', 'loc-notes-title', t('sheet.clocks')));

  const clocks = el('div', 'sheet-clocks');
  for (const c of (rec.clocks || [])) {
    clocks.appendChild(clock(c, {
      onChange: v => save({ clocks: rec.clocks.map(x => x.id === c.id ? { ...x, filled: v } : x) }),
      onRename: v => save({ clocks: rec.clocks.map(x => x.id === c.id ? { ...x, name: v } : x) }),
      onResize: v => save({ clocks: rec.clocks.map(x => x.id === c.id
        ? { ...x, segments: v, filled: Math.min(x.filled, v) } : x) }),
      onDelete: () => save({ clocks: rec.clocks.filter(x => x.id !== c.id) })
    }));
  }
  const add = el('button', 'sheet-add', '+ ' + t('sheet.addClock'));
  add.type = 'button';
  add.addEventListener('click', () => save({ clocks: [...(rec.clocks || []), newClock()] }));
  clocks.appendChild(add);
  wrap.appendChild(clocks);

  wrap.appendChild(el('h4', 'loc-notes-title', t('notes.yours')));
  const notesHost = el('div');
  wrap.appendChild(notesHost);
  host.appendChild(wrap);
  await renderPlaceNotes(notesHost, factionTarget(faction.slug));
}
