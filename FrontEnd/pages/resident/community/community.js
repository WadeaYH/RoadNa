"use strict";

// Presentation only. Voting is a visual preview: one choice per proposal, changeable until the
// end date. Results are shown only on closed proposals. ASP.NET will record real votes and close
// proposals automatically on their end date.
const props = [...document.querySelectorAll(".prop")];
const tabs = [...document.querySelectorAll(".tab")];

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const filter = tab.dataset.filter;
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-pressed", String(on));
    });
    props.forEach((prop) => { prop.hidden = filter !== "all" && prop.dataset.state !== filter; });
  });
});

document.querySelectorAll(".prop__vote").forEach((form) => {
  const button = form.querySelector('button[type="submit"]');
  const meta = form.querySelector(".prop__meta");
  const end = form.dataset.end;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const choice = form.querySelector("input:checked");
    if (!choice) { meta.textContent = "Choose one option first."; return; }
    button.textContent = "Change my vote";
    button.classList.remove("btn--primary");
    button.classList.add("btn--outline");
    meta.textContent = `You voted: ${choice.value}. You can change it until ${end}. (Preview only, nothing is saved.)`;
  });
});
