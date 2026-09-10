/* The Stakeholders panel — everyone at the table who is not the crew.
 *
 * Two kinds live here. The FACTIONS are sourcebook data with player state
 * hung on them (clocks, notes — see factions-ui.js); they cannot be created
 * or deleted, only annotated. The NPCS are the GM's own: created here or
 * auto-created when a player names one as a contact, carrying a portrait,
 * a blurb, clocks and notes, and travelling in Import/Export.
 *
 * The panel replaced the always-visible faction sidebar, which owned a strip
 * of every system view whether or not anyone cared about factions right then.
 */

import { t, getLang } from '../data/i18n.js';
import * as store from './store.js';
import { FACTIONS } from '../data/factions-data.js';
import { PORTRAITS } from '../data/portraits.js';
import { el, esc, portraitField, section, clock, newClock } from './sheet-parts.js';
import { clocksSection, notesSection } from './sheet-character.js';
import { renderFactionExtras } from './factions-ui.js';
import { pushUi } from './nav.js';

let panel, listEl, detailEl, hooks = {};
/* What the panel is showing: null = the list, {kind:'faction'|'npc', id}. */
let open = null;

/** A blank NPC. No random portrait, unlike a player character: a face the GM
    did not choose would be asserting something about someone they invented. */
export function blankNpc(name) {
  return { name, blurb: '', portrait: null, portraitId: null,
           clocks: [], notes: [] };
}

/**
 * The NPC with this exact name, created if none exists.
 *
 * This is what a contact on a character sheet calls: naming someone who is
 * already a stakeholder links to them, naming someone new brings them into
 * being. Matching is exact but case-insensitive — 'rags duggan' is clearly
 * the same fixer, while a spelling variant is honestly a different record
 * the group can merge by hand.
 */
export async function ensureNpc(name) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const all = await store.all('npcs');
  const hit = all.find(n => (n.name || '').trim().toLowerCase() === clean.toLowerCase());
  if (hit) return hit;
  return store.put('npcs', blankNpc(clean));
}

/**
 * Fuzzy match a query against NPC names, best first.
 *
 * Three tiers, so behaviour is explainable at the table:
 *   substring   — 'rl' finds 'Karl Holm', earlier and tighter is better
 *   subsequence — letters in order with gaps, 'khm' finds 'Karl Holm'
 *   edit slack  — up to two typos against any single word, 'Kral' finds Karl
 *
 * Pure, so it can be tested without a panel.
 */
export function fuzzyNpcs(query, npcs, limit = 5) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const n of npcs) {
    const name = String(n.name || '').toLowerCase();
    let score = 0;
    const at = name.indexOf(q);
    if (at >= 0) {
      score = 100 - at - (name.length - q.length) * 0.2;
      /* Matching the start of a word beats matching mid-word. */
      if (at === 0 || name[at - 1] === ' ') score += 10;
    } else if (isSubsequence(q, name)) {
      score = 55 - (name.length - q.length) * 0.2;
    } else {
      let best = Infinity;
      for (const w of name.split(/\s+/)) best = Math.min(best, editDistance(q, w));
      if (best <= 2 && q.length >= 3) score = 40 - best * 10;
    }
    if (score > 0) scored.push({ npc: n, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.npc);
}

function isSubsequence(q, name) {
  let i = 0;
  for (const ch of name) if (ch === q[i]) i++;
  return i === q.length;
}

function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;             // cannot be within reach
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
                        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function mountStakeholdersPanel(opts = {}) {
  hooks = opts;
  panel = document.getElementById('stakeholders-panel');
  listEl = document.getElementById('stakeholders-list');
  detailEl = document.getElementById('stakeholder-detail');
  if (!panel) return;

  document.getElementById('stakeholders-btn')?.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { pushUi('stakeholders'); open = null; render(); }
  });
  document.getElementById('stakeholders-close')
    ?.addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('npc-add')?.addEventListener('click', addNpc);
  panel.addEventListener('click', e => { if (e.target === panel) panel.hidden = true; });

  store.subscribe(() => { if (!panel.hidden) render(); }, ['npcs', 'factions']);
  window.addEventListener('langchange', () => { if (!panel.hidden) render(); });
}

/* Opened from inside another panel (a contact chip, a ship's status row),
   this one must surface ABOVE it — panels share a z-index and otherwise
   resolve by DOM order, which puts this panel underneath. Cleared when it
   closes so ordinary opens stack normally again. */
function surfaceAt(kind, id, tag) {
  if (!panel) return;
  if (panel.hidden) { pushUi('stakeholders'); panel.hidden = false; }
  panel.style.zIndex = 70;
  new MutationObserver((m, obs) => {
    if (panel.hidden) { panel.style.zIndex = ''; obs.disconnect(); }
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  pushUi(tag);
  open = { kind, id };
  render();
}

/** Open the panel directly on one NPC — the contact chips use this. */
export function openNpc(id) { surfaceAt('npc', id, 'npc-sheet'); }

/** Open the panel directly on one faction — the ship's status rows use it. */
export function openFaction(slug) { surfaceAt('faction', slug, 'faction'); }

async function addNpc() {
  const rows = await store.all('npcs');
  let n = rows.length + 1;
  const taken = new Set(rows.map(r => r.name));
  while (taken.has(`NPC ${n}`)) n++;
  const rec = await store.put('npcs', blankNpc(`NPC ${n}`));
  pushUi('npc-sheet');
  open = { kind: 'npc', id: rec.id };
  render();
}

function factionName(f) {
  const lang = getLang();
  if (lang === 'debug') return `faction.${f.slug}.title`;
  return f.title?.[lang] || f.title?.sv || f.title?.en || f.slug;
}

async function render() {
  if (!listEl) return;

  if (open?.kind === 'npc') {
    const rec = await store.get('npcs', open.id);
    if (rec) return showNpc(rec);
    open = null;
  }
  if (open?.kind === 'faction') {
    const f = FACTIONS.find(x => x.slug === open.id);
    if (f) return showFaction(f);
    open = null;
  }
  return showList();
}

async function showList() {
  detailEl.hidden = true;
  detailEl.innerHTML = '';
  listEl.hidden = false;
  document.getElementById('npc-add').hidden = false;

  /* Factions near the current system first, when there is one — the old
     sidebar's one virtue, kept. */
  const sysId = hooks.currentSystem?.() || null;
  const here = sysId ? FACTIONS.filter(f => f.systems.includes(sysId)) : [];
  const rest = FACTIONS.filter(f => !here.includes(f));
  const npcs = await store.all('npcs');

  const factionRow = f => `<button class="faction-pill" data-faction="${f.slug}">${
    esc(factionName(f))}</button>`;
  const npcRow = n => `<div class="fleet-row" data-id="${n.id}">
      <div class="fleet-row-top">
        <button class="crew-open" data-npc="${n.id}">${esc(n.name)}</button>
        <button class="fleet-x" data-del="${n.id}" title="${esc(t('npc.delete'))}">×</button>
      </div>
    </div>`;

  listEl.innerHTML = `
    ${npcs.length ? `<div class="factions-title">${t('npc.title')}</div>
                     ${npcs.map(npcRow).join('')}` : ''}
    ${here.length ? `<div class="factions-title">${t('stakeholders.here')}</div>
                     <div class="stakeholder-pills">${here.map(factionRow).join('')}</div>` : ''}
    <div class="factions-title">${here.length ? t('stakeholders.elsewhere')
                                              : t('panel.factions.title')}</div>
    <div class="stakeholder-pills">${rest.map(factionRow).join('')}</div>`;

  listEl.querySelectorAll('[data-faction]').forEach(btn =>
    btn.addEventListener('click', () => {
      pushUi('faction');
      open = { kind: 'faction', id: btn.dataset.faction };
      render();
    }));
  listEl.querySelectorAll('[data-npc]').forEach(btn =>
    btn.addEventListener('click', () => {
      pushUi('npc-sheet');
      open = { kind: 'npc', id: btn.dataset.npc };
      render();
    }));
  listEl.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const n = npcs.find(x => x.id === btn.dataset.del);
      if (!n) return;
      /* Contacts pointing here become dangling names, deliberately: the NPC
         may be referenced from sheets this panel knows nothing about, and a
         silent cascade would eat a player's contact list. */
      if (!confirm(t('npc.confirmDelete').replace('%s', n.name))) return;
      await store.remove('npcs', n.id);
      render();
    }));
}

function backRow(label) {
  const head = el('div', 'sheet-head');
  const back = el('button', 'sheet-back', '‹ ' + t('sheet.back'));
  back.type = 'button';
  back.addEventListener('click', () => { open = null; render(); });
  head.appendChild(back);
  if (label) head.appendChild(el('span', 'stakeholder-head-label', label));
  return head;
}

async function showFaction(f) {
  listEl.hidden = true;
  document.getElementById('npc-add').hidden = true;
  detailEl.hidden = false;
  detailEl.innerHTML = '';
  detailEl.appendChild(backRow(''));

  /* The sourcebook half is rendered by app.js, which owns the markdown and
     sourcebook helpers; the player half is the same clocks-and-notes block
     the old sidebar panel used. */
  const canon = el('div', 'faction-info-content stakeholder-canon');
  detailEl.appendChild(canon);
  hooks.renderFactionDetail?.(canon, f);
  const extras = el('div');
  detailEl.appendChild(extras);
  await renderFactionExtras(extras, f);
}

function showNpc(rec) {
  listEl.hidden = true;
  document.getElementById('npc-add').hidden = true;
  detailEl.hidden = false;
  detailEl.innerHTML = '';

  const save = async patch => {
    const fresh = await store.get('npcs', rec.id) || rec;
    rec = await store.put('npcs', { ...fresh, ...patch });
    showNpc(rec);
  };

  detailEl.appendChild(backRow(''));

  const name = el('input', 'sheet-name');
  name.maxLength = 40;
  name.value = rec.name || '';
  name.addEventListener('blur', () => {
    if (name.value.trim() && name.value.trim() !== rec.name)
      save({ name: name.value.trim() });
  });
  name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
  detailEl.appendChild(name);

  const blurb = el('textarea', 'sheet-note-body');
  blurb.value = rec.blurb || '';
  blurb.rows = 3;
  blurb.placeholder = t('npc.blurb');
  blurb.addEventListener('blur', () => save({ blurb: blurb.value }));

  const portrait = el('div', 'sheet-portrait');
  portrait.appendChild(el('span', 'sheet-field-label', t('sheet.portrait')));
  portrait.appendChild(portraitField({
    shipped: PORTRAITS,
    selectedId: rec.portraitId,
    asset: rec.portrait,
    onPick: id => save({ portraitId: id, portrait: null }),
    onUpload: async file => {
      const a = await store.putAsset(file);
      save({ portrait: { assetId: a.id, caption: '' } });
    },
    onClear: () => save({ portrait: null })
  }));

  detailEl.appendChild(section(t('sheet.identity'), blurb, portrait));
  /* The same clocks and notes every other sheet carries. */
  detailEl.appendChild(clocksSection(rec, save));
  detailEl.appendChild(notesSection(rec, save));
}
