# Visual theme prototype — throwaway

Built for [Choose the visual theme for the graph](https://github.com/Mark-DSouza/jive-wiki/issues/4) on the [Jive Moves Graph — planning map](https://github.com/Mark-DSouza/jive-wiki/issues/1).

Three interactive 3D force-graph theme variants (`A` Obsidian Void / `B` Warm Ballroom / `C` Neon Studio), switchable via `#variant=` and the floating bottom bar, built against the real move dataset from `content/moves/`.

**Winner: A — Obsidian Void.**

## Run it

Open `index.html` directly in a browser — no server, no build step, no network access needed. It's `shell.html` + `app.js` with `3d-force-graph` (unpkg, v1.80.0, bundles three.js internally) and a standalone `three.min.js` (for the starfield/floor extras) inlined as `<script>` tags. `three.min.js` must load *after* the `3d-force-graph` bundle, or the two internal three.js instances collide (`Timer is not a constructor`).

To regenerate `index.html` after editing `shell.html`/`app.js`, re-concatenate in that order: `shell.html`, `3d-force-graph.min.js`, `three.min.js`, `app.js`.

This directory is throwaway — not wired into the eventual Vite build.
