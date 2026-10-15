"use strict";

// Presentation only. This page shows the municipal review step and team assignment on the sample
// reports in this page: confirming gives a report to a free team (residents then see In progress),
// or puts it on the "Waiting for a team" list when no team in that department is free. Nothing is
// saved. ASP.NET will store decisions, team availability and notify residents.
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
const form = document.querySelector("#decision");
const result = document.querySelector("#d-result");
const confirmBtn = document.querySelector("#confirm-btn");
const teamOptions = document.querySelector("#team-options");
const teamNote = document.querySelector("#team-note");
const teamsList = document.querySelector("#teams-list");
const toast = document.querySelector("#toast");
const search = document.querySelector("#queue-search");
const empty = document.querySelector("#queue-empty");
const list = document.querySelector("#queue-list");
const tabs = [...document.querySelectorAll(".pill-btn")];

const CAT_LABEL = { roads: "Roads & Hazards", light: "Street Lighting", sanitation: "Sanitation & Debris", parks: "Parks & Public Trees", water: "Water Main & Drainage", sidewalk: "Sidewalks & Signs" };
const PRIO_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const CAT_DEPT = { roads: "roads", light: "lighting", sanitation: "sanitation", parks: "parks", water: "drainage", sidewalk: "roads" };
const DEPT_LABEL = { roads: "Roads Department", lighting: "Lighting Division", sanitation: "Sanitation Department", parks: "Parks Department", drainage: "Drainage & Water Authority" };
const teams = [
  { id: "roads-4", name: "Roads Crew 4", dept: "roads", task: "RN-2025-0412" },
  { id: "roads-6", name: "Roads Crew 6", dept: "roads", task: null },
  { id: "light-2", name: "Lighting Crew 2", dept: "lighting", task: "RN-2025-0409" },
  { id: "san-1", name: "Sanitation Crew 1", dept: "sanitation", task: null },
  { id: "parks-1", name: "Parks Crew 1", dept: "parks", task: "RN-2025-0390" },
  { id: "drain-3", name: "Drainage Crew 3", dept: "drainage", task: "RN-2025-0388" },
];
let assignedToday = 5;
let tab = "review";
let current = items[0];
let toastTimer = null;
items.forEach((item) => { item.dataset.status = "review"; });

const html = (value) => { const t = document.createElement("textarea"); t.innerHTML = value; return t.value; };
const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  toast.style.animation = "none";
  void toast.offsetWidth;
  toast.style.animation = "";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4200);
};
const setPriority = (value) => prioGroup.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.prio === value)));
const currentPriority = () => prioGroup.querySelector('[aria-pressed="true"]')?.dataset.prio;
const freeTeams = (dept) => teams.filter((t) => t.dept === dept && !t.task);
const countStatus = (status) => items.filter((i) => i.dataset.status === status).length;

// ----- Lists, counts and the teams board -----
const renderCounts = () => {
  document.querySelector("#n-review").textContent = String(countStatus("review"));
  document.querySelector("#n-waiting").textContent = String(countStatus("waiting"));
  document.querySelector("#stat-review").textContent = String(countStatus("review"));
  document.querySelector("#stat-waiting").textContent = String(countStatus("waiting"));
  document.querySelector("#stat-assigned").textContent = String(assignedToday);
  const badge = document.querySelector('.sidebar .nav-item[href*="admin-incident-triage"] .nav-item__badge');
  if (badge) badge.textContent = String(countStatus("review"));
};
const renderReadyBadges = () => {
  items.forEach((item) => {
    const tags = item.querySelector(".q-item__tags");
    let ready = tags.querySelector(".q-item__ready");
    const show = item.dataset.status === "waiting" && freeTeams(item.dataset.dept).length > 0;
    if (show && !ready) {
      ready = document.createElement("span");
      ready.className = "chip chip--resolved chip--plain q-item__ready";
      ready.textContent = "Team free";
      tags.append(ready);
    }
    if (!show && ready) ready.remove();
  });
};
const lastTeamState = new Map();
const renderTeams = () => {
  teamsList.textContent = "";
  teams.forEach((team) => {
    const li = document.createElement("li");
    li.className = "team-row";
    const state = team.task || "";
    if (lastTeamState.has(team.id) && lastTeamState.get(team.id) !== state) li.classList.add("flash");
    lastTeamState.set(team.id, state);
    const name = document.createElement("span");
    name.className = "team-row__name";
    const strong = document.createElement("strong");
    strong.textContent = team.name;
    const small = document.createElement("small");
    small.textContent = team.task ? `Working on ${team.task}` : DEPT_LABEL[team.dept];
    name.append(strong, small);
    const chip = document.createElement("span");
    chip.className = `chip chip--bordered ${team.task ? "chip--progress" : "chip--resolved"}`;
    chip.textContent = team.task ? "Busy" : "Free";
    li.append(name, chip);
    if (team.task) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--outline btn--sm";
      btn.textContent = "Mark free";
      btn.setAttribute("aria-label", `Mark ${team.name} free`);
      btn.addEventListener("click", () => {
        team.task = null;
        const waiting = items.filter((i) => i.dataset.status === "waiting" && i.dataset.dept === team.dept).length;
        showToast(waiting ? `${team.name} is free. ${waiting} report${waiting > 1 ? "s are" : " is"} waiting for a ${DEPT_LABEL[team.dept]} team.` : `${team.name} is free.`);
        renderAll();
      });
      li.append(btn);
    }
    teamsList.append(li);
  });
};
const wasShown = new Set();
const filterList = () => {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  items.forEach((item) => {
    const ok = item.dataset.status === tab && (!q || item.textContent.toLowerCase().includes(q));
    const li = item.closest("li");
    li.hidden = !ok;
    if (ok && !wasShown.has(item) && wasShown.size) {
      li.classList.remove("slide-in");
      void li.offsetWidth;
      li.classList.add("slide-in");
    }
    ok ? wasShown.add(item) : wasShown.delete(item);
    if (ok) shown += 1;
  });
  list.hidden = shown === 0;
  empty.hidden = shown !== 0;
  document.querySelector("#empty-title").textContent = tab === "waiting" ? "No reports are waiting" : "Nothing to review";
  document.querySelector("#empty-text").textContent = tab === "waiting" ? "Reports that need a team and have none free will wait here." : "New reports appear here as soon as residents submit them.";
};
const renderAll = () => { renderCounts(); renderReadyBadges(); renderTeams(); filterList(); renderTeamOptions(); };

// ----- Team options for the selected report -----
const renderTeamOptions = () => {
  const dept = deptSelect.value;
  const list = teams.filter((t) => t.dept === dept);
  teamOptions.textContent = "";
  const free = list.filter((t) => !t.task);
  list.forEach((team) => {
    const label = document.createElement("label");
    label.className = "team-opt";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "team";
    input.value = team.id;
    input.disabled = Boolean(team.task);
    if (!team.task && team === free[0]) input.checked = true;
    const box = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = team.name;
    const small = document.createElement("small");
    small.textContent = team.task ? `Busy with ${team.task}` : "Free now";
    box.append(strong, small);
    label.append(input, box);
    teamOptions.append(label);
  });
  const waiting = current.dataset.status === "waiting";
  if (free.length) {
    teamNote.hidden = true;
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm & assign team";
  } else {
    teamNote.hidden = false;
    teamNote.textContent = `No ${DEPT_LABEL[dept]} team is free right now. ${waiting ? "This report stays on the waiting list until one is free." : "Confirming puts the report on the Waiting for a team list."}`;
    confirmBtn.disabled = waiting;
    confirmBtn.textContent = waiting ? "Waiting for a team" : "Confirm & add to waiting list";
  }
};

// ----- Selecting a report -----
const select = (item) => {
  current = item;
  items.forEach((i) => { i.classList.toggle("is-selected", i === item); i.setAttribute("aria-pressed", String(i === item)); });
  const d = item.dataset;
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
  overrideNote.hidden = true;
  rejectBox.hidden = true;
  const status = d.status;
  const done = status === "assigned" || status === "rejected";
  form.hidden = done;
  result.hidden = !done;
  if (status === "review") { detail.state.className = "chip chip--submitted"; detail.state.textContent = "To review"; }
  if (status === "waiting") { detail.state.className = "chip chip--progress"; detail.state.textContent = "Waiting for a team"; }
  if (status === "assigned") { detail.state.className = "chip chip--assigned"; detail.state.textContent = `Assigned to ${d.team}`; result.textContent = `Given to ${d.team}. The team has the task, and the resident now sees In progress.`; }
  if (status === "rejected") { detail.state.className = "chip chip--rejected"; detail.state.textContent = "Rejected"; result.textContent = `Rejected: ${d.reason}. The resident sees Rejected with this reason.`; }
  renderTeamOptions();
};
const selectNext = () => {
  const next = items.find((i) => i.dataset.status === tab && !i.closest("li").hidden);
  if (next) select(next);
};

items.forEach((item) => item.addEventListener("click", () => select(item)));
const checkOverride = () => { overrideNote.hidden = catSelect.value === current.dataset.cat && currentPriority() === current.dataset.prio; };
catSelect.addEventListener("change", () => { deptSelect.value = CAT_DEPT[catSelect.value]; renderTeamOptions(); checkOverride(); });
deptSelect.addEventListener("change", renderTeamOptions);
prioGroup.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { setPriority(b.dataset.prio); checkOverride(); }));

// ----- Decisions -----
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const picked = form.querySelector('input[name="team"]:checked');
  const team = picked && teams.find((t) => t.id === picked.value);
  if (team && !team.task) {
    team.task = current.dataset.id;
    current.dataset.status = "assigned";
    current.dataset.team = team.name;
    assignedToday += 1;
    showToast(`${current.dataset.id} given to ${team.name}. The resident now sees In progress.`);
  } else if (current.dataset.status === "review") {
    current.dataset.status = "waiting";
    showToast(`${current.dataset.id} is on the Waiting for a team list. The resident still sees Received.`);
  } else {
    showToast("No team is free yet.");
    return;
  }
  current.dataset.cat = catSelect.value;
  current.dataset.dept = deptSelect.value;
  current.dataset.prio = currentPriority();
  const priority = current.querySelector(".q-item__tags .priority");
  priority.className = `priority priority--${current.dataset.prio}`;
  priority.textContent = PRIO_LABEL[current.dataset.prio];
  renderAll();
  const status = current.dataset.status;
  if (status === "waiting" || status === "assigned") { select(current); selectNext(); }
});
document.querySelector("#reject-btn").addEventListener("click", () => { rejectBox.hidden = !rejectBox.hidden; });
document.querySelector("#reject-confirm").addEventListener("click", () => {
  const reason = document.querySelector("#reject-reason").value;
  current.dataset.status = "rejected";
  current.dataset.reason = reason.charAt(0).toLowerCase() + reason.slice(1);
  showToast(`${current.dataset.id} rejected. The resident sees the reason.`);
  renderAll();
  select(current);
  selectNext();
});

// ----- Tabs and search -----
tabs.forEach((button) => button.addEventListener("click", () => {
  tab = button.dataset.tab;
  tabs.forEach((b) => { const on = b === button; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
  filterList();
  selectNext();
}));
search.addEventListener("input", filterList);
// A query from the top-bar search arrives as ?q=.
const incoming = new URL(window.location.href).searchParams.get("q");
if (incoming) search.value = incoming;

renderAll();
select(current);
