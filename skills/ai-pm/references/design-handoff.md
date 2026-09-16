# Design & Handoff Reference

Conventions for visual mockups, design tokens, iteration workflow, and development handoff.

---

## Core Principle: Physical Isolation

Design files and production code are always separate artifacts:

```
docs/03_DESIGN/          ← visual iteration happens here
  design-tokens.md
  screens/
    home.html
    detail.html
    settings.html
  handoff/
    home.md
    detail.md

src/                     ← only touched after design is confirmed
```

Visual changes → edit `docs/03_DESIGN/` only.
Production implementation → only after the screen's handoff note exists and is confirmed.

---

## Design Tokens

`docs/03_DESIGN/design-tokens.md` holds the project's real token set. **Never a fill-in-the-blank template** — a blank template can only be filled by guessing, and guessed tokens are exactly what makes injected or mocked UI look foreign to the product.

How the file gets filled depends on the Scene 5 routing decision.

### Brownfield — extract from the live page (default when a product page exists)

Run product-feature-helper's `scripts/design-system.js` against the target page and paste back its `cssText`:

1. Agent can reach the page → run the script's content via Browser Use.
2. Page needs login or is unreachable → ask the user to run it in their own Console and return `copy(window.__uiDS.cssText)`. The script is **read-only** (only `querySelector` / `getComputedStyle` / CSS variable reads — no DOM writes, no requests, no listeners, no storage), so it is safe to hand over; say so.

Paste the returned `cssText` into `design-tokens.md` verbatim:

```markdown
# Design Tokens — {project_id}

**Source:** extracted from `{target page URL}` via product-feature-helper `scripts/design-system.js` on {date}
**Fidelity:** real tokens + component recipes from the live page — not guessed

## Extracted cssText

```css
:root {
  --pfh-color-primary: #3370ff;
  /* ...full cssText as returned, unedited... */
}
.pfh-btn-primary { /* ...real component recipe... */ }
```

## Notes
- Items reported under `confidence.fellBackToDefault` are **generic defaults, not site conventions** —
  if any of them matters for this feature, re-extract with a better anchor or flag it to the user.
```

**Keep the `--pfh-*` variable names and `.pfh-*` component classes exactly as returned. Do not translate them into semantic names.** Translation drops the component recipes (things like `.pfh-btn-primary`), and those are the more valuable half of the extraction. The naming looks foreign inside an ai-pm project; that cost is accepted deliberately.

Once extracted, all mockups and injection scripts reference only `var(--pfh-*)` and `.pfh-*`. Never hardcode a one-off color or size in an individual screen.

### Greenfield — declare an intentional set

With no page to extract from, the design principle inverts: **be opinionated**. Write out an actual, committed token set — real values, chosen on purpose, with the visual direction named:

```markdown
# Design Tokens — {project_id}

**Source:** authored for this project — no existing product to extract from
**Visual direction:** {e.g. editorial / utilitarian / minimal} — state it and commit to it

## Color
- Primary: #2F5BEA        # every value is a real decision, never a blank
- Surface: #FFFFFF
- Text primary: #101828
  ...

## Typography
- Font family: {a specific stack, chosen intentionally — not the system default}
- Size scale: 12 / 14 / 16 / 20 / 24 / 32px

## Spacing
- Base unit: 4px
- Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px

## Border radius
- Small 6px (inputs, chips) / Medium 10px (cards) / Large 16px (modals, sheets)

## Elevation
- Level 1 card / Level 2 dropdown / Level 3 modal — real shadow values
```

**Every token must carry a real value.** If a value genuinely cannot be decided yet, mark it `[待定-XXX]` with the question stated and surface it in conversation — do not leave a blank line that looks like a decision.

---

## Screen Mockup Format

Each screen is one self-contained HTML file. Rules:

- **All styles inline** — no external CSS, no build tools
- **Static only** — interactions described in text comments, not implemented in JS
- **Opens in any browser** — no dependencies
- **References tokens** — use CSS variables at the top of the `<style>` block

File naming: `{screen-name}.html`
Examples: `home.html`, `onboarding-step-1.html`, `settings-notifications.html`

### HTML template

Token values below are illustrative of the **shape** — always substitute the project's real
`design-tokens.md` values. On the brownfield path, paste the extracted `--pfh-*` block as-is.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Screen Name} — {Project}</title>
  <style>
    /* Design tokens — copied from docs/03_DESIGN/design-tokens.md, never invented here */
    :root {
      --color-primary: #2F5BEA;
      --color-surface: #FFFFFF;
      --color-text-primary: #101828;
      --color-text-secondary: #667085;
      --color-border: #E4E7EC;
      --radius-md: 10px;
      --space-4: 4px;
      --space-8: 8px;
      --space-16: 16px;
      --space-24: 24px;
    }

    /* Screen styles — reference tokens only, no one-off literals */
    body { margin: 0; font-family: var(--font-family, system-ui); background: var(--color-surface); }
    /* ... */
  </style>
</head>
<body>
  <!-- Screen content -->

  <!-- INTERACTION NOTES:
    - Tapping [X] opens the detail sheet
    - Pull-to-refresh triggers data reload
    - Long-press on list item reveals delete action
  -->
</body>
</html>
```

---

## Visual Quality Standard

Mockups should be **opinionated and specific** — not wireframes, not generic UI. Apply a clear aesthetic direction:

- Choose a visual tone and commit to it (minimal / editorial / utilitarian / etc.)
- Typography choices should feel intentional — avoid system fonts
- Color usage should create hierarchy, not just fill space
- Spacing should feel designed, not default

The goal: a stakeholder looking at the mockup should immediately understand what the product feels like, not just what it contains.

---

## Iteration Workflow

```
1. Scene 3 (Interaction Design) + Scene 4 (Entity Definition) produce: page list, information hierarchy, entity model
        ↓
2. Scene 5 produces: design-tokens.md + first-pass HTML mockups
        ↓
3. Visual review: open in browser, discuss, edit HTML only
        ↓
4. Design confirmed: write handoff note in docs/03_DESIGN/handoff/
        ↓
5. Development: dev agent reads handoff note + mockup, implements in src/
        ↓
6. If visual tweaks needed post-implementation: update mockup first, then src/
```

Never jump from step 3 to step 5 without a handoff note.

---

## Handoff Note Format

File: `docs/03_DESIGN/handoff/{screen-name}.md`

```markdown
# Handoff: {Screen Name}

**Mockup:** `docs/03_DESIGN/screens/{screen-name}.html`
**Status:** Ready for development / Needs revision

## Components
- [ ] {Component name}: {brief description}
- [ ] {Component name}: {brief description}

## Key Interactions
- {Trigger} → {Result}: {any relevant state change}
- {Trigger} → {Result}: {any relevant state change}

## Entities & State Changes
- {EntityName}.{field} changes from {A} to {B} when {action}
- Reads: {list of entities/fields displayed}
- Writes: {list of entities/fields modified}

## Edge Cases
- {Condition}: {how to handle}
- {Condition}: {how to handle}

## Open Questions
- [ ] {Question that needs resolution before or during development}
```

---

## Scene 3/4 → Scene 5 Transition

Before starting mockups, confirm this checklist is complete from Scene 3 (Interaction Design) and Scene 4 (Entity Definition):

- [ ] Screen list defined (from Screen Tree in Framework PRD)
- [ ] Each screen's information hierarchy described
- [ ] Primary interactions per screen listed
- [ ] Entity model defined and validated against page structure
- [ ] Design tokens drafted (colors, type, spacing)

If any item is missing, return to the relevant scene before generating HTML.
