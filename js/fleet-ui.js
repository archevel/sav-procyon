/* Fleet panel — the player-facing way to own vessels.
 *
 * Deliberately small: name, sprite, and where the ship is. The full ship
 * sheet (frame, systems, upgrades, crew) belongs in the ship creator; this
 * panel exists so a vessel can be put on the chart and moved without one.
 *
 * The panel never positions anything itself. It writes anchors to the store
 * and the render loop picks them up, which keeps one source of truth for
 * where a ship is.
 */

import { SECTOR } from '../data/sector.js';
import { t } from '../data/i18n.js';
import * as store from './store.js';
import { defaultAnchor, describeAnchor, anchorTargets, bodyAt,
         parkRadius, PARK_ECC, targetName, isGatePath,
         gateParkRadius, systemK } from './fleet.js';

/* Suggested sprite names, offered as a datalist. The field is free text, not
   a fixed menu: the fleet is unbounded, so any vessel must be able to name
   its own art file (img/ship-<name>.webp) without this list being edited. */
export const SPRITES = ['cerberus', 'stardancer', 'firedrake'];

/* Mirrors the chart's own constants. Kept here rather than imported from
   app.js so this module stays free of render state; both are geometry of the
   drawing, not of a vessel. */
const GATE_R = 8;
const SYS_R  = 62;

let panel, listEl, hooks = {};

/**
 * Mount the panel.
 *
 * `hooks.onSelect(id)` marks a vessel as the one 'm' will move, and
 * `hooks.onFocus(sysId)` moves the camera — both live in app.js, which owns
 * the chart. Passing them in keeps this module free of render state.
 */
export function mountFleetPanel(opts = {}) {
  hooks = opts;
  panel = document.getElementById('fleet-panel');
  listEl = document.getElementById('fleet-list');
  if (!panel) return;

  document.getElementById('fleet-btn')?.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) render();
  });
  document.getElementById('fleet-close')
    ?.addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('fleet-add')?.addEventListener('click', addShip);

  /* Keep the list honest when a vessel lands somewhere new, or when an
     import brings ships in. */
  store.subscribe(() => { if (!panel.hidden) render(); }, ['ships']);
  window.addEventListener('langchange', () => { if (!panel.hidden) render(); });
  render();
}

export function openFleetPanel() {
  if (!panel) return;
  panel.hidden = false;
  render();
}

/** A new vessel starts unplaced, so adding one never disturbs the chart. */
async function addShip() {
  const ships = await store.all('ships');
  /* Number from the highest existing default rather than the count, so
     deleting the middle of a fleet does not hand out a name already in use. */
  let n = ships.length + 1;
  const taken = new Set(ships.map(s => s.name));
  while (taken.has(`Ship ${n}`)) n++;
  await store.put('ships', { name: `Ship ${n}`, sprite: '', size: 7, location: null });
  render();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function render() {
  if (!listEl) return;
  const ships = await store.all('ships');

  if (!ships.length) {
    listEl.innerHTML = `<p class="fleet-empty">${esc(t('fleet.empty'))}</p>`;
    return;
  }

  listEl.innerHTML = ships.map(s => {
    const where = describeAnchor(s.location, t);
    const place = !where
      ? `<span class="fleet-where fleet-unplaced">${esc(t('fleet.unplaced'))}</span>`
      : `<span class="fleet-where${where.orphan ? ' fleet-orphan' : ''}">${
          esc(where.system)}${where.detail ? ' · ' + esc(where.detail) : ''}</span>`;

    /* Placement is a plain <select> of systems plus every body in them, so a
       vessel can be put anywhere without hunting on the chart first. */
    const opts = ['<option value="">—</option>']
      .concat(Object.entries(SECTOR.systems).flatMap(([sysId, sys]) => {
        const rows = [`<option value="${sysId}"${
          s.location?.mode === 'star' && s.location.system === sysId ? ' selected' : ''
        }>${esc(t(sys.key + '.name'))} — ${esc(t('fleet.hold'))}</option>`];
        for (const { path, body, depth, gate } of anchorTargets(sysId)) {
          const sel = s.location?.mode === 'body'
            && s.location.system === sysId && s.location.bodyPath === path;
          /* Gates are named as they are labelled on the chart, and marked
             so a jump point is not mistaken for a body. */
          const label = gate ? `${t('fleet.gate')} ${targetName(body, t)}`
                             : targetName(body, t);
          rows.push(`<option value="${sysId}:${path}"${sel ? ' selected' : ''}>${
            '  '.repeat(depth + 1)}${esc(label)}</option>`);
        }
        return rows;
      })).join('');

    return `<div class="fleet-row" data-id="${s.id}">
      <div class="fleet-row-top">
        <input class="fleet-name" value="${esc(s.name)}" data-id="${s.id}"
               aria-label="${esc(t('fleet.name'))}">
        <button class="fleet-x" data-del="${s.id}" title="${esc(t('fleet.delete'))}">×</button>
      </div>
      ${place}
      <div class="fleet-row-controls">
        <select class="fleet-place" data-id="${s.id}"
                aria-label="${esc(t('fleet.place'))}">${opts}</select>
        <input class="fleet-sprite" data-id="${s.id}" list="fleet-sprite-names"
               value="${esc(s.sprite || '')}" placeholder="${esc(t('fleet.sprite'))}"
               aria-label="${esc(t('fleet.sprite'))}">
      </div>
      <div class="fleet-row-actions">
        <button class="fleet-go" data-go="${s.id}"${s.location ? '' : ' disabled'}
          >${esc(t('fleet.select'))}</button>
      </div>
    </div>`;
  }).join('');

  wire(ships);
}

/**
 * Pick a starting phase that does not collide with vessels already parked at
 * the same anchor. Without this every ship sent to a body defaults to phase 0
 * and they stack exactly on top of each other, which is invisible on the
 * chart and looks like the move silently failed.
 */
function spreadPhase(ships, selfId, sysId, path) {
  const taken = ships
    .filter(s => s.id !== selfId && s.location?.system === sysId
      && (path ? (s.location.mode === 'body' && s.location.bodyPath === path)
               : s.location.mode === 'star'))
    .map(s => ((s.location.phase || 0) % 360 + 360) % 360);
  if (!taken.length) return 0;

  /* Shortest angular distance between two bearings, 0..180. */
  const gap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

  /* Try evenly spaced slots and take the first that clears every occupant.
     One more slot than occupants guarantees at least one is free. */
  const slots = taken.length + 1;
  const step = 360 / slots;
  let best = 0, bestClearance = -1;
  for (let i = 0; i < slots; i++) {
    const cand = i * step;
    const clearance = Math.min(...taken.map(p => gap(p, cand)));
    if (clearance >= step * 0.9) return cand;
    if (clearance > bestClearance) { bestClearance = clearance; best = cand; }
  }
  /* Nothing was clearly free — occupants are unevenly placed — so take
     whichever candidate sits furthest from its nearest neighbour. */
  return best;
}

function wire(ships) {
  const find = id => ships.find(s => s.id === id);

  /* Rename on blur rather than per keystroke: each save bumps rev, and a rev
     per character would make the import diff meaningless. */
  listEl.querySelectorAll('.fleet-name').forEach(inp => {
    inp.addEventListener('blur', async () => {
      const s = find(inp.dataset.id);
      if (s && inp.value.trim() && inp.value !== s.name) {
        await store.put('ships', { ...s, name: inp.value.trim() });
      }
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  });

  listEl.querySelectorAll('.fleet-sprite').forEach(inp => {
    inp.addEventListener('change', async () => {
      const s = find(inp.dataset.id);
      if (s) await store.put('ships', { ...s, sprite: inp.value.trim() });
    });
  });

  listEl.querySelectorAll('.fleet-place').forEach(sel => {
    sel.addEventListener('change', async () => {
      const s = find(sel.dataset.id);
      if (!s) return;
      const v = sel.value;
      let location = null;
      if (v.includes(':')) {
        const [sysId, path] = v.split(':');
        const body = bodyAt(sysId, path);
        /* `phase` is the bearing the vessel sits at; resolveAnchor turns the
           whole orbit to it. `argp` only offsets the ellipse's long axis from
           that bearing, so leaving it at 0 keeps the ship where it was put. */
        /* A gate has no `size` — it is drawn at a fixed ring radius — so its
           orbit comes from that ring instead of the body formula. */
        const orbit = isGatePath(path)
          ? gateParkRadius(GATE_R, systemK(sysId, SYS_R))
          : parkRadius(body?.size);
        location = { mode: 'body', system: sysId, bodyPath: path, orbit,
                     phase: spreadPhase(ships, s.id, sysId, path),
                     period: 60, ecc: PARK_ECC, argp: 0 };
      } else if (v) {
        location = { ...defaultAnchor(v),
                     phase: spreadPhase(ships, s.id, v, null) };
      }
      await store.put('ships', { ...s, location });
      if (location) hooks.onFocus?.(location.system);
    });
  });

  listEl.querySelectorAll('.fleet-go').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = find(btn.dataset.go);
      if (!s?.location) return;
      hooks.onFocus?.(s.location.system);
      /* Give the camera time to arrive before selecting, so the vessel is
         actually on screen when it lights up. */
      setTimeout(() => hooks.onSelect?.(s.id), 1200);
      panel.hidden = true;
    });
  });

  listEl.querySelectorAll('.fleet-x').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = find(btn.dataset.del);
      if (!s) return;
      /* Deleting a vessel is the one destructive action in this panel, and
         there is no undo for it yet, so it is confirmed. */
      if (!confirm(t('fleet.confirmDelete').replace('%s', s.name))) return;
      await store.remove('ships', s.id);
      render();
    });
  });
}
