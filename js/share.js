/* Sharing.
 *
 * One payload, one way out: a PNG card with the data in a tEXt chunk. It
 * previews in a chat and imports here, so it does both jobs a share has, and
 * anything else offered alongside would be a weaker option next to it — a URL
 * cannot carry portraits at any useful size, and a JSON file carries the same
 * bytes with nothing to look at.
 *
 * Import still ACCEPTS JSON, so a file exported by an older version, or one
 * written by hand, stays usable.
 *
 * Import never overwrites without being told to. Every incoming record is
 * matched by `originId`, which survives export, and the recipient chooses per
 * item whether to keep both or replace theirs; a replacement snapshots what it
 * displaced so the whole import can be reverted afterwards.
 */

import { t } from '../data/i18n.js';
import * as store from './store.js';
import { embed, extract, isPng } from './png-data.js';
import { shareCard } from './share-card.js';

export const PAYLOAD_VERSION = 1;

/* --------------------------------------------------------------- payload */

/**
 * Build the payload for a set of selected items.
 *
 * Images always travel: the only transport is a file, and a sheet that
 * arrives without its portraits is a worse share than a larger one.
 */
export async function buildPayload(items, { from = null } = {}) {
  const assets = {};
  for (const id of collectAssetIds(items)) {
    const a = await store.getAsset(id);
    if (a) assets[id] = { mime: a.mime, w: a.w, h: a.h, data: await blobToBase64(a.blob) };
  }
  return {
    v: PAYLOAD_VERSION,
    at: new Date().toISOString(),
    from: from || null,
    items: items.map(i => ({ store: i.store, record: i.record })),
    assets
  };
}

function collectAssetIds(items) {
  const ids = new Set();
  for (const i of items) for (const id of store.assetIdsOf(i.record)) ids.add(id);
  return [...ids];
}

/* ------------------------------------------------------------- transports */

/** A PNG that both previews as a card and carries the payload. */
export async function sharePng(items, payload) {
  const card = await shareCard(items);
  const bytes = new Uint8Array(await card.arrayBuffer());
  return new Blob([await embed(bytes, payload)], { type: 'image/png' });
}

/**
 * Read a payload out of a dropped or chosen file.
 *
 * PNG is what this app writes; JSON is accepted because a file exported by an
 * older version, or hand-written, should still import. A PNG with no payload
 * is a picture someone dropped by mistake, and says so rather than failing
 * obscurely.
 */
export async function readFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isPng(bytes)) {
    const payload = await extract(bytes);
    if (!payload) throw new Error(t('share.errNoPayload'));
    return payload;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/* ---------------------------------------------------------------- import */

/**
 * Work out what an incoming payload would do to the local store.
 *
 * Every item is classified before anything is written, so the recipient sees
 * the whole picture and decides per item. `identical` items are listed but
 * default to skipped: re-importing an unchanged sheet should be a no-op, not
 * a duplicate.
 */
export async function planImport(payload) {
  if (!payload || payload.v !== PAYLOAD_VERSION) {
    throw new Error(t('share.errVersion'));
  }
  const plan = [];
  for (const item of payload.items || []) {
    if (!store.RECORD_STORES.includes(item.store)) continue;   // unknown kind
    const incoming = item.record;
    const mine = (await store.byOrigin(item.store, incoming.originId))
      /* A record imported twice can exist several times over; compare against
         whichever copy is closest to the incoming one. */
      .sort((a, b) => (b.rev || 0) - (a.rev || 0))[0] || null;

    let status = 'new';
    if (mine) status = sameContent(mine, incoming) ? 'identical' : 'conflict';
    /* Factions are slug-keyed singletons: a kept-both copy would be invisible
       to the faction panel, which looks the slug up directly. Their conflicts
       therefore default to replace — still snapshotted, still undoable. */
    const conflictAction = item.store === 'factions' ? 'replace' : 'copy';
    plan.push({
      store: item.store, incoming, mine, status,
      /* Non-destructive by default: a conflict keeps both unless the
         recipient deliberately asks for a replacement. */
      action: status === 'identical' ? 'skip' : status === 'new' ? 'add' : conflictAction,
      include: status !== 'identical'
    });
  }
  return plan;
}

/** Content equality ignoring the bookkeeping that always differs.
 *
 * The obvious one-liner — stringify with the sorted key list as a replacer —
 * is wrong: a replacer ARRAY filters keys at every depth, so nested state
 * like a clock's `filled` or an action's rating vanished from the comparison
 * and records differing only there read as identical. Keys are sorted
 * recursively instead. */
function sameContent(a, b) {
  const strip = ({ id, rev, createdAt, updatedAt, ...rest }) => canonical(rest);
  return strip(a) === strip(b);
}

function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort()
      .map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  }
  return JSON.stringify(v) ?? 'null';
}

/**
 * Apply a plan, recording what was done so it can be undone.
 *
 * Assets land first: a record referring to an image that is not yet stored
 * would render a gap until the next reload, and a failure part-way would
 * leave records pointing at nothing.
 */
export async function applyImport(payload, plan) {
  const created = [], replaced = [], newAssets = [];

  for (const [id, a] of Object.entries(payload.assets || {})) {
    const existing = await store.getAsset(id);
    if (existing) continue;              // same bytes already here
    const blob = base64ToBlob(a.data, a.mime);
    await store.putAssetRaw({ id, blob, mime: a.mime, w: a.w, h: a.h });
    newAssets.push(id);
  }

  for (const row of plan) {
    if (!row.include || row.action === 'skip') continue;

    if (row.action === 'replace' && row.mine) {
      /* Snapshot BEFORE writing: this is the only copy of what the recipient
         had, and the whole undo story depends on it. */
      replaced.push({ store: row.store, snapshot: structuredClone(row.mine) });
      const merged = { ...row.incoming, id: row.mine.id, originId: row.mine.originId };
      await store.put(row.store, merged, { keepRev: true });
    } else {
      /* 'add' and 'copy' are the same write: a fresh local id, the origin
         preserved so a future import can still match it. Factions keep their
         incoming id — it IS the slug, and a uid would orphan the record from
         the panel that looks factions up by slug. */
      const keepId = row.store === 'factions';
      const rec = await store.put(row.store,
        { ...row.incoming, id: keepId ? row.incoming.id : undefined },
        { keepRev: true });
      created.push({ store: row.store, id: rec.id, rev: rec.rev });
    }
  }

  return store.logImport({
    from: payload.from, source: payload.source || 'file',
    created, replaced, assets: newAssets
  });
}

/* ----------------------------------------------------------------- bytes */

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function base64ToBlob(b64, mime) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Trigger a download. Blobs only — nothing here fetches. */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Revoke on the next tick: revoking immediately races the download in
     some browsers. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A filename that says what it holds without leaking anything private. */
export function shareName(items, ext) {
  const crew = items.filter(i => i.store !== 'notes');
  const base = crew.length === 1
    ? String(crew[0].record.name || 'share').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'procyon-share';
  return `${base || 'procyon-share'}.${ext}`;
}
