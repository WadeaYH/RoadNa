"use strict";

// Presentation only: a live password-strength hint and requirement checklist.
// The password is never stored or sent; ASP.NET will own validation and the update.
const input = document.querySelector("#new-password");
const meter = document.querySelector(".strength");
const meterText = document.querySelector("#strength-text");
const rules = {
  length: (v) => v.length >= 8,
  case: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  number: (v) => /\d/.test(v),
  symbol: (v) => /[^A-Za-z0-9]/.test(v),
};
const LABELS = ["Not entered", "Weak", "Fair", "Good", "Strong"];

const update = () => {
  const value = input.value;
  let met = 0;
  document.querySelectorAll("#requirements li").forEach((item) => {
    const ok = rules[item.dataset.rule](value);
    item.classList.toggle("is-met", ok);
    if (ok) met += 1;
  });
  const level = value ? Math.max(1, met) : 0;
  meter.dataset.level = String(level);
  meterText.textContent = LABELS[level];
  input.setCustomValidity(value && met < Object.keys(rules).length ? "Use at least 8 characters with upper and lower case letters, a number and a symbol." : "");
};
input.addEventListener("input", update);
update();

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelector(".auth-card").animate(
    [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 380, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
  );
}
