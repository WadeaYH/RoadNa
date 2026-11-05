// The RoadNa story, directed inside the CityWorld city. Scroll progress drives the camera,
// light, actors and typography; everything is reversible and nothing is stored or sent.
import * as THREE from '../../../../shared/cityworld/three.js';
import { createEngine } from '../../../../shared/cityworld/engine.js';
import { createOverlay } from '../../../../shared/cityworld/overlay.js';
import { makePotholeMesh, makePatchMesh, makeConesMesh } from '../../../../shared/cityworld/issues.js';
import { makePin } from '../../../../shared/cityworld/fx.js';
import { clamp, lerp, ramp, ease } from '../../../../shared/cityworld/kit.js';

const $ = (s, r = document) => r.querySelector(s);
const STORY_LANES = ['C>E', 'E>C', 'C>W', 'W>C', 'C>N', 'N>C', 'C>S', 'S>C'];
const ROAD_Y = 0.06, LANE = 0.85, PARK_Y = 0.245;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const curve = (pts) => new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => V(x, y, z)), false, 'centripetal', 0.5);
const easeOut = (t, k = 2.4) => 1 - Math.pow(1 - clamp(t, 0, 1), k);
const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const bump = (p, a, b) => (p > a && p < b ? Math.sin(((p - a) / (b - a)) * Math.PI) : 0);

// Monotone cubic interpolation keeps camera moves smooth without overshooting holds.
function monotone(xs, ys, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  let i = 0; while (x > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
}

// A hand-tuned dawn for the opening: navy, violet with a peach horizon, morning, day, gold.
const SKY_STOPS = [[0, '#141e31', '#26354b'], [0.045, '#26304f', '#5c4f6e'], [0.08, '#7f8fb8', '#e9b99a'], [0.115, '#f3e6d2', '#f0d9c4'], [0.17, '#f6f4ec', '#e3eee8'], [0.86, '#f6f4ec', '#e3eee8'], [0.95, '#f8ecd8', '#e6ece2']];
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function skyAt(p) {
  let i = 0; while (i < SKY_STOPS.length - 2 && p > SKY_STOPS[i + 1][0]) i++;
  const [p0, t0, b0] = SKY_STOPS[i], [p1, t1, b1] = SKY_STOPS[i + 1], t = clamp((p - p0) / (p1 - p0), 0, 1);
  const mix = (a, b) => '#' + rgb(a).map((v, k) => Math.round(lerp(v, rgb(b)[k], t)).toString(16).padStart(2, '0')).join('');
  return [mix(t0, t1), mix(b0, b1)];
}

export async function mountStory() {
  const story = $('#story'), stage = $('#story-stage'), canvas = $('#story-canvas'), layer = $('#story-layer');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)'), shortQuery = matchMedia('(max-height: 520px)');
  const engine = await createEngine(canvas, { storyLanes: STORY_LANES, camera: { minDist: 4, maxDist: 400 } });
  const { world, traffic, people, rig, fx } = engine;
  const overlay = createOverlay(layer, engine);
  traffic.spawnTraffic(engine.quality === 'low' ? 8 : 12);

  // --- Actors ---------------------------------------------------------------------------------
  const hero = traffic.create('compact', { mode: 'scripted', color: '#087f80' });
  const follow1 = traffic.create('taxi', { mode: 'scripted' });
  const follow2 = traffic.create('sedan', { mode: 'scripted', color: '#e6e8e3' });
  const van = traffic.create('van', { mode: 'scripted' });
  const reporter = people.addScripted({ x: 7.5, z: 2.3, h: 0, mode: 'idle', shirt: '#4f78a8', hat: false });
  reporter.hijab = true; reporter.hairColor.set('#d9a5b3');
  const worker = people.addScripted({ x: 15.9, z: -0.4, h: Math.PI, mode: 'idle', shirt: '#f6a649' });
  worker.scaleTarget = 0; worker.scale = 0;

  const POT = { x: 15.0, z: LANE };
  const pothole = makePotholeMesh(world.mats, 4242, 1.2); pothole.position.set(POT.x, ROAD_Y + 0.001, POT.z); pothole.rotation.y = 0.2; world.root.add(pothole);
  const patch = makePatchMesh(world.mats, 7); patch.position.set(POT.x, ROAD_Y + 0.0006, POT.z); patch.visible = false; world.root.add(patch);
  const cones = makeConesMesh(world.mats, 3); cones.position.set(POT.x, ROAD_Y, POT.z); world.root.add(cones);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#f6a649', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.22, 56), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.set(POT.x, ROAD_Y + 0.02, POT.z); ring.renderOrder = 3; world.root.add(ring);
  const pin = makePin('#087f80', 0.95); pin.visible = false; world.root.add(pin);
  const pinTeal = new THREE.Color('#087f80'), pinGreen = new THREE.Color('#3f9a62');

  // A signal arc from the report to City Hall.
  const hall = world.places.find((p) => p.id === 'hall');
  const arcCurve = new THREE.CubicBezierCurve3(V(POT.x, 2.4, POT.z), V(18.5, 9.5, -0.5), V(16.5, 12, -9), V(hall.center.x, 6.7, hall.center.z - 0.3));
  const arcGeo = new THREE.TubeGeometry(arcCurve, 90, 0.07, 8, false);
  const arcMat = new THREE.MeshBasicMaterial({ color: '#3ec4b8', transparent: true, opacity: 0.95, depthWrite: false });
  const arc = new THREE.Mesh(arcGeo, arcMat); arc.renderOrder = 4; world.root.add(arc);
  const arcCount = arcGeo.index.count;
  const packet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshBasicMaterial({ color: '#d9fffa' })); packet.renderOrder = 5; world.root.add(packet);

  // Paths
  const heroPark = curve([[13.25, ROAD_Y, LANE], [14.7, ROAD_Y, LANE], [15.65, 0.08, 1.2], [16.05, 0.16, 2.3], [16.05, PARK_Y, 3.5], [15.3, PARK_Y, 4.3], [13.8, PARK_Y, 4.4], [12.5, PARK_Y, 4.6], [11.95, PARK_Y, 5.6], [11.9, PARK_Y, 6.95]]);
  const f1Park = curve([[11.2, ROAD_Y, LANE], [13.2, ROAD_Y, LANE], [14.8, ROAD_Y, LANE], [15.65, 0.08, 1.2], [16.05, 0.16, 2.3], [16.05, PARK_Y, 3.5], [15.0, PARK_Y, 4.3], [13.75, PARK_Y, 4.7], [13.35, PARK_Y, 5.7], [13.3, PARK_Y, 6.95]]);
  const f2Park = curve([[9.15, ROAD_Y, LANE], [12.5, ROAD_Y, LANE], [14.8, ROAD_Y, LANE], [15.65, 0.08, 1.2], [16.05, 0.16, 2.3], [16.05, PARK_Y, 3.6], [15.2, PARK_Y, 4.6], [14.75, PARK_Y, 5.6], [14.7, PARK_Y, 6.95]]);
  const vanIn = curve([[18.65, 0.22, -4.2], [18.65, 0.22, -2.9], [18.45, 0.13, -1.75], [17.6, ROAD_Y, -0.95], [16.6, ROAD_Y, -LANE], [15.9, ROAD_Y, -LANE]]);
  const vanOut = curve([[15.9, ROAD_Y, -LANE], [10, ROAD_Y, -LANE], [3.4, ROAD_Y, -LANE], [1.9, ROAD_Y, -1.2], [1.0, ROAD_Y, -2.6], [LANE, ROAD_Y, -6], [LANE, ROAD_Y, -9.6], [1.45, ROAD_Y, -11.0]]);
  const _p = V(0, 0, 0), _t = V(0, 0, 0);
  function onCurve(car, c, t, brakeFrom = 0.8) {
    t = clamp(t, 0, 1); c.getPointAt(t, _p); c.getTangentAt(t, _t);
    car.x = _p.x; car.y = _p.y; car.z = _p.z; car.h = Math.atan2(-_t.z, _t.x); car.brake = t > brakeFrom && t < 1; car.pitch = 0; car.roll = 0;
  }
  function onLane(car, x, braking, pitch = 0) { car.x = x; car.y = ROAD_Y; car.z = LANE; car.h = 0; car.brake = braking; car.pitch = pitch; car.roll = 0; }

  // --- Typography: split words for the scrubbed mask reveal -----------------------------------------
  const chapters = [...document.querySelectorAll('.chapter')];
  for (const ch of chapters) {
    let i = 0;
    for (const el of ch.querySelectorAll('[data-split]')) {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((w, k) => {
        const outer = document.createElement('span'); outer.className = 'w';
        const inner = document.createElement('span'); inner.textContent = w; inner.style.setProperty('--i', String(i++));
        outer.append(inner); el.append(outer);
        if (k < words.length - 1) el.append(' ');
      });
      i += 2;
    }
    ch.style.setProperty('--n', String(i));
  }
  const CH = [{ a: -1, b: 0, c: 0.105, d: 0.15 }, { a: 0.215, b: 0.285, c: 0.385, d: 0.425 }, { a: 0.432, b: 0.48, c: 0.555, d: 0.59 }, { a: 0.6, b: 0.665, c: 0.79, d: 0.825 }, { a: 0.85, b: 0.93, c: 9, d: 9 }];

  const report = $('#story-report'), reportStatus = $('#report-status');
  const reportLines = [...report.querySelectorAll('.report__lines li')], track = [...report.querySelectorAll('.report__track li')];
  const STEPS = [['Received', 0.455], ['In progress', 0.575], ['Fixed', 0.722]];
  const rail = [...document.querySelectorAll('#story-rail a')], railFill = $('#story-rail-fill');
  const labelsNav = $('#story-labels'), labelLinks = [...labelsNav.querySelectorAll('.story-label')];

  // Story bubbles: tiny moments of character.
  const bubble = (who, html, tone, height = 0.98) => {
    const el = document.createElement('div'); el.className = 'story-bubble'; el.dataset.tone = tone || '';
    el.innerHTML = `<span>${html}</span>`;
    const pos = V(0, 0, 0);
    return { el, it: overlay.add(el, () => pos.set(who.x, (who.y ?? 0.22) + height, who.z)) };
  };
  const bubbles = [
    { b: bubble(follow2, '😤 <b>Beep!</b>', 'bad'), from: 0.395, to: 0.43 },
    { b: bubble(follow1, '😟', 'bad'), from: 0.405, to: 0.44 },
    { b: bubble(reporter, '📸 <b>Reporting</b>'), from: 0.44, to: 0.505 },
    { b: bubble(worker, '🛠️ <b>On it</b>'), from: 0.655, to: 0.715 },
    { b: bubble(reporter, '👏 <b>Fixed!</b>', 'good'), from: 0.735, to: 0.79 },
    { b: bubble(hero, '🙂', 'good', 0.95), from: 0.75, to: 0.79 },
  ];

  // --- Landmarks for the final hub -------------------------------------------------------------------
  const pavilion = { id: 'pavilion', name: 'How RoadNa Works', center: V(6.1, 0.22, 11.3), label: V(6.1, 2.9, 11.3), size: [2.6, 2.6], district: { color: '#4f9a6b' }, top: 2.3 };
  const pavilionProxy = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), new THREE.MeshBasicMaterial({ visible: false }));
  pavilionProxy.position.set(6.1, 1.4, 11.3); pavilionProxy.updateMatrixWorld(); world.root.add(pavilionProxy);
  const landmarks = labelLinks.map((a) => {
    const place = a.dataset.landmark === 'pavilion' ? pavilion : world.places.find((p) => p.id === a.dataset.landmark);
    return { a, place, x: 0, y: 0 };
  });
  labelsNav.hidden = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickLandmark(cx, cy) {
    const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, engine.camera);
    const hit = ray.intersectObjects([...landmarks.map((l) => l.place.proxy).filter(Boolean), pavilionProxy], false)[0];
    if (!hit) return null;
    return landmarks.find((l) => (l.place.proxy || pavilionProxy) === hit.object) || null;
  }

  // --- State -----------------------------------------------------------------------------------------
  let hallGlowOn = false, scrolly = false, target = 0, prog = 0, lastP = -1, hubOn = false, hovered = null, leaving = false, introIn = 0, firedHall = false, firedFix = false, firedPin = false;
  const desktop = () => engine.size.w >= 900;
  let forcedReduce = false;
  const reduced = () => forcedReduce || motionQuery.matches;
  function mode() {
    scrolly = !reduced() && !shortQuery.matches;
    story.classList.add('is-ready');
    story.classList.toggle('is-scrolly', scrolly);
    engine.motion = !reduced();
    engine.frameCap = scrolly ? (engine.quality === 'low' ? 45 : 60) : 30;
    if (!scrolly) { target = prog = 1; introIn = 1; }
    if (!engine.motion) engine.assemble(true);
    engine.resize();
  }
  mode();
  motionQuery.addEventListener('change', mode); shortQuery.addEventListener('change', mode);
  const headerHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
  // 0 when the story meets the header, 1 when its end reaches the bottom of the sticky stage.
  function scrollTarget() {
    const travel = story.offsetHeight - stage.offsetHeight;
    return travel > 0 ? clamp((headerHeight() - story.getBoundingClientRect().top) / travel, 0, 1) : 1;
  }
  function scrollToProgress(p) {
    const top = window.scrollY + story.getBoundingClientRect().top, travel = story.offsetHeight - stage.offsetHeight;
    window.scrollTo({ top: top - headerHeight() + travel * p + 2, behavior: motionQuery.matches ? 'auto' : 'smooth' });
  }
  rail.forEach((a) => a.addEventListener('click', (e) => { if (!scrolly) return; e.preventDefault(); scrollToProgress(Number(a.dataset.goto)); }));
  document.querySelectorAll('[data-skip]').forEach((a) => a.addEventListener('click', (e) => { if (!scrolly) return; e.preventDefault(); scrollToProgress(0.985); setTimeout(() => labelLinks[0].focus({ preventScroll: true }), motionQuery.matches ? 0 : 900); }));

  // --- Camera keyframes -----------------------------------------------------------------------------
  function keys() {
    const D = desktop(), sxR = D ? 0.17 : 0, sxC = D ? 0.12 : 0, syM = D ? 0 : 0.14;
    const hx = hero.x + 3.2;
    return [
      [0.0, 1.0, 0, 2.0, 37, 0.32, 1.0, 30, sxR, D ? 0 : 0.16],
      [0.1, 1.5, 0, 1.6, 33, 0.58, 0.9, 30, sxR, D ? 0 : 0.16],
      [0.205, -6.5, 0, 1.4, 15.5, -0.5, 0.56, 34, sxC, syM],
      [0.26, hx, 0.35, LANE - 0.2, 5.2, -1.66, 0.27, 40, sxC, syM],
      [0.335, hx, 0.35, LANE - 0.1, 4.9, -1.5, 0.25, 40, sxC, syM],
      [0.405, 13.0, 0.3, 1.05, 4.4, -1.36, 0.34, 40, sxC, syM],
      [0.47, 14.9, 0.9, 1.0, 5.4, -0.22, 0.66, 38, D ? 0.07 : 0, D ? 0 : 0.02],
      [0.535, 14.4, 3.0, -4.4, 10.5, 0.1, 0.4, 36, D ? 0.07 : 0, D ? 0 : 0.06],
      [0.61, 16.4, 0.2, -1.3, 7.4, -0.55, 0.58, 36, D ? 0.1 : 0, D ? 0 : 0.08],
      [0.685, 15.3, 0.3, 0.45, 4.4, -0.42, 0.47, 40, D ? 0.1 : 0, D ? 0 : 0.08],
      [0.775, 14.0, 0, 3.4, 7.4, -0.3, 0.62, 36, sxC, syM],
      [0.885, 0.5, 0, 1.2, D ? 35.5 : 31, Math.PI / 4, 0.86, 30, sxR, D ? 0.02 : 0.2],
      [1.0, 0.5, 0, 1.2, D ? 35 : 30.5, Math.PI / 4 + 0.07, 0.84, 30, sxR, D ? 0.02 : 0.2],
    ];
  }
  function camera(p, time) {
    const K = keys(), xs = K.map((k) => k[0]);
    const v = (j) => monotone(xs, K.map((k) => k[j]), p);
    const fov = v(7), sx = scrolly ? v(8) : 0, sy = scrolly ? v(9) : 0, drift = engine.motion ? Math.sin(time * 0.12) * 0.035 * (1 - ramp(p, 0.04, 0.12) + ramp(p, 0.9, 1)) : 0;
    // Fit the subject into the space beside the text column, not merely shift it.
    const aspect = (engine.size.w / engine.size.h) * (1 - 2 * Math.abs(sx));
    const dist = rig.fit(v(4), fov, aspect) * (1 + Math.abs(sy) * 0.6);
    rig.set({ target: { x: v(1), y: v(2), z: v(3) }, dist, az: v(5) + drift, el: v(6), fov, sx, sy }, true);
  }

  // --- The directed timeline --------------------------------------------------------------------------
  function direct(p, time, dt) {
    // Light: blue hour, sunrise, bright day, a warm afternoon for the finale.
    const night = p < 0.015 ? 0.88 : lerp(0.88, 0, ease(p, 0.015, 0.13));
    const warm = Math.max(lerp(0.9, 0, ease(p, 0.02, 0.2)), 0.3 * ease(p, 0.84, 0.95));
    if (Math.abs(night - engine.daylight.night) > 0.001 || Math.abs(warm - engine.daylight.warm) > 0.001) engine.setDaylight(night, warm);
    const [skyTop, skyBottom] = skyAt(scrolly ? p : 1);
    stage.style.setProperty('--story-top', skyTop); stage.style.setProperty('--story-bottom', skyBottom);
    stage.classList.toggle('is-dark', scrolly && p < 0.072);

    // Hero car: a slow roll at dawn, the drive, a careful stop, then into the car park.
    if (p < 0.2) onLane(hero, lerp(-22.4, -16, p / 0.2), false);
    else if (p < 0.378) { const t = (p - 0.2) / 0.178; onLane(hero, lerp(-16, 13.25, easeOut(t, 2.2)), t > 0.62, -0.06 * bump(t, 0.86, 1)); }
    else if (p < 0.745) onLane(hero, 13.25, p < 0.42, -0.03 * bump(p, 0.378, 0.395));
    else onCurve(hero, heroPark, easeInOut((p - 0.745) / 0.1), 0.86);
    // Followers queue behind it: the problem spreads.
    const f1x = p < 0.25 ? -24 : lerp(-24, 11.25, easeOut((p - 0.25) / 0.15, 2.3));
    if (p < 0.765) { onLane(follow1, Math.min(f1x, 11.25), p > 0.345 && p < 0.765); follow1.hidden = f1x < -21.6; }
    else { follow1.hidden = false; onCurve(follow1, f1Park, easeInOut((p - 0.765) / 0.105), 0.86); }
    const f2x = p < 0.3 ? -24 : lerp(-24, 9.15, easeOut((p - 0.3) / 0.13, 2.3));
    if (p < 0.785) { onLane(follow2, Math.min(f2x, 9.15), p > 0.385 && p < 0.785); follow2.hidden = f2x < -21.6; }
    else { follow2.hidden = false; onCurve(follow2, f2Park, easeInOut((p - 0.785) / 0.1), 0.86); }
    // Crew van: out of the depot, beside the pothole, then on to the next job.
    van.hidden = p < 0.562;
    van.beacon = p > 0.562 && p < 0.79;
    if (p < 0.628) onCurve(van, vanIn, easeInOut((p - 0.562) / 0.066), 0.75);
    else if (p < 0.775) { onCurve(van, vanIn, 1); van.brake = true; }
    else onCurve(van, vanOut, easeInOut((p - 0.775) / 0.11), 0.9);

    // The resident who reports it.
    const walkIn = ramp(p, 0.22, 0.4);
    reporter.x = lerp(7.5, 14.4, walkIn); reporter.z = 2.32; reporter.moving = engine.motion && walkIn > 0 && walkIn < 1;
    const look = Math.atan2(-(POT.z - reporter.z), POT.x - reporter.x);
    reporter.h = walkIn < 1 ? 0 : look; reporter.phone = p > 0.425 && p < 0.505;
    reporter.mode = p > 0.735 && p < 0.79 ? 'cheer' : 'idle';
    // The crew worker.
    const wv = p > 0.632 && p < 0.758;
    worker.scaleTarget = wv ? 1 : 0; worker.visible = wv;
    const toPot = ramp(p, 0.632, 0.648), back = ramp(p, 0.735, 0.752);
    worker.x = lerp(lerp(15.9, 15.55, toPot), 15.9, back); worker.z = lerp(lerp(-0.45, 0.38, toPot), -0.45, back); worker.y = ROAD_Y;
    worker.moving = engine.motion && ((toPot > 0 && toPot < 1) || (back > 0 && back < 1));
    worker.mode = p > 0.648 && p < 0.735 ? 'worker' : 'idle';
    worker.h = worker.mode === 'worker' ? Math.atan2(-(POT.z - worker.z), POT.x - worker.x) : back > 0 ? Math.atan2(-(-0.45 - worker.z), 15.9 - worker.x) : Math.atan2(-(0.38 + 0.45), 15.55 - 15.9);

    // Pothole, warning ring, cones and the patch.
    const shrink = ramp(p, 0.7, 0.722);
    pothole.visible = shrink < 1; pothole.scale.setScalar(1.2 * (1 - shrink * 0.9));
    patch.visible = p > 0.712; patch.userData.fade.opacity = ramp(p, 0.712, 0.73);
    ringMat.opacity = ramp(p, 0.3, 0.34) * (1 - ramp(p, 0.7, 0.72)) * (0.55 + 0.35 * Math.sin(time * 4));
    ring.scale.setScalar(1 + 0.06 * Math.sin(time * 4));
    const coneK = ramp(p, 0.645, 0.66) * (1 - ramp(p, 0.742, 0.756));
    cones.visible = coneK > 0.01; cones.scale.setScalar(Math.max(0.001, coneK < 1 ? coneK * (1.15 - 0.15 * coneK) : 1));
    if (engine.motion && p > 0.655 && p < 0.715 && Math.random() < dt * 6) fx.emit('dust', POT.x, 0.14, POT.z, 2, { spread: 0.5 });

    // The pin drops, turns green when fixed, then lifts away.
    const drop = ramp(p, 0.432, 0.468), leave = ramp(p, 0.8, 0.84);
    pin.visible = drop > 0 && leave < 1;
    const bounce = drop < 1 ? (1 - easeOut(drop, 3)) * 9 + Math.abs(Math.sin(drop * Math.PI * 2.2)) * (1 - drop) * 1.2 : 0;
    const lift = ease(p, 0.6, 0.65);
    pin.position.set(POT.x, 1.35 + bounce + lift * 1.5 + (engine.motion ? Math.sin(time * 2.2) * 0.08 : 0) + leave * 3, POT.z);
    pin.rotation.y = engine.motion ? time * 0.8 : 0.4;
    pin.scale.setScalar((0.95 - lift * 0.3) * (1 - leave));
    pin.userData.material.color.copy(pinTeal).lerp(pinGreen, ramp(p, 0.712, 0.735));
    pin.userData.material.emissive.copy(pin.userData.material.color);
    // Signal to City Hall.
    const draw = ramp(p, 0.505, 0.555), fade = 1 - ramp(p, 0.575, 0.605);
    arc.visible = draw > 0 && fade > 0; arcMat.opacity = 0.95 * fade;
    arc.geometry.setDrawRange(0, Math.floor((arcCount * draw) / 3) * 3);
    packet.visible = draw > 0 && draw < 1; arcCurve.getPoint(draw, packet.position);
    const hallGlow = bump(p, 0.55, 0.61);
    if (hallGlow > 0 || hallGlowOn) { const hm = Array.isArray(hall.mesh.material) ? hall.mesh.material[0] : hall.mesh.material; hm.emissive.set('#3ec4b8'); hm.emissiveIntensity = hallGlow * 0.35; hallGlowOn = hallGlow > 0; }
    // One-shot effects when moving forward through key beats.
    if (lastP >= 0 && engine.motion) {
      if (!firedPin && lastP < 0.468 && p >= 0.468) { fx.ripple(POT.x, ROAD_Y + 0.03, POT.z, '#087f80', 2.6, 1); firedPin = true; }
      if (!firedHall && lastP < 0.555 && p >= 0.555) { fx.ripple(hall.center.x, 0.3, hall.center.z + 4, '#3ec4b8', 5, 1.4); world.dyn.ring(); firedHall = true; }
      if (!firedFix && lastP < 0.722 && p >= 0.722) { fx.emit('sparkle', POT.x, 0.5, POT.z, 30); fx.emit('confetti', POT.x, 0.6, POT.z, 26, { spread: 0.8 }); fx.ripple(POT.x, ROAD_Y + 0.03, POT.z, '#4f9a6b', 3.2, 1.2); firedFix = true; }
      if (p < 0.45) firedPin = false; if (p < 0.53) firedHall = false; if (p < 0.7) firedFix = false;
    }
    lastP = p;

    // --- DOM: chapters, report card, veil, bars, rail, labels --------------------------------------
    chapters.forEach((ch, i) => {
      const c = CH[i];
      let inn = c.a < 0 ? introIn : ease(p, c.a, c.b);
      if (!scrolly) inn = 1;
      const out = scrolly ? ease(p, c.c, c.d) : 0;
      const live = inn > 0.001 && out < 0.999;
      ch.classList.toggle('is-live', live);
      if (live) { ch.style.setProperty('--in', inn.toFixed(3)); ch.style.setProperty('--out', out.toFixed(3)); }
      ch.inert = !live;
    });
    const show = scrolly ? ease(p, 0.442, 0.47) * (1 - ease(p, 0.79, 0.825)) : 1;
    report.style.setProperty('--show', show.toFixed(3));
    report.classList.toggle('is-compact', scrolly && p > 0.526);
    reportLines.forEach((li) => li.classList.toggle('is-done', !scrolly || p >= Number(li.dataset.at)));
    let step = 0; STEPS.forEach(([, at], i) => { if (!scrolly || p >= at) step = i; });
    if (reportStatus.dataset.step !== String(step)) { reportStatus.dataset.step = String(step); reportStatus.textContent = STEPS[step][0]; }
    track.forEach((li, i) => li.classList.toggle('is-done', i <= step));
    const veil = scrolly ? Math.max(0.15 * (1 - ramp(p, 0.1, 0.18)), ease(p, 0.17, 0.25) * (1 - ease(p, 0.8, 0.88)) * 0.8, 0.5 * ease(p, 0.86, 0.95)) : 0;
    stage.style.setProperty('--veil', veil.toFixed(3));
    stage.style.setProperty('--bars', (scrolly ? ease(p, 0.235, 0.28) * (1 - ease(p, 0.39, 0.425)) : 0).toFixed(3));
    stage.style.setProperty('--cue', (1 - ramp(p, 0.0, 0.03)).toFixed(3));
    stage.style.setProperty('--p', p.toFixed(4));
    stage.style.setProperty('--skip', (1 - ramp(p, 0.88, 0.94)).toFixed(3));
    stage.style.setProperty('--skip-vis', p > 0.94 ? 'hidden' : 'visible');
    railFill.parentElement.style.setProperty('--p', p.toFixed(4));
    const chapter = p < 0.2 ? 0 : p < 0.43 ? 1 : p < 0.595 ? 2 : p < 0.83 ? 3 : 4;
    if (stage.dataset.chapter !== String(chapter)) stage.dataset.chapter = String(chapter);
    rail.forEach((a, i) => { a.classList.toggle('is-current', i === chapter); a.classList.toggle('is-done', i < chapter); });
    // Hub: landmarks become links.
    const lab = scrolly ? ease(p, 0.9, 0.95) : 1;
    hubOn = lab > 0.5;
    landmarks.forEach((l) => { l.a.style.setProperty('--lab', lab.toFixed(3)); l.a.tabIndex = hubOn ? 0 : -1; l.a.style.pointerEvents = hubOn ? '' : 'none'; });
    bubbles.forEach(({ b, from, to }) => { const on = scrolly && p > from && p < to; b.it.hidden = !on; });
  }

  // --- Hub interaction: hover and click landmarks ----------------------------------------------------------
  function setHover(l) {
    if (hovered === l) return;
    if (hovered?.place.mesh) { const m = Array.isArray(hovered.place.mesh.material) ? hovered.place.mesh.material[0] : hovered.place.mesh.material; m.emissiveIntensity = 0; }
    hovered = l;
    labelLinks.forEach((a) => a.classList.toggle('is-hovered', a === l?.a));
    if (l?.place.mesh) { const m = Array.isArray(l.place.mesh.material) ? l.place.mesh.material[0] : l.place.mesh.material; m.emissive.set(l.place.district?.color || '#087f80'); m.emissiveIntensity = 0.18; }
    world.hover.show(l?.place.mesh ? l.place : null);
    canvas.style.cursor = l ? 'pointer' : '';
  }
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; setHover(hubOn ? pickLandmark(e.clientX, e.clientY) : null); });
  canvas.addEventListener('pointerleave', () => setHover(null));
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { down = null; return; }
    down = null;
    if (!hubOn) return;
    const l = pickLandmark(e.clientX, e.clientY);
    if (l) go(l, e);
  });
  const info = $('#city-info');
  let infoReturn = null;
  info.addEventListener('close', () => infoReturn?.focus({ preventScroll: true }));
  function go(l, e) {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0)) return;
    e?.preventDefault?.();
    if (l.place === pavilion) { infoReturn = document.activeElement; info.showModal(); return; }
    if (leaving) return;
    leaving = true;
    const href = l.a.getAttribute('href');
    if (!engine.motion) { window.location.assign(href); return; }
    flyTo = l.place;
    setTimeout(() => $('#story-transition').classList.add('is-active'), 380);
    setTimeout(() => window.location.assign(href), 880);
  }
  labelLinks.forEach((a) => {
    const l = landmarks.find((x) => x.a === a);
    a.addEventListener('click', (e) => go(l, e));
    a.addEventListener('mouseenter', () => setHover(l)); a.addEventListener('mouseleave', () => setHover(null));
    a.addEventListener('focus', () => setHover(l)); a.addEventListener('blur', () => setHover(null));
  });
  document.querySelectorAll('[data-info]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); infoReturn = a; info.showModal(); }));
  window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });

  // --- Loop ------------------------------------------------------------------------------------------------
  const MAX_SPEED = 0.11; // story progress per second: the whole story takes at least about nine seconds
  let flyTo = null, introT = 0;
  engine.onFrame((dt, time) => {
    if (scrolly) {
      target = scrollTarget();

      const gap = Math.abs(target - prog);
      // The story plays at a watchable pace: a hard flick cannot skip chapters, the camera keeps gliding
      // after the scroll stops. Jumps from the chapter rail or Skip glide at the same pace.
      const wanted = (target - prog) * (1 - Math.exp(-dt * (gap > 0.2 ? 9 : 5.5)));
      const most = MAX_SPEED * dt;
      prog += Math.max(-most, Math.min(most, wanted));
      if (Math.abs(target - prog) < 0.00005) prog = target;
    }
    introT += dt; introIn = engine.motion ? ease(introT, 0.5, 2.1) : 1;
    direct(prog, time, dt);
    if (flyTo) {
      rig.set({ target: { x: flyTo.center.x, y: (flyTo.top || 2) * 0.4, z: flyTo.center.z }, dist: 11, el: 0.45, fov: 34, sx: 0, sy: 0 });
      rig.stiffness = 3;
    } else camera(prog, time);
  });
  // Landmark labels: project, then nudge apart so neighbours never overlap.
  const pv = V(0, 0, 0);
  function placeLabels() {
    const w = engine.size.w, h = engine.size.h, boxes = [];
    for (const l of landmarks) {
      pv.copy(l.place.label).project(engine.camera);
      l.x = (pv.x * 0.5 + 0.5) * w; l.y = (-pv.y * 0.5 + 0.5) * h; l.on = pv.z < 1;
      l.w = l.a.offsetWidth || 150; l.h = l.a.offsetHeight || 40;
    }
    const sorted = landmarks.filter((l) => l.on).sort((a, b) => a.y - b.y);
    for (const l of sorted) {
      let y = l.y;
      for (let pass = 0; pass < 6; pass++) {
        const hit = boxes.find((b) => Math.abs(b.x - l.x) < (b.w + l.w) / 2 + 6 && Math.abs(b.y - y) < (b.h + l.h) / 2 + 4);
        if (!hit) break;
        y = hit.y + (hit.h + l.h) / 2 + 6;
      }
      boxes.push({ x: l.x, y, w: l.w, h: l.h });
      l.a.style.transform = `translate3d(${l.x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
    landmarks.forEach((l) => { l.a.style.visibility = l.on ? '' : 'hidden'; });
  }
  engine.afterFrame(() => { overlay.update(); if (hubOn || !scrolly) placeLabels(); });
  engine.assemble(!engine.motion);
  engine.start();
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); engine.stop(); story.classList.remove('is-ready', 'is-scrolly'); $('#story-status').textContent = 'The animated city was interrupted. The full story is below.'; }, { once: true });

  window.RoadNaStory = {
    get progress() { return prog; }, get target() { return target; }, get scrolly() { return scrolly; }, get engine() { return engine; },
    get chapter() { return Number(stage.dataset.chapter); },
    get actors() { return { hero: [hero.x.toFixed(2), hero.z.toFixed(2)], potholeEdge: POT.x - 0.75, heroFront: (hero.x + hero.len / 2).toFixed(2) }; },
    seek(p) { prog = target = clamp(p, 0, 1); engine.advance(0.05, 20); },
    // Verification aid: runs the same path as prefers-reduced-motion.
    simulateReducedMotion(on = true) { forcedReduce = on; mode(); },
  };
}
