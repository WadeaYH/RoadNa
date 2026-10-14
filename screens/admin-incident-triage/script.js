"use strict";

// Presentation only. Selecting a row fills the detail pane from the sample data attributes,
// and the decision buttons only change what is shown. ASP.NET and the AI service will supply
// real incidents and record every decision and override.
const items = [...document.querySelectorAll(".q-item")];
const detail = {
  photo: document.querySelector("#d-photo"),
  id: document.querySelector("#d-id"),
  state: document.querySelector("#d-state"),
  title: document.querySelector("#detail-title"),
  desc: document.querySelector("#d-desc"),
  place: document.querySelector("#d-place"),
  time: document.querySelector("#d-time"),
  reporter: document.querySelector("#d-reporter"),
  aiCat: document.querySelector("#d-ai-cat"),
  conf: document.querySelector("#d-conf"),
  confBar: document.querySelector("#d-conf-bar"),
  aiPrio: document.querySelector("#d-ai-prio"),
  dupRow: document.querySelector("#d-dup-row"),
  dup: document.querySelector("#d-dup"),
  spam: document.querySelector("#d-spam"),
};
const catSelect = document.querySelector("#cat-select");
const deptSelect = document.querySelector("#dept-select");
const prioGroup = document.querySelector("#prio-group");
const overrideNote = document.querySelector("#override-note");
const rejectBox = document.querySelector("#reject-box");
const toast = document.querySelector("#toast");
const waiting = document.querySelector("#stat-waiting");
const CAT_LABEL = { roads: "Roads & Hazards", light: "Street Lighting", sanitation: "Sanitation & Debris", parks: "Parks & Public Trees", water: "Water Main & Drainage", sidewalk: "Sidewalks & Signs" };
const PRIO_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
let current = items[0];
let toastTimer = null;

const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  toast.style.animation = "none";
  void toast.offsetWidth;
  toast.style.animation = "";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3000);
};
const setPriority = (value) => {
  prioGroup.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.prio === value)));
};
const currentPriority = () => prioGroup.querySelector('[aria-pressed="true"]')?.dataset.prio;
const checkOverride = () => {
  const changed = catSelect.value !== current.dataset.cat || currentPriority() !== current.dataset.prio;
  overrideNote.hidden = !changed;
};

const select = (item) => {
  current = item;
  items.forEach((i) => { i.classList.toggle("is-selected", i === item); i.setAttribute("aria-pressed", String(i === item)); });
  const d = item.dataset;
  const html = (value) => { const t = document.createElement("textarea"); t.innerHTML = value; return t.value; };
  detail.photo.dataset.kind = d.icon;
  detail.id.textContent = d.id;
  detail.title.textContent = html(d.title);
  detail.desc.textContent = html(d.desc);
  detail.place.textContent = html(d.place);
  detail.time.textContent = d.time;
  detail.reporter.textContent = d.reporter;
  detail.aiCat.textContent = CAT_LABEL[d.cat];
  detail.conf.textContent = `${d.conf}%`;
  detail.confBar.style.transform = `scaleX(${Number(d.conf) / 100})`;
  detail.aiPrio.innerHTML = `<span class="priority priority--${d.prio}">${PRIO_LABEL[d.prio]}</span>`;
  detail.dupRow.hidden = !d.dup;
  detail.dup.textContent = d.dup;
  detail.spam.textContent = `${Number(d.spam) > 50 ? "High" : "Low"} (${d.spam}%)`;
  catSelect.value = d.cat;
  deptSelect.value = d.dept;
  setPriority(d.prio);
  detail.state.className = "chip chip--submitted";
  detail.state.textContent = "Submitted";
  if (item.classList.contains("is-done")) {
    detail.state.className = `chip ${item.dataset.result === "rejected" ? "chip--rejected" : item.dataset.result === "duplicate" ? "chip--duplicate" : "chip--validated"}`;
    detail.state.textContent = item.dataset.resultLabel;
  }
  overrideNote.hidden = true;
  rejectBox.hidden = true;
};

// Decisions show a preview dialog and leave the sample records unchanged.

items.forEach((item) => item.addEventListener("click", () => select(item)));
catSelect.addEventListener("change", checkOverride);
prioGroup.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { setPriority(b.dataset.prio); checkOverride(); }));

document.querySelector("#decision").addEventListener("submit", (event) => {
  event.preventDefault();
  const dept = deptSelect.options[deptSelect.selectedIndex].text;
  window.RoadNaUI.preview(`Forwarding ${current.dataset.id} to ${dept} will be available when the service is connected. This incident remains unchanged.`);
});
document.querySelector("#info-btn").addEventListener("click", () => window.RoadNaUI.preview("Information requests will be available when the service is connected. No message has been sent."));
document.querySelector("#merge-btn").addEventListener("click", () => window.RoadNaUI.preview("Duplicate merging will be available when the service is connected. No reports have changed."));
document.querySelector("#reject-btn").addEventListener("click", () => { rejectBox.hidden = !rejectBox.hidden; });
document.querySelector("#reject-confirm").addEventListener("click", () => window.RoadNaUI.preview("Rejection will be available when the service is connected. No report has changed and no message has been sent."));

// Queue filters
const pills = [...document.querySelectorAll(".pill-btn")];
const search = document.querySelector("#queue-search");
const empty = document.querySelector("#queue-empty");
const list = document.querySelector("#queue-list");
let flag = "all";
const filterQueue = () => {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  items.forEach((item) => {
    const ok = (flag === "all" || item.dataset.flag === flag) && (!q || item.textContent.toLowerCase().includes(q));
    item.closest("li").hidden = !ok;
    if (ok) shown += 1;
  });
  list.hidden = shown === 0;
  empty.hidden = shown !== 0;
};
pills.forEach((pill) => pill.addEventListener("click", () => {
  flag = pill.dataset.flag;
  pills.forEach((p) => { const on = p === pill; p.classList.toggle("is-active", on); p.setAttribute("aria-pressed", String(on)); });
  filterQueue();
}));
search.addEventListener("input", filterQueue);
// A query from the top-bar search arrives as ?q=.
const incoming = new URL(window.location.href).searchParams.get("q");
if (incoming) { search.value = incoming; filterQueue(); }
