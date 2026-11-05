import * as THREE from './three.js';

// HTML elements pinned to 3D positions. Elements stay real, focusable DOM nodes.
export function createOverlay(layer, engine) {
  const items = new Set(), v = new THREE.Vector3();
  function add(el, pos, o = {}) {
    const it = { el, pos, o, vis: null, x: 0, y: 0, depth: 0, hidden: false };
    if (!el.parentNode) layer.appendChild(el);
    el.classList.add('cw-pin');
    items.add(it);
    return it;
  }
  function remove(it) { if (!it) return; items.delete(it); it.el.remove(); }
  function update() {
    const { w, h } = engine.size, cam = engine.camera;
    for (const it of items) {
      const p = typeof it.pos === 'function' ? it.pos() : it.pos;
      if (!p) continue;
      v.copy(p).project(cam);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h, m = it.o.margin ?? 30;
      const show = !it.hidden && v.z < 1 && x > -m && x < w + m && y > -m && y < h + m;
      if (show) { it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; it.el.style.zIndex = String(1000 - Math.round(v.z * 900)); }
      if (show !== it.vis) { it.vis = show; it.el.classList.toggle('is-off', !show); }
      it.x = x; it.y = y; it.depth = v.z;
    }
  }
  return { items, add, remove, update, clear() { for (const it of [...items]) remove(it); } };
}
