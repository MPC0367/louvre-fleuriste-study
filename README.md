# Louvre Fleuriste — design study

An unsolicited O2 design study for Louvre Fleuriste (ร้านดอกไม้ลูฟวร์ เฟลอริสเตอ, Sukhumvit 77, Bangkok).
**Local preview only. Not published and not the shop's site.** Brief: `~/Documents/Louvre-Fleuriste-Opus-5-Master-Prompt.pdf`.

```bash
npm install
npm run dev          # http://localhost:4410  (preview name: louvre)
npm run typecheck
NEXT_DIST_DIR=.next-build npm run build   # build without disturbing a running dev server
```

## Concept — the sitting

The shop photographs every bouquet the same way: held upright in front of the shop's taupe curtain,
fanned grey wrap, striped or silver ribbon, a navy diamond tag. The site is built from that one
frame: the curtain is the backdrop (`.curtain`), the wrap is the paper ground, the navy tag
is the ink and the signature element (`Tag.tsx`). Every choice in the order flow is written onto
the tag (`.ordertag`). Photos are only 640 px, so they sit at native size on the curtain, not stretched full-bleed.

## Where things are

| | |
|---|---|
| `src/content/shop.ts` | Truth ledger: every fact with provenance (`social` / `demo` / `unverified`). Only `social` renders. |
| `src/content/works.ts` | The 12 Instagram posts: the shop's names and captions, plus O2's description of what each photo shows, labelled as such on the page |
| `src/content/i18n.ts` | Thai and English copy, each written for its own reader |
| `src/lib/rules.ts` | Booking rules. **All `demo`**: lead time, cutoff, capacities, windows, blackout, peak days, budget tiers |
| `src/lib/booking.ts` · `db.ts` | Availability, validation, order creation under `BEGIN IMMEDIATE`, idempotency, hashed view tokens. SQLite in `.data/` |
| `src/components/Composer.tsx` | The 5-step order flow (draft kept in localStorage, steps in `?step=`) |
| `src/components/Feed.tsx` | Instagram page: snapshot grid + lightbox (`?post=` deep links, swipe, keys) |

Routes: `/th` `/en` · `/works` (`?colour=`) · `/works/[id]` · `/order` (`?work=`, `?kind=`, `?colour=`) · `/order/[ref]?t=` · `/instagram` · `/contact`.

## Verified (2026-09-27)

Six parallel orders into a four-place window → 4 created, 2 refused `slot_full`. Replayed idempotency key →
same order. Double-click on Send → one order. Cross-origin POST → 403. Non-image upload → 415. TH↔EN switch at the
review step keeps the order. No horizontal overflow or broken images at 390 px on all routes. Production build passes.

## Before this goes anywhere

See `../documents/VERIFY-WITH-SHOP.md`. Photographs are the shop's (see `NOTICE.md`) and are git-ignored, copied in
from `../documents/instagram-2026-09-27/` by `npm run photos`.

## Admin demo — `/th/admin`, `/en/admin`

Orders (filters and the open order live in the URL), a 14-day load strip, an order drawer (status, payment,
internal notes, reference picture, card message, call), capacity (35 days, per-window load, block/reopen a day,
which closes it on the customer calendar at once), ordering rules, and CSV export. `src/lib/admin.ts`, `src/app/[lang]/admin/`.
**No sign-in**: it runs only outside production or with `LF_ADMIN_DEMO=1`. Sample orders (`seed = 1`, `LF-S…`) are
re-created relative to today on every start, so admin edits reset on restart.

## Single-file snapshot

`snapshot/louvre-fleuriste.html` (git-ignored, embeds the shop's photos): 106 pages, site + admin, TH + EN, one worked
order from the hydrangea bouquet to confirmation to the admin. Calls, saving, uploads and exports show a note.

```bash
npm run snapshot:build                 # production build → .next-build
# start preview `louvre-snapshot` (:4411, own database in .data-snapshot/)
npm run snapshot                       # → snapshot/louvre-fleuriste.html
# preview `louvre-file` serves it on :4412
```

## Round 2 (2026-09-27)

- **Logo**: the shop's lattice mark redrawn as vector (`src/components/Logo.tsx`, checked against `documents/brand/louvre-logo-supplied.webp`); wordmark in Jost.
- **Loader**: navy screen with the lattice drawing itself, on first load and every path change (not on filters/steps). ~650 ms, CSS failsafe.
- **More photos**: save any photo of the shop's work into `../documents/more-photos/` and run `npm run photos` (runs before `dev`): it is resized, given an id and sorted into colour families by its pixels (`src/content/extra-works.json`). A filename containing "box" marks a flower box.
- **Map**: the live site embeds Google Maps at the Google-listed studio (Sathon, marked "to confirm" against the Sukhumvit 77 bio). The snapshot swaps it for a drawn OpenStreetMap map (`scripts/build-map.mjs` → `src/content/map/sathon.json`, drag / pinch / ctrl+scroll).
- **Artifact**: `npm run snapshot` also writes `snapshot/artifact/louvre-fleuriste-study.html` (no html/head wrapper). Published privately at https://claude.ai/artifact/RvaQA2VpbDAhx4Banyib9f — republish that file to update the same link.

## Photos and enhancement (2026-09-28)

All photo work runs locally; nothing is sent to an online service.

| Source | Pipeline | Used as |
|---|---|---|
| `documents/instagram-2026-09-27/` (12 × 640px) | `superres-batch.py` (EDSR ×4) → `enhance-instagram.mjs` | `documents/instagram-enhanced/` 1440px, preferred by `photos.mjs` |
| `documents/grid-screenshots/` (3 phone screenshots of the feed) | `cut-grid.mjs` → `grid-tiles/` (~178px) → `superres-batch.py` → `enhance-tiles.mjs` | `documents/more-photos/grid-*.jpg` (~712px), 83 pieces; filename marks box / vase / christmas |
| `documents/lifestyle/originals/` | `superres.py` → `enhance-lifestyle.mjs` (02 and 03 were enhanced by the studio and are used as supplied) | `documents/lifestyle/NN-*.jpg` → "Handed over" section |
| `documents/brand/shop-front-maps-screenshot.webp` | crop → `superres.py` → finish | `documents/brand/shop-front.jpg` |

Tile fixes from the 2026-09-28 review (in `enhance-tiles.mjs`): `8-28` uses the plain Lanczos upscale because the model left artefacts, and `8-14` / `8-16` take one corner from the plain upscale through a feathered ellipse, because the model smeared a striped shirt.

Display rule: grid photos (`x-grid-*`, ~712px) stay in slots of about 380 CSS px or less (the detail page caps them at 380px, and the home box card sits in the curtain frame). Instagram (1440px) and lifestyle photos take the large slots. `next.config.mjs` deviceSizes run to 1920, so retina screens get the full files.

`npm run photos` (runs before `dev`) copies everything into `public/works/` and regenerates `src/content/extra-works.json` and `lifestyle.json`. The model lives in `~/.cache/o2-superres/EDSR_x4.pb` and runs with `uv run --with opencv-contrib-python scripts/superres-batch.py <in> <out>`. `scripts/qa-sheets.mjs` builds before/after sheets for review.

## Polish pass (2026-09-28)

Three audit rounds, each run by independent headless-browser auditors with every finding reproduced by a second agent. Round 1 found 41 issues and round 2 found 54; all were fixed. Round 3 confirmed 61 of the round-2 fixes held and found 10 small follow-ups, also fixed. The trails are in `.cache/audit/`, `.cache/audit2/` and `.cache/audit3/` (`confirmed.md` / `confirmed.json` in each).

- **Motion.** The loader holds a link's navigation until it is opaque, then fires `lf:loaded`. Reveals and the hero carousel wait for it. Back/Forward don't replay reveals, and filter taps don't blank the gallery. The hero crossfade no longer dips. The strip drifts at sub-pixel precision, and both moving parts have Pause/Play controls.
- **Images.** `sizes` values account for cover crops. `deviceSizes` run to 1920 and `qualities` are set. Grid photos stay in slots where their ~712px holds up, and the lightbox serves 1440px.
- **Thai.** Loanwords go through `src/lib/thai.ts`. Hand-placed joiners (`wj()` in i18n.ts) keep phrases whole. Dates and prices use NBSP.
- **Accessibility.** The mobile menu, lightbox, admin drawer and calendar all keep focus in the right place. The calendar grid has proper rows and selection. `--text-3` meets AA contrast. Controls animate at 280ms.

## Studio-enhanced photos (2026-09-28)

The studio supplied 83 enhanced full-resolution photos ("enhanced images", hard-linked into `documents/studio-enhanced/`).

- **60 replace grid photos.** Numbers 002–061 are grid tiles 8-01 to 9-30 in order; each pair was checked side by side in `.cache/enhanced-match/pairs.jpg`. `enhance-tiles.mjs` uses them in place of the AI upscales. 018 is 8-17, the closed-notice post, and stays off the site.
- **23 are new works.** 001 and 062–083 were not in the grid screenshots, so they are added as new works (`x-studio-NNN`; 069 is a box).
- **Small slots.** `Work.lowres` (long side under 1000px) marks the 24 grid photos still at their AI upscale (7-01 to 7-24); only those keep the small detail frame and box-card cap.
- **Christmas card.** It uses the shop's tree again (`x-grid-8-02-christmas-box`), now sharp.
