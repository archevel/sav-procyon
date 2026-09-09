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
         section } from './sheet-parts.js';
import { clocksSection, notesSection, extraFields,
         restoreView } from './sheet-character.js';
import { describeAnchor } from './fleet.js';

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
    damaged: [], upgrades: [], crewUpgrades: [],
    gambit: 0, xp: 0,
    blurb: '', portrait: null,
    location: null, clocks: [], notes: [], fields: []
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

  host.innerHTML = '';
  host.appendChild(header(rec, save, onBack));
  host.appendChild(identity(rec, save));
  host.appendChild(systemsSection(rec, save));
  host.appendChild(upgradesSection(rec, save));
  host.appendChild(clocksSection(rec, save));
  host.appendChild(notesSection(rec, save));
  host.appendChild(extraFields(rec, save));

  restoreView(host, scroller, scrollTop, collapsed);
}

function header(rec, save, onBack) {
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
  name.addEventListener('blur', () => {
    if (name.value.trim() && name.value.trim() !== rec.name) save({ name: name.value.trim() });
  });
  name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
  h.appendChild(name);
  return h;
}

function identity(rec, save) {
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
        if (f[s] != null) systems[s] = Math.max(systems[s] || 0, f[s]);
      }
      save({ frame: v, systems });
    }));
  /* Shown with the frame's own art as the placeholder, so it reads as an
     override rather than a required field. */
  grid.appendChild(field(t('sheet.spriteOverride'), rec.sprite,
    v => save({ sprite: v }),
    { list: 'fleet-sprite-names',
      placeholder: rec.frame || t('sheet.spriteNone') }));
  grid.appendChild(field(t('sheet.look'), rec.look, v => save({ look: v })));

  const where = describeAnchor(rec.location, t);
  grid.appendChild(readOnly(t('sheet.position'),
    where ? `${where.system}${where.detail ? ' · ' + where.detail : ''}`
          : t('fleet.unplaced')));

  const blurb = el('textarea', 'sheet-note-body');
  blurb.value = rec.blurb || '';
  blurb.rows = 3;
  blurb.placeholder = t('sheet.blurb');
  blurb.addEventListener('blur', () => save({ blurb: blurb.value }));

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

  for (const s of SAV.SHIP_SYSTEMS) {
    const row = el('div', 'sheet-system' + (damaged.has(s) ? ' is-damaged' : ''));
    row.appendChild(dots(rec.systems?.[s] || 0, SAV.MAX_SYSTEM_RATING,
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

  const taken = (rec.upgrades || []).length + (rec.crewUpgrades || []).length;
  if (frame) {
    wrap.appendChild(el('p', 'sheet-hint',
      t('sheet.slotsUsed').replace('%a', taken).replace('%b', frame.slots)));
  }

  for (const [area, list] of Object.entries(SAV.SHIP_UPGRADES)) {
    if (area === 'crew') continue;
    wrap.appendChild(el('h4', 'sheet-sub', t('ship.' + area)));
    wrap.appendChild(picks(list, rec.upgrades || [],
      /* One list across all areas, so a pick in one does not clear another. */
      v => save({ upgrades: mergePicks(rec.upgrades, list, v) })));
  }

  wrap.appendChild(el('h4', 'sheet-sub', t('sheet.crewUpgrades')));
  wrap.appendChild(picks(SAV.SHIP_UPGRADES.crew, rec.crewUpgrades || [],
    v => save({ crewUpgrades: v }), { note: true }));

  return section(t('sheet.upgrades'), wrap);
}

/**
 * Fold one area's picks back into the full list.
 *
 * `picks` only ever reports the options it was shown, so replacing the stored
 * array wholesale would drop every pick made in the other areas.
 */
function mergePicks(stored, shown, chosen) {
  const others = (stored || []).filter(x => !shown.includes(x));
  return [...others, ...chosen];
}
