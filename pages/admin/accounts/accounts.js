"use strict";

// Presentation only. Staff, teams and departments are sample data (teams come from shared/ops-data.js);
// ASP.NET will load and save the real accounts. Role names match shared/access.js.
const Ops = window.RoadNaOps;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toastEl = Object.assign(document.createElement("p"), { className: "toast", hidden: true });
toastEl.setAttribute("role", "status");
document.body.append(toastEl);
let toastTimer;
const toast = (message) => {
  toastEl.textContent = message;
  toastEl.hidden = false;
  toastEl.style.animation = "none";
  void toastEl.offsetWidth;
  toastEl.style.animation = "";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toastEl.hidden = true; }, 3200);
};

const ROLE_LABELS = { reviewer: "Reviewer", team_member: "Team member", team_leader: "Team leader", supervisor: "Supervisor", manager: "Manager", admin: "Super admin" };
const HANDLES = {
  "Roads Department": "Potholes, pavements, signs and traffic signals",
  "Lighting Division": "Street lights",
  "Sanitation Department": "Litter, glass and waste",
  "Parks Department": "Trees, parks and green areas",
  "Drainage & Water Authority": "Storm drains and flooding",
};

// Office staff, then every crew's leader and members.
const staff = [
  { name: "Dana Qasem", role: "admin", dept: "Municipality office", team: "", active: true },
  { name: "Eng. Sami Al-Zoubi", role: "manager", dept: "Municipality office", team: "", active: true },
  { name: "Hala Bani Yaseen", role: "reviewer", dept: "Municipality office", team: "", active: true },
  { name: "Yazan Al-Rifai", role: "reviewer", dept: "Municipality office", team: "", active: true },
];
const supervisors = new Map();
Ops.TEAMS.forEach((t) => { if (!supervisors.has(t.supervisor)) supervisors.set(t.supervisor, t.dept); });
supervisors.forEach((dept, name) => staff.push({ name, role: "supervisor", dept, team: "", active: true }));
Ops.TEAMS.forEach((t) => {
  staff.push({ name: t.leader, role: "team_leader", dept: t.dept, team: t.name, active: true });
  t.members.forEach((m) => staff.push({ name: m, role: "team_member", dept: t.dept, team: t.name, active: true }));
});

const roleSelect = (value, label) => `<select class="select" aria-label="${esc(label)}">${Object.entries(ROLE_LABELS).map(([k, v]) => `<option value="${k}"${k === value ? " selected" : ""}>${v}</option>`).join("")}</select>`;

function renderStaff() {
  const q = $("staff-search").value.trim().toLowerCase();
  const rows = staff.map((p, i) => ({ p, i })).filter(({ p }) => !q || `${p.name} ${p.team} ${p.dept}`.toLowerCase().includes(q));
  $("staff-rows").innerHTML = rows.map(({ p, i }) => `<tr data-i="${i}" class="${p.active ? "" : "acc-row--off"}">
      <td><strong>${esc(p.name)}</strong>${p.email ? `<small>${esc(p.email)}</small>` : ""}</td>
      <td>${roleSelect(p.role, `Role for ${p.name}`)}</td>
      <td>${esc(p.dept)}</td>
      <td>${p.team ? esc(p.team) : '<span class="t-muted">None</span>'}</td>
      <td><span class="chip ${p.active ? "chip--resolved" : "chip--closed"}">${p.active ? "Active" : "Turned off"}</span></td>
      <td><button class="btn btn--ghost btn--sm" type="button" data-toggle>${p.active ? "Turn off" : "Turn on"}</button></td>
    </tr>`).join("");
  $("staff-empty").hidden = rows.length > 0;
  $("count-staff").textContent = staff.length;
}

$("staff-rows").addEventListener("change", (e) => {
  const row = e.target.closest("tr[data-i]");
  if (!row || !e.target.matches("select")) return;
  const p = staff[row.dataset.i];
  p.role = e.target.value;
  toast(`${p.name} is now ${ROLE_LABELS[p.role].toLowerCase()} (preview, not saved).`);
});
$("staff-rows").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toggle]");
  if (!btn) return;
  const p = staff[btn.closest("tr").dataset.i];
  p.active = !p.active;
  renderStaff();
  toast(`${p.name} ${p.active ? "can sign in again" : "can no longer sign in"} (preview).`);
});
$("staff-search").addEventListener("input", renderStaff);

// Add a staff account
$("add-role").innerHTML = Object.entries(ROLE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
$("add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const err = $("add-error");
  const name = f.name.value.trim(), email = f.email.value.trim();
  const fail = (msg, field) => { err.textContent = msg; err.hidden = false; field.focus(); };
  if (!name) return fail("Write the person's full name.", f.name);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a work email such as name@irbid.gov.jo.", f.email);
  err.hidden = true;
  staff.unshift({ name, email, role: f.role.value, dept: f.dept.value, team: "", active: true });
  f.reset();
  $("staff-search").value = "";
  renderStaff();
  toast(`${name} was added as ${ROLE_LABELS[staff[0].role].toLowerCase()} (preview, no email sent).`);
});

// Teams and departments (editable copies of the sample data)
const teams = Ops.TEAMS.map((t) => ({ name: t.name, dept: t.dept, leader: t.leader, members: [...t.members], supervisor: t.supervisor, plate: t.plate }));
const departments = [...Ops.DEPARTMENTS];
let newTeam = null;
const option = (v, label = v) => `<option value="${esc(v)}">${esc(label)}</option>`;

function renderTeams() {
  $("team-list").innerHTML = teams.map((t, ti) => `<li class="acc-team${t === newTeam ? " acc-team--new" : ""}">
    <h3>${esc(t.name)}</h3>
    <dl><dt>Department</dt><dd>${esc(t.dept)}</dd><dt>Leader</dt><dd>${esc(t.leader)}</dd><dt>Supervisor</dt><dd>${esc(t.supervisor)}</dd><dt>Vehicle</dt><dd>${t.plate ? esc(t.plate) : "Not assigned yet"}</dd></dl>
    <p class="field__label">Members</p>
    <ul class="acc-team__members">${t.members.length ? t.members.map((m) => `<li><span>${esc(m)}</span><select class="select" data-team="${ti}" data-member="${esc(m)}" aria-label="Move ${esc(m)} to another team"><option value="">Move to…</option>${teams.map((o, oi) => oi === ti ? "" : `<option value="${oi}">${esc(o.name)}</option>`).join("")}</select></li>`).join("") : '<li class="t-muted">No members yet</li>'}</ul>
  </li>`).join("");
  $("count-teams").textContent = teams.length;
  // leaders for a new team: anyone in the field who is not leading a team already
  const leading = new Set(teams.map((t) => t.leader));
  $("team-leader").innerHTML = staff.filter((p) => (p.role === "team_member" || p.role === "team_leader") && !leading.has(p.name)).map((p) => option(p.name, `${p.name}${p.team ? ` (${p.team})` : ""}`)).join("");
  $("team-sup").innerHTML = staff.filter((p) => p.role === "supervisor").map((p) => option(p.name)).join("");
}
function renderDepts() {
  $("dept-rows").innerHTML = departments.map((d) => {
    const own = teams.filter((t) => t.dept === d);
    const sups = [...new Set(own.map((t) => t.supervisor))];
    return `<tr><td><strong>${esc(d)}</strong></td><td>${esc(HANDLES[d] || "")}</td><td class="num">${own.length}</td><td>${sups.map(esc).join(", ") || '<span class="t-muted">None yet</span>'}</td></tr>`;
  }).join("");
  $("count-depts").textContent = departments.length;
  $("team-dept").innerHTML = departments.map((d) => option(d)).join("");
  const keep = $("add-dept").value;
  $("add-dept").innerHTML = ["Municipality office", ...departments].map((d) => option(d)).join("");
  if (keep) $("add-dept").value = keep;
}

// Move a member to another team
$("team-list").addEventListener("change", (e) => {
  const sel = e.target.closest("select[data-member]");
  if (!sel || sel.value === "") return;
  const from = teams[sel.dataset.team], to = teams[sel.value], name = sel.dataset.member;
  from.members = from.members.filter((m) => m !== name);
  to.members.push(name);
  const person = staff.find((p) => p.name === name);
  if (person) { person.team = to.name; person.dept = to.dept; }
  renderTeams(); renderStaff();
  toast(`${name} moved from ${from.name} to ${to.name} (preview, not saved).`);
});

// Create a team
$("team-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("team-error");
  const name = $("team-name").value.trim(), leader = $("team-leader").value;
  const fail = (msg, field) => { err.textContent = msg; err.hidden = false; field.focus(); };
  if (!name) return fail("Give the team a name.", $("team-name"));
  if (teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) return fail("A team with that name already exists.", $("team-name"));
  if (!leader) return fail("Pick a leader. Everyone in the field already leads a team.", $("team-leader"));
  err.hidden = true;
  teams.forEach((t) => { t.members = t.members.filter((m) => m !== leader); });
  newTeam = { name, dept: $("team-dept").value, leader, members: [], supervisor: $("team-sup").value, plate: "" };
  teams.push(newTeam);
  const person = staff.find((p) => p.name === leader);
  if (person) { person.role = "team_leader"; person.team = name; person.dept = newTeam.dept; }
  $("team-form").reset();
  renderTeams(); renderDepts(); renderStaff();
  toast(`${name} created with ${leader} as leader (preview, not saved).`);
});

// Add a department
$("dept-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const err = $("dept-error");
  const name = $("dept-name").value.trim(), handles = $("dept-handles").value.trim();
  const fail = (msg, field) => { err.textContent = msg; err.hidden = false; field.focus(); };
  if (!name) return fail("Write the department's name.", $("dept-name"));
  if (departments.some((d) => d.toLowerCase() === name.toLowerCase())) return fail("That department already exists.", $("dept-name"));
  if (!handles) return fail("Say what kind of problems it fixes, so reviewers know when to use it.", $("dept-handles"));
  err.hidden = true;
  departments.push(name);
  HANDLES[name] = handles;
  $("dept-form").reset();
  renderDepts();
  toast(`${name} added (preview, not saved). Create a team for it next.`);
});

renderTeams();
renderDepts();

// Tabs (arrow keys move between them)
const tabs = [...document.querySelectorAll(".acc-tabs [role=tab]")];
const select = (tab) => tabs.forEach((t) => {
  const on = t === tab;
  t.setAttribute("aria-selected", String(on));
  t.tabIndex = on ? 0 : -1;
  $(t.getAttribute("aria-controls")).hidden = !on;
});
tabs.forEach((t, i) => {
  t.addEventListener("click", () => select(t));
  t.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    select(next); next.focus();
  });
});

renderStaff();
