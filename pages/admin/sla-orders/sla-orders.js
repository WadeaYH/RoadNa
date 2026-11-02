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
