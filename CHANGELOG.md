# Changelog

All notable changes to `launcher` will be recorded here.

## [Unreleased]

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
