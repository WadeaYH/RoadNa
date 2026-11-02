"use strict";

// Presentation only. Shared UI handles form preview feedback; the explicit preview
// link opens the Check Email screen. ASP.NET will send the real recovery email.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelector(".auth-card").animate(
    [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
  );
}
