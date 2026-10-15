"use strict";

// Presentation only. Forms show a confirmation toast and nothing is saved or sent;
// ASP.NET will persist profile and password changes.
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

document.querySelectorAll("form[data-toast]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    showToast("Form preview only. No account changes have been saved.");
    if (form.querySelector('[type="password"]')) form.reset();
  });
});

// Avatar preview (in-memory object URL only)
const avatarInput = document.querySelector("#avatar-input");
const avatar = document.querySelector("#avatar-preview");
let avatarUrl = null;
avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file || !file.type.startsWith("image/")) return;
  if (avatarUrl) URL.revokeObjectURL(avatarUrl);
  avatarUrl = URL.createObjectURL(file);
  avatar.innerHTML = "";
  const img = document.createElement("img");
  img.src = avatarUrl;
  img.alt = "";
  avatar.append(img);
  showToast("Photo updated for this preview.");
});

window.addEventListener("pagehide", () => { if (avatarUrl) URL.revokeObjectURL(avatarUrl); });

// Language: Arabic previews the right-to-left layout; the English sample copy stays English.
const langButtons = [...document.querySelectorAll("[data-lang]")];
langButtons.forEach((button) => {
  button.addEventListener("click", () => {
    langButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    document.documentElement.lang = "en";
    document.documentElement.dir = button.dataset.lang === "ar" ? "rtl" : "ltr";
  });
});
