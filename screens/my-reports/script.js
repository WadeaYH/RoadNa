"use strict";

// Presentation only. Filtering, searching and sorting act on the sample rows in this page;
// ASP.NET will supply and page the real data.
const rows = [...document.querySelectorAll("#reports-table tbody tr")];
const body = document.querySelector("#reports-table tbody");
const tabs = [...document.querySelectorAll(".tab")];
const search = document.querySelector("#search");
const sort = document.querySelector("#sort");
const empty = document.querySelector("#empty");
const tableWrap = document.querySelector(".table-wrap");
const countText = document.querySelector("#count-text");
let filter = "all";

const apply = () => {
  const query = search.value.trim().toLowerCase();
  let shown = 0;
  rows.forEach((row) => {
    const matches = (filter === "all" || row.dataset.group === filter) && (!query || row.textContent.toLowerCase().includes(query));
    row.classList.toggle("is-hidden", !matches);
    if (matches) shown += 1;
  });
  tableWrap.hidden = shown === 0;
  empty.hidden = shown !== 0;
  countText.textContent = shown === rows.length ? "Showing 7 of 18 reports" : `Showing ${shown} of ${rows.length} reports on this page`;
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
search.addEventListener("input", apply);
// A query from the top-bar search arrives as ?q=.
const incoming = new URL(window.location.href).searchParams.get("q");
if (incoming) { search.value = incoming; apply(); }

sort.addEventListener("change", () => {
  const key = sort.value;
  const sorted = [...rows].sort((a, b) => {
    if (key === "votes") return Number(b.dataset.votes) - Number(a.dataset.votes);
    if (key === "oldest") return Number(b.dataset.age) - Number(a.dataset.age);
    return Number(a.dataset.age) - Number(b.dataset.age);
  });
  sorted.forEach((row) => body.appendChild(row));
});
