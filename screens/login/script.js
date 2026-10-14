"use strict";

// Presentation only. ASP.NET will handle sign-in. In the preview any valid email and
// password open the chosen account: residents go home, municipal staff go to the dashboard.
const loginForm = document.querySelector(".login-form");
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const staff = loginForm.elements.account.value === "staff";
  window.location.assign(staff ? loginForm.dataset.nextStaff : loginForm.dataset.next);
});
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelector(".login-card").animate(
    [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }],
    { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
  );
}
