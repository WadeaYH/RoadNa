// RoadNa CityWorld: the city is the navigation. Every building opens an existing screen.
// The simulation is illustrative only: no storage, no network requests, no real reports.
const $ = (s, root = document) => root.querySelector(s);
const app = $('#cw-app'), canvas = $('#cw-canvas'), layer = $('#cw-layer');
const directory = $('#cw-directory'), dirButton = $('#cw-open-directory'), help = $('#cw-help');
const opsMode = new URLSearchParams(location.search).get('view') === 'ops';
const canOpenPlace = (place) => !opsMode || place?.district.id === 'municipal';
if (opsMode) {
  app.classList.add('is-ops');
  const home = $('.cw-brand');
  home.href = '../admin-dashboard/index.html';
  home.setAttribute('aria-label', 'RoadNa JO operations dashboard');
  $('.cw-brand__text small').textContent = 'Operations';
  $('#cw-open-directory').lastChild.textContent = ' Staff pages';
  const dashboard = $('.cw-top__actions a');
  dashboard.href = '../admin-dashboard/index.html';
  dashboard.textContent = 'Dashboard';
  directory.querySelectorAll('.cw-group').forEach((group) => { group.hidden = group.getAttribute('aria-labelledby') !== 'g-municipal'; });
  directory.querySelectorAll('[data-place="depot"]').forEach((a) => { a.href = `../admin-ops-map/index.html${location.search}`; });
  $('#cw-directory-title').textContent = 'Operations directory';
  $('.cw-directory__lede').textContent = 'Municipal buildings open staff operations screens.';
  $('.cw-directory__foot').hidden = true;
  $('#cw-open-help').setAttribute('aria-label', 'How the operations city works');
  $('#cw-help-title').textContent = 'Your operations city';
  const instructions = [
    ['Start with your department', 'Supervisors start with their department. Managers and super admins can view the municipality. These role choices are frontend previews.'],
    ['Open a report', 'Choose a report pin or Needs attention item to see its status, assigned crew, vehicle, team leader, members and supervisor.'],
    ['Follow work through the day', 'Use the time slider for a sample of earlier work, or Live for the simulated current view. The 2D map link keeps your role and selected time.'],
    ['Watch your area', 'Use Headquarters, Neighbourhood health and the area cards to spot waiting reports and overdue work. Staff pages opens municipal screens only.'],
  ];
  document.querySelectorAll('.cw-help__steps li').forEach((item, i) => {
    item.querySelector('h3').textContent = instructions[i][0];
    item.querySelector('p').textContent = instructions[i][1];
  });
  $('.cw-help__keys p').textContent = 'Q / E rotate · + / − zoom · arrow keys move · R reset · D staff pages · Esc close';
}
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const svg = (id, size = 16) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PLACE_ICON = { visitor: 'pin', map: 'map', community: 'megaphone', home: 'home', kiosk: 'plus', dropbox: 'check', archive: 'folder', bell: 'bell', apartments: 'user', hall: 'columns', triage: 'alert', depot: 'truck', clock: 'clock', observatory: 'heat', idcenter: 'idcard', welcome: 'userplus', post: 'mail', lostfound: 'help', locksmith: 'key', vault: 'shield' };
const ISSUE_ICON = { pothole: 'pothole', light: 'light', trash: 'trash', drain: 'drain' };
const STATUS_LABEL = { new: 'Not reported', reported: 'Needs a crew', assigned: 'Crew on the way', working: 'Repairing', fixed: 'Fixed' };
const STATUS_COLOR = { new: '#d9564a', reported: '#e0862f', assigned: '#087f80', working: '#087f80', fixed: '#4f9a6b' };

// --- Directory drawer works with or without the 3D city ---------------------------------------
let dirReturn = null;
function openDirectory() {
  if (document.body.classList.contains('cw-fallback')) return;
  dirReturn = document.activeElement;
  directory.classList.add('is-open'); dirButton.setAttribute('aria-expanded', 'true');
  app.inert = true;
  setTimeout(() => directory.querySelector(opsMode ? '.cw-group[aria-labelledby="g-municipal"] a' : 'a')?.focus({ preventScroll: true }), 60);
  window.dispatchEvent(new CustomEvent('cw:directory', { detail: true }));
}
function closeDirectory() {
  if (!directory.classList.contains('is-open')) return;
  directory.classList.remove('is-open'); dirButton.setAttribute('aria-expanded', 'false');
  app.inert = false;
  (dirReturn || dirButton).focus({ preventScroll: true });
  window.dispatchEvent(new CustomEvent('cw:directory', { detail: false }));
}
dirButton.addEventListener('click', () => (directory.classList.contains('is-open') ? closeDirectory() : openDirectory()));
$('.skip-link[href="#cw-directory"]').addEventListener('click', (event) => {
  if (document.body.classList.contains('cw-fallback')) return;
  event.preventDefault();
  openDirectory();
});
$('#cw-close-directory').addEventListener('click', closeDirectory);
directory.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeDirectory(); } });
$('#cw-open-help').addEventListener('click', () => help.showModal());

function fallback(reason) {
  document.body.classList.add('cw-fallback');
  app.dataset.state = 'fallback';
  if (reason) $('#cw-fallback-note').textContent = reason;
}
function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

if (!webglAvailable()) fallback('This device could not start the 3D city, so here is every building as a normal link.');
else boot().catch((error) => { console.warn('CityWorld fallback:', error); fallback('The 3D city could not start on this device. Every building is still one click away below.'); });

async function boot() {
  const loaderText = $('#cw-loader-text');
  const steps = ['Laying the roads…', 'Raising the buildings…', 'Planting olive trees…', 'Waking up the residents…'];
  let step = 0;
  const loaderTimer = setInterval(() => { step = (step + 1) % steps.length; loaderText.textContent = steps[step]; }, 700);
  const [{ createEngine }, { createSim, CREW_TYPES, CREW_FOR }, { createOverlay }, layout] = await Promise.all([
    import('../../shared/cityworld/engine.js'), import('../../shared/cityworld/sim.js'), import('../../shared/cityworld/overlay.js'), import('../../shared/cityworld/layout.js'),
  ]);
  const { DISTRICTS, placeHref } = layout;
  const engine = await createEngine(canvas, { camera: { minDist: 12, maxDist: 175, elNear: 0.56, elFar: 0.9 } });
  clearInterval(loaderTimer);
  const { world, rig, traffic, people, issues } = engine;
  const overlay = createOverlay(layer, engine);
  const baseTraffic = engine.quality === 'low' ? 12 : 18;
  const sim = createSim(engine, { clock: 8 * 60 + 30, baseTraffic });
  if (opsMode) { sim.setAuto(false); sim.setRoadNa(false); sim.state.spawnTimer = 1e9; }
  traffic.spawnTraffic(baseTraffic);
  // A few parked cars make the public car park feel used.
  for (const [i, x] of [[0, 10.5], [1, 14.7]]) { const car = traffic.create(i ? 'suv' : 'sedan', { mode: 'parked' }); if (car) { car.x = x; car.z = 6.95; car.y = 0.245; car.h = i ? Math.PI / 2 : -Math.PI / 2; } }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); engine.stop(); fallback('The 3D view was interrupted. Every building is still available below.'); }, { once: true });
  const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;
  const ageMin = (issue) => Math.max(0, Math.round((sim.state.clock - (issue.createdClock ?? sim.state.clock) + 1440) % 1440));

  // --- Motion preferences -----------------------------------------------------------------
  let motionOK = !motionQuery.matches;
  engine.motion = motionOK;
  const speedButtons = [...document.querySelectorAll('[data-speed]')];
  function setSpeed(v) {
    if (v > 0 && !engine.motion) engine.motion = true; // pressing Play is an explicit opt-in
    sim.setSpeed(v); engine.simScale = v;
    speedButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === v)));
  }
  speedButtons.forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
  setSpeed(motionOK ? 1 : 0);
  motionQuery.addEventListener('change', () => { motionOK = !motionQuery.matches; engine.motion = motionOK; setSpeed(motionOK ? 1 : 0); });

  // --- Camera framing -----------------------------------------------------------------------
  const isPhone = () => window.innerWidth < 640;
  const wide = () => window.innerWidth >= 1000;
  const panel = $('#cw-panel');
  const panelOpen = () => !panel.hidden && !panel.classList.contains('is-min') && wide();
  let directoryOpen = false;
  function sideShift() { if (isPhone()) return 0; if (directoryOpen) return -0.13; return panelOpen() ? 0.1 : 0; }
  function overview() {
    if (window.__cwOpsOverview) return window.__cwOpsOverview(isPhone(), sideShift());
    const fov = isPhone() ? 36 : 30;
    const r = isPhone() ? 28 : engine.size.w < 1000 ? 35 : 36;
    return { target: { x: 0.5, y: 0, z: 1.2 }, dist: rig.fit(r, fov), az: Math.PI / 4, el: 0.86, fov, sx: sideShift(), sy: isPhone() ? 0.04 : 0.035 };
  }
  function resetView() { rig.set(overview()); }
  // Selections sit between the panel on the left and the card on the right.
  const focusShift = () => ({ sx: isPhone() ? 0 : panelOpen() ? 0 : -0.1, sy: isPhone() ? -0.18 : 0.02 });
  window.addEventListener('cw:directory', (e) => { directoryOpen = e.detail; rig.set({ sx: sideShift() }); });
  const start = overview(), photoStart = location.hash === '#photo', swoop = motionOK && !photoStart;
  rig.set(swoop ? { ...start, dist: start.dist * 1.45, az: Math.PI / 4 - 0.85, el: 1.12 } : start, true);
  rig.update(0, false);
  rig.stiffness = swoop ? 1.35 : 6;
  engine.assemble(!swoop);
  engine.start();
  rig.set(start);
  app.dataset.state = 'ready';
  setTimeout(() => { rig.stiffness = 6; }, motionOK ? 3200 : 0);
  let lastSize = engine.size.w + 'x' + engine.size.h, userMoved = false;
  new ResizeObserver(() => { const s = engine.size.w + 'x' + engine.size.h; if (s !== lastSize) { lastSize = s; if (!userMoved && !selected) resetView(); } }).observe(canvas);

  // --- Sky and night ---------------------------------------------------------------------------
  engine.onSky((s) => {
    document.documentElement.style.setProperty('--sky-top', s.top); document.documentElement.style.setProperty('--sky-bottom', s.bottom);
    app.classList.toggle('is-night', s.night > 0.55);
  });
  const nightBtn = $('#cw-night');
  nightBtn.addEventListener('click', () => {
    const night = engine.daylight.night > 0.5;
    sim.state.clock = night ? 9 * 60 : 21 * 60;
    toast({ title: night ? 'Good morning' : 'Night falls', detail: night ? 'The sun is up over the city.' : 'Streetlights matter now.', icon: night ? 'sun' : 'moon' });
  });

  // --- Labels pinned to the city -------------------------------------------------------------
  const labels = new Map();
  for (const place of world.places) {
    const el = document.createElement('div');
    el.className = 'cw-label cw-label--mini is-hidden';
    el.innerHTML = `<div class="cw-label__in" style="--c:${place.district.color}"><span class="cw-label__dot">${svg(PLACE_ICON[place.id], 15)}</span><span><strong>${esc(place.name)}</strong><small>${esc(place.page)}</small></span></div>`;
    labels.set(place, overlay.add(el, place.label));
  }
  const Vec3 = engine.camera.position.constructor;
  const DCENTER = { municipal: [12.5, -8.5], public: [12.5, 8.5], resident: [-12.5, 8.5], civic: [-12.5, -8.5] };
  const dlabels = Object.entries(DCENTER).map(([id, [x, z]]) => {
    const el = document.createElement('div'); el.className = 'cw-dlabel is-hidden';
    el.innerHTML = `<span style="--c:${DISTRICTS[id].color}">${esc(DISTRICTS[id].name)}</span>`;
    return overlay.add(el, new Vec3(x, 7.5, z));
  });

  // --- Selection state ---------------------------------------------------------------------------
  let hovered = null, selected = null, selectedIssue = null, selectedCrew = null, followCrew = null, bounce = null, leaving = false;
  const card = $('#cw-card');
  const tint = (place, k) => { const m = Array.isArray(place.mesh.material) ? place.mesh.material[0] : place.mesh.material; m.emissive.set(place.district.color); m.emissiveIntensity = k; };
  function setHover(place) {
    if (!canOpenPlace(place)) place = null;
    if (hovered === place) return;
    if (hovered && hovered !== selected) tint(hovered, 0);
    hovered = place;
    if (place && place !== selected) tint(place, 0.16);
    world.hover.show(place && place !== selected ? place : null);
    canvas.classList.toggle('is-pointing', !!place && tool === 'explore');
    document.querySelectorAll('.cw-group a.is-hovered').forEach((a) => a.classList.remove('is-hovered'));
    if (place) directory.querySelector(`[data-place="${place.id}"]`)?.classList.add('is-hovered');
  }
  function clearSelection() {
    if (selected) tint(selected, 0);
    selected = null; selectedIssue = null; selectedCrew = null; followCrew = null;
    world.select.show(null); markIssue(null);
  }
  function openCard(color, html) {
    card.style.setProperty('--c', color);
    card.innerHTML = html;
    card.hidden = false;
    card.querySelector('.cw-card__close')?.addEventListener('click', closeCard);
    dismissWelcome();
  }
  function closeCard() { clearSelection(); card.hidden = true; rig.set({ sx: sideShift(), sy: overview().sy }); renderPanel(true); }
  const band = (label) => `<div class="cw-card__band"><span>${esc(label)}</span><button class="cw-card__close" type="button" aria-label="Close card">${svg('close', 16)}</button></div>`;

  // Buildings
  const destinationFor = (place) => opsMode && place.id === 'depot'
    ? window.__cwOps?.mapHref() ?? `../admin-ops-map/index.html${location.search}`
    : placeHref(place);
  function select(place, { fly = true } = {}) {
    if (place && !canOpenPlace(place)) return;
    clearSelection();
    if (!place) { card.hidden = true; return; }
    selected = place;
    tint(place, 0.3); world.select.show(place); world.hover.show(null);
    bounce = { place, t: 0 };
    if (fly) { userMoved = true; rig.focus({ x: place.center.x, y: 0, z: place.center.z }, isPhone() ? 58 : 46); rig.set(focusShift()); }
    openCard(place.district.color, `${band(place.district.name)}
      <div class="cw-card__body">
        <div class="cw-card__title"><span class="cw-card__badge">${svg(PLACE_ICON[place.id], 22)}</span><div><h2 id="cw-card-title">${esc(place.name)}</h2><p class="cw-card__page">Opens the <b>${esc(place.page)}</b> screen</p></div></div>
        <p class="cw-card__desc">${esc(place.desc)}</p>
        <p class="cw-card__live" id="cw-card-live"></p>
        <div class="cw-card__actions"><a class="cw-card__go" href="${destinationFor(place)}">Enter ${esc(place.name)} ${svg('arrow', 18)}</a></div>
        <p class="cw-card__note">${noteFor(place)}</p>
      </div>`);
    const go = card.querySelector('.cw-card__go');
    const updateDestination = () => { go.href = destinationFor(place); };
    go.addEventListener('auxclick', updateDestination);
    go.addEventListener('click', (e) => { updateDestination(); if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return; e.preventDefault(); enter(place); });
    updateCardLive();
  }
  function noteFor(place) {
    if (place.district.id === 'resident') return 'Resident preview with sample data. Normally reached after signing in.';
    if (place.district.id === 'municipal') return 'Administration preview with sample data. Normally reached through the login screen.';
    if (place.district.id === 'civic') return 'Account screen preview. Nothing is submitted or saved.';
    return 'Public page with sample data.';
  }
  function liveFor(place) {
    const s = sim.stats(), crewsBusy = s.crews - s.crewsIdle, open = s.reports + s.unreported;
    switch (place.id) {
      case 'hall': return [`${s.reports} open report${s.reports === 1 ? '' : 's'} · ${s.crewsIdle} of ${s.crews} crews free`, s.reports > 4 ? 'bad' : s.reports > 2 ? 'warn' : ''];
      case 'triage': return [`${s.needsCrew} report${s.needsCrew === 1 ? '' : 's'} waiting for a crew`, s.needsCrew > 3 ? 'warn' : ''];
      case 'depot': return [crewsBusy ? `${crewsBusy} crew${crewsBusy === 1 ? ' is' : 's are'} out on the streets` : 'All crews are at the depot', ''];
      case 'clock': return [s.avgResponse != null ? `Average fix time today: ${s.avgResponse} min` : 'No repairs finished yet today', ''];
      case 'observatory': return [`${s.potholes} pothole${s.potholes === 1 ? '' : 's'} on the heatmap right now`, s.potholes > 3 ? 'bad' : ''];
      case 'map': return [`${open} problem${open === 1 ? '' : 's'} on the public map`, open > 5 ? 'warn' : ''];
      case 'community': return [`${s.fixed} problem${s.fixed === 1 ? '' : 's'} fixed since you arrived`, ''];
      case 'home': case 'apartments': return [`Residents feel ${s.moodLabel[1].toLowerCase()} (${Math.round(s.mood)}%)`, s.mood < 40 ? 'bad' : s.mood < 58 ? 'warn' : ''];
      case 'bell': return [`${eventsRung} update${eventsRung === 1 ? '' : 's'} have rung out`, ''];
      case 'kiosk': return ['Tip: use the training tools, then watch a resident report it', ''];
      case 'dropbox': case 'archive': return [`${sim.state.reported} report${sim.state.reported === 1 ? '' : 's'} filed in the city`, ''];
      default: return ['Open for visitors', ''];
    }
  }
  function enter(place, href = destinationFor(place)) {
    if (!canOpenPlace(place)) return;
    if (leaving) return;
    leaving = true;
    closeDirectory();
    if (!engine.motion) { window.location.assign(href); return; }
    tint(place, 0.4);
    rig.stiffness = 3.2;
    rig.focus({ x: place.center.x, y: place.top * 0.4, z: place.center.z }, 11);
    rig.set({ el: 0.42, sx: 0, sy: 0, fov: 34 });
    $('#cw-transition-text').textContent = `Entering ${place.name}…`;
    setTimeout(() => $('#cw-transition').classList.add('is-active'), 420);
    setTimeout(() => window.location.assign(href), 950);
  }
  window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });

  // Reports (issues)
  const EFFECT = {
    pothole: 'Cars brake, wait and swerve around it. It gets wider the longer it stays open.',
    light: 'This corner goes dark at night, and residents feel less safe walking past.',
    trash: 'The overflowing bin smells. Residents nearby are getting annoyed.',
    drain: 'Water pools on the road, splashing and slowing every car.',
  };
  function selectIssue(issue) {
    if (!issues.list.includes(issue)) return;
    if (window.__cwOps?.onIssue(issue)) return; // operations view: its own card
    clearSelection();
    selectedIssue = issue; markIssue(issue);
    userMoved = true; rig.focus({ x: issue.x, y: 0, z: issue.z }, isPhone() ? 44 : 34); rig.set(focusShift());
    setTab('reports', false, false);
    renderIssueCard();
  }
  function renderIssueCard() {
    const issue = selectedIssue; if (!issue) return;
    const need = CREW_TYPES[CREW_FOR[issue.type]];
    openCard(STATUS_COLOR[issue.status], `${band(`${issue.info.category} · ${issue.code ?? ''}`)}
      <div class="cw-card__body">
        <div class="cw-card__title"><span class="cw-card__badge">${svg(ISSUE_ICON[issue.type], 22)}</span><div><h2 id="cw-card-title">${esc(issue.info.label)}</h2><p class="cw-card__page">${esc(issue.street)}</p></div></div>
        <p class="cw-card__live" id="cw-issue-status"></p>
        <div class="cw-progress" id="cw-issue-progress" hidden><span></span></div>
        <p class="cw-card__desc">${EFFECT[issue.type]}</p>
        <p class="cw-card__need">${svg('truck', 15)}<span>Needs a <b>${esc(need.name)}</b> crew with a <b>${esc(need.vehicleName.toLowerCase())}</b>.</span></p>
        <div class="cw-assign" id="cw-assign"></div>
        <div class="cw-card__actions"><a class="cw-card__ghost" href="../report-details/index.html">See an example report page</a></div>
        <p class="cw-card__note">Simulation only. No report is created and no crew is really sent.</p>
      </div>`);
    renderIssueLive(true);
  }
  let assignSig = '';
  function renderIssueLive(force = false) {
    const issue = selectedIssue; if (!issue) return;
    const status = $('#cw-issue-status'), bar = $('#cw-issue-progress'), box = $('#cw-assign');
    if (!status) return;
    const mins = ageMin(issue);
    status.textContent = issue.status === 'new' ? `Spotted ${mins} min ago · nobody has reported it yet` : issue.status === 'reported' ? `Reported · waiting ${mins} min for a crew` : issue.status === 'assigned' ? `${issue.crew?.name ?? 'A crew'} is driving there` : issue.status === 'working' ? `${issue.crew?.name ?? 'A crew'} is repairing it · ${Math.round(issue.progress * 100)}%` : 'Fixed. Thank you, crew!';
    status.dataset.tone = issue.status === 'new' ? 'bad' : issue.status === 'reported' ? 'warn' : '';
    bar.hidden = issue.status !== 'working'; bar.firstElementChild.style.width = `${Math.round(issue.progress * 100)}%`;
    const canSend = issue.status === 'new' || issue.status === 'reported';
    const sig = canSend + sim.crews.map((c) => c.state).join();
    if (!force && sig === assignSig) return;
    assignSig = sig;
    if (!canSend) { box.innerHTML = ''; return; }
    const rank = (c) => (sim.canDo(c, issue) ? 0 : 2) + (c.state === 'idle' ? 0 : 1);
    const list = [...sim.crews].sort((a, b) => rank(a) - rank(b));
    const best = list.find((c) => sim.canDo(c, issue) && c.state === 'idle');
    box.innerHTML = `<p class="cw-assign__title">Send a crew</p>${list.map((c) => {
      const match = sim.canDo(c, issue), free = c.state === 'idle', ok = match && free;
      const right = !match ? `No ${esc(CREW_TYPES[CREW_FOR[issue.type]].vehicleName.toLowerCase())}` : free ? `Ready · ≈${sim.eta(issue)} min` : esc(sim.crewStatus(c));
      return `<button type="button" class="cw-assign__opt${c === best ? ' is-best' : ''}" data-crew-id="${c.id}" ${ok ? '' : 'disabled'} style="--cc:${c.info.color}">
        <span class="cw-assign__icon">${svg(c.info.icon, 16)}</span>
        <span><strong>${esc(c.name)}</strong><small>${esc(c.info.vehicleName)}</small></span>
        <span class="cw-assign__state">${c === best ? '<em>Best match</em>' : ''}${right}</span></button>`;
    }).join('')}${best ? '' : `<p class="cw-assign__hint">No free ${esc(CREW_TYPES[CREW_FOR[issue.type]].name)} crew. Wait for one to return, or add one in Crews.</p>`}`;
    box.querySelectorAll('[data-crew-id]').forEach((b) => b.addEventListener('click', () => {
      const crew = sim.crews.find((c) => c.id === Number(b.dataset.crewId));
      const res = sim.dispatch(issue, crew);
      if (!res.ok) toast({ title: 'Could not send that crew', detail: res.reason, tone: 'warn', icon: 'truck' });
      renderIssueLive(true); renderPanel(true);
    }));
  }

  // Crews
  function selectCrew(crew, follow = true) {
    clearSelection();
    selectedCrew = crew;
    const van = crew.van;
    if (follow && !van.hidden) { followCrew = crew; userMoved = true; rig.focus({ x: van.x, y: 0, z: van.z }, isPhone() ? 46 : 36); rig.set(focusShift()); }
    else if (follow) { const depot = world.places.find((p) => p.id === 'depot'); rig.focus({ x: depot.center.x, y: 0, z: depot.center.z }, isPhone() ? 46 : 38); rig.set(focusShift()); }
    setTab('crews', false, false);
    renderCrewCard(true);
  }
  let crewSig = '';
  function renderCrewCard(force = false) {
    const crew = selectedCrew; if (!crew) return;
    const sig = crew.state + (crew.issue?.id ?? '') + Math.round((crew.issue?.progress ?? 0) * 20) + sim.idleFor.length + issues.list.filter((i) => i.status === 'reported').length;
    if (!force && sig === crewSig) return;
    crewSig = sig;
    const t = crew.info, job = crew.issue;
    const waiting = issues.list.filter((i) => i.status === 'reported' && sim.canDo(crew, i));
    openCard(t.color, `${band(`${t.name} crew · ${crew.code}`)}
      <div class="cw-card__body">
        <div class="cw-card__title"><span class="cw-card__badge">${svg(t.icon, 22)}</span><div><h2 id="cw-card-title">${esc(crew.name)}</h2><p class="cw-card__page">${esc(t.vehicleName)} · plate ${esc(crew.plate)}</p></div></div>
        <p class="cw-card__live" data-tone="${crew.state === 'idle' ? '' : 'warn'}">${esc(sim.crewStatus(crew))}</p>
        ${job ? `<div class="cw-progress"><span style="width:${Math.round(job.progress * 100)}%"></span></div><div class="cw-card__actions"><button type="button" class="cw-card__ghost" data-show-issue="${job.id}">Current job: ${esc(job.info.label)} on ${esc(job.street)}</button></div>` : ''}
        <dl class="cw-facts"><div><dt>Fixes</dt><dd>${t.skills.map((s) => esc(sim.types[s].label)).join(', ')}</dd></div><div><dt>Jobs today</dt><dd>${crew.jobs}</dd></div></dl>
        <p class="cw-assign__title">Team</p>
        <ul class="cw-members">${crew.members.map((m) => `<li><span style="--ac:${t.color}">${esc(initials(m.name))}</span><strong>${esc(m.name)}</strong><small>${esc(m.role)}</small></li>`).join('')}</ul>
        ${crew.state === 'idle' ? `<p class="cw-assign__title">Waiting jobs for this crew</p>${waiting.length ? `<div class="cw-card__list">${waiting.slice(0, 4).map((i) => `<button type="button" class="cw-assign__job" data-send="${i.id}"><span>${esc(i.info.label)} · ${esc(i.street)}</span><small>${ageMin(i)} min · send</small></button>`).join('')}</div>` : '<p class="cw-assign__hint">No matching reports waiting right now.</p>'}` : ''}
        <div class="cw-card__actions">${!crew.van.hidden ? '<button type="button" class="cw-card__go" id="cw-follow">Follow on the map</button>' : ''}</div>
        <p class="cw-card__note">Sample crew. Names and plates are illustrative.</p>
      </div>`);
    card.querySelector('[data-show-issue]')?.addEventListener('click', (e) => { const i = issues.list.find((x) => x.id === Number(e.currentTarget.dataset.showIssue)); if (i) selectIssue(i); });
    card.querySelectorAll('[data-send]').forEach((b) => b.addEventListener('click', () => {
      const issue = issues.list.find((x) => x.id === Number(b.dataset.send));
      const res = issue ? sim.dispatch(issue, crew) : { ok: false, reason: 'That report is gone.' };
      if (!res.ok) toast({ title: 'Could not send the crew', detail: res.reason, tone: 'warn', icon: 'truck' });
      renderCrewCard(true); renderPanel(true);
    }));
    $('#cw-follow')?.addEventListener('click', () => { followCrew = crew; });
  }
  const initials = (name) => name.split(' ').map((p) => p[0]).join('').slice(0, 2);

  // --- Operations panel ---------------------------------------------------------------------------
  const tabs = { reports: $('#tab-reports'), crews: $('#tab-crews'), activity: $('#tab-activity') };
  const panes = { reports: $('#pane-reports'), crews: $('#pane-crews'), activity: $('#pane-activity') };
  const panelToggle = $('#cw-panel-toggle');
  let activeTab = 'reports', filter = 'open', unread = 0;
  function setPanelMin(min) {
    panel.classList.toggle('is-min', min);
    panelToggle.setAttribute('aria-expanded', String(!min));
    panelToggle.setAttribute('aria-label', min ? 'Expand the operations panel' : 'Minimise the operations panel');
    panelToggle.querySelector('use').setAttribute('href', min ? '#i-plus' : '#i-minus');
    if (!selected && !selectedIssue && !selectedCrew && !userMoved) rig.set({ sx: sideShift() });
  }
  function setTab(name, focus = false, expand = true) {
    activeTab = name;
    for (const [k, t] of Object.entries(tabs)) { const on = k === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; panes[k].hidden = !on; }
    if (name === 'activity') { unread = 0; updateUnread(); }
    if (expand) setPanelMin(false);
    renderPanel(true);
    if (focus) tabs[name].focus();
  }
  Object.entries(tabs).forEach(([name, t]) => t.addEventListener('click', () => { if (activeTab === name && !panel.classList.contains('is-min')) return; setTab(name); }));
  $('.cw-panel__tabs').addEventListener('keydown', (e) => {
    const order = ['reports', 'crews', 'activity'], i = order.indexOf(activeTab);
    if (e.key === 'ArrowRight') { e.preventDefault(); setTab(order[(i + 1) % 3], true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(order[(i + 2) % 3], true); }
  });
  let panelTouched = false;
  panelToggle.addEventListener('click', () => { panelTouched = true; setPanelMin(!panel.classList.contains('is-min')); });
  new ResizeObserver(() => { if (!panelTouched && !panel.hidden) setPanelMin(!wide()); }).observe(app);
  document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderPanel(true);
  }));
  document.querySelectorAll('[data-hire]').forEach((b) => b.addEventListener('click', () => {
    const crew = sim.hireCrew(b.dataset.hire);
    if (!crew) toast({ title: 'The depot is full', detail: `It has room for ${sim.maxCrews} crews.`, tone: 'warn', icon: 'truck' });
    renderPanel(true);
  }));
  const updateUnread = () => { const c = $('#count-activity'); c.hidden = unread === 0; c.textContent = String(Math.min(unread, 99)); };

  const listReports = $('#cw-report-list'), listCrews = $('#cw-crew-list'), reportEmpty = $('#cw-report-empty');
  const FILTERS = { open: (i) => i.status !== 'fixed', needs: (i) => i.status === 'new' || i.status === 'reported', active: (i) => i.status === 'assigned' || i.status === 'working', fixed: (i) => i.status === 'fixed' };
  const ORDER = { reported: 0, new: 1, assigned: 2, working: 3, fixed: 4 };
  let reportSig = '', crewListSig = '';
  function renderPanel(force = false) {
    const all = issues.list;
    $('#count-reports').textContent = String(all.filter(FILTERS.open).length);
    $('#count-needs').textContent = String(all.filter(FILTERS.needs).length || '');
    $('#count-crews').textContent = `${sim.crews.filter((c) => c.state === 'idle').length}/${sim.crews.length}`;
    if (activeTab === 'reports') renderReports(force);
    if (activeTab === 'crews') renderCrews(force);
  }
  function keepFocus(container, render) {
    const key = document.activeElement?.closest?.('[data-key]')?.dataset.key;
    render();
    if (key && container.contains(document.activeElement) === false) container.querySelector(`[data-key="${key}"]`)?.focus({ preventScroll: true });
  }
  function renderReports(force) {
    const rows = issues.list.filter(FILTERS[filter]).sort((a, b) => (ORDER[a.status] - ORDER[b.status]) || (b.age - a.age));
    const sig = filter + (selectedIssue?.id ?? '') + sim.crews.map((c) => c.state[0]).join('') + rows.map((i) => `${i.id}${i.status}${i.crew?.id ?? ''}${Math.round(i.progress * 10)}${ageMin(i)}${i.waiting ? 'w' : ''}${(i.severity ?? 1) > 1.35 ? 'x' : ''}`).join('|');
    if (!force && sig === reportSig) return;
    reportSig = sig;
    reportEmpty.hidden = rows.length > 0;
    keepFocus(listReports, () => {
      listReports.innerHTML = rows.map((i) => {
        const crewLine = i.crew && (i.status === 'assigned' || i.status === 'working') ? `<span class="cw-row__crew">${svg(i.crew.info.icon, 13)}${esc(i.crew.name)} · ${esc(sim.crewStatus(i.crew))}</span>` : '';
        const waitLine = i.status === 'reported' ? `<span class="cw-row__meta">Needs a ${esc(CREW_TYPES[CREW_FOR[i.type]].name)} crew · ${sim.idleFor(i).length ? 'one is ready' : 'none free'}</span>` : '';
        const worse = i.type === 'pothole' && (i.severity ?? 1) > 1.35 && i.status !== 'fixed' ? ' · <b>getting worse</b>' : '';
        return `<li><button type="button" class="cw-row${i === selectedIssue ? ' is-selected' : ''}" data-key="i${i.id}" data-issue="${i.id}" data-status="${i.status}">
          <span class="cw-row__icon">${svg(ISSUE_ICON[i.type], 18)}</span>
          <span><span class="cw-row__title">${esc(i.info.label)} <small>${esc(i.code ?? '')}</small><span class="cw-chip">${STATUS_LABEL[i.status]}</span></span>
          <span class="cw-row__meta">${esc(i.street)} · ${ageMin(i)} min ago${worse}</span>${crewLine}${waitLine}
          ${i.status === 'working' ? `<span class="cw-mini-bar"><span style="width:${Math.round(i.progress * 100)}%"></span></span>` : ''}</span></button></li>`;
      }).join('');
    });
    listReports.querySelectorAll('[data-issue]').forEach((b) => {
      const issue = issues.list.find((x) => x.id === Number(b.dataset.issue));
      b.addEventListener('click', () => selectIssue(issue));
      b.addEventListener('mouseenter', () => markers.get(issue.id)?.el.classList.add('is-hot'));
      b.addEventListener('mouseleave', () => markers.get(issue.id)?.el.classList.remove('is-hot'));
    });
  }
  function renderCrews(force) {
    const sig = (selectedCrew?.id ?? '') + sim.crews.map((c) => `${c.id}${c.state}${c.issue?.id ?? ''}${Math.round((c.issue?.progress ?? 0) * 10)}${c.jobs}`).join('|');
    if (!force && sig === crewListSig) return;
    crewListSig = sig;
    keepFocus(listCrews, () => {
      listCrews.innerHTML = sim.crews.map((c) => {
        const st = c.state === 'idle' ? ['idle', 'Ready'] : c.state === 'returning' || c.state === 'entering' ? ['returning', 'Returning'] : ['busy', 'On a job'];
        return `<li><button type="button" class="cw-row${c === selectedCrew ? ' is-selected' : ''}" data-key="c${c.id}" data-crew-row="${c.id}" data-crew="${st[0]}" style="--sc:${c.info.color}">
          <span class="cw-row__icon">${svg(c.info.icon, 18)}</span>
          <span><span class="cw-row__title">${esc(c.name)} <small>${esc(c.code)}</small><span class="cw-chip">${st[1]}</span></span>
          <span class="cw-row__meta">${esc(c.info.vehicleName)} · ${esc(c.plate)}</span>
          <span class="cw-row__crew">${esc(sim.crewStatus(c))}</span>
          <span class="cw-avatars">${c.members.map((m) => `<span style="--ac:${c.info.color}" title="${esc(m.name)}, ${esc(m.role)}">${esc(initials(m.name))}</span>`).join('')}<small>${esc(c.members[0].name)} +${c.members.length - 1}</small></span></span></button></li>`;
      }).join('');
    });
    listCrews.querySelectorAll('[data-crew-row]').forEach((b) => b.addEventListener('click', () => selectCrew(sim.crews.find((c) => c.id === Number(b.dataset.crewRow)))));
    const full = sim.crews.length >= sim.maxCrews;
    document.querySelectorAll('[data-hire]').forEach((b) => (b.disabled = full));
    $('#cw-hire-note').textContent = `${sim.crews.length} of ${sim.maxCrews}`;
  }

  // --- Issue pins on the map --------------------------------------------------------------------
  const markers = new Map();
  function markIssue(issue) { for (const [id, m] of markers) m.el.classList.toggle('is-selected', !!issue && id === issue.id); }
  function syncMarkers() {
    const live = new Set();
    for (const issue of issues.list) {
      live.add(issue.id);
      let m = markers.get(issue.id);
      if (!m) {
        const el = document.createElement('div');
        el.className = 'cw-marker';
        el.innerHTML = `<button type="button"><svg class="cw-marker__pin" viewBox="0 0 38 46" aria-hidden="true"><path d="M19 45C12 36 2 28.5 2 18.5a17 17 0 0 1 34 0C36 28.5 26 36 19 45Z"/></svg><span class="cw-marker__ring"></span><span class="cw-marker__icon">${svg(ISSUE_ICON[issue.type], 15)}</span></button>`;
        el.querySelector('button').addEventListener('click', () => selectIssue(issue));
        m = { el, it: overlay.add(el, issue.anchor), status: '' };
        markers.set(issue.id, m);
      }
      if (m.status !== issue.status) {
        m.status = issue.status; m.el.dataset.status = issue.status;
        m.el.querySelector('button').setAttribute('aria-label', `${issue.info.label} on ${issue.street}: ${STATUS_LABEL[issue.status]}. Open details.`);
        m.el.querySelector('button').title = `${issue.info.label} · ${STATUS_LABEL[issue.status]}`;
        if (issue.status === 'fixed' && !issue.ops) { m.el.classList.add('is-leaving'); setTimeout(() => { overlay.remove(m.it); markers.delete(issue.id); }, 1500); }
      }
      m.el.style.setProperty('--p', issue.progress.toFixed(3));
      // Operations view: the pin shows the operations status (to review, waiting, in progress, to check, fixed).
      if (issue.ops) {
        if (m.ops !== issue.ops.status) {
          m.ops = issue.ops.status; m.el.dataset.ops = issue.ops.status;
          const b = m.el.querySelector('button');
          b.setAttribute('aria-label', `${issue.code}: ${issue.ops.title}, ${issue.ops.label}. Open details.`);
          b.title = `${issue.ops.title} · ${issue.ops.label}`;
        }
        m.it.hidden = issue.ops.hidden;
        m.el.classList.toggle('is-selected', issue.ops.selected);
      }
    }
    for (const [id, m] of markers) if (!live.has(id)) { overlay.remove(m.it); markers.delete(id); }
    if (selectedIssue && !issues.list.includes(selectedIssue)) closeCard();
  }

  // --- Tools ------------------------------------------------------------------------------------
  let tool = 'explore';
  const cursor = $('#cw-cursor');
  const toolButtons = [...document.querySelectorAll('[data-tool]')];
  function setTool(t) {
    if (opsMode && t !== 'explore') return;
    tool = t;
    toolButtons.forEach((b) => { const on = b.dataset.tool === t; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-active', on); });
    canvas.classList.toggle('is-placing', t !== 'explore');
    cursor.hidden = t === 'explore';
    if (t !== 'explore') { setHover(null); dismissWelcome(); }
  }
  toolButtons.forEach((b) => b.addEventListener('click', () => setTool(tool === b.dataset.tool && b.dataset.tool !== 'explore' ? 'explore' : b.dataset.tool)));
  const TOOL_HINT = { pothole: ['Click a road to crack it', 'Pick a spot on a road'], light: ['Click near a streetlight', 'Pick a streetlight'], trash: ['Click near a bin', 'Pick a bin or dumpster'], drain: ['Click a road edge', 'Pick a spot on a road'] };
  function validSpot(t, x, z) {
    if (t === 'pothole' || t === 'drain') { const hit = world.net.nearest(x, z, (l) => !l.reserved); return hit && hit.d < 1.25 && hit.s > 2.2 && hit.s < hit.lane.length - 2.2; }
    if (t === 'light') return world.lamps.some((l) => !l.broken && Math.hypot(l.baseX - x, l.baseZ - z) < 2.5);
    if (t === 'trash') return world.bins.some((b) => Math.hypot(b.x - x, b.z - z) < 2.5);
    return false;
  }
  function placementPreview(e) {
    const p = engine.groundPoint(e.clientX, e.clientY);
    const ok = !!p && validSpot(tool, p.x, p.z);
    cursor.dataset.ok = String(ok);
    cursor.textContent = TOOL_HINT[tool][ok ? 0 : 1];
    const r = app.getBoundingClientRect();
    cursor.style.left = `${e.clientX - r.left}px`; cursor.style.top = `${e.clientY - r.top}px`;
  }
  function place(e) {
    if (opsMode) return;
    const p = engine.groundPoint(e.clientX, e.clientY);
    const issue = p && sim.addIssueAt(tool, p.x, p.z);
    if (!issue) { cursor.animate([{ transform: 'translate(14px,14px)' }, { transform: 'translate(8px,14px)' }, { transform: 'translate(20px,14px)' }, { transform: 'translate(14px,14px)' }], { duration: 260 }); return; }
    engine.fx.ripple(issue.x, 0.08, issue.z, '#f6a649', 2.2, 0.8);
  }

  // --- Pointer, wheel, touch and keyboard -----------------------------------------------------------
  canvas.tabIndex = 0;
  const pointers = new Map();
  let drag = null, pinch = null;
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), ang2 = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, button: e.button, moved: false };
    else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: dist2(a, b), a: ang2(a, b) }; drag = null; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = dist2(a, b), an = ang2(a, b);
      rig.zoom(pinch.d / Math.max(1, d)); rig.goal.az -= an - pinch.a; pinch.d = d; pinch.a = an; userMoved = true; followCrew = null; return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) { drag.moved = true; canvas.classList.add('is-grabbing'); rig.stiffness = 14; followCrew = null; }
      if (drag.moved) { userMoved = true; if (drag.button === 2 || e.shiftKey) rig.goal.az -= dx * 0.006; else rig.pan(dx, dy); }
      drag.x = e.clientX; drag.y = e.clientY;
      return;
    }
    if (e.pointerType === 'mouse') { if (tool === 'explore') setHover(engine.pickPlace(e.clientX, e.clientY)); else placementPreview(e); }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && !drag.moved && (e.type === 'pointerup') && drag.button === 0) {
      if (tool !== 'explore') place(e);
      else { const p = engine.pickPlace(e.clientX, e.clientY); if (p) { if (p === selected && e.pointerType !== 'mouse') enter(p); else select(p); } else if (!card.hidden) closeCard(); }
    }
    if (drag?.moved) rig.stiffness = 6;
    drag = null; canvas.classList.remove('is-grabbing');
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('dblclick', (e) => { if (tool !== 'explore') return; const p = engine.pickPlace(e.clientX, e.clientY); if (p) enter(p); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); userMoved = true; rig.zoom(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.0022)); }, { passive: false });

  $('#cw-rot-l').addEventListener('click', () => { rig.rotate(-1); userMoved = true; });
  $('#cw-rot-r').addEventListener('click', () => { rig.rotate(1); userMoved = true; });
  $('#cw-zoom-in').addEventListener('click', () => { rig.zoom(0.78); userMoved = true; });
  $('#cw-zoom-out').addEventListener('click', () => { rig.zoom(1.28); userMoved = true; });
  $('#cw-reset').addEventListener('click', () => { userMoved = false; closeCard(); resetView(); });
  document.querySelectorAll('[data-district]').forEach((b) => b.addEventListener('click', () => showDistrict(b.dataset.district)));

  function showDistrict(id) {
    if (opsMode && id !== 'municipal') return;
    closeDirectory();
    const d = DISTRICTS[id], [x, z] = DCENTER[id];
    clearSelection();
    userMoved = true; rig.focus({ x, y: 0, z }, isPhone() ? 52 : 58); rig.set(focusShift());
    const items = world.places.filter((p) => p.district.id === id);
    openCard(d.color, `${band('District')}
      <div class="cw-card__body"><div class="cw-card__title"><span class="cw-card__badge">${svg(d.icon, 22)}</span><div><h2 id="cw-card-title">${esc(d.name)}</h2><p class="cw-card__page">${items.length} buildings</p></div></div>
      <p class="cw-card__desc">${esc(d.blurb)}</p>
      <div class="cw-card__list">${items.map((p) => `<a href="${destinationFor(p)}" data-place="${p.id}"><span>${esc(p.name)}</span><small>${esc(p.page)}</small></a>`).join('')}</div></div>`);
    card.querySelectorAll('[data-place]').forEach(wirePlaceLink);
  }
  // Directory and card links highlight their building and use the same enter transition.
  function wirePlaceLink(a) {
    const place = world.places.find((p) => p.id === a.dataset.place); if (!place) return;
    if (!canOpenPlace(place)) return;
    const updateDestination = () => { a.href = destinationFor(place); };
    updateDestination();
    a.addEventListener('mouseenter', () => setHover(place));
    a.addEventListener('mouseleave', () => setHover(null));
    a.addEventListener('focus', () => { setHover(place); rig.focus({ x: place.center.x, y: 0, z: place.center.z }); userMoved = true; });
    a.addEventListener('blur', () => setHover(null));
    a.addEventListener('auxclick', updateDestination);
    a.addEventListener('click', (e) => { updateDestination(); if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return; e.preventDefault(); enter(place, a.getAttribute('href')); });
  }
  directory.querySelectorAll('[data-place]').forEach(wirePlaceLink);

  document.addEventListener('keydown', (e) => {
    if (help.open || e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'Escape') { if (directory.classList.contains('is-open')) closeDirectory(); else if (tool !== 'explore') setTool('explore'); else if (!card.hidden) closeCard(); return; }
    if (directory.contains(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const onButton = e.target.closest?.('button, a');
    const k = e.key;
    if (/^[1-5]$/.test(k)) { if (!opsMode) setTool(['explore', 'pothole', 'light', 'trash', 'drain'][Number(k) - 1]); return; }
    if (k === ' ' && !onButton) { e.preventDefault(); setSpeed(sim.state.paused ? 1 : 0); return; }
    if (k === 'q' || k === 'Q') { rig.rotate(-1); userMoved = true; }
    else if (k === 'e' || k === 'E') { rig.rotate(1); userMoved = true; }
    else if (k === '+' || k === '=') { rig.zoom(0.82); userMoved = true; }
    else if (k === '-' || k === '_') { rig.zoom(1.22); userMoved = true; }
    else if (k === 'r' || k === 'R') { userMoved = false; closeCard(); resetView(); }
    else if (k === 'd' || k === 'D') openDirectory();
    else if (!opsMode && (k === 'l' || k === 'L')) setTab('reports', true);
    else if (!opsMode && (k === 'c' || k === 'C')) setTab('crews', true);
    else if (k === 'h' || k === 'H') togglePhoto();
    else if (k.startsWith('Arrow') && !onButton) { e.preventDefault(); const stepPx = 46; rig.pan(k === 'ArrowLeft' ? stepPx : k === 'ArrowRight' ? -stepPx : 0, k === 'ArrowUp' ? stepPx : k === 'ArrowDown' ? -stepPx : 0); userMoved = true; followCrew = null; }
  });

  // --- Dock controls ------------------------------------------------------------------------------------
  const autoBtn = $('#cw-auto'), wearBtn = $('#cw-wear'), roadnaBtn = $('#cw-roadna');
  autoBtn.addEventListener('click', () => {
    const on = autoBtn.getAttribute('aria-pressed') !== 'true';
    autoBtn.setAttribute('aria-pressed', String(on)); sim.setAuto(on);
    toast({ title: on ? 'Auto-assign is on' : 'Auto-assign is off', detail: on ? 'Free crews with the right vehicle take new reports.' : 'Open a report and choose a crew yourself.', icon: 'auto' });
  });
  $('#cw-hire').addEventListener('click', () => setTab('crews', true));
  const WEARS = ['calm', 'normal', 'storm'];
  wearBtn.addEventListener('click', () => {
    const next = WEARS[(WEARS.indexOf(wearBtn.dataset.wear) + 1) % WEARS.length];
    wearBtn.dataset.wear = next; sim.setWear(next); $('#cw-wear-label').textContent = `Wear: ${next}`;
    toast({ title: `Road wear: ${next}`, detail: next === 'storm' ? 'A winter storm: roads crack much faster.' : next === 'calm' ? 'Calm weather: roads hold up well.' : 'Normal wear and tear.', tone: next === 'storm' ? 'warn' : '', icon: 'storm' });
  });
  roadnaBtn.addEventListener('click', () => {
    const on = roadnaBtn.getAttribute('aria-pressed') !== 'true';
    roadnaBtn.setAttribute('aria-pressed', String(on)); roadnaBtn.querySelector('span').textContent = on ? 'RoadNa on' : 'RoadNa off';
    sim.setRoadNa(on);
    toast({ title: on ? 'Residents use RoadNa' : 'RoadNa switched off', detail: on ? 'Problems are reported within seconds.' : 'Problems now stay unreported for much longer.', tone: on ? 'good' : 'warn', icon: 'phone' });
  });

  // --- Notifications: short alerts with a "Show" action, plus a full activity log ---------------------
  const toasts = $('#cw-toasts'), live = $('#cw-live'), activity = $('#cw-activity');
  let eventsRung = 0, lastLive = 0;
  function toast({ title, detail = '', tone = '', icon = 'pin', show = null }) {
    for (const t of toasts.children) if (t.dataset.title === title) t.remove();
    const el = document.createElement('div');
    el.className = 'cw-toast'; el.dataset.tone = tone; el.dataset.title = title;
    el.innerHTML = `<span class="cw-toast__icon">${svg(icon, 17)}</span><span><strong>${esc(title)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</span>${show ? '<button type="button">Show</button>' : ''}`;
    if (show) el.querySelector('button').addEventListener('click', () => { show(); el.remove(); });
    toasts.prepend(el);
    while (toasts.children.length > 2) toasts.lastElementChild.remove();
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 380); }, show ? 7000 : 4200);
  }
  function logActivity(ev, icon) {
    const li = document.createElement('li');
    li.dataset.tone = ev.tone || '';
    li.innerHTML = `<time>${fmt(ev.clock)}</time><span><strong>${esc(ev.title)}</strong><span>${esc(ev.detail || '')}</span></span>`;
    const target = showFor(ev);
    if (target) { const b = document.createElement('button'); b.type = 'button'; b.className = 'cw-link'; b.textContent = 'Show'; b.addEventListener('click', target); li.append(b); }
    activity.prepend(li);
    while (activity.children.length > 60) activity.lastElementChild.remove();
    if (activeTab !== 'activity' || panel.classList.contains('is-min')) { unread++; updateUnread(); }
  }
  function showFor(ev) {
    if (ev.issue) return () => (issues.list.includes(ev.issue) ? selectIssue(ev.issue) : toast({ title: 'Already fixed', detail: `${ev.issue.info.label} on ${ev.issue.street}`, tone: 'good', icon: 'check' }));
    if (ev.crew) return () => selectCrew(ev.crew);
    if (ev.type === 'protest') return () => { const hall = world.places.find((p) => p.id === 'hall'); clearSelection(); userMoved = true; rig.focus({ x: 12.5, y: 0, z: -4.5 }, 30); rig.set(focusShift()); select(hall, { fly: false }); };
    if (ev.type === 'jam') return () => { const c = traffic.jammed()[0]; if (c) { userMoved = true; rig.focus({ x: c.x, y: 0, z: c.z }, 30); rig.set(focusShift()); } };
    return null;
  }
  const EVENT_ICON = { spawn: 'alert', reported: 'pin', dispatch: 'truck', working: 'truck', fixed: 'check', protest: 'megaphone', calm: 'face', jam: 'car', crew: 'truck', home: 'truck', waiting: 'alert' };
  const TOAST_TYPES = new Set(['reported', 'waiting', 'fixed', 'protest', 'calm', 'jam', 'crew']);
  sim.on((ev) => {
    if (ev.type === 'spotted') { bubbleOn(ev.walker, '📸', 'Reporting…', '', 2.2); return; }
    const icon = ev.issue && ev.type !== 'fixed' ? ISSUE_ICON[ev.issue.type] : EVENT_ICON[ev.type] || 'pin';
    logActivity(ev, icon);
    // Only interrupt when someone needs to act: auto-assigned reports go to the log quietly.
    const handled = ev.type === 'reported' && sim.state.auto && sim.idleFor(ev.issue).length;
    if (TOAST_TYPES.has(ev.type) && ready && !handled) toast({ title: ev.title, detail: ev.detail, tone: ev.tone, icon, show: showFor(ev) });
    if (ev.type === 'reported') { world.dyn.ring(); eventsRung++; }
    if (ev.type === 'fixed') { eventsRung++; cheerNear(ev.issue); }
    if (['protest', 'calm', 'fixed', 'jam', 'waiting'].includes(ev.type) && performance.now() - lastLive > 5000) { live.textContent = `${ev.title}. ${ev.detail ?? ''}`; lastLive = performance.now(); }
    renderPanel();
  });

  // --- Speech bubbles: mood, honks and protests ------------------------------------------------------
  const bubbles = new Set();
  function bubbleOn(target, emoji, text = '', tone = '', seconds = 2.6, height = 0.98) {
    if (!target || bubbles.size > 6) return;
    for (const b of bubbles) if (b.target === target) return;
    const el = document.createElement('div');
    el.className = 'cw-bubble'; el.dataset.tone = tone;
    el.innerHTML = `<span>${emoji}${text ? ` <b>${esc(text)}</b>` : ''}</span>`;
    const pos = new Vec3();
    const b = { target, until: performance.now() + seconds * 1000, it: overlay.add(el, () => pos.set(target.x, (target.y ?? 0.22) + height, target.z)) };
    b.el = el; bubbles.add(b);
  }
  const MOOD_EMOJI = { happy: ['😊', '🙂', '👍', '☀️', '🌿', '😄'], ok: ['🙂', '☕', '👋', '😌'], meh: ['😕', '😒', '🙄', '😩'], angry: ['😠', '💢', '😤'], furious: ['😡', '🤬', '💢'] };
  const PROTEST = ['Fix our roads!', 'Safe streets now!', 'We want lights!', 'Fix it!'];
  function cheerNear(issue) {
    for (const p of people.walkers) if (Math.hypot(p.x - issue.x, p.z - issue.z) < 7 && Math.random() < 0.7) bubbleOn(p, Math.random() < 0.5 ? '🎉' : '👏', '', 'good', 2.4);
  }
  let bubbleClock = 0;
  function tickBubbles(dt) {
    const now = performance.now();
    for (const b of [...bubbles]) {
      if (now > b.until) { b.el.classList.add('is-leaving'); bubbles.delete(b); setTimeout(() => overlay.remove(b.it), 320); }
    }
    if (!engine.motion || sim.state.paused) return;
    bubbleClock += dt;
    if (bubbleClock < 1.6) return;
    bubbleClock = 0;
    const s = sim.stats();
    if (s.protest) { const p = people.protesters[(Math.random() * people.protesters.length) | 0]; bubbleOn(p, '📣', PROTEST[(Math.random() * PROTEST.length) | 0], 'bad', 2.4, 1.25); }
    const jammed = traffic.jammed();
    if (jammed.length && Math.random() < 0.6) { const c = jammed[(Math.random() * jammed.length) | 0]; bubbleOn(c, Math.random() < 0.5 ? '📯' : '😤', Math.random() < 0.5 ? 'Beep!' : '', 'bad', 1.6, 0.95); }
    const walkers = people.walkers.filter((p) => p.visible && p.state !== 'react');
    const w = walkers[(Math.random() * walkers.length) | 0];
    if (!w) return;
    const near = issues.list.find((i) => i.status !== 'fixed' && Math.hypot(i.x - w.x, i.z - w.z) < 5);
    if (near) bubbleOn(w, near.status === 'new' ? '😟' : '⏳', '', near.status === 'new' ? 'bad' : '', 2.4);
    else { const set = MOOD_EMOJI[s.moodLabel[2]]; bubbleOn(w, set[(Math.random() * set.length) | 0], '', s.mood < 40 ? 'bad' : s.mood > 70 ? 'good' : '', 2.4); }
  }

  // --- HUD -------------------------------------------------------------------------------------------
  const moodEl = $('.cw-stat--mood'), trafficEl = $('.cw-stat--traffic');
  const MOUTH = { happy: 'M8 14.2c1.1 1.6 2.4 2.3 4 2.3s2.9-.7 4-2.3', ok: 'M8.6 15c1 .7 2.1 1 3.4 1s2.4-.3 3.4-1', meh: 'M8.6 15.6h6.8', angry: 'M8.3 16.8c1-1.3 2.3-1.9 3.7-1.9s2.7.6 3.7 1.9', furious: 'M8 17.2c1.1-1.8 2.4-2.6 4-2.6s2.9.8 4 2.6' };
  let hudClock = 0;
  function tickHud(dt) {
    hudClock += dt;
    if (hudClock < 0.25) return;
    hudClock = 0;
    const s = sim.stats();
    $('#cw-mood').textContent = `${s.moodLabel[1]} ${Math.round(s.mood)}%`;
    moodEl.dataset.mood = s.moodLabel[2];
    moodEl.querySelector('.cw-face__mouth').setAttribute('d', MOUTH[s.moodLabel[2]]);
    const mb = $('#cw-mood-bar'); mb.style.width = `${Math.round(s.mood)}%`; mb.style.background = s.mood < 30 ? '#d9564a' : s.mood < 55 ? '#e0862f' : '#4f9a6b';
    $('#cw-reports').textContent = String(s.reports);
    $('#cw-unreported').textContent = s.unreported ? `+${s.unreported} unreported` : '';
    $('#cw-potholes').textContent = String(s.potholes);
    const flow = Math.round(s.flow * 100), tl = s.flow >= 0.72 ? ['Smooth', 'smooth', '#4f9a6b'] : s.flow >= 0.5 ? ['Busy', 'busy', '#e0862f'] : ['Jammed', 'jammed', '#d9564a'];
    $('#cw-traffic').textContent = `${tl[0]} ${flow}%`; trafficEl.dataset.traffic = tl[1];
    const tb = $('#cw-traffic-bar'); tb.style.width = `${flow}%`; tb.style.background = tl[2];
    $('#cw-crews').textContent = `${s.crewsIdle}/${s.crews}`;
    $('#cw-clock').textContent = fmt(s.clock);
    const night = engine.daylight.night > 0.5;
    $('#cw-clock-icon').setAttribute('href', night ? '#i-moon' : '#i-sun');
    $('#cw-night-icon').setAttribute('href', night ? '#i-sun' : '#i-moon');
    $('#cw-night-label').textContent = night ? 'Day' : 'Night';
    nightBtn.setAttribute('aria-pressed', String(night));
    syncMarkers();
    renderPanel();
    if (selected) { const lv = $('#cw-card-live'); if (lv) { const [t, tone] = liveFor(selected); lv.textContent = t; lv.dataset.tone = tone; } }
    if (selectedIssue) renderIssueLive();
    if (selectedCrew) renderCrewCard();
  }
  const updateCardLive = () => { hudClock = 1; };

  // --- Per-frame wiring ---------------------------------------------------------------------------------
  let lastMini = null;
  engine.onFrame((dt) => {
    sim.tick(engine.motion ? dt : 0);
    engine.clock = sim.state.clock;
    const dl = engine.daylightFromClock(sim.state.clock);
    if (Math.abs(dl.night - engine.daylight.night) > 0.002 || Math.abs(dl.warm - engine.daylight.warm) > 0.002) engine.setDaylight(dl.night, dl.warm);
    if (bounce) { bounce.t += dt; const k = Math.exp(-bounce.t * 5) * Math.sin(bounce.t * 18) * 0.06; bounce.place.mesh.scale.set(1, 1 + k, 1); if (bounce.t > 1.2) { bounce.place.mesh.scale.set(1, 1, 1); bounce = null; } }
    if (followCrew) { const v = followCrew.van; if (v.hidden) followCrew = null; else rig.focus({ x: v.x, y: 0, z: v.z }); }
  });
  engine.afterFrame((dt) => {
    const near = rig.cur.dist < (isPhone() ? 34 : 40);
    for (const [place, it] of labels) {
      const focus = place === hovered || place === selected;
      const show = focus || (near && !directoryOpen);
      it.el.classList.toggle('is-hidden', !show);
      it.el.classList.toggle('cw-label--mini', !focus);
    }
    const far = rig.cur.dist > (isPhone() ? 60 : 64) && !selected && !selectedIssue && !selectedCrew;
    if (far !== lastMini) { lastMini = far; dlabels.forEach((it) => it.el.classList.toggle('is-hidden', !far)); }
    tickBubbles(dt);
    tickHud(dt);
    overlay.update();
  });

  // --- Reveal the HUD after the city assembles ------------------------------------------------------------
  let ready = false;
  const reveal = () => {
    for (const id of ['cw-stats', 'cw-dock', 'cw-cam', 'cw-panel']) $('#' + id).hidden = false;
    if (!wide()) setPanelMin(true);
    $('#cw-welcome').hidden = false;
    ready = true;
    renderPanel(true);
    rig.set({ sx: sideShift() });
    if (!motionOK) toast({ title: 'The city starts paused', detail: 'Motion is reduced. Press Play to run it.', tone: 'warn', icon: 'pause' });
  };
  setTimeout(reveal, motionOK ? 1900 : 0);
  // Seed a little activity so the city has a story from the first minute.
  setTimeout(() => {
    if (opsMode) return; // the operations view brings its own reports
    const lane = world.net.byId.get('C>S');
    const first = sim.addIssue('pothole', lane ? { lane, s: lane.length * 0.55 } : null);
    if (first) first.reportDelay = 2.5;
    sim.addIssue('trash');
  }, motionOK ? 3200 : 0);
  let welcomeGone = false;
  function dismissWelcome() { if (welcomeGone) return; welcomeGone = true; $('#cw-welcome').hidden = true; }
  $('#cw-welcome-close').addEventListener('click', dismissWelcome);

  // Photo mode hides the HUD for presenting the city (H, or open with #photo).
  function togglePhoto(on = !app.classList.contains('is-photo')) {
    app.classList.toggle('is-photo', on);
    live.textContent = on ? 'Photo mode. Press H to bring the controls back.' : 'Controls are back.';
  }
  if (location.hash === '#photo') { app.classList.add('is-photo'); $('#cw-welcome').hidden = true; }

  // Deep link: #hall, #depot… opens that building's card.
  const fromHash = () => { const p = world.places.find((x) => x.id === decodeURIComponent(location.hash.slice(1))); if (p) select(p); };
  window.addEventListener('hashchange', fromHash);
  if (location.hash) setTimeout(fromHash, motionOK ? 2600 : 0);

  // Operations view: the same reports, teams and clock as the 2D operations map (?view=ops).
  if (opsMode) {
    import('./ops.js').then((m) => m.mountOps({ engine, sim, world, rig, overlay })).catch((e) => console.warn('Operations view failed:', e));
  }

  // Read-only diagnostics for verification.
  window.RoadNaCityWorld = {
    get stats() { return sim.stats(); }, get engine() { return engine; }, get sim() { return sim; },
    get selected() { return selected?.id ?? selectedIssue?.code ?? selectedCrew?.code ?? null; }, get tool() { return tool; },
    get metrics() { const i = engine.renderer.info.render; return { calls: i.calls, triangles: i.triangles, frames: engine.frames, quality: engine.quality, ratio: engine.renderer.getPixelRatio() }; },
  };
}
