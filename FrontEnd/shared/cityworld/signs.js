import * as THREE from './three.js';

// One canvas texture holds every sign, clock face and billboard so they share a draw call
// per building. Icons are simple original glyphs drawn on a 24-unit grid.
const ICONS = {
  home: (c) => { c.path('M3 11 12 3.5 21 11V20.5H14.5V14.5H9.5V20.5H3Z'); },
  apartment: (c) => { c.path('M4 21V3.5H14V8.5H20V21Z'); c.cut([[6.5, 6], [9.5, 6], [6.5, 10], [9.5, 10], [6.5, 14], [9.5, 14], [15.5, 11.5], [15.5, 15.5]], 2); },
  bell: (c) => { c.path('M12 2.8C8.3 2.8 6.2 5.6 6.2 9.6V14.6L4 17.2V18.4H20V17.2L17.8 14.6V9.6C17.8 5.6 15.7 2.8 12 2.8Z'); c.circle(12, 20, 2); },
  plus: (c) => { c.rect(10, 3.5, 4, 17); c.rect(3.5, 10, 17, 4); },
  check: (c) => { c.stroke('M4.5 12.5 9.8 17.6 19.5 6.8', 3.2); },
  folder: (c) => { c.path('M2.5 5.5H9.8L12 7.8H21.5V19.5H2.5Z'); },
  user: (c) => { c.circle(12, 8, 4.3); c.path('M3.8 21C4.6 15.9 8 13.8 12 13.8S19.4 15.9 20.2 21Z'); },
  idcard: (c) => { c.path('M2.5 5H21.5V19H2.5Z'); c.cutCircle(8, 11, 2.4); c.cutRect(5, 15, 6, 1.6); c.cutRect(13, 9, 6, 1.6); c.cutRect(13, 12.5, 5, 1.6); },
  userplus: (c) => { c.circle(9.5, 8, 4); c.path('M2 20.5C2.7 15.8 5.8 13.8 9.5 13.8S16.3 15.8 17 20.5Z'); c.rect(18, 5, 2.4, 9); c.rect(14.7, 8.3, 9, 2.4); },
  question: (c) => { c.stroke('M8 8.5C8 5.8 9.9 4 12.2 4S16.4 5.6 16.4 8C16.4 11.4 12.3 11.4 12.3 15', 3.2); c.circle(12.3, 19.6, 1.9); },
  mail: (c) => { c.path('M2.5 5H21.5V19H2.5Z'); c.cutStroke('M3.8 6.6 12 13 20.2 6.6', 2.1); },
  key: (c) => { c.ring(7.5, 12, 4.6, 2.3); c.rect(11.5, 10.8, 10.5, 2.6); c.rect(17.5, 12.6, 2.3, 4); c.rect(20.4, 12.6, 1.8, 2.8); },
  shield: (c) => { c.path('M12 2 20 5V11C20 16 16.6 20.2 12 22 7.4 20.2 4 16 4 11V5Z'); c.cutStroke('M8 12 11 15 16.5 9', 2.4); },
  columns: (c) => { c.path('M12 2.5 21.5 7.5V9.5H2.5V7.5Z'); [4.5, 9.2, 13.8, 18.5].forEach((x) => c.rect(x, 10.6, 2.2, 7.4)); c.rect(2.5, 19, 19, 2.4); },
  alert: (c) => { c.path('M12 2.8 22 20.6H2Z'); c.cutRect(10.9, 8.5, 2.2, 6.4); c.cutCircle(12, 17.4, 1.3); },
  truck: (c) => { c.path('M1.5 5.5H14.5V16.5H1.5Z'); c.path('M15.5 9H19.5L22.5 12.5V16.5H15.5Z'); c.circle(6, 18, 2.4); c.circle(18, 18, 2.4); },
  clock: (c) => { c.ring(12, 12, 8.6, 2.4); c.rect(11, 6.5, 2.2, 6.5); c.stroke('M12 12 16 14.5', 2.2); },
  heat: (c) => { c.path('M12 2C13.8 6.2 18.5 8.3 18.5 13.6 18.5 18 15.5 21.5 12 21.5S5.5 18 5.5 13.6C5.5 10.2 8.2 8.6 8.8 5.8 10.6 7.6 11.6 5 12 2Z'); c.cutCircle(12, 15.5, 2.6); },
  map: (c) => { c.path('M2.5 5.5 8.5 3.5 15.5 6 21.5 4V18.5L15.5 20.5 8.5 18 2.5 20Z'); c.cutRect(8, 4.6, 1.2, 13); c.cutRect(14.9, 6.8, 1.2, 13); },
  megaphone: (c) => { c.path('M3 9.5H7.5L16.5 4.5V19.5L7.5 14.5H3Z'); c.rect(5.6, 14.5, 2.6, 5.5); c.stroke('M19 9C20.4 10.6 20.4 13.4 19 15', 2); },
  pin: (c) => { c.path('M12 22C8 17.2 4.8 13.6 4.8 9.6 4.8 5.6 8 2.5 12 2.5S19.2 5.6 19.2 9.6C19.2 13.6 16 17.2 12 22Z'); c.cutCircle(12, 9.6, 2.8); },
  info: (c) => { c.circle(12, 12, 9.5); c.cutRect(10.8, 10.2, 2.4, 7.5); c.cutCircle(12, 7.3, 1.5); },
  parcel: (c) => { c.path('M12 2.5 21 7V17L12 21.5 3 17V7Z'); c.cutStroke('M3.6 7.4 12 11.6 20.4 7.4M12 11.6V21', 1.6); },
  wrench: (c) => { c.path('M20.5 6.6 17.3 9.8 14.4 9.6 14.2 6.7 17.4 3.5C14.9 2.6 12 3.6 10.9 6.1 10.4 7.3 10.4 8.5 10.8 9.7L3.4 17.1C2.6 17.9 2.6 19.2 3.4 20S5.6 20.8 6.4 20L13.8 12.6C16.2 13.4 18.9 12.2 20 9.8 20.5 8.8 20.6 7.6 20.5 6.6Z'); },
};

export function createSignAtlas(size = 2048) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  let cx = 0, cy = 0, rowH = 0;
  const pad = 6;
  function region(w, h) {
    if (cx + w + pad > size) { cx = 0; cy += rowH + pad; rowH = 0; }
    const r = { x: cx, y: cy, w, h };
    cx += w + pad; rowH = Math.max(rowH, h);
    return r;
  }
  const uvOf = (r) => [r.x / size, 1 - (r.y + r.h) / size, (r.x + r.w) / size, 1 - r.y / size];

  function icon(name, x, y, s, color, cutColor) {
    const draw = ICONS[name]; if (!draw) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
    const api = {
      path(d) { ctx.fillStyle = color; ctx.fill(new Path2D(d)); },
      rect(a, b, w, h) { ctx.fillStyle = color; ctx.fillRect(a, b, w, h); },
      circle(a, b, r) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(a, b, r, 0, Math.PI * 2); ctx.fill(); },
      ring(a, b, r, t) { ctx.strokeStyle = color; ctx.lineWidth = t; ctx.beginPath(); ctx.arc(a, b, r - t / 2, 0, Math.PI * 2); ctx.stroke(); },
      stroke(d, t) { ctx.strokeStyle = color; ctx.lineWidth = t; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(d)); },
      cut(points, s2) { ctx.fillStyle = cutColor; points.forEach(([a, b]) => ctx.fillRect(a, b, s2, s2)); },
      cutRect(a, b, w, h) { ctx.fillStyle = cutColor; ctx.fillRect(a, b, w, h); },
      cutCircle(a, b, r) { ctx.fillStyle = cutColor; ctx.beginPath(); ctx.arc(a, b, r, 0, Math.PI * 2); ctx.fill(); },
      cutStroke(d, t) { ctx.strokeStyle = cutColor; ctx.lineWidth = t; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(d)); },
    };
    draw(api);
    ctx.restore();
  }
  function roundRect(x, y, w, h, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
  function fitText(text, maxW, weight, sizePx, family) {
    let s = sizePx;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 10);
  }
  const HEAD = '"Space Grotesk", "Public Sans", Arial, sans-serif', BODY = '"Public Sans", Arial, sans-serif';

  // Facade sign: coloured plate with an icon roundel and a title.
  function sign({ title, sub = '', icon: name = 'info', bg = '#087f80', fg = '#fafaf6', w = 512, h = 150 }) {
    const r = region(w, h), pad = Math.round(h * 0.13);
    roundRect(r.x, r.y, r.w, r.h, Math.round(h * 0.16), bg);
    const d = h - pad * 2;
    roundRect(r.x + pad, r.y + pad, d, d, d / 2, fg);
    icon(name, r.x + pad + d * 0.2, r.y + pad + d * 0.2, d * 0.6, bg, fg);
    const tx = r.x + pad * 2 + d, maxW = r.w - (pad * 3 + d);
    ctx.fillStyle = fg; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    fitText(title, maxW, 700, Math.round(h * (sub ? 0.36 : 0.44)), HEAD);
    ctx.fillText(title, tx, r.y + h * (sub ? 0.52 : 0.64));
    if (sub) {
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
      fitText(sub.toUpperCase(), maxW, 600, Math.round(h * 0.17), BODY);
      ctx.globalAlpha = 0.86; ctx.fillText(sub.toUpperCase(), tx, r.y + h * 0.8); ctx.globalAlpha = 1;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    return uvOf(r);
  }
  // Square emblem: an icon on a coloured disc, used on rooftops and totems.
  function emblem(name, bg = '#087f80', fg = '#fafaf6', s = 192) {
    const r = region(s, s);
    roundRect(r.x, r.y, s, s, s * 0.24, bg);
    icon(name, r.x + s * 0.18, r.y + s * 0.18, s * 0.64, fg, bg);
    return uvOf(r);
  }
  function custom(w, h, draw) {
    const r = region(w, h);
    ctx.save(); ctx.translate(r.x, r.y); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    draw(ctx, w, h, { icon: (n, x, y, s, c, cut) => icon(n, x, y, s, c, cut), roundRect: (x, y, ww, hh, rr, f) => roundRect(x, y, ww, hh, rr, f), HEAD, BODY });
    ctx.restore();
    return uvOf(r);
  }
  return { canvas, texture, sign, emblem, custom, refresh() { texture.needsUpdate = true; } };
}

export async function loadSignFonts(timeout = 1600) {
  if (!document.fonts?.load) return;
  const wait = Promise.all([
    document.fonts.load('700 60px "Space Grotesk"'),
    document.fonts.load('600 24px "Public Sans"'),
  ]).catch(() => {});
  await Promise.race([wait, new Promise((r) => setTimeout(r, timeout))]);
}
