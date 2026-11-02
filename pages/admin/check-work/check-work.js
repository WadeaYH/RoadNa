"use strict";

// Supervisor check of completed work (main flow steps 11–13). Sample data from
// shared/sample-work.js; decisions last only until the page is reloaded.
const W = window.RoadNaWork;
const $ = (id) => document.getElementById(id);
const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clock = () => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date()).toLowerCase();
const orders = W.orders.filter((o) => ["checking", "sent_back", "approved"].includes(o.status));
let tab = "checking";
let current = null;
let suggestion = null;

const toast = (text) => {
  const el = $("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 3600);
};

// Checklist (one generic list for every category).
$("checklist").insertAdjacentHTML("beforeend", W.CHECKLIST.map((text, i) => `<label><input type="checkbox" data-check="${i}"><span>${esc(text)}</span></label>`).join(""));
const boxes = [...document.querySelectorAll("[data-check]")];

function renderList() {
  ["checking", "sent_back", "approved"].forEach((key) => { $(`n-${key}`).textContent = orders.filter((o) => o.status === key).length; });
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
  const list = orders.filter((o) => o.status === tab);
  if (!list.includes(current)) current = list[0] || null;
  $("items").innerHTML = list.map((o) => `<li><button type="button" class="review-item" data-id="${o.id}" aria-current="${o === current}">
      <span class="review-item__top"><span>${o.id}</span><span class="priority priority--${W.PRIORITY[o.priority]}">${o.priority}</span></span>
      <strong>${esc(o.title)}</strong>
      <span class="meta">${esc(o.place)}</span>
      <span class="meta">${o.reopened ? `<b class="reopened-tag">Reopened by the resident</b>` : ""}${o.status === "approved" ? `Approved ${esc(o.approved)}` : o.status === "sent_back" ? `Sent back ${esc(o.sentBack.at)}` : `Submitted ${esc(o.submitted)}`} · ${esc(W.team.name)}</span>
    </button></li>`).join("");
}

const photoList = (list) => list.length
  ? list.map((p, i) => `<div><img src="${esc(p.src)}" alt="Photo ${i + 1} by ${esc(p.by)}" width="320" height="200"><small>${esc(p.by)}, ${esc(p.at)}${p.sample ? " (sample)" : ""}</small></div>`).join("")
  : '<p class="review-why">No photo.</p>';

function renderDetail() {
  $("detail").hidden = !current;
  if (!current) return;
  const o = current;
  const status = W.STATUS[o.status];
  $("d-ids").textContent = `${o.id} · Report ${o.report}`;
  $("d-title").textContent = o.title;
  $("d-meta").textContent = `${o.place} · ${W.team.name}, ${o.priority.toLowerCase()} priority`;
  $("d-status").textContent = status.label;
  $("d-status").className = `chip chip--${status.tone}`;
  $("d-before").innerHTML = photoList(o.before);
  $("d-after").innerHTML = photoList(o.after);
  $("d-reopened").hidden = !o.reopened;
  if (o.reopened) $("d-reopened").textContent = `Reopened by the resident ${o.reopened.by}, ${o.reopened.at}: "${o.reopened.reason}" Check the repair again and send the team back if needed.`;
  $("d-notes").innerHTML = o.notes.length ? o.notes.map((n) => `<li>${esc(n.text)}<small>${esc(n.by)} · ${esc(n.at)}</small></li>`).join("") : "<li>No notes from the team.</li>";

  const waiting = o.status === "checking";
  $("d-decide").hidden = !waiting;
  $("sendback-form").hidden = true;
  $("ai-box").hidden = true;
  boxes.forEach((box) => { box.checked = false; });
  updateApprove();

  $("d-sentback").hidden = o.status !== "sent_back";
  if (o.status === "sent_back") {
    $("d-sentback").innerHTML = `<p><strong>Sent back by ${esc(o.sentBack.by)}, ${esc(o.sentBack.at)}.</strong> ${esc(o.sentBack.reason)}</p>
      <p>AI suggestion: remaining risk ${esc(o.sentBack.ai.risk.toLowerCase())}, priority ${esc(o.sentBack.ai.priority)}. ${esc(o.sentBack.ai.note)}</p>
      <p>Waiting for ${esc(W.team.name)} to finish the rework. It comes back here for another check.</p>`;
  }
  $("d-result").hidden = o.status !== "approved";
  $("d-result").className = "review-result";
  if (o.status === "approved") $("d-result").textContent = `Approved ${o.approved}. Report ${o.report} is closed and archived, and the resident sees “Fixed”.`;
}

function updateApprove() {
  const missing = boxes.filter((box) => !box.checked).length;
  $("approve-btn").setAttribute("aria-disabled", String(missing > 0));
  $("approve-why").textContent = missing ? `Tick all ${boxes.length} checks to approve.` : "";
}

const render = () => { renderList(); renderDetail(); };

// Selecting work orders and tabs.
document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { tab = button.dataset.tab; current = null; render(); }));
$("items").addEventListener("click", (event) => {
  const item = event.target.closest("[data-id]");
  if (!item) return;
  current = W.find(item.dataset.id);
  render();
  $("d-title").focus?.();
});
boxes.forEach((box) => box.addEventListener("change", updateApprove));

// Step 12: approve → report closed and archived.
$("approve-btn").addEventListener("click", () => {
  if ($("approve-btn").getAttribute("aria-disabled") === "true") { toast($("approve-why").textContent); return; }
  const o = current;
  o.status = "approved";
  o.approved = `today, ${clock()}`;
  o.history.push({ at: clock(), by: W.supervisor.name, text: "Approved. Report closed and archived." });
  toast(`${o.id} approved. ${o.report} is closed and the resident sees “Fixed”.`);
  current = null;
  render();
});

// Step 13: send back → AI reassessment (simulated, editable) → rework.
$("sendback-btn").addEventListener("click", () => {
  $("sendback-form").hidden = false;
  $("ai-box").hidden = true;
  $("sb-reason").focus();
});
$("sendback-cancel").addEventListener("click", () => { $("sendback-form").hidden = true; });
$("sendback-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const reason = $("sb-reason").value.trim();
  if (!reason) { $("sb-reason").reportValidity(); return; }
  suggestion = { reason, ...W.reassess(current, reason) };
  $("ai-risk").textContent = suggestion.risk;
  $("ai-priority").textContent = suggestion.priority;
  $("ai-work").textContent = suggestion.work;
  $("ai-note").value = suggestion.note;
  $("sendback-form").hidden = true;
  $("ai-box").hidden = false;
  $("ai-note").focus();
});
$("ai-cancel").addEventListener("click", () => { $("ai-box").hidden = true; $("sendback-form").hidden = false; });
$("sendback-confirm").addEventListener("click", () => {
  const o = current;
  o.status = "sent_back";
  o.priority = suggestion.priority;
  o.sentBack = { by: W.supervisor.name, at: `today, ${clock()}`, reason: suggestion.reason, ai: { risk: suggestion.risk, priority: suggestion.priority, work: suggestion.work, note: $("ai-note").value.trim() || suggestion.note } };
  o.history.push({ at: clock(), by: W.supervisor.name, text: `Sent back for rework: ${suggestion.reason}` });
  $("sb-reason").value = "";
  toast(`${o.id} sent back to ${W.team.name}. It appears at the top of their task list.`);
  current = null;
  render();
});

render();
