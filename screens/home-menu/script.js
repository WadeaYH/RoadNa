"use strict";

// Presentation only. The upvote buttons toggle locally so the interaction can be seen;
// ASP.NET will record real votes.
document.querySelectorAll(".vote-btn").forEach((button) => {
  const label = button.querySelector("span");
  const base = Number(button.dataset.votes);
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    // Visual selection only; the sample count remains unchanged.
  });
});

// Progress segments settle in once on load.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(".mini-steps li").forEach((step, index) => {
    step.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
      duration: 420, delay: 120 + (index % 4) * 70, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "backwards",
    });
  });
}
