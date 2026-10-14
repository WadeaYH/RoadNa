import * as THREE from './three.js';
import { C, roundedRectShape, arcRectShape } from './kit.js';
import { RING, ROAD, STREETS } from './layout.js';

// A small directed lane graph: right-hand traffic, smooth turns, adaptive signals.
const NODES = {
  C: [0, 0, 'cross'], E: [25, 0, 'tee'], W: [-25, 0, 'tee'], N: [0, -17, 'tee'], S: [0, 17, 'tee'],
  NE: [25, -17, 'corner'], SE: [25, 17, 'corner'], SW: [-25, 17, 'corner'], NW: [-25, -17, 'corner'],
};
const LINKS = [['C', 'E'], ['C', 'W'], ['C', 'N'], ['C', 'S'], ['E', 'NE'], ['NE', 'N'], ['N', 'NW'], ['NW', 'W'], ['W', 'SW'], ['SW', 'S'], ['S', 'SE'], ['SE', 'E']];
export const STOP_TRIM = 2.9;

function bezier(p0, p1, p2, p3, t, out) {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  out.x = a * p0.x + b * p1.x + c * p2.x + d * p3.x;
  out.z = a * p0.z + b * p1.z + c * p2.z + d * p3.z;
  const da = -3 * u * u, db = 3 * u * u - 6 * u * t, dc = 6 * u * t - 3 * t * t, dd = 3 * t * t;
  out.h = Math.atan2(-(da * p0.z + db * p1.z + dc * p2.z + dd * p3.z), da * p0.x + db * p1.x + dc * p2.x + dd * p3.x);
  return out;
}

class Lane {
  constructor(A, B) {
    this.kind = 'lane'; this.from = A; this.to = B; this.id = A.id + '>' + B.id;
    const dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz);
    this.ux = dx / len; this.uz = dz / len; this.rx = -this.uz; this.rz = this.ux;
    const tA = A.kind === 'corner' ? RING.radius : STOP_TRIM, tB = B.kind === 'corner' ? RING.radius : STOP_TRIM;
    this.ax = A.x + this.ux * tA + this.rx * ROAD.lane; this.az = A.z + this.uz * tA + this.rz * ROAD.lane;
    this.bx = B.x - this.ux * tB + this.rx * ROAD.lane; this.bz = B.z - this.uz * tB + this.rz * ROAD.lane;
    this.length = len - tA - tB;
    this.heading = Math.atan2(-this.uz, this.ux);
    this.axis = Math.abs(this.ux) > 0.5 ? 'x' : 'z';
    const key = [A.id, B.id].join('-'), rev = [B.id, A.id].join('-');
    this.street = STREETS[key] || STREETS[rev] || 'Ring Road';
    this.reserved = false; this.next = [];
  }
  sample(s, out) { out.x = this.ax + this.ux * s; out.z = this.az + this.uz * s; out.h = this.heading; return out; }
  // Position along this lane closest to a point.
  project(x, z) { return THREE.MathUtils.clamp((x - this.ax) * this.ux + (z - this.az) * this.uz, 0, this.length); }
  lateral(x, z) { return (x - this.ax) * this.rx + (z - this.az) * this.rz; }
}

class Turn {
  constructor(a, b) {
    this.kind = 'turn'; this.inLane = a; this.outLane = b; this.id = a.id + '|' + b.id; this.node = a.to;
    const p0 = { x: a.bx, z: a.bz }, p3 = { x: b.ax, z: b.az };
    const dot = a.ux * b.ux + a.uz * b.uz, cross = a.ux * b.uz - a.uz * b.ux;
    this.type = dot > 0.95 ? 'straight' : cross > 0 ? 'right' : 'left';
    const gap = Math.hypot(p3.x - p0.x, p3.z - p0.z);
    const h = this.type === 'straight' ? gap / 3 : 0.5523 * (gap / Math.SQRT2);
    this.p = [p0, { x: p0.x + a.ux * h, z: p0.z + a.uz * h }, { x: p3.x - b.ux * h, z: p3.z - b.uz * h }, p3];
    // Arc-length table so cars move at an even speed through the curve.
    const N = 24, tmp = { x: 0, z: 0, h: 0 };
    this.lut = [0]; let px = p0.x, pz = p0.z, total = 0;
    for (let i = 1; i <= N; i++) { bezier(...this.p, i / N, tmp); total += Math.hypot(tmp.x - px, tmp.z - pz); px = tmp.x; pz = tmp.z; this.lut.push(total); }
    this.length = total;
  }
  sample(s, out) {
    const L = this.lut, N = L.length - 1;
    s = THREE.MathUtils.clamp(s, 0, this.length);
    let i = 1; while (i < N && L[i] < s) i++;
    const t = (i - 1 + (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1])) / N;
    return bezier(...this.p, t, out);
  }
}

class Signal {
  constructor(node, offset) { this.node = node; this.approaches = node.inLanes; this.current = offset % this.approaches.length; this.phase = 'green'; this.timer = offset * 1.3; this.heads = []; }
  state(lane) { return lane === this.approaches[this.current] ? this.phase : 'red'; }
  update(dt, demand) {
    this.timer += dt;
    const cur = this.approaches[this.current];
    if (this.phase === 'green') {
      const waiting = this.approaches.some((l) => l !== cur && demand(l));
      if (waiting && (this.timer > 6 || (this.timer > 2.2 && !demand(cur)))) { this.phase = 'amber'; this.timer = 0; }
    } else if (this.phase === 'amber' && this.timer > 1.1) { this.phase = 'clear'; this.timer = 0; }
    else if (this.phase === 'clear' && this.timer > 0.8) {
      const n = this.approaches.length;
      for (let k = 1; k <= n; k++) { const i = (this.current + k) % n; if (demand(this.approaches[i]) || k === n) { this.current = i; break; } }
      this.phase = 'green'; this.timer = 0;
    }
  }
}

export function createNetwork() {
  const nodes = new Map();
  for (const [id, [x, z, kind]] of Object.entries(NODES)) nodes.set(id, { id, x, z, kind, inLanes: [], outLanes: [], signal: null });
  const lanes = [];
  for (const [a, b] of LINKS) for (const [p, q] of [[a, b], [b, a]]) {
    const lane = new Lane(nodes.get(p), nodes.get(q));
    lanes.push(lane); lane.from.outLanes.push(lane); lane.to.inLanes.push(lane);
  }
  const turns = new Map();
  for (const lane of lanes) lane.next = lane.to.outLanes.filter((o) => o.to !== lane.from);
  const turn = (a, b) => { const key = a.id + '|' + b.id; let t = turns.get(key); if (!t) { t = new Turn(a, b); turns.set(key, t); } return t; };
  for (const lane of lanes) for (const n of lane.next) turn(lane, n);
  let offset = 0;
  const signals = [];
  for (const node of nodes.values()) if (node.kind !== 'corner') { node.signal = new Signal(node, offset++); signals.push(node.signal); }
  const byId = new Map(lanes.map((l) => [l.id, l]));

  // Breadth-first route over lanes (used by crew vans).
  function route(fromLane, toLane, fromS = 0, toS = 0) {
    if (fromLane === toLane && toS >= fromS) return [fromLane];
    const prev = new Map(), seen = new Set([fromLane]), queue = [fromLane];
    while (queue.length) {
      const lane = queue.shift();
      for (const n of lane.next) {
        if (n === toLane) { const path = [n]; let p = lane; while (p) { path.unshift(p); p = prev.get(p) ?? null; } return path; }
        if (seen.has(n) || n.reserved) continue;
        seen.add(n); prev.set(n, lane); queue.push(n);
      }
    }
    return null;
  }
  // Nearest lane position to a world point (lanes only; ignores turns).
  function nearest(x, z, filter = () => true) {
    let best = null, bestD = Infinity;
    for (const lane of lanes) {
      if (!filter(lane)) continue;
      const s = lane.project(x, z), px = lane.ax + lane.ux * s, pz = lane.az + lane.uz * s, d = Math.hypot(px - x, pz - z);
      if (d < bestD) { bestD = d; best = { lane, s, d }; }
    }
    return best;
  }
  return { nodes, lanes, turns, signals, byId, turn, route, nearest };
}

// --------------------------------------------------------------------------------------
// Road surfaces, kerbs, markings and signal heads.
export function buildRoads(b, net) {
  const H = ROAD.half, W = ROAD.walk, R = RING.radius;
  // Asphalt and the outer pavement ring.
  b.slab(arcRectShape(RING.hx + H, RING.hz + H, R + H), 0.06, C.road, 0, { curve: 12 });
  const outer = arcRectShape(RING.hx + H + W, RING.hz + H + W, R + H + W);
  outer.holes.push(arcRectShape(RING.hx + H, RING.hz + H, R + H));
  b.slab(outer, 0.2, C.sidewalk, 0, { curve: 12 });
  const kerb = arcRectShape(RING.hx + H + 0.16, RING.hz + H + 0.16, R + H + 0.16);
  kerb.holes.push(arcRectShape(RING.hx + H, RING.hz + H, R + H));
  b.slab(kerb, 0.212, C.curb, 0, { curve: 12 });
  // Inner blocks: pavement slabs with kerbs. Their lots are dressed by the world builder.
  const blocks = [
    [-RING.hx + H, -RING.hz + H, -H, -H, [R - H, 0.9, 0.9, 0.9]],
    [H, -RING.hz + H, RING.hx - H, -H, [0.9, R - H, 0.9, 0.9]],
    [H, H, RING.hx - H, RING.hz - H, [0.9, 0.9, R - H, 0.9]],
    [-RING.hx + H, H, -H, RING.hz - H, [0.9, 0.9, 0.9, R - H]],
  ];
  for (const [x0, z0, x1, z1, radii] of blocks) {
    const ring = roundedRectShape(x0, z0, x1, z1, radii);
    b.slab(ring, 0.212, C.curb, 0);
    b.slab(roundedRectShape(x0 + 0.16, z0 + 0.16, x1 - 0.16, z1 - 0.16, radii.map((r) => Math.max(0.6, r - 0.16))), 0.22, C.sidewalk, 0);
  }
  // Centre dashes along straight sections and the curved ring corners.
  const dash = (x, z, h) => b.box(0.75, 0.012, 0.1, C.roadLine, x, 0.06, z, { ry: h });
  for (const [a, c] of LINKS) {
    const A = net.nodes.get(a), B = net.nodes.get(c), dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len, h = Math.atan2(-uz, ux);
    const t0 = A.kind === 'corner' ? R : 3.4, t1 = B.kind === 'corner' ? R : 3.4;
    for (let s = t0 + 0.6; s < len - t1 - 0.4; s += 1.7) dash(A.x + ux * s, A.z + uz * s, h);
  }
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const cx = sx * (RING.hx - R), cz = sz * (RING.hz - R);
    for (let k = 1; k < 5; k++) {
      const a = (k / 5) * Math.PI / 2, x = cx + sx * Math.sin(a) * R, z = cz + sz * Math.cos(a) * R;
      const tx = sx * Math.cos(a), tz = -sz * Math.sin(a);
      dash(x, z, Math.atan2(-tz, tx));
    }
  }
  // Zebra crossings and stop lines at signalised junctions.
  for (const node of net.nodes.values()) {
    if (node.kind === 'corner') continue;
    for (const lane of node.outLanes) {
      const ux = lane.ux, uz = lane.uz, rx = lane.rx, rz = lane.rz, h = lane.heading;
      for (let k = -2.5; k <= 2.5; k++) {
        const off = k * 0.56, d = 2.25;
        b.box(0.72, 0.012, 0.3, C.roadLine, node.x + ux * d + rx * off, 0.06, node.z + uz * d + rz * off, { ry: h });
      }
    }
    for (const lane of node.inLanes) b.box(0.12, 0.012, 1.45, C.roadLine, lane.bx + lane.ux * 0.05, 0.06, lane.bz + lane.uz * 0.05, { ry: lane.heading });
  }
  // Signal poles and housings; lamps are instanced so they can change colour cheaply.
  const heads = [];
  for (const signal of net.signals) {
    for (const lane of signal.approaches) {
      const px = lane.bx + lane.rx * 1.5 + lane.ux * 0.2, pz = lane.bz + lane.rz * 1.5 + lane.uz * 0.2;
      b.cyl(0.05, 2.15, C.metalDark, px, 0.2, pz, { seg: 8 });
      b.cyl(0.12, 0.08, C.metalDark, px, 0.2, pz, { seg: 8 });
      // Housing faces oncoming traffic (towards -u).
      const fx = -lane.ux, fz = -lane.uz;
      b.box(0.24, 0.66, 0.2, C.metalDark, px + fx * 0.04, 1.75, pz + fz * 0.04, { ry: lane.heading, r: 0.05 });
      b.box(0.28, 0.035, 0.28, C.metalDark, px + fx * 0.04, 2.42, pz + fz * 0.04, { ry: lane.heading });
      const head = { signal, lane, lamps: [] };
      for (let i = 0; i < 3; i++) head.lamps.push({ x: px + fx * 0.15, y: 2.22 - i * 0.2, z: pz + fz * 0.15 });
      heads.push(head);
      signal.heads.push(head);
    }
  }
  // Manhole covers give the asphalt a little texture.
  for (const [x, z] of [[-14, 0.5], [8, -0.6], [-0.5, 9], [0.6, -10], [-25.6, 6], [12, 17.4], [25.5, -8], [-6, -17.5]]) b.cyl(0.32, 0.012, '#2a3338', x, 0.06, z, { seg: 14 });
  return heads;
}

const LAMP_ON = { red: new THREE.Color('#ff4b3e'), amber: new THREE.Color('#ffb53b'), green: new THREE.Color('#37e08e') };
const LAMP_OFF = [new THREE.Color('#4a2c29'), new THREE.Color('#4a4128'), new THREE.Color('#203a2c')];

export function createSignalLamps(heads) {
  const count = heads.length * 3;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count);
  const m = new THREE.Matrix4();
  heads.forEach((head, h) => head.lamps.forEach((l, i) => { m.makeTranslation(l.x, l.y, l.z); mesh.setMatrixAt(h * 3 + i, m); mesh.setColorAt(h * 3 + i, LAMP_OFF[i]); }));
  mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  function update() {
    heads.forEach((head, h) => {
      const st = head.signal.state(head.lane);
      mesh.setColorAt(h * 3, st === 'red' || st === 'clear' ? LAMP_ON.red : LAMP_OFF[0]);
      mesh.setColorAt(h * 3 + 1, st === 'amber' ? LAMP_ON.amber : LAMP_OFF[1]);
      mesh.setColorAt(h * 3 + 2, st === 'green' ? LAMP_ON.green : LAMP_OFF[2]);
    });
    mesh.instanceColor.needsUpdate = true;
  }
  update();
  return { mesh, update };
}
