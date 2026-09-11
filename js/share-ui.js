/* The share panel: pick what to send, and receive what someone sent.
 *
 * There is one transport — an image carrying its own data — so export is a
 * checklist and a single button rather than a choice between formats. Import
 * shows what every incoming item would do BEFORE anything is written,
 * defaults every choice to the non-destructive one, and leaves an undo entry
 * behind.
 */

import { t } from '../data/i18n.js';
import * as store from './store.js';
import * as share from './share.js';
import { el } from './sheet-parts.js';
import { describePlace } from './notes-ui.js';
import { untouchedSeed } from './stakeholders-ui.js';
import { pushUi } from './nav.js';

let panel, body;

export function mountSharePanel() {
  panel = document.getElementById('share-panel');
  body  = document.getElementById('share-body');
  if (!panel) return;

  document.getElementById('share-btn')?.addEventListener('click', () => {
    if (panel.hidden) pushUi('share');
    panel.hidden = false;
    showExport();
  });
  document.getElementById('share-close')
    ?.addEventListener('click', () => { panel.hidden = true; });
  panel.addEventListener('click', e => { if (e.target === panel) panel.hidden = true; });

  /* Dropping a share anywhere on the page imports it — the file came from a
     chat window, and hunting for a button first is friction. */
  window.addEventListener('dragover', e => { e.preventDefault(); });
  window.addEventListener('drop', async e => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    panel.hidden = false;
    try {
      showImport({ ...(await share.readFile(file)), source: 'file' });
    } catch (err) { showError(err.message); }
  });
}

function showError(msg) {
  body.innerHTML = '';
  body.appendChild(el('h3', null, t('share.title')));
  body.appendChild(el('p', 'share-error', msg));
}

/* ---------------------------------------------------------------- export */

async function showExport() {
  body.innerHTML = '';
  body.appendChild(el('h3', null, t('share.title')));
  body.appendChild(el('p', 'fleet-hint', t('share.exportHint')));

  const rows = [];
  for (const s of ['ships', 'characters', 'npcs', 'notes', 'factions']) {
    for (const rec of await store.all(s)) {
      /* Canon-seeded individuals exist in every browser already; only ones
         the table has actually touched are worth offering. */
      if (s === 'npcs' && untouchedSeed(rec)) continue;
      /* Same for faction records: merely viewing a faction seeds one (rev 1,
         empty goal clock). Sending that shell could only overwrite a
         recipient's real progress with nothing. */
      if (s === 'factions' && (rec.rev ?? 1) <= 1) continue;
      rows.push({ store: s, record: rec });
    }
  }
  if (!rows.length) {
    body.appendChild(el('p', 'fleet-empty', t('share.nothing')));
    return;
  }

  const chosen = new Set();       // nothing preselected; sharing is opt-in
  const list = el('div', 'share-list');

  const allRow = el('label', 'share-row share-row-all');
  const allCb = el('input');
  allCb.type = 'checkbox';
  const syncAll = () => {
    allCb.checked = chosen.size === rows.length;
    allCb.indeterminate = chosen.size > 0 && chosen.size < rows.length;
  };
  allCb.addEventListener('change', () => {
    for (const box of list.querySelectorAll('input[data-id]')) box.checked = allCb.checked;
    chosen.clear();
    if (allCb.checked) for (const r of rows) chosen.add(r.record.id);
    syncAll();
    refresh();
  });
  allRow.appendChild(allCb);
  allRow.appendChild(el('span', 'share-label', t('share.selectAll')));
  list.appendChild(allRow);

  for (const row of rows) {
    const line = el('label', 'share-row');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => {
      cb.checked ? chosen.add(row.record.id) : chosen.delete(row.record.id);
      /* Ticking a character pulls in the NPCs their contacts point at, so
         the recipient gets working links instead of dangling names. Only
         ever ticks — unticking is the sender's call to make by hand. */
      if (cb.checked && row.store === 'characters') {
        for (const c of (row.record.contacts || [])) {
          const npcRow = rows.find(r => r.store === 'npcs' && r.record.id === c.npcId);
          if (npcRow && !chosen.has(npcRow.record.id)) {
            chosen.add(npcRow.record.id);
            const box = list.querySelector(`input[data-id="${npcRow.record.id}"]`);
            if (box) box.checked = true;
          }
        }
      }
      syncAll();
      refresh();
    });
    cb.dataset.id = row.record.id;
    line.appendChild(cb);
    line.appendChild(el('span', 'share-kind', t('share.' + row.store)));
    line.appendChild(el('span', 'share-label', describeRow(row)));
    list.appendChild(line);
  }
  body.appendChild(list);

  const meter = el('div', 'share-meter');
  body.appendChild(meter);
  const actions = el('div', 'share-actions');
  body.appendChild(actions);

  const selected = () => rows.filter(r => chosen.has(r.record.id));

  async function refresh() {
    const items = selected();
    actions.innerHTML = '';
    meter.innerHTML = '';
    if (!items.length) {
      meter.appendChild(el('p', 'fleet-hint', t('share.pickSomething')));
      return;
    }

    const payload = await share.buildPayload(items);
    const imageCount = Object.keys(payload.assets).length;

    meter.appendChild(el('p', 'share-size',
      t('share.size')
        .replace('%n', items.length)
        .replace('%i', imageCount)));

    /* One way out. The image previews in a chat AND imports here, so a second
       transport would only be a weaker option sitting next to the better
       one. */
    button(actions, t('share.png'), async () => {
      const blob = await share.sharePng(items, payload);
      share.download(blob, share.shareName(items, 'png'));
    }, true);
  }
  refresh();

  /* And one way in that does not depend on dropping a file, which is awkward
     on a phone and impossible to discover. */
  body.appendChild(receiveRow());
}

/** The import affordance: drop a shared image, or pick one. */
function receiveRow() {
  const wrap = el('div', 'share-receive');
  wrap.appendChild(el('span', 'share-receive-text', t('share.receiveHint')));
  const pick = el('label', 'loc-info-btn share-pick-file', t('share.pickFile'));
  const input = el('input');
  input.type = 'file';
  input.accept = 'image/png,application/json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try { showImport({ ...(await share.readFile(file)), source: 'file' }); }
    catch (err) { showError(err.message); }
  });
  pick.appendChild(input);
  wrap.appendChild(pick);
  return wrap;
}

function describeRow(row) {
  if (row.store === 'notes') {
    const place = describePlace(row.record.target);
    const where = place
      ? `${place.system}${place.detail ? ' · ' + place.detail : ''}`
      : t('notes.orphans');
    return `${row.record.title || '—'} (${where})`;
  }
  return row.record.name || '—';
}

/* ---------------------------------------------------------------- import */

async function showImport(payload) {
  body.innerHTML = '';
  body.appendChild(el('h3', null, t('share.importTitle')));

  let plan;
  try { plan = await share.planImport(payload); }
  catch (err) { return showError(err.message); }

  if (!plan.length) {
    body.appendChild(el('p', 'fleet-empty', t('share.nothingToImport')));
    return;
  }

  body.appendChild(el('p', 'fleet-hint',
    payload.from ? t('share.fromWho').replace('%s', payload.from)
                 : t('share.importHint')));

  const list = el('div', 'share-list');
  for (const row of plan) {
    const line = el('div', 'share-row share-import-row');

    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = row.include;
    cb.addEventListener('change', () => { row.include = cb.checked; });
    line.appendChild(cb);

    line.appendChild(el('span', 'share-kind', t('share.' + row.store)));
    line.appendChild(el('span', 'share-label',
      row.incoming.name || row.incoming.title || '—'));
    line.appendChild(el('span', 'share-status share-status-' + row.status,
      t('share.status.' + row.status)));

    /* Only a conflict needs a decision. Keep-both is preselected: replacing
       is the one action here that can lose work. Factions are the exception —
       they are keyed by slug, so a second copy of the Cobalt Syndicate is
       invisible to the UI; the only meaningful choices are replace or skip,
       and the checkbox is the skip. */
    if (row.status === 'conflict' && row.store !== 'factions') {
      const pick = el('select', 'share-pick');
      for (const [val, key] of [['copy', 'share.keepBoth'], ['replace', 'share.replace']]) {
        const o = el('option', null, t(key));
        o.value = val;
        pick.appendChild(o);
      }
      pick.value = row.action;
      pick.addEventListener('change', () => { row.action = pick.value; });
      line.appendChild(pick);
    }
    list.appendChild(line);
  }
  body.appendChild(list);

  const actions = el('div', 'share-actions');
  button(actions, t('share.doImport'), async () => {
    const entry = await share.applyImport(payload, plan);
    showImported(entry);
  }, true);
  button(actions, t('share.cancel'), () => { panel.hidden = true; });
  body.appendChild(actions);
}

function showImported(entry) {
  body.innerHTML = '';
  body.appendChild(el('h3', null, t('share.importedTitle')));
  body.appendChild(el('p', 'share-ok',
    t('share.imported')
      .replace('%a', entry.created.length)
      .replace('%b', entry.replaced.length)));

  const actions = el('div', 'share-actions');
  /* Undo is offered here rather than buried in a log, because now is when the
     recipient can tell whether the import did what they expected. */
  button(actions, t('share.undo'), async () => {
    const res = await store.revertImport(entry.id);
    if (!res.ok) {
      const names = res.edited.map(e => e.name || e.id).join(', ');
      if (!confirm(t('share.undoEdited').replace('%s', names))) return;
      await store.revertImport(entry.id, { force: true });
    }
    body.innerHTML = '';
    body.appendChild(el('h3', null, t('share.importedTitle')));
    body.appendChild(el('p', 'share-ok', t('share.undone')));
  });
  button(actions, t('share.done'), () => { panel.hidden = true; }, true);
  body.appendChild(actions);
}

/* ----------------------------------------------------------------- utils */

function button(host, text, onClick, primary = false) {
  const b = el('button', 'loc-info-btn' + (primary ? ' is-primary' : ''), text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  host.appendChild(b);
  return b;
}
