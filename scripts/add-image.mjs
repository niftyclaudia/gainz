// Saves an image into images/ and records it in a recipe's frontmatter.
// The image can be a URL (downloaded) or a local file (copied), e.g. a cropped scan.
//
//   node scripts/add-image.mjs <recipe-slug> <image-url-or-file> \
//     --source "<page URL describing the image>" \
//     --license "Public domain" \
//     --credit "Artist, Title (Book, 1890). Library" \
//     --alt "What the picture shows" \
//     [--treatment duotone]
//
// Existing values in the recipe are replaced; the old image file is left in place.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const [slug, url, ...rest] = process.argv.slice(2);
const opts = {};
for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, "")] = rest[i + 1];

if (!slug || !url || !opts.source || !opts.license || !opts.credit || !opts.alt) {
  console.error("Usage: node scripts/add-image.mjs <slug> <image-url-or-file> --source URL --license TEXT --credit TEXT --alt TEXT [--treatment duotone]");
  process.exit(1);
}

const recipePath = join(root, "recipes", `${slug}.md`);
let recipe = await readFile(recipePath, "utf8");

let data;
let ext;
if (/^https?:\/\//.test(url)) {
  const res = await fetch(url, { headers: { "user-agent": "gainz-recipe-book/1.0 (personal, non-commercial)" } });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const type = (res.headers.get("content-type") || "").split(";")[0];
  ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" }[type] ||
    extname(new URL(url).pathname).toLowerCase() || ".jpg";
  data = Buffer.from(await res.arrayBuffer());
} else {
  data = await readFile(resolve(url));
  ext = extname(url).toLowerCase().replace(".jpeg", ".jpg") || ".jpg";
}
const file = `images/${slug}${ext}`;
await mkdir(join(root, "images"), { recursive: true });
await writeFile(join(root, file), data);

const quote = (v) => `"${String(v).replace(/"/g, "'")}"`;
const fields = {
  image: file,
  image_alt: quote(opts.alt),
  image_credit: quote(opts.credit),
  image_source: opts.source,
  image_license: quote(opts.license),
  ...(opts.treatment ? { image_treatment: opts.treatment } : {}),
};
const [, front, body] = recipe.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
let lines = front.split("\n");
for (const [key, value] of Object.entries(fields)) {
  const i = lines.findIndex((l) => l.startsWith(`${key}:`));
  const line = `${key}: ${value}`;
  if (i >= 0) lines[i] = line;
  else lines.push(line);
}
recipe = `---\n${lines.join("\n")}\n---\n${body}`;
await writeFile(recipePath, recipe);
console.log(`Saved ${file} and updated recipes/${slug}.md`);
