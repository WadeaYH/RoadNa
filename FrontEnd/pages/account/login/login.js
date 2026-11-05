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
  const backToVote = new URLSearchParams(window.location.search).get("next") === "vote" && role === "resident";
  window.location.assign(backToVote ? "../../public/landing/landing.html#proposal" : window.RoadNaAccess.home(role));
});
// The form stays visible from the first paint, including on slow connections.
document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => { button.textContent = button.getAttribute("aria-pressed") === "true" ? "Hide" : "Show"; });
});

window.RoadNaAccess?.clear();
const staffRole = document.querySelector("[data-staff-role]");
document.querySelectorAll('input[name="account"]').forEach((radio) => radio.addEventListener("change", () => { staffRole.hidden = loginForm.elements.account.value !== "staff"; }));
document.querySelectorAll("[data-role]").forEach((link) => link.addEventListener("click", () => window.RoadNaAccess.set(link.dataset.role)));

// Arriving from the account menu: confirm the sign-out, or open the preview roles to pick another
const loginParams = new URLSearchParams(window.location.search);
const loginNotice = document.getElementById("signed-out");
if (loginParams.get("next") === "vote") loginNotice.textContent = "Log in to count your vote. You come straight back to it.";
loginNotice.hidden = !loginParams.has("signed-out") && loginParams.get("next") !== "vote";
if (loginParams.has("switch")) {
  const demo = document.querySelector("details.demo-access");
  demo.open = true;
  demo.scrollIntoView({ block: "center" });
  demo.querySelector("summary").focus({ preventScroll: true });
}
