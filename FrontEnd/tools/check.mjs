import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const files = [];
async function walk(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) await walk(target);
    else files.push(target);
  }
}
await walk(path.join(root, "pages"));
await walk(path.join(root, "shared"));
files.push(path.join(root, "index.html"));
const rel = (file) => path.relative(root, file).split(path.sep).join("/");
// Shared scripts run inside a page, so their page links resolve from a page folder (pages/<group>/<name>/).
const samplePage = path.join(root, "pages", "admin", "dashboard");

async function exists(target) { try { return (await fs.stat(target)).size > 0; } catch { return false; } }

for (const file of files) {
  const ext = path.extname(file);
  if (![".html", ".css", ".js"].includes(ext)) continue;
  const source = await fs.readFile(file, "utf8");
  const vendor = file.includes(path.join("shared", "vendor")) || file.includes(path.join("shared", "cityworld"));
  if (ext === ".js") {
    if (file.includes(path.join("vendor", "three")) || /^\s*(?:import|export)\b/m.test(source)) {
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      if (result.status !== 0) problems.push(result.stderr || "Module failed syntax check: " + rel(file));
    } else {
      try { new vm.Script(source, { filename: file }); } catch (error) { problems.push(rel(file) + ": " + error.message); }
    }
    if (!file.includes(path.join("vendor", "three")) && /localStorage|sessionStorage|XMLHttpRequest|\bfetch\s*\(/.test(source)) problems.push(rel(file) + ": unexpected storage or network API");
  }
  // No inline CSS or JS in pages: styles live in <name>.css, scripts in <name>.js.
  if (ext === ".html") {
    if (/<style[\s>]/i.test(source)) problems.push(rel(file) + ": <style> block (move it to the page's .css file)");
    if (/<[a-z][^>]*\sstyle="/i.test(source)) problems.push(rel(file) + ": style attribute (use a class in the page's .css file)");
    if (/<script(?![^>]*\ssrc=)[^>]*>\s*\S/i.test(source)) problems.push(rel(file) + ": inline <script> (move it to the page's .js file)");
    if (/<[a-z][^>]*\son[a-z]+="/i.test(source)) problems.push(rel(file) + ": inline event handler (use addEventListener in the .js file)");
  }
  const references = ext === ".html"
    ? [...source.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1])
    : ext === ".css" ? [...source.matchAll(/url\(["']?([^)"']+)["']?\)/g)].map((m) => m[1])
    : [...source.matchAll(/(?:from\s*|import\s*\()(["'])(\.[^"']+)\1/g)].map((m) => m[2]);
  for (const ref of references) {
    if (/^(?:https?:|data:|mailto:|tel:|#)/.test(ref)) continue;
    const [address, hash] = ref.split("#");
    const destination = address.split("?")[0];
    // "./database/..." is served from the sibling DataBase folder (see tools/serve.mjs)
    const aside = destination.match(/^\.\/database\/(.*)$/);
    const target = aside && file === path.join(root, "index.html") ? path.resolve(root, "..", "DataBase", aside[1]) : destination ? path.resolve(path.dirname(file), destination) : file;
    if (!(await exists(target))) { problems.push(rel(file) + ": broken reference " + ref); continue; }
    if (hash && ext === ".html" && path.extname(target) === ".html") {
      const html = await fs.readFile(target, "utf8");
      if (!html.includes('id="' + hash + '"')) problems.push(rel(file) + ": missing anchor " + ref);
    }
  }
  // Page links written inside scripts ("../../admin/dashboard/dashboard.html?x=1").
  if (ext === ".js" && !vendor) {
    const from = file.startsWith(path.join(root, "shared")) ? samplePage : path.dirname(file);
    for (const m of source.matchAll(/["'`]((?:\.\.\/)+[\w./-]+\.html)/g)) {
      if (!(await exists(path.resolve(from, m[1])))) problems.push(rel(file) + ": broken page link " + m[1]);
    }
  }
}

// Every page is a package folder holding <name>.html, <name>.css and <name>.js.
let pages = 0;
for (const group of await fs.readdir(path.join(root, "pages"), { withFileTypes: true })) {
  if (!group.isDirectory()) continue;
  for (const page of await fs.readdir(path.join(root, "pages", group.name), { withFileTypes: true })) {
    if (!page.isDirectory()) continue;
    pages++;
    for (const ext of ["html", "css", "js"]) {
      const name = path.join(root, "pages", group.name, page.name, page.name + "." + ext);
      if (!(await exists(name))) problems.push("pages/" + group.name + "/" + page.name + ": missing " + page.name + "." + ext);
    }
  }
}
if (problems.length) { console.error(problems.join("\n")); process.exitCode = 1; }
else console.log("PASS: " + pages + " pages in packages; one .html/.css/.js each; no inline CSS or JS; scripts parse; links, assets and anchors resolve; no storage or API calls.");
