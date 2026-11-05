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
    (sidebar.querySelector(".sidebar__top") || sidebar).append(closeButton);
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

// Account menu: the avatar in every console, resident and field-team header opens a small
// "direction sign" with the person's own links and Sign out. Without JavaScript the header
// links keep working (profile, or the log-out icon). Disclosure pattern, not an ARIA menu,
// so the links stay ordinary links in the tab order.
(() => {
  // Paths copied from the project's icon sprites, so every header shows the same glyphs
  const ICON = {
    profile: ["0 0 24 24", '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>'],
    list: ["0 0 24 24", '<path d="M19 5v14H5V5h14m1.1-2H3.9c-.5 0-.9.4-.9.9v16.2c0 .4.4.9.9.9h16.2c.4 0 .9-.5.9-.9V3.9c0-.5-.5-.9-.9-.9zM11 7h6v2h-6V7zm0 4h6v2h-6v-2zm0 4h6v2h-6v-2zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2z"/>'],
    money: ["0 0 24 24", '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>'],
    help: ["0 0 24 24", '<path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>'],
    home: ["0 0 24 24", '<path d="M3 11 12 3.5 21 11V20.5H14.5V14.5H9.5V20.5H3Z"/>'],
    swap: ["0 0 11 14", '<path d="M2.66667 7.33333V2.55L0.95 4.26667L0 3.33333L3.33333 0L6.66667 3.33333L5.71667 4.26667L4 2.55V7.33333H2.66667ZM7.33333 13.3333L4 10L4.95 9.06667L6.66667 10.7833V6H8V10.7833L9.71667 9.06667L10.6667 10L7.33333 13.3333Z"/>'],
    logout: ["0 0 24 24", '<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>'],
    arrow: ["0 0 14 14", '<path d="M10.1458 7.5H0V5.83333H10.1458L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z"/>'],
  };
  const svg = (name, size = 20, cls = "icon") => `<svg class="${cls}" width="${size}" height="${size}" viewBox="${ICON[name][0]}" aria-hidden="true" focusable="false">${ICON[name][1]}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const access = () => window.RoadNaAccess;
  const HELP = { label: "Help and policies", href: "../../public/help/help.html", icon: "help" };
  const SWITCH = { label: "Switch role", href: "../../account/login/login.html?switch=1", icon: "swap" };

  // Which header is on this page decides what the sign says
  let kind = null, trigger = null;
  const resident = document.querySelector("header .user-chip");
  const consoleChip = document.querySelector(".sidebar .role-chip, .admin-header .role-chip");
  const teamOut = document.querySelector('.team-bar a.icon-btn[href*="login"]');
  if (resident) {
    kind = "resident";
    trigger = document.createElement("button");
    trigger.className = resident.className;
    if (resident.getAttribute("aria-current")) trigger.classList.add("is-current");
    trigger.append(...resident.childNodes);
    resident.replaceWith(trigger);
  } else if (consoleChip) {
    kind = "console";
    const avatar = consoleChip.nextElementSibling?.classList.contains("avatar") ? consoleChip.nextElementSibling : null;
    // A button holds phrasing content only: the <p> becomes a <span> with the same class (access.js fills it in later)
    const chip = document.createElement("span");
    chip.className = consoleChip.className;
    chip.append(...consoleChip.childNodes);
    trigger = document.createElement("button");
    trigger.className = "acct-btn--console";
    consoleChip.replaceWith(trigger);
    trigger.append(chip);
    if (avatar) trigger.append(avatar);
    // It opens upward from the foot of the sidebar
    trigger.insertAdjacentHTML("beforeend", svg("arrow", 14, "icon acct-btn__chev"));
  } else if (teamOut) {
    kind = "team";
    trigger = document.createElement("button");
    trigger.className = "acct-btn--team";
    trigger.innerHTML = '<span class="avatar avatar--slate" data-team-initials></span>';
    teamOut.replaceWith(trigger);
  }
  if (!trigger) return;

  const teamPerson = () => {
    const W = window.RoadNaWork;
    const member = /member/i.test(document.getElementById("role-name")?.textContent || "") || access()?.role === "team_member";
    const p = W?.team?.[member ? "member" : "leader"] || { name: member ? "Team member" : "Team leader", initials: "TM" };
    return { ...p, sub: `${member ? "Team member" : "Team leader"}${W?.team?.name ? `, ${W.team.name}` : ""}`, member };
  };

  trigger.type = "button";
  trigger.classList.add("acct-btn");
  trigger.id = "acct-btn";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "acct-menu");
  // Keep the visible name as the button's name; screen readers also hear what it opens
  if (kind === "team") trigger.setAttribute("aria-label", "Your account");
  else trigger.insertAdjacentHTML("beforeend", '<span class="sr-only">, account menu</span>');
  const wrap = document.createElement("div");
  wrap.className = `acct acct--${kind}`;
  trigger.replaceWith(wrap);
  wrap.append(trigger);
  const menu = document.createElement("div");
  menu.className = "acct-menu";
  menu.id = "acct-menu";
  menu.hidden = true;
  wrap.append(menu);
  // The team page knows its role only after its own script runs
  document.addEventListener("DOMContentLoaded", () => {
    const slot = trigger.querySelector("[data-team-initials]");
    if (slot) slot.textContent = teamPerson().initials;
  });

  // The person and links are read when the sign opens, so they always match the preview role
  function build() {
    let who, sub, initials, links;
    if (kind === "resident") {
      who = "Lina Obeidat"; sub = "Resident account"; initials = trigger.querySelector(".avatar")?.textContent.trim() || "LO";
      links = [
        { label: "Profile and settings", href: "../../resident/profile/profile.html", icon: "profile" },
        { label: "My reports", href: "../../resident/my-reports/my-reports.html", icon: "list" },
        { label: "My donations", href: "../../resident/donations/donations.html?tab=mine", icon: "money" },
        HELP,
      ];
    } else if (kind === "console") {
      const chip = trigger.querySelector(".role-chip");
      who = chip.querySelector("strong")?.textContent.trim() || "Municipal staff";
      sub = [...chip.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() || "Operations console";
      initials = trigger.querySelector(".avatar")?.textContent.trim() || "";
      // The sidebar already lists the work screens, so the sign keeps only the account lines
      links = [HELP, SWITCH];
    } else {
      const p = teamPerson();
      who = p.name; sub = p.sub; initials = p.initials;
      links = [{ label: "My tasks", href: `../../team/tasks/tasks.html?as=${p.member ? "member" : "leader"}`, icon: "list" }, HELP, SWITCH];
    }
    const item = (l, extra = "") => {
      const url = new URL(l.href, window.location.href);
      const current = url.pathname === window.location.pathname && (!url.search || window.location.search === url.search);
      return `<a class="acct-menu__item${extra}" href="${esc(l.href)}"${current ? ' aria-current="page"' : ""}>${svg(l.icon)}<span>${esc(l.label)}</span>${svg("arrow", 14, "icon acct-menu__arrow")}</a>`;
    };
    menu.innerHTML = `<div class="acct-menu__plate"><div class="acct-menu__face">`
      + `<div class="acct-menu__head"><span class="acct-menu__avatar" aria-hidden="true">${esc(initials)}</span><span class="acct-menu__who"><strong>${esc(who)}</strong><small>${esc(sub)}</small></span></div>`
      + `<nav class="acct-menu__links" aria-label="Your account">${links.map((l) => item(l)).join("")}</nav>`
      + `<span class="acct-menu__lane" aria-hidden="true"></span>`
      + item({ label: "Sign out", href: "../../account/login/login.html?signed-out=1", icon: "logout" }, " acct-menu__item--exit")
      + `</div></div>`;
    // Each line slides in a beat after the one above it
    menu.querySelectorAll(".acct-menu__item").forEach((a, i) => a.style.setProperty("--i", i));
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let closing = 0;
  function open() {
    window.clearTimeout(closing);
    build();
    menu.classList.remove("is-closing");
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    menu.querySelector("a")?.focus({ preventScroll: true });
  }
  function close(returnFocus = false) {
    if (menu.hidden || trigger.getAttribute("aria-expanded") === "false") return;
    trigger.setAttribute("aria-expanded", "false");
    if (returnFocus) trigger.focus({ preventScroll: true });
    if (reduce.matches) { menu.hidden = true; return; }
    menu.classList.add("is-closing");
    closing = window.setTimeout(() => { menu.hidden = true; menu.classList.remove("is-closing"); }, 160);
  }
  trigger.addEventListener("click", () => (trigger.getAttribute("aria-expanded") === "true" ? close() : open()));
  trigger.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" && menu.hidden) { e.preventDefault(); open(); } });
  menu.addEventListener("keydown", (e) => {
    const items = [...menu.querySelectorAll("a")];
    const i = items.indexOf(document.activeElement);
    const go = (n) => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
    if (e.key === "Escape") { e.preventDefault(); close(true); }
    else if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
  });
  // Signing out forgets the preview role for this tab
  menu.addEventListener("click", (e) => { if (e.target.closest(".acct-menu__item--exit")) access()?.clear(); });
  document.addEventListener("pointerdown", (e) => { if (!wrap.contains(e.target)) close(); });
  wrap.addEventListener("focusout", (e) => { if (e.relatedTarget && !wrap.contains(e.relatedTarget)) close(); });
})();

// Sign sidebar: a short amber lane marker glides to the link under the pointer or the keyboard
// focus, and settles back beside the current screen. Transform only; still under reduced motion.
(() => {
  const face = document.querySelector(".sidebar--sign .sidebar__face");
  if (!face) return;
  const marker = document.createElement("span");
  marker.className = "sign-marker";
  marker.setAttribute("aria-hidden", "true");
  face.prepend(marker);
  const here = () => face.querySelector('.nav-item[aria-current="page"]');
  const place = (item) => {
    if (!item || !item.offsetParent) { marker.classList.remove("is-on"); return; }
    const f = face.getBoundingClientRect(), r = item.getBoundingClientRect();
    marker.style.height = `${Math.max(12, r.height - 16)}px`;
    marker.style.transform = `translateY(${r.top - f.top + face.scrollTop + 8}px)`;
    marker.classList.add("is-on");
  };
  const settle = () => place(here());
  face.addEventListener("pointerover", (e) => { const item = e.target.closest(".nav-item"); if (item) place(item); });
  face.querySelectorAll("nav").forEach((nav) => nav.addEventListener("pointerleave", settle));
  face.addEventListener("focusin", (e) => { const item = e.target.closest(".nav-item"); if (item) place(item); });
  face.addEventListener("focusout", (e) => { if (!e.relatedTarget?.closest?.(".sidebar--sign .nav-item")) settle(); });
  // access.js reorders the links for the role on DOMContentLoaded; place the marker after that, without a fly-in
  // (no requestAnimationFrame here: it never fires in a background tab, which left the marker unplaced)
  document.addEventListener("DOMContentLoaded", () => { settle(); window.setTimeout(() => marker.classList.add("is-ready"), 80); });
  window.addEventListener("load", settle);
  window.addEventListener("resize", settle);
  document.querySelectorAll("[data-sidebar-toggle]").forEach((b) => b.addEventListener("click", settle));
})();


// Resident road pill: three amber lane dashes sit under the current link and glide under the one
// you point at or tab to, then return. Transform only; still under reduced motion.
(() => {
  const nav = document.querySelector(".res-nav");
  if (!nav) return;
  const lane = document.createElement("span");
  lane.className = "res-lane";
  lane.setAttribute("aria-hidden", "true");
  nav.append(lane);
  const here = () => nav.querySelector('a[aria-current="page"]');
  const place = (link) => {
    if (!link || !link.offsetParent) { lane.classList.remove("is-on"); return; }
    const n = nav.getBoundingClientRect(), r = link.getBoundingClientRect();
    lane.style.transform = `translateX(${r.left - n.left + r.width / 2 - lane.offsetWidth / 2}px)`;
    lane.classList.add("is-on");
  };
  const settle = () => place(here());
  nav.addEventListener("pointerover", (e) => { const link = e.target.closest("a"); if (link) place(link); });
  nav.addEventListener("pointerleave", settle);
  nav.addEventListener("focusin", (e) => { const link = e.target.closest("a"); if (link) place(link); });
  nav.addEventListener("focusout", (e) => { if (!nav.contains(e.relatedTarget)) settle(); });
  document.addEventListener("DOMContentLoaded", () => { settle(); window.setTimeout(() => lane.classList.add("is-ready"), 80); });
  window.addEventListener("load", settle);
  window.addEventListener("resize", settle);
})();
