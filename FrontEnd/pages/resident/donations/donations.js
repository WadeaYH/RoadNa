"use strict";

// Presentation only. Campaigns and gifts are sample data from shared/funding-data.js; no payment is taken.
// ASP.NET will take payments through the municipality's provider, hold them in an earmarked account,
// and run refunds or moves when a campaign falls short.
const F = window.RoadNaFunding;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toastEl = $("toast");
let toastTimer;
const toast = (m) => { toastEl.textContent = m; toastEl.hidden = false; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toastEl.hidden = true; }, 3600); };
const open = () => F.CAMPAIGNS.filter((c) => c.status === "open");
const bar = (c) => {
  const muni = Math.round((c.municipality / c.target) * 100);
  const res = F.pct(c);
  return `<div class="fund-bar" role="img" aria-label="${F.pct(c)}% funded: ${F.money(F.raised(c))} of ${F.money(c.target)}"><span class="fund-bar__res" data-w="${res}"></span><span class="fund-bar__muni" data-w="${muni}"></span></div>`;
};
// widths are set from data attributes, so the markup carries no inline styles
const sizeBars = (root) => root.querySelectorAll("[data-w]").forEach((el) => { el.style.width = `${el.dataset.w}%`; });

function renderOpen() {
  $("camp-list").innerHTML = open().map((c) => `<li class="camp" id="${c.id}">
      <div class="camp__head"><span class="chip chip--assigned">Open for donations</span><span class="mono">${c.id}</span></div>
      <h2 class="camp__title">${esc(c.title)}</h2>
      <p class="camp__why">${esc(c.why)}</p>
      ${bar(c)}
      <div class="fund-legend"><span><i class="k-muni"></i>Municipality ${F.money(c.municipality)}</span><span><i class="k-res"></i>Residents ${F.money(c.residents)}</span><strong>${F.money(F.remaining(c))} still needed</strong></div>
      <p class="camp__meta"><span>${esc(c.place)}</span><span>${c.donors} donors</span><span>${c.daysLeft} days left</span></p>
      <div class="camp__actions"><button class="btn btn--primary" type="button" data-donate="${c.id}">Donate</button><a class="btn btn--outline" href="../../resident/report-details/report-details.html?id=${c.report}">See the report</a></div>
    </li>`).join("");
  $("n-open").textContent = open().length;
  sizeBars($("camp-list"));
}

const MINE_TEXT = {
  held: "Held for this repair until the campaign closes.",
  used: "Spent on the repair. It is done, and you can see the photos on the report.",
  refunded: "Refunded to your card.",
  moved: "Moved to another repair you chose.",
};
function renderMine() {
  $("mine-list").innerHTML = F.MINE.map((m, i) => {
    const c = F.find(m.campaign);
    const choice = m.status === "choose" ? `<div class="mine__choice">
        <p><strong>This campaign fell short and the municipality could not cover the rest.</strong> Choose what happens to your ${F.money(m.amount)}. If you do not choose in ${c.chooseDays} days, it is refunded.</p>
        <label><input type="radio" name="choice-${i}" value="refund" checked> Refund me</label>
        <label><input type="radio" name="choice-${i}" value="move"> Move it to another repair</label>
        <select class="select" data-move="${i}" aria-label="Repair to move your gift to" hidden>${open().map((o) => `<option value="${o.id}">${esc(o.title)} (${F.money(F.remaining(o))} needed)</option>`).join("")}</select>
        <div><button class="btn btn--primary btn--sm" type="button" data-choose="${i}">Confirm my choice</button></div>
      </div>` : `<p>${MINE_TEXT[m.status]}</p>`;
    const chip = { held: ["assigned", "Held"], used: ["resolved", "Used for the repair"], refunded: ["closed", "Refunded"], moved: ["validated", "Moved"], choose: ["progress", "Your choice needed"] }[m.status];
    return `<li class="mine"><div class="mine__top"><span class="mine__amount">${F.money(m.amount)}</span><span class="chip chip--${chip[0]}">${chip[1]}</span></div>
      <p><strong>${esc(c.title)}</strong> · <span class="mono">${c.id}</span> · given ${esc(m.when)}</p>${choice}</li>`;
  }).join("");
  $("n-mine").textContent = F.MINE.length;
}
$("mine-list").addEventListener("change", (e) => {
  if (!e.target.matches('input[type="radio"]')) return;
  const li = e.target.closest(".mine");
  li.querySelector("[data-move]").hidden = e.target.value !== "move";
});
$("mine-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-choose]");
  if (!btn) return;
  const i = Number(btn.dataset.choose); const m = F.MINE[i]; const li = btn.closest(".mine");
  const move = li.querySelector('input[value="move"]').checked;
  if (move) {
    const to = F.find(li.querySelector("[data-move]").value);
    m.status = "moved"; m.campaign = to.id; to.residents += m.amount; to.donors += 1;
    toast(`Moved ${F.money(m.amount)} to “${to.title}” (preview, not saved).`);
  } else { m.status = "refunded"; toast(`Refund of ${F.money(m.amount)} requested (preview, no money moved).`); }
  renderMine(); renderOpen();
});

// Donate
let target = null;
const dialog = $("donate-dialog");
function openDonate(id) {
  target = F.find(id);
  $("donate-for").textContent = `${target.title}. ${F.money(F.remaining(target))} still needed.`;
  $("donate-error").hidden = true; $("donate-cap").hidden = true;
  dialog.showModal();
}
$("camp-list").addEventListener("click", (e) => { const b = e.target.closest("[data-donate]"); if (b) openDonate(b.dataset.donate); });
$("donate-form").addEventListener("change", () => {
  const v = $("donate-form").elements.amount.value;
  $("other-field").hidden = v !== "other";
  const amount = v === "other" ? Number($("other-amount").value) : Number(v);
  const left = F.remaining(target);
  $("donate-cap").hidden = !(amount > left);
  $("donate-cap").textContent = `Only ${F.money(left)} is still needed, so your gift will be ${F.money(left)}. Thank you.`;
});
$("other-amount").addEventListener("input", () => $("donate-form").dispatchEvent(new Event("change")));
$("donate-cancel").addEventListener("click", () => dialog.close());
$("donate-form").addEventListener("submit", (e) => {
  const v = $("donate-form").elements.amount.value;
  let amount = v === "other" ? Number($("other-amount").value) : Number(v);
  if (!(amount >= 1)) { e.preventDefault(); $("donate-error").textContent = "Enter an amount of at least 1 JOD."; $("donate-error").hidden = false; return; }
  amount = Math.min(amount, F.remaining(target));
  target.residents += amount; target.donors += 1;
  F.MINE.unshift({ campaign: target.id, amount, when: "Today", status: "held" });
  const done = F.remaining(target) === 0;
  if (done) target.status = "funded";
  toast(done ? `Thank you. “${target.title}” is now fully funded and goes to the front of the queue (preview).` : `Thank you. ${F.money(amount)} is held for this repair (preview, no payment taken).`);
  renderOpen(); renderMine();
});

// Tabs
const tabs = [$("tab-open"), $("tab-mine")];
const select = (t) => tabs.forEach((b) => { const on = b === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; $(b.getAttribute("aria-controls")).hidden = !on; });
tabs.forEach((t, i) => { t.addEventListener("click", () => select(t)); t.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = tabs[(i + 1) % 2]; select(n); n.focus(); } }); });

renderOpen();
renderMine();
// ?campaign=CF-… from a report page opens that campaign's Donate box; #mine shows the resident's gifts
const params = new URLSearchParams(window.location.search);
if (params.get("campaign") && F.find(params.get("campaign"))?.status === "open") {
  const card = $(params.get("campaign")); card.classList.add("is-target"); card.scrollIntoView({ block: "center" }); openDonate(params.get("campaign"));
}
if (params.get("tab") === "mine") select($("tab-mine"));
