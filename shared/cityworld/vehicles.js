import * as THREE from './three.js';
import { Builder, C, rng, clamp } from './kit.js';

// Low-poly vehicles drawn with a few instanced meshes per model, and a light traffic model:
// car following, adaptive signals, hesitation at potholes and routed municipal crew vans.

const MODELS = {
  compact: { len: 1.45, wid: 0.72 },
  sedan: { len: 1.66, wid: 0.74 },
  taxi: { len: 1.62, wid: 0.74 },
  suv: { len: 1.62, wid: 0.8 },
  van: { len: 1.8, wid: 0.8 },
  bus: { len: 3.1, wid: 0.9 },
  patch: { len: 2.1, wid: 0.84 },
  bucket: { len: 2.15, wid: 0.84 },
  compactor: { len: 2.2, wid: 0.88 },
  jetter: { len: 2.1, wid: 0.84 },
};
const TRUCKS = ['patch', 'bucket', 'compactor', 'jetter'];

// Municipal trucks share a cab and chassis; the rear body tells you what each crew can fix.
function buildTruck(b, name) {
  const m = MODELS[name], L = m.len, W = m.wid, glass = '#28414a';
  const P = { kind: 'paint' }, T = { kind: 'trim' };
  for (const x of [L * 0.33, -L * 0.28]) for (const z of [W / 2 - 0.03, -W / 2 + 0.16]) wheel(b, x, z, 0.17);
  b.box(L - 0.08, 0.12, W - 0.12, '#3a4448', -0.04, 0.16, 0, T);
  const cx = L / 2 - 0.3;
  b.box(0.6, 0.6, W, '#ffffff', cx, 0.17, 0, { ...P, r: 0.1 });
  b.box(0.05, 0.24, W - 0.14, glass, cx + 0.29, 0.5, 0, T);
  b.box(0.3, 0.22, W + 0.01, glass, cx + 0.06, 0.5, 0, { ...T, r: 0.03 });
  b.box(0.44, 0.07, 0.42, '#3a3a3a', cx, 0.77, 0, { ...T, r: 0.03 });
  b.box(0.14, 0.06, 0.16, '#fff', cx, 0.78, 0.12, { kind: 'beacon' }); b.box(0.14, 0.06, 0.16, '#fff', cx, 0.78, -0.12, { kind: 'beacon' });
  b.box(0.34, 0.16, 0.012, C.teal, cx - 0.02, 0.36, W / 2 + 0.002, T); b.box(0.34, 0.16, 0.012, C.teal, cx - 0.02, 0.36, -W / 2 - 0.002, T);
  const rx = -0.32, rl = L - 0.72;
  if (name === 'patch') {
    // Hot-box asphalt bed with an orange hopper and a hand roller on the back.
    b.box(rl, 0.42, W - 0.04, '#4a5357', rx, 0.28, 0, { ...T, r: 0.05 });
    b.box(rl * 0.6, 0.22, W - 0.16, C.orange, rx + 0.12, 0.7, 0, { ...T, r: 0.04 });
    b.box(rl + 0.02, 0.07, W, C.orange, rx, 0.5, 0, T);
    b.cyl(0.11, W - 0.2, '#2b3438', -L / 2 + 0.08, 0.2, -(W - 0.2) / 2, { rx: Math.PI / 2, seg: 10, kind: 'trim' });
  } else if (name === 'bucket') {
    // Flatbed, turret and a raised boom with a white bucket.
    b.box(rl, 0.1, W - 0.02, '#e9ecea', rx, 0.28, 0, T);
    b.cyl(0.16, 0.22, '#3a4448', rx + 0.3, 0.38, 0, { seg: 10, kind: 'trim' });
    b.box(1.25, 0.11, 0.13, '#ffffff', rx - 0.05, 0.6, 0, { ...P, rz: 0.55 });
    b.box(1.0, 0.09, 0.11, '#ffffff', rx - 0.45, 0.95, 0, { ...P, rz: -0.35 });
    b.box(0.3, 0.26, 0.3, C.white, rx - 0.95, 0.93, 0, { ...T, r: 0.04 });
  } else if (name === 'compactor') {
    // Rounded refuse body with a darker rear hopper.
    b.box(rl, 0.74, W, '#ffffff', rx + 0.04, 0.26, 0, { ...P, r: 0.14 });
    b.box(0.3, 0.6, W - 0.04, '#2f5f48', -L / 2 + 0.12, 0.22, 0, { ...T, r: 0.06 });
    for (const y of [0.45, 0.7]) b.box(rl - 0.1, 0.04, W + 0.012, '#e9ecea', rx + 0.04, y, 0, T);
  } else if (name === 'jetter') {
    // Water tank with a hose reel: vacuum and jetting for blocked drains.
    b.cyl(0.33, rl, '#ffffff', rx + rl / 2, 0.62, 0, { rz: Math.PI / 2, seg: 16, kind: 'paint' });
    b.cyl(0.34, 0.05, '#3a4448', rx + rl / 2, 0.62, 0, { rz: Math.PI / 2, seg: 16, kind: 'trim' });
    b.torus(0.18, 0.05, '#2b3438', rx - rl / 2 + 0.2, 0.62, W / 2 - 0.02, { seg: 16, kind: 'trim' });
    b.box(rl, 0.1, W - 0.1, '#3a4448', rx, 0.27, 0, T);
  }
  return b;
}
export const ROAD_Y = 0.06;

function wheel(b, x, z, r = 0.15) {
  b.cyl(r, 0.11, '#273236', x, r, z - 0.055, { rx: Math.PI / 2, seg: 12, kind: 'trim' });
  b.cyl(r * 0.5, 0.115, '#c9d2cf', x, r, z - 0.0575, { rx: Math.PI / 2, seg: 8, kind: 'trim' });
}

function buildModel(name) {
  const b = new Builder(), glass = '#28414a', bumper = '#d9dedb';
  const P = { kind: 'paint' }, T = { kind: 'trim' };
  if (name === 'bus') {
    for (const x of [-1.0, 1.0]) for (const z of [0.47, -0.36]) wheel(b, x, z, 0.18);
    b.box(3.1, 0.82, 0.9, '#ffffff', 0, 0.14, 0, { ...P, r: 0.12 });
    b.box(3.12, 0.3, 0.92, glass, 0, 0.6, 0, { ...T, r: 0.08 });
    b.box(0.04, 0.42, 0.7, glass, 1.56, 0.5, 0, T);
    b.box(3.0, 0.07, 0.86, '#f2f2ee', 0, 0.96, 0, { ...T, r: 0.03 });
    b.box(0.5, 0.2, 0.5, '#e8ebe8', -0.8, 1.02, 0, { ...T, r: 0.04 });
    b.box(0.5, 0.52, 0.03, '#2a3a40', 0.85, 0.2, 0.455, T);
    b.box(3.05, 0.08, 0.93, C.orange, 0, 0.45, 0, T);
    for (const z of [-0.3, 0.3]) { b.box(0.03, 0.08, 0.14, '#fff', 1.556, 0.3, z, { kind: 'head' }); b.box(0.03, 0.1, 0.12, '#fff', -1.556, 0.32, z, { kind: 'tail' }); }
    return b;
  }
  const m = MODELS[name], L = m.len, W = m.wid;
  const r = name === 'suv' ? 0.17 : 0.15;
  if (TRUCKS.includes(name)) buildTruck(b, name);
  else for (const x of [L * 0.32, -L * 0.32]) for (const z of [W / 2 - 0.04, -W / 2 + 0.15]) wheel(b, x, z, r);
  if (TRUCKS.includes(name)) { /* body built above */ }
  else if (name === 'van') {
    b.box(L, 0.66, W, '#ffffff', -0.05, 0.13, 0, { ...P, r: 0.1 });
    b.box(0.5, 0.38, W, '#ffffff', L / 2 - 0.25, 0.13, 0, { ...P, r: 0.12 });
    b.box(0.05, 0.26, W - 0.12, glass, L / 2 - 0.29, 0.5, 0, T);
    b.box(0.34, 0.24, W + 0.01, glass, L / 2 - 0.45, 0.5, 0, { ...T, r: 0.03 });
    b.box(L - 0.1, 0.09, W + 0.012, C.orange, -0.05, 0.38, 0, T);
    b.box(0.36, 0.2, 0.012, C.teal, -0.3, 0.52, W / 2 + 0.002, T);
    b.box(0.36, 0.2, 0.012, C.teal, -0.3, 0.52, -W / 2 - 0.002, T);
    b.box(L * 0.7, 0.04, 0.05, '#9aa5a8', -0.2, 0.8, 0.25, T); b.box(L * 0.7, 0.04, 0.05, '#9aa5a8', -0.2, 0.8, -0.25, T);
    b.box(0.42, 0.08, 0.5, '#3a3a3a', 0.35, 0.79, 0, { ...T, r: 0.03 });
    b.box(0.16, 0.07, 0.18, '#fff', 0.35, 0.8, 0.13, { kind: 'beacon' }); b.box(0.16, 0.07, 0.18, '#fff', 0.35, 0.8, -0.13, { kind: 'beacon' });
  } else {
    const bodyH = name === 'suv' ? 0.36 : 0.3, cabH = name === 'suv' ? 0.3 : 0.27, cabL = name === 'compact' ? 0.82 : name === 'suv' ? 1.0 : 0.9;
    const cabX = name === 'compact' ? -0.06 : -0.1;
    b.box(L, bodyH, W, '#ffffff', 0, 0.12, 0, { ...P, r: 0.11 });
    b.box(cabL, cabH, W - 0.08, '#ffffff', cabX, 0.12 + bodyH - 0.02, 0, { ...P, r: 0.1 });
    b.box(cabL + 0.03, cabH * 0.62, W - 0.06, glass, cabX, 0.12 + bodyH + 0.015, 0, { ...T, r: 0.05 });
    if (name === 'taxi') { b.box(0.3, 0.12, 0.22, '#fff8d8', cabX, 0.12 + bodyH + cabH - 0.03, 0, { ...T, r: 0.03 }); for (let i = 0; i < 4; i++) b.box(0.4, 0.04, 0.012, i % 2 ? '#222' : '#fff', 0.05, 0.2 + bodyH * 0.55, (W / 2 + 0.002) * (i < 2 ? 1 : -1), T); }
  }
  const fx = L / 2;
  b.box(0.06, 0.1, W - 0.06, bumper, fx - 0.02, 0.12, 0, { ...T, r: 0.03 });
  b.box(0.06, 0.1, W - 0.06, bumper, -fx + 0.02, 0.12, 0, { ...T, r: 0.03 });
  for (const z of [W / 2 - 0.13, -W / 2 + 0.13]) {
    b.box(0.04, 0.07, 0.13, '#fff', fx + 0.005, 0.27, z, { kind: 'head' });
    b.box(0.04, 0.07, 0.12, '#fff', -fx - 0.005, 0.28, z, { kind: 'tail' });
    const truck = TRUCKS.includes(name);
    b.box(0.06, 0.05, 0.06, '#2b3438', truck ? L / 2 - 0.1 : L * 0.12, name === 'van' ? 0.52 : truck ? 0.56 : 0.45, z > 0 ? W / 2 + 0.03 : -W / 2 - 0.03, T);
  }
  return b;
}

const PAINT = { compact: ['#fafaf6', '#c94f45', '#7fa7b5', '#d9d3c4', '#9bbcae'], sedan: ['#e6e8e3', '#46525a', '#b9c3c8', '#5f7f99'], suv: ['#3f4c55', '#e9e3d6', '#7d8f74'], taxi: ['#f2c443'], van: ['#ffffff'], bus: ['#2f8e88'], patch: ['#f4f1ea'], bucket: ['#f2c443'], compactor: ['#3f8a62'], jetter: ['#4f78a8'] };
const MIX = ['compact', 'compact', 'sedan', 'taxi', 'compact', 'suv', 'sedan', 'taxi', 'compact', 'bus', 'sedan', 'compact', 'suv', 'taxi', 'compact', 'sedan', 'compact', 'suv', 'taxi', 'sedan'];

export function createTraffic(world, opts = {}) {
  const { net } = world;
  const R = rng(opts.seed ?? 42);
  const group = new THREE.Group(); group.name = 'traffic';
  world.root.add(group);
  const paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.25, envMapIntensity: 1.1 });
  const trim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
  const lightMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const capacity = { compact: 12, sedan: 8, taxi: 6, suv: 5, van: 4, bus: 2, patch: 4, bucket: 3, compactor: 3, jetter: 3 };
  const pools = {};
  for (const name of Object.keys(capacity)) {
    const b = buildModel(name), meshes = {};
    for (const kind of ['paint', 'trim', 'head', 'tail', 'beacon']) {
      const { geometry, kinds } = b.toGeometry([kind]);
      if (!kinds.length) { geometry.dispose(); continue; }
      geometry.clearGroups();
      const mat = kind === 'paint' ? paint : kind === 'trim' ? trim : lightMat;
      const mesh = new THREE.InstancedMesh(geometry, mat, capacity[name]);
      mesh.count = 0; mesh.castShadow = kind === 'paint' || kind === 'trim'; mesh.receiveShadow = kind === 'paint';
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const white = new THREE.Color(1, 1, 1);
      for (let i = 0; i < capacity[name]; i++) mesh.setColorAt(i, white);
      group.add(mesh); meshes[kind] = mesh;
    }
    pools[name] = { meshes, used: 0, cars: [] };
  }

  const cars = [];
  let nextId = 1;
  const tmp = { x: 0, z: 0, h: 0 };
  const hazards = new Map();

  function reset(car, o = {}) {
    Object.assign(car, {
      x: 0, y: ROAD_Y, z: 0, h: 0, pitch: 0, roll: 0, scale: o.scale ?? 1, targetScale: 1,
      piece: null, s: 0, v: 0, v0: o.speed ?? R.range(3.1, 4.0), next: null, turn: null, path: [],
      mode: o.mode ?? 'traffic', brake: false, lateral: 0, holdLateral: 0, bounce: 0, accel: 0, beacon: false,
      hesitate: 0, patience: R.range(1.1, 2.3), stuck: 0, honk: 0, waitSignal: false, queued: false,
      route: null, routeIdx: 0, target: null, onArrive: null, maneuver: null, hidden: false,
    });
    car.cleared = new Set();
    if (o.color) { car.color.set(o.color); paintCar(car); }
    return car;
  }
  function paintCar(car) { const m = pools[car.type].meshes.paint; if (m) { m.setColorAt(car.slot, car.color); m.instanceColor.needsUpdate = true; } }

  function create(type, o = {}) {
    const pool = pools[type];
    if (pool.used >= capacity[type]) return null;
    const car = { id: nextId++, type, slot: pool.used++, len: MODELS[type].len, color: new THREE.Color(o.color ?? R.pick(PAINT[type])) };
    reset(car, { ...o, color: null });
    pool.cars.push(car); cars.push(car);
    for (const mesh of Object.values(pool.meshes)) mesh.count = pool.used;
    paintCar(car);
    return car;
  }

  function choose(lane) {
    let options = lane.next.filter((n) => !n.reserved);
    if (!options.length) options = lane.next;
    const weights = options.map((n) => { const t = net.turn(lane, n).type; return t === 'straight' ? 1.6 : t === 'right' ? 1 : 0.8; });
    let pick = R() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < options.length; i++) { pick -= weights[i]; if (pick <= 0) return options[i]; }
    return options[0];
  }

  function planFrom(car) {
    const piece = car.piece;
    if (piece.kind === 'lane') {
      if (car.route) car.next = car.route[car.routeIdx + 1] || null;
      else car.next = choose(piece);
      car.turn = car.next ? net.turn(piece, car.next) : null;
      car.path = car.turn ? [piece, car.turn, car.next] : [piece];
    } else if (piece.kind === 'turn') car.path = [piece, piece.outLane];
  }

  function place(car, lane, s) { car.piece = lane; car.s = s; car.y = ROAD_Y; car.cleared.clear(); car.route = null; planFrom(car); pose(car, 0); }

  function spawnTraffic(count, filter = () => true) {
    const lanes = net.lanes.filter((l) => !l.reserved && filter(l));
    let made = 0, tries = 0;
    while (made < count && tries++ < 500) {
      const lane = R.pick(lanes), s = R.range(1.5, Math.max(1.6, lane.length - 2));
      if (cars.some((c) => !c.hidden && c.piece === lane && Math.abs(c.s - s) < 3.4)) continue;
      let car = cars.find((c) => c.mode === 'retired');
      if (car) reset(car); else car = create(MIX[(cars.length + made) % MIX.length]) || create('compact') || create('sedan');
      if (!car) break;
      if (car.type === 'bus') car.v0 = 2.7;
      place(car, lane, s); car.v = car.v0 * 0.6; car.scale = 0.01; made++;
    }
    return made;
  }

  const byPiece = new Map();
  function index() {
    byPiece.clear();
    for (const c of cars) {
      if (c.hidden || !c.piece || c.maneuver || c.mode === 'retired') continue;
      if (c.mode === 'hold' && Math.abs(c.lateral) > 0.45) continue; // pulled over at the kerb
      let l = byPiece.get(c.piece); if (!l) byPiece.set(c.piece, (l = [])); l.push(c);
    }
  }
  function demand(lane) { const l = byPiece.get(lane); return !!l && l.some((c) => c.s > lane.length - 9); }

  function plan(car, dt) {
    const look = 12;
    let gap = look, cap = car.v0, lateral = 0, bounce = 0, base = -car.s, leader = null;
    car.waitSignal = false;
    for (let i = 0; i < car.path.length && base < look; i++) {
      const piece = car.path[i], list = byPiece.get(piece);
      if (list) for (const o of list) {
        if (o === car || (i === 0 && o.s <= car.s)) continue;
        const d = base + o.s - (car.len + o.len) / 2 - 0.35;
        if (d < gap) { gap = d; leader = o; }
      }
      if (piece.kind === 'lane') {
        if (i === 0 && piece.to.signal) {
          const st = piece.to.signal.state(piece), toStop = piece.length - car.s - car.len / 2 - 0.1;
          const nextBusy = car.next && (byPiece.get(car.next) || []).some((o) => o.s < 2.6 && o.v < 0.6);
          const mustStop = (st !== 'green' && !(st === 'amber' && toStop < (car.v * car.v) / 12 + 0.2)) || nextBusy;
          if (mustStop && toStop > -0.2 && toStop < gap) { gap = Math.max(0, toStop); leader = null; car.waitSignal = true; }
        }
        const hz = hazards.get(piece);
        if (hz) for (const h of hz) {
          const rel = base + h.s; // hazard distance from the car centre along the path
          if (rel < -2.5 || rel > look) continue;
          if (h.type === 'pothole') {
            if (!car.cleared.has(h)) {
              const stopAt = rel - car.len / 2 - 0.55;
              if (stopAt > -0.3) {
                if (stopAt < gap) { gap = Math.max(0, stopAt); leader = null; }
                if (car.v < 0.15 && stopAt < 0.4) { car.hesitate += dt; if (car.hesitate > car.patience * (h.severity ?? 1)) { car.cleared.add(h); car.hesitate = 0; } }
              } else car.cleared.add(h);
            }
            if (Math.abs(rel) < 4.5) cap = Math.min(cap, (0.5 + Math.abs(rel) * 0.38) / (h.severity ?? 1));
            if (Math.abs(rel) < 1.8) { const k = 1 - Math.abs(rel) / 1.8; lateral = Math.min(lateral, -0.32 * k * k * (3 - 2 * k)); if (Math.abs(rel) < 0.55) bounce = Math.sin((rel + 0.55) * Math.PI * 1.8) * 0.035; }
          } else if (h.type === 'works') {
            if (Math.abs(rel) < 3.4) { cap = Math.min(cap, 1.1); const k = clamp(1 - (Math.abs(rel) - 1.2) / 2.2, 0, 1); lateral = Math.min(lateral, -0.4 * k); }
          } else if (h.type === 'puddle') {
            if (Math.abs(rel) < 2.5) cap = Math.min(cap, 1.9);
          }
        }
      }
      base += piece.length;
    }
    if (car.target && car.piece === car.target.lane && car.routeIdx >= car.route.length - 1) {
      const d = car.target.s - car.s;
      if (d > -0.1 && d < gap) { gap = Math.max(0, d); leader = null; }
      if (d < 2.5) cap = Math.min(cap, 0.6 + Math.max(0, d) * 0.9);
    }
    car.queued = car.waitSignal || (leader && leader.queued && gap < 1.2);
    const safe = Math.sqrt(2 * 7 * Math.max(0, gap - 0.05));
    return { vt: Math.min(cap, safe), lateral, bounce };
  }

  function advance(car, ds) {
    car.s += ds;
    let guard = 0;
    while (car.s > car.piece.length && guard++ < 4) {
      if (car.piece.kind === 'lane') {
        if (!car.turn) { car.s = car.piece.length; car.v = 0; break; }
        car.s -= car.piece.length;
        car.piece = car.turn; car.path = [car.turn, car.turn.outLane];
      } else {
        car.s -= car.piece.length;
        const lane = car.piece.outLane;
        if (car.route && car.route[car.routeIdx + 1] === lane) car.routeIdx++;
        car.piece = lane; car.cleared.clear(); planFrom(car);
      }
    }
  }

  function pose(car, dt) {
    car.piece.sample(Math.min(car.s, car.piece.length), tmp);
    const prevH = car.h, sh = Math.sin(tmp.h), ch = Math.cos(tmp.h);
    car.x = tmp.x + sh * car.lateral; car.z = tmp.z + ch * car.lateral;
    car.h = tmp.h;
    if (dt > 0) {
      let dh = car.h - prevH; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
      car.roll += (clamp((dh / dt) * car.v * 0.025, -0.07, 0.07) - car.roll) * Math.min(1, dt * 6);
      car.pitch += (clamp(car.accel * 0.007, -0.05, 0.03) - car.pitch) * Math.min(1, dt * 7);
    }
  }

  function updateCar(car, dt) {
    if (car.hidden || car.mode === 'parked' || car.mode === 'scripted' || car.mode === 'retired') return;
    if (car.maneuver) { stepManeuver(car, dt); return; }
    if (car.mode === 'hold') {
      car.v = 0; car.accel = 0; car.brake = true; car.bounce = 0;
      car.lateral += (car.holdLateral - car.lateral) * Math.min(1, dt * 2.5);
      pose(car, dt); return;
    }
    const { vt, lateral, bounce } = plan(car, dt);
    const prev = car.v;
    if (vt > car.v) car.v = Math.min(vt, car.v + 2.6 * dt);
    else car.v = Math.max(vt, car.v - 14 * dt);
    car.accel = dt > 0 ? (car.v - prev) / dt : 0;
    car.brake = car.accel < -0.6 || (car.v < 0.25 && vt < 0.3);
    car.lateral += (lateral - car.lateral) * Math.min(1, dt * 5);
    car.bounce = bounce;
    if (car.v < 0.25 && !car.queued && car.mode === 'traffic') car.stuck += dt; else car.stuck = Math.max(0, car.stuck - dt * 2);
    car.honk = Math.max(0, car.honk - dt);
    advance(car, car.v * dt);
    pose(car, dt);
    if (car.target && car.piece === car.target.lane && car.routeIdx >= car.route.length - 1 && Math.abs(car.target.s - car.s) < 0.3 && car.v < 0.25) {
      const cb = car.onArrive; car.target = null; car.onArrive = null; car.route = null; planFrom(car); cb?.(car);
    }
  }

  const _p = new THREE.Vector3(), _t = new THREE.Vector3();
  function stepManeuver(car, dt) {
    const m = car.maneuver;
    if (m.wait && !m.wait()) { car.v = 0; car.brake = true; return; }
    m.wait = null;
    car.v = Math.min(m.speed ?? 1.6, car.v + 2 * dt);
    m.s += car.v * dt;
    const t = clamp(m.s / m.length, 0, 1);
    m.curve.getPointAt(t, _p); m.curve.getTangentAt(t, _t);
    car.x = _p.x; car.z = _p.z; car.y = _p.y; car.h = Math.atan2(-_t.z, _t.x); car.brake = t > 0.85; car.pitch *= 0.9; car.roll *= 0.9;
    if (t >= 1) { car.maneuver = null; car.y = ROAD_Y; m.done?.(car); }
  }

  function maneuver(car, points, o = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal', 0.5);
    car.maneuver = { curve, length: curve.getLength(), s: 0, speed: o.speed, done: o.done, wait: o.wait };
    car.v = 0;
  }

  // Route a car along lanes to (lane, s), then call back on arrival.
  function routeTo(car, lane, s, onArrive) {
    const onTurn = car.piece.kind === 'turn', from = onTurn ? car.piece.outLane : car.piece;
    const path = net.route(from, lane, onTurn ? 0 : car.s, s);
    if (!path) return false;
    car.route = path; car.routeIdx = onTurn ? -1 : 0; car.target = { lane, s }; car.onArrive = onArrive;
    if (!onTurn) planFrom(car);
    return true;
  }

  const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler(), scl = new THREE.Vector3(), pos = new THREE.Vector3();
  const headCol = new THREE.Color(), tailCol = new THREE.Color(), beaconCol = new THREE.Color(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function render(time, night) {
    headCol.setRGB(0.6 + night * 1.6, 0.57 + night * 1.45, 0.47 + night * 1.0);
    for (const name in pools) {
      const pool = pools[name], ms = pool.meshes;
      for (const car of pool.cars) {
        let M = zero;
        car.scale += (car.targetScale - car.scale) * 0.16;
        if (!car.hidden && car.mode !== 'retired' && car.scale > 0.01) {
          euler.set(car.roll, car.h, car.pitch, 'YZX'); quat.setFromEuler(euler);
          pos.set(car.x, car.y + car.bounce, car.z); scl.setScalar(car.scale);
          matrix.compose(pos, quat, scl); M = matrix;
        }
        for (const mesh of Object.values(ms)) mesh.setMatrixAt(car.slot, M);
        if (ms.head) ms.head.setColorAt(car.slot, headCol);
        if (ms.tail) { const b = car.brake ? 1.9 : 0.5 + night * 0.7; tailCol.setRGB(b, b * 0.12, b * 0.1); ms.tail.setColorAt(car.slot, tailCol); }
        if (ms.beacon) { const on = car.beacon && Math.sin(time * 9 + car.id) > 0; beaconCol.setRGB(on ? 2.4 : 0.5, on ? 1.15 : 0.32, on ? 0.15 : 0.1); ms.beacon.setColorAt(car.slot, beaconCol); }
      }
      for (const mesh of Object.values(ms)) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    }
  }

  let flow = 1, flowRaw = 1;
  function update(dt, time, night = 0) {
    if (dt > 0) {
      index();
      for (const s of net.signals) s.update(dt, demand);
      world.signalLamps.update();
      for (const car of cars) updateCar(car, dt);
      let n = 0, sum = 0;
      for (const car of cars) { if (car.mode !== 'traffic' || car.hidden) continue; n++; sum += car.queued ? 1 : clamp(car.v / (car.v0 * 0.72), 0, 1); }
      flowRaw = n ? sum / n : 1;
      flow += (flowRaw - flow) * Math.min(1, dt * 0.5);
    }
    render(time, night);
  }

  function addHazard(lane, h) { if (!hazards.has(lane)) hazards.set(lane, []); hazards.get(lane).push(h); return h; }
  function removeHazard(h) { for (const list of hazards.values()) { const i = list.indexOf(h); if (i >= 0) list.splice(i, 1); } for (const c of cars) c.cleared.delete(h); }

  function setDensity(count, filter) {
    const active = cars.filter((c) => c.mode === 'traffic' && !c.hidden);
    if (active.length < count) spawnTraffic(count - active.length, filter);
    else active.slice(count).forEach((c) => { c.targetScale = 0; setTimeout(() => { c.mode = 'retired'; c.hidden = true; }, 400); });
  }

  return {
    group, cars, pools, hazards, create, reset, place, spawnTraffic, setDensity, update, routeTo, maneuver, addHazard, removeHazard,
    get flow() { return flow; }, get flowRaw() { return flowRaw; },
    jammed() { return cars.filter((c) => c.mode === 'traffic' && !c.hidden && c.stuck > 2.0); },
    count() { return cars.filter((c) => c.mode === 'traffic' && !c.hidden).length; },
    dispose() { group.traverse((o) => o.geometry?.dispose()); paint.dispose(); trim.dispose(); lightMat.dispose(); },
  };
}
