"use strict";

// Presentation only. Logging in picks a preview role (see shared/access.js); the login page always clears the old one. ASP.NET will handle sign-in. In the preview any valid email and
// password open the chosen account: residents go home, municipal staff go to the dashboard.
const loginForm = document.querySelector(".login-form");
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const staff = loginForm.elements.account.value === "staff";
  const role = staff ? loginForm.elements.staffRole.value : "resident";
  window.RoadNaAccess.set(role);
  window.location.assign(window.RoadNaAccess.home(role));
});
// The form stays visible from the first paint, including on slow connections.
document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => { button.textContent = button.getAttribute("aria-pressed") === "true" ? "Hide" : "Show"; });
});

window.RoadNaAccess?.clear();
const staffRole = document.querySelector("[data-staff-role]");
document.querySelectorAll('input[name="account"]').forEach((radio) => radio.addEventListener("change", () => { staffRole.hidden = loginForm.elements.account.value !== "staff"; }));
document.querySelectorAll("[data-role]").forEach((link) => link.addEventListener("click", () => window.RoadNaAccess.set(link.dataset.role)));
