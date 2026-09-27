import { TABS, parseRecipe, validateRecipe } from "./recipe-parser.js";

const TAB_INFO = {
  breakfast: { name: "Breakfast", blurb: "Early starts, pre-run fuel, and the first protein of the day." },
  lunch: { name: "Lunch", blurb: "Midday bowls that hold up in a container and refill the tank." },
  dinner: { name: "Dinner", blurb: "Carbs for tomorrow's miles and protein to rebuild tonight." },
  snacks: { name: "Snacks", blurb: "Small plates for between rides, before bed, and after work." },
};

const $ = (id) => document.getElementById(id);
const closed = $("closed");
const book = $("book");
const spread = $("spread");
const left = $("page-left");
const right = $("page-right");
const tabsNav = $("tabs");

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 760px)");

let recipes = [];
let bySlug = new Map();
let spreads = []; // ordered list of spread keys: "contents", "dinner", "dinner/slug" ...
let currentKey = null;
let turning = null;

// ---------------------------------------------------------------- data

async function load() {
  try {
    const res = await fetch("api/recipes", { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const files = await res.json();
    recipes = [];
    for (const { slug, source } of files) {
      try {
        const r = parseRecipe(source, slug);
        const problems = validateRecipe(r);
        if (problems.length) console.warn(`recipes/${slug}.md:`, problems.join("; "));
        recipes.push(r);
      } catch (err) {
        console.error(err.message);
      }
    }
  } catch (err) {
    recipes = [];
    showLoadError(err);
  }
  recipes.sort((a, b) => a.title.localeCompare(b.title));
  bySlug = new Map(recipes.map((r) => [r.slug, r]));
  spreads = ["contents"];
  for (const tab of TABS) {
    spreads.push(tab);
    for (const r of inTab(tab)) spreads.push(`${tab}/${r.slug}`);
  }
}

function showLoadError(err) {
  console.error("Couldn't load recipes:", err);
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<p class="load-error" role="alert">Couldn't load the recipes (${esc(err.message)}). Start the book with <code>npm start</code> and open the address it prints.</p>`,
  );
}

const inTab = (tab) => recipes.filter((r) => r.tabs.includes(tab));
const pageOf = (key) => 2 + 2 * Math.max(0, spreads.indexOf(key));

// ---------------------------------------------------------------- helpers

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const pad = (n) => String(n).padStart(2, "0");

function proteinLine(r) {
  const bits = [];
  if (r.protein != null) bits.push(`≈${r.protein}g protein`);
  if (r.calories != null) bits.push(`≈${r.calories} kcal`);
  if (r.serves != null) bits.push(`serves ${r.serves}`);
  return bits.join(" · ");
}

function plate(r, tab, { size = "large" } = {}) {
  const treatment = r.image && r.imageTreatment === "duotone" ? " plate-duotone" : "";
  const inner = r.image
    ? `<img src="${esc(r.image)}" alt="${esc(r.imageAlt)}" loading="lazy">`
    : `<span class="plate-empty">${bowlSvg()}<span class="plate-empty-label">Plate to come</span></span>`;
  const credit =
    size === "large" && r.image
      ? `<figcaption class="credit">${esc(r.imageCredit)}${r.imageLicense ? `. ${esc(r.imageLicense)}` : ""}${
          r.imageSource ? `. <a href="${esc(r.imageSource)}" target="_blank" rel="noopener">Source</a>` : ""
        }</figcaption>`
      : "";
  return `<figure class="plate plate-${size}${treatment}" data-tab="${tab}"><span class="plate-frame">${inner}</span>${credit}</figure>`;
}

function bowlSvg() {
  // A simple engraved-style bowl, drawn in the current text color.
  return `<svg viewBox="0 0 120 80" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M44 22c-4-6 4-8 0-14M60 20c-4-6 4-8 0-14M76 22c-4-6 4-8 0-14"/>
      <ellipse cx="60" cy="36" rx="46" ry="8"/>
      <path d="M14 36c2 22 20 34 46 34s44-12 46-34"/>
      <path d="M44 70l-4 6h40l-4-6"/>
      <path d="M26 46c6 8 16 12 26 13M34 54c5 4 11 6 18 7" stroke-width="1.2"/>
    </g></svg>`;
}

// ---------------------------------------------------------------- views

function contentsView() {
  const rows = TABS.map((tab) => {
    const n = inTab(tab).length;
    return `<li><a class="leader" href="#/${tab}"><span class="leader-text">${TAB_INFO[tab].name}
      <small>${n} recipe${n === 1 ? "" : "s"}</small></span><span class="leader-dots"></span><span class="leader-num">${pageOf(tab)}</span></a></li>`;
  }).join("");
  return {
    tab: null,
    left: `
      <header class="page-head"><h1 class="display">Contents</h1></header>
      <hr class="rule">
      <ol class="index-list contents-list">${rows}</ol>
      <p class="page-note">Use the tabs along the bottom edge to turn to a section.</p>`,
    right: `
      <section class="measure-card">
        <h2 class="measure-title">For Good Measure</h2>
        <h3 class="caps-head">Roasting potatoes</h3>
        <ol class="measure-steps">
          <li>Cube sweet and golden potatoes.</li>
          <li>Rinse, then dry them well.</li>
          <li>Toss in oil and salt.</li>
          <li>Roast in one layer at <strong>425°F</strong> for 30–35 minutes, flipping halfway.</li>
        </ol>
        <h3 class="caps-head">Kitchen equivalents</h3>
        <table class="equivalents">
          <tr><td>3 teaspoons</td><td>1 tablespoon</td></tr>
          <tr><td>16 tablespoons</td><td>1 cup</td></tr>
          <tr><td>16 ounces</td><td>1 pound</td></tr>
          <tr><td>1 ounce</td><td>28 grams</td></tr>
          <tr><td>425°F</td><td>220°C</td></tr>
        </table>
      </section>`,
  };
}

function indexView(tab, previewSlug) {
  const list = inTab(tab);
  const rows = list
    .map(
      (r) => `<li><a class="leader" href="#/${tab}/${r.slug}" data-preview="${r.slug}">
        <span class="leader-text">${esc(r.title)}${r.protein != null ? `<small>≈${r.protein}g protein</small>` : ""}</span>
        <span class="leader-dots"></span><span class="leader-num">${pageOf(`${tab}/${r.slug}`)}</span></a></li>`,
    )
    .join("");
  const preview = bySlug.get(previewSlug) && list.includes(bySlug.get(previewSlug)) ? bySlug.get(previewSlug) : list[0];
  return {
    tab,
    left: `
      <header class="page-head">
        <p class="kicker">Index</p>
        <h1 class="display">${TAB_INFO[tab].name}</h1>
      </header>
      <hr class="rule">
      <p class="section-blurb">${TAB_INFO[tab].blurb}</p>
      <hr class="rule">
      ${list.length ? `<ol class="index-list">${rows}</ol>` : `<p class="empty">No recipes filed here yet.</p>`}`,
    right: preview ? previewHtml(preview, tab) : `<div class="preview preview-empty">${plate({}, tab, { size: "small" })}</div>`,
  };
}

function previewHtml(r, tab) {
  return `<div class="preview">
      ${plate(r, tab, { size: "small" })}
      <h2 class="preview-title">${esc(r.title)}</h2>
      ${r.byline ? `<p class="byline">By ${esc(r.byline)}</p>` : ""}
      <p class="meta-line">${esc(proteinLine(r))}</p>
      <a class="turn-link" href="#/${tab}/${r.slug}">Turn to page ${pageOf(`${tab}/${r.slug}`)} →</a>
    </div>`;
}

function recipeView(tab, r) {
  let n = 0;
  const ingredients = r.ingredients
    .map(
      (g) => `<section class="ing-group">
        ${g.name ? `<h3 class="ing-head">${esc(g.name)}</h3>` : ""}
        <ul class="ing-list">${g.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
      </section>`,
    )
    .join("");
  const steps = r.steps
    .map(
      (g) => `${g.name ? `<h3 class="step-head">(${esc(g.name)})</h3>` : ""}
        <ol class="step-list">${g.items.map((s) => `<li><span class="step-num">${pad(++n)}</span><span>${esc(s)}</span></li>`).join("")}</ol>`,
    )
    .join("");
  const notes = r.notes.length
    ? `<section class="notes"><h3 class="step-head">(Notes)</h3>${r.notes
        .flatMap((g) => g.items)
        .map((t) => `<p>${esc(t)}</p>`)
        .join("")}</section>`
    : "";
  return {
    tab,
    left: `
      <a class="back-link" href="#/${tab}">← ${TAB_INFO[tab].name} index</a>
      <header class="recipe-head">
        <h1 class="display recipe-title">${esc(r.title)}</h1>
        <hr class="rule">
        ${r.byline ? `<p class="byline">By ${esc(r.byline)}</p><hr class="rule">` : ""}
        ${proteinLine(r) ? `<p class="meta-line">${esc(proteinLine(r))}</p><hr class="rule">` : ""}
      </header>
      ${plate(r, tab)}
      <hr class="rule">
      <div class="intro">${r.intro.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`,
    right: `
      <div class="ingredients">${ingredients}</div>
      <div class="steps">${steps}</div>
      ${notes}`,
  };
}

// ---------------------------------------------------------------- rendering

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (!parts.length) return { closed: true };
  if (parts[0] === "contents") return { key: "contents" };
  const [tab, slug] = parts;
  if (!TABS.includes(tab)) return { key: "contents" };
  if (slug && bySlug.has(slug) && bySlug.get(slug).tabs.includes(tab)) return { key: `${tab}/${slug}`, tab, slug };
  return { key: tab, tab };
}

function viewFor(route) {
  if (route.key === "contents") return contentsView();
  if (route.slug) return recipeView(route.tab, bySlug.get(route.slug));
  return indexView(route.tab);
}

function renderTabs(active) {
  tabsNav.innerHTML = TABS.map(
    (tab) =>
      `<a class="tab tab-${tab}${tab === active ? " is-active" : ""}" href="#/${tab}"${
        tab === active ? ' aria-current="true"' : ""
      }>${TAB_INFO[tab].name}</a>`,
  ).join("");
}

function setPages(view, key) {
  const [pl, pr] = [pageOf(key), pageOf(key) + 1];
  left.innerHTML = `<div class="page-body">${view.left}</div><span class="folio folio-left">${pl}</span>`;
  right.innerHTML = `<div class="page-body">${view.right}</div><span class="folio folio-right">${pr}</span>`;
  spread.dataset.tab = view.tab || "";
  spread.dataset.view = key === "contents" ? "contents" : key.includes("/") ? "recipe" : "index";
}

function route() {
  const r = parseRoute();
  if (r.closed) return showClosed();
  const opening = !book.hidden ? false : true;
  const view = viewFor(r);
  const prevKey = currentKey;
  currentKey = r.key;
  document.title = r.slug ? `${bySlug.get(r.slug).title} · Recipes` : r.tab ? `${TAB_INFO[r.tab].name} · Recipes` : "Recipes";
  renderTabs(view.tab);

  if (opening) {
    setPages(view, r.key);
    return showBook();
  }
  if (prevKey === r.key) return setPages(view, r.key);

  const forward = spreads.indexOf(r.key) > spreads.indexOf(prevKey);
  turnPage(forward, () => setPages(view, r.key));
}

function focusPage() {
  // Move focus to the new spread for keyboard and screen-reader users.
  const h = left.querySelector("h1");
  if (h) {
    h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll: true });
  }
  if (narrow.matches) spread.scrollIntoView({ block: "start", behavior: reducedMotion.matches ? "auto" : "smooth" });
}

// A single leaf turns over the gutter. Forward: the right page lifts and lands
// on the left. Backward: the left page lifts and lands on the right.
function turnPage(forward, render) {
  if (turning) turning.finish();
  if (reducedMotion.matches || narrow.matches) {
    render();
    focusPage();
    return;
  }
  const oldLeft = left.innerHTML;
  const oldRight = right.innerHTML;
  render();
  const newLeft = left.innerHTML;
  const newRight = right.innerHTML;

  const leaf = document.createElement("div");
  leaf.className = `leaf ${forward ? "leaf-forward" : "leaf-back"}`;
  leaf.setAttribute("aria-hidden", "true");
  leaf.innerHTML = forward
    ? `<div class="leaf-face leaf-front page page-right">${oldRight}</div><div class="leaf-face leaf-back-face page page-left">${newLeft}</div>`
    : `<div class="leaf-face leaf-front page page-left">${oldLeft}</div><div class="leaf-face leaf-back-face page page-right">${newRight}</div>`;
  leaf.querySelectorAll("a, [tabindex]").forEach((el) => el.setAttribute("tabindex", "-1"));

  // The page the leaf will land on keeps its old content until the leaf covers it.
  const landing = forward ? left : right;
  const landingContent = forward ? newLeft : newRight;
  landing.innerHTML = forward ? oldLeft : oldRight;
  landing.setAttribute("inert", "");
  spread.appendChild(leaf);

  const finish = () => {
    if (!leaf.isConnected) return;
    leaf.remove();
    landing.innerHTML = landingContent;
    landing.removeAttribute("inert");
    turning = null;
    focusPage();
  };
  turning = { finish };
  leaf.addEventListener("animationend", finish, { once: true });
  setTimeout(finish, 1200); // safety net if animationend never fires
}

function showBook() {
  // Only play the cover animation when the closed book was actually on screen.
  const animate = !reducedMotion.matches && !closed.hidden;
  const reveal = () => {
    closed.hidden = true;
    closed.classList.remove("is-opening");
    book.hidden = false;
    book.classList.toggle("is-arriving", animate);
    focusPage();
  };
  if (animate) {
    closed.classList.add("is-opening");
    setTimeout(reveal, 650);
  } else reveal();
}

function showClosed() {
  const wasOpen = currentKey !== null;
  currentKey = null;
  document.title = "Recipes";
  book.hidden = true;
  closed.hidden = false;
  if (wasOpen) closed.querySelector(".stand").focus({ preventScroll: true });
}

// ---------------------------------------------------------------- events

// Hovering or focusing an index entry previews that recipe on the right page.
spread.addEventListener("pointerover", preview);
spread.addEventListener("focusin", preview);
function preview(e) {
  const a = e.target.closest?.("[data-preview]");
  if (!a || turning || spread.dataset.view !== "index") return;
  const r = bySlug.get(a.dataset.preview);
  const tab = spread.dataset.tab;
  if (!r || right.dataset.preview === r.slug) return;
  right.dataset.preview = r.slug;
  right.querySelector(".page-body").innerHTML = previewHtml(r, tab);
}

// Left/right arrow keys turn through the book.
document.addEventListener("keydown", (e) => {
  if (book.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest("input, textarea, select")) return;
  const i = spreads.indexOf(currentKey);
  if (e.key === "ArrowRight" && i < spreads.length - 1) location.hash = `#/${spreads[i + 1]}`;
  else if (e.key === "ArrowLeft" && i > 0) location.hash = `#/${spreads[i - 1]}`;
  else if (e.key === "Escape") location.hash = "#/";
});

window.addEventListener("hashchange", () => {
  delete right.dataset.preview;
  route();
});

await load();
route();
