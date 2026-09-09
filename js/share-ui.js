/* The share panel: pick what to send, choose how, and receive.
 *
 * Export is a checklist with a live size readout, because the only way a link
 * can be trusted is if the sender is told when it stops being one. Import
 * shows what every incoming item would do BEFORE anything is written, defaults
 * every choice to the non-destructive one, and leaves an undo entry behind.
 */

import { t } from '../data/i18n.js';
import * as store from './store.js';
import * as share from './share.js';
import { el } from './sheet-parts.js';
import { describePlace } from './notes-ui.js';

let panel, body;

export function mountSharePanel() {
  panel = document.getElementById('share-panel');
  body  = document.getElementById('share-body');
  if (!panel) return;

  document.getElementById('share-btn')?.addEventListener('click', () => {
    panel.hidden = false;
    showExport();
  });
  document.getElementById('share-close')
    ?.addEventListener('click', () => { panel.hidden = true; });
  panel.addEventListener('click', e => { if (e.target === panel) panel.hidden = true; });

  /* A share arriving as a link. The fragment is cleared once handled so a
     reload does not re-prompt for an import already decided. */
  if (location.hash.startsWith('#d=')) {
    const frag = location.hash.slice(3);
    history.replaceState(null, '', location.pathname + location.search);
    share.decodeLink(frag)
      .then(p => { panel.hidden = false; showImport({ ...p, source: 'link' }); })
      .catch(() => { panel.hidden = false; showError(t('share.errBadLink')); });
  }

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
  for (const s of ['ships', 'characters', 'notes']) {
    for (const rec of await store.all(s)) rows.push({ store: s, record: rec });
  }
  if (!rows.length) {
    body.appendChild(el('p', 'fleet-empty', t('share.nothing')));
    return;
  }

  const chosen = new Set(rows.map(r => r.record.id));   // default to everything
  const list = el('div', 'share-list');

  for (const row of rows) {
    const line = el('label', 'share-row');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', () => {
      cb.checked ? chosen.add(row.record.id) : chosen.delete(row.record.id);
      refresh();
    });
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

    /* Images decide the transports as much as size does: a link cannot carry
       them, so a share with portraits is a file share whatever its length. */
    const withImages = await share.buildPayload(items, { withImages: true });
    const textOnly   = await share.buildPayload(items, { withImages: false });
    const link = await share.shareUrl(textOnly);
    const imageCount = Object.keys(withImages.assets).length;

    meter.appendChild(el('p', 'share-size',
      t('share.size')
        .replace('%n', items.length)
        .replace('%b', formatBytes(link.bytes))));

    /* The PNG is the file format: it previews in a chat AND imports here, so
       offering a second one would only ask the player to choose between two
       files that carry identical data. */
    button(actions, t('share.png'), async () => {
      const blob = await share.sharePng(items, withImages);
      share.download(blob, share.shareName(items, 'png'));
    }, true);

    if (link.ok) {
      button(actions, imageCount ? t('share.linkNoImages') : t('share.link'), async () => {
        await navigator.clipboard.writeText(link.url);
        meter.appendChild(el('p', 'share-ok', t('share.copied')));
      });
    } else {
      meter.appendChild(el('p', 'share-warn', t('share.tooLongForLink')));
    }

    if (imageCount) {
      meter.appendChild(el('p', 'fleet-hint',
        t('share.imagesNote').replace('%n', imageCount)));
    }
  }
  refresh();
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
       is the one action here that can lose work. */
    if (row.status === 'conflict') {
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

function formatBytes(n) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} kB`;
}
