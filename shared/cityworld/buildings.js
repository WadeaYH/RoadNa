import { C } from './kit.js';
import * as P from './props.js';

// Buildings are authored in local space: centred footprint w (x) by d (z), main facade on +z.
// Every landmark receives (builder, w, d, k) where k offers seeded randomness, sign-atlas
// helpers and a list for animated details. It returns the height of its highest point.
export const LOT = 0.22;
export const FH = 1.0;
export const PLINTH = 0.32;

export function footprint(place) {
  const [x0, z0, x1, z1] = place.box;
  const sideways = place.front === 'e' || place.front === 'w';
  return {
    cx: (x0 + x1) / 2, cz: (z0 + z1) / 2,
    ry: { s: 0, e: Math.PI / 2, n: Math.PI, w: -Math.PI / 2 }[place.front],
    w: sideways ? z1 - z0 : x1 - x0, d: sideways ? x1 - x0 : z1 - z0,
  };
}

const colsFor = (len, spacing = 1.12) => Math.max(1, Math.floor((len - 0.6) / spacing));
const colU = (len, cols, c) => -len / 2 + (c + 0.5) * len / cols;

// ---------------------------------------------------------------------------------------
function shell(b, w, d, floors, o) {
  const H = PLINTH + floors * FH;
  b.box(w + 0.12, PLINTH, d + 0.12, o.plinth ?? C.stoneDark, 0, 0, 0, { r: 0.05 });
  b.box(w, H - PLINTH, d, o.color, 0, PLINTH, 0, { r: o.radius ?? 0.07 });
  for (let f = 1; f < floors; f++) b.box(w + 0.07, 0.055, d + 0.07, o.band ?? C.stone4, 0, PLINTH + f * FH - 0.03, 0);
  if (o.parapet !== false) parapet(b, w, d, H, o);
  else b.box(w + 0.1, 0.08, d + 0.1, o.cap ?? C.stone4, 0, H, 0, { r: 0.03 });
  return H;
}

function parapet(b, w, d, H, o) {
  const t = 0.12, ph = o.parapetH ?? 0.3, col = o.parapetColor ?? o.color, cap = o.cap ?? C.stone4;
  b.box(w - 0.14, 0.025, d - 0.14, o.roof ?? '#d9ccb2', 0, H, 0);
  b.box(w, ph, t, col, 0, H, d / 2 - t / 2); b.box(w, ph, t, col, 0, H, -d / 2 + t / 2);
  b.box(t, ph, d - 2 * t, col, w / 2 - t / 2, H, 0); b.box(t, ph, d - 2 * t, col, -w / 2 + t / 2, H, 0);
  b.box(w + 0.07, 0.05, t + 0.07, cap, 0, H + ph, d / 2 - t / 2); b.box(w + 0.07, 0.05, t + 0.07, cap, 0, H + ph, -d / 2 + t / 2);
  b.box(t + 0.07, 0.05, d - 2 * t, cap, w / 2 - t / 2, H + ph, 0); b.box(t + 0.07, 0.05, d - 2 * t, cap, -w / 2 + t / 2, H + ph, 0);
}

function win(b, u, y, z, o, R) {
  const ww = o.winW ?? 0.46, wh = o.winH ?? 0.56, lit = R() < (o.lit ?? 0.42) ? 1 : 0, trim = o.trim ?? C.frame;
  const glass = o.glass ?? C.glass;
  if (o.arch) {
    b.box(ww, wh - ww / 2, 0.06, glass, u, y, z - 0.015, { kind: 'glass', ext: lit });
    b.cyl(ww / 2, 0.06, glass, u, y + wh - ww / 2, z - 0.045, { rx: Math.PI / 2, kind: 'glass', ext: lit, seg: 12 });
    b.box(0.09, 0.1, 0.06, trim, u, y + wh - 0.02, z);
  } else {
    b.box(ww, wh, 0.06, glass, u, y, z - 0.015, { kind: 'glass', ext: lit });
    b.box(ww + 0.1, 0.06, 0.08, trim, u, y + wh, z + 0.005);
    if (o.mullion) b.box(0.03, wh, 0.02, trim, u, y, z + 0.022);
  }
  b.box(ww + 0.14, 0.05, 0.13, trim, u, y - 0.05, z + 0.025);
  if (o.shutters) { b.box(0.13, wh - 0.04, 0.035, o.shutters, u - ww / 2 - 0.09, y + 0.02, z + 0.02); b.box(0.13, wh - 0.04, 0.035, o.shutters, u + ww / 2 + 0.09, y + 0.02, z + 0.02); }
}

function facades(b, w, d, floors, o, R) {
  const faces = [{ len: w, depth: d / 2, ry: 0, front: true }, { len: w, depth: d / 2, ry: Math.PI }, { len: d, depth: w / 2, ry: Math.PI / 2 }, { len: d, depth: w / 2, ry: -Math.PI / 2 }];
  faces.forEach((f, i) => {
    if (o.skipFaces?.includes(i)) return;
    const cols = colsFor(f.len, o.spacing);
    b.push(0, 0, 0, f.ry);
    for (let fl = f.front && o.groundFront ? 1 : 0; fl < floors; fl++) {
      for (let c = 0; c < cols; c++) {
        if (f.front && fl === 0 && o.doorCol === c) continue;
        win(b, colU(f.len, cols, c), PLINTH + fl * FH + 0.24, f.depth, o, R);
      }
    }
    b.pop();
  });
}

function balconies(b, w, d, floors, o, R) {
  const cols = colsFor(w, o.spacing);
  for (let fl = 1; fl < floors; fl++) for (let c = 0; c < cols; c++) {
    if (!o.allBalconies && (c + fl) % 2) continue;
    const u = colU(w, cols, c), y = PLINTH + fl * FH, z = d / 2, rail = o.rail ?? o.color;
    b.box(0.86, 0.07, 0.46, C.stone4, u, y - 0.03, z + 0.22, { r: 0.02 });
    b.box(0.86, 0.3, 0.035, rail, u, y + 0.04, z + 0.43);
    b.box(0.035, 0.3, 0.42, rail, u - 0.41, y + 0.04, z + 0.22); b.box(0.035, 0.3, 0.42, rail, u + 0.41, y + 0.04, z + 0.22);
    b.box(0.9, 0.035, 0.05, C.metalDark, u, y + 0.36, z + 0.43);
    if (R() < 0.55) b.ball(0.13, R() < 0.4 ? C.pink : C.leaf2, u + (R() - 0.5) * 0.5, y + 0.46, z + 0.36, { kind: 'foliage', ext: 0.2, detail: 0 });
  }
}

function entrance(b, w, d, o) {
  const z = d / 2, x = o.doorX ?? 0, acc = o.accent ?? C.teal;
  b.box(0.5, 0.78, 0.05, o.door ?? C.woodDark, x, PLINTH - 0.02, z + 0.005);
  b.box(0.06, 0.06, 0.06, '#e5c77b', x + 0.16, PLINTH + 0.36, z + 0.04);
  b.box(0.95, 0.06, 0.48, acc, x, PLINTH + 0.86, z + 0.22, { r: 0.02 });
  b.box(0.9, 0.08, 0.34, C.stone3, x, 0, z + 0.2);
  b.box(0.7, 0.08, 0.2, C.stone3, x, 0.08, z + 0.12);
}

function storefront(b, w, d, o) {
  const z = d / 2, sw = o.shopW ?? w * 0.62, x = o.shopX ?? 0;
  b.box(sw, 0.66, 0.06, C.glass, x, PLINTH + 0.06, z - 0.01, { kind: 'glass', ext: 1 });
  for (let i = 0; i <= 3; i++) b.box(0.04, 0.66, 0.03, C.frame, x - sw / 2 + (i * sw) / 3, PLINTH + 0.06, z + 0.03);
  awning(b, sw + 0.2, PLINTH + 0.88, z, x, o.awning ?? [C.teal, C.white]);
}

export function awning(b, w, y, z, x = 0, colors = [C.teal, C.white]) {
  const n = Math.max(4, Math.round(w / 0.22)), sw = w / n;
  for (let i = 0; i < n; i++) {
    b.box(sw + 0.002, 0.04, 0.56, colors[i % 2], x - w / 2 + sw * (i + 0.5), y, z + 0.27, { rx: 0.34 });
    b.box(sw + 0.002, 0.11, 0.02, colors[i % 2], x - w / 2 + sw * (i + 0.5), y - 0.27, z + 0.53);
  }
}

function roofKit(b, w, d, H, o, R) {
  const y = H + 0.025;
  const hut = o.stairHut ?? (w > 3 && d > 2.8);
  if (hut) {
    const hx = -w / 2 + 0.85, hz = -d / 2 + 0.75;
    b.box(1.1, 0.82, 0.95, o.color, hx, y, hz, { r: 0.04 });
    b.box(1.2, 0.06, 1.05, C.stone4, hx, y + 0.82, hz);
    b.box(0.36, 0.6, 0.04, C.woodDark, hx + 0.2, y, hz + 0.48);
  }
  const tanks = o.tanks ?? R.int(1, 3);
  for (let i = 0; i < tanks; i++) {
    const tx = w / 2 - 0.45 - i * 0.55, tz = -d / 2 + 0.5;
    b.box(0.46, 0.16, 0.46, C.metal, tx, y, tz);
    b.cyl(0.21, 0.46, R() < 0.55 ? C.tank : C.tankWhite, tx, y + 0.16, tz, { seg: 12 });
    b.cyl(0.07, 0.05, C.metal, tx, y + 0.62, tz, { seg: 8 });
  }
  if (o.solar ?? R() < 0.75) {
    const sx = o.solarX ?? (w / 2 - 0.95), sz = o.solarZ ?? (d / 2 - 0.85);
    b.box(0.95, 0.04, 0.66, C.solar, sx, y + 0.24, sz, { rx: -0.55, kind: 'glass' });
    b.box(0.05, 0.42, 0.05, C.metal, sx - 0.42, y, sz - 0.22); b.box(0.05, 0.42, 0.05, C.metal, sx + 0.42, y, sz - 0.22);
    b.cyl(0.12, 0.98, C.tankWhite, sx + 0.49, y + 0.5, sz - 0.32, { rz: Math.PI / 2, seg: 10 });
  }
  const acs = o.ac ?? R.int(0, 2);
  for (let i = 0; i < acs; i++) {
    const ax = -w / 2 + 1.0 + i * 0.6 + (hut ? 1.1 : 0), az = d / 2 - 0.45;
    b.box(0.42, 0.3, 0.3, '#e8ebe8', ax, y, az, { r: 0.03 });
    b.cyl(0.1, 0.02, C.metalDark, ax, y + 0.15, az + 0.15, { rx: Math.PI / 2, seg: 10 });
  }
  if (o.dish ?? R() < 0.35) {
    const dx = w / 2 - 0.4, dz = d / 2 - 0.35;
    b.cyl(0.03, 0.3, C.metal, dx, y, dz, { seg: 5 });
    b.dome(0.24, '#eef0ee', dx, y + 0.42, dz, { rx: -1.1, ry: 0.6, sy: 0.35, seg: 12 });
  }
  if (o.laundry) {
    const lz = 0.15, x0 = -w / 2 + 0.5, x1 = w / 2 - 1.4;
    b.box(0.04, 0.7, 0.04, C.metal, x0, y, lz); b.box(0.04, 0.7, 0.04, C.metal, x1, y, lz);
    b.box(x1 - x0, 0.012, 0.012, '#d9dcd9', (x0 + x1) / 2, y + 0.66, lz);
    const cloth = [C.white, C.orange, C.teal, '#c9d8f0', C.pink];
    for (let i = 0; i < 5; i++) b.box(0.2 + (i % 2) * 0.08, 0.26, 0.015, cloth[i], x0 + 0.35 + i * ((x1 - x0 - 0.5) / 4), y + 0.42, lz, { kind: 'foliage', ext: 0.25 });
  }
}

// Shop-style sign standing on the front parapet; double sided so it reads from behind too.
function roofline(b, k, key, H, d, o = {}) {
  const sw = o.sw ?? 2.2, sh = o.sh ?? 0.5, x = o.x ?? 0, y = H + (o.ph ?? 0.3) + 0.04, z = o.z ?? d / 2 - 0.06;
  const uv = k.sign(key, sw, sh);
  b.box(0.05, 0.2, 0.05, C.metalDark, x - sw * 0.34, y, z - 0.03); b.box(0.05, 0.2, 0.05, C.metalDark, x + sw * 0.34, y, z - 0.03);
  b.box(sw + 0.08, sh + 0.08, 0.06, C.white, x, y + 0.14, z - 0.03, { r: 0.02 });
  b.quad(sw, sh, x, y + 0.18 + sh / 2, z + 0.004, uv);
  b.quad(sw, sh, x, y + 0.18 + sh / 2, z - 0.064, uv, { ry: Math.PI });
  return y + 0.22 + sh;
}

// Square emblem board on two posts, double sided.
function roofSign(b, k, key, x, y, z, ry = 0, size = 1.0) {
  const uv = k.emblem(key);
  b.push(x, y, z, ry);
  b.box(0.05, 0.5, 0.05, C.metalDark, -size * 0.38, 0, -0.04); b.box(0.05, 0.5, 0.05, C.metalDark, size * 0.38, 0, -0.04);
  b.box(size + 0.08, size + 0.08, 0.06, C.white, 0, 0.42, -0.04, { r: 0.03 });
  b.quad(size, size, 0, 0.46 + size / 2, 0.0, uv);
  b.quad(size, size, 0, 0.46 + size / 2, -0.081, uv, { ry: Math.PI });
  b.pop();
  return y + 0.5 + size;
}

function standard(b, w, d, o, R) {
  const cols = colsFor(w, o.spacing);
  if (o.entrance !== false && !o.groundFront && o.doorX === undefined) { o.doorCol = Math.floor(cols / 2); o.doorX = colU(w, cols, o.doorCol); }
  const H = shell(b, w, d, o.floors, o);
  facades(b, w, d, o.floors, o, R);
  if (o.balconies) balconies(b, w, d, o.floors, o, R);
  if (o.shop) storefront(b, w, d, o);
  if (o.entrance !== false) entrance(b, w, d, o);
  if (o.roofKit !== false) roofKit(b, w, d, H, o, R);
  return H;
}

// ---------------------------------------------------------------------------------------
export const LANDMARKS = {
  visitor(b, w, d, k) {
    b.box(w + 0.1, PLINTH, d + 0.1, C.stoneDark, 0, 0, 0, { r: 0.05 });
    b.box(w - 0.6, 1.0, d - 0.5, C.stone4, 0, PLINTH, -0.15, { r: 0.05 });
    b.box(w - 0.9, 0.74, 0.06, C.glass, 0, PLINTH + 0.1, d / 2 - 0.39, { kind: 'glass', ext: 1 });
    for (let i = 0; i <= 5; i++) b.box(0.04, 0.78, 0.04, C.frame, -(w - 0.9) / 2 + i * (w - 0.9) / 5, PLINTH + 0.08, d / 2 - 0.35);
    b.box(w + 0.3, 1.15, d - 0.2, C.teal, 0.1, PLINTH + 1.0, -0.05, { r: 0.08 });
    b.box(w - 0.4, 0.5, 0.06, C.mint, 0.1, PLINTH + 1.32, d / 2 - 0.12, { kind: 'glass', ext: 1 });
    b.box(0.06, 0.5, d - 0.8, C.mint, 0.1 + (w + 0.3) / 2 + 0.01, PLINTH + 1.32, -0.05, { kind: 'glass', ext: 1 });
    const H = PLINTH + 2.15;
    b.box(w + 0.4, 0.08, d - 0.1, C.white, 0.1, H, -0.05, { r: 0.03 });
    const top = roofline(b, k, 'visitor', H - 0.22, d - 0.2, { sw: 2.8, sh: 0.62, z: d / 2 - 0.35 });
    b.box(0.5, 2.4, 0.5, C.teal, w / 2 + 0.25, 0, d / 2 + 0.35, { r: 0.05 });
    b.quad(0.42, 0.42, w / 2 + 0.25, 1.95, d / 2 + 0.605, k.emblem('visitor'));
    b.box(2.2, 0.08, 0.5, C.stone3, -0.6, 0, d / 2 + 0.2);
    P.planter(b, -w / 2 + 0.3, d / 2 + 0.45, 1.0, 0.4, C.leaf3, { y: 0, flowers: true });
    P.flagpole(b, -w / 2 - 0.1, -d / 2 + 0.4, C.teal, { y: 0, h: 3.4 });
    P.flagpole(b, -w / 2 + 0.6, -d / 2 + 0.4, C.orange, { y: 0, h: 3.0 });
    roofKit(b, w - 0.4, d - 0.6, H + 0.06, { tanks: 0, solar: true, ac: 1, stairHut: false, dish: false, solarZ: -0.4, color: C.stone4 }, k.R);
    return top;
  },

  map(b, w, d, k) {
    const H = shell(b, w, d, 2, { color: C.white, band: C.mint, parapet: false, cap: C.teal });
    facades(b, w, d, 2, { winW: 0.62, winH: 0.62, spacing: 1.0, groundFront: true, glass: C.tealGlass }, k.R);
    b.box(w - 0.6, 0.74, 0.06, C.glass, 0, PLINTH + 0.08, d / 2 - 0.01, { kind: 'glass', ext: 1 });
    for (let i = 0; i <= 4; i++) b.box(0.05, 0.78, 0.04, C.teal, -(w - 0.6) / 2 + i * (w - 0.6) / 4, PLINTH + 0.06, d / 2 + 0.02);
    b.box(w + 0.7, 0.16, 1.0, C.teal, 0, PLINTH + 0.98, d / 2 + 0.45, { r: 0.06 });
    for (const sx of [-w / 2 - 0.15, w / 2 + 0.15]) b.cyl(0.07, 0.98, C.white, sx, PLINTH, d / 2 + 0.78, { seg: 8 });
    b.box(w - 0.3, 0.4, 0.05, C.white, 0, PLINTH + 1.16, d / 2 + 0.92);
    b.quad(w - 0.45, 0.32, 0, PLINTH + 1.36, d / 2 + 0.948, k.sign('map', w - 0.45, 0.32));
    // Giant pin on the roof
    b.cyl(0.2, 0.4, C.metalDark, 0, H + 0.08, 0, { seg: 8 });
    b.cone(0.5, 1.0, C.orange, 0, H + 1.5, 0, { seg: 16, rx: Math.PI });
    b.ball(0.64, C.orange, 0, H + 1.7, 0, { smooth: true, w: 18, h: 12 });
    b.ball(0.25, C.white, 0, H + 1.76, 0.55, { smooth: true, sz: 0.4 });
    b.ball(0.25, C.white, 0, H + 1.76, -0.55, { smooth: true, sz: 0.4 });
    // Map monument in the plaza
    b.push(0.3, 0, d / 2 + 1.5, 0.12);
    b.cyl(0.55, 0.18, C.stone3, 0, 0, 0, { seg: 14 });
    b.box(0.12, 0.7, 0.12, C.teal, 0, 0.18, 0);
    b.box(1.35, 0.95, 0.1, C.teal, 0, 0.82, 0, { r: 0.03 });
    b.quad(1.22, 0.82, 0, 1.3, 0.056, k.custom('cityMap'));
    b.quad(1.22, 0.82, 0, 1.3, -0.056, k.custom('cityMap'), { ry: Math.PI });
    b.pop();
    return H + 2.4;
  },

  community(b, w, d, k) {
    const H = standard(b, w, d, { floors: 2, color: C.stoneWarm, arch: true, shutters: C.teal, accent: '#4f9a6b', spacing: 1.0, tanks: 2, entrance: false }, k.R);
    b.box(w * 0.66, 0.08, 1.2, C.stone3, 0, 0, d / 2 + 0.6);
    for (const sx of [-1.4, -0.47, 0.47, 1.4]) b.cyl(0.09, 0.98, C.white, sx, 0.08, d / 2 + 1.0, { seg: 8 });
    b.box(w * 0.72, 0.14, 1.3, '#4f9a6b', 0, 1.06, d / 2 + 0.6, { r: 0.04 });
    b.box(0.6, 0.78, 0.05, C.woodDark, 0, PLINTH - 0.02, d / 2 + 0.005);
    const top = roofline(b, k, 'community', H, d, { sw: 2.6, sh: 0.6 });
    for (const sx of [-2.05, 2.05]) {
      b.push(sx, 0, d / 2 + 1.45, sx < 0 ? 0.3 : -0.3);
      b.box(0.06, 1.0, 0.06, C.woodDark, -0.45, 0, 0); b.box(0.06, 1.0, 0.06, C.woodDark, 0.45, 0, 0);
      b.box(1.05, 0.72, 0.08, C.wood, 0, 0.52, 0, { r: 0.02 });
      b.quad(0.95, 0.62, 0, 0.88, 0.045, k.custom('notices'));
      b.box(1.15, 0.06, 0.2, '#4f9a6b', 0, 1.24, 0);
      b.pop();
    }
    return top;
  },

  apartments(b, w, d, k) {
    const H = standard(b, w, d, { floors: 4, color: C.stone, balconies: true, shop: true, shopW: w * 0.55, shopX: 0.9, doorX: -1.75, awning: [C.orange, C.white], accent: C.orange, groundFront: true, laundry: true, tanks: 3, solar: true, solarX: -w / 2 + 1.0, solarZ: -d / 2 + 0.9, stairHut: false, shutters: '#6f9a8a', rail: C.stone2 }, k.R);
    P.bougainvillea(b, -w / 2 + 0.4, PLINTH + 1.1, d / 2 + 0.12, { n: 4 });
    return roofline(b, k, 'apartments', H, d, { sw: 2.4, sh: 0.55 });
  },

  home(b, w, d, k) {
    const gw = w + 1.6, gd = d + 1.8;
    b.box(gw, 0.04, gd, C.grass, 0, 0, 0.2, { r: 0.3 });
    for (const [wx, wz, ww, wd] of [[0, -gd / 2 + 0.2, gw, 0.14], [-gw / 2, 0.2, 0.14, gd], [gw / 2, 0.2, 0.14, gd], [-gw / 2 + 1.35, gd / 2 + 0.2, 2.7, 0.14], [gw / 2 - 1.35, gd / 2 + 0.2, 2.7, 0.14]]) b.box(ww, 0.5, wd, C.stone2, wx, 0, wz);
    for (const sx of [-0.27, 0.27]) b.box(0.18, 0.66, 0.18, C.stone3, sx, 0, gd / 2 + 0.2);
    b.box(0.5, 0.04, 1.4, C.paving, 0, 0.03, gd / 2 - 0.5);
    b.quad(1.1, 0.3, -1.5, 0.27, gd / 2 + 0.276, k.sign('home', 1.1, 0.3));
    b.push(0, 0, -0.3, 0);
    const H = standard(b, w - 0.2, d - 1.0, { floors: 2, color: C.stone4, arch: true, shutters: C.teal, accent: C.orange, tanks: 2, solar: true, dish: true, spacing: 1.05, stairHut: false }, k.R);
    b.pop();
    b.box(1.5, 0.08, 0.9, C.stone3, -gw / 2 + 1.25, 0, gd / 2 - 0.55, { r: 0.06 });
    b.box(1.3, 0.05, 0.7, C.water, -gw / 2 + 1.25, 0.05, gd / 2 - 0.55, { kind: 'water' });
    b.push(gw / 2 - 1.0, 0, gd / 2 - 0.7, 0);
    for (const [px, pz] of [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]]) b.box(0.07, 1.15, 0.07, C.wood, px, 0, pz);
    for (let i = 0; i < 5; i++) b.box(0.06, 0.06, 1.0, C.wood, -0.55 + i * 0.275, 1.15, 0);
    P.bougainvillea(b, 0.2, 1.25, 0, { n: 4 });
    b.box(0.6, 0.3, 0.4, C.white, 0, 0, 0, { r: 0.05 });
    b.pop();
    P.palm(b, -gw / 2 + 0.5, -gd / 2 + 0.9, { y: 0, s: 1.0, lean: 0.1 });
    P.roundTree(b, gw / 2 - 0.5, -gd / 2 + 0.8, { y: 0, s: 0.8 });
    P.bougainvillea(b, -gw / 2 + 2.0, 0.6, gd / 2 + 0.28, { n: 5 });
    return roofSign(b, k, 'home', -0.2, H + 0.02, -0.4, 0, 0.8);
  },

  archive(b, w, d, k) {
    const H = standard(b, w, d, { floors: 3, color: C.stone2, spacing: 0.92, winW: 0.4, winH: 0.66, accent: C.orange, tanks: 1, mullion: true }, k.R);
    const tabs = [C.orange, C.teal, '#4f78a8', C.yellow, '#4f9a6b'];
    const cols = colsFor(w, 0.92);
    for (let i = 0; i <= cols; i++) b.box(0.12, H - PLINTH - 0.9, 0.18, tabs[i % 5], -w / 2 + (i * w) / cols, PLINTH + 0.95, d / 2 + 0.08);
    return roofline(b, k, 'archive', H, d, { sw: 2.4, sh: 0.55 });
  },

  bell(b, w, d, k) {
    const H = standard(b, w, d, { floors: 3, color: C.stoneWarm, arch: true, accent: C.orange, tanks: 0, solar: false, stairHut: false, ac: 0, dish: false, spacing: 0.95 }, k.R);
    const bw = w * 0.7, by = H + 0.02;
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.32, 1.4, 0.32, C.stoneWarm, px * (bw / 2 - 0.16), by, pz * (bw / 2 - 0.16));
    b.box(bw + 0.2, 0.22, bw + 0.2, C.stone4, 0, by + 1.4, 0, { r: 0.04 });
    b.dome(bw * 0.52, C.orange, 0, by + 1.62, 0, { seg: 18 });
    b.cyl(0.04, 0.5, '#e7c76a', 0, by + 1.6 + bw * 0.52, 0, { seg: 6 });
    b.ball(0.08, '#e7c76a', 0, by + 2.12 + bw * 0.52, 0, { detail: 1 });
    b.box(bw * 0.9, 0.06, 0.06, C.metalDark, 0, by + 1.3, 0);
    k.dynamic.push({ type: 'bell', local: [0, by + 1.28, 0] });
    roofline(b, k, 'bell', H, d, { sw: 1.9, sh: 0.45 });
    return by + 2.3 + bw * 0.52;
  },

  kiosk(b, w, d, k) {
    b.box(w + 0.1, PLINTH, d + 0.1, C.stoneDark, 0, 0, 0, { r: 0.05 });
    b.box(w, 1.15, d, C.white, 0, PLINTH, 0, { r: 0.08 });
    b.box(w - 0.5, 0.72, 0.06, C.glass, 0, PLINTH + 0.18, d / 2 - 0.01, { kind: 'glass', ext: 1 });
    b.box(w * 0.5, 0.72, 0.06, C.glass, 0, PLINTH + 0.18, -d / 2 + 0.01, { kind: 'glass', ext: 1 });
    b.box(0.06, 0.72, d * 0.5, C.glass, w / 2 - 0.01, PLINTH + 0.18, 0, { kind: 'glass', ext: 1 });
    b.box(0.06, 0.72, d * 0.5, C.glass, -w / 2 + 0.01, PLINTH + 0.18, 0, { kind: 'glass', ext: 1 });
    b.box(w + 0.5, 0.12, d + 0.5, C.orange, 0, PLINTH + 1.15, 0, { r: 0.05 });
    awning(b, w - 0.3, PLINTH + 1.02, d / 2, 0, [C.orange, C.white]);
    awning(b, w - 0.3, PLINTH + 1.02, -d / 2, 0, [C.orange, C.white].reverse());
    const y = PLINTH + 1.27;
    b.cyl(0.3, 0.25, C.metalDark, 0, y, 0, { seg: 8 });
    b.box(1.55, 0.45, 0.32, C.teal, 0, y + 0.85, 0, { r: 0.08 });
    b.box(0.45, 1.55, 0.32, C.teal, 0, y + 0.3, 0, { r: 0.08 });
    b.box(1.3, 0.2, 0.34, C.white, 0, y + 0.97, 0, { r: 0.05 });
    b.box(0.2, 1.3, 0.34, C.white, 0, y + 0.42, 0, { r: 0.05 });
    roofline(b, k, 'kiosk', PLINTH + 1.23, d + 0.5, { sw: 1.8, sh: 0.36, ph: 0 });
    P.bench(b, w / 2 + 0.25, d / 2 + 0.6, Math.PI, { y: 0 });
    return y + 1.95;
  },

  dropbox(b, w, d, k) {
    const H = standard(b, w, d, { floors: 2, color: C.stone4, accent: '#4f9a6b', doorX: 1.65, groundFront: true, tanks: 1, solar: true, spacing: 1.05 }, k.R);
    const lc = ['#e0862f', '#3e9c98', '#4f78a8', '#efd9b8', '#4f9a6b'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) b.box(0.32, 0.24, 0.1, lc[(i + j * 2) % lc.length], -1.5 + i * 0.36, PLINTH + 0.05 + j * 0.27, d / 2 + 0.04, { r: 0.02 });
    roofSign(b, k, 'dropbox', 0.4, H + 0.02, -0.4, Math.PI, 0.95);
    roofline(b, k, 'dropbox', H, d, { sw: 2.1, sh: 0.5 });
    return H + 1.5;
  },

  hall(b, w, d, k) {
    const H = standard(b, w, d, { floors: 3, color: '#f1e6d2', band: C.white, arch: true, spacing: 1.05, accent: C.teal, entrance: false, tanks: 0, solar: false, stairHut: false, ac: 2, dish: false, parapetH: 0.38 }, k.R);
    const pw = 5.6, pz = d / 2 + 0.82;
    for (let i = 0; i < 3; i++) b.box(pw + 1.2 - i * 0.3, 0.1, 1.9 - i * 0.35, C.stone3, 0, i * 0.1, d / 2 + 0.95 - i * 0.17);
    for (let i = 0; i < 6; i++) { const cx = -pw / 2 + 0.25 + (i * (pw - 0.5)) / 5; b.cyl(0.13, 2.1, C.white, cx, PLINTH, pz, { seg: 12 }); b.box(0.36, 0.1, 0.36, C.stone4, cx, PLINTH + 2.08, pz); }
    b.box(pw + 0.4, 0.42, 1.3, C.white, 0, PLINTH + 2.18, d / 2 + 0.6, { r: 0.04 });
    b.box(pw + 0.55, 0.08, 1.42, C.teal, 0, PLINTH + 2.6, d / 2 + 0.6);
    b.quad(3.6, 0.34, 0, PLINTH + 2.39, d / 2 + 1.256, k.sign('hall', 3.6, 0.34));
    b.box(1.2, 1.3, 0.06, C.glass, 0, PLINTH, d / 2 + 0.01, { kind: 'glass', ext: 1 });
    const ty = H + 0.02;
    b.box(2.3, 2.5, 2.1, C.teal, 0, ty, -0.3, { r: 0.08 });
    for (let i = 0; i < 3; i++) b.box(2.0, 0.42, 0.05, C.mint, 0, ty + 0.4 + i * 0.68, 0.76, { kind: 'glass', ext: 1 });
    for (const sx of [1.16, -1.16]) for (let i = 0; i < 3; i++) b.box(0.05, 0.42, 1.8, C.mint, sx, ty + 0.4 + i * 0.68, -0.3, { kind: 'glass', ext: 1 });
    b.box(2.5, 0.14, 2.3, C.white, 0, ty + 2.5, -0.3);
    b.box(1.0, 1.0, 0.04, C.white, 0, ty + 0.75, 0.78, { r: 0.04 });
    b.quad(0.9, 0.9, 0, ty + 1.25, 0.805, k.emblem('hall'));
    P.flagpole(b, 0.6, -0.8, C.teal, { y: ty + 2.64, h: 1.8 });
    for (const sx of [-w / 2 + 1.2, w / 2 - 1.2]) { b.box(1.4, 0.5, 1.4, C.white, sx, H + 0.02, -0.4, { r: 0.05 }); b.cone(0.95, 0.55, C.tealSoft, sx, H + 0.52, -0.4, { seg: 4, ry: Math.PI / 4 }); }
    return ty + 4.4;
  },

  triage(b, w, d, k) {
    const H = PLINTH + 3 * FH;
    b.box(w + 0.12, PLINTH, d + 0.12, C.stoneDark, 0, 0, 0, { r: 0.05 });
    b.box(w, H - PLINTH, d, '#e9ecea', 0, PLINTH, 0, { r: 0.06 });
    for (let f = 0; f < 3; f++) {
      const y = PLINTH + f * FH + 0.22;
      b.box(w + 0.02, 0.58, d + 0.02, C.glassDeep, 0, y, 0, { kind: 'glass', ext: f === 0 || k.R() < 0.6 ? 1 : 0 });
      b.box(w + 0.08, 0.08, d + 0.08, C.white, 0, y + 0.6, 0);
    }
    b.box(w + 0.1, 0.1, d + 0.1, C.white, 0, H, 0);
    for (const [bx, bz, bw, bd] of [[0, d / 2, w + 0.14, 0.1], [0, -d / 2, w + 0.14, 0.1], [w / 2, 0, 0.1, d + 0.14], [-w / 2, 0, 0.1, d + 0.14]]) b.box(bw, 0.2, bd, C.orange, bx, H, bz);
    b.box(2.0, 1.18, 0.1, C.metalDark, -0.7, PLINTH + 1.1, d / 2 + 0.07, { r: 0.03 });
    b.quad(1.88, 1.06, -0.7, PLINTH + 1.69, d / 2 + 0.125, k.custom('triage'));
    b.box(0.8, 0.85, 0.06, C.glass, 1.2, PLINTH, d / 2 + 0.03, { kind: 'glass', ext: 1 });
    b.box(1.2, 0.06, 0.6, C.orange, 1.2, PLINTH + 0.88, d / 2 + 0.28);
    b.cyl(0.05, 2.2, C.metalDark, -w / 2 + 0.6, H + 0.1, -d / 2 + 0.6, { seg: 6 });
    for (let i = 0; i < 3; i++) b.box(0.5 - i * 0.12, 0.03, 0.03, C.metalDark, -w / 2 + 0.6, H + 0.9 + i * 0.45, -d / 2 + 0.6);
    k.dynamic.push({ type: 'beacon', local: [-w / 2 + 0.6, H + 2.38, -d / 2 + 0.6] });
    b.box(0.9, 0.25, 0.9, C.white, 0.9, H + 0.1, 0.5, { r: 0.04 });
    k.dynamic.push({ type: 'radar', local: [0.9, H + 0.35, 0.5] });
    roofline(b, k, 'triage', H - 0.18, d, { sw: 2.6, sh: 0.55 });
    return H + 2.5;
  },

  depot(b, w, d, k) {
    const H = 1.85;
    b.box(w + 0.12, 0.12, d + 0.12, C.stoneDark, 0, 0, 0, { r: 0.04 });
    b.box(w, H, d, '#e6e2d8', 0, 0.1, 0, { r: 0.06 });
    for (const dx of [-1.05, 1.05]) {
      b.box(1.36, 1.22, 0.08, '#1f2a2e', dx, 0.1, d / 2 - 0.02);
      b.box(1.5, 0.08, 0.14, C.orange, dx, 1.32, d / 2 + 0.03);
      b.box(0.08, 1.24, 0.14, C.orange, dx - 0.72, 0.1, d / 2 + 0.03); b.box(0.08, 1.24, 0.14, C.orange, dx + 0.72, 0.1, d / 2 + 0.03);
      b.cyl(0.11, 1.3, '#cfd5d2', dx + 0.65, 1.2, d / 2 + 0.02, { rz: Math.PI / 2, seg: 8 });
    }
    b.box(w - 0.4, 0.16, d - 0.6, C.white, 0, H + 0.1, -0.1);
    for (let i = 0; i < 3; i++) b.box(1.1, 0.04, 0.8, C.solar, -1.3 + i * 1.3, H + 0.38, -0.4, { rx: -0.45, kind: 'glass' });
    b.box(w - 0.2, 0.44, 0.06, C.white, 0, 1.42, d / 2 + 0.01);
    b.quad(w - 0.3, 0.36, 0, 1.64, d / 2 + 0.045, k.sign('depot', w - 0.3, 0.36));
    k.dynamic.push({ type: 'beacon', local: [w / 2 - 0.25, H + 0.36, d / 2 - 0.25] });
    b.cyl(0.08, 0.22, '#6b5a2e', w / 2 - 0.25, H + 0.1, d / 2 - 0.25, { seg: 8 });
    return H + 1.2;
  },

  clock(b, w, d, k) {
    const H = standard(b, w, d, { floors: 2, color: C.stoneWarm, arch: true, shop: true, shopW: 1.6, shopX: -0.5, doorX: 1.0, awning: [C.teal, C.white], tanks: 0, solar: false, stairHut: false, ac: 1, dish: false, groundFront: true }, k.R);
    const sw = 1.5, base = H + 0.02, top = base + 3.7, hw = (sw + 0.32) / 2;
    b.box(sw, top - base, sw, C.stone2, 0, base, -0.1, { r: 0.05 });
    for (let i = 1; i < 4; i++) b.box(sw + 0.08, 0.06, sw + 0.08, C.stone4, 0, base + i * 0.9, -0.1);
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { b.push(0, 0, -0.1, ry); b.box(0.22, 0.6, 0.04, C.glassDeep, 0, base + 1.2, sw / 2, { kind: 'glass', ext: 1 }); b.pop(); }
    b.box(sw + 0.32, 1.45, sw + 0.32, C.white, 0, top, -0.1, { r: 0.06 });
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      b.push(0, 0, -0.1, ry);
      b.cyl(0.6, 0.06, '#e7c76a', 0, top + 0.72, hw - 0.02, { rx: Math.PI / 2, seg: 24 });
      b.quad(1.08, 1.08, 0, top + 0.72, hw + 0.045, k.custom('clock'));
      b.pop();
      k.dynamic.push({ type: 'clockface', local: [Math.sin(ry) * (hw + 0.065), top + 0.72, -0.1 + Math.cos(ry) * (hw + 0.065)], ry });
    }
    b.box(sw + 0.5, 0.12, sw + 0.5, C.stone4, 0, top + 1.45, -0.1);
    b.cone(1.18, 1.25, C.tealSoft, 0, top + 1.57, -0.1, { seg: 4, ry: Math.PI / 4 });
    b.ball(0.1, '#e7c76a', 0, top + 2.86, -0.1, { detail: 1 });
    return top + 2.95;
  },

  observatory(b, w, d, k) {
    const r = 1.75, cz = -0.35;
    b.cyl(r + 0.12, PLINTH, C.stoneDark, 0, 0, cz, { seg: 24 });
    b.cyl(r, 1.9, C.white, 0, PLINTH, cz, { seg: 24 });
    b.cyl(r + 0.06, 0.08, C.teal, 0, PLINTH + 1.9, cz, { seg: 24 });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.push(Math.sin(a) * (r - 0.01), 0, cz + Math.cos(a) * (r - 0.01), a); b.box(0.3, 0.5, 0.06, C.glass, 0, PLINTH + 1.0, 0.0, { kind: 'glass', ext: i % 2 }); b.pop(); }
    b.dome(r - 0.02, '#e3e9ea', 0, PLINTH + 1.98, cz, { seg: 24 });
    for (let i = 0; i < 4; i++) { const a = 0.18 + i * 0.34; b.box(0.4, 0.44, 0.08, C.metalDark, 0, PLINTH + 1.88 + Math.sin(a) * (r - 0.06), cz + Math.cos(a) * (r - 0.06), { rx: -a }); }
    b.cyl(0.16, 1.1, C.metalDark, 0, PLINTH + 2.55, cz + 0.4, { rx: 0.9, seg: 10 });
    b.box(2.3, 1.45, 0.9, C.white, 0, 0, d / 2 - 0.45, { r: 0.05 });
    b.quad(1.95, 1.02, 0, 0.82, d / 2 + 0.006, k.custom('heatmap'));
    b.box(2.4, 0.08, 1.0, C.teal, 0, 1.45, d / 2 - 0.45);
    b.cyl(0.08, 0.9, C.metal, w / 2 - 0.2, 0, -d / 2 + 0.5, { seg: 6 });
    b.dome(0.55, '#eef0ee', w / 2 - 0.2, 1.1, -d / 2 + 0.5, { rx: -0.9, ry: -0.7, sy: 0.32, seg: 16 });
    roofline(b, k, 'observatory', 1.3, 0.9, { sw: 2.2, sh: 0.48, z: d / 2 - 0.45 + 0.39, ph: 0.12 });
    return PLINTH + 2 + r + 0.3;
  },

  idcenter(b, w, d, k) {
    const H = standard(b, w, d, { floors: 3, color: C.stone4, spacing: 0.8, winW: 0.56, winH: 0.72, mullion: true, glass: C.glassDeep, accent: '#4f78a8', groundFront: true, tanks: 1, solar: true, ac: 2, entrance: false }, k.R);
    b.box(w * 0.6, 0.8, 0.06, C.glass, 0, PLINTH, d / 2 + 0.005, { kind: 'glass', ext: 1 });
    b.box(w * 0.75, 0.1, 1.1, '#4f78a8', 0, PLINTH + 0.86, d / 2 + 0.5, { r: 0.03 });
    for (const sx of [-1.7, 1.7]) b.cyl(0.05, 0.86, C.white, sx, PLINTH, d / 2 + 0.95, { seg: 6 });
    b.box(1.45, 1.0, 0.08, C.white, w / 2 - 1.15, PLINTH + 1.3, d / 2 + 0.03, { r: 0.04 });
    b.quad(1.32, 0.88, w / 2 - 1.15, PLINTH + 1.8, d / 2 + 0.075, k.custom('idcard'));
    for (const sx of [-0.7, 0, 0.7]) P.bollard(b, sx, d / 2 + 1.2 - 0.22);
    return roofline(b, k, 'idcenter', H, d, { sw: 2.6, sh: 0.58 });
  },

  welcome(b, w, d, k) {
    const H = standard(b, w, d, { floors: 2, color: '#f2e2c4', arch: true, shutters: '#4f78a8', accent: '#4f78a8', tanks: 2, spacing: 1.0 }, k.R);
    const bunt = [C.orange, C.teal, C.yellow, '#4f78a8', C.pink];
    for (let i = 0; i < 9; i++) b.box(0.2, 0.2, 0.015, bunt[i % 5], -w / 2 + 0.45 + i * (w - 0.9) / 8, PLINTH + 0.88 + 0.1 - Math.sin((i / 8) * Math.PI) * 0.12, d / 2 + 0.55, { rz: Math.PI / 4, kind: 'foliage', ext: 0.2 });
    b.box(w - 0.6, 0.012, 0.012, '#d9dcd9', 0, PLINTH + 1.12, d / 2 + 0.55);
    for (const sx of [-w / 2 + 0.28, w / 2 - 0.28]) b.box(0.05, 1.15, 0.05, C.metalDark, sx, 0, d / 2 + 0.55);
    P.planter(b, -1.6, d / 2 + 0.3, 0.9, 0.36, C.leaf3, { y: 0, flowers: true });
    P.planter(b, 1.6, d / 2 + 0.3, 0.9, 0.36, C.leaf3, { y: 0, flowers: true });
    P.bougainvillea(b, w / 2 - 0.3, PLINTH + 1.15, d / 2 + 0.1, { n: 4 });
    return roofline(b, k, 'welcome', H, d, { sw: 2.4, sh: 0.55 });
  },

  post(b, w, d, k) {
    const H = standard(b, w, d, { floors: 2, color: C.stone, arch: true, accent: '#4f78a8', door: '#4f78a8', tanks: 2, solar: true, spacing: 1.05 }, k.R);
    b.box(0.42, 0.62, 0.36, '#4f78a8', w / 2 - 0.6, 0, d / 2 + 0.55, { r: 0.08 });
    b.cyl(0.21, 0.36, '#4f78a8', w / 2 - 0.6, 0.62, d / 2 + 0.37, { rx: Math.PI / 2, seg: 14 });
    b.box(0.26, 0.03, 0.02, C.white, w / 2 - 0.6, 0.52, d / 2 + 0.74);
    b.box(0.34, 0.26, 0.3, '#c9a477', -w / 2 + 0.6, 0, d / 2 + 0.5, { r: 0.02 });
    b.box(0.26, 0.2, 0.24, '#d8b88a', -w / 2 + 0.62, 0.26, d / 2 + 0.5, { r: 0.02 });
    return roofline(b, k, 'post', H, d, { sw: 2.4, sh: 0.55 });
  },

  lostfound(b, w, d, k) {
    const H = standard(b, w, d, { floors: 2, color: C.stoneWarm, shop: true, shopW: 2.3, shopX: -0.5, doorX: 1.35, groundFront: true, awning: ['#4f78a8', C.white], tanks: 1, solar: true }, k.R);
    roofSign(b, k, 'lostfound', -1.1, H + 0.02, -0.6, 0, 0.85);
    return roofline(b, k, 'lostfound', H, d, { sw: 2.4, sh: 0.55 });
  },

  locksmith(b, w, d, k) {
    const H = standard(b, w, d, { floors: 2, color: C.stone2, shop: true, shopW: 2.2, shopX: 0.6, doorX: -1.4, groundFront: true, awning: [C.yellow, C.white], tanks: 2 }, k.R);
    b.push(w / 2 - 0.15, PLINTH + 1.3, d / 2 + 0.05, 0);
    b.box(0.05, 0.05, 0.75, C.metalDark, 0, 0.45, 0.37);
    b.torus(0.18, 0.055, '#e2b64a', 0, 0.2, 0.6, { ry: Math.PI / 2 });
    b.box(0.07, 0.5, 0.07, '#e2b64a', 0, -0.48, 0.6);
    b.box(0.06, 0.08, 0.16, '#e2b64a', 0, -0.4, 0.67); b.box(0.06, 0.08, 0.12, '#e2b64a', 0, -0.25, 0.65);
    b.box(0.012, 0.18, 0.012, C.metalDark, 0, 0.35, 0.6);
    b.pop();
    return roofline(b, k, 'locksmith', H, d, { sw: 2.4, sh: 0.55 });
  },

  vault(b, w, d, k) {
    const H = standard(b, w, d, { floors: 2, color: '#e8dcc6', spacing: 1.25, winW: 0.42, accent: '#4f78a8', entrance: false, tanks: 1, solar: true, parapetH: 0.4 }, k.R);
    for (const sx of [-2.4, -1.2, 1.2, 2.4]) b.box(0.3, H - PLINTH, 0.18, C.white, sx, PLINTH, d / 2 + 0.06);
    b.cyl(0.62, 0.12, '#9aa7aa', 0, PLINTH + 0.68, d / 2, { rx: Math.PI / 2, seg: 24, kind: 'metal' });
    b.cyl(0.48, 0.05, '#c3ccce', 0, PLINTH + 0.68, d / 2 + 0.12, { rx: Math.PI / 2, seg: 24, kind: 'metal' });
    for (let i = 0; i < 3; i++) b.box(0.7, 0.05, 0.05, C.metalDark, 0, PLINTH + 0.66, d / 2 + 0.2, { rz: (i * Math.PI) / 3 });
    b.box(1.8, 0.08, 0.6, C.stone3, 0, 0, d / 2 + 0.3);
    roofSign(b, k, 'vault', 1.6, H + 0.02, -0.4, 0, 0.9);
    return roofline(b, k, 'vault', H, d, { sw: 2.6, sh: 0.58, ph: 0.4 });
  },
};

// Neighbourhood mosque: decorative, never a navigation target.
export function mosque(b, x, z, ry = Math.PI / 4) {
  b.push(x, 0, z, ry);
  b.box(4.6, 0.3, 4.6, C.stoneDark, 0, 0, 0, { r: 0.05 });
  b.box(4.2, 2.1, 4.2, C.stone4, 0, 0.3, 0, { r: 0.06 });
  for (const ry2 of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    b.push(0, 0, 0, ry2);
    for (const u of [-1.2, 0, 1.2]) { b.box(0.46, 0.85, 0.06, C.glassDeep, u, 0.9, 2.1, { kind: 'glass', ext: 0.6 }); b.cyl(0.23, 0.06, C.glassDeep, u, 1.75, 2.07, { rx: Math.PI / 2, seg: 12, kind: 'glass', ext: 0.6 }); }
    b.pop();
  }
  b.box(4.4, 0.12, 4.4, C.white, 0, 2.4, 0);
  b.cyl(1.2, 0.5, C.white, 0, 2.5, 0, { seg: 20 });
  b.dome(1.25, C.tealSoft, 0, 3.0, 0, { seg: 22 });
  b.cyl(0.03, 0.55, '#e7c76a', 0, 4.2, 0, { seg: 6 });
  b.ball(0.08, '#e7c76a', 0, 4.75, 0, { detail: 1 });
  const mx = 2.2, mz = -2.2;
  b.cyl(0.5, 0.4, C.stoneDark, mx, 0, mz, { seg: 8 });
  b.cyl(0.38, 5.2, C.stone4, mx, 0.4, mz, { seg: 8, top: 0.86 });
  b.cyl(0.55, 0.14, C.white, mx, 4.0, mz, { seg: 10 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.box(0.05, 0.3, 0.05, C.white, mx + Math.cos(a) * 0.5, 4.14, mz + Math.sin(a) * 0.5); }
  b.cyl(0.56, 0.05, C.white, mx, 4.44, mz, { seg: 10 });
  b.cyl(0.26, 0.9, C.stone4, mx, 4.5, mz, { seg: 8 });
  b.cone(0.32, 0.9, C.tealSoft, mx, 5.4, mz, { seg: 8 });
  b.ball(0.07, '#e7c76a', mx, 6.36, mz, { detail: 1 });
  b.pop();
}

// Plain neighbourhood buildings for the city edge (not navigation targets).
export function filler(b, x, z, w, d, floors, ry, R, o = {}) {
  b.push(x, o.y ?? LOT, z, ry);
  standard(b, w, d, { floors, color: o.color ?? R.pick([C.stone, C.stone2, C.stone4, C.stoneWarm]), arch: R() < 0.4, shutters: R() < 0.4 ? R.pick([C.teal, '#6f9a8a', '#4f78a8']) : null, balconies: floors > 2 && R() < 0.6, accent: R.pick([C.teal, C.orange, '#4f78a8']), lit: 0.5, ...o }, R);
  b.pop();
}
