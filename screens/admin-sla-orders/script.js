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

document.querySelectorAll("[data-escalate]").forEach((button) => {
  button.addEventListener("click", () => {
    const row = button.closest("tr");
    const id = row.querySelector(".mono").textContent.split(" · ")[0];
    window.RoadNaUI.preview(`Escalation for ${id} will be available when the service is connected. No work order has changed.`);
  });
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
