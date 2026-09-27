// Checks every recipe file and the palette's text contrast.
//   npm run check
import { readFile, readdir, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRecipe, validateRecipe } from "../app/recipe-parser.js";

const root = resolve(fileURLToPath(import.meta.url), "../..");
let failed = false;

// ---- Recipes -------------------------------------------------------------
const files = (await readdir(join(root, "recipes"))).filter((f) => f.endsWith(".md")).sort();
console.log(`Recipes (${files.length})`);
for (const f of files) {
  const slug = f.replace(/\.md$/, "");
  let problems;
  let r;
  try {
    r = parseRecipe(await readFile(join(root, "recipes", f), "utf8"), slug);
    problems = validateRecipe(r);
    if (r.image) {
      try { await access(join(root, r.image)); } catch { problems.push(`image file not found: ${r.image}`); }
    }
  } catch (err) {
    problems = [err.message];
  }
  const warn = r && !r.image ? "  (no image yet)" : "";
  console.log(`  ${problems.length ? "✗" : "✓"} ${slug}${warn}`);
  for (const p of problems) console.log(`      - ${p}`);
  if (problems.length) failed = true;
}

// ---- Contrast (WCAG 2.x) -------------------------------------------------
// Every text/background pairing used in app/styles.css. "large" = 24px+, or 18.66px+ bold.
const PAIRS = [
  ["ink", "paper", "body text on paper"],
  ["ink", "paper-deep", "text on shaded paper"],
  ["ink-soft", "paper", "secondary text on paper"],
  ["ink-soft", "paper-deep", "secondary text on shaded paper"],
  ["ink", "cover", "Recipes cover card"],
  ["ink", "pocket-card", "For Good Measure card"],
  ["paper", "table", "text on the tabletop"],
  ["paper", "leather", "text on leather"],
  ["ink", "tab-breakfast", "Breakfast tab"],
  ["ink", "tab-lunch", "Lunch tab"],
  ["paper", "tab-dinner", "Dinner tab"],
  ["ink", "tab-snacks", "Snacks tab"],
  ["accent-breakfast", "paper", "Breakfast accent text"],
  ["accent-lunch", "paper", "Lunch accent text"],
  ["accent-dinner", "paper", "Dinner accent text"],
  ["accent-snacks", "paper", "Snacks accent text"],
  ["accent-breakfast", "paper-deep", "Breakfast accent on shaded paper"],
  ["accent-lunch", "paper-deep", "Lunch accent on shaded paper"],
  ["accent-dinner", "paper-deep", "Dinner accent on shaded paper"],
  ["accent-snacks", "paper-deep", "Snacks accent on shaded paper"],
  ["accent-dinner", "pocket-card", "Headings on the For Good Measure card"],
  ["paper", "leather-dark", "text on dark leather"],
];

const css = await readFile(join(root, "app/styles.css"), "utf8");
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)[1];
const vars = Object.fromEntries([...rootBlock.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

console.log("\nContrast (AA normal text needs 4.5:1)");
for (const [fg, bg, label] of PAIRS) {
  if (!vars[fg] || !vars[bg]) { console.log(`  ✗ ${label}: --${fg} or --${bg} not defined`); failed = true; continue; }
  const r = ratio(vars[fg], vars[bg]);
  const ok = r >= 4.5;
  if (!ok) failed = true;
  console.log(`  ${ok ? "✓" : "✗"} ${r.toFixed(2).padStart(5)}:1  ${label}  (${vars[fg]} on ${vars[bg]})`);
}

process.exit(failed ? 1 : 0);
