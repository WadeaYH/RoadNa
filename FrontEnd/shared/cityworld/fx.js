import * as THREE from './three.js';
import { C } from './kit.js';

// Pooled particles, ground ripples, lamp glows and the RoadNa location pin.
const PALETTES = {
  dust: ['#c9b796', '#b8a585', '#d8cbb0'],
  sparkle: ['#f6c54f', '#ffffff', '#3ec4b8', '#f6a649'],
  confetti: ['#087f80', '#f6a649', '#f4c54f', '#d9468a', '#9bd3c7', '#4f78a8'],
  splash: ['#9fdbe2', '#d8f4f7', '#7fcfd6'],
  steam: ['#f3efe6', '#e2ded4'],
  stink: ['#b7c48a', '#a3b27a'],
  smoke: ['#9aa3a3', '#c3c8c6'],
};

export function createFx(root) {
  const MAX = 900;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), size = new Float32Array(MAX), alpha = new Float32Array(MAX), shape = new Float32Array(MAX);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aShape', new THREE.BufferAttribute(shape, 1).setUsage(THREE.DynamicDrawUsage));
  const uniforms = { uScale: { value: 800 } };
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms,
    vertexShader: `attribute float aSize; attribute float aAlpha; attribute float aShape; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha; varying float vShape; uniform float uScale;
      void main(){ vColor = aColor; vAlpha = aAlpha; vShape = aShape; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha; varying float vShape;
      void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
        float a = vShape < 0.5 ? smoothstep(0.5, 0.12, d) : vShape < 1.5 ? step(max(abs(p.x) * 1.0, abs(p.y) * 1.7), 0.32) : smoothstep(0.5, 0.0, d) * (0.6 + 0.4 * step(min(abs(p.x), abs(p.y)), 0.06));
        if (a * vAlpha < 0.01) discard;
        gl_FragColor = vec4(vColor, a * vAlpha);
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false; points.renderOrder = 5;
  root.add(points);
  const P = Array.from({ length: MAX }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, g: 0, drag: 0, s0: 0, s1: 0, a0: 1, spin: 0 }));
  const tmpC = new THREE.Color();
  let cursor = 0;

  function emit(type, x, y, z, n = 10, o = {}) {
    const pal = PALETTES[type] || PALETTES.dust;
    for (let k = 0; k < n; k++) {
      let i = cursor; cursor = (cursor + 1) % MAX;
      const p = P[i], a = Math.random() * Math.PI * 2, r = Math.random();
      p.on = true; p.x = x; p.y = y; p.z = z; p.life = 0;
      const spread = o.spread ?? 1;
      if (type === 'dust' || type === 'smoke') { p.vx = Math.cos(a) * r * 0.7 * spread; p.vz = Math.sin(a) * r * 0.7 * spread; p.vy = 0.25 + Math.random() * 0.5; p.g = -0.15; p.drag = 1.8; p.max = 0.9 + Math.random() * 0.7; p.s0 = 0.3; p.s1 = 0.95; p.a0 = 0.65; shape[i] = 0; }
      else if (type === 'sparkle') { p.vx = Math.cos(a) * r * 1.6 * spread; p.vz = Math.sin(a) * r * 1.6 * spread; p.vy = 2.2 + Math.random() * 2.2; p.g = 5.5; p.drag = 0.8; p.max = 0.9 + Math.random() * 0.5; p.s0 = 0.24; p.s1 = 0.05; p.a0 = 1; shape[i] = 2; }
      else if (type === 'confetti') { p.vx = Math.cos(a) * r * 2.2 * spread; p.vz = Math.sin(a) * r * 2.2 * spread; p.vy = 3 + Math.random() * 2.5; p.g = 5.5; p.drag = 1.6; p.max = 1.8 + Math.random() * 0.8; p.s0 = 0.16; p.s1 = 0.14; p.a0 = 1; shape[i] = 1; }
      else if (type === 'splash') { p.vx = Math.cos(a) * r * 1.2; p.vz = Math.sin(a) * r * 1.2; p.vy = 1.2 + Math.random(); p.g = 7; p.drag = 0.5; p.max = 0.5 + Math.random() * 0.3; p.s0 = 0.12; p.s1 = 0.06; p.a0 = 0.9; shape[i] = 0; }
      else { p.vx = (Math.random() - 0.5) * 0.25; p.vz = (Math.random() - 0.5) * 0.25; p.vy = 0.45 + Math.random() * 0.35; p.g = -0.1; p.drag = 0.6; p.max = 1.3 + Math.random() * 0.6; p.s0 = 0.18; p.s1 = 0.6; p.a0 = type === 'stink' ? 0.45 : 0.6; shape[i] = 0; }
      tmpC.set(pal[(Math.random() * pal.length) | 0]);
      col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
    }
  }

  // Expanding ground rings for pins, repairs and alerts.
  const ringGeo = new THREE.RingGeometry(0.86, 1, 48);
  const rings = Array.from({ length: 10 }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#087f80', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; root.add(m);
    return { m, t: 0, dur: 1, max: 2, on: false };
  });
  let ringCursor = 0;
  function ripple(x, y, z, color = '#087f80', max = 2.4, dur = 1.1) {
    const r = rings[ringCursor]; ringCursor = (ringCursor + 1) % rings.length;
    Object.assign(r, { t: 0, dur, max, on: true }); r.m.material.color.set(color); r.m.position.set(x, y, z); r.m.visible = true;
  }

  function update(dt) {
    for (let i = 0; i < MAX; i++) {
      const p = P[i];
      if (!p.on) { if (alpha[i] !== 0) alpha[i] = 0; continue; }
      p.life += dt;
      const t = p.life / p.max;
      if (t >= 1) { p.on = false; alpha[i] = 0; continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.07 && p.vy < 0) { p.y = 0.07; p.vy *= -0.2; p.vx *= 0.5; p.vz *= 0.5; }
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      size[i] = p.s0 + (p.s1 - p.s0) * t;
      alpha[i] = p.a0 * (t < 0.15 ? t / 0.15 : 1 - Math.pow((t - 0.15) / 0.85, 2));
    }
    for (const a of ['position', 'aColor', 'aSize', 'aAlpha', 'aShape']) geo.attributes[a].needsUpdate = true;
    for (const r of rings) {
      if (!r.on) continue;
      r.t += dt; const t = r.t / r.dur;
      if (t >= 1) { r.on = false; r.m.visible = false; continue; }
      const e = 1 - Math.pow(1 - t, 3);
      r.m.scale.setScalar(0.2 + e * r.max); r.m.material.opacity = (1 - t) * 0.85;
    }
  }
  function setScale(heightPx, fovDeg) { uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2)); }
  return { emit, ripple, update, setScale, points, dispose() { geo.dispose(); material.dispose(); ringGeo.dispose(); rings.forEach((r) => r.m.material.dispose()); } };
}

// Soft additive glows around street lamps; individual lamps can fail and flicker.
export function createGlows(root, lamps) {
  const n = lamps.length, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), a = new Float32Array(n);
  lamps.forEach((l, i) => { pos[i * 3] = l.x; pos[i * 3 + 1] = l.y; pos[i * 3 + 2] = l.z; a[i] = 1; });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(a, 1).setUsage(THREE.DynamicDrawUsage));
  const uniforms = { uScale: { value: 800 }, uNight: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, uniforms,
    vertexShader: 'attribute float aAlpha; varying float vA; uniform float uScale; void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 2.6 * uScale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vA; uniform float uNight; void main(){ float d = length(gl_PointCoord - 0.5); float g = exp(-d * d * 18.0) + exp(-d * 7.0) * 0.25; gl_FragColor = vec4(vec3(1.0, 0.78, 0.45) * g * vA * uNight * 0.9, 1.0); }',
  });
  const pointsObj = new THREE.Points(geo, mat);
  pointsObj.frustumCulled = false; pointsObj.renderOrder = 6;
  root.add(pointsObj);
  // Pools of light on the pavement under each lamp.
  const poolGeo = new THREE.CircleGeometry(1.3, 24);
  const poolMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, uniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform float uNight; void main(){ float d = length(vUv - 0.5) * 2.0; float g = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(vec3(1.0, 0.8, 0.5) * g * g * uNight * 0.35, 1.0); }',
  });
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  lamps.forEach((l, i) => { m4.compose(v.set(l.x, 0.235, l.z), q, s); pools.setMatrixAt(i, m4); });
  pools.frustumCulled = false; pools.renderOrder = 1;
  root.add(pools);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    update(time, night, heightPx, fovDeg) {
      uniforms.uNight.value = night; uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
      pointsObj.visible = pools.visible = night > 0.02;
      let dirty = false;
      lamps.forEach((l, i) => {
        const want = l.broken ? (Math.sin(time * 23 + i) > 0.85 && Math.sin(time * 3.1 + i) > 0.2 ? 0.7 : 0) : 1;
        if (a[i] !== want) { a[i] = want; dirty = true; }
        if (l.broken !== l._wasBroken) { l._wasBroken = l.broken; m4.compose(v.set(l.x, 0.235, l.z), q, s); pools.setMatrixAt(i, l.broken ? zero : m4); pools.instanceMatrix.needsUpdate = true; }
      });
      if (dirty) geo.attributes.aAlpha.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); poolGeo.dispose(); poolMat.dispose(); },
  };
}

// The RoadNa location pin: teal head, white core, soft cone.
export function makePin(color = C.teal, scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1, emissive: color, emissiveIntensity: 0.15 });
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat); head.position.y = 1.15;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.85, 24), mat); tip.rotation.x = Math.PI; tip.position.y = 0.6;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), white); core.position.set(0, 1.18, 0.38); core.scale.set(1, 1, 0.45);
  const core2 = core.clone(); core2.position.z = -0.38;
  for (const m of [head, tip, core, core2]) { m.castShadow = true; g.add(m); }
  g.scale.setScalar(scale);
  g.userData.material = mat;
  return g;
}
