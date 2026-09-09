/* Sharing.
 *
 * One payload shape, two transports out:
 *
 *   link   #d=<deflated base64>   small, text only, images left behind
 *   png    a card with the payload in a tEXt chunk — previews in a chat AND
 *          imports here, which is the reason this format exists
 *
 * There is deliberately no second file format. The PNG carries everything a
 * plain JSON export would, so offering both would only ask the sender to
 * choose between two files with identical contents. Import still ACCEPTS
 * JSON, so a file exported before this stays usable.
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

/* Beyond this a link stops being reliable — Safari and several chat clients
   truncate long URLs silently, which is the worst way to find a limit. */
export const LINK_LIMIT = 6000;

/* --------------------------------------------------------------- payload */

/**
 * Build the payload for a set of selected items.
 *
 * `withImages` decides whether asset bytes travel. A link cannot carry them at
 * any useful size, so it passes false and the recipient is told what was left
 * behind rather than silently receiving a sheet with broken portraits.
 */
export async function buildPayload(items, { withImages = true, from = null } = {}) {
  const assets = {};
  if (withImages) {
    for (const id of collectAssetIds(items)) {
      const a = await store.getAsset(id);
      if (a) assets[id] = { mime: a.mime, w: a.w, h: a.h, data: await blobToBase64(a.blob) };
    }
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

/** Deflate + base64url, for the URL fragment. */
export async function encodeLink(payload) {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const cs = new CompressionStream('deflate-raw');
  const packed = new Uint8Array(await new Response(
    new Blob([json]).stream().pipeThrough(cs)).arrayBuffer());
  /* base64url so the fragment needs no escaping and survives being pasted
     into a chat that treats +/= as punctuation. */
  return btoa(String.fromCharCode(...packed))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decodeLink(fragment) {
  const b64 = fragment.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ds = new DecompressionStream('deflate-raw');
  const json = await new Response(
    new Blob([bytes]).stream().pipeThrough(ds)).text();
  return JSON.parse(json);
}

/** Full share URL for a payload, and whether it is short enough to trust. */
export async function shareUrl(payload) {
  const encoded = await encodeLink(payload);
  const base = location.href.split('#')[0];
  const url = `${base}#d=${encoded}`;
  return { url, bytes: url.length, ok: url.length <= LINK_LIMIT };
}

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
    plan.push({
      store: item.store, incoming, mine, status,
      /* Non-destructive by default: a conflict keeps both unless the
         recipient deliberately asks for a replacement. */
      action: status === 'identical' ? 'skip' : status === 'new' ? 'add' : 'copy',
      include: status !== 'identical'
    });
  }
  return plan;
}

/** Content equality ignoring the bookkeeping that always differs. */
function sameContent(a, b) {
  const strip = r => {
    const { id, rev, createdAt, updatedAt, ...rest } = r;
    return JSON.stringify(rest, Object.keys(rest).sort());
  };
  return strip(a) === strip(b);
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
         preserved so a future import can still match it. */
      const rec = await store.put(row.store,
        { ...row.incoming, id: undefined }, { keepRev: true });
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
