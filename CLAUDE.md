# Recipe book: working notes for Claude

Read README.md for the file format, palette and scripts.

## When the user gives you a new recipe
1. Write `recipes/<slug>.md` (kebab-case slug from the title) in the format in README.md: a short intro in the household's voice (two active adults, running and cycling), grouped ingredients, and steps grouped with `###` when there are distinct phases. Estimate `protein_g` per serving if not given, and say it's an estimate.
2. Find 2–3 **public-domain or CC0** vintage image candidates (NYPL Digital Collections, Library of Congress, Smithsonian Open Access, Internet Archive, Wikimedia Commons, Old Book Illustrations). For modern dishes, search by component (berries, honey, oats, glass dish…). Check each candidate's rights statement on its source page. "No known restrictions" or "Public domain" is fine; anything "CC BY" or with unclear rights is not.
3. Show the user the candidates (thumbnails + source + license) and let them choose before settling.
4. Save the chosen one with `node scripts/add-image.mjs …` (records source, license, credit, alt).
5. Run `npm run check`; it must pass.

## Rules
- All text must meet WCAG AA; `npm run check` enforces 4.5:1 for every pair it lists. Add new pairs to `PAIRS` in `scripts/check.mjs` when you introduce a new text/background combination. Never lighten text with opacity.
- Keep it dependency-free (plain HTML/CSS/ES modules + Node built-ins).
- Keep transitions subtle and honour `prefers-reduced-motion`.

## Git
- Branch names follow `type/short-description` (e.g. `feat/meal-plan`, `fix/tab-contrast`).
- Never add sign-off or attribution trailers (Signed-off-by, Co-Authored-By, session links) to commit messages.
