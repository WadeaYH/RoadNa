"use strict";

// Presentation-only behaviour shared by every screen: responsive menus, scroll shadow,
// and reveal-on-scroll. No data, storage, or network access lives here.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // A common preview dialog gives backend-only controls useful, honest UI feedback.
  const preview = document.createElement("dialog");
  preview.className = "preview-dialog";
  preview.setAttribute("aria-labelledby", "preview-dialog-title");
  preview.setAttribute("aria-describedby", "preview-dialog-message");
  preview.innerHTML = '<h2 id="preview-dialog-title">Frontend preview</h2><p id="preview-dialog-message"></p><div class="preview-dialog__actions"><a class="btn btn--primary" data-preview-next hidden></a><form method="dialog"><button class="btn btn--outline" autofocus>Close</button></form></div>';
  document.body.append(preview);
  let trigger = null;
  window.RoadNaUI = {
    preview(message, next = null) {
      if (!preview.open) trigger = document.activeElement;
      preview.querySelector("p").textContent = message;
      const link = preview.querySelector("[data-preview-next]");
      link.hidden = !next;
      link.removeAttribute("href");
      if (next) {
        link.href = next.href;
        link.textContent = next.label || "Continue preview";
      }
      if (!preview.open) preview.showModal();
    },
  };
  preview.addEventListener("close", () => trigger?.focus({ preventScroll: true }));
  document.querySelectorAll("[data-preview-action]").forEach((button) => {
    button.addEventListener("click", () => window.RoadNaUI.preview(button.dataset.previewAction));
  });
  // Top-bar search opens the matching list with the query filled in:
  // staff search the incident queue, residents search their own reports.
  document.querySelectorAll(".topbar__search input").forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const staff = Boolean(input.closest(".app-shell--admin"));
      const target = new URL(staff ? "../../admin/review-assign/review-assign.html" : "../../resident/my-reports/my-reports.html", window.location.href);
      if (input.value.trim()) target.searchParams.set("q", input.value.trim());
      window.location.assign(target);
    });
  });

  // Public header: collapsible menu on small screens + shadow once the page scrolls.
  document.querySelectorAll(".site-header").forEach((header) => {
    const toggle = header.querySelector(".nav-toggle");
    const mobileHeader = window.matchMedia("(max-width: 880px)");
    const setOpen = (open) => {
      header.classList.toggle("is-open", open);
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
    };
    if (toggle) {
      toggle.addEventListener("click", () => setOpen(!header.classList.contains("is-open")));
      header.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && header.classList.contains("is-open")) {
          setOpen(false);
          toggle.focus();
        }
      });
    }
    header.querySelectorAll(".site-nav a, .site-actions a").forEach((link) => {
      link.addEventListener("click", () => {
        setOpen(false);
        const destination = new URL(link.href, window.location.href);
        if (mobileHeader.matches && destination.pathname === window.location.pathname && destination.hash) {
          const target = document.getElementById(destination.hash.slice(1));
          if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
        }
      });
    });
    mobileHeader.addEventListener("change", () => {
      const focusedMenu = header.querySelector(".site-nav")?.contains(document.activeElement) || header.querySelector(".site-actions")?.contains(document.activeElement);
      setOpen(false);
      if (mobileHeader.matches && focusedMenu) toggle?.focus();
    });
    const syncShadow = () => header.classList.toggle("is-scrolled", window.scrollY > 4);
    syncShadow();
    window.addEventListener("scroll", syncShadow, { passive: true });
  });

  // App shell: the sidebar becomes an off-canvas drawer on small screens.
  const shell = document.querySelector(".app-shell");
  const drawerToggles = document.querySelectorAll("[data-sidebar-toggle]");
  if (shell && drawerToggles.length) {
    const sidebar = document.querySelector("#app-sidebar");
    const main = document.querySelector(".app-main");
    const topbar = document.querySelector(".app-topbar, .admin-header");
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "icon-btn sidebar__close";
    closeButton.setAttribute("aria-label", "Close navigation menu");
    closeButton.setAttribute("data-sidebar-close", "");
    closeButton.innerHTML = '<span aria-hidden="true">×</span>';
    sidebar.prepend(closeButton);
    const isMobile = window.matchMedia("(max-width: 1024px)");
    let oldOverflow = "";
    const setDrawer = (open) => {
      shell.classList.toggle("is-drawer-open", open);
      drawerToggles.forEach((button) => button.setAttribute("aria-expanded", String(open)));
      sidebar.inert = isMobile.matches && !open;
      if (open) { sidebar.setAttribute("role", "dialog"); sidebar.setAttribute("aria-modal", "true"); }
      else { sidebar.removeAttribute("role"); sidebar.removeAttribute("aria-modal"); }
      if (open) {
        main.inert = true;
        if (topbar) topbar.inert = true;
        oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeButton.focus();
      } else {
        document.body.style.overflow = oldOverflow;
        main.inert = false;
        if (topbar) topbar.inert = false;
      }
    };
    sidebar.inert = isMobile.matches;
    isMobile.addEventListener("change", () => {
      const focusedSidebar = sidebar.contains(document.activeElement);
      const focusedClose = document.activeElement === closeButton;
      setDrawer(false);
      if (isMobile.matches && focusedSidebar) drawerToggles[0].focus();
      else if (!isMobile.matches && focusedClose) sidebar.querySelector("a[href]")?.focus();
    });
    drawerToggles.forEach((button) => button.addEventListener("click", () => setDrawer(!shell.classList.contains("is-drawer-open"))));
    document.querySelectorAll("[data-sidebar-close]").forEach((el) => el.addEventListener("click", () => { setDrawer(false); drawerToggles[0].focus(); }));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !preview.open && shell.classList.contains("is-drawer-open")) {
        setDrawer(false);
        drawerToggles[0].focus();
      }
      if (event.key === "Tab" && !preview.open && shell.classList.contains("is-drawer-open")) {
        const controls = [...sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  // Arrow keys move between sample filters; one active filter is in the Tab order.
  document.querySelectorAll(".tabs").forEach((group) => {
    const filters = [...group.querySelectorAll("button[data-filter]")];
    const sync = () => filters.forEach((button) => { button.tabIndex = button.getAttribute("aria-pressed") === "true" ? 0 : -1; });
    sync();
    group.addEventListener("click", (event) => {
      const chosen = event.target.closest("button[data-filter]");
      if (chosen) filters.forEach((button) => { button.tabIndex = button === chosen ? 0 : -1; });
    });
    group.addEventListener("keydown", (event) => {
      const index = filters.indexOf(document.activeElement);
      if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const rtl = document.documentElement.dir === "rtl";
      const direction = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
      const next = event.key === "Home" ? 0 : event.key === "End" ? filters.length - 1 : (index + direction + filters.length) % filters.length;
      filters[next].focus();
      filters[next].click();
    });
  });

  // Password visibility toggles: <button data-toggle-password="#input-id" aria-pressed="false">
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    const input = document.querySelector(button.dataset.togglePassword);
    if (!input) return;
    button.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  // Confirm-password check (UI hint only): <input data-match="#password">
  document.querySelectorAll("[data-match]").forEach((input) => {
    const source = document.querySelector(input.dataset.match);
    if (!source) return;
    const check = () => input.setCustomValidity(input.value && input.value !== source.value ? "Passwords do not match." : "");
    input.addEventListener("input", check);
    source.addEventListener("input", check);
  });

  // Forms are previews: once the fields are valid, go straight to the next screen in the flow.
  // Nothing is submitted or saved.
  document.querySelectorAll("form[data-next]:not(.login-form)").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;
      window.location.assign(form.dataset.next);
    });
  });

  // Block ordinary form navigation until ASP.NET owns submission.
  document.querySelectorAll('form:not([method="dialog"])').forEach((form) => {
    form.addEventListener("submit", (event) => event.preventDefault());
  });

  // Staggered entrance: give each child of [data-stagger] an index for the cascade delay.
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    [...group.children].forEach((child, index) => child.style.setProperty("--index", String(Math.min(index, 9))));
  });

  // Reveal-on-scroll. Only content that starts below the fold is hidden, so nothing flashes
  // and the page stays fully readable if this script never runs.
  const items = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window) || !items.length) return;

  const viewportBottom = window.innerHeight;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  items.forEach((item) => {
    if (item.getBoundingClientRect().top < viewportBottom) return;
    const delay = item.getAttribute("data-reveal-delay");
    if (delay) item.style.transitionDelay = `${delay}ms`;
    item.classList.add("reveal-hide");
    observer.observe(item);
  });
})();

// Sample dates count from today, so the preview never shows a voting deadline that has already passed.
// data-days is days from today (negative = in the past); ASP.NET will send real dates instead.
(() => {
  const label = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("en", { month: "short", day: "numeric" });
  document.querySelectorAll("[data-days]").forEach((el) => {
    const n = Number(el.dataset.days);
    const day = label(n);
    if (el.matches("form")) el.dataset.end = day;
    else if ("until" in el.dataset) el.textContent = el.textContent.replace(/until [A-Z][a-z]{2} \d+/, `until ${day}`);
    else el.textContent = n >= 0 ? `Closes ${day} · ${n} day${n === 1 ? "" : "s"} left` : `Closed ${day}${el.dataset.suffix || ""}`;
  });
})();
