/* Player vessels on the chart.
 *
 * A player ship is never given a raw position. It is *anchored* to something
 * and its position is derived from that anchor every frame:
 *
 *   { mode: 'body',    system, bodyPath: 'aleph/warren', orbit, phase }
 *   { mode: 'star',    system, orbit, phase }
 *   null   — not placed; the ship exists in the store but not on the map
 *
 * Anchoring rather than storing coordinates is what makes nesting work for
 * free: a ship anchored to Warren follows Warren around Aleph and Aleph
 * around Rin, because it is positioned relative to whatever it is tied to.
 * A dragged x/y would have to fight the orbit animation every frame.
 *
 * `bodyPath` is a slash path from the system down ('aleph' or 'aleph/warren')
 * so the anchor survives sector data being re-ordered, and so a ship can be
 * parked around a moon as easily as around a planet.
 *
 * Movement retargets the anchor. The ship flies there visually, but the
 * anchor is committed on arrival, so what is persisted is always a settled
 * orbit — reopening the map next week is never ambiguous.
 */

import { SECTOR } from '../data/sector.js';

/* ------------------------------------------------- body position registry */

/* Absolute position, in system-local world units, of every canon body — the
 * values tick() already computes and used to discard. Nested moons have their
 * parent's offset folded in, so a lookup is always absolute within its system.
 *
 * Keyed 'system/bodyPath', e.g. 'rin/aleph/warren'.
 */
const POS = new Map();

/** Record where a body is this frame. Called from the orbit loop. */
export function setBodyPos(sysId, path, x, y) {
  POS.set(`${sysId}/${path}`, { x, y });
}

/** Where a body is right now, in system-local world units, or null. */
export function bodyPos(sysId, path) {
  return POS.get(`${sysId}/${path}`) || null;
}

export function clearPositions() { POS.clear(); }

/* ----------------------------------------------------------- sector data */

/** Walk a slash path to its body record: 'aleph/warren' -> the moon. */
export function bodyAt(sysId, path) {
  const sys = SECTOR.systems[sysId];
  if (!sys || !path) return null;
  const [headId, ...rest] = path.split('/');
  let node = sys.bodies.find(b => b.id === headId);
  for (const seg of rest) {
    if (!node) return null;
    node = (node.moons || []).find(m => m.id === seg);
  }
  return node || null;
}

/** Every anchorable body in a system, as { path, body, depth }, moons
    included — the candidate list for targeting mode. */
export function anchorTargets(sysId) {
  const sys = SECTOR.systems[sysId];
  if (!sys) return [];
  const out = [];
  for (const b of sys.bodies) {
    out.push({ path: b.id, body: b, depth: 0 });
    for (const m of (b.moons || [])) {
      out.push({ path: `${b.id}/${m.id}`, body: m, depth: 1 });
    }
  }
  return out;
}

/** Orbit-units-to-world scale for a system. Mirrors buildSystemGroup, which
    sizes every system so its outermost body sits at SYS_R. */
export function systemK(sysId, SYS_R) {
  const sys = SECTOR.systems[sysId];
  if (!sys) return 1;
  return SYS_R / Math.max(...sys.bodies.map(b => b.orbit));
}

/* ------------------------------------------------------------- anchoring */

/* How far off a body a parked ship sits, in world units — big enough to clear
   the body's own disc and its label, small enough to read as "in orbit". */
const PARK_GAP = 4.2;

/** A sensible parking orbit for a body, given its drawn radius. */
export function parkRadius(bodyRadius) {
  return Math.max(6, bodyRadius * 1.9 + PARK_GAP);
}

/**
 * Resolve an anchor to a position in system-local world units.
 *
 * Returns null when the anchor cannot be placed — an unplaced ship, or one
 * anchored to a body that no longer exists in the sector data. Callers treat
 * null as "do not render", which keeps a stale anchor harmless rather than
 * throwing during the orbit loop.
 */
export function resolveAnchor(anchor, nowSeconds, K, TILT) {
  if (!anchor || !anchor.system) return null;

  const orbitOffset = (R, phase, period) => {
    /* A ship's own little orbit around whatever it is parked at. Period is
       generous so parked ships drift rather than race. */
    const M = (phase || 0) * Math.PI / 180 + (nowSeconds / (period || 90)) * Math.PI * 2;
    return { x: Math.cos(M) * R, y: Math.sin(M) * R * TILT };
  };

  if (anchor.mode === 'body') {
    const base = bodyPos(anchor.system, anchor.bodyPath);
    if (!base) return null;                    // body not on chart (yet)
    const off = orbitOffset(anchor.orbit || 8, anchor.phase, anchor.period);
    return { x: base.x + off.x, y: base.y + off.y };
  }

  if (anchor.mode === 'star') {
    /* Held relative to the star, exactly like a canon body: the orbit is in
       orbit-units so it stays put when the system is rescaled. */
    const off = orbitOffset((anchor.orbit || 20) * K, anchor.phase, anchor.period);
    return { x: off.x, y: off.y };
  }

  return null;
}

/** A default anchor for a ship arriving in a system with nothing specified —
    a wide, slow hold around the star. */
export function defaultAnchor(sysId) {
  const sys = SECTOR.systems[sysId];
  const outer = sys ? Math.max(...sys.bodies.map(b => b.orbit)) : 40;
  return { mode: 'star', system: sysId, orbit: Math.round(outer * 0.6),
           phase: 0, period: 300 };
}

/** Human-readable description of where a ship is, for the sheet and HUD. */
export function describeAnchor(anchor, tr = k => k) {
  if (!anchor || !anchor.system) return null;
  const sys = SECTOR.systems[anchor.system];
  const sysName = sys ? tr(sys.key + '.name') : anchor.system;
  if (anchor.mode === 'body') {
    const b = bodyAt(anchor.system, anchor.bodyPath);
    const name = b ? tr(b.key + '.name') : anchor.bodyPath;
    return { system: sysName, detail: name, orphan: !b };
  }
  return { system: sysName, detail: null, orphan: false };
}

/* --------------------------------------------------------------- transit */

/**
 * A flight from one resolved point to another.
 *
 * The ship is drawn along this path while it runs, but the anchor is only
 * committed when it lands — so an interrupted flight (a reload, a closed tab)
 * leaves the ship at its previous anchor rather than stranded mid-space.
 *
 * `from` and `to` are functions, not points, because both endpoints keep
 * orbiting while the flight is in progress: a ship crossing to Warren must
 * aim where Warren *will be*, not where it was at launch.
 */
export function makeTransit({ from, to, ms = 2000, arc = 0.18 }) {
  const t0 = performance.now();
  return {
    ms, t0,
    /** Position at `now`, plus whether the flight has landed. */
    at(now) {
      const k = Math.min(1, (now - t0) / ms);
      const a = from(), b = to();
      if (!a || !b) return { x: 0, y: 0, done: true, k: 1 };
      /* Ease in and out so departure and arrival read as manoeuvring rather
         than a constant-velocity slide. */
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      /* Bow the path perpendicular to the run, matching the curve of the
         gate lanes so in-system and inter-system travel look related. */
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.sin(e * Math.PI) * len * arc;
      return {
        x: a.x + dx * e - (dy / len) * bow,
        y: a.y + dy * e + (dx / len) * bow,
        done: k >= 1, k
      };
    }
  };
}

/** Heading in degrees for a ship moving between two frames, so the sprite
    can point where it is going. Returns null below a threshold, letting a
    nearly-stationary ship keep its last heading instead of jittering. */
export function headingOf(prev, cur) {
  if (!prev) return null;
  const dx = cur.x - prev.x, dy = cur.y - prev.y;
  if (Math.hypot(dx, dy) < 0.01) return null;
  /* The view is squashed vertically by TILT, so unsquash before taking the
     angle or ships appear to fly at the wrong pitch. */
  return Math.atan2(dy, dx) * 180 / Math.PI;
}
