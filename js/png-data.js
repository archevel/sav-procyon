/* Hiding data inside a PNG.
 *
 * A PNG is a signature followed by length-prefixed, CRC-checked chunks. Any
 * chunk a decoder does not recognise is skipped, and a lowercase first letter
 * marks a chunk as ancillary — safe to ignore. So arbitrary bytes can ride
 * along in a `tEXt` chunk and every image viewer will still show the picture.
 *
 * That is what makes one file do both jobs: Discord previews the card, and
 * this app reads the payload back out of the same bytes. Discord stores an
 * uploaded attachment verbatim, so the chunk survives the round trip — but
 * anything that RE-ENCODES the image (a screenshot, a resize, a paste into a
 * chat that transcodes) will strip it, and the file becomes a picture only.
 *
 * The payload is deflated before embedding, so the overhead is the compressed
 * JSON plus base64's third, not the raw sheet.
 */

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/* Keyword the payload rides under. PNG requires 1-79 Latin-1 characters. */
const KEYWORD = 'procyon';

/* ------------------------------------------------------------------- CRC */

/* PNG chunks carry a CRC-32 over type+data. The table is built once. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------ compression */

/** Deflate, via the platform's own streams — no library, no bundle. */
async function deflate(bytes) {
  const cs = new CompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* base64 of raw bytes. A tEXt value is Latin-1 text, so the compressed bytes
   cannot go in unencoded — many are not valid in that range. */
function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function fromBase64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------------------------------------------------------------- chunks */

function chunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);

  const out = new Uint8Array(8 + data.length + 4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(body, 4);
  dv.setUint32(4 + body.length, crc32(body));
  return out;
}

/** Walk a PNG's chunks. Throws if the signature is wrong. */
function* chunks(bytes) {
  for (let i = 0; i < SIG.length; i++) {
    if (bytes[i] !== SIG[i]) throw new Error('not a PNG');
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 8;
  while (p + 8 <= bytes.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    const data = bytes.subarray(p + 8, p + 8 + len);
    yield { type, data, start: p, end: p + 12 + len };
    if (type === 'IEND') return;
    p += 12 + len;
  }
}

/* ------------------------------------------------------------------- API */

/**
 * Return a copy of `pngBytes` carrying `payload` (any JSON-able value).
 *
 * The chunk is inserted before IEND, which every decoder treats as the end of
 * the image — putting it after would leave it outside the stream and most
 * readers would never see it.
 */
export async function embed(pngBytes, payload) {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const packed = toBase64(await deflate(json));

  /* tEXt is keyword \0 value, both Latin-1. base64 is entirely within that
     range, which is why the compressed bytes are encoded first. */
  const data = new TextEncoder().encode(`${KEYWORD}\0${packed}`);
  const text = chunk('tEXt', data);

  const parts = [];
  let inserted = false;
  for (const c of chunks(pngBytes)) {
    if (c.type === 'IEND' && !inserted) { parts.push(text); inserted = true; }
    /* Drop any previous payload, so re-exporting does not accumulate them. */
    if (c.type === 'tEXt' && startsWithKeyword(c.data)) continue;
    parts.push(pngBytes.subarray(c.start, c.end));
  }

  const head = pngBytes.subarray(0, 8);
  const total = parts.reduce((n, p) => n + p.length, head.length);
  const out = new Uint8Array(total);
  out.set(head, 0);
  let at = head.length;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function startsWithKeyword(data) {
  const kw = new TextEncoder().encode(KEYWORD);
  if (data.length < kw.length + 1 || data[kw.length] !== 0) return false;
  for (let i = 0; i < kw.length; i++) if (data[i] !== kw[i]) return false;
  return true;
}

/**
 * Read a payload back out, or null if the file carries none.
 *
 * Null covers every "this is just a picture" case — a PNG that never had a
 * payload, and one whose payload was stripped by re-encoding somewhere along
 * the way. A corrupt payload throws, because that is a different problem and
 * the player should be told rather than shown an empty import.
 */
export async function extract(pngBytes) {
  let packed = null;
  for (const c of chunks(pngBytes)) {
    if (c.type === 'tEXt' && startsWithKeyword(c.data)) {
      packed = new TextDecoder('latin1')
        .decode(c.data.subarray(KEYWORD.length + 1));
      break;
    }
  }
  if (packed == null) return null;

  const json = new TextDecoder().decode(await inflate(fromBase64(packed)));
  return JSON.parse(json);
}

/** True if these bytes look like a PNG at all. */
export function isPng(bytes) {
  if (!bytes || bytes.length < SIG.length) return false;
  for (let i = 0; i < SIG.length; i++) if (bytes[i] !== SIG[i]) return false;
  return true;
}
