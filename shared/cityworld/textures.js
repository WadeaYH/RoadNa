// Sign copy and small procedural illustrations painted into the shared sign atlas.
const BLUE = '#4f78a8', ORANGE = '#e0862f', GREEN = '#4f9a6b', TEAL = '#087f80';

export const SIGN_TEXT = {
  visitor: { title: 'RoadNa JO', sub: 'Visitor Centre', icon: 'columns', bg: TEAL },
  map: { title: 'MAP CENTRE  ·  PUBLIC REPORTS', icon: 'map', bg: GREEN, banner: true },
  community: { title: 'Community Centre', sub: 'Report details', icon: 'megaphone', bg: GREEN },
  apartments: { title: 'Yasmeen Apartments', sub: 'Profile & settings', icon: 'user', bg: ORANGE },
  home: { title: 'RESIDENT HOME', icon: 'home', bg: ORANGE, banner: true },
  archive: { title: 'Reports Archive', sub: 'My reports', icon: 'folder', bg: ORANGE },
  bell: { title: 'Bell Tower', sub: 'Notifications', icon: 'bell', bg: ORANGE },
  kiosk: { title: 'Report Kiosk', sub: 'Create report', icon: 'plus', bg: ORANGE },
  dropbox: { title: 'Drop Office', sub: 'Report submitted', icon: 'parcel', bg: ORANGE },
  hall: { title: 'CITY HALL  ·  MUNICIPALITY', icon: 'columns', bg: '#fffdf8', fg: TEAL, banner: true },
  triage: { title: 'Triage Centre', sub: 'Incident triage', icon: 'alert', bg: TEAL },
  depot: { title: 'CREW DEPOT  ·  DISPATCH', icon: 'truck', bg: TEAL, banner: true },
  observatory: { title: 'Data Observatory', sub: 'Incident heatmap', icon: 'heat', bg: TEAL },
  idcenter: { title: 'Civic ID Centre', sub: 'Login', icon: 'idcard', bg: BLUE },
  welcome: { title: 'Welcome Office', sub: 'Register', icon: 'userplus', bg: BLUE },
  post: { title: 'Post Office', sub: 'Check email', icon: 'mail', bg: BLUE },
  lostfound: { title: 'Lost & Found', sub: 'Forgot password', icon: 'question', bg: BLUE },
  locksmith: { title: 'Locksmith', sub: 'Reset password', icon: 'key', bg: BLUE },
  vault: { title: 'Secure Vault', sub: 'Password updated', icon: 'shield', bg: BLUE },
};

export const EMBLEMS = {
  visitor: ['pin', TEAL], hall: ['columns', TEAL], home: ['home', ORANGE], triage: ['alert', TEAL],
  lostfound: ['question', BLUE], vault: ['shield', BLUE], community: ['megaphone', GREEN], dropbox: ['check', GREEN],
};

export function drawBanner(ctx, w, h, t, u) {
  const fg = t.fg ?? '#fafaf6';
  u.roundRect(0, 0, w, h, Math.min(18, h * 0.3), t.bg);
  const s = h * 0.62;
  u.icon(t.icon, h * 0.3, (h - s) / 2, s, fg, t.bg);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = Math.round(h * 0.56);
  do { ctx.font = `700 ${size}px ${u.HEAD}`; size -= 2; } while (ctx.measureText(t.title).width > w - h * 2.2 && size > 10);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(h * 0.04)}px`;
  ctx.fillText(t.title, w / 2 + h * 0.3, h * 0.54);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  u.icon(t.icon, w - h * 0.3 - s, (h - s) / 2, s, fg, t.bg);
}

export const CUSTOM = {
  cityMap: [256, 172, (c, w, h) => {
    c.fillStyle = '#ddf5f0'; c.fillRect(0, 0, w, h);
    const blocks = [['#e2eaf4', 24, 22, 92, 50], ['#d9f0ec', 140, 22, 92, 50], ['#fbecd9', 24, 100, 92, 50], ['#e3f1e6', 140, 100, 92, 50]];
    blocks.forEach(([col, x, y, bw, bh]) => { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, bw, bh, 8); c.fill(); });
    c.strokeStyle = '#303b42'; c.lineWidth = 9; c.lineJoin = 'round';
    c.beginPath(); c.roundRect(14, 12, w - 28, h - 24, 22); c.stroke();
    c.beginPath(); c.moveTo(14, h / 2); c.lineTo(w - 14, h / 2); c.moveTo(w / 2, 12); c.lineTo(w / 2, h - 12); c.stroke();
    const pin = (x, y, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y - 9, 8, Math.PI, 0); c.lineTo(x, y + 2); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y - 9, 3, 0, Math.PI * 2); c.fill(); };
    pin(196, 90, '#f6a649'); pin(70, 46, '#087f80'); pin(170, 130, '#d9564a'); pin(92, 124, '#f6a649'); pin(120, 72, '#087f80');
  }],
  notices: [256, 168, (c, w, h) => {
    c.fillStyle = '#c99c6b'; c.fillRect(0, 0, w, h);
    const notes = [[14, 14, 70, 64, '#fffdf8', -0.06], [96, 10, 64, 56, '#ddf5f0', 0.05], [172, 18, 70, 62, '#fff1d9', -0.04], [22, 92, 92, 62, '#fffdf8', 0.03], [128, 86, 54, 66, '#f6a649', -0.05], [190, 96, 54, 56, '#e2eaf4', 0.06]];
    notes.forEach(([x, y, nw, nh, col, rot], i) => {
      c.save(); c.translate(x + nw / 2, y + nh / 2); c.rotate(rot);
      c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-nw / 2 + 3, -nh / 2 + 3, nw, nh);
      c.fillStyle = col; c.fillRect(-nw / 2, -nh / 2, nw, nh);
      c.fillStyle = 'rgba(48,59,66,.5)'; for (let l = 0; l < 4; l++) c.fillRect(-nw / 2 + 8, -nh / 2 + 14 + l * 10, nw - 16 - (l % 2) * 12, 4);
      c.fillStyle = i % 2 ? '#d9564a' : '#087f80'; c.beginPath(); c.arc(0, -nh / 2 + 5, 4, 0, Math.PI * 2); c.fill();
      c.restore();
    });
  }],
  triage: [384, 216, (c, w, h) => {
    c.fillStyle = '#16262c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#087f80'; c.fillRect(0, 0, w, 30);
    c.fillStyle = '#ddf5f0'; c.font = '700 18px "Space Grotesk", Arial'; c.textBaseline = 'middle'; c.fillText('INCOMING REPORTS', 14, 16);
    const rows = [['#f6a649', 0.9], ['#d9564a', 0.7], ['#37e08e', 0.55], ['#f6a649', 0.8], ['#4f78a8', 0.6]];
    rows.forEach(([col, len], i) => { const y = 46 + i * 28; c.fillStyle = col; c.beginPath(); c.arc(22, y + 6, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(221,245,240,.75)'; c.fillRect(38, y + 2, 150 * len, 8); c.fillStyle = 'rgba(221,245,240,.3)'; c.fillRect(38, y + 14, 90 * len, 5); });
    [52, 80, 38, 96, 64, 110, 72].forEach((v, i) => { c.fillStyle = i === 5 ? '#f6a649' : '#3e9c98'; c.fillRect(232 + i * 20, 190 - v, 13, v); });
    c.fillStyle = 'rgba(221,245,240,.4)'; c.fillRect(226, 192, 146, 2);
  }],
  clock: [256, 256, (c, w, h) => {
    c.fillStyle = '#fffdf8'; c.beginPath(); c.arc(128, 128, 124, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#303b42'; c.lineWidth = 8; c.beginPath(); c.arc(128, 128, 116, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.save(); c.translate(128, 128); c.rotate(a); c.fillStyle = i % 3 ? '#5b6b6e' : '#087f80'; c.fillRect(-4, -104, 8, i % 3 ? 16 : 26); c.restore(); }
    c.fillStyle = '#087f80'; c.font = '700 22px "Space Grotesk", Arial'; c.textAlign = 'center'; c.fillText('ROADNA', 128, 176);
  }],
  heatmap: [384, 200, (c, w, h) => {
    c.fillStyle = '#eef4f2'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(48,59,66,.12)'; c.lineWidth = 1; for (let x = 0; x < w; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.strokeStyle = 'rgba(48,59,66,.35)'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 104); c.lineTo(w, 96); c.moveTo(150, 0); c.lineTo(170, h); c.stroke();
    [[120, 80, 70, 1], [250, 120, 60, 0.85], [300, 50, 40, 0.6], [80, 150, 46, 0.55]].forEach(([x, y, r, a]) => {
      const g = c.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(217,86,74,${a})`); g.addColorStop(0.45, `rgba(246,166,73,${a * 0.75})`); g.addColorStop(1, 'rgba(246,197,79,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    });
    const lg = c.createLinearGradient(14, 0, 134, 0); lg.addColorStop(0, '#f6c54f'); lg.addColorStop(0.5, '#f6a649'); lg.addColorStop(1, '#d9564a');
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(8, h - 28, 136, 22); c.fillStyle = lg; c.fillRect(14, h - 22, 124, 10);
  }],
  idcard: [256, 170, (c, w, h) => {
    c.fillStyle = '#fffdf8'; c.beginPath(); c.roundRect(0, 0, w, h, 14); c.fill();
    c.fillStyle = '#4f78a8'; c.beginPath(); c.roundRect(0, 0, w, 40, [14, 14, 0, 0]); c.fill();
    c.fillStyle = '#fff'; c.font = '700 20px "Space Grotesk", Arial'; c.textBaseline = 'middle'; c.fillText('RESIDENT ID', 16, 21);
    c.fillStyle = '#dde6f1'; c.beginPath(); c.roundRect(16, 54, 70, 92, 10); c.fill();
    c.fillStyle = '#4f78a8'; c.beginPath(); c.arc(51, 86, 18, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(51, 136, 28, Math.PI, 0); c.fill();
    c.fillStyle = 'rgba(48,59,66,.55)'; [[104, 64, 120], [104, 86, 96], [104, 108, 110], [104, 130, 70]].forEach(([x, y, lw]) => c.fillRect(x, y, lw, 9));
  }],
  billboard: [768, 250, (c, w, h, u) => {
    u.roundRect(0, 0, w, h, 26, '#087f80');
    c.fillStyle = '#f6a649'; c.fillRect(0, h - 22, w, 22);
    u.roundRect(36, 52, 128, 128, 30, '#fafaf6'); u.icon('pin', 54, 70, 92, '#087f80', '#fafaf6');
    c.fillStyle = '#fafaf6'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = `700 62px ${u.HEAD}`; c.fillText('See it. Report it.', 196, 112);
    c.font = `700 62px ${u.HEAD}`; c.fillStyle = '#ddf5f0'; c.fillText('Get it fixed.', 196, 180);
  }],
  busAd: [128, 196, (c, w, h, u) => {
    u.roundRect(0, 0, w, h, 10, '#f6a649');
    u.roundRect(32, 22, 64, 104, 12, '#303b42'); u.roundRect(38, 30, 52, 82, 6, '#ddf5f0');
    u.icon('pin', 48, 48, 32, '#087f80', '#ddf5f0');
    c.fillStyle = '#303b42'; c.font = `700 22px ${u.HEAD}`; c.textAlign = 'center'; c.fillText('Report it', 64, 160);
    c.font = `600 13px ${u.BODY}`; c.fillText('with RoadNa JO', 64, 180);
  }],
};
