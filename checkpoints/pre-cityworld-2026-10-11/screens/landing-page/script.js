"use strict";

// Presentation only: the hero pins swap which sample incident is shown, and the
// headline metrics count up once. No data is read or stored.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Hero map pins -> incident cards
const pins = document.querySelectorAll(".map-pin");
const cards = document.querySelectorAll(".incident-card");

pins.forEach((pin) => {
  pin.addEventListener("click", () => {
    const targetId = pin.dataset.incident;
    pins.forEach((p) => p.setAttribute("aria-pressed", String(p === pin)));
    cards.forEach((card) => {
      const show = card.id === targetId;
      card.hidden = !show;
      card.classList.toggle("is-entering", show && !reduceMotion);
    });
  });
});

// Metric count-up (first time the metrics scroll into view)
const counters = document.querySelectorAll("[data-count-to]");
const format = (value, style) => (style === "comma" ? value.toLocaleString("en-US") : String(value));

const runCounter = (el) => {
  const target = Number(el.dataset.countTo);
  const style = el.dataset.format;
  const duration = 1100;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = format(Math.round(target * eased), style);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

if (counters.length && !reduceMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      runCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => observer.observe(el));
}

// The skip link moves keyboard focus to the story's reporting conclusion.
document.querySelector(".road-story__skip")?.addEventListener("click", () => {
  document.getElementById("story-solution")?.focus({ preventScroll: true });
});
