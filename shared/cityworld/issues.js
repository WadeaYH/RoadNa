import * as THREE from './three.js';
import { Builder, C, rng, clamp } from './kit.js';
import { ROAD_Y } from './vehicles.js';
import { LOT } from './buildings.js';

// City problems: what they look like, how they affect traffic, and how crews fix them.
export const ISSUE_TYPES = {
  pothole: { label: 'Pothole', category: 'Roads & potholes', work: 7, icon: 'pothole' },
  light: { label: 'Broken streetlight', category: 'Streetlights', work: 5, icon: 'light' },
  trash: { label: 'Overflowing bin', category: 'Sanitation', work: 4.5, icon: 'trash' },
  drain: { label: 'Blocked drain', category: 'Water & drainage', work: 6, icon: 'drain' },
};
const STATUS_COLOR = { new: '#d9564a', reported: '#f6a649', assigned: '#087f80', working: '#087f80', fixed: '#4f9a6b' };

export function makePotholeMesh(mats, seed, scale = 1) {
  const r = rng(seed), b = new Builder();
  const blob = (rad, jitter, sx, sz) => { const s = new THREE.Shape(); for (let i = 0; i < 13; i++) { const a = (i / 13) * Math.PI * 2, k = rad + r() * jitter; const x = Math.cos(a) * k * sx, y = Math.sin(a) * k * sz; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); return s; };
  b.slab(blob(0.5, 0.14, 1.25, 0.85), 0.006, '#3d474c', 0.0);
  b.slab(blob(0.42, 0.12, 1.2, 0.82), 0.01, '#1c2327', 0.0);
  b.slab(blob(0.26, 0.1, 1.1, 0.8), 0.013, '#11171a', 0.0);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + r() * 0.3, k = 0.5 + r() * 0.12; b.box(0.09 + r() * 0.08, 0.035, 0.07 + r() * 0.06, r() < 0.5 ? '#626c70' : '#4f585c', Math.cos(a) * k * 1.22, 0, Math.sin(a) * k * 0.86, { ry: r() * 3 }); }
  for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2, len = 0.3 + r() * 0.45; b.box(len, 0.008, 0.025, '#20282c', Math.cos(a) * (0.62 + len / 2), 0, Math.sin(a) * (0.5 + len / 2) * 0.8, { ry: -a }); }
  const m = b.toMesh({ solid: mats.solid }, null, { cast: false, dynamic: true });
  m.scale.setScalar(scale);
  return m;
}
export function makePatchMesh(mats, seed) {
  const r = rng(seed), b = new Builder();
  b.box(1.55, 0.008, 1.05, '#3d4950', 0, 0, 0, { r: 0.05 });
  b.box(1.6, 0.006, 0.04, '#59666c', 0, 0.002, 0.53); b.box(1.6, 0.006, 0.04, '#59666c', 0, 0.002, -0.53);
  b.box(0.04, 0.006, 1.1, '#59666c', 0.79, 0.002, 0); b.box(0.04, 0.006, 1.1, '#59666c', -0.79, 0.002, 0);
  const mat = mats.solid.clone(); mat.transparent = true;
  const m = b.toMesh({ solid: mat }, null, { cast: false, dynamic: true });
  m.userData.fade = mat;
  return m;
}
export function makeConesMesh(mats, n = 3) {
  const b = new Builder();
  const spots = n === 3 ? [[-1.0, 0.5], [1.0, 0.5], [0, -0.75]] : [[-0.6, 0], [0.6, 0]];
  for (const [x, z] of spots) {
    b.box(0.24, 0.03, 0.24, C.orangeDeep, x, 0, z);
    b.cone(0.1, 0.36, C.orange, x, 0.03, z, { seg: 8 });
    b.cyl(0.072, 0.07, C.white, x, 0.13, z, { top: 0.82, seg: 8 });
  }
  return b.toMesh({ solid: mats.solid }, null, { dynamic: true });
}


export function createIssues(world, traffic, people, fx, opts = {}) {
  const R = rng(opts.seed ?? 77);
  const group = new THREE.Group(); group.name = 'issues'; world.root.add(group);
  const list = [];
  let nextId = 1;
  const mats = world.mats;
  const ringGeo = new THREE.RingGeometry(0.72, 0.9, 40);
  const capGeo = new THREE.BoxGeometry(0.36, 0.05, 0.2), capMat = new THREE.MeshStandardMaterial({ color: '#4a4f50', roughness: 0.6 });

  function trashMesh(seed) {
    const r = rng(seed), b = new Builder();
    for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, k = 0.25 + r() * 0.45; b.ball(0.13 + r() * 0.1, r.pick(['#2f3b3e', '#3c5a46', '#e9e4d6', '#2f3b3e', '#5b6b6e']), Math.cos(a) * k, 0.1, Math.sin(a) * k, { detail: 0, sy: 0.8 }); }
    b.box(0.3, 0.22, 0.26, '#c9a477', 0.42, 0, -0.3, { ry: 0.5, r: 0.02 }); b.box(0.22, 0.18, 0.2, '#b99068', -0.4, 0, 0.32, { ry: -0.3, r: 0.02 });
    b.box(0.18, 0.06, 0.1, '#e9e4d6', 0.1, 0, 0.5, { ry: 1.2 });
    return b.toMesh({ solid: mats.solid }, null, { dynamic: true });
  }
  function puddleMesh() {
    const b = new Builder();
    b.cyl(0.62, 0.006, '#4a565b', 0, 0, 0, { seg: 18, sx: 1.4, sz: 0.85 });
    b.cyl(0.5, 0.01, C.water, 0, 0.001, 0, { seg: 18, sx: 1.4, sz: 0.85, kind: 'water' });
    return b.toMesh(mats, ['solid', 'water'], { cast: false, dynamic: true });
  }
  const potholeMesh = (seed, scale) => makePotholeMesh(mats, seed, scale), patchMesh = (seed) => makePatchMesh(mats, seed), conesMesh = (n) => makeConesMesh(mats, n);
  const busyLane = (lane, s) => list.some((i) => i.lane === lane && i.status !== 'fixed' && Math.abs(i.s - s) < 3.5);
  function roadSpot(at) {
    if (at?.lane) return at;
    const lanes = world.net.lanes.filter((l) => !l.reserved && l.length > 7);
    for (let t = 0; t < 40; t++) { const lane = R.pick(lanes), s = R.range(2.6, lane.length - 2.6); if (!busyLane(lane, s)) return { lane, s }; }
    return null;
  }

  function spawn(type, at = null) {
    const issue = { id: nextId++, type, info: ISSUE_TYPES[type], status: 'new', age: 0, reportedAge: 0, progress: 0, meshes: {}, hazard: null, worker: null, crew: null, appear: 0, severity: at?.severity ?? 1 };
    if (type === 'pothole' || type === 'drain') {
      const spot = roadSpot(at); if (!spot) return null;
      issue.lane = spot.lane; issue.s = spot.s; issue.street = spot.lane.street;
      const p = spot.lane.sample(spot.s, { x: 0, z: 0, h: 0 });
      const lat = type === 'drain' ? 0.5 : (at?.lateral ?? R.range(-0.12, 0.12));
      issue.x = p.x + Math.sin(p.h) * lat; issue.z = p.z + Math.cos(p.h) * lat; issue.y = ROAD_Y; issue.h = p.h;
      const mesh = type === 'pothole' ? potholeMesh(issue.id * 13 + 5, at?.scale ?? 1) : puddleMesh();
      mesh.position.set(issue.x, ROAD_Y + 0.001, issue.z); mesh.rotation.y = p.h + (type === 'pothole' ? R.range(-0.3, 0.3) : 0);
      mesh.scale.multiplyScalar(0.01); issue.baseScale = at?.scale ?? 1;
      group.add(mesh); issue.meshes.main = mesh;
      issue.hazard = traffic.addHazard(spot.lane, { s: spot.s, type: type === 'pothole' ? 'pothole' : 'puddle', radius: 0.8, issue, severity: issue.severity });
      fx.emit('dust', issue.x, 0.15, issue.z, 14);
    } else if (type === 'light') {
      const lamps = world.lamps.filter((l) => !l.broken && !l.reserved);
      const lamp = at?.lamp ?? R.pick(lamps); if (!lamp) return null;
      lamp.broken = true; issue.lamp = lamp; issue.x = lamp.x; issue.z = lamp.z; issue.y = LOT; issue.h = 0;
      issue.street = world.net.nearest(lamp.baseX, lamp.baseZ)?.lane.street ?? 'the street';
      const cap = new THREE.Mesh(capGeo, capMat); cap.position.set(lamp.x, lamp.y + 0.065, lamp.z); cap.rotation.y = lamp.ry; group.add(cap); issue.meshes.cap = cap;
      fx.emit('sparkle', lamp.x, lamp.y + 0.1, lamp.z, 8, { spread: 0.4 });
    } else if (type === 'trash') {
      const free = world.bins.filter((b) => !list.some((i) => i.bin === b && i.status !== 'fixed'));
      const bin = at?.bin ?? R.pick(free); if (!bin) return null;
      issue.bin = bin; issue.x = bin.x; issue.z = bin.z; issue.y = LOT; issue.h = 0;
      issue.street = world.net.nearest(bin.x, bin.z)?.lane.street ?? 'the street';
      const mesh = trashMesh(issue.id * 7 + 3); mesh.position.set(bin.x, LOT, bin.z); mesh.scale.setScalar(0.01); issue.baseScale = bin.kind === 'dumpster' ? 1.25 : 1;
      group.add(mesh); issue.meshes.main = mesh;
    }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: STATUS_COLOR.new, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(issue.x, (issue.y ?? LOT) + 0.02, issue.z); ring.renderOrder = 3;
    if (type === 'light') ring.position.set(issue.lamp.baseX, LOT + 0.02, issue.lamp.baseZ);
    group.add(ring); issue.meshes.ring = ring;
    issue.anchor = new THREE.Vector3(issue.x, (type === 'light' ? issue.lamp.y + 0.6 : (issue.y ?? LOT) + 1.15), issue.z);
    fx.ripple(ring.position.x, ring.position.y, ring.position.z, STATUS_COLOR.new, 2.2, 0.9);
    list.push(issue);
    return issue;
  }

  // Place a pothole where the player clicked, if that point is on a road lane.
  function spawnNear(type, x, z) {
    if (type === 'pothole' || type === 'drain') {
      const hit = world.net.nearest(x, z, (l) => !l.reserved);
      if (!hit || hit.d > 1.25 || hit.s < 2.2 || hit.s > hit.lane.length - 2.2 || busyLane(hit.lane, hit.s)) return null;
      return spawn(type, { lane: hit.lane, s: hit.s, lateral: hit.lane.lateral(x, z) * 0.4 });
    }
    if (type === 'light') {
      let best = null, bd = 2.5; for (const l of world.lamps) { const d = Math.hypot(l.baseX - x, l.baseZ - z); if (!l.broken && d < bd) { bd = d; best = l; } }
      return best ? spawn('light', { lamp: best }) : null;
    }
    if (type === 'trash') {
      let best = null, bd = 2.5; for (const b of world.bins) { const d = Math.hypot(b.x - x, b.z - z); if (d < bd && !list.some((i) => i.bin === b && i.status !== 'fixed')) { bd = d; best = b; } }
      return best ? spawn('trash', { bin: best }) : null;
    }
    return null;
  }

  function setStatus(issue, status) {
    issue.status = status;
    issue.meshes.ring?.material.color.set(STATUS_COLOR[status]);
  }

  // Where a crew should park to work on this issue.
  function workSpot(issue) {
    if (issue.lane) return { lane: issue.lane, s: Math.max(0.6, issue.s - 1.75) };
    const px = issue.type === 'light' ? issue.lamp.baseX : issue.x, pz = issue.type === 'light' ? issue.lamp.baseZ : issue.z;
    const hit = world.net.nearest(px, pz, (l) => !l.reserved && l.lateral(px, pz) > 0);
    if (!hit) return null;
    return { lane: hit.lane, s: clamp(hit.s - 0.4, 0.8, hit.lane.length - 0.8) };
  }

  function startWork(issue, van) {
    setStatus(issue, 'working');
    issue.progress = 0;
    const cones = conesMesh(issue.lane ? 3 : 2);
    if (issue.lane) { cones.position.set(issue.x, ROAD_Y, issue.z); cones.rotation.y = issue.h; }
    else { const p = van ? { x: van.x + Math.sin(van.h) * 0.9, z: van.z + Math.cos(van.h) * 0.9 } : issue; cones.position.set(p.x, LOT, p.z); cones.rotation.y = van?.h ?? 0; }
    cones.scale.setScalar(0.01); group.add(cones); issue.meshes.cones = cones;
    if (issue.lane) issue.works = traffic.addHazard(issue.lane, { s: issue.s, type: 'works', radius: 1.5, issue });
    let wx = issue.x, wz = issue.z;
    if (issue.lane) { wx += Math.sin(issue.h) * 0.55 + Math.cos(issue.h) * 0.2; wz += Math.cos(issue.h) * 0.55 - Math.sin(issue.h) * 0.2; }
    else if (issue.type === 'light') { wx = issue.lamp.baseX + 0.35; wz = issue.lamp.baseZ + 0.2; }
    else { wx = issue.x + 0.55; wz = issue.z + 0.35; }
    const face = Math.atan2(-(issue.z - wz), issue.x - wx);
    issue.worker = people.addWorker(wx, wz, face);
    if (issue.worker) issue.worker.y = issue.lane ? ROAD_Y : LOT;
  }

  function finish(issue) {
    setStatus(issue, 'fixed');
    issue.fixedAge = 0;
    if (issue.hazard) { traffic.removeHazard(issue.hazard); issue.hazard = null; }
    if (issue.works) { traffic.removeHazard(issue.works); issue.works = null; }
    if (issue.worker) { people.removeWorker(issue.worker); issue.worker = null; }
    if (issue.type === 'light') { issue.lamp.broken = false; issue.meshes.cap?.removeFromParent(); }
    if (issue.type === 'pothole') {
      const patch = patchMesh(issue.id); patch.position.set(issue.x, ROAD_Y + 0.0005, issue.z); patch.rotation.y = issue.h;
      group.add(patch); issue.meshes.patch = patch;
    }
    issue.removing = true;
    fx.emit('sparkle', issue.x, (issue.y ?? LOT) + 0.4, issue.z, 26);
    fx.emit('confetti', issue.x, (issue.y ?? LOT) + 0.5, issue.z, 22, { spread: 0.8 });
    fx.ripple(issue.x, (issue.y ?? LOT) + 0.03, issue.z, '#4f9a6b', 3, 1.2);
  }

  function dropMesh(m) { if (!m) return; m.removeFromParent(); if (m.userData.fade) m.userData.fade.dispose(); if (m.geometry !== capGeo) m.geometry.dispose(); if (m.material?.isMeshBasicMaterial) m.material.dispose(); }

  let stinkClock = 0;
  function update(dt, time) {
    stinkClock += dt;
    for (let i = list.length - 1; i >= 0; i--) {
      const issue = list[i], main = issue.meshes.main;
      issue.age += dt;
      if (issue.status === 'reported' || issue.status === 'assigned') issue.reportedAge += dt;
      issue.appear = Math.min(1, issue.appear + dt * 2.2);
      const grow = 1 - Math.pow(1 - issue.appear, 3);
      // Neglected potholes widen: bigger holes mean longer, more careful stops.
      if (issue.type === 'pothole' && issue.status !== 'working' && !issue.removing) { issue.severity = Math.min(1.8, issue.severity + dt / 110); if (issue.hazard) issue.hazard.severity = issue.severity; }
      if (main && !issue.removing) main.scale.setScalar(Math.max(0.01, grow * (issue.baseScale ?? 1) * (issue.type === 'pothole' ? 0.85 + issue.severity * 0.15 : 1)));
      const ring = issue.meshes.ring;
      if (ring) {
        const pulse = issue.status === 'fixed' ? 1 : 1 + Math.sin(time * 4 + issue.id) * 0.08;
        ring.scale.setScalar(pulse * (issue.lane ? 1.05 : 0.8));
        ring.material.opacity = issue.status === 'fixed' ? Math.max(0, 0.8 - issue.fixedAge * 0.6) : 0.55 + Math.sin(time * 4 + issue.id) * 0.25;
      }
      if (issue.meshes.cones) { const c = issue.meshes.cones; const t = issue.status === 'working' ? 1 : 0; c.scale.setScalar(Math.max(0.01, c.scale.x + (t - c.scale.x) * Math.min(1, dt * 8))); }
      if (issue.status === 'working' && issue.type === 'pothole' && R() < dt * 4) fx.emit('dust', issue.x, 0.12, issue.z, 2, { spread: 0.5 });
      if (issue.status === 'working' && issue.type === 'light' && R() < dt * 3) fx.emit('sparkle', issue.lamp.x, issue.lamp.y, issue.lamp.z, 2, { spread: 0.3 });
      if (issue.type === 'trash' && issue.status !== 'fixed' && stinkClock > 0.5) fx.emit('stink', issue.x + R.range(-0.4, 0.4), LOT + 0.4, issue.z + R.range(-0.4, 0.4), 1);
      if (issue.type === 'drain' && issue.status !== 'fixed' && R() < dt * 1.5) fx.emit('splash', issue.x, 0.08, issue.z, 2);
      if (issue.removing) {
        issue.fixedAge += dt;
        if (main) { const k = Math.max(0, 1 - issue.fixedAge * 1.4); main.scale.setScalar(Math.max(0.001, k * (issue.baseScale ?? 1))); if (k === 0 && main.parent) dropMesh(main); }
        if (issue.meshes.cones) { const c = issue.meshes.cones; c.scale.setScalar(Math.max(0.001, 1 - issue.fixedAge * 2)); }
        const patch = issue.meshes.patch;
        if (patch) patch.userData.fade.opacity = clamp(1 - (issue.fixedAge - 20) / 15, 0, 1);
        if (issue.fixedAge > (patch ? 36 : 2.5)) {
          Object.values(issue.meshes).forEach(dropMesh);
          list.splice(i, 1);
        }
      }
    }
    if (stinkClock > 0.5) stinkClock = 0;
  }

  function clear() {
    for (const issue of [...list]) {
      if (issue.hazard) traffic.removeHazard(issue.hazard);
      if (issue.works) traffic.removeHazard(issue.works);
      if (issue.worker) people.removeWorker(issue.worker);
      if (issue.lamp) issue.lamp.broken = false;
      Object.values(issue.meshes).forEach(dropMesh);
    }
    list.length = 0;
  }

  return {
    list, spawn, spawnNear, setStatus, workSpot, startWork, finish, update, clear, group,
    open: () => list.filter((i) => i.status !== 'fixed'),
    dispose() { clear(); ringGeo.dispose(); capGeo.dispose(); capMat.dispose(); },
  };
}
