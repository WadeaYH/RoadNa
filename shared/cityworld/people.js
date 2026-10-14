import * as THREE from './three.js';
import { Builder, C, rng, clamp } from './kit.js';
import { RING, ROAD } from './layout.js';

// Residents walk sidewalk loops. Every body part is instanced, so the whole crowd costs a
// handful of draw calls. Walkers can stop to report a problem, crews can work, and an
// unhappy city can gather in front of City Hall.

const Y = 0.22;

class Loop {
  constructor(points) {
    this.pts = points; this.cum = [0];
    for (let i = 1; i <= points.length; i++) { const a = points[i - 1], b = points[i % points.length]; this.cum.push(this.cum[i - 1] + Math.hypot(b.x - a.x, b.z - a.z)); }
    this.total = this.cum[points.length];
  }
  sample(s, out) {
    s = ((s % this.total) + this.total) % this.total;
    let lo = 0, hi = this.pts.length;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (this.cum[mid] <= s) lo = mid; else hi = mid; }
    const a = this.pts[lo], b = this.pts[(lo + 1) % this.pts.length], t = (s - this.cum[lo]) / Math.max(1e-6, this.cum[lo + 1] - this.cum[lo]);
    out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t; out.h = Math.atan2(-(b.z - a.z), b.x - a.x);
    return out;
  }
}

function roundRect(x0, z0, x1, z1, radii) {
  const [a, b, c, d] = radii, pts = [], arc = (cx, cz, r, from) => { for (let i = 0; i <= 6; i++) { const t = from + (i / 6) * (Math.PI / 2); pts.push({ x: cx + Math.cos(t) * r, z: cz + Math.sin(t) * r }); } };
  arc(x1 - c, z1 - c, c, 0); arc(x0 + d, z1 - d, d, Math.PI / 2); arc(x0 + a, z0 + a, a, Math.PI); arc(x1 - b, z0 + b, b, Math.PI * 1.5);
  return new Loop(pts);
}

function sidewalkLoops() {
  const H = ROAD.half, inset = 0.55, outer = RING.radius - H - inset, small = 0.4;
  const blocks = [
    [-RING.hx + H, -RING.hz + H, -H, -H, [outer, small, small, small]],
    [H, -RING.hz + H, RING.hx - H, -H, [small, outer, small, small]],
    [H, H, RING.hx - H, RING.hz - H, [small, small, outer, small]],
    [-RING.hx + H, H, -H, RING.hz - H, [small, small, small, outer]],
  ];
  const loops = blocks.map(([x0, z0, x1, z1, r]) => roundRect(x0 + inset, z0 + inset, x1 - inset, z1 - inset, r));
  const o = 2.25, R = RING.radius + o;
  loops.push(roundRect(-RING.hx - o, -RING.hz - o, RING.hx + o, RING.hz + o, [R, R, R, R]));
  return loops;
}

function partGeometries() {
  const g = {};
  g.torso = new THREE.CylinderGeometry(0.095, 0.12, 0.3, 8).translate(0, 0.15, 0);
  g.head = new THREE.SphereGeometry(0.092, 10, 8);
  g.hair = new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hb = new Builder();
  hb.ball(0.112, '#fff', 0, 0, 0, { smooth: true, w: 10, h: 8 });
  hb.cyl(0.14, 0.17, '#fff', 0, -0.2, 0, { top: 0.72, seg: 10 });
  g.hijab = hb.toGeometry().geometry; g.hijab.clearGroups();
  g.leg = new THREE.BoxGeometry(0.075, 0.27, 0.08).translate(0, -0.135, 0);
  g.arm = new THREE.BoxGeometry(0.06, 0.24, 0.065).translate(0, -0.12, 0);
  const sb = new Builder();
  sb.box(0.025, 0.62, 0.025, '#8b6a50', 0, -0.36, 0);
  sb.box(0.42, 0.28, 0.025, '#fff', 0, 0.12, 0, { r: 0.01 });
  g.sign = sb.toGeometry().geometry; g.sign.clearGroups();
  g.phone = new THREE.BoxGeometry(0.04, 0.075, 0.012);
  return g;
}

const SHIRTS = ['#087f80', '#fafaf6', '#f6a649', '#c8775a', '#8ea987', '#4f78a8', '#e9e4d6', '#9bd3c7', '#d9564a', '#6f5f8a'];
const PANTS = ['#3e4a52', '#5b6b6e', '#c9b89a', '#2f3b3e', '#4a5d6b', '#7d6b57'];
const HAIR = ['#2b2420', '#4a3a2c', '#1d1b1a', '#6b5440', '#8a8a86'];
const HIJAB = ['#d9a5b3', '#7fa7b5', '#e9e4d6', '#b85a52', '#4f78a8', '#efd9b8', '#8ea987'];

export function createPeople(world, opts = {}) {
  const R = rng(opts.seed ?? 9);
  const loops = sidewalkLoops();
  const g = partGeometries();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
  const max = (opts.count ?? 26) + 8 + 6;
  const mk = (geo, n = max) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.castShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.root.add(m); return m; };
  const M = { torso: mk(g.torso), head: mk(g.head), hair: mk(g.hair), hijab: mk(g.hijab), leg: mk(g.leg, max * 2), arm: mk(g.arm, max * 2), sign: mk(g.sign, 8), phone: mk(g.phone, 8) };
  M.sign.castShadow = true;

  const people = [];
  function person(o = {}) {
    const p = {
      id: people.length, slot: people.length, loop: o.loop ?? null, s: o.s ?? 0, dir: o.dir ?? 1, speed: o.speed ?? R.range(0.42, 0.62),
      x: o.x ?? 0, z: o.z ?? 0, h: o.h ?? 0, y: Y, mode: o.mode ?? 'walk', state: 'walk', timer: R.range(2, 9), phase: R() * 10,
      shirt: new THREE.Color(o.shirt ?? R.pick(SHIRTS)), pants: new THREE.Color(o.pants ?? R.pick(PANTS)), skin: new THREE.Color(o.skin ?? R.pick(C.skin)),
      hijab: o.hijab ?? R() < 0.32, hairColor: new THREE.Color(o.hair ?? R.pick(HAIR)), scaleTarget: o.hidden ? 0 : 1, scale: o.hidden ? 0 : 1,
      armL: 0, armR: 0, legSwing: 0, lookAt: null, react: null, phone: false, sign: false, hat: o.hat ?? false, visible: !o.hidden,
    };
    if (p.hijab) p.hairColor.set(R.pick(HIJAB));
    if (p.hat) p.hairColor.set('#f4c54f');
    people.push(p);
    return p;
  }
  const walkers = [];
  const count = opts.count ?? 26;
  for (let i = 0; i < count; i++) {
    const loop = i < 6 ? loops[4] : loops[i % 4];
    walkers.push(person({ loop, s: R() * loop.total, dir: R() < 0.5 ? 1 : -1 }));
  }
  const protesters = [];
  [[9.9, -3.6], [11.1, -3.45], [12.3, -3.4], [13.5, -3.45], [14.7, -3.6], [10.5, -4.35]].forEach(([x, z]) => protesters.push(person({ mode: 'protest', hidden: true, x, z, h: Math.PI / 2 })));
  const workers = [];
  for (let i = 0; i < 8; i++) workers.push(person({ mode: 'worker', hidden: true, shirt: C.orange, pants: '#3e4a52', hat: true, hijab: false }));
  const scripted = [];

  const tmp = { x: 0, z: 0, h: 0 }, m = new THREE.Matrix4(), base = new THREE.Matrix4(), part = new THREE.Matrix4(), rot = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3();

  function walk(p, dt) {
    p.timer -= dt;
    if (p.state === 'walk') {
      p.s += p.speed * p.dir * dt;
      if (p.timer < 0) { p.state = R() < 0.55 ? 'pause' : 'walk'; p.timer = p.state === 'pause' ? R.range(1, 2.6) : R.range(4, 12); if (p.state === 'walk' && R() < 0.15) p.dir *= -1; }
    } else if (p.state === 'pause') { if (p.timer < 0) { p.state = 'walk'; p.timer = R.range(5, 12); } }
    else if (p.state === 'react') {
      if (p.timer < 0) { p.state = 'walk'; p.timer = R.range(3, 8); p.phone = false; p.lookAt = null; const cb = p.react; p.react = null; cb?.(p); }
    }
    p.loop.sample(p.s, tmp);
    const sh = Math.sin(tmp.h), ch = Math.cos(tmp.h), off = 0.24 * p.dir;
    const dir = p.dir > 0 ? tmp.h : tmp.h + Math.PI;
    p.x = tmp.x + sh * off; p.z = tmp.z + ch * off;
    let target = dir;
    if (p.lookAt) target = Math.atan2(-(p.lookAt.z - p.z), p.lookAt.x - p.x);
    let d = target - p.h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    p.h += d * Math.min(1, dt * 8);
  }

  function animate(p, dt, time) {
    const moving = (p.mode === 'walk' && p.state === 'walk') || p.moving;
    p.phase += dt * (moving ? 7.5 : 0);
    const swing = moving ? Math.sin(p.phase) * 0.55 : p.legSwing * 0.85;
    p.legSwing = swing;
    if (p.mode === 'worker') {
      const k = Math.sin(time * 6 + p.id);
      p.armR = -0.6 + k * 0.6; p.armL = -0.3 - k * 0.3; p.bend = 0.25 + k * 0.05;
    } else if (p.mode === 'protest') {
      p.armR = 2.6 + Math.sin(time * 4 + p.id) * 0.25; p.armL = 0.1 + Math.max(0, Math.sin(time * 3 + p.id * 2)) * 2.2; p.bend = 0;
    } else if (p.mode === 'cheer') {
      p.armR = 2.75 + Math.sin(time * 9 + p.id) * 0.3; p.armL = 2.75 + Math.cos(time * 9 + p.id) * 0.3; p.bend = 0;
    } else if (p.phone) { p.armR = 1.95; p.armL = 0.15; p.bend = 0; }
    else { p.armR = -swing * 0.75; p.armL = swing * 0.75; p.bend = 0; }
  }

  function writeMatrices(time) {
    for (const p of people) {
      p.scale += (p.scaleTarget - p.scale) * 0.15;
      const i = p.slot;
      if (p.scale < 0.02) {
        for (const k of ['torso', 'head', 'hair', 'hijab']) M[k].setMatrixAt(i, zero);
        M.leg.setMatrixAt(i * 2, zero); M.leg.setMatrixAt(i * 2 + 1, zero); M.arm.setMatrixAt(i * 2, zero); M.arm.setMatrixAt(i * 2 + 1, zero);
        continue;
      }
      const bob = p.mode === 'protest' ? Math.abs(Math.sin(time * 4 + p.id)) * 0.06 : Math.abs(Math.sin(p.phase)) * 0.025;
      q.setFromAxisAngle(UP, p.h); base.compose(v.set(p.x, p.y + bob, p.z), q, s3.setScalar(p.scale));
      const bend = p.bend || 0;
      part.makeTranslation(0, 0.25, 0); rot.makeRotationZ(-bend); m.multiplyMatrices(base, part).multiply(rot); M.torso.setMatrixAt(i, m);
      const headX = Math.sin(bend) * 0.38;
      part.makeTranslation(headX, 0.25 + Math.cos(bend) * 0.39, 0); m.multiplyMatrices(base, part); M.head.setMatrixAt(i, m);
      if (p.hijab) { M.hijab.setMatrixAt(i, m); M.hair.setMatrixAt(i, zero); }
      else { part.makeTranslation(headX - 0.012, 0.25 + Math.cos(bend) * 0.39 + 0.012, 0); m.multiplyMatrices(base, part); M.hair.setMatrixAt(i, m); M.hijab.setMatrixAt(i, zero); }
      for (let side = 0; side < 2; side++) {
        const sz = side ? 0.055 : -0.055, sw = side ? p.legSwing : -p.legSwing;
        part.makeTranslation(0, 0.27, sz); rot.makeRotationZ(sw); m.multiplyMatrices(base, part).multiply(rot); M.leg.setMatrixAt(i * 2 + side, m);
        const az = side ? 0.135 : -0.135, aa = side ? p.armR : p.armL;
        part.makeTranslation(headX * 0.6, 0.25 + Math.cos(bend) * 0.28, az); rot.makeRotationZ(aa); m.multiplyMatrices(base, part).multiply(rot); M.arm.setMatrixAt(i * 2 + side, m);
      }
      M.torso.setColorAt(i, p.shirt); M.head.setColorAt(i, p.skin); M.hair.setColorAt(i, p.hairColor); M.hijab.setColorAt(i, p.hairColor);
      M.leg.setColorAt(i * 2, p.pants); M.leg.setColorAt(i * 2 + 1, p.pants); M.arm.setColorAt(i * 2, p.shirt); M.arm.setColorAt(i * 2 + 1, p.shirt);
    }
    // Phones and protest signs ride on the right hand.
    let ps = 0, ss = 0;
    for (const p of people) {
      if (p.scale < 0.02) continue;
      if (p.phone && ps < 8) { M.arm.getMatrixAt(p.slot * 2 + 1, m); part.makeTranslation(0, -0.25, 0); m.multiply(part); M.phone.setMatrixAt(ps, m); M.phone.setColorAt(ps, PHONE); ps++; }
      if (p.mode === 'protest' && ss < 8) { M.arm.getMatrixAt(p.slot * 2 + 1, m); part.makeTranslation(0, -0.2, 0); rot.makeRotationZ(-p.armR); m.multiply(part).multiply(rot); M.sign.setMatrixAt(ss, m); M.sign.setColorAt(ss, p.id % 2 ? SIGN_A : SIGN_B); ss++; }
    }
    M.phone.count = ps; M.sign.count = ss;
    for (const k in M) { M[k].instanceMatrix.needsUpdate = true; if (M[k].instanceColor) M[k].instanceColor.needsUpdate = true; }
  }
  const UP = new THREE.Vector3(0, 1, 0), PHONE = new THREE.Color('#2b3438'), SIGN_A = new THREE.Color('#fafaf6'), SIGN_B = new THREE.Color('#f6a649');
  const n = people.length;
  for (const k of ['torso', 'head', 'hair', 'hijab']) M[k].count = n;
  M.leg.count = n * 2; M.arm.count = n * 2;

  let paused = false;
  function update(dt, time) {
    if (!paused && dt > 0) {
      for (const p of walkers) if (p.visible) walk(p, dt);
      for (const p of scripted) { if (p.path) stepScripted(p, dt); }
    }
    for (const p of people) animate(p, paused ? 0 : dt, time);
    writeMatrices(time);
  }
  function stepScripted(p, dt) {
    const target = p.path[0];
    const dx = target.x - p.x, dz = target.z - p.z, dist = Math.hypot(dx, dz);
    if (dist < 0.05) { p.path.shift(); if (!p.path.length) { p.path = null; p.moving = false; p.onDone?.(p); } return; }
    const step = Math.min(dist, (p.walkSpeed ?? 0.7) * dt);
    p.x += (dx / dist) * step; p.z += (dz / dist) * step; p.moving = true;
    let d = Math.atan2(-dz, dx) - p.h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; p.h += d * Math.min(1, dt * 8);
  }

  // A passer-by close to (x, z) stops, faces it and lifts a phone to report it.
  function reportNear(x, z, radius, onDone) {
    let best = null, bestD = radius;
    for (const p of walkers) { if (p.state === 'react' || !p.visible) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bestD) { bestD = d; best = p; } }
    if (!best) return null;
    best.state = 'react'; best.timer = 1.9; best.phone = true; best.lookAt = { x, z }; best.react = onDone;
    return best;
  }
  function addWorker(x, z, h) {
    const w = workers.find((p) => !p.visible);
    if (!w) return null;
    Object.assign(w, { visible: true, scaleTarget: 1, x, z, h, mode: 'worker' });
    return w;
  }
  function removeWorker(w) { if (w) { w.scaleTarget = 0; w.visible = false; } }
  function setProtest(active) { protesters.forEach((p, i) => { p.visible = active; setTimeout(() => (p.scaleTarget = active ? 1 : 0), i * 120); }); }
  // Story or scripted characters walk to a list of points.
  function addScripted(o = {}) {
    const p = workers.find((w) => !w.visible) || null;
    if (!p) return null;
    Object.assign(p, { visible: true, scaleTarget: 1, x: o.x ?? 0, z: o.z ?? 0, h: o.h ?? 0, mode: o.mode ?? 'idle', moving: false, path: null });
    if (o.shirt) p.shirt.set(o.shirt);
    if (o.hat === false) p.hat = false;
    scripted.push(p);
    return p;
  }
  function walkTo(p, points, onDone, speed = 0.7) { p.path = points.map(([x, z]) => ({ x, z })); p.onDone = onDone; p.walkSpeed = speed; }

  return {
    walkers, protesters, workers, people, loops, update, reportNear, addWorker, removeWorker, setProtest, addScripted, walkTo,
    set paused(v) { paused = v; }, get paused() { return paused; },
    dispose() { Object.values(M).forEach((m2) => { m2.geometry.dispose(); world.root.remove(m2); }); mat.dispose(); },
  };
}
