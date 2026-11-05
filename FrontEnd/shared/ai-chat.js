"use strict";

// RoadNa AI: the manager's floating assistant. A roundabout button opens a chat that answers questions
// about money, campaigns and repairs from the preview's sample data (shared/finance-data.js and
// shared/funding-data.js). Nothing is sent anywhere: the answers are worked out in the page. ASP.NET will
// connect a real model later, with the same data behind it.
(() => {
  const D = window.RoadNaFinance, F = window.RoadNaFunding, A = window.RoadNaAccess;
  if (!D) return;
  // Manager screens only: the manager's role, or the open preview (no role chosen) on a screen the manager uses
  const m = window.location.pathname.match(/pages\/([^/]+)\/([^/]+)\//);
  const screen = m ? `${m[1]}/${m[2]}` : "";
  const role = A?.role;
  const managerScreen = Boolean(A?.ACCESS?.[screen]?.manager);
  if (!(managerScreen && (role === "manager" || !role))) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = D.money;
  const T = D.totals(), C = D.campaigns(), RISKS = D.risks();

  // ---------- The answers ----------
  const bars = (rows, unit = money) => {
    const max = Math.max(...rows.map((r) => r.v));
    return `<div class="ai-bars">${rows.map((r, i) => `<div class="ai-bars__row"><span>${esc(r.label)}</span><span class="ai-bars__track"><span class="ai-bars__fill" data-w="${(r.v / max) * 100}" data-i="${i}"></span></span><b>${unit(r.v)}</b></div>`).join("")}</div>`;
  };
  const DEPT_WORDS = { roads: /road|pothole|asphalt|street|curb|sinkhole|sign/, lighting: /light|lamp|signal/, sanitation: /sanit|rubbish|bin|waste|trash|clean/, parks: /park|tree|garden|green/, drainage: /drain|water|flood|pipe|sewer/ };
  const SUGGEST = ["Where did the money go?", "Which repair cost the most?", "Is any department going over budget?", "How are the donation campaigns doing?", "What should I do this week?"];

  const answer = (raw) => {
    const q = raw.toLowerCase();
    const deptKey = Object.keys(DEPT_WORDS).find((key) => DEPT_WORDS[key].test(q));
    if (/^(hi|hello|hey|salam|marhaba)\b|help|what can you/.test(q)) {
      return { text: `Hello Eng. Sami. I read this year's budgets, every repair's cost and the donation campaigns. Ask me where money went, what something cost, or what needs a decision.`, chips: SUGGEST.slice(0, 4) };
    }
    if (/suggest|should i|recommend|advice|what to do|this week|priorit/.test(q)) {
      const risk = RISKS[0], spare = [...RISKS].sort((a, b) => a.over - b.over)[0], short = C.short[0], soon = C.open.find((c) => c.daysLeft <= 5);
      const list = [
        risk.over > 0 && `Move about <b>${money(Math.ceil(risk.over / 1000) * 1000)}</b> from ${esc(spare.short)} to ${esc(risk.short)}, which is on pace to end ${money(risk.over)} over.`,
        short && `Decide on <b>${esc(short.title)}</b>: ${money(F.remaining(short))} short, ${short.decideDays} days left to decide.`,
        soon && `<b>${esc(soon.title)}</b> closes in ${soon.daysLeft} days, ${money(F.remaining(soon))} still needed. Extend it, or cover the rest.`,
        `Ask the drainage team why two jobs cost ${money(3720)} and more. A survey of old covers may cost less than emergency repairs.`,
      ].filter(Boolean);
      return { text: "Here is what I would look at first:", html: `<ol class="ai-list">${list.map((l) => `<li>${l}</li>`).join("")}</ol>`, chips: ["Why is Parks going over?", "How are the donation campaigns doing?"] };
    }
    if (deptKey && /over|why|risk|forecast|budget|expens|cost|spend|spent|how much/.test(q) || deptKey && q.split(/\s+/).length <= 3) {
      const d = RISKS.find((r) => r.key === deptKey);
      const jobs = D.REPAIRS.filter((r) => r.dept === deptKey).sort((a, b) => b.cost - a.cost).slice(0, 3);
      const monthly = d.spent / D.MONTHLY.length, plan = d.budget / 12;
      let text = `${d.name} has spent ${money(d.spent)} of ${money(d.budget)} (${d.used}%). At ${money(monthly)} a month against a plan of ${money(plan)}, it ends December near ${money(d.forecast)}`;
      text += d.over > 0 ? `, ${money(d.over)} over budget.` : `, ${money(-d.over)} to spare.`;
      text += ` Each fixed report costs ${money(d.avg)} on average across ${d.fixed} reports.`;
      return { text, html: jobs.length ? `<p class="ai-sub">Biggest recent jobs</p>${bars(jobs.map((j) => ({ label: j.title, v: j.cost })))}` : "", chips: d.over > 0 ? ["What should I do this week?", "Which department has room to spare?"] : ["Where did the money go?"] };
    }
    if (/room|spare|under budget|most left/.test(q)) {
      const rows = [...RISKS].sort((a, b) => a.over - b.over);
      return { text: `${rows[0].short} has the most room: it ends the year near ${D.pct(rows[0].forecast, rows[0].budget)}% of its budget, about ${money(-rows[0].over)} to spare.`, html: bars(rows.map((r) => ({ label: r.short, v: Math.max(0, -r.over) }))), chips: ["Is any department going over budget?"] };
    }
    if (/where.*(money|spen|go)|break ?down|by department|split|share/.test(q)) {
      const rows = [...D.DEPARTMENTS].sort((a, b) => b.spent - a.spent);
      return { text: `${money(T.spent)} has been spent from the ${money(T.budget)} budget this year (${T.used}%). ${rows[0].short} took the most, ${D.pct(rows[0].spent, T.spent)}% of all spending. Residents added ${money(C.residents)} through campaigns, and the municipality topped up ${money(C.municipality)}.`, html: bars(rows.map((r) => ({ label: r.short, v: r.spent }))), chips: ["Which repair cost the most?", "Is any department going over budget?"] };
    }
    if (/over budget|overspend|going over|risk/.test(q)) {
      const over = RISKS.filter((r) => r.over > 0);
      if (!over.length) return { text: "No department is on pace to overspend this year." };
      return { text: `${over.map((r) => `${r.short} is on pace to end ${money(r.over)} over`).join(", ")}. Everything else stays inside its budget at today's pace.`, html: bars(RISKS.map((r) => ({ label: r.short, v: D.pct(r.forecast, r.budget) })), (v) => `${v}%`), chips: ["Why is Parks going over?", "What should I do this week?"] };
    }
    if (/cheap|lowest|least/.test(q)) {
      const rows = [...D.REPAIRS].sort((a, b) => a.cost - b.cost).slice(0, 3);
      return { text: `The cheapest recent repair was "${rows[0].title}" in ${rows[0].area}, ${money(rows[0].cost)}.`, html: bars(rows.map((r) => ({ label: r.title, v: r.cost }))) };
    }
    if (/most|biggest|highest|expensive|costl|cost the most/.test(q) && !/month/.test(q)) {
      const rows = [...D.REPAIRS].sort((a, b) => b.cost - a.cost).slice(0, 3);
      const r = rows[0];
      return { text: `The most expensive recent repair was "${r.title}" (${r.report}) in ${r.area}: ${money(r.cost)}, paid from the ${D.dept(r.dept).short.toLowerCase()} budget. That is ${(r.cost / T.avg).toFixed(1)} times the average job.`, html: bars(rows.map((x) => ({ label: x.title, v: x.cost }))), chips: ["Why are drainage repairs so expensive?", "What does a report cost on average?"] };
    }
    if (/refund|choos|move/.test(q)) {
      const c = C.choosing[0];
      if (!c) return { text: "No campaign is waiting for donors to choose right now." };
      return { text: `${c.title} fell short and the municipality could not cover it. Of ${c.donors} donors, ${c.choices.refund} chose a refund and ${c.choices.moved} moved their gift to another repair. ${c.choices.undecided} have not chosen; they are refunded in ${c.chooseDays} days if they do not.` };
    }
    if (/short|shortfall|decide|cover/.test(q)) {
      const c = C.short[0];
      if (!c) return { text: "No campaign is short of its target right now." };
      return { text: `${c.title} closed ${money(F.remaining(c))} short of its ${money(c.target)} target. Residents gave ${money(c.residents)} and the municipality ${money(c.municipality)}. Covering the rest finishes the repair; you have ${c.decideDays} days to decide on the Funding page.`, chips: ["How are the donation campaigns doing?"] };
    }
    if (/donat|resident|campaign|raised|donor|fund/.test(q)) {
      const rows = C.list.map((c) => ({ label: c.title, v: F.pct(c) }));
      return { text: `${C.donors} residents gave ${money(C.residents)} to ${C.list.length} campaigns, and the municipality added ${money(C.municipality)}. ${C.open.length} are open, ${C.short.length} is short of target, and ${C.choosing.length} is waiting for donors to choose a refund or another repair.`, html: bars(rows, (v) => `${v}%`), chips: ["Which campaign is short?", "How many donors asked for refunds?"] };
    }
    if (/month|trend|highest month|lowest month/.test(q)) {
      const max = Math.max(...D.MONTHLY), min = Math.min(...D.MONTHLY);
      return { text: `Spending peaked in ${D.MONTHS[D.MONTHLY.indexOf(max)]} at ${money(max)} and was lowest in ${D.MONTHS[D.MONTHLY.indexOf(min)]} at ${money(min)}. The last three months averaged ${money(T.pace)}, a little above the even plan of ${money(T.plan)}.`, html: bars(D.MONTHS.map((mo, i) => ({ label: mo, v: D.MONTHLY[i] })).slice(-6)) };
    }
    if (/forecast|end of|year end|december|pace|predict/.test(q)) {
      return { text: `At the last three months' pace (${money(T.pace)} a month), the year ends near ${money(T.forecast)}, about ${money(T.budget - T.forecast)} under the ${money(T.budget)} budget. Parks is the exception: it ends about ${money(RISKS[0].over)} over.` };
    }
    if (/average|per report|per job|each report|unit cost/.test(q)) {
      const rows = [...RISKS].sort((a, b) => b.avg - a.avg);
      return { text: `A fixed report costs ${money(T.avg)} on average this year (${T.fixed.toLocaleString("en")} reports). Drainage is the most expensive per job and sanitation the cheapest.`, html: bars(rows.map((r) => ({ label: r.short, v: r.avg }))) };
    }
    if (/left|remain|how much.*budget|budget/.test(q)) {
      return { text: `${money(T.left)} of the ${money(T.budget)} budget is left for November and December. At today's pace you will use about ${money(T.pace * D.MONTHS_LEFT)} of it.` };
    }
    const area = D.REPAIRS.filter((r) => q.includes(r.area.toLowerCase().split(" ")[0].replace(/[^a-z-]/g, "")) && r.area.length > 3);
    if (area.length) {
      return { text: `In ${area[0].area}, recent repairs cost ${money(D.sum(area, (r) => r.cost))} across ${area.length} report${area.length > 1 ? "s" : ""}.`, html: bars(area.map((r) => ({ label: r.title, v: r.cost }))) };
    }
    return { text: "I could not match that to the figures I have. I can answer about budgets and spending by department, what repairs cost, monthly trends, the year-end forecast, and the donation campaigns.", chips: SUGGEST };
  };

  // ---------- The roundabout launcher ----------
  const LAUNCH = `<svg class="ai-orb__svg" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <circle class="ai-orb__halo" cx="36" cy="36" r="34"/>
      <circle cx="36" cy="36" r="31" fill="#3f454c"/>
      <circle class="ai-orb__lane" cx="36" cy="36" r="25" fill="none" stroke="#f3eedb" stroke-width="2" stroke-dasharray="5 6"/>
      <circle cx="36" cy="36" r="19" fill="#00626a"/>
      <circle cx="36" cy="36" r="19" fill="none" stroke="#ffffff" stroke-width="2" opacity=".9"/>
      <path class="ai-orb__spark" d="M36 26c.9 4.4 3 6.6 7.4 7.5-4.4.9-6.5 3-7.4 7.5-.9-4.5-3.1-6.6-7.5-7.5 4.4-.9 6.6-3.1 7.5-7.5z" fill="#ffffff"/>
      <circle class="ai-orb__spark2" cx="44.5" cy="27.5" r="1.8" fill="#f2a33a"/>
      <g class="ai-orb__car"><rect x="33" y="2.5" width="9" height="5.5" rx="2" fill="#f2a33a"/><rect x="38.4" y="3.4" width="2.2" height="3.7" rx=".6" fill="#7a4a07"/></g>
    </svg>
    <svg class="ai-orb__x" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

  const root = document.createElement("div");
  root.className = "ai-chat";
  root.innerHTML = `
    <button class="ai-orb" type="button" aria-expanded="false" aria-controls="ai-panel"><span class="sr-only">Ask RoadNa AI</span>${LAUNCH}</button>
    <span class="ai-hint" aria-hidden="true">Ask RoadNa AI</span>
    <section class="ai-panel" id="ai-panel" role="dialog" aria-labelledby="ai-panel-title" hidden>
      <header class="ai-panel__head">
        <span class="ai-panel__mark" aria-hidden="true">${LAUNCH.split("<svg class=\"ai-orb__x\"")[0].replace("ai-orb__svg", "ai-orb__svg ai-orb__svg--mini")}</span>
        <div><h2 id="ai-panel-title">RoadNa AI</h2><p>Answers from this year's money, repairs and campaigns (sample data)</p></div>
        <button class="ai-panel__close" type="button" aria-label="Close RoadNa AI"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
        <span class="ai-panel__road" aria-hidden="true"><i></i></span>
      </header>
      <div class="ai-log" id="ai-log" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="ai-chips" id="ai-chips"></div>
      <form class="ai-form" id="ai-form">
        <label class="sr-only" for="ai-q">Ask about money, repairs or campaigns</label>
        <input id="ai-q" type="text" autocomplete="off" placeholder="Ask about money, repairs or campaigns" maxlength="200">
        <button type="submit" class="ai-send" aria-label="Send"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M3.4 20.4l17.4-7.5c.8-.3.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.2-1.4.9V9c0 .5.4.9.9 1l12.1 2-12.1 2c-.5.1-.9.5-.9 1v4.5c0 .7.7 1.2 1.4.9z" fill="currentColor"/></svg></button>
      </form>
    </section>`;
  document.body.append(root);

  const orb = root.querySelector(".ai-orb"), panel = root.querySelector(".ai-panel"), log = root.querySelector("#ai-log");
  const chipsBox = root.querySelector("#ai-chips"), form = root.querySelector("#ai-form"), input = root.querySelector("#ai-q");
  const applyVars = (el) => el.querySelectorAll("[data-w], [data-i]").forEach((n) => { if (n.dataset.w) n.style.setProperty("--w", `${n.dataset.w}%`); if (n.dataset.i) n.style.setProperty("--i", n.dataset.i); });

  const setChips = (list) => {
    chipsBox.innerHTML = (list || []).map((c) => `<button type="button" class="ai-chip">${esc(c)}</button>`).join("");
    chipsBox.querySelectorAll(".ai-chip").forEach((b, i) => b.style.setProperty("--i", i));
  };
  const bubble = (who, html) => {
    const el = document.createElement("div");
    el.className = `ai-msg ai-msg--${who}`;
    el.innerHTML = html;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };
  // Words appear one after another, like the answer is being written
  const stream = (el, text) => new Promise((done) => {
    const words = text.split(" ");
    if (reduce) { el.textContent = text; done(); return; }
    el.textContent = "";
    let i = 0;
    const tick = () => {
      const w = document.createElement("span");
      w.className = "ai-word";
      w.textContent = (i ? " " : "") + words[i];
      el.append(w);
      log.scrollTop = log.scrollHeight;
      i += 1;
      if (i < words.length) window.setTimeout(tick, 26 + Math.random() * 30); else done();
    };
    tick();
  });
  let busy = false;
  const ask = async (q) => {
    q = q.trim();
    if (!q || busy) return;
    busy = true;
    setChips([]);
    bubble("me", esc(q));
    const thinking = bubble("ai", '<span class="ai-think" aria-label="Thinking"><span class="ai-think__road"><i></i></span><span>Checking the figures</span></span>');
    await new Promise((r) => window.setTimeout(r, reduce ? 150 : 700 + Math.random() * 400));
    const a = answer(q);
    thinking.innerHTML = '<p class="ai-text"></p>';
    await stream(thinking.querySelector(".ai-text"), a.text);
    if (a.html) {
      const extra = document.createElement("div");
      extra.className = "ai-extra";
      extra.innerHTML = a.html;
      applyVars(extra);
      thinking.append(extra);
      requestAnimationFrame(() => extra.classList.add("is-in"));
    }
    log.scrollTop = log.scrollHeight;
    setChips(a.chips || SUGGEST.filter((s) => s.toLowerCase() !== q.toLowerCase()).slice(0, 3));
    busy = false;
  };

  let greeted = false;
  const open = (question) => {
    if (panel.hidden) {
      panel.hidden = false;
      root.classList.add("is-open");
      orb.setAttribute("aria-expanded", "true");
      root.querySelector(".ai-hint").classList.remove("is-shown");
    }
    if (!greeted) {
      greeted = true;
      const hello = bubble("ai", '<p class="ai-text"></p>');
      stream(hello.querySelector(".ai-text"), `Hello Eng. Sami. ${D.money(T.spent)} of the ${D.money(T.budget)} budget is spent (${T.used}%). Parks is the one to watch. What would you like to know?`)
        .then(() => { if (!question) setChips(SUGGEST.slice(0, 4)); });
    }
    if (question) window.setTimeout(() => ask(question), greeted && !reduce ? 450 : 0);
    window.setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 380);
  };
  const close = () => {
    if (panel.hidden) return;
    root.classList.remove("is-open");
    root.classList.add("is-closing");
    orb.setAttribute("aria-expanded", "false");
    window.setTimeout(() => { panel.hidden = true; root.classList.remove("is-closing"); }, reduce ? 0 : 320);
    orb.focus({ preventScroll: true });
  };
  orb.addEventListener("click", () => (panel.hidden ? open() : close()));
  root.querySelector(".ai-panel__close").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });
  chipsBox.addEventListener("click", (e) => { const b = e.target.closest(".ai-chip"); if (b) ask(b.textContent); });
  form.addEventListener("submit", (e) => { e.preventDefault(); const q = input.value; input.value = ""; ask(q); });

  // Once per page, the label slides out to say what the roundabout is
  if (!reduce) {
    const hint = root.querySelector(".ai-hint");
    window.setTimeout(() => { if (panel.hidden) hint.classList.add("is-shown"); }, 1400);
    window.setTimeout(() => hint.classList.remove("is-shown"), 5200);
  }
  window.RoadNaAI = { open, ask: (q) => open(q) };
})();
