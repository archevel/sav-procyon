/* Procyon Sector — one SVG, one camera.
 *
 * Everything lives in a single <svg>: all four systems drawn at their sector
 * coordinates, joined by curved gate lanes. There is no scene swapping and no
 * second renderer — navigation is only ever a camera move over that one world,
 * so travel between systems is genuinely continuous.
 *
 *   sector view  = camera pulled back over the whole chart
 *   system view  = camera pushed in on one star
 *   travel       = camera slides along the curved lane joining two stars
 *
 * Detail is faded by CSS on <g> class, so planets simply disappear when the
 * camera is far out rather than being torn down and rebuilt.
 */

import { SECTOR } from '../data/sector.js';
import { t, has as hasKey, getLang, setLang, LANGS } from '../data/i18n.js';
import { SOURCEBOOK } from '../data/sourcebook.js';
import { FACTIONS } from '../data/factions-data.js';
import * as store from './store.js';
import { mountFleetPanel } from './fleet-ui.js';
import { mountCrewPanel } from './crew-ui.js';
import { mountSharePanel } from './share-ui.js';
import { shipArt } from './sheet-ship.js';
import { setBodyPos, clearPositions, bodyPos, bodyAt, anchorTargets,
         resolveAnchor, defaultAnchor, parkRadius, makeTransit,
         describeAnchor, anchorEllipse, PARK_ECC, targetName,
         GATE_PREFIX, isGatePath, gateParkRadius } from './fleet.js';
import { renderPlaceNotes, placePath, notesIndex,
         splitPath, isFactionTarget } from './notes-ui.js';
import { renderFactionExtras } from './factions-ui.js';
import { pushUi, installBackHandler } from './nav.js';
import { mountStakeholdersPanel } from './stakeholders-ui.js';

/* Sourcebook text is authored per map key in both languages, and takes
   precedence over the hand-written strings in strings.js.

   In the debug locale every string renders as its own identifier, the same
   way t() does — that is the whole point of the locale, so bundle-backed
   text must not quietly fall through to Swedish and hide a gap. */
function sb(key, field) {
  const rec = SOURCEBOOK[key];
  if (!rec || !rec[field]) return null;
  const lang = getLang();
  if (lang === 'debug') return `${key}.${field}`;
  return rec[field][lang] || rec[field].sv || null;
}

const svgRoot = document.getElementById('world');
const camera  = document.getElementById('camera');
const locView = document.getElementById('location-view');
const crumbs  = document.getElementById('breadcrumb');
const indexEl = document.getElementById('index');

const SVGNS = 'http://www.w3.org/2000/svg';

/* World units. The sector occupies 0..100 in the data; we scale it up so a
   single system has room for orbits without fractional coordinates. */
const W      = 12;             // world units per sector percent
const TILT   = 0.46;           // vertical squash of every orbital plane
const SYS_R  = 62;             // world radius a system's chart occupies

/* Camera framing at each level, as a half-width in world units. */
const ZOOM_SECTOR = 660;               // fallback if sectorHalf() not yet computed
let CURRENT_SECTOR = ZOOM_SECTOR;      // updated whenever sectorHalf() runs
const ZOOM_SYSTEM = 96;
const ZOOM_BODY   = 15;

/* Radius a gate's Precursor ring is drawn at, in world units. Gates carry no
   `size` in the sector data, so this stands in for one wherever a gate has to
   be measured — hit testing, and the orbit a vessel holds at it. */
const GATE_R = 8;

let view = { level: 'sector' };
const ORBITERS = [];
const DEPTH_LAYERS = [];
const NODE_ORBIT = new WeakMap();
let rafId = null;

/* Player vessels: the live render nodes, and the per-system group each is
   drawn into. Declared here with the other render state because
   buildSystemGroup() populates fleetLayers long before the fleet section
   is reached. */
const FLEET = new Map();          // ship id -> render node
const fleetLayers = new Map();    // system id -> <g>
let selectedShipId = null;        // the vessel 'm' will move
let targeting = false;            // true while awaiting a destination click

/* ------------------------------------------------------------------ utils */

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

const imgCache = new Map();
/* Art is served as WebP, with the original jpg/png kept alongside as a
   fallback. This resolves a base name to whichever actually exists, so
   deleting the .webp files reverts the site to the originals with no code
   change. Returns null when neither is present. */
const artCache = new Map();
function artUrl(base, ext) {
  const key = `${base}.${ext}`;
  if (artCache.has(key)) return artCache.get(key);
  const p = (async () => {
    if (await imageExists(`${base}.webp`)) return `${base}.webp`;
    if (await imageExists(key)) return key;
    return null;
  })();
  artCache.set(key, p);
  return p;
}

function imageExists(path) {
  if (imgCache.has(path)) return imgCache.get(path);
  const p = new Promise(res => {
    const im = new Image();
    im.onload = () => res(true);
    im.onerror = () => res(false);
    im.src = path;
  });
  imgCache.set(path, p);
  return p;
}

/* rAF is suspended in background tabs; fall back so a flight always finishes. */
function schedule(fn) {
  return document.hidden ? setTimeout(() => fn(performance.now()), 16)
                         : requestAnimationFrame(fn);
}

/** Sector percent -> world coordinates. */
const wx = p => p * W;
const wy = p => p * W;

/* --------------------------------------------------------------- patterns */

function buildDefs() {
  const defs = svgEl('defs');
  const line = (id, angle, gap, w) => {
    const p = svgEl('pattern', { id, width: gap, height: gap,
      patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${angle})` });
    p.appendChild(svgEl('rect', { width: gap, height: gap, fill: 'var(--paper)' }));
    p.appendChild(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: gap,
      stroke: 'var(--ink)', 'stroke-width': w }));
    return p;
  };
  const cross = (id, gap, w) => {
    const p = svgEl('pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse' });
    p.appendChild(svgEl('rect', { width: gap, height: gap, fill: 'var(--paper)' }));
    p.appendChild(svgEl('path', { d: `M0 0 L${gap} ${gap} M${gap} 0 L0 ${gap}`,
      stroke: 'var(--ink)', 'stroke-width': w, fill: 'none' }));
    return p;
  };
  const dots = (id, gap, r, inv) => {
    const p = svgEl('pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse' });
    p.appendChild(svgEl('rect', { width: gap, height: gap,
      fill: inv ? 'var(--ink)' : 'var(--paper)' }));
    p.appendChild(svgEl('circle', { cx: gap / 2, cy: gap / 2, r,
      fill: inv ? 'var(--paper)' : 'var(--ink)' }));
    return p;
  };
  [ line('h-planet', 38, 2.2, .55),  line('h-ocean', 90, 1.8, .6),
    line('h-giant',   0, 2.6, 1.0),  cross('h-husk', 2.4, .45),
    cross('h-crystal', 3.2, .4),     cross('h-industrial', 1.9, .5),
    dots('h-lush', 2.8, .45),        line('h-ice', 115, 3.4, .42),
    line('h-desert', 12, 3.2, .42),  dots('h-neon', 2.4, .5, true),
    cross('h-jungle', 2.0, .58),     dots('h-nebula', 3.8, .4),
  ].forEach(p => defs.appendChild(p));
  return defs;
}

const FILL = {
  planet: 'url(#h-planet)', ocean: 'url(#h-ocean)', giant: 'url(#h-giant)',
  husk: 'url(#h-husk)', crystal: 'url(#h-crystal)', industrial: 'url(#h-industrial)',
  lush: 'url(#h-lush)', ice: 'url(#h-ice)', desert: 'url(#h-desert)',
  neon: 'url(#h-neon)', jungle: 'url(#h-jungle)', nebula: 'url(#h-nebula)',
  dead: 'var(--ink)', locked: 'var(--paper)',
  station: 'var(--paper)', ship: 'var(--ink)'
};

/* ------------------------------------------------------------ world build */

/** Curved lane between two points, bowed perpendicular to the run. */
function lanePath(ax, ay, bx, by, bow = .16) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const cx = mx - (dy / len) * len * bow;
  const cy = my + (dx / len) * len * bow;
  return { d: `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`, cx, cy };
}

function endpointOf(id) {
  return SECTOR.systems[id]
    ? { x: SECTOR.systems[id].x, y: SECTOR.systems[id].y }
    : SECTOR.endpoints[id];
}

const LANES = new Map();          // "a|b" -> <path>

async function buildWorld() {
  camera.innerHTML = '';
  svgRoot.querySelector('defs')?.remove();
  svgRoot.insertBefore(buildDefs(), svgRoot.firstChild);

  // --- gate lanes, curved, drawn once and kept visible at every zoom -------
  const laneLayer = svgEl('g', { class: 'lane-layer' });
  camera.appendChild(laneLayer);

  for (const g of SECTOR.gates) {
    const a = endpointOf(g.from), b = endpointOf(g.to);
    if (!a || !b) continue;
    const p = lanePath(wx(a.x), wy(a.y), wx(b.x), wy(b.y));
    const path = svgEl('path', { d: p.d, class: `lane lane-${g.status}`,
      id: `lane-${g.from}-${g.to}` });
    laneLayer.appendChild(path);
    LANES.set(`${g.from}|${g.to}`, path);
    LANES.set(`${g.to}|${g.from}`, path);

    const label = svgEl('text', { class: 'lane-label' });
    const tp = svgEl('textPath', { href: `#lane-${g.from}-${g.to}`, startOffset: '50%' });
    tp.textContent = g.key ? t(g.key) : g.label;
    label.appendChild(tp);
    laneLayer.appendChild(label);
  }

  // --- every system, at its sector position -------------------------------
  for (const [id, s] of Object.entries(SECTOR.systems)) {
    camera.appendChild(await buildSystemGroup(id, s));
  }
}

/** One system: star, orbits, bodies, gate reticles — all at world scale. */
async function buildSystemGroup(id, s) {
  const g = svgEl('g', { class: 'system-group', 'data-system': id,
    transform: `translate(${wx(s.x)} ${wy(s.y)})` });

  const maxOrbit = Math.max(...s.bodies.map(b => b.orbit));
  const K = SYS_R / maxOrbit;              // orbit units -> world units

  // Orbit rings — part of the "detail" layer, faded out at sector zoom.
  const detail = svgEl('g', { class: 'sys-detail' });
  g.appendChild(detail);

  for (const b of s.bodies) {
    let cls = 'o-ring';
    if (b.type === 'nebula') cls += ' o-ring-faint';
    if (b.type === 'belt')   cls += ' o-belt-ring';
    // Optional per-body eccentricity (0=circular, e.g. .7=elongated) and
    // per-body armTilt in degrees (rotates the entire orbit around the star).
    const R = b.orbit * K;
    const ecc = b.ecc || 0;
    const rx = R;
    // Semi-minor axis is a·√(1−e²) — the same figure tick() integrates, so
    // the body tracks the drawn ellipse instead of swinging outside it.
    const ry = R * Math.sqrt(1 - ecc * ecc) * TILT;
    // Star sits at the near focus of the orbit ellipse (Kepler I), so we
    // shift the ellipse along its major axis by a·e. cx becomes the offset.
    const cx = R * ecc;
    const attrs = { cx, cy: 0, rx, ry, class: cls };
    if (b.armTilt) attrs.transform = `rotate(${b.armTilt})`;
    detail.appendChild(svgEl('ellipse', attrs));
  }

  // Gate reticles sit exactly ON the lane leaving this system. Rather than
  // trusting a bearing (which drifts, because the lanes are bowed curves and
  // the orbital plane is squashed), walk the real path until we are rimR out.
  const rimR = SYS_R * 1.16;
  for (const gt of (s.gates || [])) {
    const lane = LANES.get(`${id}|${gt.to}`);
    let gx, gy;
    if (lane) {
      const L = lane.getTotalLength();
      const fwd = lane.id.startsWith(`lane-${id}-`);
      let lo = 0, hi = L;
      for (let i = 0; i < 24; i++) {                 // bisect to rimR
        const mid = (lo + hi) / 2;
        const pt = lane.getPointAtLength(fwd ? mid : L - mid);
        if (Math.hypot(pt.x - wx(s.x), pt.y - wy(s.y)) < rimR) lo = mid; else hi = mid;
      }
      const pt = lane.getPointAtLength(fwd ? lo : L - lo);
      gx = pt.x - wx(s.x); gy = pt.y - wy(s.y);
    } else {
      const a = gt.bearing * Math.PI / 180;
      gx = Math.cos(a) * rimR; gy = Math.sin(a) * rimR;
    }
    const gg = svgEl('g', {
      class: `o-gate o-gate-${gt.status}` + (SECTOR.systems[gt.to] ? ' o-gate-linked' : ''),
      transform: `translate(${gx} ${gy})`
    });
    /* Publish the gate's position so vessels can anchor to it. Gates do not
       orbit, so unlike the bodies this is written once at build time rather
       than every frame. */
    setBodyPos(id, GATE_PREFIX + gt.to, gx, gy);
    // Every gate gets its Precursor ring image. Sealed gates use their own
    // (gate-hantu.png shows the missing-components, dead-interior variant).
    const gr = GATE_R;                               // ring radius in world units
    const gateImg = await artUrl(
      gt.status === 'sealed' ? 'img/gate-hantu' : 'img/gate', 'png');
    if (gateImg) gg.appendChild(svgEl('image', { href: gateImg,
      x: -gr, y: -gr, width: gr * 2, height: gr * 2,
      class: 'o-gate-image' }));
    const lbl = svgEl('text', { y: 8, class: 'o-gate-label' });
    lbl.textContent = t('gate.' + gt.to + '.label');
    gg.appendChild(lbl);
    gg.appendChild(svgEl('circle', { r: 10, class: 'o-hit' }));
    if (SECTOR.systems[gt.to]) {
      gg.addEventListener('click', e => { e.stopPropagation(); travelTo(gt.to); });
    } else if (gt.status === 'sealed') {
      // Sealed gate — no travel; show its own location view instead.
      gg.classList.add('o-gate-linked');
      gg.addEventListener('click', e => { e.stopPropagation();
        openLocation(id, {
          id: `gate-${gt.to}`,
          name: t('gate.' + gt.to + '.label'),
          surface: `gate-${gt.to}`,
          tag: t('gate.hantu.tag'),
          blurb: t('gate.hantu.blurb'),
          article: null
        });
      });
    }
    const gtt = svgEl('title'); gtt.textContent = t('gate.tooltip').replace('{name}', t('gate.' + gt.to + '.label')); gg.appendChild(gtt);
    detail.appendChild(gg);
  }

  // Bodies and the star share one layer whose paint order is re-sorted by
  // depth each frame (SVG has no z-index; later siblings paint on top).
  // orbitLayer sits OUTSIDE .sys-detail because the star must stay visible
  // at every zoom. Bodies and gates handle their own fade via their classes.
  const orbitLayer = svgEl('g', { class: 'orbit-layer' });
  g.appendChild(orbitLayer);
  const depthNodes = [];
  for (const b of s.bodies) {
    const node = await makeBody(b, id, K);
    orbitLayer.appendChild(node);
    // Attach the orbit record we just pushed for this body so the depth sort
    // can read its Y directly without parsing SVG attributes.
    NODE_ORBIT.set(node, ORBITERS[ORBITERS.length - 1]);
    depthNodes.push(node);
  }

  // Star + name plate stay visible at every zoom.
  const starG = svgEl('g', { class: 'sys-star-g' });
  starG.appendChild(svgEl('circle', { r: 10.4, class: 'o-star-halo' }));
  starG.appendChild(svgEl('circle', { r: 8.4, class: 'o-star-body' }));
  if (s.star.class === 'star-binary') {
    const comp = svgEl('circle', { r: 3.7, cx: 13, cy: -4, class: 'o-star-body' });
    const an = svgEl('animateTransform', { attributeName: 'transform', type: 'rotate',
      from: '0 0 0', to: '360 0 0', dur: '190s', repeatCount: 'indefinite' });
    comp.appendChild(an);
    starG.appendChild(comp);
  }
  starG.addEventListener('click', e => {
    e.stopPropagation();
    if (view.level === 'sector' || view.id !== id) {
      enterSystem(id);
    } else {
      // Already inside this system: clicking the star opens its own view.
      openLocation(id, {
        id: `star-${id}`,
        name: t(s.key + '.name') + t('star.suffix'),
        surface: `star-${id}`,
        tag: t(s.key + '.tag'),
        blurb: t(s.key + '.blurb'),
        article: null
      });
    }
  });
  starG.appendChild(svgEl('circle', { r: 12, class: 'o-hit' }));
  orbitLayer.appendChild(starG);
  depthNodes.push(starG);
  DEPTH_LAYERS.push({ layer: orbitLayer, nodes: depthNodes, star: starG });

  // Player vessels ride in their own layer, a SIBLING of orbitLayer rather
  // than a child of it. The depth sort re-appends orbitLayer's children
  // whenever their painting order changes, and compares its node list against
  // childNodes to decide — an extra child it does not know about makes that
  // comparison fail every frame and re-appends the whole system, which hangs
  // the tab. Vessels sort among themselves and paint above the bodies.
  const fleetLayer = svgEl('g', { class: 'fleet-layer' });
  g.appendChild(fleetLayer);
  fleetLayers.set(id, fleetLayer);

  const plate = svgEl('g', { class: 'sys-plate' });
  const nm = svgEl('text', { y: 0, class: 'sys-name' });
  nm.textContent = t(s.key + '.name');
  plate.appendChild(nm);
  const tg = svgEl('text', { y: 0, class: 'sys-tag' });
  tg.textContent = t(s.key + '.tag');
  plate.appendChild(tg);
  g.appendChild(plate);

  return g;
}

async function makeBody(b, sysId, K) {
  const g = svgEl('g', { class: 'o-body', 'data-id': b.id });
  const r = Math.max(5.4, b.size * K / 4.375) * (b.scale || 1);
  const R = b.orbit * K;
  const inner = svgEl('g');
  g.appendChild(inner);

  if (b.type === 'station') {
    inner.appendChild(svgEl('rect', { x: -r, y: -r, width: r * 2, height: r * 2,
      class: 'o-globe', fill: FILL.station }));
    inner.appendChild(svgEl('rect', { x: -r * .5, y: -r * .5, width: r, height: r,
      class: 'o-globe', fill: 'none' }));
  } else if (b.type === 'ship') {
    inner.appendChild(svgEl('path', {
      d: `M${-r} 0 L${r * .5} ${-r * .8} L${r * 1.3} 0 L${r * .5} ${r * .8} Z`,
      class: 'o-globe', fill: FILL.ship }));
  } else if (b.type === 'nebula') {
    inner.appendChild(svgEl('ellipse', { rx: r * 1.6, ry: r,
      class: 'o-globe o-nebula', fill: FILL.nebula }));
  } else if (b.type === 'belt') {
    // Asteroid belt: no globe. The body's orbit ring is the visualisation.
    // We draw a thicker, denser dashed ellipse ON the orbit itself.
    // (The normal orbit ring is already drawn earlier; here we add emphasis.)
    // The inner group carries only the label + hit target — position handles it.
  } else {
    inner.appendChild(svgEl('circle', { r, class: 'o-globe', fill: FILL[b.type] || FILL.planet }));
    if (b.type === 'locked') {
      inner.appendChild(svgEl('path', { d: `M0 ${-r} A ${r} ${r} 0 0 1 0 ${r} Z`,
        fill: 'var(--ink)', class: 'o-nostroke' }));
    }
    inner.appendChild(svgEl('path', {
      d: `M0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${r * .58} ${r} 0 0 0 0 ${-r} Z`,
      class: 'o-term' }));
    if (b.type === 'giant') {
      inner.appendChild(svgEl('ellipse', { rx: r * 2.1, ry: r * .5,
        class: 'o-ring-body', transform: 'rotate(-16)' }));
    }
  }

  const imgName = b.type === 'station' ? `station-${b.id}`
                : b.type === 'ship'    ? `ship-${b.id}`
                : b.type === 'nebula'  ? `planet-${b.id}`
                : b.type === 'belt'    ? null
                : `planet-${b.id}`;
  const globeUrl = imgName ? await artUrl(`img/${imgName}`, 'png') : null;
  if (globeUrl) {
    g.classList.add('has-art');
    const cid = `clip-${sysId}-${b.id}`;
    const cp = svgEl('clipPath', { id: cid });
    if (b.type === 'nebula') {
      cp.appendChild(svgEl('ellipse', { rx: r * 1.6, ry: r }));
    } else {
      cp.appendChild(svgEl('circle', { r }));
    }
    inner.appendChild(cp);
    const iw = b.type === 'nebula' ? r * 3.2 : r * 2;
    const ih = b.type === 'nebula' ? r * 2   : r * 2;
    inner.appendChild(svgEl('image', { href: globeUrl,
      x: -iw / 2, y: -ih / 2, width: iw, height: ih,
      'clip-path': `url(#${cid})`, class: 'o-art' }));
  }

  const lab = svgEl('text', { y: r + 3.2, class: 'o-label' });
  lab.textContent = t(b.key + '.name');
  inner.appendChild(lab);
  const tag = svgEl('text', { y: r + 5.2, class: 'o-tag' });
  tag.textContent = t(b.key + '.tag');
  inner.appendChild(tag);
  inner.appendChild(svgEl('circle', { r: Math.max(r * 1.35, 7), class: 'o-hit' }));
  const ttl = svgEl('title'); ttl.textContent = `${t(b.key + '.name')} — ${t(b.key + '.tag')}`; inner.appendChild(ttl);

  g.addEventListener('click', e => { e.stopPropagation(); diveTo(sysId, b, inner); });

  const moons = [];
  for (const m of (b.moons || [])) {
    const mr = Math.max(3.8, m.size * K / 4.375) * (m.scale || 1);
    const mR = m.orbit * K;
    inner.appendChild(svgEl('ellipse', { rx: mR, ry: mR * TILT, class: 'o-ring o-moon-ring' }));
    const mg = svgEl('g', { class: 'o-body', 'data-id': m.id });
    mg.appendChild(svgEl('circle', { r: mr, class: 'o-globe', fill: FILL.planet }));
    mg.appendChild(svgEl('path', {
      d: `M0 ${-mr} A ${mr} ${mr} 0 0 1 0 ${mr} A ${mr * .58} ${mr} 0 0 0 0 ${-mr} Z`,
      class: 'o-term' }));
    const moonUrl = await artUrl(`img/planet-${m.id}`, 'png');
    if (moonUrl) {
      mg.classList.add('has-art');
      const mcid = `clip-${sysId}-${m.id}`;
      const mcp = svgEl('clipPath', { id: mcid });
      mcp.appendChild(svgEl('circle', { r: mr }));
      mg.appendChild(mcp);
      mg.appendChild(svgEl('image', { href: moonUrl,
        x: -mr, y: -mr, width: mr * 2, height: mr * 2,
        'clip-path': `url(#${mcid})`, class: 'o-art' }));
    }
    const ml = svgEl('text', { y: mr + 2.6, class: 'o-label o-label-sm' });
    ml.textContent = t(m.key + '.name');
    mg.appendChild(ml);
    mg.appendChild(svgEl('circle', { r: mr * 1.25, class: 'o-hit' }));
    const mt = svgEl('title'); mt.textContent = `${t(m.key + '.name')} — ${t(m.key + '.tag')}`; mg.appendChild(mt);
    mg.addEventListener('click', e => { e.stopPropagation();
      diveTo(sysId, m, mg, placePath(sysId, `${b.id}/${m.id}`)); });
    inner.appendChild(mg);
    moons.push({ el: mg, id: m.id, R: mR, period: m.period, phase: m.phase });
  }

  ORBITERS.push({ inner, R, period: b.period, phase: b.phase, moons,
    sysId, path: b.id,
    ecc: b.ecc || 0, armTilt: (b.armTilt || 0) * Math.PI / 180 });
  return g;
}


/* ---------------------------------------------------------- player fleet */
/* Player vessels are drawn from the store into each system's orbit layer and
   positioned every frame from their anchor (see fleet.js). They deliberately
   reuse the same triangle indicator and art pipeline as canon ships — a
   player vessel is distinguished by its own sprite and label, not by being
   rendered as a different kind of object. */


/* Set while the app is writing a ship record it has already applied locally,
   so the resulting store event does not rebuild the fleet underneath us. */
let suppressFleetRebuild = false;
let fleetRebuilding = false;

/** Rebuild every player vessel from the store. */
async function renderFleet() {
  /* Rebuilds are async and event-driven; without this guard two overlapping
     runs would each append their own nodes and double the fleet. */
  if (fleetRebuilding) return;
  fleetRebuilding = true;
  try { await rebuildFleet(); } finally { fleetRebuilding = false; }
}

async function rebuildFleet() {
  for (const f of FLEET.values()) f.el.remove();
  FLEET.clear();

  const ships = await store.all('ships');
  for (const rec of ships) {
    const anchor = rec.location;
    if (!anchor || !anchor.system) continue;          // unplaced: not on the chart
    const layer = fleetLayers.get(anchor.system);
    if (!layer) continue;
    const node = await makeFleetShip(rec, anchor.system);
    layer.appendChild(node.el);
    FLEET.set(rec.id, node);
  }
}

async function makeFleetShip(rec, sysId) {
  const K = SYS_R / Math.max(...SECTOR.systems[sysId].bodies.map(b => b.orbit));
  /* Vessels are drawn much smaller than the canon-body formula would give.
     A ship parked at a moon has to read as a craft beside a world, not as a
     second world: at the planetary scale the hull swamps whatever it is
     orbiting. Capped as well as scaled, so a wide system cannot inflate it. */
  const r = Math.min(3.4, Math.max(1.8, (rec.size || 7) * K / 14));

  const el = svgEl('g', { class: 'o-body o-fleet', 'data-ship': rec.id });
  /* The vessel's own orbit, drawn like the canon rings. It lives in its own
     group because a body-anchored orbit has to be re-centred on that body
     every frame, while the hull is positioned independently. */
  const ring = svgEl('ellipse', { class: 'o-ring o-ring-fleet', rx: 0, ry: 0 });
  const ringG = svgEl('g', { class: 'fleet-ring-g' });
  ringG.appendChild(ring);
  el.appendChild(ringG);
  const inner = svgEl('g');
  el.appendChild(inner);

  /* The same hull the canon ships use, so a player vessel reads as a ship
     first and as yours second. */
  const hull = svgEl('g', { class: 'fleet-hull' });
  hull.appendChild(svgEl('path', {
    d: `M${-r} 0 L${r * .5} ${-r * .8} L${r * 1.3} 0 L${r * .5} ${r * .8} Z`,
    class: 'o-globe', fill: FILL.ship }));
  inner.appendChild(hull);

  /* Sprite art, keyed off `sprite` rather than the record id — the id is a
     UUID, so the art needs a stable human-chosen name. */
  /* The frame supplies the art unless the crew has overridden it. */
  const art = shipArt(rec);
  if (art) {
    const url = await artUrl(`img/ship-${art}`, 'png');
    if (url) {
      el.classList.add('has-art');
      const cid = `clip-fleet-${rec.id}`;
      const cp = svgEl('clipPath', { id: cid });
      cp.appendChild(svgEl('circle', { r }));
      hull.appendChild(cp);
      hull.appendChild(svgEl('image', { href: url,
        x: -r, y: -r, width: r * 2, height: r * 2,
        'clip-path': `url(#${cid})`, class: 'o-art' }));
    }
  }

  const lab = svgEl('text', { y: r + 2.4, class: 'o-label o-label-fleet' });
  lab.textContent = rec.name || '—';
  inner.appendChild(lab);
  inner.appendChild(svgEl('circle', { r: Math.max(r * 1.35, 7), class: 'o-hit' }));
  const ttl = svgEl('title');
  ttl.textContent = rec.name || '';
  inner.appendChild(ttl);

  el.addEventListener('click', e => {
    e.stopPropagation();
    selectShip(rec.id);
  });

  return { rec, el, inner, ring, ringG, sysId, K, r, transit: null, prev: null };
}

/** Position every vessel. Called from tick(), after canon bodies have
    published their positions for this frame. */
function tickFleet(t) {
  const now = performance.now();
  for (const f of FLEET.values()) {
    let p;
    if (f.transit) {
      const s = f.transit.at(now);
      p = { x: s.x, y: s.y };
      if (s.done) {
        /* Commit the anchor only on arrival, so an interrupted flight leaves
           the ship at its previous anchor rather than stranded in space.
           The transit is torn down HERE, synchronously, before the async
           write is started: commitArrival persists the record, and leaving
           f.transit set would re-enter it on every subsequent frame until
           that write resolved, firing a store event and a fleet rebuild each
           time. */
        const transit = f.transit;
        f.transit = null;
        commitArrival(f, transit.dest);
      }
    } else {
      p = resolveAnchor(f.rec.location, t, f.K, TILT);
    }
    if (!p) { f.el.style.display = 'none'; continue; }
    f.el.style.display = '';

    f.prev = p;
    f.y = p.y;
    /* Translation only. Canon bodies keep a constant alignment however they
       travel — their art is a fixed chart symbol, not a model of the thing —
       so a vessel that swung to face its direction of motion read as a
       different class of object and drew the eye for no reason. */
    f.inner.setAttribute('transform',
      `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);

    /* The orbit ring is centred on whatever the vessel is anchored TO, not on
       the vessel: a ship parked at a moon traces its little ellipse around
       that moon, which is itself moving. A ring is meaningless mid-flight, so
       it is hidden while a transit runs. */
    updateFleetRing(f);
  }
}

/**
 * Place a vessel's orbit ring for this frame.
 *
 * The ring is centred on the FOCUS of the orbit — the star for a free hold,
 * the body itself for a parked vessel — so it shows the path actually
 * travelled rather than a circle drawn around the ship. A parked ring
 * therefore has to be re-centred every frame, because the body it belongs to
 * is moving.
 */
function updateFleetRing(f) {
  const anchor = f.rec.location;
  const geo = f.transit ? null : anchorEllipse(anchor, f.K, TILT);
  if (!geo) { f.ringG.style.display = 'none'; return; }
  f.ringG.style.display = '';

  let cx = 0, cy = 0;
  if (anchor.mode === 'body') {
    const base = bodyPos(anchor.system, anchor.bodyPath);
    if (!base) { f.ringG.style.display = 'none'; return; }
    cx = base.x; cy = base.y;
  }
  /* Translate to the focus first, then apply the orbit's own transform —
     the reverse order would swing the whole orbit around the system centre.
     geo.transform carries the rotate-then-squash order the position maths
     uses, so the ring is the path actually travelled. */
  f.ringG.setAttribute('transform',
    `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) ${geo.transform}`);
  f.ring.setAttribute('rx', geo.rx.toFixed(2));
  f.ring.setAttribute('ry', geo.ry.toFixed(2));
  f.ring.setAttribute('cx', geo.cx.toFixed(2));
}

/**
 * Jump the selected vessel through the gate it is holding at.
 *
 * Only meaningful when parked at a gate that leads to another system — a
 * sealed gate or the Core has no destination on this chart. The vessel
 * arrives at the matching gate on the far side, which is where a jump
 * physically puts you, rather than in some arbitrary hold.
 */
async function jumpShip(id) {
  const f = FLEET.get(id);
  const anchor = f?.rec.location;
  if (!anchor || anchor.mode !== 'body' || !isGatePath(anchor.bodyPath)) return false;

  const toId = anchor.bodyPath.slice(GATE_PREFIX.length);
  const dest = SECTOR.systems[toId];
  if (!dest) return false;              // sealed gate, or the Core: nowhere to go

  /* Arrive at the gate pointing back the way we came, if the destination has
     one. Systems are linked both ways in the data, so this is the normal
     case; a one-way link falls back to a hold near the star. */
  const backGate = (dest.gates || []).find(g => g.to === view.id || g.to === f.sysId);
  const K = SYS_R / Math.max(...dest.bodies.map(b => b.orbit));
  const landing = backGate
    ? { mode: 'body', system: toId, bodyPath: GATE_PREFIX + backGate.to,
        orbit: gateParkRadius(GATE_R, K), phase: 0, period: 60,
        ecc: PARK_ECC, argp: 0 }
    : defaultAnchor(toId);

  /* The vessel is not animated across the lane. It is in one system and then
     the other, which is what a gate does; the camera travel that follows is
     the player's journey, not the ship's. */
  await store.put('ships', { ...f.rec, location: landing });
  travelTo(toId);
  /* renderFleet has rebuilt the node into the destination system, so the
     selection has to be re-applied to the new element. */
  setTimeout(() => {
    const el = FLEET.get(id)?.el;
    if (el) el.classList.add('is-selected');
  }, 300);
  return true;
}

/* The bottom hint tells the player what the current selection can do, since
   'm' and 'j' are otherwise invisible. It replaces the standing navigation
   hint only while a vessel is selected. */
function updateFleetHint() {
  /* The hint line is gone — buttons exist for every interaction and the
     keys are a hidden extra. Only the order bar reflects selection now. */
  const bar = document.getElementById('ship-actions');
  if (bar) {
    bar.hidden = !selectedShipId;
    const move = document.getElementById('ship-move');
    const jump = document.getElementById('ship-jump');
    const cancel = document.getElementById('ship-cancel');
    if (move)   move.hidden = targeting;
    if (jump)   jump.hidden = targeting || !canJump();
    if (cancel) cancel.hidden = !targeting;
  }
}

/** True when the selected vessel is parked at a gate that leads somewhere. */
function canJump() {
  const a = FLEET.get(selectedShipId)?.rec.location;
  return !!a && a.mode === 'body' && isGatePath(a.bodyPath)
      && !!SECTOR.systems[a.bodyPath.slice(GATE_PREFIX.length)];
}

/** Land a vessel: adopt the anchor it was flying to and persist it.
    The caller has already cleared f.transit. */
async function commitArrival(f, dest) {
  f.rec = { ...f.rec, location: dest };
  /* The local node is already in the right place, so suppress the rebuild
     this write would otherwise trigger — rebuilding here would drop the
     node mid-flight and restart its approach. */
  suppressFleetRebuild = true;
  try { f.rec = await store.put('ships', f.rec); }
  finally { suppressFleetRebuild = false; }
  updateChrome();
}

/**
 * Send a vessel to a new anchor.
 *
 * Both endpoints are read live, because both keep orbiting while the flight
 * runs: a ship crossing to Warren has to aim where Warren will be on arrival,
 * not where it was when the order was given.
 */
function sendShip(id, dest, ms = 2000) {
  const f = FLEET.get(id);
  if (!f) return;
  const K = f.K;
  /* The origin is snapshotted at launch rather than read live. tickFleet
     writes the in-flight position back to f.prev every frame, so a live read
     would keep moving the start point forward and the ship would appear to
     accelerate into its destination. */
  const origin = f.prev
    || resolveAnchor(f.rec.location, performance.now() / 1000, K, TILT)
    || { x: 0, y: 0 };
  /* The destination IS read live: whatever the vessel is heading for keeps
     orbiting while the flight runs, so it must aim where the target will be
     on arrival, not where it was when the order was given. */
  const to = () => resolveAnchor(dest, performance.now() / 1000, K, TILT) || origin;
  f.transit = makeTransit({ from: () => origin, to, ms });
  f.transit.dest = dest;
}


/* ------------------------------------------------------------ note badges */

/**
 * Mark every charted place that carries player notes.
 *
 * A small tick beside a body is enough: the point is to make the player's own
 * writing findable again without cluttering a chart whose whole style is
 * restraint. Re-run whenever notes change.
 */
async function markNoteBadges() {
  const { known } = await notesIndex();
  const paths = new Set(known.map(k => k.path));

  camera.querySelectorAll('.o-note-badge').forEach(n => n.remove());
  for (const path of paths) {
    if (isFactionTarget(path)) continue;       // factions have no chart node
    const { sysId, bodyPath } = splitPath(path);
    const group = camera.querySelector(`.system-group[data-system="${sysId}"]`);
    if (!group) continue;
    /* A nested moon is drawn inside its planet, so the last segment finds it
       wherever it sits in the tree. */
    const leaf = bodyPath ? bodyPath.split('/').pop() : null;
    const host = leaf
      ? group.querySelector(`.o-body[data-id="${CSS.escape(leaf)}"] > g`)
      : group.querySelector('.sys-star-g');
    if (!host) continue;
    const badge = svgEl('text', { class: 'o-note-badge', x: 0, y: -6 });
    badge.textContent = '✎';
    host.appendChild(badge);
  }
}

/* ------------------------------------------------------- move targeting */
/* Movement is a keyboard-then-click gesture rather than a drag: a vessel's
   position is derived from its anchor every frame, so dragging would fight
   the orbit animation. Press 'm' with a vessel selected, then click a body
   to park around it or empty space to hold that radius off the star. */

/**
 * Click a vessel: select it, or dive into it if it was already selected.
 *
 * The second click mirrors what clicking a body does — the difference is only
 * that a vessel needs one click to become the subject of the 'm' command
 * first, so diving is the follow-up rather than the immediate action.
 */
function selectShip(id) {
  if (selectedShipId === id) {
    /* Already selected: the player is asking to look at it, not to deselect.
       Targeting is cancelled first — diving mid-order would leave the map in
       targeting mode with nothing to aim at. */
    endTargeting();
    return diveToShip(id);
  }
  selectedShipId = id;
  for (const [sid, f] of FLEET) f.el.classList.toggle('is-selected', sid === selectedShipId);
  updateChrome();
}

/** Deselect without diving — what Escape does. */
function deselectShip() {
  selectedShipId = null;
  for (const f of FLEET.values()) f.el.classList.remove('is-selected');
  endTargeting();
  updateChrome();
}

/* Zoom to a vessel and open its surface view. It reuses the body dive rather
   than inventing a second one, so a vessel closes with Escape and shows the
   same chrome as anywhere else on the chart. */
function diveToShip(id) {
  const f = FLEET.get(id);
  if (!f) return;
  /* Resolve the position rather than reading f.prev: the render loop has not
     necessarily run a frame yet (rAF is paused in a background tab), and a
     click that silently did nothing would be worse than one frame of stale
     position. */
  const p = f.prev
    || resolveAnchor(f.rec.location, performance.now() / 1000, f.K, TILT);
  if (!p) return;
  const sys = SECTOR.systems[f.sysId];
  stopOrbits();                                  // hold the vessel still
  moveCam({ x: wx(sys.x) + p.x, y: wy(sys.y) + p.y, half: ZOOM_BODY }, 700,
          { ease: k => k * k });
  setTimeout(() => openLocation(f.sysId, shipAsBody(f.rec)), 850);   // vessel notes live on its sheet
}

/**
 * Present a stored ship in the shape openLocation expects of a body.
 *
 * A vessel has no i18n key — its name is the player's own text — so `key` is
 * left off and the plain-text fallbacks are used instead. `surface` follows
 * the sprite name, so art drops in as img/surface-<sprite>.webp alongside the
 * canon surfaces.
 */
function shipAsBody(rec) {
  return {
    id: rec.id,
    name: rec.name || '',
    surface: shipArt(rec),
    tag: rec.tag || t('fleet.vessel'),
    blurb: rec.blurb || '',
    article: null
  };
}

function beginTargeting() {
  const f = FLEET.get(selectedShipId);
  if (!f || view.level !== 'system' || f.sysId !== view.id) return;
  pushUi('targeting');
  targeting = true;
  svgRoot.classList.add('is-targeting');
  updateChrome();
}

function endTargeting() {
  targeting = false;
  svgRoot.classList.remove('is-targeting');
  updateChrome();
}

/** Convert a pointer event to world coordinates, then to coordinates local
    to a system's group — the frame anchors are expressed in. */
function pointerToSystem(e, sysId) {
  const pt = svgRoot.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const world = pt.matrixTransform(svgRoot.getScreenCTM().inverse());
  const sys = SECTOR.systems[sysId];
  return { x: world.x - wx(sys.x), y: world.y - wy(sys.y) };
}

/**
 * Resolve a click during targeting into an anchor.
 *
 * A click near a body parks the vessel in orbit around it; anything else is
 * read as a hold relative to the star at that distance, with the phase taken
 * from the click so the ship appears where it was asked to go.
 */
function anchorFromClick(e, sysId, K) {
  const p = pointerToSystem(e, sysId);

  /* Snap to the nearest body whose click radius contains the point. Moons are
     tested too, and win over their planet when both are in range because they
     are listed deeper. */
  let best = null;
  for (const { path, body, gate } of anchorTargets(sysId)) {
    const bp = bodyPos(sysId, path);
    if (!bp) continue;
    /* Gates are drawn at a fixed ring radius rather than scaled from a
       `size`, so their hit radius is that ring, not the body formula. */
    const r = gate ? GATE_R
                   : Math.max(5.4, body.size * K / 4.375) * (body.scale || 1);
    /* Unsquash the vertical delta before measuring, or bodies would be
       easier to hit from the side than from above. */
    const d = Math.hypot(p.x - bp.x, (p.y - bp.y) / TILT);
    const reach = r * 2.4;
    if (d <= reach && (!best || d < best.d)) best = { path, body, r, d };
  }

  if (best) {
    /* Both radii work in orbit-units, like every stored anchor. A gate is
       measured from its drawn ring; a body from its `size` in the sector
       data. Phase is the bearing from the anchor to the click, so a vessel
       appears on the side the player aimed at rather than always due east. */
    const phase = Math.atan2((p.y - bodyPos(sysId, best.path).y) / TILT,
                             p.x - bodyPos(sysId, best.path).x) * 180 / Math.PI;
    return { mode: 'body', system: sysId, bodyPath: best.path,
             orbit: isGatePath(best.path) ? gateParkRadius(GATE_R, K)
                                          : parkRadius(best.body.size),
             phase, period: 60, ecc: PARK_ECC, argp: 0 };
  }

  /* Free hold: distance from the star, unsquashed, converted back to the
     orbit units anchors are stored in so it survives a rescale.

     A vessel starts at periapsis, a(1-e), so the semi-major axis is scaled up
     to put PERIAPSIS on the click. Storing the raw distance as `a` instead
     drops the ship short of where it was sent and swings the orbit out well
     past it — at e=0.22 that is a 22% miss in and a 22% overshoot out. */
  const ECC = 0.22;
  const dist = Math.hypot(p.x, p.y / TILT);
  const phase = Math.atan2(p.y / TILT, p.x) * 180 / Math.PI;
  return { mode: 'star', system: sysId,
           orbit: Math.max(6, dist / K / (1 - ECC)),
           phase, period: 300, ecc: ECC, argp: 0 };
}

/* ------------------------------------------------------------- orbit loop */

function tick(now) {
  const t = now / 1000;
  for (const o of ORBITERS) {
    // Mean anomaly — advances uniformly with time.
    const M = (o.phase * Math.PI / 180) + (t / o.period) * Math.PI * 2;
    let px, py;
    if (o.ecc > 0) {
      // Kepler's second law: solve M = E − e·sin(E) for eccentric anomaly E
      // by Newton's method (3 iterations is plenty for eccentricity < 0.9).
      let E = M;
      for (let i = 0; i < 4; i++) E -= (E - o.ecc * Math.sin(E) - M) / (1 - o.ecc * Math.cos(E));
      // Position on the ellipse in orbital-plane coords; star sits at the near
      // focus (the (-e·a, 0) offset makes cos(E) go from 1-e at perihelion to
      // -(1+e) at aphelion, both measured from the star).
      px = o.R * (Math.cos(E) - o.ecc);
      py = o.R * Math.sqrt(1 - o.ecc * o.ecc) * Math.sin(E);
      // Squash to the tilted viewing plane.
      py *= TILT;
      // Flip sign of px so perihelion is on the same side as before (matches
      // the ring drawn with cx = +R·e).
      px = -px;
    } else {
      // Fast path for circular orbits.
      px = Math.cos(M) * o.R;
      py = Math.sin(M) * o.R * TILT;
    }
    // Then rotate that plane by armTilt around the star.
    if (o.armTilt) {
      const c = Math.cos(o.armTilt), sn = Math.sin(o.armTilt);
      const nx = px * c - py * sn, ny = px * sn + py * c;
      px = nx; py = ny;
    }
    o.y = py;
    o.inner.setAttribute('transform', `translate(${px.toFixed(2)} ${py.toFixed(2)})`);
    // Publish the position we just computed. Player ships anchor to these
    // rather than to stored coordinates, so a ship parked at a moon follows
    // it around its planet and around the star without any extra maths.
    if (o.sysId) setBodyPos(o.sysId, o.path, px, py);
    for (const m of o.moons) {
      const ma = (m.phase * Math.PI / 180) + (t / m.period) * Math.PI * 2;
      const mx = Math.cos(ma) * m.R, my = Math.sin(ma) * m.R * TILT;
      m.el.setAttribute('transform', `translate(${mx.toFixed(2)} ${my.toFixed(2)})`);
      // A moon's transform is relative to its planet, so fold the parent in
      // to keep every published position absolute within its system.
      if (o.sysId) setBodyPos(o.sysId, `${o.path}/${m.id}`, px + mx, py + my);
    }
  }
  // Player vessels ride on top of the positions just published.
  tickFleet(t);
  // Re-sort each system's orbit layer by Y so anything below the star's
  // centerline paints ON TOP of the star (SVG has no z-index — later
  // siblings win). Only touch the DOM when the order has actually changed;
  // appendChild forces layout, so blindly re-appending every frame is what
  // caused the tab to hang.
  for (const dl of DEPTH_LAYERS) {
    dl.nodes.sort((a, b) => nodeY(a) - nodeY(b));
    let changed = false;
    for (let i = 0; i < dl.nodes.length; i++) {
      if (dl.nodes[i] !== dl.layer.childNodes[i]) { changed = true; break; }
    }
    if (changed) for (const n of dl.nodes) dl.layer.appendChild(n);
  }
  rafId = requestAnimationFrame(tick);
}

function nodeY(el) {
  if (el.classList.contains('sys-star-g')) return 0;
  const o = NODE_ORBIT.get(el);
  return o ? (o.y || 0) : 0;
}
function startOrbits() { if (rafId === null) rafId = requestAnimationFrame(tick); }
function stopOrbits()  { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

/* ---------------------------------------------------------------- camera */
/* The only thing that ever moves. viewBox is set directly, so a "zoom" and a
   "pan" are the same operation and can be interpolated continuously. */

let cam = { x: 50 * W, y: 50 * W, half: 660 /* placeholder, overwritten on first applyCam */ };
let camAnim = null;

function applyCam() {
  const ar = svgRoot.clientWidth / Math.max(1, svgRoot.clientHeight);
  const hw = cam.half, hh = cam.half / (ar || 1);
  svgRoot.setAttribute('viewBox',
    `${(cam.x - hw).toFixed(2)} ${(cam.y - hh).toFixed(2)} ${(hw * 2).toFixed(2)} ${(hh * 2).toFixed(2)}`);
  // Detail fades in as the camera closes; one CSS variable drives it.
  const k = Math.max(0, Math.min(1, (CURRENT_SECTOR - cam.half) / (CURRENT_SECTOR - ZOOM_SYSTEM)));
  svgRoot.style.setProperty('--detail', k.toFixed(3));
  svgRoot.style.setProperty('--sector', (1 - k).toFixed(3));
  // Chart labels are sized in world units, so they must scale inversely with
  // the camera or they vanish when zoomed out and swamp the view zoomed in.
  svgRoot.style.setProperty('--txt', (cam.half / ZOOM_SYSTEM).toFixed(3));
}

/** Animate the camera. `path` optionally supplies (t)->{x,y} to follow. */
function moveCam(to, ms, { path = null, ease = easeInOut, done = null } = {}) {
  if (camAnim) camAnim.cancelled = true;
  const from = { ...cam };
  const a = { cancelled: false };
  camAnim = a;
  const t0 = performance.now();
  const step = now => {
    if (a.cancelled) return;
    const k = Math.min(1, (now - t0) / ms);
    const e = ease(k);
    if (path) {
      const p = path(e);
      cam.x = p.x; cam.y = p.y;
    } else {
      cam.x = from.x + (to.x - from.x) * e;
      cam.y = from.y + (to.y - from.y) * e;
    }
    cam.half = from.half + (to.half - from.half) * e;
    applyCam();
    if (k < 1) schedule(step);
    else { camAnim = null; done && done(); }
  };
  schedule(step);
}

const easeInOut = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

/* ------------------------------------------------------------ navigation */

/** System-view half that guarantees the gate rim fits at the current aspect.
    Wide windows have less vertical room, so `half` must be at least
    rim * aspect to keep gates on-screen top and bottom. */
/** Sector-view half that guarantees every system + its rim fits at the
    current aspect, with a small margin. */
function sectorHalf() {
  const ar = svgRoot.clientWidth / Math.max(1, svgRoot.clientHeight);
  // Bounding box of everything on the chart, in world units.
  const xs = [...Object.values(SECTOR.systems).map(s => s.x),
              ...Object.values(SECTOR.endpoints || {}).map(e => e.x)];
  const ys = [...Object.values(SECTOR.systems).map(s => s.y),
              ...Object.values(SECTOR.endpoints || {}).map(e => e.y)];
  const w = (Math.max(...xs) - Math.min(...xs)) * W;
  const h = (Math.max(...ys) - Math.min(...ys)) * W;
  // Half-widths needed: horizontal half >= w/2, vertical half = half/ar >= h/2.
  const needed = Math.max(w / 2, (h / 2) * ar) + 120;
  CURRENT_SECTOR = needed;
  return needed;
}

function systemHalfFor(id) {
  const ar = svgRoot.clientWidth / Math.max(1, svgRoot.clientHeight);
  const rim = SYS_R * 1.16 + 13;              // rim + reticle/label margin
  // half applies to width; vertical half = half / aspect. To fit rim
  // vertically we need half / aspect >= rim, i.e. half >= rim * aspect.
  // To fit rim horizontally we need half >= rim.
  const needed = Math.max(rim, rim * ar);
  return Math.max(ZOOM_SYSTEM, needed);
}

function enterSystem(id) {
  if (view.level === 'sector') pushUi('system');
  const s = SECTOR.systems[id];
  view = { level: 'system', id };
  document.body.classList.add('in-system');
  moveCam({ x: wx(s.x), y: wy(s.y), half: systemHalfFor(id) }, 1100);
  updateChrome();
  renderFactions();
}

function backToSector() {
  view = { level: 'sector' };
  document.body.classList.remove('in-system');
  locView.classList.remove('active');
  moveCam({ x: 50 * W, y: 50 * W, half: sectorHalf() }, 1100);
  updateChrome();
  renderFactions();
}

/* Travel: the camera slides along the actual curved lane joining the two
   stars. Because every system lives in the same SVG there is nothing to swap —
   we simply fly there, passing through open space in between. */
function travelTo(toId) {
  const fromId = view.id;
  const from = SECTOR.systems[fromId], to = SECTOR.systems[toId];
  if (!from || !to) return enterSystem(toId);

  const lane = LANES.get(`${fromId}|${toId}`);
  if (lane) lane.classList.add('lane-active');
  view = { level: 'system', id: toId };
  updateChrome();
  // The destination has its own faction roster, so refresh the sidebar as
  // soon as the view changes rather than when the flight animation lands.
  renderFactions();

  const L = lane ? lane.getTotalLength() : 0;
  const fwd = !lane || lane.id.startsWith(`lane-${fromId}-`);
  const follow = e => {
    if (!lane) {
      return { x: wx(from.x + (to.x - from.x) * e), y: wy(from.y + (to.y - from.y) * e) };
    }
    const pt = lane.getPointAtLength(fwd ? e * L : (1 - e) * L);
    return { x: pt.x, y: pt.y };
  };

  // Zoom profile: push IN toward the gate, hold close while running the lane
  // fast, then pull back out on arrival. (Zooming out to see the whole sector
  // and back in again reads as a scene change; staying low reads as travel.)
  const CLOSE = ZOOM_SYSTEM * .42;             // tight on the lane in transit
  const half = e => {
    const target = systemHalfFor(view.id);
    if (e < .18) return target + (CLOSE - target) * (e / .18);
    if (e > .82) return CLOSE + (target - CLOSE) * ((e - .82) / .18);
    return CLOSE;
  };

  // Distance eases slowly out of the departure system, sprints along the
  // middle of the lane, then eases into the destination.
  const dist = k => {
    if (k < .18) { const t = k / .18; return .06 * t * t; }
    if (k > .82) { const t = (k - .82) / .18; return .94 + .06 * (1 - (1 - t) * (1 - t)); }
    return .06 + (k - .18) / .64 * .88;
  };

  const t0 = performance.now();
  const MS = 1150;    // full flight time from gate click to arrival
  if (camAnim) camAnim.cancelled = true;
  const a = { cancelled: false };
  camAnim = a;
  const step = now => {
    if (a.cancelled) return;
    const k = Math.min(1, (now - t0) / MS);
    const p = follow(dist(k));
    cam.x = p.x; cam.y = p.y; cam.half = half(k);
    applyCam();
    if (k < 1) schedule(step);
    else {
      camAnim = null;
      if (lane) lane.classList.remove('lane-active');
    }
  };
  schedule(step);
}

/* Diving into a body: continue the same camera move all the way down to the
   body itself, then cross-fade to the surface image partway through. */
function diveTo(sysId, b, node, notePath = null) {
  const sys = SECTOR.systems[sysId];
  const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(node.getAttribute('transform') || '');
  let ox = 0, oy = 0;
  if (m) { ox = parseFloat(m[1]); oy = parseFloat(m[2]); }
  // A moon's transform is relative to its parent body.
  const parentInner = node.parentNode?.closest?.('.o-body')?.firstElementChild;
  if (parentInner && parentInner !== node) {
    const pm = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(parentInner.getAttribute('transform') || '');
    if (pm) { ox += parseFloat(pm[1]); oy += parseFloat(pm[2]); }
  }

  stopOrbits();                                  // hold the target still
  moveCam({ x: wx(sys.x) + ox, y: wy(sys.y) + oy, half: ZOOM_BODY }, 700,
          { ease: k => k * k });
  setTimeout(() => openLocation(sysId, b, notePath || placePath(sysId, b.id)), 850);
}

/* ------------------------------------------------------------- location */

async function openLocation(sysId, b, notePath = null, { push = true } = {}) {
  /* A language switch re-renders the open location; that must not grow the
     back stack. */
  if (push && view.level !== 'location') pushUi('location');
  view = { level: 'location', sysId, bodyId: b.id, notePath };
  const surface = b.surface ? await artUrl(`img/surface-${b.surface}`, 'jpg') : null;
  const hasImage = !!surface;
  // The surface view uses i18n keys for everything now.
  let prose;
  const sbBlurb = b.key ? sb(b.key, 'blurb') : null;
  if (sbBlurb) prose = sbBlurb;
  else if (b.key && hasKey(b.key + '.blurb')) prose = t(b.key + '.blurb');
  else if (b.blurb) prose = b.blurb;
  else if (b.key) prose = t(b.key + '.tag');
  else prose = b.tag || '';

  // Details come from the sourcebook where the book has a full entry for
  // this body, and otherwise from the hand-written strings.
  const sbDetails = b.key ? sb(b.key, 'details') : null;
  const detailsKey = b.key ? b.key + '.details' : null;
  const hasDetails = !!sbDetails || (!!detailsKey && hasKey(detailsKey));

  locView.innerHTML = `
    ${hasImage ? `<div class="loc-image" style="background-image:url(${surface})"></div>`
          : `<div class="loc-placeholder">${t('loc.placeholder').replace('{id}', b.surface || b.id)}</div>`}
    <button class="loc-back" aria-label="${t('sheet.back')}">‹</button>
    <div class="loc-body">
      <div class="loc-kicker">${sysId ? t(SECTOR.systems[sysId].key + '.name') : t('crumb.sector')}</div>
      <h2 class="loc-title">${b.key ? t(b.key + '.name') : (b.name || '?')}</h2>
      <p class="loc-text">${prose || ''}</p>
      ${hasDetails ? `<div class="loc-actions"><button class="loc-info-btn">${t('loc.details')}</button></div>` : ''}
      ${notePath ? `<div class="loc-notes">
        <h3 class="loc-notes-title">${t('notes.yours')}</h3>
        <div class="loc-notes-body"></div>
      </div>` : ''}
    </div>
    ${hasDetails ? `<div class="loc-info-panel" hidden>
      <button class="loc-info-close" aria-label="${t('loc.close')}">×</button>
      <div class="loc-info-content"></div>
    </div>` : ''}`;
  locView.classList.add('active');
  locView.querySelector('.loc-back')?.addEventListener('click', () => closeLocation());
  renderFactions();

  // Wire the info panel open/close.
  // Info panel is shared between the body's Details button and each faction pill.
  let panel = locView.querySelector('.loc-info-panel');
  let content = locView.querySelector('.loc-info-content');
  let closeBtn = locView.querySelector('.loc-info-close');
  const openInfo = (title, body) => {
    if (!panel || !content) return;
    content.innerHTML = (title ? `<h3>${title}</h3>` : '') + mdBlocks(body);
    pushUi('loc-info');
    panel.hidden = false;
  };
  if (hasDetails) {
    const openBtn = locView.querySelector('.loc-info-btn');
    openBtn?.addEventListener('click', () =>
      openInfo('', sbDetails || (detailsKey ? t(detailsKey) : '') || ''));
  }
  closeBtn?.addEventListener('click', () => { panel.hidden = true; });
  panel?.addEventListener('click', e => { if (e.target === panel) panel.hidden = true; });

  /* The player's own notes for this place, below the canon text and clearly
     separated from it — what the group wrote must never read as sourcebook. */
  if (notePath) {
    const host = locView.querySelector('.loc-notes-body');
    if (host) renderPlaceNotes(host, notePath, { onChange: markNoteBadges });
  }

  updateChrome();
}

function closeLocation() {
  locView.classList.remove('active');
  const sysId = view.sysId;
  if (sysId) {
    view = { level: 'system', id: sysId };
    const s = SECTOR.systems[sysId];
    startOrbits();
    moveCam({ x: wx(s.x), y: wy(s.y), half: systemHalfFor(sysId) }, 900);
  } else {
    backToSector();
  }
  updateChrome();
  renderFactions();
}

function articleHref(rel) { return `articles/${getLang() === 'debug' ? 'sv' : getLang()}/${rel}.html`; }


/* The sourcebook details carry a little markdown — a bold heading and a
   bullet list of notable people. Render just that subset; anything else is
   treated as paragraph text. */
function mdInline(s) {
  // Bold first, so the single-asterisk rule cannot eat half a **pair**.
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

function mdBlocks(body) {
  return (body || '').split('\n\n').map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    if (lines.every(l => l.startsWith('- '))) {
      return '<ul>' + lines.map(l =>
        `<li>${mdInline(l.slice(2))}</li>`).join('') + '</ul>';
    }
    return `<p>${mdInline(lines.join(' '))}</p>`;
  }).join('');
}

function esc(s) {
  return String(s).replace(/[&<>]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/* ------------------------------------------------------------------ chrome */


/* Faction sidebar: shown only when viewing a specific system (not sector,
   not a body location). Lists the system's active factions as names;
   clicking one opens a details-style overlay via the shared info panel. */
function factionText(f, field) {
  const lang = getLang();
  const rec = f[field];
  if (!rec) return '';
  if (lang === 'debug') return `faction.${f.slug}.${field}`;
  return rec[lang] || rec.sv || rec.en || '';
}

/* Which factions to list for a system: those the sourcebook places there,
   with sector-wide and mobile ones collected at the bottom of the menu. */
function factionsFor(sysId) {
  const here = FACTIONS.filter(f => f.systems.includes(sysId));
  return {
    local: here.filter(f => f.reach === 'local'),
    wide: here.filter(f => f.reach !== 'local'),
  };
}

/* Faction sidebar: shown only when viewing a specific system (not sector,
   not a body location). Lists the system's active factions as names;
   clicking one opens a details-style overlay via the shared info panel. */
/* The faction sidebar is gone — factions live in the Stakeholders panel now
   (js/stakeholders-ui.js), which renders their sourcebook half through
   renderFactionDetail below. The call sites survive as no-ops so view
   transitions need not know the sidebar ever existed. */
function renderFactions() {}

/** The sourcebook half of a faction, rendered into a host the Stakeholders
    panel owns. Wires the cross-links that jump to another system. */
function renderFactionDetail(host, f) {
  host.innerHTML = factionHTML(f, view.id || view.sysId || null);
  host.querySelectorAll('.faction-elsewhere').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('stakeholders-panel').hidden = true;
      locView.classList.remove('active');
      startOrbits();
      travelTo(link.dataset.system);
    });
  });
}

function factionHTML(f, sysId) {
  const sec = k => {
    const v = f.sections[k];
    if (!v) return '';
    const lang = getLang();
    const text = lang === 'debug'
      ? `faction.${f.slug}.${k.replace(/\s+/g, '')}`
      : (v[lang] || v.sv || v.en);
    return text ? `<div class="faction-sec"><h4>${t('faction.sec.' + k)}</h4>${
      mdBlocks(text)}</div>` : '';
  };

  const elsewhere = f.systems.filter(x => x !== sysId);
  const links = elsewhere.map(x =>
    `<button class="faction-elsewhere" data-system="${x}">${
      esc(t(SECTOR.systems[x].key + '.name'))}</button>`).join('');

  const cat = factionText(f, 'category');
  return `
    <h3>${esc(factionText(f, 'title'))}</h3>
    <div class="faction-meta">${esc(cat)}${cat ? ' · ' : ''}${
      t('faction.tier')} ${esc(f.tier)}</div>
    <p class="faction-intro">${esc(factionText(f, 'intro'))}</p>
    ${sec('Current Objective')}
    ${sec('Situation')}
    ${sec('Turf')}
    ${sec('NPCs')}
    ${sec('Notable Assets')}
    ${sec('Quirks')}
    ${sec('Allies')}
    ${sec('Enemies')}
    ${links ? `<div class="faction-sec faction-links">
      <h4>${t('faction.elsewhere')}</h4>${links}</div>` : ''}`;
}

function updateChrome() {
  let html = `<span class="crumb ${view.level === 'sector' ? 'current' : ''}" data-go="sector">${t('crumb.sector')}</span>`;
  const sid = view.id || view.sysId;
  if (sid && SECTOR.systems[sid]) {
    html += `<span class="crumb-sep">/</span>
             <span class="crumb ${view.level === 'system' ? 'current' : ''}" data-go="system:${sid}">${t(SECTOR.systems[sid].key + '.name')}</span>`;
  }
  if (view.level === 'location') html += `<span class="crumb-sep">/</span><span class="crumb current">${t('crumb.place')}</span>`;
  crumbs.innerHTML = html;
  updateFleetHint();
  crumbs.querySelectorAll('.crumb[data-go]').forEach(c => {
    c.addEventListener('click', () => {
      const g = c.dataset.go;
      if (g === 'sector') backToSector();
      else if (g.startsWith('system:')) {
        locView.classList.remove('active');
        startOrbits();
        enterSystem(g.split(':')[1]);
      }
    });
  });
}

function buildIndex() {
  let html = '';
  for (const [id, s] of Object.entries(SECTOR.systems)) {
    // The system name itself is the system-view link — clicking it zooms to
    // the star, which is what the old separate "Systemvy" row did.
    html += `<div class="index-group">
      <button class="index-head" data-sys="${id}">${t(s.key + '.name')}</button>`;
    for (const b of s.bodies) {
      html += `<span class="index-item" data-sys="${id}" data-body="${b.id}">${t(b.key + '.name')}</span>`;
      for (const m of (b.moons || []))
        html += `<span class="index-item" data-sys="${id}" data-body="${m.id}">${t(m.key + '.name')}</span>`;
    }
    html += `</div>`;
  }
  indexEl.innerHTML = html;
  indexEl.querySelectorAll('.index-item, .index-head').forEach(it => {
    it.addEventListener('click', () => {
      const sid = it.dataset.sys, bid = it.dataset.body;
      locView.classList.remove('active');
      startOrbits();
      if (!bid) return enterSystem(sid);
      const s = SECTOR.systems[sid];
      let b = s.bodies.find(x => x.id === bid);
      let path = bid;
      if (!b) for (const p of s.bodies) {
        const mm = (p.moons || []).find(x => x.id === bid);
        if (mm) { b = mm; path = `${p.id}/${mm.id}`; }
      }
      if (!b) return;
      enterSystem(sid);
      setTimeout(() => {
        const node = camera.querySelector(`.system-group[data-system="${sid}"] .o-body[data-id="${bid}"]`);
        diveTo(sid, b, node?.firstElementChild || node, placePath(sid, path));
        // After the dive + surface fade, auto-open the details panel for quick navigation.
        setTimeout(() => {
          const btn = document.querySelector('.loc-info-btn');
          if (btn) btn.click();
        }, 2100);
      }, 1150);
    });
  });
}

/* --------------------------------------------------------------- controls */

document.addEventListener('keydown', e => {
  // Never steal keys from a field the player is typing into.
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

  if (e.key === 'Escape') {
    // Escape backs out one step at a time: first cancel a pending move,
    // then a selection, and only then leave the view.
    if (targeting) return endTargeting();
    if (selectedShipId && view.level !== 'location') return deselectShip();
    if (view.level === 'location') closeLocation();
    else if (view.level === 'system') backToSector();
    return;
  }

  if ((e.key === 'm' || e.key === 'M') && selectedShipId && !targeting) {
    e.preventDefault();
    beginTargeting();
  }

  if ((e.key === 'j' || e.key === 'J') && selectedShipId && !targeting) {
    e.preventDefault();
    jumpShip(selectedShipId);
  }
});

/* A click anywhere in the system resolves a pending move. Registered in the
   capture phase so it beats the per-body handlers that would otherwise dive
   into a location instead of parking the vessel there. */
svgRoot.addEventListener('click', e => {
  if (!targeting || view.level !== 'system') return;
  e.stopPropagation();
  e.preventDefault();
  const f = FLEET.get(selectedShipId);
  if (!f) return endTargeting();
  sendShip(selectedShipId, anchorFromClick(e, f.sysId, f.K));
  endTargeting();
}, true);

window.addEventListener('resize', () => {
  if (view.level === 'system') cam.half = systemHalfFor(view.id);
  else if (view.level === 'sector') cam.half = sectorHalf();
  applyCam();
});

/* ------------------------------------------------------------------- boot */

function findBody(sysId, bodyId) {
  const sys = SECTOR.systems[sysId];
  if (!sys) return null;
  let b = sys.bodies.find(x => x.id === bodyId);
  if (b) return b;
  for (const p of sys.bodies) {
    const m = (p.moons || []).find(x => x.id === bodyId);
    if (m) return m;
  }
  // Special-case pseudo-bodies (stars, sealed gates, features)
  if (bodyId === `star-${sysId}`) return { id: bodyId, key: sys.key, surface: `star-${sysId}` };
  return null;
}

window.addEventListener('langchange', () => {
  /* One manifest per locale — the spec has no i18n. Retargeted on switch so
     an install made afterwards carries the right name; 'debug' reads as sv. */
  const mf = document.querySelector('link[rel="manifest"]');
  if (mf) mf.href = getLang() === 'en' ? 'manifest-en.webmanifest'
                                       : 'manifest.webmanifest';
  // Full re-render: rebuild world, refresh chrome and index. If a location
  // view was open, re-open it so the blurb + details also flip language.
  const currentView = { ...view };
  buildWorld().then(() => {
    updateChrome();
    buildIndex();
    if (currentView.level === 'system' || currentView.level === 'location') {
      enterSystem(currentView.id || currentView.sysId);
    }
    if (currentView.level === 'location') {
      const b = findBody(currentView.sysId, currentView.bodyId);
      if (b) setTimeout(() => openLocation(currentView.sysId, b, null, { push: false }), 100);
    }
    renderFactions();
  });
});

(async () => {
  await buildWorld();
  cam.half = sectorHalf();      // fit-to-viewport, aspect-aware
  applyCam();
  startOrbits();
  buildIndex();
  updateChrome();
  renderFactions();
  await renderFleet();
  markNoteBadges();
  store.subscribe(() => markNoteBadges(), ['notes']);
  // The fleet panel owns no render state: it writes anchors to the store and
  // reaches back through these hooks for the two things only the chart knows.
  installBackHandler();
  mountStakeholdersPanel({
    currentSystem: () => (view.level === 'system' ? view.id : view.sysId) || null,
    renderFactionDetail
  });
  mountCrewPanel();
  mountSharePanel();
  document.getElementById('ship-move')?.addEventListener('click', () => {
    if (selectedShipId && !targeting) beginTargeting();
  });
  document.getElementById('ship-jump')?.addEventListener('click', () => {
    if (selectedShipId && !targeting) jumpShip(selectedShipId);
  });
  document.getElementById('ship-cancel')?.addEventListener('click', () => endTargeting());
  /* The hamburger only exists on phones (CSS reveals it); it folds the
     language row away so the crumbs own the top of the screen. Choosing
     anything in the menu closes it. */
  const menuBtn = document.getElementById('menu-btn');
  const langSw = document.getElementById('lang-switch');
  if (menuBtn && langSw) {
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      langSw.classList.toggle('open');
    });
    langSw.addEventListener('click', () => langSw.classList.remove('open'));
    /* The menu's Import/Export is the same panel as the corner button's. */
    document.getElementById('share-btn-menu')?.addEventListener('click',
      () => document.getElementById('share-btn')?.click());
    document.addEventListener('click', e => {
      if (!langSw.contains(e.target) && e.target !== menuBtn) {
        langSw.classList.remove('open');
      }
    });
  }
  mountFleetPanel({
    onSelect: id => { selectedShipId = null; selectShip(id); },
    onFocus:  sysId => {
      locView.classList.remove('active');
      startOrbits();
      if (view.level !== 'system' || view.id !== sysId) enterSystem(sysId);
    }
  });
  // Vessels are rebuilt whenever the store changes, so a sheet edit in the
  // creator shows up on the chart without a reload.
  store.subscribe(() => { if (!suppressFleetRebuild) renderFleet(); }, ['ships']);
  // Language switcher wiring
  const langSwitch = document.getElementById('lang-switch');
  if (langSwitch) {
    const paint = () => {
      langSwitch.querySelectorAll('button[data-lang]').forEach(b =>
        b.classList.toggle('current', b.dataset.lang === getLang()));
      // Static HUD strings
      document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
      });
      updateFleetHint();
    };
    langSwitch.addEventListener('click', e => {
      if (e.target.dataset.lang) setLang(e.target.dataset.lang);
    });
    window.addEventListener('langchange', paint);
    paint();
  }
  // About panel — credits the material the map is built from. It reuses the
  // details overlay's markup and classes, so it looks like any other panel.
  const aboutBtn = document.getElementById('about-btn');
  const aboutPanel = document.getElementById('about-panel');
  const aboutBody = document.getElementById('about-content');
  if (aboutBtn && aboutPanel && aboutBody) {
    const fill = () => {
      // The two World Anvil worlds are credited with real links, so the
      // list is built here rather than folded into the markdown blocks.
      const wa = [1, 2].map(n =>
        `<li><a href="${esc(t(`about.wa${n}.url`))}" target="_blank"
             rel="noopener noreferrer">${esc(t(`about.wa${n}.label`))}</a></li>`
      ).join('');
      aboutBody.innerHTML = `<h3>${esc(t('about.title'))}</h3>`
        + mdBlocks([t('about.intro'), `**${t('about.sources')}**`,
                    t('about.sb')].join('\n\n'))
        + mdBlocks(t('about.wa'))
        + `<ul class="about-links">${wa}</ul>`
        + mdBlocks([t('about.art'), t('about.translation'),
                    t('about.rights')].join('\n\n'));
    };
    aboutBtn.addEventListener('click', () => { fill(); pushUi('about'); aboutPanel.hidden = false; });
    document.getElementById('about-close')
      ?.addEventListener('click', () => { aboutPanel.hidden = true; });
    aboutPanel.addEventListener('click', e => {
      if (e.target === aboutPanel) aboutPanel.hidden = true;
    });
    // Re-render in the new language if it is open when the language changes.
    window.addEventListener('langchange', () => { if (!aboutPanel.hidden) fill(); });
  }

  // The backdrop URL is applied here rather than in CSS, because only the
  // resolver knows whether the WebP or the original is present.
  const bg = await artUrl('img/bg-sector', 'jpg');
  const nebula = document.querySelector('.nebula');
  if (bg && nebula) {
    nebula.style.backgroundImage = `url(${bg})`;
    nebula.classList.add('has-image');
  }
})();
