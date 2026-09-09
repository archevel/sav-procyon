/* Crew panel — the player's characters.
 *
 * Two views in one panel: a roster of everyone, and one character's sheet.
 * The roster stays deliberately thin (name, playbook, a way in) because the
 * sheet is where the detail belongs; keeping both in one panel means the
 * player never loses their place navigating between them.
 */

import { t } from '../data/i18n.js';
import * as store from './store.js';
import { savName } from './sheet-parts.js';
import { renderCharacterSheet, blankCharacter } from './sheet-character.js';

let panel, listEl, sheetEl;
/* Which character the panel is showing a sheet for; null shows the roster. */
let openId = null;

export function mountCrewPanel() {
  panel   = document.getElementById('crew-panel');
  listEl  = document.getElementById('crew-list');
  sheetEl = document.getElementById('crew-sheet');
  if (!panel) return;

  document.getElementById('crew-btn')?.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    /* Always return to the roster when reopening: a sheet left open from an
       earlier session is rarely the one wanted next. */
    if (!panel.hidden) { openId = null; render(); }
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
  const rec = await store.put('characters', blankCharacter(`Character ${n}`));
  /* Open the new sheet straight away — creating a character is almost always
     the first half of filling one in. */
  openId = rec.id;
  render();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function render() {
  if (!listEl) return;

  if (openId) {
    const rec = await store.get('characters', openId);
    if (rec) return showSheet(rec);
    openId = null;                       // deleted from elsewhere
  }
  showRoster(await store.all('characters'));
}

/** One character's sheet, filling the panel. */
function showSheet(rec) {
  listEl.hidden = true;
  sheetEl.hidden = false;
  document.getElementById('crew-add').hidden = true;
  renderCharacterSheet(sheetEl, rec, { onBack: () => { openId = null; render(); } });
}

function showRoster(rows) {
  sheetEl.hidden = true;
  sheetEl.innerHTML = '';
  listEl.hidden = false;
  document.getElementById('crew-add').hidden = false;

  if (!rows.length) {
    listEl.innerHTML = `<p class="fleet-empty">${esc(t('crew.empty'))}</p>`;
    return;
  }

  listEl.innerHTML = rows.map(c => {
    return `<div class="fleet-row" data-id="${c.id}">
      <div class="fleet-row-top">
        <button class="crew-open" data-open="${c.id}">${esc(c.name)}</button>
        <button class="fleet-x" data-del="${c.id}"
                title="${esc(t('crew.delete'))}">×</button>
      </div>
      <span class="fleet-where">${c.playbook ? esc(savName(c.playbook))
                                                  : esc(t('crew.noPlaybook'))}</span>
    </div>`;
  }).join('');

  listEl.querySelectorAll('.crew-open').forEach(btn => {
    btn.addEventListener('click', () => { openId = btn.dataset.open; render(); });
  });

  listEl.querySelectorAll('.fleet-x').forEach(btn => {
    btn.addEventListener('click', async () => {
      const c = rows.find(r => r.id === btn.dataset.del);
      if (!c) return;
      /* No undo for an ordinary delete yet — the snapshot machinery exists
         but only imports use it — so this is confirmed. */
      if (!confirm(t('crew.confirmDelete').replace('%s', c.name))) return;
      await store.remove('characters', c.id);
      render();
    });
  });
}
