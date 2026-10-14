"use strict";

// Presentation only. Password toggles, the confirm-password hint and form preview
// feedback are handled by ../../shared/ui.js; ASP.NET will own account creation.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelector(".auth-card").animate(
    [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
  );
}
