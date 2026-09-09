/* The picture half of a share.
 *
 * Draws a character or ship to a canvas so the exported PNG shows something
 * useful when it lands in a chat window. The data half rides inside the same
 * file (see png-data.js); this module only has to make the file worth looking
 * at.
 *
 * Sized for a chat preview rather than for print: Discord scales an attachment
 * down to a few hundred pixels wide, so the card is laid out to survive that
 * — few lines, generous type, high contrast.
 */

import { t } from '../data/i18n.js';
import * as store from './store.js';
import * as SAV from '../data/sav.js';
import { savName } from './sheet-parts.js';
import { shipArt } from './sheet-ship.js';
import { portraitById } from '../data/portraits.js';
import { SECTOR } from '../data/sector.js';

/* Proportions of the card. Shorter than it was: the old height left a band of
   empty paper under the ratings on almost every sheet, because content flows
   from the top while the footer is pinned to the bottom. */
const W = 1000, H = 430;

/* The portrait column, and where the text column starts beside it. The card's
   height follows from these: portrait, then the blurb band, then the footer. */
const PAD = 40, PIC = 232;
const COL = PAD + PIC + 30;
const BLURB_Y = PAD + PIC + 30;      // top of the full-width blurb band
const FOOT_Y  = H - 74;              // top of the footer band
const RULE_Y  = H - 88;              // the hairline above it
const PAPER = '#f4f1e8', INK = '#12120f', SOFT = '#6d6a5e', WARN = '#a4442e';
const MONO = '"SF Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';

/* Exposed so a test can find the portrait box without restating its
   geometry — a layout change should move the check with it. */
export const CARD = { W, H, PAD, PIC, COL };

/** Render a character card. Returns a PNG Blob. */
export async function characterCard(rec) {
  const c = base();
  const g = c.getContext('2d');

  const pic = pictureOf(rec);
  await drawPicture(g, pic, PAD, PAD, PIC, PIC);
  const x = pic ? COL : PAD;

  heading(g, rec.name || '—', x, PAD + 42);
  /* Every one of these is an id in the record; the card shows them in the
     reader's language like anywhere else. */
  sub(g, [rec.playbook, rec.heritage, rec.background]
        .filter(Boolean).map(savName).join(' · '), x, PAD + 70);

  /* The blurb goes UNDER the portrait once the ratings have taken the column
     beside it, so it uses the width the old layout left empty. */
  ratingColumns(g, ratedActions(rec), x, PAD + 108, W - x - PAD);

  const footTop = footerTop();
  /* The blurb has its own band under the portrait, so it neither chases the
     ratings up the card nor runs into the footer. */
  if (rec.blurb) paragraph(g, rec.blurb, PAD, BLURB_Y, W - PAD * 2, 2);

  /* Stress and trauma are the state that changes between sessions, so they
     earn their place even on a card this small. */
  label(g, t('sheet.stress'), PAD, footTop);
  pips(g, PAD, footTop + 8, rec.stress || 0, SAV.STRESS_MAX, WARN);
  if (rec.trauma?.length) {
    g.fillStyle = WARN;
    g.font = `bold 13px ${MONO}`;
    g.fillText(clip(g, rec.trauma.map(savName).join(' · ').toUpperCase(), 420),
               PAD + 230, footTop + 22);
  }

  frame(g);
  return toBlob(c);
}

/** Actions with at least one dot, grouped by attribute and flattened to rows
    the column layout can place. A card is a glance, not a sheet: an unrated
    action would only crowd out what the player actually invested in. */
function ratedActions(rec) {
  const rows = [];
  for (const attr of SAV.ATTRIBUTES) {
    const rated = attr.actions.filter(a => (rec.actions?.[a] || 0) > 0);
    if (!rated.length) continue;
    rows.push({ heading: t('attr.' + attr.id) });
    for (const a of rated) {
      rows.push({ name: t('action.' + a), value: rec.actions[a],
                  max: SAV.MAX_ACTION_RATING });
    }
  }
  return rows;
}

/** Render a ship card. */
export async function shipCard(rec) {
  const c = base();
  const g = c.getContext('2d');

  /* A vessel with no uploaded portrait still has its frame's chart art. */
  const pic = pictureOf(rec);
  await drawPicture(g, pic, PAD, PAD, PIC, PIC);
  const x = pic ? COL : PAD;

  heading(g, rec.name || '—', x, PAD + 42);
  sub(g, [rec.frame ? savName(rec.frame) : null, rec.look]
        .filter(Boolean).join(' · '), x, PAD + 70);

  const damaged = new Set(rec.damaged || []);
  const rows = [];
  for (const sys of SAV.SHIP_SYSTEMS) {
    const v = rec.systems?.[sys] || 0;
    if (!v && !damaged.has(sys)) continue;
    rows.push({ name: t('ship.' + sys) + (damaged.has(sys) ? ' ✕' : ''),
                value: v, max: SAV.MAX_SYSTEM_RATING,
                colour: damaged.has(sys) ? WARN : INK });
  }
  ratingColumns(g, rows, x, PAD + 108, W - x - PAD);

  const footTop = footerTop();
  if (rec.blurb) paragraph(g, rec.blurb, PAD, BLURB_Y, W - PAD * 2, 2);

  const upgrades = [...(rec.upgrades || []), ...(rec.crewUpgrades || [])];
  if (upgrades.length) {
    label(g, t('sheet.upgrades'), PAD, footTop);
    g.fillStyle = SOFT;
    g.font = `13px ${MONO}`;
    g.fillText(clip(g, upgrades.map(savName).join(' · '), W - PAD * 2),
               PAD, footTop + 22);
  }

  frame(g);
  return toBlob(c);
}

/**
 * The card for a whole share.
 *
 * One item gets the detailed card above; several get a portrait grid, since
 * no useful amount of any one sheet survives being divided. A ship leads the
 * grid because the crew's vessel is the thing they share an identity through.
 * A share with neither — notes only — falls back to the sector itself, which
 * is at least honestly what is being sent.
 */
export async function shareCard(items) {
  const ships = items.filter(i => i.store === 'ships');
  const chars = items.filter(i => i.store === 'characters');
  const crew = [...ships, ...chars];

  if (!crew.length) return sectorCard(items);
  if (crew.length === 1) {
    return crew[0].store === 'ships' ? shipCard(crew[0].record)
                                     : characterCard(crew[0].record);
  }
  return crewCard(crew, items);
}

/** Portraits in a row, names beneath. Ships first. */
async function crewCard(crew, items) {
  const c = base();
  const g = c.getContext('2d');

  /* Cap the row rather than shrinking indefinitely: past six, portraits are
     too small to recognise and the count says more than the faces would. */
  const shown = crew.slice(0, 6);
  const gap = 20;
  /* Sized to leave room for the name and kind beneath each portrait, above
     the footer band. */
  const cell = Math.min(176, (W - PAD * 2 - gap * (shown.length - 1)) / shown.length,
                        RULE_Y - (PAD + 62) - 52);
  const totalW = cell * shown.length + gap * (shown.length - 1);
  const x0 = (W - totalW) / 2;
  const y0 = PAD + 58;

  heading(g, t('share.cardTitle'), PAD, PAD + 34);

  for (let i = 0; i < shown.length; i++) {
    const it = shown[i];
    const x = x0 + i * (cell + gap);
    const pic = pictureOf(it.record);
    if (pic) await drawPicture(g, pic, x, y0, cell, cell);
    else placeholder(g, x, y0, cell, cell, it.store === 'ships' ? '▶' : '☻');

    g.fillStyle = INK;
    g.font = `bold 15px ${MONO}`;
    g.textAlign = 'center';
    g.fillText(clip(g, (it.record.name || '—').toUpperCase(), cell),
               x + cell / 2, y0 + cell + 24);

    /* The one line that says what this is: a frame for a ship, a playbook for
       a character. */
    const kind = it.store === 'ships'
      ? (it.record.frame ? savName(it.record.frame) : null)
      : (it.record.playbook ? savName(it.record.playbook) : null);
    if (kind) {
      g.fillStyle = SOFT;
      g.font = `13px ${MONO}`;
      g.fillText(clip(g, kind.toUpperCase(), cell), x + cell / 2, y0 + cell + 42);
    }
    g.textAlign = 'left';
  }

  if (crew.length > shown.length) {
    g.fillStyle = SOFT;
    g.font = `14px ${MONO}`;
    g.textAlign = 'center';
    g.fillText(t('share.andMore').replace('%n', crew.length - shown.length),
               W / 2, y0 + cell + 64);
    g.textAlign = 'left';
  }

  contents(g, items);
  frame(g);
  return toBlob(c);
}

/**
 * The fallback card: the sector chart itself.
 *
 * Drawn from the same data the map uses, so a notes-only share still arrives
 * looking like it came from this sector rather than as a blank rectangle.
 */
async function sectorCard(items) {
  const c = base();
  const g = c.getContext('2d');
  heading(g, t('share.cardTitle'), PAD, PAD + 34);

  const systems = Object.values(SECTOR.systems);
  const xs = systems.map(s => s.x), ys = systems.map(s => s.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  /* Fit the chart to the space left below the heading, preserving its shape
     so the sector is recognisable rather than stretched. */
  const boxX = 110, boxY = PAD + 62, boxW = W - 220, boxH = RULE_Y - PAD - 90;
  const scale = Math.min(boxW / Math.max(1, maxX - minX),
                         boxH / Math.max(1, maxY - minY));
  const px = s => boxX + (s.x - minX) * scale + (boxW - (maxX - minX) * scale) / 2;
  const py = s => boxY + (s.y - minY) * scale + (boxH - (maxY - minY) * scale) / 2;

  g.strokeStyle = SOFT;
  g.lineWidth = 1;
  g.setLineDash([4, 4]);
  for (const gate of SECTOR.gates) {
    const a = SECTOR.systems[gate.from], b = SECTOR.systems[gate.to];
    if (!a || !b) continue;                       // an endpoint off this chart
    g.beginPath(); g.moveTo(px(a), py(a)); g.lineTo(px(b), py(b)); g.stroke();
  }
  g.setLineDash([]);

  for (const s of systems) {
    g.beginPath();
    g.arc(px(s), py(s), 9, 0, Math.PI * 2);
    g.fillStyle = INK; g.fill();
    g.fillStyle = INK;
    g.font = `bold 14px ${MONO}`;
    g.textAlign = 'center';
    g.fillText(t(s.key + '.name').toUpperCase(), px(s), py(s) - 18);
    g.textAlign = 'left';
  }

  contents(g, items);
  frame(g);
  return toBlob(c);
}

/** A line naming what the file actually carries. */
function contents(g, items) {
  const counts = [];
  const n = k => items.filter(i => i.store === k).length;
  if (n('ships'))      counts.push(`${n('ships')} ${t('share.ships')}`);
  if (n('characters')) counts.push(`${n('characters')} ${t('share.characters')}`);
  if (n('notes'))      counts.push(`${n('notes')} ${t('share.notes')}`);
  if (!counts.length) return;
  g.fillStyle = SOFT;
  g.font = `13px ${MONO}`;
  g.textAlign = 'center';
  g.fillText(counts.join('  ·  ').toUpperCase(), W / 2, FOOT_Y + 20);
  g.textAlign = 'left';
}

/** Stand-in for an item with no portrait, so a grid stays a grid. */
function placeholder(g, x, y, w, h, glyph) {
  g.strokeStyle = INK; g.lineWidth = 2;
  g.setLineDash([6, 6]);
  g.strokeRect(x, y, w, h);
  g.setLineDash([]);
  g.fillStyle = SOFT;
  g.font = `${Math.round(h * 0.34)}px ${MONO}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(glyph, x + w / 2, y + h / 2);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}

/**
 * Lay rating rows into as many columns as the width allows.
 *
 * A single column left most of the card empty on any sheet with more than a
 * few rated actions, while a long one ran past the footer. Flowing into
 * columns fills the space that is actually there.
 *
 * Returns the y after the last row.
 */
function ratingColumns(g, rows, x, y, width) {
  if (!rows.length) return y;

  const ROW = 21, HEAD = 19, COLW = 250;
  const cols = Math.max(1, Math.min(2, Math.floor(width / COLW)));

  /* Split on GROUP boundaries, never mid-group: a column that opened on an
     attribute's actions without its heading left them floating under the
     wrong one. Groups are kept whole and dealt out to whichever column is
     currently shortest. */
  const groups = [];
  for (const row of rows) {
    if (row.heading || !groups.length) groups.push([]);
    groups[groups.length - 1].push(row);
  }
  /* Rows with no headings at all — ship systems — form one long group, which
     would defeat the columns. Split those evenly instead. */
  if (groups.length === 1 && !groups[0][0]?.heading && cols > 1) {
    const per = Math.ceil(groups[0].length / cols);
    const flat = groups.pop();
    for (let i = 0; i < flat.length; i += per) groups.push(flat.slice(i, i + per));
  }

  const colY = new Array(cols).fill(y);
  for (const grp of groups) {
    let c = 0;
    for (let i = 1; i < cols; i++) if (colY[i] < colY[c]) c = i;
    const cx = x + c * COLW;
    for (const row of grp) {
      if (row.heading) {
        label(g, row.heading, cx, colY[c]);
        colY[c] += HEAD;
      } else {
        g.fillStyle = row.colour || INK;
        g.font = `14px ${MONO}`;
        g.fillText(row.name, cx + 10, colY[c]);
        dots(g, cx + 150, colY[c] - 4, row.value, row.max, row.colour || INK, 17, 5);
        colY[c] += ROW;
      }
    }
    colY[c] += 6;                 // a little air between groups
  }
  return Math.max(...colY);
}

/** Where the footer band begins — everything below this belongs to it. */
function footerTop() {
  return FOOT_Y;
}

/* ------------------------------------------------------------- primitives */

function base() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';
  return c;
}

/** The chart's own border treatment, so a card looks like it came from here. */
function frame(g) {
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.strokeRect(18, 18, W - 36, H - 36);
  /* A hairline above the footer band, so the card reads as two areas rather
     than as content that happened to stop. */
  g.strokeStyle = SOFT; g.lineWidth = 1;
  g.beginPath();
  g.moveTo(PAD, RULE_Y); g.lineTo(W - PAD, RULE_Y);
  g.stroke();
  g.fillStyle = SOFT;
  g.font = `11px ${MONO}`;
  g.fillText('PROCYON IE-21', PAD, H - 26);
}

function heading(g, text, x, y) {
  g.fillStyle = INK;
  g.font = `bold 36px ${MONO}`;
  g.fillText(clip(g, text.toUpperCase(), W - x - 56), x, y);
}

function sub(g, text, x, y) {
  if (!text) return;
  g.fillStyle = SOFT;
  g.font = `16px ${MONO}`;
  g.fillText(clip(g, text.toUpperCase(), W - x - 56), x, y);
}

function label(g, text, x, y) {
  g.fillStyle = SOFT;
  g.font = `bold 12px ${MONO}`;
  g.fillText(text.toUpperCase(), x, y);
}

/** Wrap a blurb to the available width. Returns the y after the last line. */
function paragraph(g, text, x, y, width, maxLines = 3) {
  g.fillStyle = INK;
  g.font = `15px ${MONO}`;
  const words = String(text).split(/\s+/);
  let line = '', lines = 0;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > width && line) {
      g.fillText(line, x, y);
      y += 21; line = w;
      if (++lines >= maxLines - 1) break;
    } else line = next;
  }
  if (line) { g.fillText(clip(g, line, width), x, y); y += 21; }
  return y;
}

function dots(g, x, y, value, max, colour = INK, gap = 20, r = 6) {
  for (let i = 0; i < max; i++) {
    g.beginPath();
    g.arc(x + i * gap, y, r, 0, Math.PI * 2);
    g.strokeStyle = colour; g.lineWidth = 1.6;
    if (i < value) { g.fillStyle = colour; g.fill(); }
    g.stroke();
  }
}

function pips(g, x, y, value, max, colour) {
  for (let i = 0; i < max; i++) {
    const px = x + i * 20;
    g.strokeStyle = INK; g.lineWidth = 1.6;
    g.strokeRect(px, y, 14, 18);
    if (i < value) { g.fillStyle = colour; g.fillRect(px, y, 14, 18); }
  }
}

/** Truncate to fit, with an ellipsis, so nothing runs off the card. */
function clip(g, text, width) {
  if (g.measureText(text).width <= width) return text;
  let s = text;
  while (s.length > 1 && g.measureText(s + '…').width > width) s = s.slice(0, -1);
  return s + '…';
}

/**
 * What picture a record has, if any.
 *
 * An uploaded portrait wins; a vessel with none falls back to its frame's
 * chart art, so a shared ship arrives looking like the ship rather than as an
 * empty box. Characters have no such fallback — there is no generic portrait
 * that would say anything true about one.
 */
function pictureOf(rec) {
  if (rec.portrait?.assetId) return { kind: 'asset', id: rec.portrait.assetId };
  /* A character may instead name one of the shipped portraits. */
  const p = rec.portraitId ? portraitById(rec.portraitId) : null;
  if (p) return { kind: 'url', url: artUrl(p.url) };
  /* And a vessel falls back to its frame. shipArt returns null without a
     frame or sprite, so this is inert for a character rather than merely
     happening to miss. */
  const art = shipArt(rec);
  return art ? { kind: 'url', url: artUrl(`img/ship-${art}.webp`) } : null;
}

/* Resolve chart art against THIS MODULE rather than the page. A bare relative
   path resolves against the document, so it works from index.html and 404s
   from anything served out of another directory — the dev pages under js/,
   and any future page not at the root. */
function artUrl(path) {
  return new URL('../' + path, import.meta.url).href;
}

/** Draw whichever source pictureOf found, cropped to fill the box. */
async function drawPicture(g, pic, x, y, w, h) {
  if (!pic) return;
  let blobOrUrl;
  if (pic.kind === 'asset') {
    const asset = await store.getAsset(pic.id);
    if (!asset) return;
    blobOrUrl = asset.blob;
  } else {
    /* The art is served from this origin, so it can be fetched and decoded
       the same way an uploaded image is — no canvas tainting to worry about. */
    const res = await fetch(pic.url).catch(() => null);
    if (!res?.ok) return;
    blobOrUrl = await res.blob();
  }
  const bmp = await createImageBitmap(blobOrUrl).catch(() => null);
  if (!bmp) return;
  paintBitmap(g, bmp, x, y, w, h);
  bmp.close?.();
}

function paintBitmap(g, bmp, x, y, w, h) {
  /* Cover the box, centred — a picture cropped is better than one squashed. */
  const scale = Math.max(w / bmp.width, h / bmp.height);
  const dw = bmp.width * scale, dh = bmp.height * scale;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.filter = 'grayscale(1) contrast(1.15)';
  g.drawImage(bmp, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 2;
  g.strokeRect(x, y, w, h);
}

function toBlob(canvas) {
  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('canvas encode failed')), 'image/png'));
}
