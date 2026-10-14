"use strict";

// Presentation only: the success mark pops in once. No data is read or stored.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelector(".success-mark").animate(
    [
      { opacity: 0, transform: "scale(.6)" },
      { opacity: 1, transform: "scale(1.08)", offset: 0.65 },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: 620, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", delay: 120, fill: "backwards" },
  );
  document.querySelector(".auth-card").animate(
    [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
  );
}
