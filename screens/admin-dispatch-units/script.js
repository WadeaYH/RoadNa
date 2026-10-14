"use strict";

// Filters change the sample view. Assignments and automation belong to ASP.NET.
document.querySelectorAll("[data-assign]").forEach((button) => {
  button.addEventListener("click", () => {
    const select = button.closest(".task").querySelector("select");
    window.RoadNaUI.preview("Assignment to " + select.options[select.selectedIndex].text + " will be available when the service is connected. The sample queue and crew capacity remain unchanged.");
  });
});
const filter = document.querySelector("#unit-filter");
filter.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    filter.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    document.querySelectorAll(".unit").forEach((unit) => {
      unit.hidden = button.dataset.status !== "all" && unit.dataset.status !== button.dataset.status;
    });
  });
});
document.querySelector("#auto-assign").addEventListener("change", () => {
  window.RoadNaUI.preview("This switch previews the control only. Automatic assignment will be available when the service is connected.");
});
