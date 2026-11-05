import * as THREE from './three.js';
import { Builder, C, rng, createMaterials, roundedRectShape, arcRectShape } from './kit.js';
import { createSignAtlas, loadSignFonts } from './signs.js';
import { SIGN_TEXT, EMBLEMS, CUSTOM, drawBanner } from './textures.js';
import { BOARD, RING, PLACES, DISTRICTS, SPOTS } from './layout.js';
import { createNetwork, buildRoads, createSignalLamps } from './roads.js';
import { LANDMARKS, footprint, mosque, filler, LOT } from './buildings.js';
import * as P from './props.js';

// Assembles the whole diorama: board, roads, four districts, 20 landmark buildings and
// the city edge. Static detail is baked into a handful of meshes per district.
export async function buildWorld(scene, opts = {}) {
  await loadSignFonts();
  const atlas = createSignAtlas(2048);
  const mats = createMaterials(atlas.texture);
  const R = rng(opts.seed ?? 20261011);
  const cache = new Map();
  const memo = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
  const k = {
    R, dynamic: [],
    sign: (key, sw, sh) => memo(`s:${key}:${(sw / sh).toFixed(2)}`, () => {
      const t = SIGN_TEXT[key], aspect = sw / sh;
      if (t.banner || aspect > 6) { const w = 1024, h = Math.max(48, Math.round(w / aspect)); return atlas.custom(w, h, (ctx, ww, hh, u) => drawBanner(ctx, ww, hh, t, u)); }
      return atlas.sign({ ...t, w: 512, h: Math.round(512 / aspect) });
    }),
    emblem: (key) => memo(`e:${key}`, () => atlas.emblem(EMBLEMS[key][0], EMBLEMS[key][1])),
    custom: (key) => memo(`c:${key}`, () => { const [w, h, draw] = CUSTOM[key]; return atlas.custom(w, h, draw); }),
  };

  const root = new THREE.Group(); root.name = 'city'; scene.add(root);
  const net = createNetwork();
  const assembly = [];
  const lamps = [], bins = [];
  const meshOf = (b, o) => { const m = b.toMesh(mats, ['solid', 'facet', 'foliage', 'glass', 'lamp', 'water', 'metal', 'sign'], o); if (m) root.add(m); return m; };

  // --- Board, roads and kerbs ------------------------------------------------------------
  const base = new Builder();
  const boardShape = (inset) => arcRectShape(BOARD.hx - inset, BOARD.hz - inset, BOARD.radius - inset);
  base.slab(boardShape(0.35), 1.05, C.base, -1.62, { curve: 14 });
  base.slab(boardShape(0.3), 0.06, C.baseDark, -1.0, { curve: 14 });
  base.slab(boardShape(0.18), 0.42, C.soil, -0.56, { curve: 14 });
  base.slab(boardShape(0), 0.12, C.grass, -0.12, { curve: 14 });
  const heads = buildRoads(base, net);
  const baseMesh = meshOf(base);
  const signalLamps = createSignalLamps(heads);
  root.add(signalLamps.mesh);

  // --- Streetscape: lamps, street trees, bins ----------------------------------------------
  const street = new Builder();
  const lampRow = (pts, ry) => pts.forEach(([x, z]) => P.streetLamp(street, x, z, ry, lamps));
  lampRow([[-20, -2.25], [-13.5, -2.25], [-6.5, -2.25], [6.6, -2.25], [12.6, -2.25], [16.3, -2.25]], -Math.PI / 2);
  lampRow([[-20.5, 2.25], [-13.5, 2.25], [-6.5, 2.25], [6.6, 2.25], [11.8, 2.25], [20.2, 2.25]], Math.PI / 2);
  lampRow([[2.25, -12.5], [2.25, -7.6], [2.25, 6.6], [2.25, 12.6]], Math.PI);
  lampRow([[-2.25, -12.8], [-2.25, -6.6], [-2.25, 6.6], [-2.25, 12.8]], 0);
  lampRow([[-16, -19.25], [-8, -19.25], [8, -19.25], [16, -19.25]], -Math.PI / 2);
  lampRow([[-16, 19.25], [-9.5, 19.25], [8, 19.25], [16, 19.25]], Math.PI / 2);
  lampRow([[-27.25, -8], [-27.25, 8]], 0);
  lampRow([[27.25, -8], [27.25, 8]], Math.PI);
  const pit = (x, z) => { street.box(0.62, 0.02, 0.62, '#9a8466', x, LOT, z); };
  for (const [x, z] of [[-17, -2.25], [-10, -2.25], [-3.6, -2.25], [9.6, -2.25], [-17, 2.25], [-10, 2.25], [9.0, 2.25], [3.9, 2.25], [2.25, -10], [-2.25, -9.7], [2.25, 9.6], [-2.25, 9.8], [-2.25, 3.9]]) { pit(x, z); P.roundTree(street, x, z, { s: 0.78, tint: (x * 7 + z) & 1 ? 0 : 1 }); }
  for (const [x, z] of [[-12.9, -2.45], [7.2, 2.45], [-2.45, 7.2], [2.45, -13.1], [-19.4, 2.45], [13.3, -2.45]]) P.bin(street, x, z, bins);
  for (const [x, z] of [[-5.2, 2.5], [5.4, -2.5], [24.2, 2.5], [-2.5, 15.4]]) P.hydrant(street, x, z);
  P.busStop(street, -6, 19.45, Math.PI, k.custom('busAd'));
  P.busStop(street, 6.5, -19.45, 0, k.custom('busAd'));
  const streetMesh = meshOf(street);
  assembly.push({ object: streetMesh, type: 'pop', delay: 0.95 });

  // --- Districts ---------------------------------------------------------------------------
  const lotSlab = (b, x0, z0, x1, z1, color, r = 0.4, h = 0.03) => b.slab(roundedRectShape(x0, z0, x1, z1, r), h, color, LOT);

  // Public Square (south-east)
  const pub = new Builder();
  lotSlab(pub, 3.0, 8.7, 9.2, 14.0, C.grass, 0.6, 0.04);
  pub.box(6.2, 0.012, 0.7, C.paving, 6.1, LOT + 0.04, 11.3); pub.box(0.7, 0.012, 5.3, C.paving, 6.1, LOT + 0.04, 11.35);
  pub.cyl(1.25, 0.03, C.paving, 6.1, LOT + 0.04, 11.3, { seg: 20 });
  // "How it works" pavilion
  pub.push(6.1, LOT + 0.07, 11.3, 0);
  pub.cyl(1.05, 0.12, C.stone3, 0, 0, 0, { seg: 8 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pub.cyl(0.06, 1.35, C.white, Math.cos(a) * 0.82, 0.12, Math.sin(a) * 0.82, { seg: 6 }); }
  pub.cone(1.35, 0.6, C.teal, 0, 1.47, 0, { seg: 8 });
  pub.cyl(1.36, 0.06, C.white, 0, 1.43, 0, { seg: 8 });
  pub.ball(0.09, '#e7c76a', 0, 2.1, 0, { detail: 1 });
  pub.box(0.5, 0.75, 0.08, C.teal, 0, 0.12, 0, { r: 0.03 });
  pub.quad(0.38, 0.38, 0, 0.62, 0.045, k.emblem('visitor'));
  pub.pop();
  P.olive(pub, 4.2, 9.7, { y: LOT + 0.04, s: 1.05 }); P.roundTree(pub, 8.2, 9.7, { y: LOT + 0.04 });
  P.roundTree(pub, 3.9, 13.1, { y: LOT + 0.04, s: 0.9, tint: 1 }); P.palm(pub, 8.4, 13.3, { y: LOT + 0.04 });
  P.cypress(pub, 3.4, 11.0, { y: LOT + 0.04 }); P.cypress(pub, 8.8, 11.6, { y: LOT + 0.04, s: 0.9 });
  P.bench(pub, 4.7, 11.95, 0); P.bench(pub, 7.5, 10.65, Math.PI); P.bench(pub, 6.85, 13.2, -Math.PI / 2);
  P.flowerBed(pub, 4.6, 10.4, 1.1, 0.5); P.flowerBed(pub, 7.6, 12.3, 1.0, 0.5, { colors: [C.orange, C.yellow, C.pink] });
  // Café corner
  P.kiosk(pub, 3.95, 4.2, Math.PI / 2, C.orange);
  P.umbrellaTable(pub, 6.0, 4.0, C.teal); P.umbrellaTable(pub, 7.7, 5.3, C.orange); P.umbrellaTable(pub, 5.8, 6.6, C.teal);
  P.planter(pub, 8.9, 3.4, 0.9, 0.4, C.leaf3, { flowers: true }); P.planter(pub, 3.5, 7.9, 0.9, 0.4);
  P.roundTree(pub, 8.6, 7.6, { s: 0.85, tint: 2 });
  // Parking
  const pk = SPOTS.parking;
  lotSlab(pub, pk.x0, pk.z0, pk.x1, pk.z1, '#46525a', 0.25, 0.025);
  for (const x of [9.8, 11.2, 12.6, 14.0, 15.4]) pub.box(0.06, 0.008, 2.3, C.roadLine, x, LOT + 0.025, 7.05);
  for (const x of pk.spots) pub.box(0.5, 0.008, 0.08, C.roadLine, x, LOT + 0.025, 8.05);
  pub.box(0.9, 0.008, 0.9, '#3e78b6', 10.5, LOT + 0.026, 7.4);
  pub.box(1.1, 0.03, 1.1, '#46525a', pk.entryX, LOT, 2.25);
  P.planter(pub, 16.3, 8.1, 0.5, 0.5, C.leaf3);
  // Around the visitor and community centres
  P.cypress(pub, 22.0, 9.4, { s: 0.9 });
  P.roundTree(pub, 16.0, 13.5, { s: 0.85 }); P.bush(pub, 9.6, 13.6, 0.32); P.bush(pub, 15.6, 9.6, 0.3);
  P.dumpster(pub, 16.5, 9.0, Math.PI / 2, bins);
  assembly.push({ object: meshOf(pub), type: 'rise', delay: 0.15 });

  // Resident Quarter (south-west)
  const res = new Builder();
  lotSlab(res, -22.0, 7.0, -3.0, 8.75, C.grass, 0.5, 0.035);
  P.playground(res, -5.7, 7.9);
  for (const [x, z] of [[-21.2, 7.9], [-16.0, 7.85], [-12.4, 7.8]]) P.olive(res, x, z, { y: LOT + 0.035, s: 0.85 });
  P.cypress(res, -9.4, 7.6, { y: LOT + 0.035 }); P.cypress(res, -8.7, 8.1, { y: LOT + 0.035, s: 0.8 });
  P.bench(res, -18.6, 7.4, 0); P.bench(res, -14.2, 8.25, Math.PI);
  P.flowerBed(res, -10.8, 7.85, 0.9, 0.45);
  P.dumpster(res, -3.6, 7.7, Math.PI / 2, bins);
  P.bush(res, -16.2, 13.9, 0.3); P.bush(res, -8.6, 13.9, 0.32); P.bush(res, -3.3, 8.9, 0.3);
  assembly.push({ object: meshOf(res), type: 'rise', delay: 0.3 });

  // Municipal District (north-east)
  const mun = new Builder();
  lotSlab(mun, 8.0, -8.6, 17.0, -3.0, '#efe6d6', 0.3, 0.02);
  for (let x = 8.6; x < 17; x += 1.1) mun.box(0.03, 0.006, 5.5, '#ddd0ba', x, LOT + 0.02, -5.8);
  for (let z = -8.2; z < -3; z += 1.1) mun.box(8.9, 0.006, 0.03, '#ddd0ba', 12.5, LOT + 0.02, z);
  P.fountain(mun, 12.5, -5.25, 1.05, { y: LOT + 0.02 });
  for (const [x, z] of [[8.6, -4.0], [8.6, -5.5], [16.4, -4.0], [16.4, -5.5]]) P.flagpole(mun, x, z, z < -5 ? C.orange : C.teal, { h: 2.8 });
  for (const [x, z] of [[8.6, -8.0], [16.4, -8.0]]) { P.planter(mun, x, z, 0.8, 0.8, C.leaf3); P.roundTree(mun, x, z, { y: LOT + 0.34, s: 0.7 }); }
  P.bench(mun, 10.0, -5.4, Math.PI / 2); P.bench(mun, 15.0, -5.4, -Math.PI / 2);
  lotSlab(mun, 17.8, -3.3, 21.6, -1.72, '#46525a', 0.1, 0.02);
  P.cypress(mun, 7.9, -9.4, { s: 0.85 }); P.cypress(mun, 7.9, -12.8, { s: 0.85 }); P.olive(mun, 3.6, -7.6, { s: 0.75 });
  P.roundTree(mun, 17.2, -8.6, { s: 0.7 }); P.bush(mun, 22.0, -8.4, 0.3);
  P.dumpster(mun, 17.2, -13.5, Math.PI / 2, bins);
  assembly.push({ object: meshOf(mun), type: 'rise', delay: 0.05 });

  // Civic Services (north-west)
  const civ = new Builder();
  lotSlab(civ, -22.0, -9.5, -3.0, -8.05, C.grass, 0.4, 0.03);
  civ.box(18.6, 0.012, 0.5, C.paving, -12.5, LOT + 0.03, -8.75);
  for (const x of [-19.8, -13.4, -6.8]) P.olive(civ, x, -8.75, { y: LOT + 0.03, s: 0.75 });
  P.bench(civ, -16.6, -8.4, Math.PI); P.bench(civ, -9.6, -9.1, 0);
  P.cypress(civ, -15.35, -5.2, { s: 0.85 }); P.cypress(civ, -9.2, -5.4, { s: 0.85 });
  P.dumpster(civ, -21.4, -8.5, Math.PI / 2, bins);
  P.flowerBed(civ, -3.6, -9.0, 0.6, 0.6);
  assembly.push({ object: meshOf(civ), type: 'rise', delay: 0.4 });

  // --- City edge: mosque, neighbourhood houses, olive grove, palms ---------------------------
  const edge = new Builder();
  mosque(edge, -28.6, -20.6);
  const north = [[-20.6, 4.6, 3], [-14.2, 4.8, 2], [-8.0, 4.4, 4], [-1.8, 5.0, 3], [5.6, 4.6, 2], [11.8, 5.2, 4], [18.2, 4.4, 3]];
  north.forEach(([x, w, f], i) => filler(edge, x, -22.4, w, 3.4, f, 0, R, { y: 0, tanks: i % 3, laundry: i === 2 }));
  const west = [[-12.5, 4.6, 3], [-6.2, 4.0, 2], [3.4, 4.6, 4], [9.8, 4.4, 2], [15.6, 4.2, 3]];
  west.forEach(([z, w, f], i) => filler(edge, -30.4, z, w, 3.4, f, Math.PI / 2, R, { y: 0, tanks: (i + 1) % 3 }));
  for (const [x, z] of [[24.0, -22.2], [29.4, -16], [-30.5, 19.5], [-29.8, -1.6], [2.0, -22.8], [-24.6, -22.3]]) P.cypress(edge, x, z, { y: 0, s: 1.1 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) P.olive(edge, 28.9 + i * 1.6, -10 + j * 3.4 + (i % 2) * 1.4, { y: 0, s: 0.85 });
  for (const x of [-24, -18, -12, -2, 4, 10, 22, 27]) P.palm(edge, x, 21.6 + (Math.abs(x) % 3) * 0.3, { y: 0, s: 1.05, lean: (x % 2 ? 0.14 : -0.1) });
  for (const x of [-21, -15, 1, 13, 19]) P.roundTree(edge, x, 23.0, { y: 0, s: 1.0, tint: x & 1 });
  P.billboard(edge, 28.6, 21.4, Math.PI / 4, k.custom('billboard'));
  P.bench(edge, -3.5, 20.6, Math.PI, { y: 0 }); P.bench(edge, 15.4, 20.6, Math.PI, { y: 0 });
  assembly.push({ object: meshOf(edge), type: 'rise', delay: 0.5 });

  // --- Landmark buildings ------------------------------------------------------------------
  const places = PLACES.map((place, i) => {
    const f = footprint(place), b = new Builder(), before = k.dynamic.length;
    const top = LANDMARKS[place.id](b, f.w, f.d, k);
    const mesh = b.toMesh({ ...mats, solid: mats.solid.clone() }, ['solid', 'facet', 'foliage', 'glass', 'lamp', 'water', 'metal', 'sign'], { dynamic: true });
    mesh.position.set(f.cx, LOT, f.cz); mesh.rotation.y = f.ry; mesh.updateMatrix();
    mesh.userData.place = place;
    root.add(mesh);
    const toWorld = (lx, ly, lz) => new THREE.Vector3(f.cx + lx * Math.cos(f.ry) + lz * Math.sin(f.ry), LOT + ly, f.cz - lx * Math.sin(f.ry) + lz * Math.cos(f.ry));
    for (let j = before; j < k.dynamic.length; j++) { const d = k.dynamic[j]; d.world = toWorld(...d.local); d.ry = (d.ry ?? 0) + f.ry; d.place = place.id; }
    const center = new THREE.Vector3(f.cx, LOT, f.cz);
    const ex = place.box[2] - place.box[0], ez = place.box[3] - place.box[1];
    // Invisible pick volume slightly larger than the footprint.
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(ex + 0.6, top + 0.4, ez + 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.set(f.cx, LOT + top / 2, f.cz); proxy.userData.place = place; proxy.updateMatrixWorld();
    root.add(proxy);
    assembly.push({ object: mesh, type: 'grow', delay: 0.35 + i * 0.045 + R() * 0.12 });
    return { ...place, district: DISTRICTS[place.district], mesh, proxy, center, top, size: [ex, ez], label: new THREE.Vector3(f.cx, LOT + top + 0.4, f.cz) };
  });
  atlas.refresh();

  // --- Highlights, animated details --------------------------------------------------------
  const hover = createHighlight(), select = createHighlight();
  root.add(hover.mesh, select.mesh);
  const dyn = createDynamics(k.dynamic, root);
  const bounds = { x0: -RING.hx - 3, x1: RING.hx + 3, z0: -RING.hz - 3, z1: RING.hz + 3 };

  function update(time, dt, env = {}) {
    mats.uniforms.uTime.value = time;
    mats.uniforms.uNight.value = env.night ?? 0;
    mats.lamp.emissiveIntensity = 0.05 + (env.night ?? 0) * 2.4;
    hover.update(time, dt); select.update(time, dt);
    dyn.update(time, dt, env);
  }
  function dispose() {
    const seen = new Set();
    root.traverse((o) => { if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); } const list = Array.isArray(o.material) ? o.material : [o.material]; list.forEach((m) => m && !seen.has(m) && (seen.add(m), m.dispose())); });
    atlas.texture.dispose();
  }
  return { root, net, mats, atlas, places, lamps, bins, heads, signalLamps, assembly, hover, select, dyn, bounds, update, dispose, baseMesh };
}

// A soft rounded-rectangle outline drawn under a building on hover/selection.
function createHighlight() {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    uniforms: { uColor: { value: new THREE.Color('#087f80') }, uSize: { value: new THREE.Vector2(4, 4) }, uTime: { value: 0 }, uAlpha: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uColor; uniform vec2 uSize; uniform float uTime; uniform float uAlpha; varying vec2 vUv;
      float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main(){
        vec2 p = (vUv - 0.5) * uSize;
        float d = sdBox(p, uSize * 0.5 - 0.7, 0.55);
        float line = smoothstep(0.1, 0.0, abs(d)) * 0.95;
        float glow = d > 0.0 ? exp(-d * 4.0) * 0.45 : 0.18;
        float pulse = 0.82 + 0.18 * sin(uTime * 3.2);
        gl_FragColor = vec4(uColor, (line + glow * pulse) * uAlpha);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 2;
  let target = 0, alpha = 0;
  return {
    mesh,
    show(place, color) {
      if (!place) { target = 0; return; }
      const [ex, ez] = place.size, w = ex + 1.6, h = ez + 1.6;
      mesh.scale.set(w, h, 1); material.uniforms.uSize.value.set(w, h);
      mesh.position.set(place.center.x, LOT + 0.05, place.center.z);
      material.uniforms.uColor.value.set(color || place.district.color);
      target = 1; mesh.visible = true;
    },
    update(time, dt) {
      alpha += (target - alpha) * Math.min(1, dt * 10);
      material.uniforms.uAlpha.value = alpha; material.uniforms.uTime.value = time;
      mesh.visible = alpha > 0.01;
    },
  };
}

// Clock hands, radar dishes, beacons and the notification bell.
function createDynamics(list, root) {
  const dark = new THREE.MeshStandardMaterial({ color: '#2c3a40', roughness: 0.5 });
  const faces = list.filter((d) => d.type === 'clockface');
  const hand = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const hands = new THREE.InstancedMesh(hand, dark, Math.max(1, faces.length * 2));
  hands.count = faces.length * 2; root.add(hands);
  const radars = list.filter((d) => d.type === 'radar').map((d) => {
    const g = new THREE.Group(); g.position.copy(d.world);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#eef1ef', roughness: 0.4, side: THREE.DoubleSide }));
    dish.scale.set(1, 0.35, 1); dish.rotation.x = -1.2; dish.position.set(0, 0.45, 0.05);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.45, 8), dark); post.position.y = 0.22;
    g.add(dish, post); dish.castShadow = true; root.add(g); return g;
  });
  const beaconList = list.filter((d) => d.type === 'beacon');
  const beacons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), Math.max(1, beaconList.length));
  beacons.count = beaconList.length; root.add(beacons);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  beaconList.forEach((d, i) => { m.makeTranslation(d.world.x, d.world.y, d.world.z); beacons.setMatrixAt(i, m); });
  const bells = list.filter((d) => d.type === 'bell').map((d) => {
    const pivot = new THREE.Group(); pivot.position.copy(d.world);
    const gold = new THREE.MeshStandardMaterial({ color: '#e2b64a', roughness: 0.35, metalness: 0.6 });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.5, 16, 1, true), gold); shell.position.y = -0.38;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold); cap.position.y = -0.13;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 20), gold); lip.rotation.x = Math.PI / 2; lip.position.y = -0.63;
    shell.castShadow = cap.castShadow = true;
    pivot.add(shell, cap, lip); root.add(pivot);
    return { pivot, ring: 0 };
  });
  const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  return {
    bells, ring() { bells.forEach((b) => (b.ring = 1)); },
    update(time, dt, env) {
      const minutes = env.clock ?? (time * 2 + 9 * 60);
      const hourA = ((minutes / 60) % 12) / 12 * Math.PI * 2, minA = ((minutes % 60) / 60) * Math.PI * 2;
      faces.forEach((f, i) => {
        for (const [j, angle, len, wid] of [[0, hourA, 0.3, 0.06], [1, minA, 0.44, 0.045]]) {
          e.set(0, f.ry, -angle, 'YXZ'); q.setFromEuler(e);
          s.set(wid, len, 0.02); p.copy(f.world);
          m.compose(p, q, s); hands.setMatrixAt(i * 2 + j, m);
        }
      });
      hands.instanceMatrix.needsUpdate = true;
      radars.forEach((g, i) => { g.rotation.y = time * 0.9 + i; });
      const night = env.night ?? 0;
      beaconList.forEach((d, i) => { const on = (Math.sin(time * 5 + i * 2) > 0.2) ? 1 : 0.25; col.setRGB(1, 0.55 + 0.1 * on, 0.15).multiplyScalar(0.35 + on * (0.8 + night)); beacons.setColorAt(i, col); });
      if (beacons.instanceColor) beacons.instanceColor.needsUpdate = true;
      bells.forEach((b) => { b.ring = Math.max(0, b.ring - dt * 0.35); b.pivot.rotation.z = Math.sin(time * 7) * 0.45 * b.ring + Math.sin(time * 0.8) * 0.03; });
    },
  };
}
