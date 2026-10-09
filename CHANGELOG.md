# Changelog

All notable changes to `launcher` will be recorded here.

## [Unreleased]

- Migrate development and production builds from Vite to Rspack, preserving Beast tooling, Tailwind styles, module workers, static assets, and the vendored-import guard.

- Make the Effect Gym entrance a training module cover, with Start training opening a dedicated lessons route.

- Add Raw and Presentation output tabs to Effect labs with result cards and execution timelines.

- Add Shiki TypeScript syntax highlighting to the Effect training examples.

- Build the Effect training route under Gym with eight runnable labs, checkpoints, execution traces, and locally saved progress.

- Guard imports and Vite file serving against the vendored repos subtree, and document verified Effect 4 Schema patterns.

- Show generator diffs only when `--diff` is passed, including dry runs and removals.

- Add card item codegen for existing nav routes, with child page scaffolding, existing route destinations, and placeholder card grids.

- Use the sidebar selection foreground color for selected labels and icons in light and dark mode.

- Add per-icon routes with worker-based SVGO optimization, before/after previews, options, and SVG/Beast symbol exports.

- Focus icon searches with `/` and navigate collection suggestions with Ctrl+N/Ctrl+P.

- Add persistent icon favorites across collections and move Load all into the collection toolbar.

- Migrate the icon browser to Beast/Octane, add collection routes, and replace the Next.js metadata proxy with cached Iconify API requests.

- Add batch image conversion, grayscale output, and aspect-preserving maximum dimensions with per-file progress and downloads.

- Replace the converters placeholder with animated tool cards and add an image converter with upload, previews, export settings, cancellation, and downloads.

- Move image decoding and encoding into a queued Vite module worker, with correlated requests, cancellation, resource cleanup, and output format validation.

- Add the interactive page and navigation generator with diff previews, route listing, and page removal.
- Load page routes lazily through Vite and preload them on link hover or focus.
