/* Shared sheet controls.
 *
 * Both sheets are built from the same handful of pieces — dot ratings, filled
 * tracks, clocks, free notes, images — so they live here once rather than
 * being written twice with two sets of bugs.
 *
 * Every builder returns an element and takes an `onChange` that receives the
 * new value. Nothing here reads or writes the store: the sheets own that, so
 * a control can be reused anywhere without dragging persistence along.
 */

import { t } from '../data/i18n.js';
import { CLOCK_SIZES, DEFAULT_CLOCK_SIZE } from '../data/sav.js';
import * as store from './store.js';

/**
 * Display name for a Scum & Villainy id.
 *
 * Every list in data/sav.js holds ids; this is the single place they become
 * words. An id with no entry falls through to t()'s own missing-key marker,
 * so a gap is visible on the page rather than silently blank.
 */
export function savName(id) {
  return id ? t('sav.' + id) : '';
}

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function uid() {
  return (crypto.randomUUID?.() || String(Math.random()).slice(2));
}

/**
 * A row of dots, 0..max, as used for action ratings and ship systems.
 *
 * Clicking the dot at the current value clears it back to zero — otherwise a
 * rating could only ever go up without a separate control, which is the sort
 * of thing that makes a sheet annoying to correct.
 */
export function dots(value, max, onChange, { label = null } = {}) {
  const wrap = el('div', 'sheet-dots');
  if (label) wrap.appendChild(el('span', 'sheet-dots-label', label));
  const row = el('div', 'sheet-dots-row');
  for (let i = 1; i <= max; i++) {
    const d = el('button', 'sheet-dot' + (i <= value ? ' is-on' : ''));
    d.type = 'button';
    d.setAttribute('aria-label', `${label || ''} ${i}`.trim());
    d.addEventListener('click', () => onChange(value === i ? 0 : i));
    row.appendChild(d);
  }
  wrap.appendChild(row);
  return wrap;
}

/**
 * A linear track — stress, trauma, harm, xp.
 *
 * Same click-to-clear behaviour as dots: clicking the last filled box empties
 * the track to that point rather than requiring a reset button.
 */
export function track(value, max, onChange, { label = null, cls = '' } = {}) {
  const wrap = el('div', 'sheet-track ' + cls);
  if (label) wrap.appendChild(el('span', 'sheet-track-label', label));
  const row = el('div', 'sheet-track-row');
  for (let i = 1; i <= max; i++) {
    const b = el('button', 'sheet-pip' + (i <= value ? ' is-on' : ''));
    b.type = 'button';
    b.setAttribute('aria-label', `${label || ''} ${i}`.trim());
    b.addEventListener('click', () => onChange(value === i ? i - 1 : i));
    row.appendChild(b);
  }
  wrap.appendChild(row);
  return wrap;
}

/**
 * A progress clock, drawn as a segmented disc.
 *
 * Clocks are the one part of a sheet that is wholly player-authored — a job,
 * a countdown, a healing timer — so they carry a name, a size, and nothing
 * else the rules would impose.
 */
export function clock(c, { onChange, onRename, onResize, onDelete }) {
  const wrap = el('div', 'sheet-clock');

  const R = 26, CX = 30, CY = 30;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 60 60');
  svg.setAttribute('class', 'sheet-clock-face');

  const seg = (i, filled) => {
    /* Start each wedge at twelve o'clock so a clock reads like a clock. */
    const a0 = (i / c.segments) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / c.segments) * Math.PI * 2 - Math.PI / 2;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    p.setAttribute('d',
      `M ${CX} ${CY} L ${CX + R * Math.cos(a0)} ${CY + R * Math.sin(a0)} ` +
      `A ${R} ${R} 0 ${large} 1 ${CX + R * Math.cos(a1)} ${CY + R * Math.sin(a1)} Z`);
    p.setAttribute('class', 'sheet-clock-seg' + (filled ? ' is-on' : ''));
    /* Clicking a filled segment sets the clock to just before it, so a clock
       can be wound back as easily as forward. */
    p.addEventListener('click', () => onChange(filled && c.filled === i + 1 ? i : i + 1));
    return p;
  };
  for (let i = 0; i < c.segments; i++) svg.appendChild(seg(i, i < c.filled));
  wrap.appendChild(svg);

  const side = el('div', 'sheet-clock-side');
  const name = el('input', 'sheet-clock-name');
  name.value = c.name || '';
  name.placeholder = t('sheet.clockName');
  name.addEventListener('blur', () => onRename(name.value.trim()));
  name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
  side.appendChild(name);

  const row = el('div', 'sheet-clock-controls');
  const size = el('select', 'sheet-clock-size');
  for (const n of CLOCK_SIZES) {
    const o = el('option', null, String(n));
    o.value = String(n);
    if (n === c.segments) o.selected = true;
    size.appendChild(o);
  }
  size.addEventListener('change', () => onResize(Number(size.value)));
  row.appendChild(size);

  const del = el('button', 'sheet-x', '×');
  del.type = 'button';
  del.title = t('sheet.remove');
  del.addEventListener('click', onDelete);
  row.appendChild(del);

  side.appendChild(row);
  side.appendChild(el('span', 'sheet-clock-count', `${c.filled}/${c.segments}`));
  wrap.appendChild(side);
  return wrap;
}

export function newClock(name = '') {
  return { id: uid(), name, segments: DEFAULT_CLOCK_SIZE, filled: 0 };
}

/**
 * A free note: a title, a body, and any number of images.
 *
 * Notes hang off characters, ships and places alike, which is why this takes
 * a plain object and callbacks rather than knowing what owns it.
 */
export function note(n, { onChange, onDelete, onAddImage, onRemoveImage }) {
  const wrap = el('div', 'sheet-note');

  const head = el('div', 'sheet-note-head');
  const title = el('input', 'sheet-note-title');
  title.value = n.title || '';
  title.placeholder = t('sheet.noteTitle');
  title.addEventListener('blur', () => onChange({ ...n, title: title.value.trim() }));
  title.addEventListener('keydown', e => { if (e.key === 'Enter') title.blur(); });
  head.appendChild(title);

  const del = el('button', 'sheet-x', '×');
  del.type = 'button';
  del.title = t('sheet.remove');
  del.addEventListener('click', onDelete);
  head.appendChild(del);
  wrap.appendChild(head);

  const body = el('textarea', 'sheet-note-body');
  body.value = n.body || '';
  body.rows = 3;
  body.placeholder = t('sheet.noteBody');
  body.addEventListener('blur', () => onChange({ ...n, body: body.value }));
  wrap.appendChild(body);

  wrap.appendChild(imageStrip(n.images || [], { onAddImage, onRemoveImage }));
  return wrap;
}

export function newNote(title = '') {
  return { id: uid(), title, body: '', images: [] };
}

/**
 * A row of thumbnails plus an add button.
 *
 * Object URLs are resolved asynchronously and released when the strip is
 * rebuilt, so a sheet reopened many times does not leak them.
 */
export function imageStrip(images, { onAddImage, onRemoveImage }) {
  const wrap = el('div', 'sheet-images');

  for (const img of images) {
    const fig = el('div', 'sheet-image');
    const im = el('img');
    im.alt = img.caption || '';
    store.assetUrl(img.assetId).then(url => {
      /* A missing asset means the image was swept or never imported — show
         the gap rather than a broken element. */
      if (url) im.src = url; else fig.classList.add('is-missing');
    });
    fig.appendChild(im);

    const x = el('button', 'sheet-x sheet-image-x', '×');
    x.type = 'button';
    x.title = t('sheet.remove');
    x.addEventListener('click', () => onRemoveImage(img));
    fig.appendChild(x);
    wrap.appendChild(fig);
  }

  const add = el('label', 'sheet-image-add');
  add.textContent = '+';
  add.title = t('sheet.addImage');
  const input = el('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.addEventListener('change', async () => {
    for (const file of input.files) await onAddImage(file);
    input.value = '';
  });
  add.appendChild(input);
  wrap.appendChild(add);
  return wrap;
}

/** A labelled text input. */
export function field(label, value, onChange, { list = null, placeholder = '' } = {}) {
  const wrap = el('label', 'sheet-field');
  wrap.appendChild(el('span', 'sheet-field-label', label));
  const inp = el('input', 'sheet-field-input');
  inp.value = value || '';
  inp.placeholder = placeholder;
  if (list) inp.setAttribute('list', list);
  inp.addEventListener('blur', () => onChange(inp.value.trim()));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  wrap.appendChild(inp);
  return wrap;
}

/** A labelled select. */
export function choice(label, value, options, onChange,
                       { blank = '—', name = savName } = {}) {
  const wrap = el('label', 'sheet-field');
  wrap.appendChild(el('span', 'sheet-field-label', label));
  const sel = el('select', 'sheet-field-input');
  if (blank != null) {
    const o = el('option', null, blank); o.value = '';
    sel.appendChild(o);
  }
  for (const opt of options) {
    /* Options are ids, whether given bare or as records; what the player
       reads is looked up, so a menu is as translatable as any other text. */
    const id  = typeof opt === 'string' ? opt : opt.id;
    const o = el('option', null, name(id, opt));
    o.value = id;
    if (id === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  wrap.appendChild(sel);
  return wrap;
}

/**
 * A checkbox list where the chosen entries are kept in an array.
 *
 * Used for special abilities and items, where the sheet tracks WHICH were
 * taken; what each one does stays in the book.
 */
export function picks(options, chosen, onChange,
                      { note: withNote = false, name = savName } = {}) {
  const wrap = el('div', 'sheet-picks');
  const set = new Set(chosen || []);
  for (const opt of options) {
    const row = el('label', 'sheet-pick');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = set.has(opt);
    cb.addEventListener('change', () => {
      /* The STORED value is always the id; only the label is translated, so
         a sheet filled in one language reads correctly in the other. */
      const next = new Set(set);
      cb.checked ? next.add(opt) : next.delete(opt);
      onChange([...next]);
    });
    row.appendChild(cb);
    row.appendChild(el('span', 'sheet-pick-label', name(opt)));
    wrap.appendChild(row);
  }
  if (withNote) wrap.appendChild(el('p', 'sheet-picks-note', t('sheet.picksNote')));
  return wrap;
}

/** A collapsible section, so a long sheet is navigable. */
export function section(title, ...children) {
  const d = el('details', 'sheet-section');
  d.open = true;
  const s = el('summary', 'sheet-section-title', title);
  d.appendChild(s);
  const body = el('div', 'sheet-section-body');
  for (const c of children) if (c) body.appendChild(c);
  d.appendChild(body);
  return d;
}
