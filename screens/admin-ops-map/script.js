"use strict";

// Presentation only. A live operations map on the real Irbid map (shared/map.js, Leaflet +
// OpenStreetMap). The reports, teams, statuses and clock come from shared/ops-data.js, so the 3D
// city view shows exactly the same thing. Everything is a simulation on sample data.
const M = window.RoadNaMap;
const L = window.L;
const Ops = window.RoadNaOps;
const { STATUS, ROLES, REPORTS, TEAMS, HOTSPOTS, NOW, DEPOT, fmtTime, statusAt, coordsOf } = Ops;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const start = Ops.parse(location.search);
const clock = Ops.createClock({ reduceMotion, mode: start.mode, t: start.t });

const map = M.create(document.querySelector("#ops-map"), { zoom: 14, wheel: true, label: "Operations map of Irbid. Pins are reports and teams." });
const statsList = document.querySelector("#ops-stats");
const cardBody = document.querySelector("#card-body");
const attention = document.querySelector("#attention");
const teamsToggle = document.querySelector("#layer-teams");
const heatToggle = document.querySelector("#layer-heat");
const roleButtons = [...document.querySelectorAll("#role button")];
const blurb = document.querySelector("#role-blurb");
const playBtn = document.querySelector("#time-play");
const liveBtn = document.querySelector("#time-live");
const range = document.querySelector("#time-range");
const timeLabel = document.querySelector("#time-label");
const link3d = document.querySelector("#link-3d");
const cityLinks = [...document.querySelectorAll('a[href^="../city-world/index.html"]')];
const visible = new Set();
let role = start.role;
let selected = null; // { kind: "report" | "team", item }
let snap = Ops.snapshot(clock.min);
const updateCityLink = (event) => { event.currentTarget.href = `../city-world/index.html${Ops.query(role, clock)}`; };
cityLinks.forEach((a) => {
  a.addEventListener("click", updateCityLink);
  a.addEventListener("auxclick", updateCityLink);
});

// ----- Markers -----
// Leaflet rebuilds a marker's element each time its layer is shown again, so the accessible name
// is re-applied on every add.
const decorate = (marker, label) => marker.on("add", () => {
  const node = marker.getElement();
  if (!node) return;
  node.setAttribute("role", "button");
  node.setAttribute("aria-label", label);
  node.title = label;
});
const reportLayer = {};
Object.keys(STATUS).forEach((key) => { reportLayer[key] = L.layerGroup(); });
const reportMarkers = new Map(); // id -> { status, marker }
const teamLayer = L.layerGroup();
const teamMarkers = new Map();
const teamLines = new Map();
const heatLayer = L.layerGroup();
HOTSPOTS.forEach((spot) => heatLayer.addLayer(M.heat(map, spot)));

TEAMS.forEach((team) => {
  const marker = M.pin(map, { lat: DEPOT[0], lng: DEPOT[1], tone: "ink", icon: "i-truck", label: team.name, className: "ops-team" });
  marker.remove();
  decorate(marker, team.name);
  marker.on("click", () => selectTeam(team, false));
  teamLayer.addLayer(marker);
  teamMarkers.set(team.name, marker);
  const line = L.polyline([], { color: "#1f2933", weight: 2, dashArray: "4 7", interactive: false });
  teamLayer.addLayer(line);
  teamLines.set(team.name, line);
});

function syncReportMarkers() {
  let changed = false;
  Ops.REPORTS.forEach((report) => {
    const st = snap.reports.get(report.id) || null;
    const entry = reportMarkers.get(report.id);
    if ((entry?.status || null) === st) return;
    changed = true;
    if (entry) { reportLayer[entry.status].removeLayer(entry.marker); entry.marker.remove(); reportMarkers.delete(report.id); }
    if (!st) return;
    const marker = M.pin(map, { lat: report.lat, lng: report.lng, tone: STATUS[st].tone, size: "sm", label: report.title, className: st === "waiting" ? "ops-waiting" : "" });
    marker.remove();
    decorate(marker, `${report.id} ${report.title}, ${STATUS[st].label}`);
    marker.on("click", () => selectReport(report, false));
    reportLayer[st].addLayer(marker);
    reportMarkers.set(report.id, { status: st, marker });
  });
  return changed;
}
const lastTeam = new Map();
function syncTeams() {
  let changed = false;
  TEAMS.forEach((team) => {
    const state = snap.teams.get(team.name);
    const prev = lastTeam.get(team.name);
    if (!prev || prev.phase !== state.phase || prev.task !== state.task) changed = true;
    lastTeam.set(team.name, state);
    teamMarkers.get(team.name).setLatLng(state.at);
    teamLines.get(team.name).setLatLngs(state.task ? [state.at, coordsOf(state.task)] : []);
  });
  return changed;
}

// ----- Panels -----
const statButtons = new Map();
const renderStats = () => {
  const c = Object.fromEntries(Object.keys(STATUS).map((k) => [k, 0]));
  snap.reports.forEach((st) => { c[st] += 1; });
  Object.entries(STATUS).forEach(([key, info]) => {
    if (!statButtons.has(key)) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `ops-stat ops-stat--${info.tone}`;
      const dot = document.createElement("span");
      dot.className = "ops-stat__dot";
      const num = document.createElement("strong");
      const label = document.createElement("span");
      label.textContent = info.label;
      btn.append(dot, num, label);
      btn.addEventListener("click", () => { visible.has(key) ? visible.delete(key) : visible.add(key); applyLayers(); });
      li.append(btn);
      statsList.append(li);
      statButtons.set(key, { btn, num });
    }
    const { btn, num } = statButtons.get(key);
    btn.setAttribute("aria-pressed", String(visible.has(key)));
    num.textContent = String(c[key]);
  });
};
const renderAttention = () => {
  attention.textContent = "";
  const order = ["waiting", "check", "review"];
  const items = REPORTS.filter((r) => snap.reports.has(r.id)).map((r) => ({ r, st: snap.reports.get(r.id) })).filter(({ st }) => order.includes(st) && visible.has(st)).sort((a, b) => order.indexOf(a.st) - order.indexOf(b.st)).slice(0, 7);
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "attn__empty";
    li.textContent = "Nothing needs attention in the layers you are showing.";
    attention.append(li);
    return;
  }
  items.forEach(({ r: report, st }) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "attn__item";
    const chip = document.createElement("span");
    chip.className = `chip ${STATUS[st].chip}`;
    chip.textContent = STATUS[st].label;
    const strong = document.createElement("strong");
    strong.textContent = report.title;
    const meta = document.createElement("span");
    meta.className = "attn__meta";
    meta.textContent = `${report.place} · reported ${fmtTime(report.events[0][0])}`;
    btn.append(chip, strong, meta);
    btn.addEventListener("click", () => selectReport(report, true));
    li.append(btn);
    attention.append(li);
  });
};
const applyLayers = () => {
  Object.entries(reportLayer).forEach(([key, group]) => (visible.has(key) ? group.addTo(map) : group.remove()));
  teamsToggle.checked ? teamLayer.addTo(map) : teamLayer.remove();
  heatToggle.checked ? heatLayer.addTo(map) : heatLayer.remove();
  renderStats();
  renderAttention();
  if (selected?.kind === "report") {
    const st = snap.reports.get(selected.item.id);
    if (!st || !visible.has(st)) clearCard();
  }
  if (selected?.kind === "team" && !teamsToggle.checked) clearCard();
  restoreActive();
};

// ----- Selection card -----
const setActive = (marker) => {
  document.querySelectorAll(".rn-marker.is-active").forEach((n) => n.classList.remove("is-active"));
  marker?.getElement()?.classList.add("is-active");
};
const restoreActive = () => {
  if (!selected) return;
  setActive(selected.kind === "report" ? reportMarkers.get(selected.item.id)?.marker : teamMarkers.get(selected.item.name));
};
const fly = (lat, lng) => {
  const zoom = Math.max(map.getZoom(), 15);
  reduceMotion ? map.setView([lat, lng], zoom) : map.flyTo([lat, lng], zoom, { duration: 0.6 });
};
function clearCard() { selected = null; setActive(null); Ops.renderCard(cardBody, null, snap, role); }
function renderCard() {
  const ok = Ops.renderCard(cardBody, selected, snap, role, { onShowTask: (report) => selectReport(report, true) });
  if (ok === false) clearCard();
}
function selectReport(report, move) { selected = { kind: "report", item: report }; if (move) fly(report.lat, report.lng); renderCard(); restoreActive(); }
function selectTeam(team, move) { selected = { kind: "team", item: team }; if (move) fly(...snap.teams.get(team.name).at); renderCard(); restoreActive(); }

// ----- The clock -----
let lastLabel = "";
let lastHref = "";
function render() {
  snap = Ops.snapshot(clock.min);
  const reportsChanged = syncReportMarkers();
  const teamsChanged = syncTeams();
  if (reportsChanged || teamsChanged) {
    applyLayers();
    renderCard();
    restoreActive();
  }
  const label = clock.label();
  if (label !== lastLabel) { timeLabel.textContent = label; lastLabel = label; }
  const shown = Math.round(clock.shown());
  if (Number(range.value) !== shown) range.value = String(shown);
  liveBtn.setAttribute("aria-pressed", String(clock.mode === "live"));
  playBtn.textContent = clock.playing ? "Pause" : "Play the day";
  const href = `../city-world/index.html${Ops.query(role, clock)}`;
  if (href !== lastHref) { cityLinks.forEach((a) => { a.href = href; }); lastHref = href; }
  // The 3D city view is for supervisors, managers and super admins.
  link3d.hidden = !ROLES[role].city3d;
}
let last = performance.now();
function frame(now) {
  clock.tick(Math.min(0.25, (now - last) / 1000));
  last = now;
  render();
  requestAnimationFrame(frame);
}
range.addEventListener("input", () => clock.scrub(Number(range.value)));
playBtn.addEventListener("click", () => clock.play());
liveBtn.addEventListener("click", () => clock.live());
if (reduceMotion) { playBtn.disabled = true; playBtn.title = "Playing the day needs motion, which your settings turn off. Use the slider instead."; }

// ----- Roles and layers -----
const setRole = (name) => {
  role = name;
  const preset = ROLES[name];
  roleButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.role === name)));
  blurb.textContent = preset.blurb;
  visible.clear();
  preset.statuses.forEach((s) => visible.add(s));
  teamsToggle.checked = preset.teams;
  heatToggle.checked = preset.heat;
  clearCard();
  snap = Ops.snapshot(clock.min);
  syncReportMarkers();
  syncTeams();
  applyLayers();
  // Fit after the map has its final size (it resizes once the page lays out).
  const points = REPORTS.filter((r) => visible.has(statusAt(r, NOW))).map((r) => [r.lat, r.lng]);
  map.invalidateSize({ animate: false });
  M.fit(map, points, 40, 15);
  window.setTimeout(() => { map.invalidateSize({ animate: false }); M.fit(map, points, 40, 15); }, 300);
};
roleButtons.forEach((b) => b.addEventListener("click", () => setRole(b.dataset.role)));
teamsToggle.addEventListener("change", applyLayers);
heatToggle.addEventListener("change", applyLayers);

setRole(role);
requestAnimationFrame(frame);
