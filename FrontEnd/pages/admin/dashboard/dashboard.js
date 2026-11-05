"use strict";

// Presentation only. The sample figures on this screen are static; ASP.NET will supply real
// KPIs, charts and the AI summary.
const range = document.querySelector("#range");
const rangeStatus = document.querySelector("#range-status");
range.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    range.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    rangeStatus.textContent = `Showing ${button.dataset.range.toLowerCase()} (sample data).`;
  });
});

const regen = document.querySelector("#regen");
regen.addEventListener("click", () => {
  const label = regen.querySelector("span");
  regen.classList.remove("is-spinning");
  void regen.offsetWidth;
  regen.classList.add("is-spinning");
  window.RoadNaUI.preview("The AI summary shown here is sample content. Regeneration will be available when the service is connected.");
  window.setTimeout(() => { label.textContent = "Regenerate"; }, 2200);
});

// KPI numbers count up the first time they are seen. The text itself stays the source of truth,
// so without motion (or without JavaScript) the figures simply appear as written.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && "IntersectionObserver" in window) {
  const seen = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    seen.unobserve(entry.target);
    const el = entry.target;
    const match = el.dataset.final.match(/^([\d.,]+)(.*)$/);
    const target = parseFloat(match[1].replace(/,/g, ""));
    const decimals = (match[1].split(".")[1] || "").length;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1100)); // rAF time can precede start
      const value = target * (1 - Math.pow(1 - t, 3));
      el.textContent = value.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + match[2];
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  document.querySelectorAll(".stat__value").forEach((el) => {
    if (!/^[\d.,]+/.test(el.textContent.trim())) return;
    el.dataset.final = el.textContent.trim();
    seen.observe(el);
  });
}

// ---- Escalated to you ----
// A supervisor's escalation from SLA & orders arrives in the link (the preview stores nothing).
const escList = document.querySelector("#esc-list");
const escParams = new URLSearchParams(window.location.search);
if (escParams.get("escalated")) {
  const li = document.createElement("li");
  li.className = "escalated__item escalated__item--new";
  const body = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = escParams.get("title") || "Work order";
  const id = document.createElement("span");
  id.className = "mono";
  id.textContent = escParams.get("escalated");
  const reason = document.createElement("p");
  reason.textContent = `\u201C${escParams.get("reason") || ""}\u201D`;
  const who = document.createElement("small");
  who.textContent = `${escParams.get("by") || "A supervisor"}, just now`;
  body.append(title, " ", id, reason, who);
  li.append(body, escList.querySelector(".escalated__actions").cloneNode(true));
  escList.prepend(li);
}
escList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-handled]");
  if (!button) return;
  button.closest("li").remove();
  document.querySelector("#esc-empty").hidden = escList.children.length > 0;
  window.RoadNaUI.preview("Marked as handled (preview, not saved). The supervisor would be told.");
});
