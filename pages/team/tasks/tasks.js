"use strict";

// My Tasks for Roads Crew 4. Sample data from shared/sample-work.js; nothing is saved.
const W = window.RoadNaWork;
const params = new URLSearchParams(window.location.search);
const signedIn = window.RoadNaAccess?.role;
const role = params.get("as") ? (params.get("as") === "member" ? "member" : "leader") : signedIn === "team_member" ? "member" : "leader";
if (signedIn) document.getElementById("role-switch")?.setAttribute("hidden", "");
const person = role === "leader" ? W.team.leader : W.team.member;

document.getElementById("role-name").textContent = role === "leader" ? "Team leader" : "Team member";
document.getElementById("role-switch").href = `?as=${role === "leader" ? "member" : "leader"}`;
document.getElementById("role-switch").setAttribute("aria-label", `Preview role: ${role === "leader" ? "team leader" : "team member"}. Switch role`);
document.getElementById("team-org").textContent = `${W.team.name} · ${W.municipality}`;
document.getElementById("team-who").textContent = `${person.name}, ${role === "leader" ? "team leader" : "team member"} · ${W.team.vehicle}`;

const RANK = { High: 0, Normal: 1, Low: 2 };
const icon = (id, size = 14) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Sample distance and drive time from the team's depot (straight line plus a road factor).
const DEPOT = [32.5547, 35.8566];
const km = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)) * 1.3;
};
const away = (order) => { const d = km(DEPOT, [order.lat, order.lng]); return `${d.toFixed(1)} km · about ${Math.max(3, Math.round(d * 2.6))} min from the depot`; };
const maps = (order) => `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}&travelmode=driving`;

const card = (order, index, list) => {
  const status = W.STATUS[order.status];
  const alert = order.status === "sent_back";
  const when = order.status === "checking" ? `Sent ${order.submitted}` : order.status === "approved" ? `Approved ${order.approved}` : `Due ${order.due}`;
  const nextUp = list === groups.todo && index === 0 && order.status !== "in_progress";
  const route = ["assigned", "on_way", "sent_back"].includes(order.status);
  return `<li${nextUp ? ' class="is-next"' : ""}><a class="task-card${alert ? " task-card--alert" : ""}" href="../../team/task/task.html?wo=${order.id}&amp;as=${role}">
    <span class="task-card__top">${nextUp ? '<span class="next-tag">Next up</span>' : ""}<span class="priority priority--${W.PRIORITY[order.priority]}">${order.priority}</span><span class="chip chip--${status.tone}">${status.label}</span></span>
    <strong class="task-card__title">${esc(order.title)}</strong>
    ${alert ? `<span class="task-card__alert">${icon("i-alert")}${esc(order.sentBack.reason)}</span>` : ""}
    <span class="task-card__meta">${icon("i-place")}${esc(order.place)}</span>
    <span class="task-card__meta">${icon("i-schedule")}${esc(when)} · ${order.id}</span>
    ${route ? `<span class="task-card__meta task-card__away">${icon("i-place")}${esc(away(order))}</span>` : ""}
    <span class="task-card__go">${icon("i-chevron-right", 18)}</span>
  </a>${route ? `<a class="task-card__directions" href="${maps(order)}" target="_blank" rel="noopener" aria-label="Directions to ${esc(order.title)}">Directions</a>` : ""}</li>`;
};

const groups = {
  todo: W.orders.filter((o) => ["sent_back", "assigned", "on_way", "arrived", "in_progress"].includes(o.status))
    .sort((a, b) => (a.status === "sent_back" ? -1 : 0) - (b.status === "sent_back" ? -1 : 0) || RANK[a.priority] - RANK[b.priority]),
  checking: W.orders.filter((o) => o.status === "checking"),
  done: W.orders.filter((o) => o.status === "approved"),
};
const empty = { todo: "No open tasks. New jobs appear here as soon as they are assigned.", checking: "Nothing is waiting for a check.", done: "No approved jobs yet." };
Object.entries(groups).forEach(([key, list]) => {
  document.getElementById(key).innerHTML = list.length ? list.map((o, i) => card(o, i, list)).join("") : `<li class="empty-line">${empty[key]}</li>`;
});

const count = (statuses) => W.orders.filter((o) => statuses.includes(o.status)).length;
const summary = [
  [count(["assigned"]), "New"],
  [count(["on_way", "arrived", "in_progress"]), "In progress"],
  [count(["sent_back"]), "Sent back", true],
  [count(["checking"]), "Waiting for check"],
];
document.getElementById("summary").innerHTML = summary.map(([n, label, alert]) => `<li${alert && n ? ' class="is-alert"' : ""}><strong>${n}</strong><span>${label}</span></li>`).join("");

document.getElementById("checking-sub").textContent = groups.checking.length
  ? `${W.supervisor.name} checks the before and after photos. You will see the result here, and your team is free for the next job once it is approved.`
  : "";
