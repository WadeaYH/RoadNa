"use strict";

// Presentation only. Filters, escalation and target editing change what is shown on this page;
// ASP.NET will own SLA rules, escalation notices and the work-order records.
const rows = [...document.querySelectorAll("#orders tbody tr")];
const tabs = [...document.querySelectorAll(".tab")];
const search = document.querySelector("#orders-search");
const wrap = document.querySelector("#orders-wrap");
const empty = document.querySelector("#orders-empty");
const toast = document.querySelector("#toast");
let filter = "all";
let toastTimer = null;

const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  toast.style.animation = "none";
  void toast.offsetWidth;
  toast.style.animation = "";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
};

const apply = () => {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  rows.forEach((row) => {
    const ok = (filter === "all" || row.dataset.sla === filter) && (!q || row.textContent.toLowerCase().includes(q));
    row.classList.toggle("is-hidden", !ok);
    if (ok) shown += 1;
  });
  wrap.hidden = shown === 0;
  empty.hidden = shown !== 0;
};

tabs.forEach((tab) => tab.addEventListener("click", () => {
  filter = tab.dataset.filter;
  tabs.forEach((t) => { const on = t === tab; t.classList.toggle("is-active", on); t.setAttribute("aria-pressed", String(on)); });
  apply();
}));
search.addEventListener("input", apply);

// Escalate: a supervisor sends an order to the manager with a reason. It shows on the manager's
// Dashboard under "Escalated to you" (passed in the link, since the preview stores nothing).
const MANAGER = "Eng. Sami Al-Zoubi";
const escDialog = document.querySelector("#esc-dialog");
const escReason = document.querySelector("#esc-reason");
let escRow = null;
if (window.RoadNaAccess?.role === "manager") {
  // escalations come to the manager, so the manager has nothing to escalate to
  document.querySelectorAll("[data-escalate]").forEach((b) => { b.hidden = true; });
}
document.querySelectorAll("[data-escalate]").forEach((button) => {
  button.addEventListener("click", () => {
    escRow = button.closest("tr");
    const title = escRow.querySelector("strong").textContent;
    document.querySelector("#esc-about").textContent = `${title} goes to ${MANAGER}, the manager, with your reason. They can move a crew or extend the deadline.`;
    escReason.value = "";
    escDialog.showModal();
    escReason.focus();
  });
});
document.querySelector("#esc-cancel").addEventListener("click", () => escDialog.close());
document.querySelector("#esc-form").addEventListener("submit", (event) => {
  const reason = escReason.value.trim();
  if (!reason) { event.preventDefault(); escReason.focus(); return; }
  const [order] = escRow.querySelector(".mono").textContent.split(" · ");
  const title = escRow.querySelector("strong").textContent;
  escRow.querySelector("[data-escalate]").closest("td").innerHTML = '<span class="chip chip--escalated">Escalated</span>';
  const who = document.querySelector(".role-chip strong")?.textContent || "A supervisor";
  const query = new URLSearchParams({ escalated: order, title, reason, by: who });
  document.querySelector("#esc-done-text").textContent = `${order} was escalated to ${MANAGER} (preview, not saved).`;
  document.querySelector("#esc-done-link").href = `../../admin/dashboard/dashboard.html?${query}#escalated`;
  document.querySelector("#esc-done-link").hidden = false;
  document.querySelector("#esc-done").hidden = false;
});

// Edit / save SLA targets (display only)
const editButton = document.querySelector("#edit-targets");
const inputs = [...document.querySelectorAll("#targets-form .input")];
let editing = false;
editButton.addEventListener("click", () => {
  editing = !editing;
  inputs.forEach((input) => { input.readOnly = !editing; });
  editButton.querySelector("span").textContent = editing ? "Save" : "Edit";
  if (editing) inputs[0].focus(); else showToast("Target editing preview only. No service rules have been saved.");
});

// Reassign: the team is unavailable, or the job needs another team. The new team gets it at once.
const TEAMS = ["Roads Crew 2", "Roads Crew 4", "Roads Crew 6", "Lighting Crew 2", "Sanitation Crew 1", "Parks Crew 1", "Drainage Crew 3"];
const deptOf = (team) => team.split(" ")[0];
const reDialog = document.querySelector("#reassign-dialog");
let reRow = null;
document.querySelectorAll("[data-reassign]").forEach((button) => {
  button.addEventListener("click", () => {
    reRow = button.closest("tr");
    const now = reRow.children[2].textContent.trim();
    document.querySelector("#reassign-about").textContent = `${reRow.querySelector("strong").textContent} is with ${now}. The new team sees it at the top of its list.`;
    // Teams of the same department come first; another department is still possible (for example, a crane job)
    const others = TEAMS.filter((t) => t !== now);
    const same = others.filter((t) => deptOf(t) === deptOf(now)), rest = others.filter((t) => deptOf(t) !== deptOf(now));
    const group = (label, list) => (list.length ? `<optgroup label="${label}">${list.map((t) => `<option>${t}</option>`).join("")}</optgroup>` : "");
    document.querySelector("#reassign-team").innerHTML = group("Same department", same) + group("Other departments", rest);
    reDialog.showModal();
  });
});
document.querySelector("#reassign-cancel").addEventListener("click", () => reDialog.close());
document.querySelector("#reassign-form").addEventListener("submit", () => {
  const to = document.querySelector("#reassign-team").value;
  const from = reRow.children[2].textContent.trim();
  reRow.children[2].textContent = to;
  document.querySelector("#esc-done-text").textContent = `${reRow.querySelector(".mono").textContent.split(" · ")[0]} moved from ${from} to ${to}: ${document.querySelector("#reassign-why").value.toLowerCase()} (preview).`;
  document.querySelector("#esc-done-link").hidden = true;
  document.querySelector("#esc-done").hidden = false;
});
