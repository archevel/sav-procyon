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
import { SECTOR } from '../data/sector.js';

const W = 1000, H = 560;
const PAPER = '#f4f1e8', INK = '#12120f', SOFT = '#6d6a5e', WARN = '#a4442e';
const MONO = '"SF Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';

/** Render a character card. Returns a PNG Blob. */
export async function characterCard(rec) {
  const c = base();
  const g = c.getContext('2d');

  const portraitW = rec.portrait ? 300 : 0;
  const x = 56 + portraitW + (portraitW ? 40 : 0);

  if (rec.portrait) await drawPortrait(g, rec.portrait.assetId, 56, 56, 300, 300);

  heading(g, rec.name || '—', x, 108);
  const pb = SAV.PLAYBOOKS[rec.playbook];
  sub(g, [pb?.name, rec.heritage, rec.background].filter(Boolean).join(' · '), x, 142);

  let y = 190;
  if (rec.blurb) y = paragraph(g, rec.blurb, x, y, W - x - 56) + 18;

  /* Action ratings, by attribute, showing only what has dots. A card is a
     glance, not a sheet: empty rows would crowd out what matters. */
  for (const attr of SAV.ATTRIBUTES) {
    const rated = attr.actions.filter(a => (rec.actions?.[a] || 0) > 0);
    if (!rated.length) continue;
    label(g, t('attr.' + attr.id), x, y);
    y += 22;
    for (const a of rated) {
      g.fillStyle = INK;
      g.font = `15px ${MONO}`;
      g.fillText(t('action.' + a), x + 12, y);
      dots(g, x + 190, y - 5, rec.actions[a], SAV.MAX_ACTION_RATING);
      y += 22;
    }
    y += 8;
  }

  /* Stress and trauma are the state that changes between sessions, so they
     earn their place even on a card this small. */
  const footY = H - 62;
  label(g, t('sheet.stress'), 56, footY - 22);
  pips(g, 56, footY - 14, rec.stress || 0, SAV.STRESS_MAX, WARN);
  if (rec.trauma?.length) {
    g.fillStyle = WARN;
    g.font = `bold 14px ${MONO}`;
    g.fillText(rec.trauma.join(' · ').toUpperCase(), 300, footY - 4);
  }

  frame(g);
  return toBlob(c);
}

/** Render a ship card. */
export async function shipCard(rec) {
  const c = base();
  const g = c.getContext('2d');

  const portraitW = rec.portrait ? 300 : 0;
  const x = 56 + portraitW + (portraitW ? 40 : 0);
  if (rec.portrait) await drawPortrait(g, rec.portrait.assetId, 56, 56, 300, 300);

  heading(g, rec.name || '—', x, 108);
  const frameName = SAV.FRAMES[rec.frame]?.name;
  sub(g, [frameName, rec.look].filter(Boolean).join(' · '), x, 142);

  let y = 190;
  if (rec.blurb) y = paragraph(g, rec.blurb, x, y, W - x - 56) + 18;

  const damaged = new Set(rec.damaged || []);
  for (const s of SAV.SHIP_SYSTEMS) {
    const v = rec.systems?.[s] || 0;
    if (!v && !damaged.has(s)) continue;
    g.fillStyle = damaged.has(s) ? WARN : INK;
    g.font = `15px ${MONO}`;
    g.fillText(t('ship.' + s) + (damaged.has(s) ? ' ✕' : ''), x + 12, y);
    dots(g, x + 190, y - 5, v, SAV.MAX_SYSTEM_RATING, damaged.has(s) ? WARN : INK);
    y += 22;
  }

  const upgrades = [...(rec.upgrades || []), ...(rec.crewUpgrades || [])];
  if (upgrades.length) {
    const footY = H - 62;
    label(g, t('sheet.upgrades'), 56, footY - 22);
    g.fillStyle = SOFT;
    g.font = `13px ${MONO}`;
    g.fillText(clip(g, upgrades.join(' · '), W - 112), 56, footY - 2);
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
  const gap = 24;
  const cell = Math.min(220, (W - 112 - gap * (shown.length - 1)) / shown.length);
  const totalW = cell * shown.length + gap * (shown.length - 1);
  const x0 = (W - totalW) / 2;
  const y0 = 132;

  heading(g, t('share.cardTitle'), 56, 88);

  for (let i = 0; i < shown.length; i++) {
    const it = shown[i];
    const x = x0 + i * (cell + gap);
    const portrait = it.record.portrait;
    if (portrait) await drawPortrait(g, portrait.assetId, x, y0, cell, cell);
    else placeholder(g, x, y0, cell, cell, it.store === 'ships' ? '▶' : '☻');

    g.fillStyle = INK;
    g.font = `bold 15px ${MONO}`;
    g.textAlign = 'center';
    g.fillText(clip(g, (it.record.name || '—').toUpperCase(), cell),
               x + cell / 2, y0 + cell + 26);

    /* The one line that says what this is: a frame for a ship, a playbook for
       a character. */
    const kind = it.store === 'ships'
      ? SAV.FRAMES[it.record.frame]?.name
      : SAV.PLAYBOOKS[it.record.playbook]?.name;
    if (kind) {
      g.fillStyle = SOFT;
      g.font = `13px ${MONO}`;
      g.fillText(clip(g, kind.toUpperCase(), cell), x + cell / 2, y0 + cell + 46);
    }
    g.textAlign = 'left';
  }

  if (crew.length > shown.length) {
    g.fillStyle = SOFT;
    g.font = `14px ${MONO}`;
    g.textAlign = 'center';
    g.fillText(t('share.andMore').replace('%n', crew.length - shown.length),
               W / 2, y0 + cell + 76);
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
  heading(g, t('share.cardTitle'), 56, 88);

  const systems = Object.values(SECTOR.systems);
  const xs = systems.map(s => s.x), ys = systems.map(s => s.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  /* Fit the chart to the space left below the heading, preserving its shape
     so the sector is recognisable rather than stretched. */
  const boxX = 90, boxY = 150, boxW = W - 180, boxH = H - 260;
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
  g.fillText(counts.join('  ·  ').toUpperCase(), W / 2, H - 58);
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
  g.fillStyle = SOFT;
  g.font = `11px ${MONO}`;
  g.fillText('PROCYON IE-21', 56, H - 32);
}

function heading(g, text, x, y) {
  g.fillStyle = INK;
  g.font = `bold 42px ${MONO}`;
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

function dots(g, x, y, value, max, colour = INK) {
  for (let i = 0; i < max; i++) {
    g.beginPath();
    g.arc(x + i * 20, y, 6, 0, Math.PI * 2);
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

async function drawPortrait(g, assetId, x, y, w, h) {
  const asset = await store.getAsset(assetId);
  if (!asset) return;
  const bmp = await createImageBitmap(asset.blob);
  /* Cover the box, centred — a portrait cropped is better than one squashed. */
  const scale = Math.max(w / bmp.width, h / bmp.height);
  const dw = bmp.width * scale, dh = bmp.height * scale;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.filter = 'grayscale(1) contrast(1.15)';
  g.drawImage(bmp, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 2;
  g.strokeRect(x, y, w, h);
  bmp.close?.();
}

function toBlob(canvas) {
  return new Promise((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('canvas encode failed')), 'image/png'));
}
