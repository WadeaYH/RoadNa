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
