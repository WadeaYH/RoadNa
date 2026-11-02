"use strict";

// Native HTML fields and shared account validation are available immediately.
document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    button.textContent = button.getAttribute("aria-pressed") === "true" ? "Hide" : "Show";
  });
});
