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
  if (isGatePath(path)) {
    const g = (sys.gates || []).find(x => GATE_PREFIX + x.to === path);
    return g ? gateBody(g) : null;
  }
  const [headId, ...rest] = path.split('/');
  let node = sys.bodies.find(b => b.id === headId);
  for (const seg of rest) {
    if (!node) return null;
    node = (node.moons || []).find(m => m.id === seg);
  }
  return node || null;
}

/* Gates are addressed as 'gate:iota' so their paths cannot collide with a
   body id, and so a stored anchor says plainly what it is tied to. */
export const GATE_PREFIX = 'gate:';
export const isGatePath = path => String(path || '').startsWith(GATE_PREFIX);

/* A gate has no `size` in the sector data — it is drawn at a fixed radius —
   so parking uses this in place of one. Matches the small stations, which is
   what a gate reads as on the chart. */
export const GATE_SIZE = 9;

/**
 * Every anchorable target in a system, as { path, body, depth }.
 *
 * Bodies, their moons, and the system's gates. Gates are included because a
 * vessel waiting to jump is holding station AT the gate; without them a click
 * on one fell through to the free-hold branch and produced a star-centred
 * orbit that merely happened to pass through the gate.
 */
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
  for (const g of (sys.gates || [])) {
    out.push({ path: GATE_PREFIX + g.to, body: gateBody(g), depth: 0, gate: true });
  }
  return out;
}

/** A gate presented in the shape anchorTargets' callers expect of a body. */
function gateBody(g) {
  return { id: GATE_PREFIX + g.to, key: `gate.${g.to}`, size: GATE_SIZE,
           type: 'gate', gate: g };
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
/* Eccentricity for a vessel parked at a body. Lower than a free hold's,
   because a parked orbit has far less room: a moon like Grytet sits close to
   its planet, so an orbit that swings out much past its disc starts reading
   as belonging to the planet rather than the moon. */
export const PARK_ECC = 0.18;

export function parkRadius(size, ecc = PARK_ECC) {
  /* Clearance wanted at PERIAPSIS: far enough outside the disc to read as in
     orbit rather than landed. Modest, because the vessel swings out to
     a(1+e) and must still look tied to the body rather than to the star. */
  const clearance = Math.max(1.7, (size || 12) / 4.375 * 1.45);
  /* Returned as the SEMI-MAJOR axis, which is what an anchor stores; the
     vessel starts at a(1-e), so scale up to put periapsis at the clearance
     instead of 30% inside it. */
  return clearance / (1 - ecc);
}

/**
 * Parking orbit for a gate, in orbit-units.
 *
 * A gate is drawn at a fixed world radius rather than scaled from a `size`,
 * so its orbit is derived from that ring and converted back through K —
 * parkRadius' body formula would be meaningless here. `gateR` is the drawn
 * ring radius in world units.
 */
export function gateParkRadius(gateR, K, ecc = PARK_ECC) {
  /* Just outside the ring, so the vessel reads as holding station AT the gate
     rather than as having flown through it. Tight: a gate sits out on the
     system rim, where there is nothing else nearby to give the orbit scale,
     so a generous one reads as a star-centred orbit that happens to pass the
     gate — which is precisely the bug this replaced. */
  const clearance = (gateR * 1.12) / K;
  return clearance / (1 - ecc);
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

/** Display name for an anchor target. Gates key their string as `.label`,
    bodies as `.name`, so the suffix follows the kind. */
export function targetName(body, tr = k => k) {
  if (!body) return null;
  return tr(body.key + (body.type === 'gate' ? '.label' : '.name'));
}

/** Human-readable description of where a ship is, for the sheet and HUD. */
export function describeAnchor(anchor, tr = k => k) {
  if (!anchor || !anchor.system) return null;
  const sys = SECTOR.systems[anchor.system];
  const sysName = sys ? tr(sys.key + '.name') : anchor.system;
  if (anchor.mode === 'body') {
    const b = bodyAt(anchor.system, anchor.bodyPath);
    return { system: sysName, detail: targetName(b, tr) ?? anchor.bodyPath,
             orphan: !b };
  }
  return { system: sysName, detail: null, orphan: false };
}

/**
 * Ellipse geometry for an anchor's orbit, in the frame it is drawn in.
 *
 * Mirrors how the canon rings are built in buildSystemGroup: the focus sits at
 * the centre of the thing being orbited, so the ellipse is offset along its
 * major axis by a*e (Kepler I), and the semi-minor axis is a*sqrt(1-e^2)
 * before the viewing-plane squash.
 *
 * `rotate` is the bearing the orbit was placed on plus any argp offset, in
 * degrees, matching what resolveAnchor applies to the position itself — so
 * the drawn ring is the path the vessel actually travels rather than an
 * idealised one.
 *
 * Returns null for an anchor that cannot be drawn.
 */
export function anchorEllipse(anchor, K, TILT) {
  if (!anchor || !anchor.system) return null;
  if (anchor.mode !== 'star' && anchor.mode !== 'body') return null;

  const a   = (anchor.orbit || (anchor.mode === 'star' ? 20 : 6)) * K;
  const ecc = anchor.ecc ?? 0.28;
  return {
    rx: a,
    /* UNSQUASHED. resolveAnchor rotates the orbit in its own plane and only
       then applies TILT, so the ring must be drawn the same way round:
       `transform` below rotates first and squashes second. Baking TILT into
       ry here and rotating the result would SHEAR the ellipse rather than
       turn it, which put the vessel up to 15 world units off its own ring. */
    ry: a * Math.sqrt(1 - ecc * ecc),
    /* Shift the ellipse so its FOCUS — the star, or the body being orbited —
       sits at the origin of the frame the ring is drawn in (Kepler I).
       Negative because resolveAnchor puts periapsis at +x, unlike tick()
       which flips px. */
    cx: -a * ecc,
    /* Ready-made SVG transform, so callers cannot get the order wrong. Read
       right to left: rotate within the orbital plane, then squash to the
       viewing plane. */
    transform: `scale(1 ${TILT}) rotate(${((anchor.phase || 0) + (anchor.argp || 0)).toFixed(2)})`,
    rotate: (anchor.phase || 0) + (anchor.argp || 0)
  };
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
