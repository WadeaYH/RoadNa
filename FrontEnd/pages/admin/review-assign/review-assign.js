"use strict";

// Presentation only. This page shows the municipal review step and team assignment on the sample
// reports in this page: confirming gives a report to a free team (residents then see In progress),
// or puts it on the "Waiting for a team" list when no team in that department is free. Nothing is
// saved. ASP.NET will store decisions, team availability and notify residents.
const items = [...document.querySelectorAll(".q-item")];
const ME = document.querySelector(".role-chip strong")?.textContent || "Reviewer";
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
// Most reports start in review; the samples also show one funded, one returned by a team and one waiting for funding.
items.forEach((item) => { item.dataset.status = item.dataset.start || "review"; });

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
  ["funded", "returned", "funding"].forEach((k) => { document.querySelector(`#n-${k}`).textContent = String(countStatus(k)); });
  document.querySelector("#stat-review").textContent = String(countStatus("review"));
  document.querySelector("#stat-waiting").textContent = String(countStatus("waiting"));
  document.querySelector("#stat-assigned").textContent = String(assignedToday);
  const badge = document.querySelector('.sidebar .nav-item[href*="admin/review-assign"] .nav-item__badge');
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
      btn.dataset.action = "";
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
  const EMPTY = {
    review: ["Nothing to review", "New reports appear here as soon as residents submit them."],
    waiting: ["No reports are waiting", "Reports that need a team and have none free will wait here."],
    funded: ["Nothing funded yet", "When residents fully fund a repair, it appears here first, with priority."],
    returned: ["No returned jobs", "When a team cannot finish a job, it comes back here with their reason."],
    funding: ["No funding requests", "Reports you send for funding wait here while the manager decides."],
  }[tab];
  document.querySelector("#empty-title").textContent = EMPTY[0];
  document.querySelector("#empty-text").textContent = EMPTY[1];
};
// ----- Banner: a free team and reports of its department waiting for one -----
const banner = document.querySelector("#free-banner");
let bannerMatch = null;
const renderBanner = () => {
  bannerMatch = null;
  for (const team of teams) {
    if (team.task) continue;
    const waiting = items.filter((i) => i.dataset.status === "waiting" && i.dataset.dept === team.dept);
    if (waiting.length) { bannerMatch = { team, waiting }; break; }
  }
  banner.hidden = !bannerMatch;
  if (!bannerMatch) return;
  const { team, waiting } = bannerMatch;
  document.querySelector("#free-text").textContent = `${team.name} is free. ${waiting.length} ${DEPT_LABEL[team.dept]} report${waiting.length > 1 ? "s are" : " is"} waiting for a team.`;
  const bell = document.querySelector(".sidebar__bell");
  if (bell) bell.setAttribute("aria-label", `${countStatus("review")} reports to review, and a free team for waiting reports`);
};
document.querySelector("#free-go").addEventListener("click", () => {
  if (!bannerMatch) return;
  const first = bannerMatch.waiting[0];
  document.querySelector('.pill-btn[data-tab="waiting"]').click();
  select(first);
  first.scrollIntoView({ block: "nearest" });
  document.querySelector("#confirm-btn")?.focus();
});
// ----- Emergency fast lane: a critical report waiting for review -----
const emergency = document.querySelector("#emergency-banner");
const renderEmergency = () => {
  const urgent = items.find((i) => i.dataset.prio === "critical" && i.dataset.status === "review");
  emergency.hidden = !urgent;
  if (urgent) document.querySelector("#emergency-text").textContent = `Emergency: ${html(urgent.dataset.title)}. Critical reports can take a busy team, which pauses its current job.`;
  emergency.dataset.id = urgent ? urgent.dataset.id : "";
};
document.querySelector("#emergency-go").addEventListener("click", () => {
  const urgent = items.find((i) => i.dataset.id === emergency.dataset.id);
  if (!urgent) return;
  document.querySelector('.pill-btn[data-tab="review"]').click();
  select(urgent);
  urgent.scrollIntoView({ block: "nearest" });
});
const renderAll = () => { renderCounts(); renderReadyBadges(); renderTeams(); filterList(); renderTeamOptions(); renderBanner(); renderEmergency(); };

// ----- Team options for the selected report -----
const renderTeamOptions = () => {
  const dept = deptSelect.value;
  const list = teams.filter((t) => t.dept === dept);
  teamOptions.textContent = "";
  const free = list.filter((t) => !t.task);
  const urgent = currentPriority() === "critical";
  list.forEach((team) => {
    const label = document.createElement("label");
    label.className = "team-opt";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "team";
    input.value = team.id;
    input.disabled = Boolean(team.task) && !urgent;
    if (!team.task && team === free[0]) input.checked = true;
    const box = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = team.name;
    const small = document.createElement("small");
    small.textContent = team.task ? (urgent ? `Busy with ${team.task}: pull it for this emergency` : `Busy with ${team.task}`) : "Free now";
    box.append(strong, small);
    label.append(input, box);
    teamOptions.append(label);
  });
  const waiting = current.dataset.status === "waiting";
  if (urgent && !free.length && list.length) {
    teamNote.hidden = false;
    teamNote.textContent = "Emergency: no team is free, so you can pull a busy team. Its current job goes back to the waiting list.";
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Assign now (emergency)";
  } else if (free.length) {
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
  const done = ["assigned", "rejected", "merged", "funding"].includes(status);
  form.hidden = done;
  result.hidden = !done && !["funded", "returned"].includes(status);
  document.querySelector("#fund-box").hidden = true;
  const critical = d.prio === "critical";
  const fundBtn = document.querySelector("#fund-btn");
  fundBtn.hidden = status === "funded";
  fundBtn.disabled = critical;
  fundBtn.title = critical ? "Critical repairs are paid from the budget, never from donations." : "";
  if (status === "review") { detail.state.className = "chip chip--submitted"; detail.state.textContent = "To review"; }
  if (status === "waiting") { detail.state.className = "chip chip--progress"; detail.state.textContent = "Waiting for a team"; }
  if (status === "assigned") { detail.state.className = "chip chip--assigned"; detail.state.textContent = `Assigned to ${d.team}`; result.textContent = `Given to ${d.team}. The team has the task, and the resident now sees In progress.`; }
  if (status === "funded") { detail.state.className = "chip chip--resolved"; detail.state.textContent = "Funded · priority"; result.textContent = `${d.funded}. Residents paid for this repair, so give it to a team before new reports.`; }
  if (status === "returned") { detail.state.className = "chip chip--reopened"; detail.state.textContent = "Returned by a team"; result.textContent = `Returned by ${d.returned} Give it to another team or department, or request funding.`; }
  if (status === "funding") { detail.state.className = "chip chip--submitted"; detail.state.textContent = "Needs funding"; result.innerHTML = ""; result.append(`Funding requested: ${d.funding}. The manager decides on the `, Object.assign(document.createElement("a"), { href: "../../admin/funding/funding.html", textContent: "Funding page" }), ". Residents still see Received."); }
  if (status === "merged") { detail.state.className = "chip chip--duplicate"; detail.state.textContent = "Merged"; result.textContent = `Merged into ${d.mergedInto}. The resident now follows that report and gets its updates. Their vote counts there.`; }
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
  if (team && team.task && currentPriority() === "critical") {
    const paused = team.task;
    team.task = current.dataset.id;
    current.dataset.status = "assigned";
    current.dataset.team = team.name;
    assignedToday += 1;
    showToast(`Emergency: ${team.name} pulled from ${paused}. ${paused} goes back to the waiting list. The supervisor is told.`);
  } else if (team && !team.task) {
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

// ----- Merge a duplicate into the earlier report -----
document.querySelector("#merge-btn").addEventListener("click", () => {
  const target = (current.dataset.dup.match(/RN-\d{4}-\d{4}/) || [""])[0];
  current.dataset.status = "merged";
  current.dataset.mergedInto = target;
  showToast(`${current.dataset.id} merged into ${target}. The resident follows that report now.`);
  renderAll();
  select(current);
  selectNext();
});

// ----- No budget: request funding (never for critical repairs) -----
document.querySelector("#fund-btn").addEventListener("click", () => {
  const box = document.querySelector("#fund-box");
  box.hidden = !box.hidden;
  if (!box.hidden) document.querySelector("#fund-estimate").focus();
});
document.querySelector("#fund-confirm").addEventListener("click", () => {
  const estimate = Number(document.querySelector("#fund-estimate").value);
  if (!(estimate > 0)) { document.querySelector("#fund-estimate").focus(); showToast("Add a cost estimate first."); return; }
  current.dataset.status = "funding";
  current.dataset.funding = `${estimate.toLocaleString("en")} JOD requested by ${ME} today`;
  showToast(`${current.dataset.id} sent to the manager for funding. Residents still see Received.`);
  renderAll();
  select(current);
  selectNext();
});

// ----- Staff add a report (found on site, or work from a community vote) -----
const addDialog = document.querySelector("#add-dialog");
const openAdd = (what = "") => { document.querySelector("#add-what").value = what; document.querySelector("#add-where").value = ""; document.querySelector("#add-error").hidden = true; addDialog.showModal(); };
document.querySelector("#add-btn").addEventListener("click", () => openAdd());
document.querySelector("#add-cancel").addEventListener("click", () => addDialog.close());
document.querySelector("#add-form").addEventListener("submit", (event) => {
  const what = document.querySelector("#add-what").value.trim();
  const where = document.querySelector("#add-where").value.trim();
  if (!what || !where) { event.preventDefault(); const err = document.querySelector("#add-error"); err.textContent = "Say what is wrong and where."; err.hidden = false; return; }
  const cat = document.querySelector("#add-cat").value;
  const id = `RN-2025-${String(432 + items.length).padStart(4, "0")}`;
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "q-item"; btn.setAttribute("aria-pressed", "false");
  Object.assign(btn.dataset, { status: "review", flag: "", id, title: what, desc: what, place: where, time: "Just now", reporter: `Staff report: ${ME}`, cat, conf: "100", prio: "medium", dept: CAT_DEPT[cat], dup: "", spam: "0", icon: { roads: "road", light: "light", sanitation: "trash", parks: "tree", water: "water", sidewalk: "walk" }[cat] });
  btn.innerHTML = `<span class="q-item__stripe q-item__stripe--medium"></span><span class="q-item__main"><strong></strong><span class="q-item__meta"><span class="mono">${id}</span><span></span><span>Just now</span></span></span><span class="q-item__tags"><span class="chip chip--validated chip--plain">Staff report</span><span class="priority priority--medium">Medium</span></span>`;
  btn.querySelector("strong").textContent = what;
  btn.querySelector(".q-item__meta span:nth-child(2)").textContent = where;
  li.append(btn);
  list.prepend(li);
  items.push(btn);
  btn.addEventListener("click", () => select(btn));
  document.querySelector('.pill-btn[data-tab="review"]').click();
  renderAll();
  select(btn);
  showToast(`${id} added to the queue as a staff report.`);
});
// Work from a community vote arrives as ?add=<what to do>
const fromVote = new URL(window.location.href).searchParams.get("add");
if (fromVote) openAdd(fromVote);
