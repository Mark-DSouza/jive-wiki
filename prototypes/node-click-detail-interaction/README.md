# Node click-to-detail prototype — throwaway

Built for [Design the node click-to-detail interaction](https://github.com/Mark-DSouza/jive-wiki/issues/5) on the [Jive Moves Graph — planning map](https://github.com/Mark-DSouza/jive-wiki/issues/1).

Three interactive variants of what happens after clicking a move node, switchable via `#variant=` and the floating bottom bar. The graph itself always uses the locked Obsidian Void theme (issue #4) — only the click-to-detail behavior changes.

- **A — Overlay panel**: camera flies to the node; a side panel slides in over the still-live, dimmed graph. Close with ×, `Escape`, or clicking empty space. You never fully leave the graph.
- **B — Centered modal**: camera flies to the node; a focused modal card appears over a dimmed/blurred graph. Close with ×, `Escape`, or the backdrop. A deliberate step out to read, then back.
- **C — Full-page takeover**: camera flies to the node, then the graph is fully replaced by a dedicated detail page. **Transitions out** are clickable chips that chain directly to the next move's detail page without returning to the graph first. `← Back to graph` or `Escape` resumes the graph.

All three use the real move dataset and per-move template fields (Name, Description, Steps, Hold/hand position, Lead, Transitions out, Notes/variations) from `content/moves/`. Most fields are currently blank in the source data (only Lead, and occasionally Hold/hand position and Notes, are filled in) — each variant renders blank sections as a muted "Not yet documented." placeholder rather than hiding them, so the prototype also shows how the template reads with a sparse dataset.

## Run it

Open `index.html` directly in a browser — no server, no build step, no network access needed. It's `shell.html` + `app.js` with `3d-force-graph` (v1.80.0, bundles three.js internally) and a standalone `three.min.js` (for the starfield) inlined as `<script>` tags, reused from the `prototype/visual-theme-graph` branch's bundle rather than re-fetched. `three.min.js` must load *after* the `3d-force-graph` bundle, or the two internal three.js instances collide.

To regenerate `index.html` after editing `shell.html`/`app.js`, re-concatenate in that order: `shell.html`, `3d-force-graph.min.js`, `three.min.js`, `app.js`.

Smoke-tested headlessly with Playwright (click each variant's node, verify the detail view opens with the right move name, verify each close path, verify the transition-chip chain in variant C) — no console errors across all three.

This directory is throwaway — not wired into the eventual Vite build.
