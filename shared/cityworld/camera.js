import * as THREE from './three.js';
import { clamp, lerp } from './kit.js';

// A directed camera: target, distance, azimuth, elevation, field of view and a screen
// offset. Every move eases toward a goal, so cinematic shots and user input share one path.
export function createRig(camera, o = {}) {
  const cur = { target: new THREE.Vector3(0, 0, 0), dist: 90, az: Math.PI / 4, el: 0.8, fov: 30, sx: 0, sy: 0 };
  const goal = { target: cur.target.clone(), dist: cur.dist, az: cur.az, el: cur.el, fov: cur.fov, sx: 0, sy: 0 };
  const limits = { minDist: o.minDist ?? 14, maxDist: o.maxDist ?? 120, bounds: o.bounds ?? { x0: -28, x1: 28, z0: -20, z1: 20 } };
  let view = { w: 1, h: 1 }, stiffness = o.stiffness ?? 6, instantNext = true;
  const obstacles = o.obstacles ?? [];

  function resize(w, h) { view = { w, h }; camera.aspect = w / h; apply(); }
  // Distance that fits a sphere of the given radius in view, honouring narrow screens.
  function fit(radius, fov = goal.fov, aspect = view.w / view.h) {
    const v = THREE.MathUtils.degToRad(fov) / 2, hz = Math.atan(Math.tan(v) * aspect);
    return radius / Math.sin(Math.min(v, hz));
  }
  function set(p, instant = false) {
    if (p.target) goal.target.copy(p.target);
    for (const k of ['dist', 'az', 'el', 'fov', 'sx', 'sy']) if (p[k] !== undefined) goal[k] = p[k];
    if (instant) instantNext = true;
  }
  function apply() {
    const { target, dist, az, el } = cur;
    camera.fov = cur.fov;
    camera.position.set(target.x + dist * Math.cos(el) * Math.sin(az), target.y + dist * Math.sin(el), target.z + dist * Math.cos(el) * Math.cos(az));
    camera.lookAt(target);
    if (cur.sx || cur.sy) camera.setViewOffset(view.w, view.h, -cur.sx * view.w, -cur.sy * view.h, view.w, view.h);
    else camera.clearViewOffset();
    camera.near = Math.max(0.3, dist * 0.02); camera.far = dist + 160;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  const angleLerp = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
  function update(dt, damping = true) {
    const t = instantNext || !damping ? 1 : 1 - Math.exp(-dt * stiffness);
    instantNext = false;
    cur.target.lerp(goal.target, t);
    cur.dist = lerp(cur.dist, goal.dist, t); cur.az = angleLerp(cur.az, goal.az, t); cur.el = lerp(cur.el, goal.el, t);
    cur.fov = lerp(cur.fov, goal.fov, t); cur.sx = lerp(cur.sx, goal.sx, t); cur.sy = lerp(cur.sy, goal.sy, t);
    // Keep the lens above rooftops: lift the elevation if the eye would sit inside a building.
    for (let k = 0; k < 6; k++) {
      const ex = cur.target.x + cur.dist * Math.cos(cur.el) * Math.sin(cur.az), ey = cur.target.y + cur.dist * Math.sin(cur.el), ez = cur.target.z + cur.dist * Math.cos(cur.el) * Math.cos(cur.az);
      const hit = obstacles.some((b) => ex > b.x0 - 0.6 && ex < b.x1 + 0.6 && ez > b.z0 - 0.6 && ez < b.z1 + 0.6 && ey < b.top + 0.8);
      if (!hit && ey > 0.8) break;
      cur.el = Math.min(1.4, cur.el + 0.05);
    }
    apply();
  }
  // --- Interactive helpers (city explorer) ------------------------------------------------
  const elFor = (dist) => lerp(o.elNear ?? 0.6, o.elFar ?? 0.86, clamp((dist - limits.minDist) / (limits.maxDist - limits.minDist), 0, 1));
  function clampTarget() { const b = limits.bounds; goal.target.x = clamp(goal.target.x, b.x0, b.x1); goal.target.z = clamp(goal.target.z, b.z0, b.z1); }
  function pan(dx, dy) {
    const worldPerPx = (2 * goal.dist * Math.tan(THREE.MathUtils.degToRad(goal.fov) / 2)) / view.h;
    const az = goal.az, rx = Math.cos(az), rz = -Math.sin(az), fx = -Math.sin(az), fz = -Math.cos(az);
    const k = 1 / Math.max(0.45, Math.sin(goal.el));
    goal.target.x += -dx * worldPerPx * rx + dy * worldPerPx * k * fx;
    goal.target.z += -dx * worldPerPx * rz + dy * worldPerPx * k * fz;
    clampTarget();
  }
  function zoom(factor) { goal.dist = clamp(goal.dist * factor, limits.minDist, limits.maxDist); goal.el = elFor(goal.dist); }
  function rotate(steps) { goal.az += steps * Math.PI / 2; }
  function focus(point, dist) { goal.target.set(point.x, point.y ?? 0, point.z); if (dist) { goal.dist = clamp(dist, limits.minDist, limits.maxDist); goal.el = elFor(goal.dist); } clampTarget(); }
  return {
    camera, cur, goal, limits, resize, fit, set, update, apply, pan, zoom, rotate, focus, elFor,
    get view() { return view; }, set stiffness(v) { stiffness = v; },
    snap() { instantNext = true; },
  };
}
