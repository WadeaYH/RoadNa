"use strict";

// Finance (manager): where the money went, what repairs cost, and where to act.
// Charts are plain SVG and HTML drawn from shared/finance-data.js and shared/funding-data.js. Sample data only.
const D = window.RoadNaFinance;
const F = window.RoadNaFunding;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : String(Math.round(n)));
// Bar lengths and stagger travel as data attributes and become CSS variables here (no inline style attributes)
const applyVars = (root) => root.querySelectorAll("[data-w], [data-x], [data-i]").forEach((el) => {
  if (el.dataset.w) el.style.setProperty("--w", `${el.dataset.w}%`);
  if (el.dataset.x) el.style.setProperty("--x", `${el.dataset.x}%`);
  if (el.dataset.i) el.style.setProperty("--i", el.dataset.i);
});
const T = D.totals();
const C = D.campaigns();
const RISKS = D.risks();

// ---------- Tooltip shared by every chart ----------
const tip = $("fin-tip");
const showTip = (html, x, y) => {
  tip.innerHTML = html;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.min(window.innerWidth - r.width - 12, Math.max(12, x - r.width / 2))}px`;
  tip.style.top = `${Math.max(12, y - r.height - 14)}px`;
};
const hideTip = () => { tip.hidden = true; };

// ---------- Numbers count up once when they come into view ----------
const countUp = (el, to, fmt) => {
  if (reduce) { el.textContent = fmt(to); return; }
  const start = performance.now(), dur = 900;
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = fmt(to * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

// ---------- Key figures (the first one follows the period filter) ----------
let range = 10;
const kpis = () => {
  const months = D.MONTHLY.slice(-range);
  const spent = D.sum(months);
  countUp($("k-spent"), spent, D.money);
  $("k-spent-note").textContent = range === 10 ? `${T.used}% of ${D.money(T.budget)}` : `In the last ${range} months`;
};
countUp($("k-left"), T.left, D.money);
$("k-left-note").textContent = `Forecast at today's pace: ${D.money(T.budget - T.forecast)} left in December`;
countUp($("k-avg"), T.avg, D.money);
$("k-avg-note").textContent = `${T.fixed.toLocaleString("en")} reports fixed this year`;
countUp($("k-res"), C.residents, D.money);
$("k-res-note").textContent = `${C.donors} donors in ${C.list.length} campaigns`;
kpis();

// ---------- Spending by month: line against an even plan, with a crosshair tooltip ----------
const trend = () => {
  const box = $("trend-chart");
  const months = D.MONTHS.slice(-range), values = D.MONTHLY.slice(-range);
  const W = 640, H = 240, L = 46, R = 12, TP = 14, B = 28;
  const max = Math.ceil(Math.max(...values, T.plan) / 20000) * 20000;
  const x = (i) => L + (values.length === 1 ? 0 : (i * (W - L - R)) / (values.length - 1));
  const y = (v) => TP + (1 - v / max) * (H - TP - B);
  const pts = values.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const area = `${line}L${x(values.length - 1)} ${y(0)}L${x(0)} ${y(0)}Z`;
  const grid = [0, max / 2, max].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="fin-grid-line"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="fin-axis">${k(v)}</text>`).join("");
  const labels = months.map((m, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="fin-axis">${m}</text>`).join("");
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly spending, ${months[0]} to ${months.at(-1)}. Highest ${D.money(Math.max(...values))}.">
    <defs><linearGradient id="fin-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00909e" stop-opacity=".22"/><stop offset="1" stop-color="#00909e" stop-opacity="0"/></linearGradient></defs>
    ${grid}${labels}
    <line x1="${L}" x2="${W - R}" y1="${y(T.plan)}" y2="${y(T.plan)}" class="fin-plan"/>
    <path d="${area}" fill="url(#fin-area)" class="fin-area"/>
    <path d="${line}" class="fin-line" pathLength="1"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" class="fin-dot" data-i="${i}"/>`).join("")}
    <line class="fin-cross" y1="${TP}" y2="${H - B}" x1="0" x2="0"/>
    <rect class="fin-hit" x="${L}" y="${TP}" width="${W - L - R}" height="${H - TP - B}"/>
  </svg>`;
  const svg = box.querySelector("svg"), cross = svg.querySelector(".fin-cross");
  const pick = (clientX) => {
    const r = svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(p[0] - sx) < Math.abs(pts[best][0] - sx)) best = i; });
    return best;
  };
  const hover = (i) => {
    const r = svg.getBoundingClientRect();
    cross.setAttribute("x1", pts[i][0]); cross.setAttribute("x2", pts[i][0]); cross.classList.add("is-on");
    svg.querySelectorAll(".fin-dot").forEach((d) => d.classList.toggle("is-on", Number(d.dataset.i) === i));
    const diff = values[i] - T.plan;
    showTip(`<strong>${months[i]} 2026</strong><span>${D.money(values[i])} spent</span><span>${diff >= 0 ? `${D.money(diff)} over` : `${D.money(-diff)} under`} the even plan</span>`,
      r.left + (pts[i][0] / W) * r.width, r.top + (pts[i][1] / H) * r.height);
  };
  const hit = svg.querySelector(".fin-hit");
  hit.addEventListener("pointermove", (e) => hover(pick(e.clientX)));
  hit.addEventListener("pointerleave", () => { cross.classList.remove("is-on"); svg.querySelectorAll(".fin-dot").forEach((d) => d.classList.remove("is-on")); hideTip(); });
  $("trend-table").innerHTML = `<table class="fin-mini"><thead><tr><th scope="col">Month</th><th scope="col" class="num">Spent</th><th scope="col" class="num">Against plan</th></tr></thead><tbody>${
    values.map((v, i) => `<tr><td>${months[i]}</td><td class="num">${D.money(v)}</td><td class="num">${v >= T.plan ? "+" : "-"}${D.money(Math.abs(v - T.plan))}</td></tr>`).join("")}</tbody></table>`;
  $("trend-sub").textContent = `Spent from the yearly budget, ${months[0]} to ${months.at(-1)}, against an even monthly plan of ${D.money(T.plan)}.`;
};
trend();

// ---------- Period filter ----------
document.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => {
  range = Number(b.dataset.range);
  document.querySelectorAll("[data-range]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  kpis(); trend();
}));

// ---------- Budget by department: bullet bars with a forecast tick ----------
(() => {
  const max = Math.max(...RISKS.map((d) => Math.max(d.budget, d.forecast)));
  const rows = D.DEPARTMENTS.map((d) => RISKS.find((r) => r.key === d.key));
  $("dept-chart").innerHTML = rows.map((d, i) => {
    const over = d.over > 0;
    return `<div class="fin-bullet${over ? " is-over" : ""}" data-key="${d.key}" tabindex="0" aria-label="${esc(d.short)}: ${D.money(d.spent)} of ${D.money(d.budget)} spent, ${d.used}%. Forecast ${D.money(d.forecast)}${over ? `, ${D.money(d.over)} over budget` : ""}.">
      <span class="fin-bullet__name">${esc(d.short)}</span>
      <span class="fin-bullet__track">
        <span class="fin-bullet__budget" data-w="${(d.budget / max) * 100}"></span>
        <span class="fin-bullet__spent" data-w="${(d.spent / max) * 100}" data-i="${i}"></span>
        <span class="fin-bullet__tick" data-x="${(d.forecast / max) * 100}"></span>
      </span>
      <span class="fin-bullet__val">${d.used}%${over ? ` <em><svg class="icon" width="14" height="14" aria-hidden="true" focusable="false"><use href="#i-warning"/></svg>over</em>` : ""}</span>
    </div>`;
  }).join("");
  $("dept-chart").querySelectorAll(".fin-bullet").forEach((row) => {
    const d = RISKS.find((r) => r.key === row.dataset.key);
    const show = () => { const r = row.getBoundingClientRect(); showTip(`<strong>${esc(d.name)}</strong><span>${D.money(d.spent)} of ${D.money(d.budget)} (${d.used}%)</span><span>December forecast ${D.money(d.forecast)}</span>${d.over > 0 ? `<span class="fin-tip__warn">${D.money(d.over)} over budget</span>` : `<span>${D.money(-d.over)} to spare</span>`}`, r.left + r.width * .55, r.top + 6); };
    row.addEventListener("pointerenter", show); row.addEventListener("focus", show);
    row.addEventListener("pointerleave", hideTip); row.addEventListener("blur", hideTip);
  });
  $("dept-table").innerHTML = `<table class="fin-mini"><thead><tr><th scope="col">Department</th><th scope="col" class="num">Budget</th><th scope="col" class="num">Spent</th><th scope="col" class="num">Forecast</th></tr></thead><tbody>${
    rows.map((d) => `<tr><td>${esc(d.short)}</td><td class="num">${D.money(d.budget)}</td><td class="num">${D.money(d.spent)}</td><td class="num">${D.money(d.forecast)}</td></tr>`).join("")}</tbody></table>`;
})();

// ---------- Average cost per fixed report: one series, sorted ----------
(() => {
  const rows = [...RISKS].sort((a, b) => b.avg - a.avg);
  const max = rows[0].avg;
  $("cost-chart").innerHTML = rows.map((d, i) => `<div class="fin-bar" tabindex="0" data-key="${d.key}" aria-label="${esc(d.short)}: ${D.money(d.avg)} per report, ${d.fixed} reports">
    <span class="fin-bar__name">${esc(d.short)}</span>
    <span class="fin-bar__track"><span class="fin-bar__fill" data-w="${(d.avg / max) * 100}" data-i="${i}"></span></span>
    <span class="fin-bar__val">${D.money(d.avg)}</span></div>`).join("");
  $("cost-chart").querySelectorAll(".fin-bar").forEach((row) => {
    const d = RISKS.find((r) => r.key === row.dataset.key);
    const show = () => { const r = row.getBoundingClientRect(); showTip(`<strong>${esc(d.name)}</strong><span>${D.money(d.avg)} per fixed report</span><span>${d.fixed} reports, ${D.money(d.spent)} in all</span>`, r.left + r.width * .5, r.top + 4); };
    row.addEventListener("pointerenter", show); row.addEventListener("focus", show);
    row.addEventListener("pointerleave", hideTip); row.addEventListener("blur", hideTip);
  });
  $("cost-table").innerHTML = `<table class="fin-mini"><thead><tr><th scope="col">Type</th><th scope="col" class="num">Reports</th><th scope="col" class="num">Per report</th></tr></thead><tbody>${
    rows.map((d) => `<tr><td>${esc(d.short)}</td><td class="num">${d.fixed}</td><td class="num">${D.money(d.avg)}</td></tr>`).join("")}</tbody></table>`;
})();

// ---------- Funding campaigns: municipality share + residents, against the target ----------
(() => {
  const list = C.list;
  const max = Math.max(...list.map((c) => c.target));
  $("camp-chart").innerHTML = list.map((c, i) => {
    const st = F.STATUS[c.status];
    return `<div class="fin-stack" tabindex="0" data-id="${c.id}" aria-label="${esc(c.title)}: municipality ${D.money(c.municipality)}, residents ${D.money(c.residents)}, target ${D.money(c.target)}. ${st.label}.">
      <span class="fin-stack__name">${esc(c.title)}<small>${esc(st.label)}</small></span>
      <span class="fin-stack__track">
        <span class="fin-stack__seg fin-stack__seg--muni" data-w="${(c.municipality / max) * 100}" data-i="${i}"></span>
        <span class="fin-stack__seg fin-stack__seg--res" data-w="${(c.residents / max) * 100}" data-i="${i}"></span>
        <span class="fin-stack__target" data-x="${(c.target / max) * 100}"></span>
      </span>
      <span class="fin-stack__val">${F.pct(c)}%</span>
    </div>`;
  }).join("");
  $("camp-chart").querySelectorAll(".fin-stack").forEach((row) => {
    const c = F.find(row.dataset.id);
    const show = () => { const r = row.getBoundingClientRect(); showTip(`<strong>${esc(c.title)}</strong><span>Municipality ${D.money(c.municipality)}, residents ${D.money(c.residents)} from ${c.donors} donors</span><span>Target ${D.money(c.target)}${F.remaining(c) ? `, ${D.money(F.remaining(c))} still needed` : ", reached"}</span>`, r.left + r.width * .5, r.top + 4); };
    row.addEventListener("pointerenter", show); row.addEventListener("focus", show);
    row.addEventListener("pointerleave", hideTip); row.addEventListener("blur", hideTip);
  });
  $("camp-table").innerHTML = `<table class="fin-mini"><thead><tr><th scope="col">Campaign</th><th scope="col" class="num">Municipality</th><th scope="col" class="num">Residents</th><th scope="col" class="num">Target</th></tr></thead><tbody>${
    list.map((c) => `<tr><td>${esc(c.title)}</td><td class="num">${D.money(c.municipality)}</td><td class="num">${D.money(c.residents)}</td><td class="num">${D.money(c.target)}</td></tr>`).join("")}</tbody></table>`;
})();

// ---------- AI summary and suggestions, written from the same numbers ----------
(() => {
  const risk = RISKS[0];
  const tight = RISKS.filter((d) => d.over <= 0 && d.forecast / d.budget > .97)[0];
  const spare = [...RISKS].sort((a, b) => a.over - b.over)[0];
  const topCost = [...RISKS].sort((a, b) => b.avg - a.avg)[0];
  const big = [...D.REPAIRS].sort((a, b) => b.cost - a.cost)[0];
  const short = C.short[0];
  const lines = [
    `<strong>On plan overall:</strong> ${D.money(T.spent)} of ${D.money(T.budget)} spent (${T.used}%) with two months left. At today's pace the year ends about ${D.money(T.budget - T.forecast)} under budget.`,
    risk.over > 0 ? `<strong>${esc(risk.short)} is the risk:</strong> ${risk.used}% used already, on pace to end ${D.money(risk.over)} over.${tight ? ` ${esc(tight.short)} will be tight at ${D.pct(tight.forecast, tight.budget)}%.` : ""}` : "No department is on pace to overspend.",
    `<strong>${esc(topCost.short)} costs the most per job:</strong> ${D.money(topCost.avg)} on average, against ${D.money(T.avg)} across all work. The single biggest repair was "${esc(big.title)}" at ${D.money(big.cost)}.`,
    `<strong>Residents gave ${D.money(C.residents)}</strong> to ${C.list.length} campaigns.${short ? ` One is ${D.money(F.remaining(short))} short and needs your decision within ${short.decideDays} days.` : ""}`,
  ];
  $("ai-lines").innerHTML = lines.map((l, i) => `<li data-i="${i}">${l}</li>`).join("");

  const busStop = C.open.find((c) => c.daysLeft <= 5);
  const tips = [
    risk.over > 0 && { title: `Move about ${D.money(Math.ceil(risk.over / 1000) * 1000)} to ${risk.short}`, text: `${spare.short} has the most room (${D.pct(spare.forecast, spare.budget)}% forecast). Moving it now avoids stopping ${risk.short.toLowerCase()} work in December.`, ask: `Why is ${risk.short} going over budget?` },
    short && { title: `Decide on "${short.title}"`, text: `${D.money(F.remaining(short))} short. Covering it finishes a repair residents already paid ${D.money(short.residents)} toward.`, href: "../../admin/funding/funding.html", link: "Open Funding" },
    busStop && { title: `"${busStop.title}" closes in ${busStop.daysLeft} days`, text: `${D.money(F.remaining(busStop))} still needed from ${busStop.donors} donors so far. Extending it 14 days is free; covering it costs ${D.money(F.remaining(busStop))}.`, href: "../../admin/funding/funding.html", link: "Open Funding" },
    { title: `Look at why ${topCost.short.toLowerCase()} jobs cost ${D.money(topCost.avg)}`, text: `Two large jobs make up most of it. A survey of old drain covers may be cheaper than emergency repairs.`, ask: `Why are ${topCost.short.toLowerCase()} repairs so expensive?` },
  ].filter(Boolean);
  $("tips").innerHTML = tips.map((t, i) => `<li class="fin-tip-item" data-i="${i}"><span class="fin-tip-item__n">${i + 1}</span><div><p class="fin-tip-item__title">${esc(t.title)}</p><p class="fin-tip-item__text">${esc(t.text)}</p>
    ${t.ask ? `<button class="fin-tip-item__go" type="button" data-ask="${esc(t.ask)}">Ask RoadNa AI</button>` : `<a class="fin-tip-item__go" href="${t.href}">${esc(t.link)}</a>`}</div></li>`).join("");
})();

// Buttons that hand a question to the floating assistant
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ask]");
  if (b) window.RoadNaAI?.ask(b.dataset.ask);
});

// ---------- What each repair cost ----------
(() => {
  const rows = [...D.REPAIRS].sort((a, b) => b.cost - a.cost);
  const max = rows[0].cost;
  const render = (q = "") => {
    const t = q.trim().toLowerCase();
    const list = rows.filter((r) => !t || `${r.report} ${r.title} ${D.dept(r.dept).short} ${r.area}`.toLowerCase().includes(t));
    $("ledger-rows").innerHTML = list.map((r) => `<tr>
      <td><a href="../../resident/report-details/report-details.html?id=${r.report}">${esc(r.title)}</a><span class="mono">${r.report}</span></td>
      <td>${esc(D.dept(r.dept).short)}</td><td>${esc(r.area)}</td>
      <td>${r.paidBy === "campaign" ? `<span class="fin-paid fin-paid--camp">Campaign</span><small>${D.money(r.municipality)} municipality, ${D.money(r.residents)} residents</small>` : '<span class="fin-paid">Budget</span>'}</td>
      <td class="num">${r.days}</td>
      <td class="num fin-cost"><span class="fin-cost__bar" data-w="${(r.cost / max) * 100}"></span>${D.money(r.cost)}</td></tr>`).join("");
    applyVars($("ledger-rows"));
    $("ledger-empty").hidden = list.length > 0;
  };
  render();
  $("ledger-q").addEventListener("input", (e) => render(e.target.value));
})();

// ---------- Bars grow when their panel comes into view ----------
const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }), { threshold: .25 });
document.querySelectorAll(".fin-panel, .fin-ai").forEach((p) => io.observe(p));
applyVars(document);
