# Recipes: a vintage ring-bound recipe book

A small local web app for the household's recipes. It opens as a ring-bound stand with a mustard "Recipes" card. Click the card to open the book, use the divider tabs along the bottom edge to turn to a section, and pick a recipe from the section's index to open its zine-style spread.

## Running it

```sh
npm start          # serves the book at http://localhost:5173
npm run check      # checks every recipe file and the palette's WCAG contrast
```

You need Node 18 or newer. There are no dependencies to install. The server reads `recipes/` on every request, so a new or edited recipe shows up when you refresh the page.

Keyboard: ← and → turn through the book, Esc closes it.

## Folder structure

```
index.html              page shell: the closed stand and the open spread
app/
  app.js                routing (#/contents, #/dinner, #/dinner/<slug>), views, page turn
  recipe-parser.js      reads a recipe .md file; shared by the app and the scripts
  styles.css            palette, textures, layouts
  fonts/                Newsreader, Work Sans, Yesteryear (SIL Open Font License)
recipes/                one Markdown file per recipe; the filename is the recipe's URL slug
images/                 recipe plates, named after the recipe slug
scripts/
  serve.mjs             zero-dependency local server (+ /api/recipes)
  check.mjs             recipe validation + contrast report
  add-image.mjs         downloads an image and records its credit in a recipe
```

## Recipe file format

`recipes/turkey-potato-bowl.md`:

```markdown
---
title: Turkey + Potato Bowl
tabs: [lunch, dinner]          # any of: breakfast, lunch, dinner, snacks
byline: The House Kitchen
serves: 2
protein_g: 40                  # per serving, estimate
calories: 650                  # optional
image: images/turkey-potato-bowl.jpg
image_alt: "Engraving of sweet potatoes on a plate"
image_credit: "Artist, Title (Book, 1890). Library of Congress"
image_source: https://www.loc.gov/item/...
image_license: "Public domain"
image_treatment: duotone       # optional: prints the image as a two-tone engraving
---

Intro paragraph(s) for the left page.

## Ingredients

### The potatoes
- 1 large sweet potato
- 2 golden potatoes

### The pan
- 1 lb ground turkey

## Steps

### Roasting the potatoes
1. Heat the oven to 425°F...

### Building the bowl
1. Brown the turkey...

## Notes
Optional extra tips.
```

- Frontmatter is flat `key: value` lines. Lists use `[a, b]`. Lines starting with `#` are comments.
- Text before the first `##` heading is the intro.
- `###` headings group ingredients and steps. Groups are optional.
- Step numbers run on across groups (01, 02 … 08), like the zine layout. The number you type doesn't matter.
- A recipe in more than one tab appears in each tab's index.

## Palette

Aged paper and ink on a leather board. Each divider tab has its own fill and a darker accent that is used as text on paper. `npm run check` verifies every text/background pair below at 4.5:1 or better (AA for normal text), even where only 3:1 would be needed. Text is never lightened with opacity.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#f4e8cc` | pages |
| `--paper-deep` | `#e7d4a9` | shaded paper, shadows |
| `--ink` | `#2b1e16` | all body text (13.3:1 on paper) |
| `--ink-soft` | `#5b4433` | captions, small labels (7.4:1) |
| `--cover` | `#deb04b` | the mustard "Recipes" card (ink 8.0:1) |
| `--pocket-card` | `#efe3c4` | "For Good Measure" card |
| `--leather` / `-light` / `-dark` | `#6a4327` / `#86593a` / `#45291a` | board and book cover |
| `--brass` | `#b8955a` | rings |
| `--table` | `#1e1611` | tabletop background (paper text 14.6:1) |

| Tab | Fill | Text on fill | Accent (text on paper) |
|---|---|---|---|
| Breakfast | marigold `#e2ab45` | ink, 7.8:1 | `#74500e`, 6.0:1 |
| Lunch | sage `#a8b889` | ink, 7.6:1 | `#4a5a2f`, 6.2:1 |
| Dinner | tomato `#b0412c` | paper, 4.7:1 | `#9a3522`, 5.9:1 |
| Snacks | dusty blue `#93b3c2` | ink, 7.3:1 | `#3b5f71`, 5.6:1 |

To change a color, edit the `:root` block in `app/styles.css` and run `npm run check`.

## Images

Every plate must be public domain or CC0, with its source URL and license recorded in the recipe. Good sources: NYPL Digital Collections, Library of Congress, Smithsonian Open Access, Internet Archive cookbook scans, Wikimedia Commons, Old Book Illustrations. Modern dishes won't appear in old cookbooks, so search by component instead (berries, honey, oats, a glass dessert dish).

```sh
node scripts/add-image.mjs chobani-yogurt-bowl "https://…/file.jpg" \
  --source "https://…/item-page" --license "Public domain" \
  --credit "Artist, Title (Book, 1890). Library" --alt "Engraving of a bowl of berries"
```

A recipe with no image shows a "Plate to come" placeholder in its tab color.

## Later

- Weekly meal-plan calendar with drag-and-drop and a grocery list
- Daily targets: 2000–2700 kcal and 115–130 g protein per person, carbs prioritized
- Possibly MyFitnessPal sync
