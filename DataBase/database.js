"use strict";

// Draws the ER diagram, the schema diagram, the table list and the SQL script from database-data.js.
const DB = window.RoadNaDB;
const NS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const svgEl = (tag, attrs, parent) => {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
  if (parent) parent.append(node);
  return node;
};

const byName = new Map(DB.TABLES.map((t) => [t.name, t]));
const colOf = new Map();
DB.LAYOUT.forEach((names, ci) => names.forEach((n) => colOf.set(n, ci)));
const keyRow = (t) => Math.max(0, t.cols.findIndex((c) => c.flags.includes("pk")));
const outSide = (side) => (side === "r" ? 1 : -1);

const state = { view: "er", showUsers: false, showLabels: true, hover: null, selected: null, scale: { er: 1, schema: 1 }, manual: { er: false, schema: false } };
const views = {};

// ---------- Sizes ----------
const ER = { w: 200, h: 58, colW: 330, rowH: 104, pad: 36 };
const SC = { w: 290, head: 34, row: 22, foot: 8, colW: 450, gap: 36, pad: 36 };

function positions(kind) {
  const pos = new Map();
  if (kind === "er") {
    DB.LAYOUT.forEach((names, ci) => names.forEach((n, ri) => pos.set(n, { x: ER.pad + ci * ER.colW, y: ER.pad + ri * ER.rowH, w: ER.w, h: ER.h })));
  } else {
    DB.LAYOUT.forEach((names, ci) => {
      let y = SC.pad;
      names.forEach((n) => {
        const h = SC.head + byName.get(n).cols.length * SC.row + SC.foot;
        pos.set(n, { x: SC.pad + ci * SC.colW, y, w: SC.w, h });
        y += h + SC.gap;
      });
    });
  }
  return pos;
}

// ---------- Relationship ends: crow's foot notation ----------
function endMarker(parent, x, y, out, card) {
  const P = (a, p) => `${x + out * a},${y + p}`;
  const path = (d) => svgEl("path", { d, class: "mark" }, parent);
  const many = card === "many" || card === "zeroMany";
  const zero = card === "zeroOne" || card === "zeroMany";
  if (many) {
    path(`M${P(13, 0)} L${P(0, -7)}`); path(`M${P(13, 0)} L${P(0, 7)}`); path(`M${P(13, 0)} L${P(0, 0)}`);
    if (zero) svgEl("circle", { cx: x + out * 20, cy: y, r: 4, class: "mark mark--zero" }, parent);
    else path(`M${P(17, -7)} L${P(17, 7)}`);
  } else {
    path(`M${P(9, -7)} L${P(9, 7)}`);
    if (zero) svgEl("circle", { cx: x + out * 18, cy: y, r: 4, class: "mark mark--zero" }, parent);
    else path(`M${P(14, -7)} L${P(14, 7)}`);
  }
}

function visibleRels() { return DB.RELS.filter((r) => state.showUsers || r.to !== "app_user"); }

function buildEnds(kind, pos, rels) {
  const slots = new Map();
  const ends = rels.map((rel) => {
    const sameCol = colOf.get(rel.from) === colOf.get(rel.to);
    const sa = sameCol || colOf.get(rel.from) < colOf.get(rel.to) ? "r" : "l";
    const sb = sameCol ? "r" : sa === "r" ? "l" : "r";
    const from = byName.get(rel.from), to = byName.get(rel.to);
    const e = { rel, a: { t: rel.from, side: sa }, b: { t: rel.to, side: sb } };
    [e.a, e.b].forEach((end, i) => {
      const box = pos.get(end.t);
      end.x = end.side === "r" ? box.x + box.w : box.x;
      if (kind === "schema") {
        const idx = i === 0 ? from.cols.findIndex((c) => c.name === rel.col) : keyRow(to);
        end.y = box.y + SC.head + idx * SC.row + SC.row / 2;
      } else {
        const other = pos.get(i === 0 ? rel.to : rel.from);
        end.otherY = other.y + other.h / 2 + (i === 0 ? 0.1 : 0);
        const key = `${end.t}|${end.side}`;
        if (!slots.has(key)) slots.set(key, []);
        slots.get(key).push(end);
      }
    });
    return e;
  });
  if (kind === "er") {
    slots.forEach((list, key) => {
      const box = pos.get(key.split("|")[0]);
      list.sort((p, q) => p.otherY - q.otherY);
      list.forEach((end, i) => { end.y = box.y + (box.h * (i + 1)) / (list.length + 1); });
    });
  }
  return ends;
}

function curve(a, b) {
  const oa = outSide(a.side), ob = outSide(b.side);
  const k = oa !== ob ? Math.max(50, Math.abs(b.x - a.x) * 0.42) : 64;
  const c1 = [a.x + oa * k, a.y], c2 = [b.x + ob * k, b.y];
  return { d: `M${a.x},${a.y} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${b.x},${b.y}`, mid: [(a.x + 3 * c1[0] + 3 * c2[0] + b.x) / 8, (a.y + 3 * c1[1] + 3 * c2[1] + b.y) / 8] };
}

// ---------- Drawing ----------
function draw(kind) {
  const svg = $(kind === "er" ? "svg-er" : "svg-schema");
  svg.replaceChildren();
  const pos = positions(kind);
  const rels = visibleRels();
  const ends = buildEnds(kind, pos, rels);
  const width = Math.max(...[...pos.values()].map((p) => p.x + p.w)) + 90;
  const height = Math.max(...[...pos.values()].map((p) => p.y + p.h)) + 40;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const view = { svg, kind, width, height, nodes: new Map(), links: [] };
  views[kind] = view;

  const lines = svgEl("g", {}, svg);
  ends.forEach((e) => {
    const g = svgEl("g", { class: "line" }, lines);
    svgEl("title", {}, g).textContent = `${e.rel.from}.${e.rel.col} points to ${e.rel.to}`;
    const { d, mid } = curve(e.a, e.b);
    svgEl("path", { d, class: "edge" }, g);
    endMarker(g, e.a.x, e.a.y, outSide(e.a.side), e.rel.fromCard);
    endMarker(g, e.b.x, e.b.y, outSide(e.b.side), e.rel.toCard);
    if (kind === "er") { const lbl = svgEl("text", { x: mid[0], y: mid[1] + 4, "text-anchor": "middle", class: "lbl" }, g); lbl.textContent = e.rel.label; if (!state.showLabels) lbl.setAttribute("display", "none"); }
    view.links.push({ rel: e.rel, g });
  });

  const nodes = svgEl("g", {}, svg);
  DB.TABLES.forEach((t) => {
    const p = pos.get(t.name);
    const g = svgEl("g", { class: `node g-${t.group}`, transform: `translate(${p.x},${p.y})`, tabindex: 0, role: "button", "aria-label": `${t.name}, ${t.cols.length} columns. Press Enter to follow its relationships.` }, nodes);
    svgEl("title", {}, g).textContent = t.desc;
    svgEl("rect", { class: "body", width: p.w, height: p.h, rx: 8 }, g);
    if (kind === "er") {
      svgEl("path", { class: "head", d: `M0,8 a8,8 0 0 1 8,-8 h${p.w - 16} a8,8 0 0 1 8,8 v18 h-${p.w} z` }, g);
      svgEl("text", { class: "name", x: 14, y: 18 }, g).textContent = t.name;
      const pks = t.cols.filter((c) => c.flags.includes("pk")).map((c) => c.name);
      svgEl("text", { class: "sub", x: 14, y: 44 }, g).textContent = `${t.cols.length} columns · ${pks.length > 1 ? "key of two columns" : `key ${pks[0]}`}`;
    } else {
      svgEl("path", { class: "head", d: `M0,8 a8,8 0 0 1 8,-8 h${p.w - 16} a8,8 0 0 1 8,8 v${SC.head - 8} h-${p.w} z` }, g);
      svgEl("text", { class: "name", x: 14, y: 22 }, g).textContent = t.name;
      svgEl("text", { class: "sub", x: p.w - 12, y: 22, "text-anchor": "end", fill: "#fff", "fill-opacity": ".8" }, g).textContent = DB.GROUPS[t.group].label;
      t.cols.forEach((c, i) => {
        const y = SC.head + i * SC.row;
        if (i) svgEl("line", { class: "row-sep", x1: 8, x2: p.w - 8, y1: y, y2: y }, g);
        const keys = ["pk", "fk", "uq"].filter((k) => c.flags.includes(k));
        keys.forEach((k, ki) => {
          svgEl("rect", { class: `chip-bg chip-bg--${k}`, x: 10 + ki * 24, y: y + 5, width: 21, height: 12, rx: 3 }, g);
          svgEl("text", { class: "chip-t", x: 10 + ki * 24 + 10.5, y: y + 14, "text-anchor": "middle" }, g).textContent = k.toUpperCase();
        });
        const cell = svgEl("text", { class: `col${c.flags.includes("null") ? " col--null" : ""}`, x: 10 + Math.max(keys.length, 1) * 24 + 4, y: y + 15 }, g);
        cell.textContent = c.name;
        svgEl("text", { class: "type", x: p.w - 12, y: y + 15, "text-anchor": "end" }, g).textContent = `${c.type}${c.flags.includes("null") ? "?" : ""}`;
        const rel = c.flags.includes("fk") && DB.RELS.find((r) => r.from === t.name && r.col === c.name);
        if (rel) svgEl("title", {}, cell).textContent = `${t.name}.${c.name} points to ${rel.to}`;
      });
    }
    view.nodes.set(t.name, g);
    g.addEventListener("pointerenter", () => { state.hover = t.name; applyFocus(); });
    g.addEventListener("pointerleave", () => { state.hover = null; applyFocus(); });
    g.addEventListener("click", (event) => { event.stopPropagation(); select(t.name); });
    g.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(t.name); } });
  });
  svg.addEventListener("click", () => select(null));
  setScale(kind, state.scale[kind] || 1);
  if (!state.manual[kind] && views[kind].fitted) fit(kind);
  applyFocus();
}

function select(name) { state.selected = state.selected === name ? null : name; applyFocus(); }

function applyFocus() {
  const focus = state.hover || state.selected;
  const rels = visibleRels();
  const related = new Set(focus ? [focus] : []);
  if (focus) rels.forEach((r) => { if (r.from === focus) related.add(r.to); if (r.to === focus) related.add(r.from); });
  Object.values(views).forEach((v) => {
    v.nodes.forEach((g, name) => { g.classList.toggle("is-dim", Boolean(focus) && !related.has(name)); g.classList.toggle("is-selected", name === state.selected); });
    v.links.forEach(({ rel, g }) => {
      const hot = Boolean(focus) && (rel.from === focus || rel.to === focus);
      g.classList.toggle("is-hot", hot);
      g.classList.toggle("is-dim", Boolean(focus) && !hot);
    });
  });
  const info = $("info");
  if (!focus) { info.textContent = "Click a table to follow its relationships. Click it again, or an empty spot, to let go."; return; }
  const t = byName.get(focus);
  const out = DB.RELS.filter((r) => r.from === focus), inn = DB.RELS.filter((r) => r.to === focus && r.from !== focus);
  const names = (list, key) => [...new Set(list.map((r) => r[key]))].join(", ") || "none";
  info.innerHTML = `<strong>${esc(focus)}</strong> <span>${esc(t.desc)}</span> Points to: ${esc(names(out, "to"))}. Referenced by: ${esc(names(inn, "from"))}.`;
}

// ---------- Zoom ----------
function setScale(kind, scale) {
  const v = views[kind];
  state.scale[kind] = Math.min(2, Math.max(0.2, scale));
  v.svg.setAttribute("width", Math.round(v.width * state.scale[kind]));
  v.svg.setAttribute("height", Math.round(v.height * state.scale[kind]));
}
const fit = (kind) => { const v = views[kind]; state.manual[kind] = false; setScale(kind, Math.min(1, ($("canvas").clientWidth - 4) / v.width)); $("canvas").scrollTo(0, 0); };
const zoom = (factor) => { state.manual[state.view] = true; setScale(state.view, state.scale[state.view] * factor); };

// ---------- Tabs ----------
const TABS = ["er", "schema", "tables", "sql", "rules"];
function showTab(name) {
  state.view = name;
  TABS.forEach((t) => {
    const on = t === name;
    $(`tab-${t}`).setAttribute("aria-selected", String(on));
    $(`tab-${t}`).tabIndex = on ? 0 : -1;
    $(`view-${t}`).hidden = !on;
  });
  const diagram = name === "er" || name === "schema";
  $("canvas").hidden = !diagram;
  $("toolbar").hidden = !diagram;
  $("info").hidden = !diagram;
  // SVG elements have no .hidden property, so the attribute is toggled directly
  $("svg-er").toggleAttribute("hidden", name !== "er");
  $("svg-schema").toggleAttribute("hidden", name !== "schema");
  $("opt-labels-wrap").hidden = name !== "er";
  if (diagram && !views[name].fitted) { views[name].fitted = true; fit(name); }
}
TABS.forEach((t, i) => {
  $(`tab-${t}`).addEventListener("click", () => showTab(t));
  $(`tab-${t}`).addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    showTab(next); $(`tab-${next}`).focus();
  });
});

// ---------- Tables list ----------
function renderTables() {
  const box = $("tables-list");
  box.innerHTML = Object.entries(DB.GROUPS).map(([key, group]) => {
    const list = DB.TABLES.filter((t) => t.group === key);
    return `<section class="db-group g-${key}"><h2><i></i>${esc(group.label)} <span>${esc(group.note)}, ${list.length} tables</span></h2><div class="db-tables">${list.map((t) => {
      const out = DB.RELS.filter((r) => r.from === t.name), inn = DB.RELS.filter((r) => r.to === t.name && r.from !== t.name);
      const link = (n) => `<a href="#t-${n}">${esc(n)}</a>`;
      return `<article class="db-card g-${key}" id="t-${t.name}"><header><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p></header>
        <div class="table-wrap"><table><thead><tr><th scope="col">Column</th><th scope="col">Type</th><th scope="col">Notes</th></tr></thead><tbody>${t.cols.map((c) => {
          const keys = ["pk", "fk", "uq"].filter((k) => c.flags.includes(k)).map((k) => `<span class="key key--${k}">${k.toUpperCase()}</span>`).join("");
          const ref = c.flags.includes("fk") ? DB.RELS.find((r) => r.from === t.name && r.col === c.name) : null;
          return `<tr><td>${esc(c.name)}</td><td class="t">${esc(c.type)}${c.flags.includes("null") ? "" : ""}</td><td><span class="keys">${keys}${c.flags.includes("null") ? "optional" : ""}</span>${ref ? `<span class="vals">points to ${esc(ref.to)}</span>` : ""}${c.vals.length ? `<span class="vals">${esc(c.vals.join(", "))}</span>` : ""}</td></tr>`;
        }).join("")}</tbody></table></div>
        <footer>Points to: ${[...new Set(out.map((r) => r.to))].map(link).join(", ") || "none"}. Referenced by: ${[...new Set(inn.map((r) => r.from))].map(link).join(", ") || "none"}.</footer></article>`;
    }).join("")}</div></section>`;
  }).join("");
}

// ---------- SQL ----------
function buildSql() {
  const order = [], seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    DB.RELS.filter((r) => r.from === name && r.to !== name).forEach((r) => visit(r.to));
    order.push(name);
  };
  DB.TABLES.forEach((t) => visit(t.name));
  const out = ["-- RoadNa JO database for SQL Server", "-- Generated from the data model on this page. Tables are ordered so each one comes after the tables it points at.", ""];
  order.forEach((name) => {
    const t = byName.get(name);
    const pks = t.cols.filter((c) => c.flags.includes("pk")).map((c) => c.name);
    const lines = t.cols.map((c) => {
      let s = `  [${c.name}] ${c.type}`;
      if (c.name === "id" && c.flags.includes("pk")) s += " IDENTITY(1,1)";
      s += c.flags.includes("null") ? " NULL" : " NOT NULL";
      if (c.flags.includes("now")) s += " DEFAULT SYSUTCDATETIME()";
      if (c.flags.includes("def1")) s += " DEFAULT 1";
      if (c.flags.includes("def0")) s += " DEFAULT 0";
      return s;
    });
    lines.push(`  CONSTRAINT [PK_${name}] PRIMARY KEY (${pks.map((p) => `[${p}]`).join(", ")})`);
    t.cols.filter((c) => c.flags.includes("uq")).forEach((c) => lines.push(`  CONSTRAINT [UQ_${name}_${c.name}] UNIQUE ([${c.name}])`));
    DB.RELS.filter((r) => r.from === name).forEach((r) => {
      const target = byName.get(r.to);
      lines.push(`  CONSTRAINT [FK_${name}_${r.col}] FOREIGN KEY ([${r.col}]) REFERENCES [${r.to}]([${target.cols[keyRow(target)].name}])`);
    });
    t.cols.filter((c) => c.vals.length).forEach((c) => lines.push(`  CONSTRAINT [CK_${name}_${c.name}] CHECK ([${c.name}] IN (${c.vals.map((v) => `'${v}'`).join(", ")}))`));
    out.push(`CREATE TABLE [${name}] (`, lines.join(",\n"), ");", "");
  });
  return out.concat(DB.EXTRA_SQL).join("\n") + "\n";
}

function setupSql() {
  const text = buildSql();
  $("sql-text").textContent = text;
  const status = (msg) => { $("sql-status").textContent = msg; };
  $("sql-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(text); status("Copied."); }
    catch { const range = document.createRange(); range.selectNodeContents($("sql-text")); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); status("Selected. Press Ctrl+C to copy."); }
  });
  $("sql-download").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "roadna.sql" });
    document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("Downloaded roadna.sql.");
  });
}

// ---------- Start ----------
$("stat-tables").textContent = DB.TABLES.length;
$("stat-cols").textContent = DB.TABLES.reduce((n, t) => n + t.cols.length, 0);
$("stat-rels").textContent = DB.RELS.length;
$("stat-groups").textContent = Object.keys(DB.GROUPS).length;
$("legend").innerHTML = Object.entries(DB.GROUPS).map(([k, g]) => `<li class="g-${k}"><i></i>${esc(g.label)}</li>`).join("");
$("users-count").textContent = `(${DB.RELS.filter((r) => r.to === "app_user").length} lines)`;

$("opt-users").addEventListener("change", (e) => { state.showUsers = e.target.checked; draw("er"); draw("schema"); });
$("opt-labels").addEventListener("change", (e) => { state.showLabels = e.target.checked; document.querySelectorAll("#svg-er .lbl").forEach((l) => { if (state.showLabels) l.removeAttribute("display"); else l.setAttribute("display", "none"); }); });
$("zoom-in").addEventListener("click", () => zoom(1.2));
$("zoom-out").addEventListener("click", () => zoom(1 / 1.2));
$("zoom-fit").addEventListener("click", () => fit(state.view));

// Keep the diagram fitted while the window settles or changes size, until the reader zooms by hand.
let resizeTimer = 0;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => { if ((state.view === "er" || state.view === "schema") && !state.manual[state.view]) fit(state.view); }, 150);
});

draw("er");
draw("schema");
renderTables();
setupSql();
showTab("er");
