"use strict";

// Presentation only. Filtering, searching and sorting act on the sample cards in this page;
// ASP.NET will supply and page the real data.
const list = document.querySelector("#list");
const cards = [...list.querySelectorAll(".rcard")];
const tabs = [...document.querySelectorAll(".tab")];
const search = document.querySelector("#search");
const sort = document.querySelector("#sort");
const empty = document.querySelector("#empty");
const countText = document.querySelector("#count-text");
let filter = "all";

const apply = () => {
  const query = search.value.trim().toLowerCase();
  let shown = 0;
  cards.forEach((card) => {
    const matches = (filter === "all" || card.dataset.group === filter) && (!query || card.textContent.toLowerCase().includes(query));
    card.hidden = !matches;
    if (matches) shown += 1;
  });
  list.hidden = shown === 0;
  empty.hidden = shown !== 0;
  countText.textContent = shown === cards.length ? "Showing 7 of your 18 reports" : `Showing ${shown} of ${cards.length} reports on this page`;
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
  const sorted = [...cards].sort((a, b) => {
    if (key === "votes") return Number(b.dataset.votes) - Number(a.dataset.votes);
    if (key === "oldest") return Number(b.dataset.age) - Number(a.dataset.age);
    return Number(a.dataset.age) - Number(b.dataset.age);
  });
  sorted.forEach((card) => list.appendChild(card));
});
