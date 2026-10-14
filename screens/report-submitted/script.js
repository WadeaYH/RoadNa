"use strict";

// Presentation only: dialog focus handling, Escape to leave, and a "Copy" button for the
// reference number. ASP.NET will supply the real reference.
const modal = document.querySelector("#submitted-modal");
const dialog = modal.querySelector(".modal__dialog");
const title = document.querySelector("#submitted-title");
const copyButton = document.querySelector("#copy-btn");
const copyStatus = document.querySelector("#copy-status");

title.focus({ preventScroll: true });

// Keep Tab inside the dialog.
dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const focusable = [...dialog.querySelectorAll("a[href], button:not([disabled])")];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === title)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") window.location.href = "../home-menu/index.html";
});

copyButton.addEventListener("click", async () => {
  const text = document.querySelector(copyButton.dataset.copy).textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "Reference number copied.";
    copyButton.querySelector("span").textContent = "Copied";
  } catch {
    copyStatus.textContent = "Select the reference number and copy it manually.";
  }
  window.setTimeout(() => { copyButton.querySelector("span").textContent = "Copy"; }, 2000);
});
