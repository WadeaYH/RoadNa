"use strict";

// Presentation only. Publishing and deciding update this page so the flow can be seen; nothing is
// saved. ASP.NET will store proposals, close them on their end date and keep counts hidden until then.
const toast = document.querySelector("#toast");
let toastTimer = null;
const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  toast.style.animation = "none";
  void toast.offsetWidth;
  toast.style.animation = "";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
};

const form = document.querySelector("#publish-form");
const optionsBox = document.querySelector("#p-options");
const addOption = document.querySelector("#add-option");
const endInput = document.querySelector("#p-end");
const error = document.querySelector("#p-error");
const list = document.querySelector("#props");
const dayMs = 24 * 60 * 60 * 1000;

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
endInput.min = iso(new Date(startOfToday().getTime() + dayMs));

const fail = (message) => { error.textContent = message; error.hidden = false; };

addOption.addEventListener("click", () => {
  const count = optionsBox.querySelectorAll("input").length;
  if (count >= 4) return;
  const input = document.createElement("input");
  input.className = "input";
  input.type = "text";
  input.maxLength = 60;
  input.placeholder = `Choice ${count + 1}`;
  input.setAttribute("aria-label", `Choice ${count + 1}`);
  optionsBox.insertBefore(input, addOption);
  input.focus();
  if (count + 1 >= 4) addOption.hidden = true;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  error.hidden = true;
  const title = document.querySelector("#p-title").value.trim();
  const text = document.querySelector("#p-text").value.trim();
  const choices = [...optionsBox.querySelectorAll("input")].map((i) => i.value.trim()).filter(Boolean);
  if (!title) return fail("Write the question residents will vote on.");
  if (!text) return fail("Add a sentence explaining the proposal.");
  if (choices.length < 2) return fail("Add at least two choices.");
  if (new Set(choices.map((c) => c.toLowerCase())).size !== choices.length) return fail("Each choice must be different.");
  if (!endInput.value) return fail("Pick the date voting closes.");
  const end = new Date(`${endInput.value}T00:00:00`);
  const days = Math.round((end - startOfToday()) / dayMs);
  if (days < 1) return fail("The closing date must be in the future.");

  const item = document.createElement("li");
  item.className = "prop prop--new";
  item.dataset.state = "open";
  const head = document.createElement("header");
  head.className = "prop__head";
  const chip = document.createElement("span");
  chip.className = "chip chip--assigned";
  chip.textContent = "Open for voting";
  const when = document.createElement("span");
  when.className = "prop__when";
  when.textContent = `Closes ${end.toLocaleDateString("en", { month: "short", day: "numeric" })} · ${days} day${days === 1 ? "" : "s"} left`;
  head.append(chip, when);
  const h3 = document.createElement("h3");
  h3.className = "prop__title";
  h3.textContent = title;
  const p = document.createElement("p");
  p.className = "prop__text";
  p.textContent = `${choices.length} choices. Vote counts stay hidden until voting closes.`;
  const detail = document.createElement("p");
  detail.className = "prop__text";
  detail.textContent = text;
  item.append(head, h3, detail, p);
  list.prepend(item);
  item.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  form.reset();
  optionsBox.querySelectorAll("input").forEach((input, i) => { if (i >= 2) input.remove(); });
  addOption.hidden = false;
  showToast("Published (preview). Residents would see it now.");
});

// Post a decision on a closed proposal.
list.addEventListener("submit", (event) => {
  const decide = event.target.closest(".decide");
  if (!decide) return;
  event.preventDefault();
  const choice = decide.querySelector("input:checked");
  const message = decide.querySelector("textarea").value.trim();
  if (!choice) { showToast("Choose a decision first."); return; }
  if (!message) { decide.querySelector("textarea").focus(); showToast("Add a message for residents."); return; }
  const prop = decide.closest(".prop");
  const chip = prop.querySelector(".chip");
  chip.className = "chip chip--resolved";
  chip.textContent = "Decided";
  prop.dataset.state = "decided";
  delete prop.dataset.needsDecision;
  const box = document.createElement("div");
  box.className = "decision";
  const tag = document.createElement("p");
  tag.className = "decision__tag";
  tag.textContent = `Decision posted ${new Date().toLocaleDateString("en", { month: "short", day: "numeric" })}`;
  const body = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = `${choice.value}. `;
  body.append(strong, document.createTextNode(message));
  box.append(tag, body);
  decide.replaceWith(box);
  // A decision to go ahead gets a next step, so it does not stop at words
  if (/ahead/i.test(choice.value)) {
    const title = prop.querySelector(".prop__title").textContent.replace(/\?$/, "");
    const next = document.createElement("div");
    next.className = "next-step";
    next.innerHTML = '<p><strong>Next step.</strong> Turn the decision into work:</p><div class="next-step__actions"><a class="btn btn--outline btn--sm" data-next="add">Create a report for review</a><a class="btn btn--outline btn--sm" data-next="fund">Open a funding campaign</a></div>';
    next.querySelector('[data-next="add"]').href = `../../admin/review-assign/review-assign.html?add=${encodeURIComponent(title)}`;
    next.querySelector('[data-next="fund"]').href = `../../admin/funding/funding.html?proposal=${encodeURIComponent(title)}`;
    box.after(next);
  }
  showToast("Decision posted (preview). Residents are notified on the proposal page.");
});
