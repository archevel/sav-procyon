/* The character sheet.
 *
 * Semi-structured: the mechanics are real fields — action ratings, stress,
 * trauma, harm, load — because those are what a sheet is for, but clocks and
 * notes can be added freely to anything, and a spare "fields" list takes
 * whatever the group tracks that the rules do not.
 *
 * Every edit writes straight to the store. There is no save button and no
 * draft state: a sheet that can lose work is worse than one that saves too
 * eagerly, and rev only matters for import comparisons, where a few extra
 * bumps cost nothing.
 */

import { t } from '../data/i18n.js';
import * as store from './store.js';
import * as SAV from '../data/sav.js';
import { el, dots, track, clock, newClock, note, newNote, imageStrip,
         field, choice, picks, section, portraitField } from './sheet-parts.js';
import { PORTRAITS, portraitById, randomPortrait } from '../data/portraits.js';

/**
 * The art a character uses, as a URL, or null.
 *
 * Two sources, and an uploaded image always wins: `portrait` holds an asset
 * the player added, `portraitId` names one of the shipped files. Keeping them
 * apart means choosing a shipped portrait never destroys an upload, and a
 * shared character carries whichever it actually uses.
 */
export function characterArtUrl(rec) {
  if (rec?.portrait?.assetId) return null;      // an asset — the caller resolves it
  const p = rec?.portraitId ? portraitById(rec.portraitId) : null;
  return p ? p.url : null;
}

/** A blank character, with every mechanical field present from the start so
    the sheet never has to guess whether something exists. */
export function blankCharacter(name) {
  return {
    name, alias: '', playbook: '', heritage: '', background: '', vice: '',
    look: '', blurb: '',
    actions: Object.fromEntries(SAV.ACTIONS.map(a => [a, 0])),
    stress: 0, trauma: [],
    harm: { severe: ['', ''], moderate: ['', ''], lesser: ['', ''] },
    healing: 0,
    load: 'normal', items: [], abilities: [],
    xp: { playbook: 0, insight: 0, prowess: 0, resolve: 0 },
    /* A new character starts with a face, picked at random from the shipped
       art; the player changes it if they want another. */
    portrait: null, portraitId: randomPortrait()?.id ?? null,
    clocks: [], notes: [], fields: []
  };
}

/**
 * Render a character sheet into `host`.
 *
 * `rec` is re-read from the store after every write, so the sheet always
 * edits the record as stored rather than a stale copy — two panels open on
 * the same character stay in step.
 */
export function renderCharacterSheet(host, rec, { onBack } = {}) {
  const save = async patch => {
    const fresh = await store.get('characters', rec.id) || rec;
    rec = await store.put('characters', { ...fresh, ...patch });
    renderCharacterSheet(host, rec, { onBack });
  };

  /* Every save rebuilds the sheet, which would otherwise throw away where the
     player was looking and reopen every section they had collapsed — so a
     click landed on whatever slid under the cursor instead of on what they
     aimed at. Capture that state and put it back. */
  const scroller = host.closest('.loc-info-content') || host.parentElement;
  const scrollTop = scroller?.scrollTop ?? 0;
  const collapsed = new Set(
    [...host.querySelectorAll('.sheet-section')]
      .filter(d => !d.open)
      .map(d => d.querySelector('.sheet-section-title')?.textContent));

  host.innerHTML = '';
  host.appendChild(header(rec, save, onBack));
  host.appendChild(identity(rec, save));
  host.appendChild(actionsSection(rec, save));
  host.appendChild(conditionSection(rec, save));
  host.appendChild(kitSection(rec, save));
  host.appendChild(clocksSection(rec, save));
  host.appendChild(notesSection(rec, save));
  host.appendChild(extraFields(rec, save));

  restoreView(host, scroller, scrollTop, collapsed);
}

/**
 * Put back what a rebuild discarded: which sections were collapsed, and where
 * the player had scrolled to.
 *
 * Sections are matched by their heading rather than by index, so adding one
 * does not silently collapse a different one.
 */
export function restoreView(host, scroller, scrollTop, collapsed) {
  if (collapsed.size) {
    for (const d of host.querySelectorAll('.sheet-section')) {
      const title = d.querySelector('.sheet-section-title')?.textContent;
      if (collapsed.has(title)) d.open = false;
    }
  }
  /* After layout, or the scroller has not yet grown to its full height and
     the assignment is clamped to nothing. */
  if (scroller && scrollTop) requestAnimationFrame(() => { scroller.scrollTop = scrollTop; });
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
  name.setAttribute('aria-label', t('crew.name'));
  name.addEventListener('blur', () => {
    if (name.value.trim() && name.value.trim() !== rec.name) save({ name: name.value.trim() });
  });
  name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
  h.appendChild(name);
  return h;
}

function identity(rec, save) {
  const pb = SAV.PLAYBOOKS[rec.playbook];
  const grid = el('div', 'sheet-grid');
  grid.appendChild(choice(t('sheet.playbook'), rec.playbook, SAV.PLAYBOOK_LIST,
    v => save({ playbook: v })));
  grid.appendChild(field(t('sheet.alias'), rec.alias, v => save({ alias: v })));
  grid.appendChild(choice(t('sheet.heritage'), rec.heritage, SAV.HERITAGES,
    v => save({ heritage: v })));
  grid.appendChild(choice(t('sheet.background'), rec.background, SAV.BACKGROUNDS,
    v => save({ background: v })));
  grid.appendChild(choice(t('sheet.vice'), rec.vice, SAV.VICES,
    v => save({ vice: v })));
  grid.appendChild(field(t('sheet.look'), rec.look, v => save({ look: v })));

  /* A line or two in the player's own words. It is the one part of a sheet
     that says who this person is rather than what they can do, which is why
     the share card leads with it. */
  const blurb = el('textarea', 'sheet-note-body');
  blurb.value = rec.blurb || '';
  blurb.rows = 3;
  blurb.placeholder = t('sheet.blurbCharacter');
  blurb.addEventListener('blur', () => save({ blurb: blurb.value }));

  const portrait = el('div', 'sheet-portrait');
  portrait.appendChild(el('span', 'sheet-field-label', t('sheet.portrait')));
  portrait.appendChild(portraitField({
    shipped: PORTRAITS,
    selectedId: rec.portraitId,
    asset: rec.portrait,
    /* Picking shipped art clears any upload so exactly one is in force — the
       asset itself survives in the store until nothing cites it. */
    onPick: id => save({ portraitId: id, portrait: null }),
    onUpload: async file => {
      const a = await store.putAsset(file);
      save({ portrait: { assetId: a.id, caption: '' } });
    },
    onClear: () => save({ portrait: null })
  }));

  const body = section(t('sheet.identity'), grid, blurb, portrait);
  /* The playbook's starting action is worth stating: it is the one dot the
     player did not choose, and it is easy to forget which it was. */
  if (pb) {
    body.querySelector('.sheet-section-body')
        .appendChild(el('p', 'sheet-hint',
          t('sheet.startingAction').replace('%s', t('action.' + pb.startingAction))));
  }
  return body;
}

function actionsSection(rec, save) {
  const wrap = el('div', 'sheet-attrs');
  for (const attr of SAV.ATTRIBUTES) {
    const col = el('div', 'sheet-attr');
    /* An attribute's rating for resistance rolls is the number of its actions
       with at least one dot — shown here so the player does not recount it
       every time something goes wrong. */
    const rating = attr.actions.filter(a => (rec.actions?.[a] || 0) > 0).length;
    col.appendChild(el('h4', 'sheet-attr-name',
      `${t('attr.' + attr.id)} · ${rating}`));
    for (const a of attr.actions) {
      col.appendChild(dots(rec.actions?.[a] || 0, SAV.MAX_ACTION_RATING,
        v => save({ actions: { ...rec.actions, [a]: v } }),
        { label: t('action.' + a) }));
    }
    col.appendChild(track(rec.xp?.[attr.id] || 0, SAV.XP_TRACKS.attribute,
      v => save({ xp: { ...rec.xp, [attr.id]: v } }),
      { label: t('sheet.xp'), cls: 'sheet-track-xp' }));
    wrap.appendChild(col);
  }
  const pbXp = track(rec.xp?.playbook || 0, SAV.XP_TRACKS.playbook,
    v => save({ xp: { ...rec.xp, playbook: v } }),
    { label: t('sheet.playbookXp'), cls: 'sheet-track-xp' });
  return section(t('sheet.actions'), wrap, pbXp);
}

function conditionSection(rec, save) {
  const wrap = el('div', 'sheet-condition');

  wrap.appendChild(track(rec.stress || 0, SAV.STRESS_MAX,
    v => save({ stress: v }), { label: t('sheet.stress'), cls: 'sheet-track-stress' }));

  wrap.appendChild(picks(SAV.TRAUMAS, rec.trauma || [],
    v => save({ trauma: v.slice(0, SAV.TRAUMA_MAX) })));

  const harm = el('div', 'sheet-harm');
  for (const lvl of SAV.HARM_LEVELS) {
    const row = el('div', 'sheet-harm-row');
    row.appendChild(el('span', 'sheet-harm-level', String(lvl.level)));
    for (let i = 0; i < lvl.slots; i++) {
      const inp = el('input', 'sheet-harm-slot');
      inp.value = rec.harm?.[lvl.id]?.[i] || '';
      inp.placeholder = t('sheet.harm' + lvl.level);
      inp.addEventListener('blur', () => {
        const slots = [...(rec.harm?.[lvl.id] || [])];
        slots[i] = inp.value.trim();
        save({ harm: { ...rec.harm, [lvl.id]: slots } });
      });
      row.appendChild(inp);
    }
    harm.appendChild(row);
  }
  wrap.appendChild(harm);
  wrap.appendChild(track(rec.healing || 0, SAV.HEALING_CLOCK,
    v => save({ healing: v }), { label: t('sheet.healing') }));

  return section(t('sheet.condition'), wrap);
}

function kitSection(rec, save) {
  const pb = SAV.PLAYBOOKS[rec.playbook];
  const wrap = el('div', 'sheet-kit');

  /* Load keys its own strings rather than the sav.* vocabulary, so it passes
     its own namer; the slot count is appended because that is the only thing
     load actually decides. */
  wrap.appendChild(choice(t('sheet.load'), rec.load, SAV.LOADS,
    v => save({ load: v }),
    { blank: null,
      name: id => `${t('load.' + id)} (${SAV.LOADS.find(l => l.id === id).slots})` }));

  /* Playbook items are listed with the common gear rather than separately:
     what matters when packing is the single list of everything available. */
  const items = [...SAV.COMMON_ITEMS, ...(pb?.items || [])];
  wrap.appendChild(el('h4', 'sheet-sub', t('sheet.items')));
  wrap.appendChild(picks(items, rec.items || [], v => save({ items: v })));

  if (pb) {
    wrap.appendChild(el('h4', 'sheet-sub', t('sheet.abilities')));
    wrap.appendChild(picks(pb.abilities, rec.abilities || [],
      v => save({ abilities: v }), { note: true }));
  }
  return section(t('sheet.kit'), wrap);
}

/* Clocks and notes are identical on both sheets, so they are written against
   a record and a save function rather than against a character. */

export function clocksSection(rec, save) {
  const wrap = el('div', 'sheet-clocks');
  for (const c of (rec.clocks || [])) {
    wrap.appendChild(clock(c, {
      onChange:  v => save({ clocks: rec.clocks.map(x => x.id === c.id ? { ...x, filled: v } : x) }),
      onRename:  v => save({ clocks: rec.clocks.map(x => x.id === c.id ? { ...x, name: v } : x) }),
      onResize:  v => save({ clocks: rec.clocks.map(x => x.id === c.id
                     /* Never leave a clock fuller than it is long. */
                     ? { ...x, segments: v, filled: Math.min(x.filled, v) } : x) }),
      onDelete: () => save({ clocks: rec.clocks.filter(x => x.id !== c.id) })
    }));
  }
  const add = el('button', 'sheet-add', '+ ' + t('sheet.addClock'));
  add.type = 'button';
  add.addEventListener('click', () => save({ clocks: [...(rec.clocks || []), newClock()] }));
  wrap.appendChild(add);
  return section(t('sheet.clocks'), wrap);
}

export function notesSection(rec, save) {
  const wrap = el('div', 'sheet-notes');
  const put = next => save({ notes: next });

  for (const n of (rec.notes || [])) {
    wrap.appendChild(note(n, {
      onChange: v => put(rec.notes.map(x => x.id === n.id ? v : x)),
      onDelete: () => put(rec.notes.filter(x => x.id !== n.id)),
      onAddImage: async file => {
        const a = await store.putAsset(file);
        put(rec.notes.map(x => x.id === n.id
          ? { ...x, images: [...(x.images || []), { assetId: a.id, caption: '' }] } : x));
      },
      onRemoveImage: img => put(rec.notes.map(x => x.id === n.id
        ? { ...x, images: (x.images || []).filter(i => i.assetId !== img.assetId) } : x))
    }));
  }
  const add = el('button', 'sheet-add', '+ ' + t('sheet.addNote'));
  add.type = 'button';
  add.addEventListener('click', () => put([...(rec.notes || []), newNote()]));
  wrap.appendChild(add);
  return section(t('sheet.notes'), wrap);
}

/** Whatever the group tracks that the rules do not. */
export function extraFields(rec, save) {
  const wrap = el('div', 'sheet-extra');
  for (const f of (rec.fields || [])) {
    const row = el('div', 'sheet-extra-row');
    const k = el('input', 'sheet-extra-key');
    k.value = f.label || '';
    k.placeholder = t('sheet.fieldLabel');
    k.addEventListener('blur', () => save({
      fields: rec.fields.map(x => x.id === f.id ? { ...x, label: k.value.trim() } : x) }));
    const v = el('input', 'sheet-extra-val');
    v.value = f.value || '';
    v.addEventListener('blur', () => save({
      fields: rec.fields.map(x => x.id === f.id ? { ...x, value: v.value } : x) }));
    const x = el('button', 'sheet-x', '×');
    x.type = 'button';
    x.addEventListener('click', () => save({ fields: rec.fields.filter(y => y.id !== f.id) }));
    row.append(k, v, x);
    wrap.appendChild(row);
  }
  const add = el('button', 'sheet-add', '+ ' + t('sheet.addField'));
  add.type = 'button';
  add.addEventListener('click', () => save({
    fields: [...(rec.fields || []),
             { id: crypto.randomUUID?.() || String(Math.random()).slice(2),
               label: '', value: '' }] }));
  wrap.appendChild(add);
  return section(t('sheet.extra'), wrap);
}
