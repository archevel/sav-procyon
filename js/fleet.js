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

/**
 * A parking orbit for a body, in ORBIT-UNITS.
 *
 * A body's drawn radius is `size * K / 4.375`, so dividing by 4.375 converts
 * `size` into the same orbit-units an anchor stores; the multiplier then sets
 * how far outside the disc the vessel rides. Small enough to read as being in
 * orbit, wide enough to clear the body and its label.
 */
export function parkRadius(size) {
  return Math.max(2.2, (size || 12) / 4.375 * 2.1);
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

  /* A ship's own little orbit around whatever it is parked at. Period is
     generous so parked ships drift rather than race.

     Slightly elliptical by default: a perfect circle reads as a UI ring
     rather than a body under gravity, and the canon planets already run on
     eccentric orbits via the same Kepler solve in tick(). `ecc` is the
     eccentricity (0 = circle) and `argp` rotates the ellipse's long axis so
     several ships at one body do not all share an orientation. */
  /* `phase` is a BEARING: the direction from the anchor point at which the
     vessel should sit at t=0. That is what the placement UI and the m-click
     both mean by it, so the orbit is built around that direction rather than
     having it treated as a raw mean anomaly.

     The ellipse is therefore constructed with its periapsis toward `phase`
     (so the vessel starts on the clicked bearing) and `argp` only offsets the
     long axis relative to that, defaulting to none. Passing the bearing as
     BOTH the anomaly and the axis rotation applied it twice, which sent a
     ship clicked toward one gate off to the opposite side of the system. */
  const orbitOffset = (R, phase, period, ecc = 0, argp = 0) => {
    const bearing = (phase || 0) * Math.PI / 180;
    const M = (nowSeconds / (period || 90)) * Math.PI * 2;
    let x, y;
    if (ecc > 0) {
      /* Solve M = E - e*sin(E) for the eccentric anomaly by Newton's method,
         matching how tick() integrates the canon bodies.

         R is treated as the SEMI-MAJOR axis, so the vessel swings between
         R(1-e) and R(1+e) around the distance asked for. Pinning periapsis to
         R instead would put apoapsis at R(1+e)/(1-e) — 1.9x the requested
         radius at e=0.3, which carries a parked ship well away from the body
         it is meant to be orbiting. */
      const a = R;
      let E = M;
      for (let i = 0; i < 4; i++) E -= (E - ecc * Math.sin(E) - M) / (1 - ecc * Math.cos(E));
      x = a * (Math.cos(E) - ecc);
      y = a * Math.sqrt(1 - ecc * ecc) * Math.sin(E);
    } else {
      x = Math.cos(M) * R;
      y = Math.sin(M) * R;
    }
    /* Turn the whole orbit to the requested bearing, in its own plane and
       BEFORE the squash to the viewing plane — rotating after the squash
       would shear the ellipse instead of turning it. */
    const rot = bearing + argp;
    if (rot) {
      const c = Math.cos(rot), sn = Math.sin(rot);
      const nx = x * c - y * sn; y = x * sn + y * c; x = nx;
    }
    return { x, y: y * TILT };
  };

  /* Default eccentricity for a parked vessel — enough to be visibly not a
     circle, small enough that the ship never appears to drift off the body
     it is meant to be orbiting. */
  const ecc  = anchor.ecc  ?? 0.28;
  const argp = (anchor.argp ?? 0) * Math.PI / 180;

  /* Both modes measure `orbit` in ORBIT-UNITS, the same units the sector data
     uses, and convert with K here. Storing world units instead would pin a
     vessel to one system's scale: K is derived from a system's outermost
     body, so the same anchor would sit at a different distance in a wider
     system, and re-scaling a system would silently move every ship in it. */
  if (anchor.mode === 'body') {
    const base = bodyPos(anchor.system, anchor.bodyPath);
    if (!base) return null;                    // body not on chart (yet)
    const off = orbitOffset((anchor.orbit || 6) * K, anchor.phase, anchor.period, ecc, argp);
    return { x: base.x + off.x, y: base.y + off.y };
  }

  if (anchor.mode === 'star') {
    const off = orbitOffset((anchor.orbit || 20) * K, anchor.phase, anchor.period, ecc, argp);
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
           phase: 0, period: 300, ecc: 0.22, argp: 0 };
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
