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
