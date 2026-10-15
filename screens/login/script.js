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
// The form stays visible from the first paint, including on slow connections.
document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => { button.textContent = button.getAttribute("aria-pressed") === "true" ? "Hide" : "Show"; });
});
