"use strict";

// Presentation only. Filtering, sorting and the map controls act on the static sample
// reports in this page; real data will come from ASP.NET later.

const cards = [...document.querySelectorAll(".report-card")];
const list = document.querySelector("#reports");
const searchInput = document.querySelector("#report-search");
const categorySelect = document.querySelector("#category-filter");
const pills = [...document.querySelectorAll(".pill")];
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const sortButton = document.querySelector("#sort-btn");
// Sample reports pinned at real Irbid locations (OpenStreetMap via shared/map.js).
const guestMap = window.RoadNaMap?.create(document.querySelector("#guest-map"), { zoom: 14, wheel: true, label: "Map of reported issues in Irbid. Use the arrow keys to pan and plus or minus to zoom." });
const PIN_DATA = {
  "pin-progress": { lat: 32.5392, lng: 35.852, tone: "amber", icon: "i-construction", label: "In progress: Severe asphalt pothole on University St" },
  "pin-assigned": { lat: 32.5566, lng: 35.8548, tone: "teal", icon: "i-lightbulb", label: "Assigned: Flickering street lamp, Downtown" },
  "pin-submitted": { lat: 32.5386, lng: 35.8411, tone: "slate", icon: "i-delete", label: "Submitted: Overflowing trash bin in Emaar Irbid Park" },
  "pin-resolved": { lat: 32.5569, lng: 35.8506, tone: "green", icon: "i-check-circle", label: "Resolved: Curb ramp rebuilt on Al-Hashemi St" },
};
const markers = Object.fromEntries(Object.entries(PIN_DATA).map(([id, data]) => [id, window.RoadNaMap?.pin(guestMap, data)]));
const pinNode = (id) => markers[id]?.getElement();
const allPoints = Object.values(PIN_DATA).map((p) => [p.lat, p.lng]);
const resetView = () => window.RoadNaMap?.fit(guestMap, allPoints, 60, 15);
resetView();

const STATUS_LABEL = { submitted: "Submitted", assigned: "Assigned", progress: "In Progress", resolved: "Resolved" };
let activeStatus = "all";

// Dismissible guest notice
document.querySelectorAll("[data-dismiss]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(button.dataset.dismiss);
    if (target) target.hidden = true;
  });
});

// Status / category / search filtering
const applyFilters = () => {
  const query = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  let visible = 0;

  cards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    const show =
      (activeStatus === "all" || card.dataset.status === activeStatus) &&
      (category === "all" || card.dataset.category === category) &&
      (!query || text.includes(query));
    card.closest("li").hidden = !show;
    pinNode(card.dataset.pin)?.classList.toggle("is-hidden", !show);
    if (show) visible += 1;
  });

  const filtered = activeStatus !== "all" || category !== "all" || query;
  resultCount.textContent = filtered
    ? `Showing ${visible} ${activeStatus === "all" ? "matching" : STATUS_LABEL[activeStatus].toLowerCase()} ${visible === 1 ? "incident" : "incidents"}`
    : `Showing ${visible} sample incidents`;
  emptyState.hidden = visible !== 0;
};

pills.forEach((pill) => {
  pill.addEventListener("click", () => {
    activeStatus = pill.dataset.status;
    pills.forEach((p) => {
      const on = p === pill;
      p.classList.toggle("is-active", on);
      p.setAttribute("aria-pressed", String(on));
    });
    applyFilters();
  });
});
searchInput.addEventListener("input", applyFilters);
categorySelect.addEventListener("change", applyFilters);

document.querySelector(".pill__count").textContent = String(cards.length);
applyFilters();

// Sort between most voted and newest
sortButton.addEventListener("click", () => {
  const byVotes = sortButton.dataset.sort === "votes";
  sortButton.dataset.sort = byVotes ? "newest" : "votes";
  const label = byVotes ? "Newest" : "Most Voted";
  sortButton.firstChild.textContent = `Sort: ${label} `;
  const key = byVotes ? "age" : "votes";
  const sorted = [...list.children].sort((a, b) => {
    const A = Number(a.querySelector(".report-card").dataset[key]);
    const B = Number(b.querySelector(".report-card").dataset[key]);
    return byVotes ? A - B : B - A;
  });
  sorted.forEach((li) => list.appendChild(li));
});

// Cards <-> map pins
const setActive = (pinId) => {
  Object.keys(markers).forEach((id) => pinNode(id)?.classList.toggle("is-active", id === pinId));
  cards.forEach((card) => card.classList.toggle("is-active", card.dataset.pin === pinId));
};
Object.entries(markers).forEach(([id, marker]) => {
  marker?.on("click", () => {
    setActive(id);
    const card = cards.find((c) => c.dataset.pin === id);
    if (card) card.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
});
cards.forEach((card) => {
  card.addEventListener("mouseenter", () => setActive(card.dataset.pin));
  card.addEventListener("focusin", () => setActive(card.dataset.pin));
  card.addEventListener("mouseleave", () => setActive(null));
});

// Map zoom controls
document.querySelectorAll("[data-zoom]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.zoom;
    if (action === "in") guestMap?.zoomIn();
    else if (action === "out") guestMap?.zoomOut();
    else resetView();
  });
});
