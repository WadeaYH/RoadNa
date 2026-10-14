"use strict";

// Presentation only: filters, layers and zoom change the sample hotspots drawn on the real
// Irbid map (OpenStreetMap via shared/map.js). No report data or service queries happen here.
const M = window.RoadNaMap;
const container = document.querySelector("#heatmap");
const ranks = [...document.querySelectorAll(".rank")];
const tip = document.querySelector("#map-tip");
const tipName = document.querySelector("#tip-name");
const tipMeta = document.querySelector("#tip-meta");
const category = document.querySelector("#category");
const district = document.querySelector("#district");
const period = document.querySelector("#period");
const sub = document.querySelector("#map-sub");
const rankEmpty = document.querySelector("#rank-empty");
const counts = { ".55": ["Last 7 days", 52], ".8": ["Last 30 days", 214], "1": ["Last 90 days", 631] };

// Sample hotspots in real Irbid areas: [key, lat, lng, radius in metres, level, categories, pins].
const HOTSPOTS = [
  ["harbor", 32.5385, 35.8528, 900, "hot", "roads", 6],
  ["oldtown", 32.539, 35.842, 760, "hot", "water", 4],
  ["central", 32.5567, 35.853, 720, "warm", "roads light", 3],
  ["riverside", 32.5563, 35.87, 740, "warm", "light", 3],
  ["northside", 32.5885, 35.8632, 620, "mild", "roads sanitation", 2],
  ["westgate", 32.567, 35.832, 520, "mild", "sanitation", 2],
  ["eastbrook", 32.5317, 35.8832, 520, "mild", "parks", 2],
].map(([id, lat, lng, radius, level, cats, pins]) => ({ id, lat, lng, radius, level, cats, pins }));
const FORECAST = [
  { district: "harbor", cats: "roads", lat: 32.536, lng: 35.8545, radius: 300 },
  { district: "oldtown", cats: "water", lat: 32.5405, lng: 35.844, radius: 260 },
  { district: "riverside", cats: "light", lat: 32.5545, lng: 35.8725, radius: 260 },
];
const CREWS = [
  { district: "harbor", cats: "roads", lat: 32.5392, lng: 35.8519, name: "Roads Crew 4" },
  { district: "central", cats: "roads", lat: 32.5566, lng: 35.8545, name: "Roads Crew 6" },
  { district: "oldtown", cats: "water", lat: 32.559, lng: 35.8478, name: "Drainage Team A" },
  { district: "riverside", cats: "light", lat: 32.556, lng: 35.8705, name: "Lighting Crew 2" },
];

const map = M?.create(document.querySelector("#heat-map"), { zoom: 13, wheel: true, label: "Map of Irbid with report density hotspots. Use the arrow keys to pan and plus or minus to zoom." });
const groups = window.L ? { heat: L.layerGroup(), pins: L.layerGroup(), ai: L.layerGroup(), crews: L.layerGroup() } : {};
const items = [];
let activeId = "harbor";
let selectedPeriod = ".8";

if (map) {
  HOTSPOTS.forEach((spot) => {
    const layer = M.heat(map, { ...spot, opacity: Number(selectedPeriod) });
    layer.on("click", () => highlight(spot.id));
    spot.layer = layer;
    items.push({ group: "heat", layer, district: spot.id, cats: spot.cats });
    // Individual incidents scattered inside the hotspot (golden-angle spiral, deterministic).
    for (let i = 0; i < spot.pins; i += 1) {
      const angle = i * 2.39996;
      const reach = (spot.radius * 0.42 * (i + 1)) / (spot.pins + 1);
      const lat = spot.lat + (Math.cos(angle) * reach) / 111320;
      const lng = spot.lng + (Math.sin(angle) * reach) / (111320 * Math.cos((spot.lat * Math.PI) / 180));
      const marker = L.marker([lat, lng], { icon: L.divIcon({ className: "rn-marker", html: '<span class="rn-dot rn-dot--ink"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, keyboard: false });
      items.push({ group: "pins", layer: marker, district: spot.id, cats: spot.cats });
    }
  });
  FORECAST.forEach((f) => items.push({ group: "ai", layer: M.ring(map, f), district: f.district, cats: f.cats }));
  CREWS.forEach((c) => {
    const marker = L.marker([c.lat, c.lng], { icon: L.divIcon({ className: "rn-marker", html: '<span class="rn-pin rn-pin--teal rn-pin--crew"><svg class="icon" width="13" height="13" aria-hidden="true" focusable="false"><use href="#i-truck"/></svg></span>', iconSize: [28, 28], iconAnchor: [14, 14] }), title: c.name, keyboard: false });
    items.push({ group: "crews", layer: marker, district: c.district, cats: c.cats });
  });
  M.fit(map, HOTSPOTS.map((s) => [s.lat, s.lng]), 30, 14);
}

const matchesFilters = (item) =>
  (district.value === "all" || item.district === district.value) &&
  (category.value === "all" || item.cats.split(" ").includes(category.value));
const visibleSpots = () => HOTSPOTS.filter((spot) => matchesFilters({ district: spot.id, cats: spot.cats }));

const positionTip = () => {
  const spot = HOTSPOTS.find((item) => item.id === activeId);
  if (tip.hidden || !spot || !map) return;
  const point = map.latLngToContainerPoint([spot.lat, spot.lng]);
  const width = container.clientWidth;
  const height = container.clientHeight;
  const controls = container.querySelector(".map-zoom");
  const above = point.y - tip.offsetHeight - 18;
  let top = Math.max(12, Math.min(height - tip.offsetHeight - 12, above >= 12 ? above : point.y + 18));
  let rightInset = 12;
  if (top < controls.offsetTop + controls.offsetHeight) rightInset += controls.offsetWidth + 12;
  const edge = tip.offsetWidth / 2;
  tip.style.left = Math.max(12 + edge, Math.min(width - rightInset - edge, point.x)) + "px";
  tip.style.top = top + "px";
};

function highlight(id, pan = false) {
  activeId = id;
  const spot = visibleSpots().find((item) => item.id === id);
  ranks.forEach((rank) => {
    const active = Boolean(spot) && rank.dataset.blob === id;
    rank.classList.toggle("is-active", active);
    rank.setAttribute("aria-pressed", String(active));
  });
  HOTSPOTS.forEach((item) => item.layer?.getElement()?.classList.toggle("is-active", item === spot));
  if (!spot) { tip.hidden = true; return; }
  const rank = ranks.find((item) => item.dataset.blob === id);
  tipName.textContent = rank ? rank.dataset.name : district.querySelector('option[value="' + id + '"]')?.textContent || id;
  tipMeta.textContent = rank ? rank.dataset.meta : "Sample hotspot · " + spot.cats.split(" ").map((value) => category.querySelector('option[value="' + value + '"]')?.textContent || value).join(", ");
  tip.hidden = false;
  if (pan && map) map.panTo([spot.lat, spot.lng], { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  positionTip();
}

const applyFilters = () => {
  items.forEach((item) => {
    const group = groups[item.group];
    if (matchesFilters(item)) group.addLayer(item.layer);
    else group.removeLayer(item.layer);
  });
  HOTSPOTS.forEach((spot) => spot.layer?.setStyle({ fillOpacity: Number(selectedPeriod) }));
  ranks.forEach((rank) => { rank.closest("li").hidden = !visibleSpots().some((spot) => spot.id === rank.dataset.blob); });
  const visible = visibleSpots();
  rankEmpty.hidden = ranks.some((rank) => !rank.closest("li").hidden);
  const label = counts[selectedPeriod][0];
  const all = district.value === "all" && category.value === "all";
  sub.textContent = all
    ? label + " · " + counts[selectedPeriod][1] + " reports mapped in Irbid (sample data)"
    : label + " · " + visible.length + " sample hotspot" + (visible.length === 1 ? "" : "s") + " · " + district.selectedOptions[0].textContent + " · " + category.selectedOptions[0].textContent;
  if (!visible.some((spot) => spot.id === activeId)) activeId = visible[0]?.id;
  highlight(activeId);
};

document.querySelectorAll("[data-layer]").forEach((input) => {
  const sync = () => {
    container.toggleAttribute("data-show-" + input.dataset.layer, input.checked);
    const group = groups[input.dataset.layer];
    if (!map || !group) return;
    if (input.checked) group.addTo(map);
    else group.remove();
  };
  input.addEventListener("change", sync);
  sync();
});

period.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    period.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    selectedPeriod = button.dataset.heat;
    applyFilters();
  });
});
category.addEventListener("change", applyFilters);
district.addEventListener("change", applyFilters);
ranks.forEach((rank) => rank.addEventListener("click", () => highlight(rank.dataset.blob, true)));
map?.on("move zoom", positionTip);
window.addEventListener("resize", positionTip);

document.querySelectorAll("[data-zoom]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.zoom;
    if (action === "in") map?.zoomIn();
    else if (action === "out") map?.zoomOut();
    else M?.fit(map, HOTSPOTS.map((s) => [s.lat, s.lng]), 30, 14);
  });
});
applyFilters();
