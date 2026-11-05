import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ttf": "font/ttf" };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname.includes(String.fromCharCode(92)) || pathname.includes(String.fromCharCode(0))) { res.writeHead(404); res.end("Not found"); return; }
    const relative = pathname.replace(/^\/+/, "") || "index.html";
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
    if (!(relative === "index.html" || relative.startsWith("screens/") || relative.startsWith("shared/")) || relative.split("/").some(segment => segment.startsWith("."))) {
      res.writeHead(404); res.end("Not found"); return;
    }
    const target = path.resolve(root, relative.endsWith("/") ? relative + "index.html" : relative);
    if (!target.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
    const data = await readFile(target);
    res.writeHead(200, { "Content-Type": (mime[path.extname(target)] || "application/octet-stream"), "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch { res.writeHead(404); res.end("Not found"); }
});
server.listen(Number(process.env.PORT || 4173), "127.0.0.1", () => console.log("RoadNa JO preview: http://127.0.0.1:4173"));
