import http from "node:http";
import os from "node:os";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ttf": "font/ttf" };
const notFound = async (res) => { try { const page = await readFile(path.join(root, "404.html")); res.writeHead(404, { "Content-Type": "text/html", "Cache-Control": "no-store" }); res.end(page); } catch { res.writeHead(404); res.end("Not found"); } };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname.includes(String.fromCharCode(92)) || pathname.includes(String.fromCharCode(0))) { await notFound(res); return; }
    const relative = pathname.replace(/^\/+/, "") || "index.html";
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
    if (!(relative === "index.html" || relative === "404.html" || relative.startsWith("pages/") || relative.startsWith("shared/") || relative.startsWith("archive/city-world/")) || relative.split("/").some(segment => segment.startsWith("."))) {
      await notFound(res); return;
    }
    const target = path.resolve(root, relative.endsWith("/") ? relative + "index.html" : relative);
    if (!target.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
    const data = await readFile(target);
    res.writeHead(200, { "Content-Type": (mime[path.extname(target)] || "application/octet-stream"), "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch { await notFound(res); }
});
// Local only by default. `npm run share` sets SHARE=1 so phones and other computers on the same
// network can open the preview; it prints the addresses to type into their browser.
const share = process.env.SHARE === "1";
const port = Number(process.env.PORT || 4173);
server.listen(port, share ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(`RoadNa JO preview: http://127.0.0.1:${port}`);
  if (!share) return;
  const addresses = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  console.log("Open one of these on another device on the same Wi-Fi:");
  addresses.forEach((a) => console.log(`  http://${a}:${port}`));
  console.log("Anyone on this network can open it while this window runs. Press Ctrl+C to stop sharing.");
});
