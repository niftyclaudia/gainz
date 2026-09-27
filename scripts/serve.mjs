// Tiny static server for the recipe book. No dependencies.
// GET /api/recipes returns every recipes/*.md file, read fresh on each request,
// so a new recipe shows up on a page refresh.
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const port = Number(process.env.PORT) || 5173;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

async function listRecipes() {
  const dir = join(root, "recipes");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  return Promise.all(
    files.map(async (f) => ({ slug: f.replace(/\.md$/, ""), source: await readFile(join(dir, f), "utf8") })),
  );
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    if (path === "/api/recipes") {
      res.writeHead(200, { "content-type": types[".json"], "cache-control": "no-store" });
      return res.end(JSON.stringify(await listRecipes()));
    }
    const file = normalize(join(root, path === "/" ? "index.html" : path));
    if (!file.startsWith(root + "/") || file.startsWith(join(root, ".git"))) throw Object.assign(new Error(), { code: "ENOENT" });
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(body);
  } catch (err) {
    const missing = err.code === "ENOENT" || err.code === "EISDIR";
    res.writeHead(missing ? 404 : 500, { "content-type": "text/plain" });
    res.end(missing ? "Not found" : String(err));
  }
}).listen(port, () => console.log(`Recipe book open at http://localhost:${port}`));
