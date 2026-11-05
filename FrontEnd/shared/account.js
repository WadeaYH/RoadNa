"use strict";

// Native constraints remain on the fields; this adds persistent, accessible inline feedback.
// Submission/navigation stays with the existing shared UI and page scripts.
(() => {
  document.querySelectorAll("form[data-account-form]").forEach((form) => {
    form.querySelector('button[type="submit"]').disabled = false;
    const fields = [...form.querySelectorAll("input:not([type=radio])")];
    const summary = form.querySelector("[data-error-summary]");
    let submitted = false;
    const message = (input) => {
      if (input.name === "confirmPassword" && input.value !== form.elements.password.value) return "Your passwords do not match.";
      if (input.type === "checkbox" && !input.checked) return "Please confirm that you live or operate a business in the municipality.";
      if (input.required && !input.value.trim()) return input.name === "fullName" ? "Enter your full name." : input.type === "email" ? "Enter your email address." : "Enter your password.";
      if (input.validity.typeMismatch) return "Enter an email address such as name@example.com.";
      if (input.minLength > 0 && input.value.length < input.minLength) return `Use at least ${input.minLength} characters.`;
      return "";
    };
    const check = (input) => {
      const error = message(input);
      const output = document.getElementById(`${input.id}-error`);
      input.setAttribute("aria-invalid", String(Boolean(error)));
      if (output) { output.textContent = error; output.hidden = !error; }
      return !error;
    };
    fields.forEach((input) => {
      input.addEventListener("blur", () => { if (input.value || submitted) check(input); });
      input.addEventListener("input", () => {
        if (submitted || input.getAttribute("aria-invalid") === "true") check(input);
        if (input.name === "password" && form.elements.confirmPassword?.value) check(form.elements.confirmPassword);
        if (submitted && fields.every((field) => !message(field))) summary.hidden = true;
      });
    });
    form.noValidate = true;
    form.addEventListener("submit", (event) => {
      submitted = true;
      const valid = fields.map(check).every(Boolean);
      if (!valid) {
        event.preventDefault();
        event.stopImmediatePropagation();
        summary.textContent = "Please check the highlighted fields below.";
        summary.hidden = false;
        fields.find((input) => input.getAttribute("aria-invalid") === "true")?.focus();
      } else summary.hidden = true;
    }, true);
  });
})();

// Account pages come alive: a small street in the side panel (lamps, a car, a pin dropping on the
// municipality), a road strip on top of the card for phones, staggered entrances, and a shake on a
// form that cannot be sent yet. Decoration only, hidden from screen readers; still under reduced motion.
(() => {
  const context = document.querySelector(".account-context");
  const panel = document.querySelector(".account-panel");
  if (!panel) return;
  const STREET = `<svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMax slice" focusable="false">
      <g fill="#1d5c5f"><rect x="8" y="44" width="54" height="78" rx="3"/><rect x="70" y="64" width="40" height="58" rx="3"/><rect x="214" y="30" width="64" height="92" rx="3"/><rect x="284" y="58" width="36" height="64" rx="3"/></g>
      <g class="st-windows" fill="#f2c46b"><rect x="18" y="56" width="9" height="9" rx="1.5"/><rect x="40" y="70" width="9" height="9" rx="1.5"/><rect x="18" y="86" width="9" height="9" rx="1.5"/><rect x="226" y="44" width="10" height="10" rx="1.5"/><rect x="252" y="62" width="10" height="10" rx="1.5"/><rect x="226" y="82" width="10" height="10" rx="1.5"/><rect x="80" y="76" width="8" height="8" rx="1.5"/></g>
      <g transform="translate(118 50)"><rect x="0" y="22" width="84" height="50" fill="#e9f3f1"/><path d="M-6 24L42 0L90 24Z" fill="#f2a33a"/><g fill="#bcd6d1"><rect x="10" y="32" width="8" height="34"/><rect x="26" y="32" width="8" height="34"/><rect x="50" y="32" width="8" height="34"/><rect x="66" y="32" width="8" height="34"/></g><rect x="36" y="44" width="12" height="28" rx="6" fill="#154a4d"/></g>
      <g class="st-pin"><path d="M160 6c-8.3 0-15 6.6-15 14.8C145 32 160 46 160 46s15-14 15-25.2C175 12.6 168.3 6 160 6z" fill="#ffffff"/><circle cx="160" cy="20.5" r="5.5" fill="#154a4d"/></g>
      <g stroke="#3f6f70" stroke-width="2"><path d="M40 122V96M286 122V96"/></g>
      <g class="st-lamps"><circle cx="40" cy="94" r="4" fill="#f2c46b"/><circle cx="286" cy="94" r="4" fill="#f2c46b"/><circle class="st-glow" cx="40" cy="94" r="12" fill="#f2c46b"/><circle class="st-glow" cx="286" cy="94" r="12" fill="#f2c46b"/></g>
      <rect y="122" width="320" height="28" fill="#2f3a3d"/>
      <rect y="120" width="320" height="3" fill="#7fa8a2"/>
      <g class="st-lane"><path d="M0 136H352" stroke="#e9e5d2" stroke-width="2.5" stroke-dasharray="14 12"/></g>
      <g class="st-car"><rect x="0" y="124" width="30" height="11" rx="4" fill="#f2a33a"/><rect x="18" y="126" width="7" height="5" rx="1.5" fill="#7a4a07"/><circle cx="7" cy="136" r="3" fill="#111"/><circle cx="23" cy="136" r="3" fill="#111"/></g>
    </svg>`;
  if (context) {
    const street = document.createElement("div");
    street.className = "acct-street";
    street.setAttribute("aria-hidden", "true");
    street.innerHTML = STREET;
    context.append(street);
  }
  const strip = document.createElement("div");
  strip.className = "acct-strip";
  strip.setAttribute("aria-hidden", "true");
  strip.innerHTML = "<i></i>";
  panel.prepend(strip);

  // Staggered entrance order for the panel's own pieces
  [...(context?.children || [])].forEach((el, i) => el.style.setProperty("--i", i));
  panel.querySelectorAll(".account-heading, .account-form > *, .account-switch, .demo-access, .login-notice").forEach((el, i) => el.style.setProperty("--i", i));
  document.body.classList.add("acct-anim");

  // A form that cannot be sent yet shakes once
  document.querySelectorAll(".account-form").forEach((form) => {
    form.addEventListener("invalid", () => {
      form.classList.remove("is-shake");
      void form.offsetWidth;
      form.classList.add("is-shake");
    }, true);
  });
})();
