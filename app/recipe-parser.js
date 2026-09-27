// Parses a recipe Markdown file (see README.md, "Recipe file format").
// Shared by the browser app and the Node scripts, so it must stay dependency-free.

export const TABS = ["breakfast", "lunch", "dinner", "snacks"];

export function parseRecipe(source, slug) {
  const text = source.replace(/\r\n?/g, "\n");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`${slug}: missing --- frontmatter block`);

  const meta = parseFrontmatter(match[1], slug);
  const body = parseBody(match[2]);

  return {
    slug,
    title: meta.title,
    tabs: toList(meta.tabs).map((t) => t.toLowerCase()),
    byline: meta.byline || "",
    serves: meta.serves ?? null,
    protein: meta.protein_g ?? null,
    calories: meta.calories ?? null,
    image: meta.image || "",
    imageAlt: meta.image_alt || "",
    imageCredit: meta.image_credit || "",
    imageSource: meta.image_source || "",
    imageLicense: meta.image_license || "",
    imageTreatment: meta.image_treatment || "natural",
    intro: body.intro,
    ingredients: body.sections.ingredients || [],
    steps: body.sections.steps || [],
    notes: body.sections.notes || [],
  };
}

// Flat `key: value` pairs. Values may be numbers, "quoted strings", or [a, b] lists.
function parseFrontmatter(block, slug) {
  const meta = {};
  for (const [i, raw] of block.split("\n").entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
    if (!m) throw new Error(`${slug}: can't read frontmatter line ${i + 1}: "${raw}"`);
    meta[m[1]] = parseValue(m[2]);
  }
  return meta;
}

function parseValue(value) {
  if (value === "") return "";
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map((v) => parseValue(v.trim())).filter((v) => v !== "");
  }
  if (/^".*"$/.test(value) || /^'.*'$/.test(value)) return value.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function toList(v) {
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

// Body: intro paragraphs, then `## Ingredients`, `## Steps`, `## Notes`.
// Inside a section, `### Group name` starts a group; `- item` or `1. item` add entries.
// A line indented under an entry continues it.
function parseBody(body) {
  const intro = [];
  const sections = {};
  let section = null;
  let group = null;
  let para = [];

  const flushPara = () => {
    if (para.length) intro.push(para.join(" "));
    para = [];
  };

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const item = line.match(/^(?:[-*]|\d+[.)])\s+(.+)$/);

    if (h2) {
      flushPara();
      section = h2[1].trim().toLowerCase();
      sections[section] = [];
      group = null;
    } else if (!section) {
      if (line) para.push(line);
      else flushPara();
    } else if (h3) {
      group = { name: h3[1].trim(), items: [] };
      sections[section].push(group);
    } else if (item) {
      if (!group) {
        group = { name: "", items: [] };
        sections[section].push(group);
      }
      group.items.push(item[1].trim());
    } else if (line && group && group.items.length && /^\s/.test(raw)) {
      group.items[group.items.length - 1] += " " + line;
    } else if (line) {
      // Loose prose inside a section (e.g. Notes) becomes its own entry.
      if (!group) {
        group = { name: "", items: [] };
        sections[section].push(group);
      }
      group.items.push(line);
    }
  }
  flushPara();
  return { intro, sections };
}

// Returns a list of human-readable problems; empty means the recipe is fine.
export function validateRecipe(r) {
  const problems = [];
  if (!r.title) problems.push("missing title");
  if (!r.tabs.length) problems.push("missing tabs");
  for (const t of r.tabs) if (!TABS.includes(t)) problems.push(`unknown tab "${t}" (use ${TABS.join(", ")})`);
  if (!r.intro.length) problems.push("missing intro paragraph");
  if (!r.ingredients.length) problems.push("missing ## Ingredients");
  if (!r.steps.length) problems.push("missing ## Steps");
  if (r.image) {
    for (const k of ["imageCredit", "imageSource", "imageLicense", "imageAlt"]) {
      if (!r[k]) problems.push(`image is set but ${k} is empty`);
    }
  }
  return problems;
}
