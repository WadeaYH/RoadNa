"use strict";

// Presentation only. Forms show a confirmation toast and nothing is saved or sent;
// ASP.NET will persist profile, password and session changes.
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

// Sign out of another session (visual only)
document.querySelectorAll("[data-signout]").forEach((button) => {
  button.addEventListener("click", () => {
    window.RoadNaUI.preview("Device sign-out will be available when the service is connected. The sample session remains unchanged.");
  });
});

// Language + right-to-left preview
const langButtons = [...document.querySelectorAll("[data-lang]")];
const rtl = document.querySelector("#rtl-toggle");
const setDirection = (isRtl) => {
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  rtl.checked = isRtl;
};
langButtons.forEach((button) => {
  button.addEventListener("click", () => {
    langButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    const arabic = button.dataset.lang === "ar";
    // English sample copy remains English; this control previews layout direction only.
    document.documentElement.lang = "en";
    setDirection(arabic);
  });
});
rtl.addEventListener("change", () => setDirection(rtl.checked));

// Highlight the section being read
const links = [...document.querySelectorAll(".section-nav a")];
const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => {
        const on = a.getAttribute("href") === `#${entry.target.id}`;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-20% 0px -65% 0px" });
  sections.forEach((s) => s && observer.observe(s));
}
