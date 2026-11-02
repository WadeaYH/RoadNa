"use strict";

// Who can open which screen (the plan from the RoadNa workflow page). The preview has no real sign-in:
// logging in picks a role and remembers it in this tab only (window.name, no storage, nothing sent).
// With no role chosen every screen stays open, so the preview can still be explored freely.
// ASP.NET will replace this with real account permissions checked on the server.
(() => {
  const FULL = "full", VIEW = "view";
  const ROLES = {
    resident: { label: "Resident", home: "../../resident/home/home.html" },
    reviewer: { label: "Reviewer", home: "../../admin/review-assign/review-assign.html", person: ["Hala Bani Yaseen", "Report reviewer", "HB"] },
    team_member: { label: "Team member", home: "../../team/tasks/tasks.html?as=member" },
    team_leader: { label: "Team leader", home: "../../team/tasks/tasks.html?as=leader" },
    supervisor: { label: "Supervisor", home: "../../admin/check-work/check-work.html", person: ["Eng. Rana Al-Khatib", "Roads supervisor", "RK"] },
    manager: { label: "Manager", home: "../../admin/dashboard/dashboard.html", person: ["Eng. Sami Al-Zoubi", "Operations manager", "SZ"] },
    admin: { label: "Super admin", home: "../../admin/accounts/accounts.html", person: ["Dana Qasem", "Super admin", "DQ"] },
  };
  // Screens not listed here (landing, public map, help, account steps) are open to everyone.
  // Each role does its own step of the flow; the others may look (VIEW) but not act.
  const ACCESS = {
    "resident/home": { resident: FULL },
    "resident/create-report": { resident: FULL },
    "resident/report-submitted": { resident: FULL },
    "resident/my-reports": { resident: FULL },
    "resident/report-details": { resident: FULL },
    "resident/notifications": { resident: FULL },
    "resident/profile": { resident: FULL },
    "resident/community": { resident: FULL, manager: VIEW, admin: VIEW },
    "team/tasks": { team_member: FULL, team_leader: FULL, supervisor: VIEW, manager: VIEW, admin: VIEW },
    "team/task": { team_member: FULL, team_leader: FULL, supervisor: VIEW, manager: VIEW, admin: VIEW },
    "admin/review-assign": { reviewer: FULL, supervisor: VIEW, manager: VIEW, admin: VIEW },
    "admin/check-work": { supervisor: FULL, manager: VIEW, admin: VIEW },
    "admin/ops-map": { reviewer: FULL, supervisor: FULL, manager: FULL, admin: VIEW },
    "admin/dashboard": { supervisor: VIEW, manager: FULL, admin: VIEW },
    "admin/sla-orders": { supervisor: VIEW, manager: FULL, admin: VIEW },
    "admin/heatmap": { manager: FULL, admin: VIEW },
    "admin/community": { manager: FULL, admin: VIEW },
    "admin/accounts": { admin: FULL },
    "admin/archive": { supervisor: FULL, manager: FULL, reviewer: VIEW, admin: VIEW },
  };
  // The sidebar lists only each role's own screens, in this order. View-only screens open from links
  // inside the work (a map card, a dashboard row) and show the View only bar.
  const NAV = {
    reviewer: ["admin/review-assign", "admin/ops-map"],
    supervisor: ["admin/check-work", "admin/ops-map", "team/tasks", "admin/sla-orders", "admin/archive"],
    manager: ["admin/dashboard", "admin/ops-map", "admin/sla-orders", "admin/heatmap", "admin/community", "admin/archive"],
    admin: ["admin/accounts"],
  };
  const PREFIX = "roadna-role:";
  // A page is named by its package and folder, e.g. "admin/community" (pages/admin/community/community.html).
  const folderOf = (href) => { try { const parts = new URL(href, location.href).pathname.split("/").filter(Boolean); return parts.length >= 3 ? parts.slice(-3, -1).join("/") : ""; } catch { return ""; } };
  const getRole = () => { const m = (window.name || "").match(/(?:^|;)roadna-role:([a-z_]+)/); return m && ROLES[m[1]] ? m[1] : null; };
  const setRole = (role) => { window.name = role && ROLES[role] ? PREFIX + role : ""; };
  const level = (screen, role) => (!role || !ACCESS[screen] ? FULL : ACCESS[screen][role] || null);
  const rolesFor = (screen) => Object.keys(ACCESS[screen] || {}).map((r) => ROLES[r].label);

  window.RoadNaAccess = { ROLES, ACCESS, NAV, get role() { return getRole(); }, set: setRole, clear: () => setRole(null), level, home: (role) => ROLES[role]?.home || "../../public/landing/landing.html" };

  // View-only: forms in the page and buttons marked data-action stay visible but cannot be used.
  // Filters, search, exports, maps and links elsewhere keep working. A capture-phase guard also
  // covers buttons that screen scripts draw or re-enable later.
  const ACTIONS = "main form :is(button, input, select, textarea), [data-action]";
  // An action marked data-allow="supervisor" stays usable for that role (a supervisor may escalate from a screen they only view).
  const allowedFor = (el) => (el.closest("[data-allow]")?.dataset.allow || "").split(" ").includes(getRole());
  const lockActions = () => {
    document.documentElement.classList.add("is-view-only");
    const lock = (el) => {
      if (allowedFor(el)) return;
      if ("disabled" in el && el.tagName !== "LABEL" && el.tagName !== "A") el.disabled = true;
      el.setAttribute("aria-disabled", "true");
      el.title = "View only for your role";
    };
    document.querySelectorAll(ACTIONS).forEach(lock);
    const stop = (event) => {
      const target = event.target.closest?.(ACTIONS);
      if (target && allowedFor(target)) return;
      if (!target && !(event.type === "submit" && event.target.closest("main"))) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (target) lock(target);
    };
    ["click", "submit", "change"].forEach((type) => document.addEventListener(type, stop, true));
  };

  const role = getRole();
  const screen = folderOf(location.href);
  if (screen === "account/login") return; // the login page clears the role and picks a new one
  document.addEventListener("DOMContentLoaded", () => {
    if (!role) return;
    const info = ROLES[role];
    const mine = level(screen, role);

    // Navigation shows only what this role can open; the staff sidebar only the role's own work.
    document.querySelectorAll(".sidebar .nav-item[href], .res-nav a[href], .res-tabs a[href]").forEach((a) => {
      const target = folderOf(a.getAttribute("href"));
      if (ACCESS[target] && !level(target, role)) (a.closest("li") || a).hidden = true;
    });
    const own = NAV[role];
    const list = document.querySelector(".sidebar .sidebar__nav");
    if (own && list) {
      list.querySelectorAll(":scope > li").forEach((li) => {
        const target = folderOf(li.querySelector("a")?.getAttribute("href") || "");
        li.hidden = !own.includes(target);
      });
      own.forEach((target) => { const li = list.querySelector(`a[href^="../../${target}/"]`)?.closest("li"); if (li) list.append(li); });
    }
    // The brand and the bell lead to this role's home, not to a screen of another role.
    document.querySelectorAll(".admin-header__brand, .admin-header a.icon-btn[href]").forEach((a) => { a.href = info.home; });

    // The console header names the person signed in for this role.
    const chipEl = document.querySelector(".role-chip");
    if (chipEl && info.person) {
      const [who, title, initials] = info.person;
      const strong = document.createElement("strong");
      strong.textContent = who;
      chipEl.replaceChildren(strong, title);
      const avatar = chipEl.nextElementSibling;
      if (avatar?.classList.contains("avatar")) avatar.textContent = initials;
    }

    // A small reminder of the preview role, with a way to change it.
    const chip = document.createElement("a");
    chip.className = "role-pill";
    chip.href = "../../account/login/login.html";
    chip.textContent = `Preview role: ${info.label} · change`;
    document.body.append(chip);

    if (mine === VIEW) {
      const bar = document.createElement("p");
      bar.className = "view-only";
      bar.setAttribute("role", "status");
      bar.textContent = `View only for the ${info.label.toLowerCase()} role. Actions on this screen belong to other roles. `;
      const back = document.createElement("a");
      back.href = info.home;
      back.textContent = "Back to my work";
      bar.append(back);
      document.body.prepend(bar);
      lockActions();
    }
    if (!mine) {
      const gate = document.createElement("section");
      gate.className = "access-gate";
      gate.setAttribute("role", "alertdialog");
      gate.setAttribute("aria-modal", "true");
      gate.setAttribute("aria-labelledby", "gate-title");
      const h = document.createElement("h1");
      h.id = "gate-title";
      h.textContent = "This screen is not part of your role";
      const p = document.createElement("p");
      p.textContent = `You are previewing as ${info.label.toLowerCase()}. This screen is for ${rolesFor(screen).join(", ").toLowerCase()}.`;
      const actions = document.createElement("div");
      actions.className = "access-gate__actions";
      const home = document.createElement("a");
      home.className = "btn btn--primary";
      home.href = info.home;
      home.textContent = "Go to my home screen";
      const change = document.createElement("a");
      change.className = "btn btn--outline";
      change.href = "../../account/login/login.html";
      change.textContent = "Change role";
      actions.append(home, change);
      gate.append(h, p, actions);
      document.body.append(gate);
      [...document.body.children].forEach((n) => { if (n !== gate && n.tagName !== "SCRIPT") n.inert = true; });
      home.focus();
    }
  });
})();
