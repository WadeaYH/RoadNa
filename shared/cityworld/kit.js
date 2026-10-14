import * as THREE from './three.js';

// Shared art kit: palette, deterministic randomness, cached primitive geometry and a
// builder that bakes many small vertex-coloured pieces into a few draw calls.

export const UP = new THREE.Vector3(0, 1, 0);

export const C = {
  teal: '#087f80', tealDeep: '#075f60', tealSoft: '#3e9c98', tealGlass: '#2f6f73',
  mint: '#ddf5f0', mintDeep: '#b9e3d8', white: '#fafaf6', paper: '#fffdf8',
  road: '#303b42', roadEdge: '#3a464d', roadLine: '#f2efe3', roadPatch: '#262f35',
  orange: '#f6a649', orangeDeep: '#e0862f', red: '#d9564a', yellow: '#f4c54f',
  stone: '#ecdfc8', stone2: '#e3d1b2', stone3: '#d8c19d', stone4: '#f4ebdc', stoneDark: '#c4ab86', stoneWarm: '#e8cfaa',
  sidewalk: '#ebe3d4', curb: '#d6ccb9', paving: '#e4d8c3', pavingDark: '#d3c4a9',
  grass: '#a8c795', grassDeep: '#8fb57f', grassLight: '#bfd8a8', soil: '#b99a76', base: '#d9c6a6', baseDark: '#c2aa86',
  glass: '#4a6f7c', glassDeep: '#36575f', frame: '#faf6ec',
  terracotta: '#c8775a', sage: '#8ea987', olive: '#8f9f78', oliveDark: '#77895f',
  leaf: '#78a46b', leaf2: '#93ba7c', leaf3: '#5d8c64', cypress: '#4f7d5b', palm: '#6f9c5a',
  trunk: '#8b6a50', wood: '#b58a62', woodDark: '#8d6748',
  metal: '#5d6d70', metalDark: '#3c4a4d', tank: '#2f3b3e', tankWhite: '#e9ecea', solar: '#2f4f66',
  pink: '#d9468a', water: '#7fcfd6', skin: ['#e8bd98', '#c99673', '#a87657', '#f1cfae'],
};

export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  return next;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const ramp = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
export const ease = (v, a, b) => smooth(ramp(v, a, b));
export const easeOutBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// ---------------------------------------------------------------------------------------
// Primitive geometry cache. Everything is non-indexed so it can be appended directly.
const cache = new Map();
function cached(key, make) {
  let g = cache.get(key);
  if (!g) {
    g = make();
    if (g.index) { const flat = g.toNonIndexed(); g.dispose(); g = flat; }
    if (!g.attributes.normal) g.computeVertexNormals();
    cache.set(key, g);
  }
  return g;
}
export function disposeKit() { cache.forEach((g) => g.dispose()); cache.clear(); }

function roundedBox(w, h, d, r) {
  const n = 3;
  r = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const g = new THREE.BoxGeometry(1, 1, 1, n, n, n).toNonIndexed();
  const p = g.attributes.position.array, nr = g.attributes.normal.array;
  const half = 0.5 / n, bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r, v = new THREE.Vector3();
  for (let i = 0; i < p.length; i += 3) {
    const sx = Math.sign(p[i]), sy = Math.sign(p[i + 1]), sz = Math.sign(p[i + 2]);
    v.set(p[i] - sx * half, p[i + 1] - sy * half, p[i + 2] - sz * half).normalize();
    p[i] = bx * sx + v.x * r; p[i + 1] = by * sy + v.y * r; p[i + 2] = bz * sz + v.z * r;
    nr[i] = v.x; nr[i + 1] = v.y; nr[i + 2] = v.z;
  }
  return g;
}

const k3 = (n) => n.toFixed(3);
export const geo = {
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)),
  rbox: (w, h, d, r) => cached(`rbox:${k3(w)}:${k3(h)}:${k3(d)}:${k3(r)}`, () => roundedBox(w, h, d, r).translate(0, h / 2, 0)),
  cyl: (top = 1, seg = 10) => cached(`cyl:${k3(top)}:${seg}`, () => new THREE.CylinderGeometry(top, 1, 1, seg).translate(0, 0.5, 0)),
  ico: (detail = 1) => cached(`ico:${detail}`, () => new THREE.IcosahedronGeometry(1, detail)),
  sphere: (w = 16, h = 10) => cached(`sph:${w}:${h}`, () => new THREE.SphereGeometry(1, w, h)),
  dome: (seg = 18) => cached(`dome:${seg}`, () => new THREE.SphereGeometry(1, seg, Math.ceil(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2)),
  torus: (ratio = 0.15, seg = 24) => cached(`tor:${k3(ratio)}:${seg}`, () => new THREE.TorusGeometry(1, ratio, 6, seg)),
  plane: () => cached('plane', () => new THREE.PlaneGeometry(1, 1)),
};

// Shapes are authored in world x/z. Extruded slabs grow upward from y.
export function roundedRectShape(x0, z0, x1, z1, radii = 0.4) {
  const [a, b, c, d] = Array.isArray(radii) ? radii : [radii, radii, radii, radii]; // nw, ne, se, sw
  const s = new THREE.Shape();
  const P = (x, z) => [x, -z];
  s.moveTo(...P(x0 + a, z0));
  s.lineTo(...P(x1 - b, z0)); if (b) s.quadraticCurveTo(...P(x1, z0), ...P(x1, z0 + b));
  s.lineTo(...P(x1, z1 - c)); if (c) s.quadraticCurveTo(...P(x1, z1), ...P(x1 - c, z1));
  s.lineTo(...P(x0 + d, z1)); if (d) s.quadraticCurveTo(...P(x0, z1), ...P(x0, z1 - d));
  s.lineTo(...P(x0, z0 + a)); if (a) s.quadraticCurveTo(...P(x0, z0), ...P(x0 + a, z0));
  return s;
}
export function arcRectShape(hx, hz, r, cx = 0, cz = 0, seg = 10) {
  // A rounded rectangle with true circular corners (used for the ring road).
  const s = new THREE.Shape(), pts = [];
  const corner = (ax, az, start) => { for (let i = 0; i <= seg; i++) { const t = start + (i / seg) * Math.PI / 2; pts.push([ax + Math.cos(t) * r, az + Math.sin(t) * r]); } };
  corner(cx + hx - r, cz + hz - r, 0); corner(cx - hx + r, cz + hz - r, Math.PI / 2);
  corner(cx - hx + r, cz - hz + r, Math.PI); corner(cx + hx - r, cz - hz + r, Math.PI * 1.5);
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}

// ---------------------------------------------------------------------------------------
const _M = new THREE.Matrix4(), _L = new THREE.Matrix4(), _N = new THREE.Matrix3(), _V = new THREE.Vector3();
const _Q = new THREE.Quaternion(), _E = new THREE.Euler(), _S = new THREE.Vector3(), _P = new THREE.Vector3(), _C = new THREE.Color();

export class Builder {
  constructor() { this.buckets = new Map(); this.matrix = new THREE.Matrix4(); this.stack = []; }
  push(x = 0, y = 0, z = 0, ry = 0, s = 1) {
    this.stack.push(this.matrix.clone());
    _L.compose(_P.set(x, y, z), _Q.setFromAxisAngle(UP, ry), _S.set(s, s, s));
    this.matrix.multiply(_L);
    return this;
  }
  pop() { this.matrix.copy(this.stack.pop()); return this; }
  local(x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    _E.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _Q.setFromEuler(_E);
    return _L.compose(_P.set(x, y, z), _Q, _S.set(sx, sy, sz));
  }
  bucket(kind) {
    let b = this.buckets.get(kind);
    if (!b) { b = { pos: [], nor: [], col: [], uv: [], ext: [] }; this.buckets.set(kind, b); }
    return b;
  }
  add(geometry, color, local, o = {}) {
    const b = this.bucket(o.kind || 'solid');
    _M.multiplyMatrices(this.matrix, local); _N.getNormalMatrix(_M);
    const P = geometry.attributes.position.array, N = geometry.attributes.normal.array, U = geometry.attributes.uv?.array;
    _C.set(color);
    const { r, g } = _C, bl = _C.b, ext = o.ext ?? 0, uv = o.uv;
    for (let i = 0, j = 0; i < P.length; i += 3, j += 2) {
      _V.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(_M); b.pos.push(_V.x, _V.y, _V.z);
      _V.set(N[i], N[i + 1], N[i + 2]).applyMatrix3(_N).normalize(); b.nor.push(_V.x, _V.y, _V.z);
      b.col.push(r, g, bl);
      if (uv && U) b.uv.push(uv[0] + U[j] * (uv[2] - uv[0]), uv[1] + U[j + 1] * (uv[3] - uv[1])); else b.uv.push(0, 0);
      b.ext.push(ext);
    }
    return this;
  }
  // Boxes and cylinders are positioned by the centre of their base.
  box(w, h, d, color, x = 0, y = 0, z = 0, o = {}) {
    if (o.r) return this.add(geo.rbox(w, h, d, o.r), color, this.local(x, y, z, 1, 1, 1, o.rx, o.ry, o.rz), o);
    return this.add(geo.box(), color, this.local(x, y, z, w, h, d, o.rx, o.ry, o.rz), o);
  }
  cyl(r, h, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(geo.cyl(o.top ?? 1, o.seg ?? 10), color, this.local(x, y, z, r * (o.sx ?? 1), h, r * (o.sz ?? 1), o.rx, o.ry, o.rz), o);
  }
  cone(r, h, color, x = 0, y = 0, z = 0, o = {}) { return this.cyl(r, h, color, x, y, z, { ...o, top: 0 }); }
  // Balls, domes and tori are positioned by their centre.
  ball(r, color, x = 0, y = 0, z = 0, o = {}) {
    const g = o.smooth ? geo.sphere(o.w ?? 14, o.h ?? 9) : geo.ico(o.detail ?? 1);
    return this.add(g, color, this.local(x, y, z, r * (o.sx ?? 1), r * (o.sy ?? 1), r * (o.sz ?? 1), o.rx, o.ry, o.rz), o);
  }
  dome(r, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(geo.dome(o.seg ?? 18), color, this.local(x, y, z, r, r * (o.sy ?? 1), r, o.rx, o.ry, o.rz), o);
  }
  torus(R, tube, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(geo.torus(tube / R, o.seg ?? 24), color, this.local(x, y, z, R, R, R, o.rx, o.ry, o.rz), o);
  }
  // A textured quad facing +z (before rotation). Used with the sign atlas.
  quad(w, h, x, y, z, uv, o = {}) {
    return this.add(geo.plane(), '#ffffff', this.local(x, y, z, w, h, 1, o.rx, o.ry, o.rz), { ...o, kind: o.kind || 'sign', uv });
  }
  slab(shape, h, color, y = 0, o = {}) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: !!o.bevel, bevelSize: o.bevel || 0, bevelThickness: o.bevel || 0, bevelSegments: 2, curveSegments: o.curve ?? 8 });
    g.rotateX(-Math.PI / 2);
    const flat = g.index ? g.toNonIndexed() : g;
    this.add(flat, color, this.local(0, y, 0, 1, 1, 1), o);
    flat.dispose(); g.dispose();
    return this;
  }
  geometry(geometry, color, x = 0, y = 0, z = 0, o = {}) {
    return this.add(geometry, color, this.local(x, y, z, o.sx ?? 1, o.sy ?? 1, o.sz ?? 1, o.rx, o.ry, o.rz), o);
  }
  get empty() { for (const b of this.buckets.values()) if (b.pos.length) return false; return true; }
  toGeometry(order) {
    const kinds = (order || [...this.buckets.keys()]).filter((k) => this.buckets.get(k)?.pos.length);
    let total = 0; for (const k of kinds) total += this.buckets.get(k).pos.length / 3;
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), uv = new Float32Array(total * 2), ext = new Float32Array(total);
    const geometry = new THREE.BufferGeometry();
    let offset = 0;
    kinds.forEach((k, i) => {
      const b = this.buckets.get(k), n = b.pos.length / 3;
      pos.set(b.pos, offset * 3); nor.set(b.nor, offset * 3); col.set(b.col, offset * 3); uv.set(b.uv, offset * 2); ext.set(b.ext, offset);
      geometry.addGroup(offset, n, i); offset += n;
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geometry.setAttribute('aExt', new THREE.BufferAttribute(ext, 1));
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return { geometry, kinds };
  }
  toMesh(materials, order, o = {}) {
    const { geometry, kinds } = this.toGeometry(order);
    if (!kinds.length) { geometry.dispose(); return null; }
    const mats = kinds.map((k) => materials[k] || materials.solid);
    const mesh = new THREE.Mesh(geometry, mats.length === 1 ? mats[0] : mats);
    if (mats.length === 1) geometry.clearGroups();
    mesh.castShadow = o.cast ?? true; mesh.receiveShadow = o.receive ?? true;
    mesh.matrixAutoUpdate = o.dynamic ?? false; mesh.updateMatrix();
    return mesh;
  }
}

// ---------------------------------------------------------------------------------------
// Materials. A few shader patches add wind to foliage and lights to windows at night.
export function createMaterials(signTexture) {
  const uniforms = { uTime: { value: 0 }, uNight: { value: 0 } };
  const patch = (material, mode) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uNight = uniforms.uNight;
      shader.vertexShader = 'attribute float aExt;\nvarying float vExt;\nuniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vExt = aExt;
        ${mode === 'sway' ? `vec4 swayW = modelMatrix * vec4(transformed, 1.0);
        float swayP = swayW.x * .31 + swayW.z * .23;
        transformed.x += sin(uTime * 1.35 + swayP) * .05 * aExt;
        transformed.z += cos(uTime * 1.07 + swayP * 1.3) * .035 * aExt;` : ''}`);
      shader.fragmentShader = 'varying float vExt;\nuniform float uNight;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${mode === 'glass' ? 'totalEmissiveRadiance += vec3(1.0, .72, .40) * vExt * uNight * 1.45 + vec3(.05, .09, .13) * uNight;' : ''}
        ${mode === 'sign' ? 'totalEmissiveRadiance += diffuseColor.rgb * uNight * .55;' : ''}`);
    };
    material.customProgramCacheKey = () => 'roadna-' + mode;
    return material;
  };
  const m = {
    uniforms,
    solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }),
    glass: patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.3, envMapIntensity: 1.35 }), 'glass'),
    foliage: patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }), 'sway'),
    facet: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
    lamp: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: '#ffcf87', emissiveIntensity: 0.05 }),
    water: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.06, metalness: 0.15, envMapIntensity: 1.6 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.55 }),
    sign: patch(new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.7 }), 'sign'),
  };
  return m;
}
