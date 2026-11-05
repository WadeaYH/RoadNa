"use strict";

// Presentation only. Campaigns come from shared/funding-data.js; changes here are not saved.
// ASP.NET will move real money through the payment provider and the municipality's finance office.
const F = window.RoadNaFunding;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toastEl = $("toast");
let toastTimer;
const toast = (m) => { toastEl.textContent = m; toastEl.hidden = false; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toastEl.hidden = true; }, 3800); };
const by = (...s) => F.CAMPAIGNS.filter((c) => s.includes(c.status));
const chip = (c) => `<span class="chip chip--${F.STATUS[c.status].tone}">${F.STATUS[c.status].label}</span>`;
const bar = (c) => `<div class="fund-bar" role="img" aria-label="${F.pct(c)}% funded"><span class="r" data-w="${F.pct(c)}"></span><span class="m" data-w="${Math.round((c.municipality / c.target) * 100)}"></span></div>`;
const nums = (c) => `<p class="fund-nums"><span>Target <strong>${F.money(c.target)}</strong></span><span>Residents <strong>${F.money(c.residents)}</strong> from ${c.donors}</span><span>Municipality <strong>${F.money(c.municipality)}</strong></span><span>Still needed <strong>${F.money(F.remaining(c))}</strong></span></p>`;
const head = (c) => `<div class="fund-item__head"><div><p class="fund-item__title">${esc(c.title)}</p><small>${c.id} · report ${c.report} · ${esc(c.dept)}</small></div>${chip(c)}</div>`;
const empty = (t) => `<li class="fund-empty">${t}</li>`;

function render() {
  // Requests waiting for approval
  $("requests").innerHTML = F.REQUESTS.map((r, i) => `<li class="fund-item">
      <div class="fund-item__head"><div><p class="fund-item__title">${esc(r.title)}</p><small>${r.id} · report ${r.report} · requested by ${esc(r.by)}, ${esc(r.ago)}</small></div><span class="chip chip--submitted">Waiting for approval</span></div>
      <p>${esc(r.reason)}</p>
      <form class="fund-form" data-req="${i}">
        <div class="field"><label class="field__label" for="t-${i}">Target (JOD)</label><input class="input" id="t-${i}" name="target" type="number" min="1" value="${r.estimate || ""}" required></div>
        <div class="field"><label class="field__label" for="m-${i}">Municipality share (JOD)</label><input class="input" id="m-${i}" name="muni" type="number" min="0" value="0"></div>
        <div class="field"><label class="field__label" for="d-${i}">Open for</label><select class="select" id="d-${i}" name="days"><option value="14">14 days</option><option value="30" selected>30 days</option><option value="45">45 days</option></select></div>
        <div class="fund-actions"><button class="btn btn--primary" type="submit" data-action>Open campaign</button><button class="btn btn--ghost" type="button" data-decline="${i}" data-action>Decline</button></div>
      </form></li>`).join("") || empty("No requests waiting.");
  // Open
  $("open").innerHTML = by("open").map((c) => `<li class="fund-item">${head(c)}${bar(c)}${nums(c)}
      <div class="fund-actions"><span class="chip chip--plain chip--submitted">${c.daysLeft} days left</span><button class="btn btn--outline btn--sm" type="button" data-extend="${c.id}" data-action>Extend 14 days</button></div></li>`).join("") || empty("No open campaigns.");
  // Short of target and donors choosing
  $("short").innerHTML = by("short", "choosing").map((c) => c.status === "short" ? `<li class="fund-item">${head(c)}${bar(c)}${nums(c)}
      <p><strong>Closed ${-c.daysLeft} days ago, ${F.money(F.remaining(c))} short.</strong> Decide within ${c.decideDays} days. Until you decide, donors wait.</p>
      <div class="fund-actions"><button class="btn btn--primary" type="button" data-cover="${c.id}" data-action>Cover the remaining ${F.money(F.remaining(c))}</button><button class="btn btn--outline" type="button" data-cannot="${c.id}" data-action>We can't cover it: let donors choose</button></div></li>`
    : `<li class="fund-item">${head(c)}${bar(c)}${nums(c)}
      <p class="fund-choice"><span><strong>${c.choices.refund}</strong> chose a refund</span><span><strong>${c.choices.moved}</strong> moved their gift to another repair</span><span><strong>${c.choices.undecided}</strong> have not chosen yet</span></p>
      <p>Donors have ${c.chooseDays} more days. Anyone who does not choose is refunded automatically.</p></li>`).join("") || empty("Nothing is short of its target.");
  // Funded and repaired
  $("done").innerHTML = by("funded", "covered", "done").map((c) => `<li class="fund-item">${head(c)}${bar(c)}${nums(c)}
      ${c.status === "done" ? `<p><strong>Repair cost ${F.money(c.spent)}.</strong> ${F.money(c.leftover)} was left over and went back to the donors’ choice: refund or another repair.</p>`
        : `<p>Fully funded. It is at the front of <a href="../../admin/review-assign/review-assign.html">Review &amp; assign</a> with priority.</p>`}</li>`).join("") || empty("None yet.");
  // Ledger
  $("ledger").innerHTML = F.CAMPAIGNS.map((c) => `<tr><td><strong>${esc(c.title)}</strong><br><small class="mono">${c.id}</small></td><td class="num">${F.money(c.target)}</td><td class="num">${F.money(c.residents)}</td><td class="num">${F.money(c.municipality)}</td>
      <td class="num">${c.status === "done" ? F.money(c.spent) : "-"}</td><td class="num">${c.status === "done" ? F.money(c.leftover) : c.status === "choosing" ? `${c.choices.refund + c.choices.moved} donors` : "-"}</td><td>${chip(c)}</td></tr>`).join("");
  document.querySelectorAll("[data-w]").forEach((el) => { el.style.width = `${el.dataset.w}%`; });
  // Counts
  $("n-requests").textContent = F.REQUESTS.length;
  $("n-open").textContent = by("open").length;
  $("n-short").textContent = by("short", "choosing").length;
  $("n-done").textContent = by("funded", "covered", "done").length;
  $("s-open").textContent = by("open").length;
  $("s-res").textContent = F.money(F.CAMPAIGNS.reduce((n, c) => n + c.residents, 0));
  $("s-muni").textContent = F.money(F.CAMPAIGNS.reduce((n, c) => n + c.municipality, 0));
  $("s-decide").textContent = F.REQUESTS.length + by("short").length;
}

document.querySelector("main").addEventListener("submit", (e) => {
  const form = e.target.closest("[data-req]");
  if (!form) return;
  e.preventDefault();
  if (!form.reportValidity()) return;
  const r = F.REQUESTS.splice(Number(form.dataset.req), 1)[0];
  const c = { id: `CF-2026-0${15 + F.CAMPAIGNS.length}`, report: r.report, title: r.title, place: r.place, dept: r.dept, why: r.reason,
    target: Number(form.target.value), municipality: Number(form.muni.value) || 0, residents: 0, donors: 0, status: "open", daysLeft: Number(form.days.value) };
  F.CAMPAIGNS.unshift(c);
  render();
  toast(`${c.id} is open. Residents see “${c.title}” on the Donate page (preview, not saved).`);
});
document.querySelector("main").addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.decline !== undefined) { const r = F.REQUESTS.splice(Number(t.dataset.decline), 1)[0]; render(); toast(`Declined. ${r.report} goes back to the reviewer, who can wait for next year's budget or reject it.`); }
  if (t.dataset.extend) { const c = F.find(t.dataset.extend); c.daysLeft += 14; render(); toast(`${c.id} extended by 14 days.`); }
  if (t.dataset.cover) { const c = F.find(t.dataset.cover); const gap = F.remaining(c); c.municipality += gap; c.status = "covered"; render(); toast(`The municipality covers ${F.money(gap)}. ${c.report} is funded and goes to the front of Review & assign.`); }
  if (t.dataset.cannot) { const c = F.find(t.dataset.cannot); c.status = "choosing"; c.chooseDays = 14; c.choices = { refund: 0, moved: 0, undecided: c.donors }; render(); toast(`Donors are asked to choose: a refund or another repair. Anyone who does not choose in 14 days is refunded.`); }
});

// Tabs (arrow keys move between them)
const tabs = [...document.querySelectorAll(".fund-tabs [role=tab]")];
const select = (tab) => tabs.forEach((t) => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; $(t.getAttribute("aria-controls")).hidden = !on; });
tabs.forEach((t, i) => {
  t.addEventListener("click", () => select(t));
  t.addEventListener("keydown", (e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; select(n); n.focus(); });
});

// A community vote that ended in "go ahead" can become a campaign: ?proposal=<title>
const fromVote = new URLSearchParams(window.location.search).get("proposal");
if (fromVote) {
  F.REQUESTS.unshift({ id: "FR-vote", report: "from a community vote", title: fromVote, place: "Greater Irbid", dept: "Set by the department", estimate: 0, by: "Community vote decision", ago: "now",
    reason: "Residents voted to go ahead. Set a target and open the campaign so they can help pay for it." });
}
render();
