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
await walk(path.join(root, "screens"));
await walk(path.join(root, "shared"));
files.push(path.join(root, "index.html"));
for (const file of files) {
  const ext = path.extname(file);
  if (![".html", ".css", ".js"].includes(ext)) continue;
  const source = await fs.readFile(file, "utf8");
  if (ext === ".js") {
    if (file.includes(path.join("vendor", "three")) || /^\s*(?:import|export)\b/m.test(source)) {
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      if (result.status !== 0) problems.push(result.stderr || "Module failed syntax check: " + file);
    } else {
      try { new vm.Script(source, { filename: file }); } catch(error) { problems.push(error.message); }
    }
    const vendor = file.includes(path.join("vendor", "three"));
    if (!vendor && /localStorage|sessionStorage|XMLHttpRequest|\bfetch\s*\(/.test(source)) problems.push(file + ": unexpected storage or network API");
  }
  const references = ext === ".html"
    ? [...source.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1])
    : ext === ".css" ? [...source.matchAll(/url\(["']?([^)"']+)["']?\)/g)].map(m => m[1])
    : ext === ".js" ? [...source.matchAll(/(?:from\s*|import\s*\()(["'])(\.[^"']+)\1/g)].map(m => m[2]) : [];
  for (const ref of references) {
    if (/^(?:https?:|data:|mailto:|tel:|#)/.test(ref)) continue;
    const [address, hash] = ref.split("#");
    const destination = address.split("?")[0];
    const target = destination ? path.resolve(path.dirname(file), destination) : file;
    try {
      const stat = await fs.stat(target);
      if (!stat.size) problems.push(target + ": empty asset");
      if (hash && ext === ".html" && path.extname(target) === ".html") {
        const html = await fs.readFile(target, "utf8");
        if (!html.includes('id="' + hash + '"')) problems.push(file + ": missing anchor " + ref);
      }
    } catch { problems.push(file + ": broken reference " + ref); }
  }
}
const folders = (await fs.readdir(path.join(root,"screens"), {withFileTypes:true})).filter(x=>x.isDirectory());
for (const folder of folders) for (const name of ["index.html","style.css","script.js"]) {
  try { await fs.access(path.join(root,"screens",folder.name,name)); } catch {problems.push(folder.name + ": missing " + name);}
}
if (problems.length) { console.error(problems.join("\n")); process.exitCode = 1; }
else console.log("PASS: " + folders.length + " screens; scripts parse; local assets, links and anchors resolve; no storage or API calls.");
