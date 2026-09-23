/* The ship sheet.
 *
 * Same shape as the character sheet — mechanics as real fields, plus clocks,
 * notes and spare fields that attach to anything — and it reuses those three
 * sections directly rather than restating them.
 *
 * The ship record is also what the chart draws, so this sheet edits `sprite`
 * and reports `location` while leaving the anchor itself to the fleet panel
 * and the m-click: two ways to set a position would drift apart.
 */

import { t } from '../data/i18n.js';
import * as store from './store.js';
import * as SAV from '../data/sav.js';
import { el, dots, track, imageStrip, field, choice, picks,
         section, statusSelect, draft, saveBar } from './sheet-parts.js';
import { clocksSection, notesSection, extraFields,
         restoreView } from './sheet-character.js';
import { describeAnchor } from './fleet.js';
import { FACTIONS } from '../data/factions-data.js';
import { factionTitle } from './factions-ui.js';
import { openFaction } from './stakeholders-ui.js';

/**
 * The art a vessel uses, as a base name for img/ship-<n>.webp and
 * img/surface-<n>.webp.
 *
 * The frame is the default, since frame ids and the shipped art share their
 * names — choosing Cerberus should draw a Cerberus without further asking.
 * `sprite` overrides it, so a crew that has repainted their hull, or drawn
 * their own, can point at whatever file they like.
 *
 * Returns null when neither is set, which is what an unnamed vessel gets: the
 * plain triangle every ship falls back to.
 */
export function shipArt(rec) {
  return (rec?.sprite || '').trim() || rec?.frame || null;
}

/** A blank ship. `location: null` keeps a new vessel off the chart until it
    is placed, which is the fleet panel's job. */
export function blankShip(name) {
  return {
    name, sprite: '', size: 7, frame: '', look: '',
    systems: Object.fromEntries(SAV.SHIP_SYSTEMS.map(s => [s, 0])),
    damaged: [], modules: [], auxiliary: [], gear: [],
    upgrades: [], crewUpgrades: [],
    gambit: 0, xp: 0,
    blurb: '', portrait: null,
    statuses: {}, location: null, clocks: [], notes: [], fields: []
  };
}

export function renderShipSheet(host, rec, { onBack } = {}) {
  const save = async patch => {
    const fresh = await store.get('ships', rec.id) || rec;
    rec = await store.put('ships', { ...fresh, ...patch });
    renderShipSheet(host, rec, { onBack });
  };

  /* See the character sheet: a rebuild would otherwise lose the scroll
     position and reopen collapsed sections, moving whatever the player was
     about to click. */
  const scroller = host.closest('.loc-info-content') || host.parentElement;
  const scrollTop = scroller?.scrollTop ?? 0;
  const collapsed = new Set(
    [...host.querySelectorAll('.sheet-section')]
      .filter(d => !d.open)
      .map(d => d.querySelector('.sheet-section-title')?.textContent));

  /* Free text commits through the Save button — see draft() in sheet-parts.js. */
  const d = draft();
  host.dirty = () => d.dirty();

  host.innerHTML = '';
  host.appendChild(header(rec, save, onBack, d));
  host.appendChild(identity(rec, save, d));
  host.appendChild(systemsSection(rec, save));
  host.appendChild(upgradesSection(rec, save));
  host.appendChild(statusSection(rec, save));
  host.appendChild(clocksSection(rec, save));
  host.appendChild(notesSection(rec, save, d));
  host.appendChild(extraFields(rec, save, d));
  host.appendChild(saveBar(d, patch => save(patch)));

  restoreView(host, scroller, scrollTop, collapsed);
}

function header(rec, save, onBack, d = null) {
  const h = el('div', 'sheet-head');
  if (onBack) {
    const back = el('button', 'sheet-back', '‹ ' + t('sheet.back'));
    back.type = 'button';
    back.addEventListener('click', onBack);
    h.appendChild(back);
  }
  const name = el('input', 'sheet-name');
  /* Capped so the share card's heading always has something it can fit —
     40 characters is roomier than any name that ends up on a card. */
  name.maxLength = 40;
  name.value = rec.name || '';
  name.setAttribute('aria-label', t('fleet.name'));
  if (d) {
    d.watch('name', () => name.value.trim() || rec.name, rec.name || '', [name]);
  } else {
    name.addEventListener('blur', () => {
      if (name.value.trim() && name.value.trim() !== rec.name) save({ name: name.value.trim() });
    });
    name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
  }
  h.appendChild(name);
  return h;
}

function identity(rec, save, d = null) {
  const grid = el('div', 'sheet-grid');
  grid.appendChild(choice(t('sheet.frame'), rec.frame, SAV.FRAME_LIST,
    v => {
      /* Adopting a frame seeds the systems it starts with, but only those it
         names — anything already rated higher is the crew's own work and is
         left alone. */
      const f = SAV.FRAMES[v];
      if (!f) return save({ frame: v });
      const systems = { ...rec.systems };
      for (const s of SAV.SHIP_SYSTEMS) {
        if (f.systems?.[s] != null) {
          systems[s] = Math.max(systems[s] || 0, f.systems[s]);
        }
      }
      /* The frame's own modules come with the ship, so adopting one installs
         them rather than leaving the crew to tick them off by hand. */
      const modules = [...new Set([...(rec.modules || []), ...f.installed])];
      const auxiliary = [...new Set([...(rec.auxiliary || []), ...f.auxiliary])];
      save({ frame: v, systems, modules, auxiliary });
    }));
  /* Shown with the frame's own art as the placeholder, so it reads as an
     override rather than a required field. */
  grid.appendChild(field(t('sheet.spriteOverride'), rec.sprite,
    v => save({ sprite: v }),
    { list: 'fleet-sprite-names',
      placeholder: rec.frame || t('sheet.spriteNone'),
      draft: d, key: 'sprite' }));
  grid.appendChild(field(t('sheet.look'), rec.look, v => save({ look: v }),
    { draft: d, key: 'look' }));

  /* Size and starting gambits come with the frame and are never edited, so
     they are stated rather than offered — the same treatment the position
     gets below. */
  const frame = SAV.FRAMES[rec.frame];
  if (frame) {
    grid.appendChild(readOnly(t('sheet.size'), t('sav.' + frame.size)));
    grid.appendChild(readOnly(t('sheet.gambits'), String(frame.gambits)));
  }

  const where = describeAnchor(rec.location, t);
  grid.appendChild(readOnly(t('sheet.position'),
    where ? `${where.system}${where.detail ? ' · ' + where.detail : ''}`
          : t('fleet.unplaced')));

  const blurb = el('textarea', 'sheet-note-body');
  blurb.value = rec.blurb || '';
  blurb.rows = 3;
  blurb.placeholder = t('sheet.blurb');
  if (d) d.watch('blurb', () => blurb.value, rec.blurb || '', [blurb]);
  else blurb.addEventListener('blur', () => save({ blurb: blurb.value }));

  const portrait = el('div', 'sheet-portrait');
  portrait.appendChild(imageStrip(rec.portrait ? [rec.portrait] : [], {
    onAddImage: async file => {
      const a = await store.putAsset(file);
      save({ portrait: { assetId: a.id, caption: '' } });
    },
    onRemoveImage: () => save({ portrait: null })
  }));

  return section(t('sheet.identity'), grid, blurb, portrait);
}

/** A field the sheet reports but does not own. */
function readOnly(label, value) {
  const wrap = el('label', 'sheet-field');
  wrap.appendChild(el('span', 'sheet-field-label', label));
  wrap.appendChild(el('span', 'sheet-field-static', value));
  return wrap;
}

function systemsSection(rec, save) {
  const wrap = el('div', 'sheet-systems');
  const damaged = new Set(rec.damaged || []);

  /* Each frame caps each system differently — the Cerberus never takes hull
     past 2 — so the row is drawn to the frame's own ceiling, not one shared
     maximum. With no frame chosen, the highest any frame allows. */
  const frame = SAV.FRAMES[rec.frame];
  for (const s of SAV.SHIP_SYSTEMS) {
    const row = el('div', 'sheet-system' + (damaged.has(s) ? ' is-damaged' : ''));
    const max = frame?.max?.[s] ?? SAV.MAX_SYSTEM_RATING;
    row.appendChild(dots(rec.systems?.[s] || 0, max,
      v => save({ systems: { ...rec.systems, [s]: v } }),
      { label: t('ship.' + s) }));

    /* Damage is tracked separately from the rating: a damaged system keeps
       its rating and regains it on repair, so overwriting the dots would
       lose what the crew paid for. */
    const dmg = el('button', 'sheet-damage' + (damaged.has(s) ? ' is-on' : ''),
                   t('sheet.damaged'));
    dmg.type = 'button';
    dmg.addEventListener('click', () => {
      const next = new Set(damaged);
      next.has(s) ? next.delete(s) : next.add(s);
      save({ damaged: [...next] });
    });
    row.appendChild(dmg);
    wrap.appendChild(row);
  }

  wrap.appendChild(track(rec.gambit || 0, SAV.GAMBIT_MAX,
    v => save({ gambit: v }), { label: t('sheet.gambit') }));
  wrap.appendChild(track(rec.xp || 0, SAV.SHIP_XP_TRACK,
    v => save({ xp: v }), { label: t('sheet.xp'), cls: 'sheet-track-xp' }));

  return section(t('sheet.systems'), wrap);
}

function upgradesSection(rec, save) {
  const frame = SAV.FRAMES[rec.frame];
  const wrap = el('div', 'sheet-upgrades');

  /* Modules, by system. A ship may carry no more in a system than it has
     quality there, so each heading states the count against the rating —
     the rule is easy to overrun and tedious to audit by eye. */
  for (const [area, list] of Object.entries(SAV.SHIP_MODULES)) {
    const rating = rec.systems?.[area] || 0;
    const used = (rec.modules || []).filter(m => list.includes(m)).length;
    const head = el('h4', 'sheet-sub' + (used > rating ? ' is-over' : ''),
                    `${t('ship.' + area)} ${used}/${rating}`);
    wrap.appendChild(head);
    wrap.appendChild(picks(list, rec.modules || [],
      /* One list across all areas, so a pick in one does not clear another. */
      v => save({ modules: mergePicks(rec.modules, list, v) })));
  }

  /* Auxiliary modules are exempt from that rule — a ship may carry them all. */
  wrap.appendChild(el('h4', 'sheet-sub', t('sheet.auxiliary')));
  wrap.appendChild(picks(SAV.AUXILIARY_MODULES, rec.auxiliary || [],
    v => save({ auxiliary: v })));

  /* The vessel's own upgrades, then the ones any crew may buy. */
  if (frame) {
    wrap.appendChild(el('h4', 'sheet-sub', t('sheet.shipUpgrades')));
    wrap.appendChild(picks(frame.upgrades, rec.upgrades || [],
      v => save({ upgrades: mergePicks(rec.upgrades, frame.upgrades, v) })));
  }

  wrap.appendChild(el('h4', 'sheet-sub', t('sheet.gear')));
  const gear = [...SAV.SHIP_UPGRADE_GEAR, ...SAV.CREW_GEAR];
  wrap.appendChild(picks(gear, rec.gear || [],
    v => save({ gear: v })));

  if (frame) {
    wrap.appendChild(el('h4', 'sheet-sub', t('sheet.shipAbilities')));
    wrap.appendChild(picks(frame.abilities, rec.crewUpgrades || [],
      v => save({ crewUpgrades: v }), { note: true }));
  }

  return section(t('sheet.upgrades'), wrap);
}

/**
 * Standing with the factions, per the book: a number the fiction pushes up
 * and down, belonging to the SHIP. Only tracked factions are listed — a row
 * per faction times thirty-six would bury the sheet — and the same numbers
 * are editable from each faction's own view.
 */
function statusSection(rec, save) {
  const wrap = el('div', 'sheet-statuses');
  const statuses = rec.statuses || {};

  for (const slug of Object.keys(statuses)) {
    const row = el('div', 'sheet-contact');
    /* The name opens the faction itself — it looked clickable from day one,
       so it had better be. */
    const openBtn = el('button', 'sheet-contact-name sheet-status-name',
                       factionTitle(slug));
    openBtn.type = 'button';
    openBtn.addEventListener('click', () => openFaction(slug));
    row.appendChild(openBtn);
    row.appendChild(statusSelect(statuses[slug] ?? 0, v =>
      save({ statuses: { ...statuses, [slug]: v } })));
    const x = el('button', 'sheet-x', '×');
    x.type = 'button';
    x.title = t('sheet.remove');
    x.addEventListener('click', () => {
      const next = { ...statuses };
      delete next[slug];
      save({ statuses: next });
    });
    row.appendChild(x);
    wrap.appendChild(row);
  }

  const add = el('select', 'sheet-field-input');
  const blank = el('option', null, t('ship.addStatus'));
  blank.value = '';
  add.appendChild(blank);
  for (const f of FACTIONS) {
    if (slugTracked(statuses, f.slug)) continue;
    const o = el('option', null, factionTitle(f));
    o.value = f.slug;
    add.appendChild(o);
  }
  add.addEventListener('change', () => {
    if (add.value) save({ statuses: { ...statuses, [add.value]: 0 } });
  });
  wrap.appendChild(add);

  return section(t('ship.statusSection'), wrap);
}

const slugTracked = (statuses, slug) =>
  Object.prototype.hasOwnProperty.call(statuses, slug);

/**
 * Fold one area's picks back into the full list.
 *
 * Replacing the stored array wholesale would drop every pick made in the
 * other areas, so what this area did not show is carried through untouched.
 *
 * `chosen` is filtered to what was actually shown, and the result deduped:
 * `picks` is handed the whole stored array as its chosen set, so it reports
 * back ids from other areas too — appending those verbatim duplicated them on
 * every edit, and a record carrying ids no area shows any more (a ship saved
 * before the upgrade lists were rewritten) grew without bound.
 */
function mergePicks(stored, shown, chosen) {
  const others = (stored || []).filter(x => !shown.includes(x));
  const mine = (chosen || []).filter(x => shown.includes(x));
  return [...new Set([...others, ...mine])];
}
