import { C } from './kit.js';

// Small, reusable pieces of the streetscape. All functions write into a Builder.
const LOT = 0.22;
const leaf = (o, k = 1) => ({ kind: 'foliage', ext: k, detail: o?.detail ?? 0 });

export function roundTree(b, x, z, o = {}) {
  const s = o.s ?? 1, y = o.y ?? LOT, tint = o.tint ?? 0;
  const greens = [[C.leaf, C.leaf2, C.leaf3], ['#86ad72', '#a3c486', '#6a9668'], ['#6f9a68', '#8bb47a', '#557f5c']][tint];
  b.cyl(0.085 * s, 0.95 * s, C.trunk, x, y, z, { top: 0.65, seg: 6 });
  b.ball(0.62 * s, greens[0], x, y + 1.3 * s, z, leaf(o, 1));
  b.ball(0.46 * s, greens[1], x + 0.28 * s, y + 1.62 * s, z - 0.1 * s, leaf(o, 1.25));
  b.ball(0.44 * s, greens[2], x - 0.3 * s, y + 1.36 * s, z + 0.18 * s, leaf(o, 0.9));
}

export function olive(b, x, z, o = {}) {
  const s = o.s ?? 1, y = o.y ?? LOT;
  b.cyl(0.1 * s, 0.6 * s, '#7d6450', x, y, z, { top: 0.7, seg: 6, rz: 0.25 });
  b.cyl(0.07 * s, 0.55 * s, '#7d6450', x + 0.13 * s, y + 0.5 * s, z, { top: 0.6, seg: 5, rz: -0.35 });
  b.cyl(0.06 * s, 0.5 * s, '#7d6450', x + 0.05 * s, y + 0.5 * s, z + 0.05, { top: 0.6, seg: 5, rx: 0.4 });
  const g = [C.olive, '#a3b28a', C.oliveDark];
  b.ball(0.55 * s, g[0], x + 0.1 * s, y + 1.12 * s, z, { ...leaf(o, 1), sy: 0.62, sx: 1.2 });
  b.ball(0.42 * s, g[1], x - 0.32 * s, y + 1.0 * s, z + 0.15 * s, { ...leaf(o, 0.9), sy: 0.65 });
  b.ball(0.4 * s, g[2], x + 0.42 * s, y + 0.95 * s, z - 0.22 * s, { ...leaf(o, 0.9), sy: 0.7 });
  b.ball(0.36 * s, g[1], x + 0.05 * s, y + 1.38 * s, z + 0.2 * s, { ...leaf(o, 1.2), sy: 0.7 });
}

export function cypress(b, x, z, o = {}) {
  const s = o.s ?? 1, y = o.y ?? LOT;
  b.cyl(0.06 * s, 0.4 * s, C.trunk, x, y, z, { seg: 5 });
  b.ball(0.34 * s, C.cypress, x, y + 1.25 * s, z, { ...leaf(o, 0.8), sy: 2.9 });
  b.ball(0.22 * s, '#5f8e68', x + 0.06 * s, y + 1.75 * s, z + 0.08 * s, { ...leaf(o, 1.1), sy: 2.2 });
}

export function palm(b, x, z, o = {}) {
  const s = o.s ?? 1, y = o.y ?? LOT, lean = o.lean ?? 0.12;
  let px = x, py = y;
  for (let i = 0; i < 6; i++) {
    b.cyl(0.085 * s - i * 0.006, 0.36 * s, i % 2 ? '#9a7a5c' : '#8a6c50', px, py, z, { top: 0.92, seg: 6, rz: -lean });
    px += Math.sin(lean) * 0.36 * s; py += Math.cos(lean) * 0.36 * s;
  }
  b.ball(0.13 * s, '#7b6a3f', px, py + 0.02, z, { detail: 0 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3, len = 0.95 * s;
    b.box(len, 0.04, 0.24 * s, i % 2 ? C.palm : '#83ad66', px + Math.cos(a) * len * 0.45, py - 0.08 * s, z - Math.sin(a) * len * 0.45, { ry: a, rz: -0.42, kind: 'foliage', ext: 1.3, r: 0.02 });
  }
}

export function bush(b, x, z, r = 0.35, color = C.leaf3, o = {}) {
  b.ball(r, color, x, (o.y ?? LOT) + r * 0.55, z, { ...leaf(o, 0.35), sy: 0.75 });
}

export function flowerBed(b, x, z, w, d, o = {}) {
  const y = o.y ?? LOT;
  b.box(w, 0.22, d, o.edge ?? C.stone3, x, y, z, { r: 0.05 });
  b.box(w - 0.12, 0.05, d - 0.12, C.soil, x, y + 0.2, z);
  const n = Math.max(2, Math.round((w * d) / 0.35));
  for (let i = 0; i < n; i++) {
    const fx = x + ((i * 0.618) % 1 - 0.5) * (w - 0.3), fz = z + (((i * 0.382 + 0.5) % 1) - 0.5) * (d - 0.3);
    const col = o.colors ? o.colors[i % o.colors.length] : i % 3 === 0 ? C.pink : i % 3 === 1 ? '#f2b84b' : C.leaf2;
    b.ball(0.16, col, fx, y + 0.32, fz, { kind: 'foliage', ext: 0.25, detail: 0 });
  }
}

export function bougainvillea(b, x, y, z, o = {}) {
  // Magenta climber spilling over a wall, a familiar sight in Amman and Irbid.
  const n = o.n ?? 5;
  for (let i = 0; i < n; i++) b.ball(0.2 + (i % 2) * 0.06, i % 3 ? C.pink : '#e56aa3', x + (i - n / 2) * 0.2, y + Math.sin(i * 1.7) * 0.12, z, { kind: 'foliage', ext: 0.3, detail: 0 });
  b.ball(0.22, C.leaf3, x, y - 0.2, z - 0.05, { kind: 'foliage', ext: 0.2, detail: 0 });
}

export function streetLamp(b, x, z, ry, lamps) {
  const y = LOT;
  b.push(x, y, z, ry);
  b.cyl(0.13, 0.12, C.metalDark, 0, 0, 0, { seg: 8 });
  b.cyl(0.04, 2.55, C.metalDark, 0, 0.1, 0, { top: 0.75, seg: 7 });
  b.box(0.62, 0.05, 0.06, C.metalDark, 0.28, 2.6, 0);
  b.box(0.36, 0.08, 0.2, C.metalDark, 0.56, 2.55, 0, { r: 0.03 });
  b.box(0.3, 0.025, 0.15, '#fff3d2', 0.56, 2.535, 0, { kind: 'lamp' });
  b.pop();
  const c = Math.cos(ry), s = Math.sin(ry);
  const hx = x + c * 0.56, hz = z - s * 0.56;
  lamps?.push({ x: hx, y: y + 2.45, z: hz, baseX: x, baseZ: z, ry, broken: false });
}

export function bench(b, x, z, ry = 0, o = {}) {
  const y = o.y ?? LOT;
  b.push(x, y, z, ry);
  for (const sx of [-0.42, 0.42]) { b.box(0.06, 0.36, 0.42, C.metalDark, sx, 0, 0); b.box(0.06, 0.48, 0.06, C.metalDark, sx, 0.3, -0.2); }
  for (let k = 0; k < 3; k++) b.box(1.08, 0.05, 0.11, C.wood, 0, 0.36, (k - 1) * 0.13);
  for (let k = 0; k < 2; k++) b.box(1.08, 0.08, 0.04, C.wood, 0, 0.52 + k * 0.14, -0.22);
  b.pop();
}

export function bin(b, x, z, bins) {
  const y = LOT;
  b.cyl(0.16, 0.48, '#3f7d5f', x, y, z, { seg: 9, top: 1.08 });
  b.cyl(0.18, 0.05, '#2f5f48', x, y + 0.48, z, { seg: 9 });
  bins?.push({ x, z, kind: 'bin' });
}

export function dumpster(b, x, z, ry = 0, bins) {
  const y = LOT;
  b.push(x, y, z, ry);
  b.box(1.15, 0.62, 0.72, '#3c7a58', 0, 0.08, 0, { r: 0.05 });
  b.box(1.2, 0.07, 0.78, '#2f6448', 0, 0.7, 0, { rx: -0.08 });
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.26, 0.26]) b.cyl(0.05, 0.08, C.metalDark, sx, 0, sz, { seg: 6 });
  b.pop();
  bins?.push({ x, z, kind: 'dumpster' });
}

export function bollard(b, x, z) { b.cyl(0.06, 0.38, C.stone3, x, LOT, z, { seg: 7 }); b.ball(0.065, C.stone3, x, LOT + 0.38, z, { detail: 0 }); }

export function planter(b, x, z, w = 0.9, d = 0.45, color = C.leaf3, o = {}) {
  b.box(w, 0.34, d, o.edge ?? C.stone2, x, o.y ?? LOT, z, { r: 0.05 });
  for (let i = 0; i < Math.max(1, Math.round(w / 0.32)); i++) b.ball(0.2, i % 2 ? color : C.leaf2, x - w / 2 + 0.18 + i * 0.32, (o.y ?? LOT) + 0.45, z, { kind: 'foliage', ext: 0.3, detail: 0 });
  if (o.flowers) b.ball(0.13, C.pink, x, (o.y ?? LOT) + 0.58, z, { kind: 'foliage', ext: 0.3, detail: 0 });
}

export function umbrellaTable(b, x, z, color = C.teal) {
  const y = LOT;
  b.cyl(0.32, 0.04, C.white, x, y + 0.42, z, { seg: 12 });
  b.cyl(0.04, 0.42, C.metalDark, x, y, z, { seg: 6 });
  b.cyl(0.025, 1.45, C.metalDark, x, y, z, { seg: 5 });
  b.cone(0.85, 0.32, color, x, y + 1.32, z, { seg: 8 });
  b.cone(0.86, 0.03, C.white, x, y + 1.31, z, { seg: 8 });
  for (let i = 0; i < 3; i++) { const a = i * 2.1; b.box(0.22, 0.26, 0.22, C.wood, x + Math.cos(a) * 0.55, y, z + Math.sin(a) * 0.55, { r: 0.03 }); }
}

export function fountain(b, x, z, r = 1.1, o = {}) {
  const y = o.y ?? LOT;
  b.cyl(r, 0.32, C.stone3, x, y, z, { seg: 20 });
  b.cyl(r - 0.12, 0.06, C.water, x, y + 0.28, z, { seg: 20, kind: 'water' });
  b.cyl(0.24, 0.62, C.stone2, x, y + 0.2, z, { seg: 10 });
  b.cyl(0.42, 0.08, C.stone3, x, y + 0.78, z, { seg: 12 });
  b.cyl(0.36, 0.04, C.water, x, y + 0.85, z, { seg: 12, kind: 'water' });
  b.ball(0.1, '#bfe9ee', x, y + 0.98, z, { kind: 'water', detail: 1 });
}

export function flagpole(b, x, z, color, o = {}) {
  const y = o.y ?? LOT, h = o.h ?? 3.2;
  b.cyl(0.03, h, '#d8dcd9', x, y, z, { seg: 6 });
  b.ball(0.05, '#e7c76a', x, y + h, z, { detail: 0 });
  b.box(0.9, 0.55, 0.025, color, x + 0.47, y + h - 0.65, z, { kind: o.kind });
}

export function busStop(b, x, z, ry, adUv) {
  b.push(x, LOT, z, ry);
  b.box(2.0, 0.05, 0.8, C.teal, 0, 1.25, -0.05, { r: 0.03 });
  for (const sx of [-0.92, 0.92]) b.box(0.05, 1.25, 0.05, C.metalDark, sx, 0, -0.38);
  b.box(1.9, 0.9, 0.03, '#cfe8e8', 0, 0.25, -0.42, { kind: 'glass' });
  b.box(0.04, 1.1, 0.7, C.metalDark, 0.95, 0.05, -0.05);
  if (adUv) b.quad(0.62, 0.95, 0.975, 0.62, -0.05, adUv, { ry: Math.PI / 2 });
  b.box(1.2, 0.06, 0.32, C.wood, -0.2, 0.42, -0.2);
  b.box(0.05, 0.42, 0.05, C.metalDark, -0.7, 0, -0.2); b.box(0.05, 0.42, 0.05, C.metalDark, 0.3, 0, -0.2);
  b.pop();
}

export function cone(b, x, z, o = {}) {
  const y = o.y ?? 0.06;
  b.box(0.24, 0.03, 0.24, C.orangeDeep, x, y, z);
  b.cone(0.1, 0.34, C.orange, x, y + 0.03, z, { seg: 8 });
  b.cyl(0.072, 0.06, C.white, x, y + 0.12, z, { top: 0.82, seg: 8 });
}

export function hydrant(b, x, z) {
  b.cyl(0.07, 0.26, C.red, x, LOT, z, { seg: 8 });
  b.ball(0.075, C.red, x, LOT + 0.27, z, { detail: 0 });
  b.cyl(0.03, 0.12, '#b8473d', x, LOT + 0.14, z, { seg: 6, rz: Math.PI / 2 });
}

export function kiosk(b, x, z, ry, color = C.orange) {
  b.push(x, LOT, z, ry);
  b.box(1.5, 1.05, 1.1, C.stone4, 0, 0, 0, { r: 0.06 });
  b.box(1.2, 0.5, 0.04, C.glass, 0, 0.45, 0.55, { kind: 'glass' });
  b.box(1.36, 0.08, 0.32, C.wood, 0, 0.4, 0.68);
  b.box(1.75, 0.1, 1.45, color, 0, 1.05, 0.12, { r: 0.04, rx: 0.08 });
  for (let i = 0; i < 6; i++) b.box(0.27, 0.12, 0.05, i % 2 ? C.white : color, -0.68 + i * 0.27, 0.93, 0.83);
  b.pop();
}

export function playground(b, x, z) {
  const y = LOT;
  b.box(3.0, 0.03, 2.1, '#e9c79a', x, y, z, { r: 0.4 });
  // Swings
  for (const sx of [-0.55, 0.55]) b.box(0.06, 1.15, 0.06, C.orange, x - 0.8 + sx, y, z - 0.45, { rz: sx > 0 ? -0.15 : 0.15 });
  b.box(1.35, 0.06, 0.06, C.orange, x - 0.8, y + 1.12, z - 0.45);
  for (const sx of [-0.25, 0.25]) { b.box(0.012, 0.7, 0.012, C.metalDark, x - 0.8 + sx, y + 0.42, z - 0.45); b.box(0.22, 0.03, 0.12, C.teal, x - 0.8 + sx, y + 0.4, z - 0.45); }
  // Slide
  b.box(0.5, 0.75, 0.5, C.teal, x + 0.85, y, z + 0.1, { r: 0.05 });
  b.box(0.4, 0.04, 1.2, C.yellow, x + 0.85, y + 0.38, z + 0.75, { rx: 0.55 });
  b.box(0.08, 0.6, 0.08, C.white, x + 0.62, y + 0.75, z - 0.1);
}

export function billboard(b, x, z, ry, uv, o = {}) {
  b.push(x, LOT, z, ry);
  for (const sx of [-1.1, 1.1]) b.cyl(0.07, 1.5, C.metalDark, sx, 0, -0.06, { seg: 6 });
  b.box(3.2, 1.15, 0.14, C.white, 0, 1.4, -0.08, { r: 0.04 });
  b.quad(3.0, 0.98, 0, 1.97, 0.0, uv);
  if (o.light) b.box(2.4, 0.05, 0.16, C.metalDark, 0, 2.6, 0.12);
  b.pop();
}
