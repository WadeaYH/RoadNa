import * as THREE from './three.js';
import { clamp, lerp, easeOutBack } from './kit.js';
import { buildWorld } from './world.js';
import { createTraffic } from './vehicles.js';
import { createPeople } from './people.js';
import { createFx, createGlows } from './fx.js';
import { createIssues } from './issues.js';
import { createRig } from './camera.js';

// The shared CityWorld engine. Pages add their own story or simulation through hooks.
export async function createEngine(canvas, opts = {}) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 620 || /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
  const quality = opts.quality ?? (small ? 'low' : 'high');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let maxRatio = quality === 'low' ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 300);

  // Image-based light from a soft gradient sky keeps materials gentle and warm.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(envScene(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.75;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight('#fff7ea', '#b8c9b0', 1.0);
  const sun = new THREE.DirectionalLight('#fff0d8', 2.7);
  sun.position.set(-26, 52, 30);
  sun.castShadow = true;
  const sm = quality === 'low' ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 36, bottom: -36, near: 20, far: 135 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035;
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.4);
  fill.position.set(34, 18, -24);
  scene.add(hemi, sun, sun.target, fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: '#2f4038', opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.64; floor.receiveShadow = true;
  scene.add(floor);

  const world = await buildWorld(scene, opts);
  if (opts.storyLanes) for (const id of opts.storyLanes) { const l = world.net.byId.get(id); if (l) l.reserved = true; }
  const traffic = createTraffic(world, opts);
  const people = createPeople(world, { count: opts.people ?? (quality === 'low' ? 16 : 28) });
  const fx = createFx(world.root);
  const glows = createGlows(world.root, world.lamps);
  const issues = createIssues(world, traffic, people, fx);
  const obstacles = world.places.map((p) => ({ x0: p.box[0], z0: p.box[1], x1: p.box[2], z1: p.box[3], top: p.top + 0.2 }));
  const rig = createRig(camera, { ...opts.camera, obstacles, bounds: world.bounds });

  // --- Daylight -----------------------------------------------------------------------------
  const SKY = {
    day: { sun: '#fff0d8', sunI: 2.7, sky: '#fff7ea', ground: '#b8c9b0', hemiI: 1.0, env: 0.75, top: '#f6f4ec', bottom: '#e3eee8' },
    dusk: { sun: '#ffb26a', sunI: 1.7, sky: '#ffe0c2', ground: '#a69a8a', hemiI: 0.8, env: 0.5, top: '#f6dfc4', bottom: '#e8d3cf' },
    night: { sun: '#9bb2e0', sunI: 0.42, sky: '#4a5d86', ground: '#1f2b2c', hemiI: 0.45, env: 0.16, top: '#172235', bottom: '#2a3b50' },
  };
  const ca = new THREE.Color(), cb = new THREE.Color(), cc = new THREE.Color();
  const mix3 = (key, n, w) => { ca.set(SKY.day[key]).lerp(cc.set(SKY.dusk[key]), w); cb.set(SKY.night[key]); return ca.lerp(cb, n); };
  const daylight = { night: 0, warm: 0 };
  let skyListener = null;
  function setDaylight(night, warm = 0) {
    daylight.night = clamp(night, 0, 1); daylight.warm = clamp(warm, 0, 1);
    const n = daylight.night, w = daylight.warm * (1 - n);
    sun.color.copy(mix3('sun', n, w)); sun.intensity = lerp(lerp(SKY.day.sunI, SKY.dusk.sunI, w), SKY.night.sunI, n);
    hemi.color.copy(mix3('sky', n, w)); hemi.groundColor.copy(mix3('ground', n, w)); hemi.intensity = lerp(lerp(SKY.day.hemiI, SKY.dusk.hemiI, w), SKY.night.hemiI, n);
    scene.environmentIntensity = lerp(lerp(SKY.day.env, SKY.dusk.env, w), SKY.night.env, n);
    const lowSun = Math.max(w, n);
    sun.position.set(-26 - lowSun * 16, 52 - lowSun * 24, 30 - lowSun * 6);
    floor.material.opacity = 0.16 * (1 - n * 0.6);
    skyListener?.({ top: cssMix('top', n, w), bottom: cssMix('bottom', n, w), night: n, warm: w });
  }
  // Page backgrounds blend in sRGB so dusk passes through rich blues, not grey.
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function cssMix(key, n, w) {
    const a = hex(SKY.day[key]), b = hex(SKY.dusk[key]), c = hex(SKY.night[key]);
    return '#' + a.map((v, i) => Math.round(lerp(lerp(v, b[i], w), c[i], n)).toString(16).padStart(2, '0')).join('');
  }
  // 0..1440 minutes → night and warmth, with dusk and dawn transitions.
  function daylightFromClock(min) {
    const h = min / 60;
    const night = h >= 19.4 || h < 5.0 ? 1 : h > 17.6 ? (h - 17.6) / 1.8 : h < 6.6 ? 1 - (h - 5.0) / 1.6 : 0;
    const warm = Math.max(0, 1 - Math.abs(h - 18.4) / 1.4) + Math.max(0, 1 - Math.abs(h - 6.0) / 1.2);
    return { night: clamp(night, 0, 1) ** 0.8, warm: clamp(warm, 0, 1) };
  }

  // --- Assembly: the city builds itself when it first appears ------------------------------------
  let assembleStart = -1;
  const items = world.assembly;
  function setAssembly(t) {
    for (const it of items) {
      const k = clamp((t - it.delay) / (it.type === 'grow' ? 0.75 : 0.6), 0, 1);
      if (it.type === 'grow') { const e = k <= 0 ? 0.001 : easeOutBack(k); it.object.scale.set(1, Math.max(0.001, e), 1); it.object.visible = k > 0; }
      else { const e = 1 - Math.pow(1 - k, 3); it.object.position.y = (1 - e) * -2.4; it.object.visible = k > 0; }
      it.object.updateMatrix();
    }
    traffic.group.visible = t > 1.6;
  }
  function assemble(instant = false) { if (instant) { assembleStart = -1; setAssembly(99); } else { assembleStart = time; setAssembly(0); } }

  // --- Sizing, quality and picking ----------------------------------------------------------
  let size = { w: 1, h: 1 };
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    size = { w, h };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
    renderer.setSize(w, h, false);
    rig.resize(w, h);
    fx.setScale(h * renderer.getPixelRatio(), camera.fov);
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.06), hitPoint = new THREE.Vector3();
  function toNdc(cx, cy) { const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function pickPlace(cx, cy) { toNdc(cx, cy); const hit = ray.intersectObjects(world.places.map((p) => p.proxy), false)[0]; return hit ? world.places.find((p) => p.proxy === hit.object) : null; }
  function groundPoint(cx, cy) { toNdc(cx, cy); return ray.ray.intersectPlane(plane, hitPoint) ? hitPoint.clone() : null; }
  const pv = new THREE.Vector3();
  function project(v, out = {}) { pv.copy(v).project(camera); out.x = (pv.x * 0.5 + 0.5) * size.w; out.y = (-pv.y * 0.5 + 0.5) * size.h; out.visible = pv.z < 1 && pv.z > -1; return out; }

  // --- Loop ------------------------------------------------------------------------------------
  const before = new Set(), after = new Set();
  let raf = 0, running = false, last = 0, time = 0, frames = 0, slow = 0, visible = true, onscreen = true;
  const api = {
    renderer, scene, camera, rig, world, traffic, people, fx, glows, issues, quality, small,
    simScale: 1, motion: true, frameCap: quality === 'low' ? 45 : 60, frozen: false,
    get time() { return time; }, get size() { return size; }, get frames() { return frames; }, get daylight() { return daylight; },
    onFrame(fn) { before.add(fn); return () => before.delete(fn); },
    afterFrame(fn) { after.add(fn); return () => after.delete(fn); },
    onSky(fn) { skyListener = fn; setDaylight(daylight.night, daylight.warm); },
    setDaylight, daylightFromClock, assemble, resize, pickPlace, groundPoint, project,
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    renderOnce() { step(1 / 60); },
    // Advance the world without waiting for animation frames (hidden tabs, tests, snapshots).
    advance(seconds, fps = 30) { const n = Math.max(1, Math.round(seconds * fps)); for (let i = 0; i < n; i++) step(1 / fps, i === n - 1); },
    dispose,
  };
  function step(dt, draw = true) {
    if (api.motion && !api.frozen) time += dt;
    const sdt = api.motion && !api.frozen ? dt * api.simScale : 0;
    for (const fn of before) fn(dt, time, sdt);
    if (assembleStart >= 0) { const t = time - assembleStart; setAssembly(t); if (t > 3.2) assembleStart = -1; }
    world.update(time, dt, { night: daylight.night, clock: api.clock });
    traffic.update(sdt, time, daylight.night);
    people.update(sdt, time);
    issues.update(sdt, time);
    fx.update(api.motion ? dt : 0);
    glows.update(time, daylight.night, size.h * renderer.getPixelRatio(), camera.fov);
    rig.update(dt, api.motion);
    fx.setScale(size.h * renderer.getPixelRatio(), camera.fov);
    if (draw) { renderer.render(scene, camera); frames++; }
    for (const fn of after) fn(dt, time);
  }
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!visible || !onscreen) { last = 0; return; }
    const interval = 1000 / api.frameCap;
    if (last && now - last < interval - 1.5) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    // Adaptive resolution: if frames stay slow, render fewer pixels.
    if (last) { const ms = now - last; slow = ms > 1000 / api.frameCap * 1.55 ? slow + 1 : Math.max(0, slow - 2); if (slow > 90 && maxRatio > 1) { maxRatio = Math.max(1, maxRatio - 0.25); slow = 0; resize(); } }
    last = now;
    step(dt);
  }
  const onVisibility = () => { visible = !document.hidden; last = 0; };
  document.addEventListener('visibilitychange', onVisibility);
  const io = new IntersectionObserver((e) => { onscreen = e[0].isIntersecting; last = 0; }, { threshold: 0 });
  io.observe(canvas);
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  function dispose() {
    api.stop(); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVisibility);
    issues.dispose(); traffic.dispose(); people.dispose(); fx.dispose(); glows.dispose(); world.dispose();
    envTex.dispose(); floor.geometry.dispose(); floor.material.dispose(); renderer.dispose();
  }
  resize();
  setDaylight(0, 0);
  return api;
}

function envScene() {
  const s = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color('#fdf7ea') }, mid: { value: new THREE.Color('#e7efe9') }, bottom: { value: new THREE.Color('#9fb39a') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bottom, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }',
  });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat));
  const key = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 3.2, 2.9), side: THREE.DoubleSide }));
  key.position.set(-22, 36, 24); key.lookAt(0, 0, 0); s.add(key);
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.6, 1.8), side: THREE.DoubleSide }));
  rim.position.set(30, 14, -26); rim.lookAt(0, 0, 0); s.add(rim);
  return s;
}
