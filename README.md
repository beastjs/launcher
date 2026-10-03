# launcher

A [Beast](https://www.npmjs.com/package/beast-tsrx) project powered by
[TSRX](https://tsrx.dev/) and [Octane](https://octanejs.dev/).

```bash
bun install
bun run dev
```

The starter is one quiet screen: a headline, a counter that shows component
state, and links to the docs. It follows the system light/dark preference. The
palette, type, and motion live in a few custom properties at the top of
`src/style.css`.

Edit `src/App.btsx` to get started. Declare typed props at the top of the BTSX
file; the Beast bundler adapter compiles it into native TSRX and then lets Octane
produce the browser module.

The starter pins the tested `octane@0.7.1` toolchain. Run the complete local
verification before shipping:

```bash
bun run check
```

Use `scope` when setup belongs to an exact child position instead of the whole
component:

```btsx
scope
  setup const label = "Owned by this child";
  p #{label}
```

Octane signals need no build option. Import `octane/signals` in a module to
enable native signal reads there:

```btsx
import { createScope } from "octane/signals"
```

Record application changes in [CHANGELOG.md](CHANGELOG.md).

## Page and navigation generator

```bash
bun run gen            # interactively add a page, external link, or card item
bun run gen --diff     # show diffs before confirming
bun run gen --dry-run  # plan changes without writing
bun run gen --dry-run --diff # preview diffs without writing
bun run gen --routes   # list registered page routes
bun run gen --rm       # select and remove a page (--remove also works)
```

The generator updates `src/lib/navs.ts` and, for pages, creates a `.btsx`
component, updates `src/pages/index.ts`, and registers a lazy route in
`src/router.ts`. Pass `--diff` to preview diffs before confirming writes or removals.
Vite handles these imports and reloads the app through the existing Beast plugin;
no additional Vite plugin is required. Start it with `bun run dev`.

Choose **Card item** to add a card to an existing navigation page such as
`/converters`. Select a destination route or scaffold a new child page. The card
updates the parent list without adding another sidebar item. Generated
`PageHolder` placeholders can become card grids; custom pages are offered only
when they already use an inline object list with `HyperList(data={...})`.
Card ids and destinations must be unique within the list. `--diff` and
`--dry-run` work for cards too.

Run the generator checks with `bun test scripts/gen`.

## Icon browser

`/icons` manages saved collections; `/icons/:iconSetId` browses, searches, and
copies their SVGs or Beast symbol entries. Data fetching lives in
`src/hooks/use-icon-cache.ts`, using Iconify's public `/collection`, `/collections`,
and icon-data endpoints. Metadata and icon requests are cached and deduplicated.
The collection toolbar can load all matching icons. Star an icon to save it to
`/icons/favorites`, where you can search, preview, copy, and remove saved icons
across collections. Favorites include their SVG data and persist in this browser
under the versioned `icon-favorites-v1` localStorage key.
Click an icon preview or name to open `/icons/:iconSetId/:iconName`. The detail
page optimizes it with SVGO in a Vite module worker and supports before/after
previews, precision and formatting controls, copying, and SVG downloads.

This Vite SPA does not use Next.js API routes. The old `/api/icones` proxy is
unnecessary because Iconify's API supports browser requests, so the icon browser
also works on static hosting. Server-only logic added later needs a separate
backend or hosting function; placing `route.ts` under `src/api` does not create
an HTTP endpoint in Vite.

## Selected stack

- Bundler: vite
- UI: base-ui (@octanejs/base-ui)
- Styling: Tailwind CSS v4

```ts
import { Button } from "@octanejs/base-ui/button";
```

## Vendored reference repositories

`repos/` is reference material only. Import runtime code from installed packages
such as `effect`. TypeScript excludes the subtree from project discovery; the
import guard also rejects explicit imports (including type-only imports) into it.
Vite enforces the guard during development and builds and denies serving files
from `repos/`.

Run `bun run check:imports` to check the boundary independently. It also runs
first in `bun run check`. Guard tests: `bun test scripts/checks`.

See [Effect Schema patterns](agent-patterns/effect-schema.md) for examples adapted
from the vendored Effect 4 sources and validated with the installed dependency.

## Effect training

Open `/gym/effect-js` from Gym for the module cover, then choose **Start training**
to open `/gym/effect-js/lessons` for eight guided Effect 4 lessons: lazy execution,
composition, typed failures, Schema codecs, Context and Layer, resource cleanup,
bounded concurrency, and a validation/retry capstone. Edit each lab’s input,
run the real installed Effect runtime, inspect the result and execution trace,
then answer the checkpoint to mark the lesson complete. Progress is saved in
this browser. Examples are read-only; the capstone save is simulated locally.

Training checks: `bun test tests/effect-training.test.ts`.
