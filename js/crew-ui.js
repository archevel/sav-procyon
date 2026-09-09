/* Crew panel — the player's characters.
 *
 * Deliberately a stub of the eventual character creator: name and playbook
 * only, so characters can be created, listed and deleted while the full sheet
 * (action ratings, stress, harm, load, clocks, notes, portraits) is built.
 * Records already carry the store's id/originId/rev triple, so characters
 * made now survive into the creator and into sharing without a migration.
 */

import { t } from '../data/i18n.js';
import * as store from './store.js';

/* Playbook names only. The mechanics behind them belong in data/sav.js with
   the rest of the rules; this list exists so the field is a menu rather than
   free text, and can be replaced wholesale by that module later. */
export const PLAYBOOKS = [
  'Muscle', 'Pilot', 'Speaker', 'Scoundrel', 'Stitch', 'Mechanic', 'Mystic'
];

let panel, listEl;

export function mountCrewPanel() {
  panel  = document.getElementById('crew-panel');
  listEl = document.getElementById('crew-list');
  if (!panel) return;

  document.getElementById('crew-btn')?.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) render();
  });
  document.getElementById('crew-close')
    ?.addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('crew-add')?.addEventListener('click', addCharacter);
  panel.addEventListener('click', e => { if (e.target === panel) panel.hidden = true; });

  store.subscribe(() => { if (!panel.hidden) render(); }, ['characters']);
  window.addEventListener('langchange', () => { if (!panel.hidden) render(); });
}

async function addCharacter() {
  const rows = await store.all('characters');
  /* First unused default name, so deleting from the middle of a roster does
     not hand out a name already in use. */
  let n = rows.length + 1;
  const taken = new Set(rows.map(r => r.name));
  while (taken.has(`Character ${n}`)) n++;
  await store.put('characters', { name: `Character ${n}`, playbook: '' });
  render();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function render() {
  if (!listEl) return;
  const rows = await store.all('characters');

  if (!rows.length) {
    listEl.innerHTML = `<p class="fleet-empty">${esc(t('crew.empty'))}</p>`;
    return;
  }

  listEl.innerHTML = rows.map(c => `<div class="fleet-row" data-id="${c.id}">
      <div class="fleet-row-top">
        <input class="crew-name" value="${esc(c.name)}" data-id="${c.id}"
               aria-label="${esc(t('crew.name'))}">
        <button class="fleet-x" data-del="${c.id}"
                title="${esc(t('crew.delete'))}">×</button>
      </div>
      <div class="fleet-row-controls">
        <select class="crew-playbook" data-id="${c.id}"
                aria-label="${esc(t('crew.playbook'))}">
          <option value="">— ${esc(t('crew.playbook'))} —</option>
          ${PLAYBOOKS.map(pb => `<option value="${pb}"${
            c.playbook === pb ? ' selected' : ''}>${esc(pb)}</option>`).join('')}
        </select>
      </div>
    </div>`).join('');

  const find = id => rows.find(r => r.id === id);

  /* Rename on blur, not per keystroke: every save bumps rev, and a rev per
     character typed would make an import's newer/older comparison useless. */
  listEl.querySelectorAll('.crew-name').forEach(inp => {
    inp.addEventListener('blur', async () => {
      const c = find(inp.dataset.id);
      if (c && inp.value.trim() && inp.value !== c.name) {
        await store.put('characters', { ...c, name: inp.value.trim() });
      }
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  });

  listEl.querySelectorAll('.crew-playbook').forEach(sel => {
    sel.addEventListener('change', async () => {
      const c = find(sel.dataset.id);
      if (c) await store.put('characters', { ...c, playbook: sel.value });
    });
  });

  listEl.querySelectorAll('.fleet-x').forEach(btn => {
    btn.addEventListener('click', async () => {
      const c = find(btn.dataset.del);
      if (!c) return;
      /* No undo for an ordinary delete yet — the snapshot machinery exists
         but only imports use it — so this is confirmed. */
      if (!confirm(t('crew.confirmDelete').replace('%s', c.name))) return;
      await store.remove('characters', c.id);
      render();
    });
  });
}
