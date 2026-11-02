"use strict";

// Presentation only: a visual cooldown on the "Resend link" button. Nothing is sent;
// ASP.NET will issue the real email and enforce the real cooldown.
const COOLDOWN_SECONDS = 47;
const button = document.querySelector("#resend-btn");
const label = document.querySelector("#resend-label");
const status = document.querySelector("#resend-status");
let timer = null;

const renderLabel = (seconds) => {
  label.textContent = seconds > 0 ? `Resend link (${seconds}s)` : "Resend link";
};

const startCooldown = () => {
  let remaining = COOLDOWN_SECONDS;
  button.disabled = true;
  renderLabel(remaining);
  window.clearInterval(timer);
  timer = window.setInterval(() => {
    remaining -= 1;
    renderLabel(remaining);
    if (remaining <= 0) {
      window.clearInterval(timer);
      button.disabled = false;
    }
  }, 1000);
};

button.addEventListener("click", () => {
  status.textContent = "Resend preview only. No email has been sent.";
  startCooldown();
});

startCooldown();

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelector(".auth-card").animate(
    [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
  );
}
