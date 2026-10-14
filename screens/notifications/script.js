"use strict";

// Presentation only. Reading state lives in this page's markup for the demo; ASP.NET
// will persist real read receipts.
const tabs = [...document.querySelectorAll(".tab")];
const notes = [...document.querySelectorAll(".note")];
const list = document.querySelector("#list");
const empty = document.querySelector("#empty");
const unreadCount = document.querySelector("#count-unread");
const sidebarBadge = document.querySelector('.nav-item[href$="notifications/index.html"] .nav-item__badge');
const bellDot = document.querySelector(".icon-btn__dot");
let filter = "all";

const syncCounts = () => {
  const unread = notes.filter((n) => n.classList.contains("is-unread")).length;
  unreadCount.textContent = String(unread);
  if (sidebarBadge) {
    sidebarBadge.textContent = String(unread);
    sidebarBadge.hidden = unread === 0;
  }
  if (bellDot) bellDot.hidden = unread === 0;
};

const apply = () => {
  let shown = 0;
  notes.forEach((note) => {
    const show = filter === "all" || (filter === "unread" ? note.classList.contains("is-unread") : note.dataset.type === filter);
    note.hidden = !show;
    if (show) shown += 1;
  });
  // Hide a group heading when none of its notifications are visible.
  list.querySelectorAll(".group-label").forEach((label) => {
    const group = label.nextElementSibling;
    label.hidden = ![...group.children].some((li) => !li.hidden);
  });
  list.hidden = shown === 0;
  empty.hidden = shown !== 0;
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filter = tab.dataset.filter;
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-pressed", String(on));
    });
    apply();
  });
});

document.querySelector("#mark-all").addEventListener("click", () => {
  notes.forEach((note) => note.classList.remove("is-unread"));
  syncCounts();
  apply();
});

// Following a link or pressing a card marks it as read.
notes.forEach((note) => {
  note.addEventListener("click", () => {
    if (!note.classList.contains("is-unread")) return;
    note.classList.remove("is-unread");
    syncCounts();
  });
});

syncCounts();
