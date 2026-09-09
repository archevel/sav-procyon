/* Local store — everything the player authors lives here, in the browser.
 *
 * Four record stores plus an asset store:
 *
 *   characters  player sheets           ships       player vessels
 *   notes       text pinned to a place  imports     the undo log
 *   assets      image bytes, shared by reference
 *
 * Three ideas hold the whole design together:
 *
 *   id / originId / rev
 *     `id` is local and unique to this browser. `originId` is the id a record
 *     had when it was FIRST authored anywhere, and it survives every export
 *     and import — so it, not `id`, is what tells us "this is the same
 *     character as mine". `rev` counts local saves, letting an incoming copy
 *     be reported as newer, older, or simply different.
 *
 *   assets are referenced, never embedded
 *     A portrait can hang off a character and a note at once, so the bytes
 *     live in their own store and records only cite an id. Assets are keyed
 *     by content hash, so the same picture imported twice is stored once.
 *
 *   writes announce themselves
 *     Every mutation fires `procyon:store` on window, mirroring the existing
 *     `langchange` event, so an open panel repaints without polling.
 */

const DB_NAME = 'procyon';
const DB_VERSION = 2;

export const RECORD_STORES = ['characters', 'ships', 'notes', 'factions'];
const ALL_STORES = [...RECORD_STORES, 'imports', 'assets'];

/** Current shape of a record. Bump when a migration becomes necessary; the
    field is written into every record so old exports stay recognisable. */
export const SCHEMA = 1;

/* ------------------------------------------------------------ connection */

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = req.result;
      /* v1 — initial schema. Later versions must branch on e.oldVersion
         rather than assuming an empty database. */
      if (e.oldVersion < 1) {
        /* The v1 store list is frozen here, NOT taken from RECORD_STORES: on
           a fresh install every branch below runs in sequence, so a list
           that grows with later versions would create their stores twice. */
        for (const name of ['characters', 'ships', 'notes']) {
          const s = db.createObjectStore(name, { keyPath: 'id' });
          s.createIndex('originId', 'originId', { unique: false });
          s.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        /* Notes additionally index the place they are pinned to, so the
           location panel can ask for just its own notes. */
        req.transaction.objectStore('notes')
           .createIndex('target', 'target', { unique: false });

        db.createObjectStore('imports', { keyPath: 'id' })
          .createIndex('at', 'at', { unique: false });

        /* Assets are keyed by content hash, which is what makes importing
           the same image twice a no-op instead of a duplicate. */
        db.createObjectStore('assets', { keyPath: 'id' });
      }
      /* v2 — player state for the canon factions: clocks, mainly. Keyed by
         the faction's slug rather than a uid, so the same faction is the
         same record in every browser and imports line up on it naturally. */
      if (e.oldVersion < 2) {
        const s = db.createObjectStore('factions', { keyPath: 'id' });
        s.createIndex('originId', 'originId', { unique: false });
        s.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('procyon: database blocked by another tab'));
  });
  return dbPromise;
}

/** Run `fn` inside one transaction and resolve when it commits, not merely
    when the last request succeeds — otherwise a caller can read back stale
    data from a transaction that is still in flight. */
async function tx(stores, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let out;
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('procyon: transaction aborted'));
    Promise.resolve(fn(t)).then(v => { out = v; }, err => { reject(err); t.abort(); });
  });
}

/** IDBRequest -> Promise. */
function reqp(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ---------------------------------------------------------------- events */

/** Announce a write. `detail.stores` lists what changed so a listener can
    ignore traffic it does not care about. */
function announce(stores, kind) {
  window.dispatchEvent(new CustomEvent('procyon:store', {
    detail: { stores: [...new Set(stores)], kind }
  }));
}

/** Subscribe to writes. Returns an unsubscribe function.
    Pass `stores` to be called only for those; omit for all. */
export function subscribe(handler, stores = null) {
  const fn = e => {
    if (stores && !e.detail.stores.some(s => stores.includes(s))) return;
    handler(e.detail);
  };
  window.addEventListener('procyon:store', fn);
  return () => window.removeEventListener('procyon:store', fn);
}

/* ------------------------------------------------------------------ ids */

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  /* Older Safari lacks randomUUID but has getRandomValues. */
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

const nowIso = () => new Date().toISOString();

/* -------------------------------------------------------------- records */

/** Read one record. */
export async function get(store, id) {
  assertRecordStore(store);
  return tx([store], 'readonly', t => reqp(t.objectStore(store).get(id)));
}

/** Read every record in a store, newest first. */
export async function all(store) {
  assertRecordStore(store);
  const rows = await tx([store], 'readonly', t => reqp(t.objectStore(store).getAll()));
  return rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

/** Every record whose `originId` matches — how an import finds its collisions. */
export async function byOrigin(store, originId) {
  assertRecordStore(store);
  return tx([store], 'readonly',
    t => reqp(t.objectStore(store).index('originId').getAll(originId)));
}

/** Notes pinned to one place, e.g. 'rin/aleph/warren'. */
export async function notesFor(target) {
  const rows = await tx(['notes'], 'readonly',
    t => reqp(t.objectStore('notes').index('target').getAll(target)));
  return rows.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

/**
 * Create or update a record.
 *
 * A record arriving without `id` is new: it is given one, and its `originId`
 * is set to that same id, marking this browser as the place it was authored.
 * An existing record keeps both and has its `rev` bumped, which is what lets
 * a recipient tell our edits apart from theirs.
 *
 * `opts.keepRev` writes without bumping — used by import, where the incoming
 * `rev` is meaningful and must not be disturbed.
 */
export async function put(store, record, opts = {}) {
  assertRecordStore(store);
  const isNew = !record.id;
  const id = record.id || uid();
  const out = {
    ...record,
    id,
    originId: record.originId || id,
    kind: record.kind || singular(store),
    schema: record.schema || SCHEMA,
    rev: opts.keepRev ? (record.rev || 1) : (record.rev || 0) + 1,
    createdAt: record.createdAt || nowIso(),
    updatedAt: opts.keepRev && record.updatedAt ? record.updatedAt : nowIso()
  };
  await tx([store], 'readwrite', t => reqp(t.objectStore(store).put(out)));
  if (isNew) persist();          // first write is a good moment to ask
  announce([store], 'put');
  return out;
}

/**
 * Delete a record, and with it any asset that nothing else still cites.
 * Reference counting matters here: a portrait shared by two characters must
 * survive the deletion of one of them.
 */
export async function remove(store, id) {
  assertRecordStore(store);
  const rec = await get(store, id);
  await tx([store], 'readwrite', t => reqp(t.objectStore(store).delete(id)));
  if (rec) await sweepAssets(assetIdsOf(rec));
  announce([store, 'assets'], 'remove');
  return rec;
}

function assertRecordStore(store) {
  if (!RECORD_STORES.includes(store)) {
    throw new Error(`procyon: '${store}' is not a record store`);
  }
}

const singular = s => ({ characters: 'character', ships: 'ship', notes: 'note',
                         factions: 'faction' }[s] || s);

/* --------------------------------------------------------------- assets */

/** Long edge, in pixels, that an ingested image is reduced to. Chosen so a
    portrait stays crisp on a large display while a 4MB phone photo lands
    somewhere near 80KB. */
export const MAX_EDGE = 1200;
const WEBP_QUALITY = 0.82;

/**
 * Take a File or Blob from a drop or file picker and store it as an asset.
 *
 * The image is re-encoded to WebP and capped at MAX_EDGE first. The original
 * bytes are NOT kept: this store is meant to be sharable as a file and to sit
 * inside a browser storage quota, and full-resolution camera images defeat
 * both. Callers should say so in the UI.
 *
 * Identical images collapse onto one record, because the id is a hash of the
 * stored bytes. Re-importing a shared file therefore costs nothing.
 */
export async function putAsset(fileOrBlob) {
  const { blob, w, h } = await normalizeImage(fileOrBlob);
  const id = await sha256(blob);
  const existing = await tx(['assets'], 'readonly',
    t => reqp(t.objectStore('assets').get(id)));
  if (existing) return existing;                 // same bytes, already held

  const asset = {
    id, blob, mime: blob.type, w, h,
    bytes: blob.size, createdAt: nowIso()
  };
  await tx(['assets'], 'readwrite', t => reqp(t.objectStore('assets').put(asset)));
  persist();
  announce(['assets'], 'put');
  return asset;
}

/** Store an asset whose bytes are already normalised — the import path, where
    re-encoding would degrade the image a second time. */
export async function putAssetRaw(asset) {
  const id = asset.id || await sha256(asset.blob);
  const existing = await tx(['assets'], 'readonly',
    t => reqp(t.objectStore('assets').get(id)));
  if (existing) return existing;
  const out = { ...asset, id, bytes: asset.blob.size, createdAt: asset.createdAt || nowIso() };
  await tx(['assets'], 'readwrite', t => reqp(t.objectStore('assets').put(out)));
  announce(['assets'], 'put');
  return out;
}

export async function getAsset(id) {
  return tx(['assets'], 'readonly', t => reqp(t.objectStore('assets').get(id)));
}

export async function allAssets() {
  return tx(['assets'], 'readonly', t => reqp(t.objectStore('assets').getAll()));
}

/* Object URLs are cached per asset id so the same portrait rendered in three
   places allocates once. Callers use releaseUrl() when a view closes; the URL
   survives until then. */
const urlCache = new Map();

/** A displayable URL for an asset, or null if it is gone. */
export async function assetUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const a = await getAsset(id);
  if (!a) return null;
  const url = URL.createObjectURL(a.blob);
  urlCache.set(id, url);
  return url;
}

/** Drop a cached object URL. Safe to call for ids that were never resolved. */
export function releaseUrl(id) {
  const url = urlCache.get(id);
  if (url) { URL.revokeObjectURL(url); urlCache.delete(id); }
}

export function releaseAllUrls() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}

/** Every asset id a record cites, wherever images are allowed to hang. */
export function assetIdsOf(record) {
  const ids = [];
  const scan = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(scan); return; }
    if (typeof node.assetId === 'string') ids.push(node.assetId);
    Object.values(node).forEach(scan);
  };
  scan(record);
  return [...new Set(ids)];
}

/**
 * Delete each candidate asset that no surviving record still cites.
 *
 * Called after any deletion. The scan is over every record store, which is
 * affordable at this scale and much safer than maintaining a refcount that
 * could drift out of step with the records themselves.
 */
export async function sweepAssets(candidateIds) {
  if (!candidateIds.length) return [];
  const live = new Set();
  for (const store of RECORD_STORES) {
    const rows = await tx([store], 'readonly', t => reqp(t.objectStore(store).getAll()));
    for (const r of rows) for (const id of assetIdsOf(r)) live.add(id);
  }
  const orphans = candidateIds.filter(id => !live.has(id));
  if (!orphans.length) return [];
  await tx(['assets'], 'readwrite', t => {
    const s = t.objectStore('assets');
    orphans.forEach(id => s.delete(id));
  });
  orphans.forEach(releaseUrl);
  return orphans;
}

/**
 * Formats an upload may be in.
 *
 * Whatever the browser can decode is accepted, since everything is re-encoded
 * to WebP on the way in — so this list is about what the file PICKER should
 * offer, not about what is stored. SVG is deliberately absent: it is an
 * image/* type, but createImageBitmap refuses it, so offering it would only
 * produce a failure after the user had chosen a file.
 */
export const ACCEPTED_IMAGE_TYPES =
  'image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp';

/** Re-encode to WebP within MAX_EDGE. Images already small enough are still
    re-encoded, so every stored asset has one predictable format. */
async function normalizeImage(fileOrBlob) {
  if (!fileOrBlob || !String(fileOrBlob.type || '').startsWith('image/')) {
    throw new Error('procyon: not an image');
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(fileOrBlob);
  } catch {
    throw new Error('procyon: image could not be decoded');
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const blob = await drawToBlob(bitmap, w, h);
  bitmap.close?.();
  return { blob, w, h };
}

/** OffscreenCanvas where available, a detached <canvas> otherwise — Safari
    only gained convertToBlob recently and this keeps older versions working. */
async function drawToBlob(bitmap, w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(w, h);
    c.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    if (c.convertToBlob) {
      return c.convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY });
    }
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    c.toBlob(b => b ? resolve(b) : reject(new Error('procyon: encode failed')),
             'image/webp', WEBP_QUALITY);
  });
}

/** Hex SHA-256 of a blob — the asset id, and the reason identical images
    never duplicate. */
export async function sha256(blob) {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* -------------------------------------------------------------- imports */

/**
 * Record what an import did, so it can be undone.
 *
 * `created` are records this import brought into being; reverting deletes
 * them. `replaced` holds a full snapshot of each record that was overwritten;
 * reverting puts them back exactly as they were.
 */
export async function logImport(entry) {
  const rec = {
    id: uid(), at: nowIso(),
    from: entry.from || null,
    source: entry.source || 'link',            // 'link' | 'file'
    created: entry.created || [],              // [{ store, id }]
    replaced: entry.replaced || [],            // [{ store, snapshot }]
    assets: entry.assets || []                 // asset ids first seen here
  };
  await tx(['imports'], 'readwrite', t => reqp(t.objectStore('imports').put(rec)));
  announce(['imports'], 'put');
  return rec;
}

export async function allImports() {
  const rows = await tx(['imports'], 'readonly', t => reqp(t.objectStore('imports').getAll()));
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Undo an import.
 *
 * Anything the import created is deleted and anything it replaced is
 * restored. A record edited since the import is reported in `edited` rather
 * than being quietly discarded — the caller is expected to warn before
 * committing, so a revert never eats work done after the fact.
 *
 * Pass `{ force: true }` to proceed anyway once the user has been asked.
 */
export async function revertImport(importId, { force = false } = {}) {
  const entry = await tx(['imports'], 'readonly',
    t => reqp(t.objectStore('imports').get(importId)));
  if (!entry) throw new Error('procyon: no such import');

  /* An imported record was written with keepRev, so its rev still matches
     what the sender had. A higher rev means the recipient edited it since. */
  const edited = [];
  for (const { store, id, rev } of entry.created) {
    const cur = await get(store, id);
    if (cur && rev != null && cur.rev > rev) edited.push({ store, id, name: cur.name });
  }
  if (edited.length && !force) return { ok: false, edited };

  const touched = new Set();
  const candidateAssets = [];

  for (const { store, id } of entry.created) {
    const rec = await get(store, id);
    if (!rec) continue;
    candidateAssets.push(...assetIdsOf(rec));
    await tx([store], 'readwrite', t => reqp(t.objectStore(store).delete(id)));
    touched.add(store);
  }
  for (const { store, snapshot } of entry.replaced) {
    await tx([store], 'readwrite', t => reqp(t.objectStore(store).put(snapshot)));
    touched.add(store);
  }
  await tx(['imports'], 'readwrite', t => reqp(t.objectStore('imports').delete(importId)));

  /* Reference-counted, so an image still used by an untouched character is
     left alone even though this import is the one that introduced it. */
  const dropped = await sweepAssets([...new Set(candidateAssets)]);

  announce([...touched, 'imports', 'assets'], 'revert');
  return { ok: true, edited: [], droppedAssets: dropped.length };
}

/* ---------------------------------------------------------------- quota */

/* Browsers may evict a non-persistent origin under storage pressure, which
   for this app means losing the player's characters. Ask once for permanent
   status; the request is silent when already granted or already refused. */
let persistAsked = false;
export function persist() {
  if (persistAsked || !navigator.storage?.persist) return;
  persistAsked = true;
  navigator.storage.persisted?.().then(already => {
    if (!already) navigator.storage.persist().catch(() => {});
  }).catch(() => {});
}

/** Bytes used and available, for the manage panel. Fields may be undefined
    where the browser declines to report. */
export async function usage() {
  if (!navigator.storage?.estimate) return { usage: null, quota: null, persisted: null };
  const est = await navigator.storage.estimate().catch(() => ({}));
  const persisted = await navigator.storage.persisted?.().catch(() => null) ?? null;
  return { usage: est.usage ?? null, quota: est.quota ?? null, persisted };
}

/* ------------------------------------------------------------- wholesale */

/** Every record in every store, for the export picker. Assets excluded —
    they are large, and share.js fetches only the ones actually selected. */
export async function snapshot() {
  const out = {};
  for (const store of RECORD_STORES) out[store] = await all(store);
  return out;
}

/** Erase everything. Only ever called from an explicit, confirmed action. */
export async function wipe() {
  await tx(ALL_STORES, 'readwrite', t => {
    ALL_STORES.forEach(s => t.objectStore(s).clear());
  });
  releaseAllUrls();
  announce(ALL_STORES, 'wipe');
}
