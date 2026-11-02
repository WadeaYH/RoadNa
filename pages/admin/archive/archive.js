"use strict";

// Presentation only. Closed reports are sample data; ASP.NET will search the real archive.
// Dates are days ago (closedAgo), so the sample never looks stale.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const day = (ago) => new Date(Date.now() - ago * 864e5).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

const CLOSED = [
  { id: "RN-2025-0401", title: "Speed limit sign replaced", place: "Emaar Irbid Park", dept: "Roads Department", team: "Roads Crew 6", outcome: "fixed", closedAgo: 0, openDays: 1, rating: null, by: "Eng. Rana Al-Khatib" },
  { id: "RN-2025-0371", title: "Damaged curb ramp rebuilt", place: "Al-Hashemi St, Downtown", dept: "Roads Department", team: "Roads Crew 4", outcome: "fixed", closedAgo: 3, openDays: 10, rating: null, by: "Eng. Rana Al-Khatib" },
  { id: "RN-2025-0344", title: "Blocked storm drain cleared", place: "Emaar Irbid Park", dept: "Drainage & Water Authority", team: "Drainage Crew 3", outcome: "fixed", closedAgo: 45, openDays: 8, rating: 4, by: "Eng. Laila Haddad" },
  { id: "RN-2025-0339", title: "Street light pole leaning", place: "Al-Andalus", dept: "Lighting Division", team: "Lighting Crew 2", outcome: "fixed", closedAgo: 51, openDays: 5, rating: 5, by: "Eng. Hiba Al-Masri" },
  { id: "RN-2025-0318", title: "Litter piling up behind the market", place: "Downtown", dept: "Sanitation Department", team: "Sanitation Crew 1", outcome: "fixed", closedAgo: 63, openDays: 2, rating: 3, by: "Eng. Sami Al-Omari" },
  { id: "RN-2025-0297", title: "Fallen tree on the walking track", place: "King Abdullah II Park", dept: "Parks Department", team: "Parks Crew 1", outcome: "fixed", closedAgo: 70, openDays: 1, rating: 5, by: "Eng. Sami Al-Omari" },
  { id: "RN-2025-0288", title: "Faded crosswalk markings", place: "Al-Hashemi St", dept: "Roads Department", team: "", outcome: "rejected", closedAgo: 61, openDays: 3, reason: "Duplicate of RN-2025-0274, handled there.", by: "Hala Bani Yaseen" },
  { id: "RN-2025-0266", title: "Advertising sign on a private wall", place: "University St", dept: "Roads Department", team: "", outcome: "rejected", closedAgo: 80, openDays: 1, reason: "Private property, not a municipal asset. The resident was told who to contact.", by: "Yazan Al-Rifai" },
  { id: "RN-2025-0251", title: "Discount offer posted as a report", place: "Downtown", dept: "Sanitation Department", team: "", outcome: "rejected", closedAgo: 95, openDays: 0, reason: "Spam.", by: "Hala Bani Yaseen" },
  { id: "RN-2025-0230", title: "Pothole at the roundabout exit", place: "Al-Nuzha", dept: "Roads Department", team: "Roads Crew 4", outcome: "fixed", closedAgo: 120, openDays: 6, rating: 4, by: "Eng. Rana Al-Khatib" },
];

const depts = [...new Set(CLOSED.map((r) => r.dept))].sort();
$("dept").insertAdjacentHTML("beforeend", depts.map((d) => `<option>${esc(d)}</option>`).join(""));

let selected = null;
function filtered() {
  const q = $("q").value.trim().toLowerCase();
  const outcome = $("outcome").value, dept = $("dept").value, period = Number($("period").value) || 0;
  return CLOSED.filter((r) => (!q || `${r.id} ${r.title} ${r.place} ${r.team}`.toLowerCase().includes(q))
    && (!outcome || r.outcome === outcome) && (!dept || r.dept === dept) && (!period || r.closedAgo <= period));
}
function render() {
  const list = filtered();
  $("rows").innerHTML = list.map((r) => `<tr data-id="${r.id}" aria-selected="${r === selected}">
      <td><button class="row-btn" type="button" data-id="${r.id}">${esc(r.title)}</button><small class="mono">${r.id}</small></td>
      <td>${esc(r.place)}</td>
      <td>${esc(r.dept)}<small>${r.team ? esc(r.team) : "No team (closed at review)"}</small></td>
      <td><span class="chip ${r.outcome === "fixed" ? "chip--resolved" : "chip--rejected"}">${r.outcome === "fixed" ? "Fixed" : "Rejected"}</span></td>
      <td>${day(r.closedAgo)}<small>open ${r.openDays} day${r.openDays === 1 ? "" : "s"}</small></td>
      <td>${r.outcome === "rejected" ? "<small>Not rated</small>" : r.rating ? `<span class="num">${r.rating}</span> of 5` : "<small>Not rated yet</small>"}</td>
    </tr>`).join("");
  $("arch-count").textContent = `${list.length} of ${CLOSED.length} closed reports`;
  $("empty").hidden = list.length > 0;
}
function show(r) {
  selected = r;
  $("detail").hidden = false;
  $("detail-title").textContent = `${r.title} (${r.id})`;
  $("detail-sub").textContent = `${r.place} · ${r.dept}`;
  $("detail-chip").className = `chip ${r.outcome === "fixed" ? "chip--resolved" : "chip--rejected"}`;
  $("detail-chip").textContent = r.outcome === "fixed" ? "Fixed" : "Rejected";
  const facts = r.outcome === "fixed"
    ? [["Team", r.team], ["Approved by", r.by], ["Closed", day(r.closedAgo)], ["Time to fix", `${r.openDays} day${r.openDays === 1 ? "" : "s"}`], ["Resident rating", r.rating ? `${r.rating} of 5` : "Not rated yet"]]
    : [["Rejected by", r.by], ["Closed", day(r.closedAgo)], ["Reason shown to the resident", r.reason]];
  $("detail-facts").innerHTML = facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  const opened = day(r.closedAgo + r.openDays);
  $("detail-history").innerHTML = (r.outcome === "fixed"
    ? [[opened, "Report received from a resident."], [opened, `Assigned to ${r.team}.`], [day(r.closedAgo), `Work approved by ${r.by}. Report closed and archived.`]]
    : [[opened, "Report received from a resident."], [day(r.closedAgo), `Rejected at review by ${r.by}: ${r.reason}`]])
    .map(([when, text]) => `<li>${esc(text)}<small>${when}</small></li>`).join("");
  render();
  $("detail").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
}
$("rows").addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-id]");
  if (row) show(CLOSED.find((r) => r.id === row.dataset.id));
});
["q", "outcome", "dept", "period"].forEach((id) => $(id).addEventListener(id === "q" ? "input" : "change", render));
$("clear").addEventListener("click", () => { ["q", "outcome", "dept", "period"].forEach((id) => { $(id).value = ""; }); render(); $("q").focus(); });
render();
