// Operations view for the 3D city (?view=ops). It shows the same reports, teams, statuses and clock as
// the 2D operations map (shared/ops-data.js), but drawn with the city's own pieces: each report is a
// real pothole, dark lamp, overflowing bin or flooded drain with the usual city pin, and each team is
// a real crew van that drives the streets to its job, works there, and drives back to the depot.
// Without ?view=ops CityWorld stays the public sandbox. Everything here is sample data.
import * as THREE from '../../shared/cityworld/three.js';

const Ops = window.RoadNaOps;
const { STATUS, ROLES, REPORTS, TEAMS, HOTSPOTS, NOW, fmtTime, DEPARTMENTS, AREAS } = Ops;
const ROLES_3D = Object.entries(ROLES).filter(([, info]) => info.city3d);

// Sample Irbid positions are spread over the miniature city inside its ring road.
const LAT = [32.538, 32.572], LNG = [35.838, 35.872];
const lerp = (a, b, k) => a + (b - a) * k;
const toWorld = ([lat, lng]) => ({ x: lerp(-22.5, 22.5, (lng - LNG[0]) / (LNG[1] - LNG[0])), z: lerp(14.5, -14.5, (lat - LAT[0]) / (LAT[1] - LAT[0])) });
// Each department's reports become the city problem its crews know how to fix.
const TYPE_FOR = { 'Roads Department': 'pothole', 'Lighting Division': 'light', 'Sanitation Department': 'trash', 'Parks Department': 'trash', 'Drainage & Water Authority': 'drain' };
// Each team drives the van that matches its work.
const CREW_TYPE = { 'Roads Crew 4': 'roads', 'Roads Crew 6': 'roads', 'Lighting Crew 2': 'lighting', 'Sanitation Crew 1': 'sanitation', 'Parks Crew 1': 'sanitation', 'Drainage Crew 3': 'drainage' };
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const svgUse = (id, size = 16) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'icon'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('aria-hidden', 'true'); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', `#i-${id}`); s.append(u); return s; };

export function mountOps({ engine, sim, rig, world, overlay }) {
  const { scene, issues, traffic } = engine;
  const app = document.getElementById('cw-app');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = Ops.parse(location.search);
  const clock = Ops.createClock({ reduceMotion, mode: start.mode, t: start.t });
  // Only supervisors, managers and super admins may open the 3D city view. In this preview the role comes
  // from the link; the real system will check the signed-in account.
  if (!ROLES[start.role]?.city3d) {
    app.classList.add('is-ops', 'is-gated');
    const gate = el('section', 'cw-ops-gate');
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-labelledby', 'gate-title');
    const h = el('h2', '', 'This view is for supervisors and managers');
    h.id = 'gate-title';
    const p2d = el('a', 'btn btn--primary', 'Open the 2D operations map');
    p2d.href = `../admin-ops-map/index.html${Ops.query(start.role, clock)}`;
    const pre = el('a', 'btn btn--outline', 'Preview as a supervisor');
    pre.href = `index.html${Ops.query('supervisor', clock)}`;
    const row = el('div', 'cw-ops-gate__actions');
    row.append(p2d, pre);
    gate.append(h, el('p', '', 'The 3D city view is open to supervisors (the people responsible for crews, fixes and reports), managers and super admins. Reviewers use Review & Assign and the 2D map.'), row);
    app.append(gate);
    p2d.focus();
    return;
  }
  let role = start.role;
  let dept = ROLES[role].dept || 'all';
  const inDept = (report) => dept === 'all' || report.dept === dept;
  const teamInDept = (team) => dept === 'all' || team.dept === dept;
  let snap = Ops.snapshot(clock.min);
  let selected = null;
  const visible = new Set();
  document.title = 'City view · operations | RoadNa JO';

  // The sandbox is switched off: no random problems and no automatic crews. Traffic and people stay as scenery.
  app.classList.add('is-ops');
  issues.clear();
  sim.setAuto(false);
  sim.setRoadNa(false);
  sim.state.spawnTimer = 1e9;

  // --- Teams: the city's crews, renamed and matched to the operations teams -------------------
  const pool = [...sim.crews];
  const crewOf = new Map();
  for (const team of TEAMS) {
    let crew = pool.find((c) => c.type === CREW_TYPE[team.name]);
    if (!crew) crew = sim.hireCrew(CREW_TYPE[team.name]);
    if (!crew) continue;
    if (pool.includes(crew)) pool.splice(pool.indexOf(crew), 1);
    crew.name = team.name;
    crew.opsTeam = team;
    crewOf.set(team.name, crew);
  }
  // Suppress only the rendered instances: filtered crews keep their simulation state and route.
  const filteredVans = new Map();
  function syncCrewVisibility() {
    for (const crew of crewOf.values()) {
      const van = crew.van;
      if (!teamInDept(crew.opsTeam)) {
        if (!filteredVans.has(van)) filteredVans.set(van, { scale: van.scale, targetScale: van.targetScale });
        van.scale = 0;
        van.targetScale = 0;
      } else if (filteredVans.has(van)) {
        Object.assign(van, filteredVans.get(van));
        filteredVans.delete(van);
      }
    }
  }
  engine.onFrame(syncCrewVisibility);

  // --- Reports: real city problems at the closest matching spot ----------------------------------
  const issueOf = new Map();
  const reportOf = (issue) => issue?.ops?.report;
  // Take back a problem that landed too close to another report.
  function discard(made) {
    Object.values(made.meshes).forEach((m) => m?.removeFromParent());
    if (made.hazard) traffic.removeHazard(made.hazard);
    if (made.type === 'light') made.lamp.broken = false;
    issues.list.splice(issues.list.indexOf(made), 1);
  }
  const spotOf = new Map(); // each report keeps the same street spot when the city is rebuilt
  function spawnFor(report) {
    const type = TYPE_FOR[report.dept] || 'pothole';
    const p = toWorld([report.lat, report.lng]);
    let issue = spotOf.has(report.id) ? issues.spawn(type, spotOf.get(report.id)) : null;
    // Search outward from the true spot, skipping places too close to another report, so pins never stack.
    const crowded = (x, z) => [...issueOf.values()].some((o) => Math.hypot(o.x - x, o.z - z) < 4.2);
    for (let ring = 0; ring < 10 && !issue && !spotOf.has(report.id); ring++) {
      const steps = ring === 0 ? 1 : 12;
      for (let k = 0; k < steps && !issue; k++) {
        const a = (k / steps) * Math.PI * 2;
        const x = p.x + Math.cos(a) * ring * 1.1, z = p.z + Math.sin(a) * ring * 1.1;
        if (crowded(x, z)) continue;
        const made = issues.spawnNear(type, x, z);
        if (made && crowded(made.x, made.z)) { discard(made); continue; }
        issue = made;
      }
    }
    for (let tries = 0; tries < 12 && !issue; tries++) {
      const made = issues.spawn(type);
      if (made && crowded(made.x, made.z)) { discard(made); continue; }
      issue = made;
    }
    if (!issue) return null;
    if (!spotOf.has(report.id)) spotOf.set(report.id, { lane: issue.lane, s: issue.s, lateral: issue.lateral, lamp: issue.lamp, bin: issue.bin });
    issue.code = report.id;
    issue.createdClock = sim.state.clock;
    issue.reportDelay = 1e9; // no simulated resident reports: these are already in the system
    issue.ops = { report, status: null, label: '', title: report.title, hidden: false, selected: false };
    issues.setStatus(issue, 'reported');
    issueOf.set(report.id, issue);
    return issue;
  }

  // A team at work keeps working until the operations data says the job is done.
  const HOLD = 0.62;
  function sendHome(crew, animated) {
    crew.opsHold = false;
    if (animated) return; // the city's own "job done" drives the van home
    const van = crew.van;
    van.hidden = true; van.beacon = false; van.mode = 'depot';
    crew.state = 'idle'; crew.issue = null;
  }
  function placeAtWork(crew, issue) {
    const spot = issues.workSpot(issue);
    const van = crew.van;
    if (spot) {
      traffic.reset(van, { mode: 'crew', speed: 3.3 });
      van.hidden = false; van.beacon = true; van.scale = 1;
      traffic.place(van, spot.lane, spot.s);
      van.mode = 'hold'; van.holdLateral = 0.72;
    }
    crew.state = 'working'; crew.issue = issue; crew.work = 0; crew.opsHold = true;
    issue.crew = crew;
    issues.startWork(issue, spot ? van : null);
  }
  function showDone(issue) {
    issues.setStatus(issue, 'fixed');
    issue.fixedAge = 0;
    if (issue.hazard) { traffic.removeHazard(issue.hazard); issue.hazard = null; }
    if (issue.works) { traffic.removeHazard(issue.works); issue.works = null; }
    if (issue.worker) { engine.people.removeWorker(issue.worker); issue.worker = null; }
    if (issue.type === 'light') { issue.lamp.broken = false; issue.meshes.cap?.removeFromParent(); }
    if (issue.meshes.main) issue.meshes.main.visible = false;
    if (issue.meshes.cones) issue.meshes.cones.visible = false;
    issue.removing = false;
  }
  // When the city finishes a job by itself (after we release the hold), keep the report on the map.
  sim.on((ev) => {
    if (ev.type !== 'fixed' || !ev.issue?.ops) return;
    const issue = ev.issue;
    issue.removing = false;
    if (issue.meshes.main) issue.meshes.main.visible = false;
    if (issue.meshes.cones) issue.meshes.cones.visible = false;
  });

  // Move one report to its status at the current minute. Animated changes use the real city: vans drive.
  function apply(report, status, animated) {
    let issue = issueOf.get(report.id);
    if (!status) return;
    if (!issue) issue = spawnFor(report);
    if (!issue) return;
    const was = issue.ops.status;
    issue.ops.status = status;
    issue.ops.label = STATUS[status].label;
    if (was === status) return;
    const team = Ops.teamFor(report.id);
    const crew = team && crewOf.get(team.name);
    if (status === 'review' || status === 'waiting') {
      if (issue.status !== 'reported') issues.setStatus(issue, 'reported');
    } else if (status === 'progress' && crew) {
      if (crew.issue && crew.issue !== issue) sendHome(crew, false);
      if (animated && crew.state === 'idle' && issue.status === 'reported') {
        const r = sim.dispatch(issue, crew);
        if (r.ok) crew.opsHold = true; else placeAtWork(crew, issue);
      } else placeAtWork(crew, issue);
    } else if (status === 'check' || status === 'fixed') {
      if (was === 'check' && status === 'fixed') return; // the work is already done; only the pin changes
      if (crew && crew.issue === issue && crew.state === 'working' && animated) {
        crew.opsHold = false;
        crew.work = issue.info.work; // the city completes the job: patch, confetti, van drives home
      } else {
        if (crew && crew.issue === issue) sendHome(crew, false);
        showDone(issue);
      }
    }
  }
  // Build the whole city state at minute T without animation (used on load, on scrub and on loops).
  function rebuild(T) {
    for (const crew of crewOf.values()) {
      const van = crew.van;
      van.hidden = true; van.beacon = false; van.mode = 'depot';
      crew.state = 'idle'; crew.issue = null; crew.opsHold = false; crew.work = 0;
    }
    issues.clear();
    issueOf.clear();
    snap = Ops.snapshot(T);
    // Replay every status change up to T in time order, so a team that finished one job is free for the next.
    const events = [];
    for (const r of REPORTS) for (const [m, s] of r.events) if (m <= T) events.push({ m, r, s });
    events.sort((x, y) => x.m - y.m);
    for (const e of events) apply(e.r, e.s, false);
    for (const team of TEAMS) {
      const st = snap.teams.get(team.name);
      const crew = crewOf.get(team.name);
      if (crew && !st.task && crew.issue) sendHome(crew, false);
    }
    refresh();
  }

  // --- Hotspots: soft glows on the ground -------------------------------------------------------
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const heatGroup = new THREE.Group();
  heatGroup.visible = false;
  scene.add(heatGroup);
  const HEAT = { hot: 0xba1a1a, warm: 0xea580c, mild: 0xf59e0b };
  for (const spot of HOTSPOTS) {
    const p = toWorld([spot.lat, spot.lng]);
    const m = new THREE.Mesh(new THREE.CircleGeometry(spot.radius / 127, 40), new THREE.MeshBasicMaterial({ color: HEAT[spot.level], map: glowTex, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, 0.3, p.z);
    heatGroup.add(m);
  }

  // --- The panel ------------------------------------------------------------------------------
  const panel = el('section', 'cw-panel cw-ops');
  panel.id = 'cw-ops';
  panel.setAttribute('aria-label', 'Operations view');
  const head = el('header', 'cw-ops__head');
  const titleWrap = el('div');
  titleWrap.append(el('p', 'cw-ops__eyebrow', 'Operations'), el('h2', 'cw-ops__title', 'City view'));
  const link2d = el('a', 'cw-btn cw-ops__link', '2D map');
  const mapHref = () => `../admin-ops-map/index.html${Ops.query(role, clock)}`;
  const updateMapLink = (event) => { event.currentTarget.href = mapHref(); };
  link2d.addEventListener('click', updateMapLink);
  link2d.addEventListener('auxclick', updateMapLink);
  const minBtn = el('button', 'cw-panel__min cw-ops__min');
  minBtn.type = 'button';
  minBtn.setAttribute('aria-expanded', 'true');
  minBtn.setAttribute('aria-label', 'Minimise the operations panel');
  minBtn.append(svgUse('chevron-down', 16));
  head.append(titleWrap, link2d, minBtn);
  const body = el('div', 'cw-ops__body');

  const roleBox = el('div', 'ops-seg');
  roleBox.setAttribute('role', 'group');
  roleBox.setAttribute('aria-label', 'View as');
  const roleButtons = ROLES_3D.map(([key, info]) => {
    const b = el('button', '', info.label);
    b.type = 'button';
    b.dataset.role = key;
    b.addEventListener('click', () => setRole(key));
    roleBox.append(b);
    return b;
  });
  const blurb = el('p', 'cw-ops__blurb');
  const deptLabel = el('label', 'cw-ops__dept');
  const deptSelect = el('select', 'select');
  deptSelect.append(new Option('All departments', 'all'), ...DEPARTMENTS.map((d) => new Option(d, d)));
  deptLabel.append(el('span', '', 'Department'), deptSelect);
  deptSelect.addEventListener('change', () => { dept = deptSelect.value; selected = null; refresh(); });

  const timeBox = el('div', 'ops-time ops-time--compact');
  timeBox.setAttribute('role', 'group');
  timeBox.setAttribute('aria-label', 'Replay the day');
  const playBtn = el('button', 'btn btn--outline btn--sm', 'Play the day');
  playBtn.type = 'button';
  const range = el('input', 'ops-time__range');
  range.type = 'range'; range.min = '0'; range.max = String(NOW); range.step = '1'; range.value = String(NOW);
  range.setAttribute('aria-label', 'Time of day');
  const timeLabel = el('output', 'ops-time__label');
  const liveBtn = el('button', 'btn btn--outline btn--sm', 'Live');
  liveBtn.type = 'button';
  timeBox.append(playBtn, range, timeLabel, liveBtn);

  const statsList = el('ul', 'ops-stats');
  statsList.setAttribute('aria-label', 'Show in the city');
  const layerRow = el('div', 'cw-ops__layers');
  const heatLabel = el('label', 'layer');
  const heatToggle = el('input');
  heatToggle.type = 'checkbox';
  heatLabel.append(heatToggle, el('span', '', 'Hotspots'));
  layerRow.append(heatLabel);
  const mgrLabel = el('label', 'layer');
  const mgrToggle = el('input');
  mgrToggle.type = 'checkbox';
  mgrLabel.append(mgrToggle, el('span', '', 'Area cards and buildings'));
  layerRow.append(mgrLabel);

  // Details open in a popup beside the city: the report, and the crew handling it.
  const pop = el('section', 'cw-ops-pop');
  pop.setAttribute('aria-label', 'Details');
  pop.setAttribute('aria-live', 'polite');
  pop.hidden = true;
  const popClose = el('button', 'cw-ops-pop__close');
  popClose.type = 'button';
  popClose.setAttribute('aria-label', 'Close details');
  popClose.append(svgUse('close', 16));
  popClose.prepend(el('span', 'cw-ops-pop__x', '×'));
  const cardBody = el('div', 'ops-card');
  pop.append(popClose, cardBody);
  app.append(pop);
  let following = null, followTimer = 0;
  const closePop = () => { selected = null; following = null; renderCard(); };
  popClose.addEventListener('click', closePop);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden && !app.classList.contains('is-wall')) closePop(); });
  const teamsHead = el('h3', 'cw-ops__h3', 'Teams');
  const teamsList = el('ul', 'cw-ops__teams');
  const attnHead = el('h3', 'cw-ops__h3', 'Needs attention');
  const attention = el('ul', 'attn');
  const sandbox = el('a', 'cw-ops__sandbox', 'Open the sandbox city (training)');
  sandbox.href = 'index.html';
  body.append(roleBox, blurb, deptLabel, timeBox, statsList, layerRow, attnHead, attention, teamsHead, teamsList, sandbox);
  panel.append(head, body);
  app.append(panel);

  minBtn.addEventListener('click', () => {
    const min = !panel.classList.contains('is-min');
    panel.classList.toggle('is-min', min);
    minBtn.setAttribute('aria-expanded', String(!min));
  });
  if (innerWidth < 760) { panel.classList.add('is-min'); minBtn.setAttribute('aria-expanded', 'false'); }

  // --- Panel contents ---------------------------------------------------------------------------
  const statButtons = new Map();
  const renderStats = () => {
    const c = Object.fromEntries(Object.keys(STATUS).map((k) => [k, 0]));
    for (const r of REPORTS) { const st = snap.reports.get(r.id); if (st && inDept(r)) c[st] += 1; }
    for (const [key, info] of Object.entries(STATUS)) {
      if (!statButtons.has(key)) {
        const li = el('li');
        const btn = el('button', `ops-stat ops-stat--${info.tone}`);
        const value = el('strong');
        btn.type = 'button';
        btn.append(el('span', 'ops-stat__dot'), value, el('span', '', info.label));
        btn.addEventListener('click', () => { visible.has(key) ? visible.delete(key) : visible.add(key); refresh(); });
        li.append(btn);
        statsList.append(li);
        statButtons.set(key, { btn, value });
      }
      const { btn, value } = statButtons.get(key);
      btn.setAttribute('aria-pressed', String(visible.has(key)));
      value.textContent = String(c[key]);
    }
  };
  const renderAttention = () => {
    attention.textContent = '';
    const order = ['waiting', 'check', 'review'];
    const items = REPORTS.filter((r) => snap.reports.has(r.id)).map((r) => ({ r, st: snap.reports.get(r.id) }))
      .filter(({ r, st }) => order.includes(st) && visible.has(st) && inDept(r)).sort((a, b) => order.indexOf(a.st) - order.indexOf(b.st)).slice(0, 6);
    if (!items.length) { attention.append(el('li', 'attn__empty', 'Nothing needs attention in the layers you are showing.')); return; }
    for (const { r, st } of items) {
      const li = el('li');
      const btn = el('button', 'attn__item');
      btn.type = 'button';
      btn.append(el('span', `chip ${STATUS[st].chip}`, STATUS[st].label), el('strong', '', r.title), el('span', 'attn__meta', `${r.place} · reported ${fmtTime(r.events[0][0])}`));
      btn.addEventListener('click', () => selectReport(r, true));
      li.append(btn);
      attention.append(li);
    }
  };
  const renderTeams = () => {
    teamsList.textContent = '';
    for (const team of TEAMS.filter(teamInDept)) {
      const st = snap.teams.get(team.name);
      const li = el('li');
      const btn = el('button', 'cw-ops__team');
      btn.type = 'button';
      btn.append(svgUse('truck', 16), el('strong', '', team.name), el('span', `chip ${st.task ? 'chip--progress' : 'chip--resolved'}`, st.task ? Ops.PHASE_TEXT[st.phase] : 'Free'));
      btn.addEventListener('click', () => selectTeam(team, true));
      li.append(btn);
      teamsList.append(li);
    }
  };
  const renderCard = () => {
    const ok = Ops.renderCard(cardBody, selected, snap, role, { onShowTask: (report) => selectReport(report, true), onFollow: (team) => { following = crewOf.get(team.name) || null; followTimer = 1; } });
    if (ok === false) { selected = null; Ops.renderCard(cardBody, null, snap, role); }
    pop.hidden = !selected;
    if (!selected) following = null;
    for (const issue of issueOf.values()) issue.ops.selected = selected?.kind === 'report' && reportOf(issue) === selected.item;
  };
  const focusAt = (x, z) => rig.focus({ x, y: 0, z }, innerWidth < 640 ? 40 : 30);
  function selectReport(report, move) {
    selected = { kind: 'report', item: report };
    const issue = issueOf.get(report.id);
    if (move && issue) focusAt(issue.x, issue.z);
    renderCard();
  }
  function selectTeam(team, move) {
    if (!teamInDept(team)) return;
    selected = { kind: 'team', item: team };
    const crew = crewOf.get(team.name);
    if (move) {
      if (crew && !crew.van.hidden) focusAt(crew.van.x, crew.van.z);
      else focusAt(19.7, -4.5); // the crew depot
    }
    renderCard();
  }
  // Clicking a city pin in this view opens the operations card instead of the sandbox card.
  window.__cwOps = { mapHref, onIssue(issue) { const r = reportOf(issue); if (!r) return false; selectReport(r, true); return true; } };

  function refresh() {
    for (const issue of issueOf.values()) issue.ops.hidden = !visible.has(issue.ops.status) || !inDept(issue.ops.report);
    syncCrewVisibility();
    if (following && !teamInDept(following.opsTeam)) following = null;
    heatGroup.visible = heatToggle.checked;
    renderStats();
    renderAttention();
    renderTeams();
    if (selected?.kind === 'report') { const st = snap.reports.get(selected.item.id); if (!st || !visible.has(st) || !inDept(selected.item)) selected = null; }
    if (selected?.kind === 'team' && !teamInDept(selected.item)) selected = null;
    renderManager();
    renderCard();
  }
  function setRole(name) {
    role = name;
    const preset = ROLES[name];
    roleButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === name)));
    blurb.textContent = preset.blurb;
    visible.clear();
    preset.statuses.forEach((s) => visible.add(s));
    heatToggle.checked = preset.heat;
    dept = preset.dept || 'all';
    deptSelect.value = dept;
    // Managers start with the area cards on; supervisors and small screens start with a clean city.
    mgrToggle.checked = name !== 'supervisor' && innerWidth >= 760;
    selected = null;
    refresh();
  }
  roleButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  heatToggle.addEventListener('change', refresh);
  mgrToggle.addEventListener('change', refresh);
  range.addEventListener('input', () => { clock.scrub(Number(range.value)); rebuild(clock.min); });
  playBtn.addEventListener('click', () => { const was = clock.min; clock.play(); if (clock.min < was) rebuild(clock.min); });
  liveBtn.addEventListener('click', () => { clock.live(); rebuild(clock.min); });
  if (reduceMotion) { playBtn.disabled = true; playBtn.title = 'Playing the day needs motion, which your settings turn off. Use the slider instead.'; }

  // --- Per frame: clock, daylight and status changes ---------------------------------------------
  let lastLabel = '', lastHref = '', lastMin = clock.min, sig = '';
  let lastMetricsMinute = Math.floor(clock.min);
  engine.afterFrame((dt) => {
    clock.tick(Math.min(0.25, dt));
    // The 3D day follows the shared clock: 06:00 is sunrise, 12:00 is midday.
    sim.state.clock = 360 + clock.min;
    sim.state.spawnTimer = 1e9;
    if (clock.min < lastMin - 0.5) rebuild(clock.min); // the live preview started over
    lastMin = clock.min;
    const next = Ops.snapshot(clock.min);
    const nextSig = [...next.reports].map(([id, s]) => id + s).join(',') + [...next.teams].map(([n, t]) => n + t.phase).join(',');
    if (nextSig !== sig) {
      sig = nextSig;
      snap = next;
      const animated = clock.mode === 'live' && !reduceMotion;
      for (const r of REPORTS) apply(r, snap.reports.get(r.id), animated);
      refresh();
    } else {
      snap = next;
      if (Math.floor(clock.min) !== lastMetricsMinute) renderManager();
    }
    lastMetricsMinute = Math.floor(clock.min);
    if (following && teamInDept(following.opsTeam) && !following.van.hidden) {
      followTimer += dt;
      if (followTimer > 0.3) { followTimer = 0; rig.focus({ x: following.van.x, y: 0, z: following.van.z }, innerWidth < 640 ? 40 : 28); }
    }
    // Hold the work at the site until the data says it is done; the van stays parked with its beacon on.
    for (const crew of crewOf.values()) {
      if (crew.opsHold && crew.state === 'working' && crew.issue) crew.work = Math.min(crew.work, crew.issue.info.work * HOLD);
    }
    const label = clock.label();
    if (label !== lastLabel) { timeLabel.textContent = label; lastLabel = label; wallClock.textContent = `Greater Irbid Municipality · ${label}${dept === 'all' ? '' : ` · ${dept}`}`; }
    if (wallOn && !reduceMotion && rig.goal) rig.goal.az += dt * 0.05;
    const shown = Math.round(clock.shown());
    if (Number(range.value) !== shown) range.value = String(shown);
    liveBtn.setAttribute('aria-pressed', String(clock.mode === 'live'));
    playBtn.textContent = clock.playing ? 'Pause' : 'Play the day';
    const href = mapHref();
    if (href !== lastHref) { link2d.href = href; lastHref = href; }
  });

  // --- Manager tools ---------------------------------------------------------------------------------
  // Areas of the miniature city. Each report belongs to the area its pin sits in.
  const AREA_FOCUS = { nw: { x: -12, z: -8.5 }, ne: { x: 12.5, z: -8.5 }, sw: { x: -12, z: 8.5 }, se: { x: 12.5, z: 8.5 } };
  const areaOf = (issue) => (issue.z < 0 ? 'n' : 's') + (issue.x < 0 ? 'w' : 'e');
  const firstAt = (r) => r.events[0][0];
  const doneAt = (r) => r.events.find(([, s]) => s === 'check' || s === 'fixed')?.[0];
  const isOverdue = (r, st) => (st === 'review' || st === 'waiting') && clock.min - firstAt(r) > 120;
  const areaStats = (key) => {
    const list = REPORTS.filter((r) => inDept(r) && issueOf.get(r.id) && areaOf(issueOf.get(r.id)) === key && snap.reports.get(r.id));
    const open = list.filter((r) => !['check', 'fixed'].includes(snap.reports.get(r.id))).length;
    const overdue = list.filter((r) => isOverdue(r, snap.reports.get(r.id))).length;
    const fixes = list.map((r) => { const d = doneAt(r); return d != null && d <= clock.min && d > firstAt(r) ? d - firstAt(r) : null; }).filter((x) => x != null);
    const avg = fixes.length ? Math.round(fixes.reduce((s, x) => s + x, 0) / fixes.length) : null;
    return { open, overdue, avg };
  };
  const fmtDur = (m) => (m == null ? '-' : m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`);

  // Area cards: a strip along the bottom of the screen, never on top of the pins.
  const areaStrip = el('section', 'cw-ops-areas');
  areaStrip.setAttribute('aria-label', 'Areas');
  app.append(areaStrip);
  const areaCards = new Map();
  for (const [key, area] of Object.entries(AREAS)) {
    const card = el('button', 'cw-ops-area');
    card.type = 'button';
    card.addEventListener('click', () => { const p = AREA_FOCUS[key]; rig.focus({ x: p.x, y: 0, z: p.z }, innerWidth < 640 ? 44 : 34); });
    areaStrip.append(card);
    areaCards.set(key, { card, area });
  }

  // Neighbourhood health: one small sign in the Resident Quarter; the details open in the panel.
  const homePlace = world.places.find((p) => p.id === 'home');
  const healthAt = homePlace ? homePlace.label.clone().add(new THREE.Vector3(0, 2.6, 0)) : new THREE.Vector3(-12.5, 5, 11);
  const avgRating = Object.values(AREAS).reduce((s, a) => s + a.rating, 0) / Object.keys(AREAS).length;
  const reopened = Object.values(AREAS).reduce((s, a) => s + a.reopened, 0);
  const healthSign = el('button', 'cw-ops-health-sign');
  healthSign.type = 'button';
  healthSign.append(el('span', '', 'Neighbourhood health'), el('strong', '', `★ ${avgRating.toFixed(1)}`));
  healthSign.setAttribute('aria-label', `Neighbourhood health: residents rate fixes ${avgRating.toFixed(1)} out of 5. Open the details.`);
  const healthItem = overlay.add(healthSign, healthAt, { margin: 60 });

  const healthSection = el('section', 'cw-ops__section');
  const healthHead = el('h3', 'cw-ops__h3', 'Neighbourhood health');
  healthHead.id = 'ops-health';
  healthHead.tabIndex = -1;
  const healthNote = el('p', 'cw-ops__blurb', `Residents rate fixes ${avgRating.toFixed(1)} / 5 on average. ${reopened} reports were reopened this month. Sample figures.`);
  const healthList = el('ul', 'cw-ops-health__list');
  for (const area of Object.values(AREAS).sort((a, b) => a.rating - b.rating)) {
    const li = el('li');
    li.append(el('strong', '', area.name), el('span', area.rating < 4 ? 'is-low' : '', `★ ${area.rating.toFixed(1)}`), el('small', '', `${area.reopened} reopened · ${area.votes} votes · most reported: ${area.repeat}`));
    healthList.append(li);
  }
  const votesLink = el('a', 'cw-ops__sandbox', 'Community votes and decisions');
  votesLink.href = '../admin-community/index.html';
  healthSection.append(healthHead, healthNote, healthList, votesLink);
  healthSign.addEventListener('click', () => {
    panel.classList.remove('is-min');
    minBtn.setAttribute('aria-expanded', 'true');
    healthHead.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    healthHead.focus({ preventScroll: true });
  });

  // Headquarters: live numbers for the municipal buildings, each opening its screen.
  const hqSection = el('section', 'cw-ops__section');
  const hqList = el('ul', 'cw-ops-hq-list');
  hqSection.append(el('h3', 'cw-ops__h3', 'Headquarters'), hqList);
  body.insertBefore(hqSection, attnHead);
  body.insertBefore(healthSection, teamsHead);

  function renderManager() {
    const on = mgrToggle.checked;
    areaStrip.hidden = !on;
    healthItem.hidden = !on;
    for (const [key, { card, area }] of areaCards) {
      const s = areaStats(key);
      card.textContent = '';
      card.append(el('span', 'cw-ops-area__name', area.name), el('span', 'cw-ops-area__row', `${s.open} open · ${s.overdue} overdue`), el('span', 'cw-ops-area__row', `Avg fix ${fmtDur(s.avg)} · ★ ${area.rating.toFixed(1)}`));
      card.classList.toggle('is-alert', s.overdue > 0);
      card.setAttribute('aria-label', `${area.name}: ${s.open} open reports, ${s.overdue} overdue, average fix time ${fmtDur(s.avg)}, resident rating ${area.rating} out of 5. Show this area.`);
    }
    const count = (sts) => REPORTS.filter((r) => inDept(r) && sts.includes(snap.reports.get(r.id))).length;
    const free = TEAMS.filter((t) => teamInDept(t) && !snap.teams.get(t.name).task).length;
    const overdue = REPORTS.filter((r) => inDept(r) && isOverdue(r, snap.reports.get(r.id))).length;
    hqList.textContent = '';
    for (const [screen, title, text, alert] of [
      ['admin-incident-triage', 'Review Centre', `${count(['review'])} to review · ${count(['waiting'])} waiting for a team`, count(['waiting']) > 0],
      ['admin-ops-map', 'Crew Depot', `${free} team${free === 1 ? '' : 's'} free`, free === 0],
      ['admin-sla-orders', 'Clock Tower', `${overdue} overdue`, overdue > 0],
      ['admin-dashboard', 'City Hall', 'Dashboard and trends', false],
    ]) {
      const li = el('li');
      const a = el('a', `cw-ops-hq${alert ? ' is-alert' : ''}`);
      a.href = screen === 'admin-ops-map' ? mapHref() : `../${screen}/index.html`;
      if (screen === 'admin-ops-map') {
        a.addEventListener('click', updateMapLink);
        a.addEventListener('auxclick', updateMapLink);
      }
      a.append(el('strong', '', title), el('span', '', text));
      li.append(a);
      hqList.append(li);
    }
    renderWall();
  }

  // Wall display: a calm, full-screen picture for a meeting room. No controls, big numbers, slow camera.
  const wall = el('section', 'cw-ops-wall');
  wall.setAttribute('aria-label', 'Wall display');
  wall.hidden = true;
  const wallStats = el('div', 'cw-ops-wall__stats');
  const wallClock = el('p', 'cw-ops-wall__clock');
  const wallExit = el('button', 'cw-btn cw-ops-wall__exit', 'Exit wall display');
  wallExit.type = 'button';
  wall.append(wallStats, wallClock, wallExit);
  app.append(wall);
  const wallBtn = el('button', 'cw-btn cw-ops__wall', 'Wall display');
  wallBtn.type = 'button';
  head.insertBefore(wallBtn, minBtn);
  let wallOn = false;
  function setWall(on) {
    wallOn = on;
    app.classList.toggle('is-wall', on);
    wall.hidden = !on;
    if (on) { document.documentElement.requestFullscreen?.().catch(() => {}); wallExit.focus(); renderWall(); }
    else { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); wallBtn.focus(); }
  }
  wallBtn.addEventListener('click', () => setWall(true));
  wallExit.addEventListener('click', () => setWall(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wallOn) setWall(false); });
  function renderWall() {
    if (!wallOn) return;
    const count = (sts) => REPORTS.filter((r) => inDept(r) && sts.includes(snap.reports.get(r.id))).length;
    const overdue = REPORTS.filter((r) => inDept(r) && isOverdue(r, snap.reports.get(r.id))).length;
    wallStats.textContent = '';
    for (const [n, label, tone] of [[count(['review']), 'To review', 'slate'], [count(['waiting']), 'Waiting for a team', 'red'], [count(['progress']), 'In progress', 'amber'], [count(['check']), 'To check', 'teal'], [overdue, 'Overdue', overdue ? 'red' : 'slate']]) {
      const d = el('div', `cw-ops-wall__stat cw-ops-wall__stat--${tone}`);
      d.append(el('strong', '', String(n)), el('span', '', label));
      wallStats.append(d);
    }
  }

  // --- Camera: closer than the sandbox, so pins and vans are easy to read --------------------------
  const view = (phone, sx) => {
    const fov = phone ? 36 : 30;
    // On wide screens the city sits right of the panel and above the area strip.
    return { target: { x: 0, y: 0, z: 0.5 }, dist: rig.fit(phone ? 26 : 26, fov), az: Math.PI / 4, el: 0.95, fov, sx: phone ? 0 : sx, sy: phone ? 0.04 : 0.08 };
  };
  window.__cwOpsOverview = (phone, sx) => view(phone, sx);
  document.getElementById('cw-reset')?.addEventListener('click', () => rig.set(view(innerWidth < 640, innerWidth >= 1000 ? 0.16 : 0)));

  setRole(role);
  rebuild(clock.min);
  sig = [...snap.reports].map(([id, s]) => id + s).join(',') + [...snap.teams].map(([n, t]) => n + t.phase).join(',');
  rig.set(view(innerWidth < 640, innerWidth >= 1000 ? 0.16 : 0));
  window.RoadNaCityWorldOps = { get role() { return role; }, get clock() { return clock; }, get snapshot() { return snap; }, issues: issueOf, crews: crewOf };
}
