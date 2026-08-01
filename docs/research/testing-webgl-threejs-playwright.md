# Testing a 3D Force-Directed Graph (three.js / 3d-force-graph) with Playwright

Research for [Mark-DSouza/jive-wiki issue #6](https://github.com/Mark-DSouza/jive-wiki/issues/6): jive-wiki is a Vite + React + TS static site rendering a `3d-force-graph` (three.js/WebGL) galaxy view, deployed to GitHub Pages. The team wants UI/UX changes verified with Playwright + linting in CI. The core obstacle: a WebGL `<canvas>` has no accessible DOM, so normal locator-based Playwright testing can't reach into it.

## Question 1: Testable hooks in three.js / 3d-force-graph

`3d-force-graph` is instantiated with a **class-style factory pattern**, and the returned value is the graph instance itself, assignable to a variable:

```js
import ForceGraph3D from '3d-force-graph';
const myGraph = new ForceGraph3D(<myDOMElement>).graphData(<myData>);
```
— [README Quick Start, raw.githubusercontent.com](https://raw.githubusercontent.com/vasturiano/3d-force-graph/master/README.md)

The library's own [click-to-focus example](https://github.com/vasturiano/3d-force-graph/blob/master/example/click-to-focus/index.html) confirms the pattern used for exactly the "click node → zoom/open detail" interaction jive-wiki wants:
```js
const Graph = new ForceGraph3D(elem);
...
Graph.onNodeClick(node => {
  const distance = 40;
  const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
  const newPos = node.x || node.y || node.z
    ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
    : { x: 0, y: 0, z: distance };
  Graph.cameraPosition(newPos, node, 3000);
});
```

Because `Graph` is a plain JS object reference (not hidden inside a closure the page can't reach), the app code can do `window.__graph = Graph` for test purposes, and a Playwright test can then call `page.evaluate(() => window.__graph.someMethod())` directly — no pixel reading required.

Relevant imperative/getter-setter methods exposed on the instance (per README API Reference, [raw README](https://raw.githubusercontent.com/vasturiano/3d-force-graph/master/README.md) and [npm/unpkg mirror v1.80.0](https://app.unpkg.com/3d-force-graph@1.77.0/files/README.md)):

- `graphData([data])` — getter/setter for `{nodes, links}`; can assert current graph state without touching the canvas.
- `nodeId([str])`, `linkSource([str])`, `linkTarget([str])` — accessor config.
- `cameraPosition([{x,y,z}], [lookAt], [ms])` — getter/setter; calling with no args returns current camera position — directly assertable (e.g., "did clicking a node move the camera near it?").
- `zoomToFit([ms], [px], [nodeFilterFn])` — auto-frames nodes; default `(0, 10, node => true)`.
- `onNodeClick(fn)` → `fn(node, event)`; `onNodeRightClick`, `onNodeHover(fn)` → `fn(node, prevNode)`, `onNodeDrag`, `onNodeDragEnd` — a test can register/override these in `page.evaluate` and record calls into a global array to assert interaction happened, sidestepping actual canvas hit-testing (Playwright would still need to dispatch a real mouse click at the node's screen coordinates for a true e2e click test; `graph2ScreenCoords(x,y,z)` gives those pixel coordinates from graph-space).
- `nodeThreeObject([Object3d|str|fn])`, `nodeThreeObjectExtend(...)` — custom node rendering (relevant if jive-wiki customizes node visuals to match the Obsidian Galaxy plugin look).
- `getGraphBbox([nodeFilterFn])` → `{x:[min,max], y:[...], z:[...]}` — bounding box, assertable numeric state.
- `graph2ScreenCoords(x,y,z)` / `screen2GraphCoords(x,y,distance)` — coordinate conversion, useful for computing where to click on the actual canvas for a true interaction test.
- `scene()`, `camera()`, `renderer()`, `controls()` — raw three.js objects (Scene, PerspectiveCamera, WebGLRenderer, OrbitControls-like) directly accessible for deeper inspection (e.g. counting `scene().children` length, reading `camera().position`).
- `pauseAnimation()` / `resumeAnimation()` — can freeze the render loop for deterministic pixel snapshots if ever needed.
- `forceEngine()`, `d3Force()`, `d3AlphaMin/Decay`, `dagMode()`, `onEngineTick(fn)`, `onEngineStop(fn)` — simulation control; `onEngineStop` fires once the force layout has settled, which is the natural "wait for stability" signal a test should await before asserting positions (avoids asserting mid-simulation, non-deterministic coordinates).

**Answer:** yes — the instance is a normal object you hold a reference to and can expose on `window`; the API surface (graph data, camera position, bounding box, engine-stop event, raw three.js scene/camera/renderer) is rich enough that a Playwright test can assert "clicking node X moved the camera to ~Y" or "the graph now contains node Z" via `page.evaluate()`, without ever taking a screenshot or reading canvas pixels.

Sources: [3d-force-graph README (raw)](https://raw.githubusercontent.com/vasturiano/3d-force-graph/master/README.md), [3d-force-graph GitHub repo](https://github.com/vasturiano/3d-force-graph), [click-to-focus example](https://github.com/vasturiano/3d-force-graph/blob/master/example/click-to-focus/index.html), [npm/unpkg README mirror](https://app.unpkg.com/3d-force-graph@1.77.0/files/README.md) (current published version confirmed as 1.80.0 at time of research; the npm package page itself returned HTTP 403 to automated fetch, so version/peer-deps were cross-checked via the unpkg mirror rather than npmjs.com directly).

## Question 2: Reliability of visual/pixel snapshot testing for WebGL canvases in CI

**Playwright's own docs are explicit that screenshot comparisons are environment-sensitive**, independent of WebGL specifically: "Browser rendering can vary based on the host OS, version, settings, hardware, power source (battery vs. power adapter), headless mode, and other factors," and recommend running tests in the same environment the baselines were captured in, with snapshot filenames keyed by browser+platform (e.g. `chromium-darwin`) — [Playwright docs: Visual comparisons](https://playwright.dev/docs/test-snapshots). Tolerance knobs (`maxDiffPixels`, `threshold`, `maxDiffPixelRatio`) exist precisely to absorb this variance, and a `stylePath` option can hide volatile elements before capture.

**WebGL-canvas-specific bug reports on Playwright's own issue tracker** show canvas rendering is a known weak spot, not just theoretical:
- [microsoft/playwright#17904](https://github.com/microsoft/playwright/issues/17904) — WebGL2 canvases render invisibly in screenshots taken under WebKit inside the official Docker image (but fine on macOS); reported against Playwright 1.26.1, no maintainer resolution recorded in the thread.
- [microsoft/playwright#586](https://github.com/microsoft/playwright/issues/586) and [#18081](https://github.com/microsoft/playwright/issues/18081) — further WebKit/canvas screenshot-invisibility reports.
- [microsoft/playwright#15533](https://github.com/microsoft/playwright/issues/15533) — headless Chromium does not enable real GPU hardware acceleration even when passed `--use-gl=egl`/`--ignore-gpu-blocklist`/`--use-angle=angle`; `chrome://gpu` reports "Software only, hardware acceleration unavailable" both locally and on GitHub Actions runners. This directly affects WebGL rendering determinism/performance in CI. No confirmed maintainer fix is recorded in the visible thread (status: feedback-collecting).
- [microsoft/playwright#29968](https://github.com/microsoft/playwright/issues/29968) and [#32040](https://github.com/microsoft/playwright/issues/32040) — general `toHaveScreenshot` flakiness/blank-screenshot reports (font-family shifts, blank captures despite visibility checks), illustrating snapshot flakiness is an active, recurring issue class, not isolated to one version.

**Real first-party example of a project actually doing WebGL visual regression testing at scale: three.js itself**, in [`test/e2e/`](https://github.com/mrdoob/three.js/tree/dev/test/e2e) of the [mrdoob/three.js repo](https://github.com/mrdoob/three.js) — this is the closest thing to a primary-source template for how to do this correctly:
- Uses **Puppeteer**, not Playwright (`puppeteer.js`, 14KB script), plus dedicated modules: `deterministic-injection.js` (patches random/timers/rAF/video for reproducibility), `image.js` (pixel diffing), `clean-page.js` (hides text/dat.GUI/other non-deterministic UI chrome before capture), `check-coverage.js`.
- Pipeline sequence: disable `requestAnimationFrame` → wait for `networkidle0` → apply network throttling → re-enable rAF → wait for the render-completion promise → capture. This ordering exists specifically to avoid grabbing a frame mid-load or mid-animation.
- Explicit **retry strategy**: 3 progressive attempts per screenshot to absorb one-off nondeterminism, rather than accepting a large pixel-diff tolerance.
- CI publishing: a separate workflow, [`report-e2e.yml`](https://github.com/mrdoob/three.js/blob/dev/.github/workflows/report-e2e.yml), downloads the failed-screenshot artifacts from the CI run and force-pushes actual/expected/diff images to an `e2e-screenshots` branch, then comments the comparison images on the PR — i.e., three.js treats failures as needing human visual triage, not auto-pass/fail on pixel threshold alone.
- Coverage is high (~97% of examples) but not total — some examples are explicitly exception-listed as too nondeterministic to snapshot reliably.

**`3d-force-graph` and its sibling repos have no test suite at all** — checked directly via GitHub API listing of [vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph) root: only `.babelrc`, `example/`, `src/`, `package.json`, no `test/`, `tests/`, `e2e/`, or CI workflow beyond `.github/` presence. Confirms there is no first-party Playwright/visual-test example to imitate for this specific library; three.js's own e2e harness is the relevant primary-source model instead.

**Alternatives to raw pixel snapshotting**, synthesized from the above sources: (1) expose the graph instance on `window` and assert state via `page.evaluate()` (see Q1) instead of/alongside screenshots; (2) if snapshotting is still wanted for true visual regressions, freeze the simulation deterministically first (`pauseAnimation()`, wait for `onEngineStop`, fix `cameraPosition()` explicitly rather than relying on physics settling) before calling `toHaveScreenshot()`; (3) expect and budget for `maxDiffPixels`/`threshold` tolerances per Playwright's own guidance, and pin the CI runner OS/GPU so baselines match; (4) be aware headless Chromium in Playwright does not get real GPU acceleration by default even with `--use-gl`/ANGLE flags per issue #15533 — this affects both speed and rendering fidelity of WebGL content in CI headless mode, an important operational caveat for a WebGL-heavy CI suite.

Sources: [Playwright docs — Visual comparisons](https://playwright.dev/docs/test-snapshots), [playwright#17904](https://github.com/microsoft/playwright/issues/17904), [playwright#586](https://github.com/microsoft/playwright/issues/586), [playwright#18081](https://github.com/microsoft/playwright/issues/18081), [playwright#15533](https://github.com/microsoft/playwright/issues/15533), [playwright#29968](https://github.com/microsoft/playwright/issues/29968), [playwright#32040](https://github.com/microsoft/playwright/issues/32040), [three.js test/e2e](https://github.com/mrdoob/three.js/tree/dev/test/e2e), [three.js report-e2e.yml](https://github.com/mrdoob/three.js/blob/dev/.github/workflows/report-e2e.yml), [vasturiano/3d-force-graph repo root listing](https://github.com/vasturiano/3d-force-graph).

## Question 3: Current (2026) lint/typecheck setup for Vite + React + TS + three.js

**Major finding: the official `create-vite` `react-ts` template has moved off ESLint entirely, onto Oxlint**, as of the current template on the `main` branch. Confirmed directly from raw file contents:

`package.json` ([raw](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/package.json)):
```json
"scripts": { "dev": "vite", "build": "tsc -b && vite build", "lint": "oxlint", "preview": "vite preview" },
"devDependencies": {
  "@vitejs/plugin-react": "^6.0.4",
  "oxlint": "^1.75.0",
  "typescript": "~6.0.2",
  "vite": "^8.2.0"
}
```
There is no `eslint.config.js` and no `eslint`/`typescript-eslint`/`eslint-plugin-react-hooks` package in the template at all — instead an `_oxlintrc.json` ([raw](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/_oxlintrc.json)):
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```
The template's own README states that for production apps, type-aware linting should be added via `oxlint-tsgolint` — [template README](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/README.md). This shift is corroborated by [vitejs/vite#22025 "Oxlint usage in the create-vite templates"](https://github.com/vitejs/vite/issues/22025) and community coverage noting the switch happened during 2026 (Oxlint reached stable v1.0 in June 2025, with reported 50–100x speed advantage over ESLint) — [Vite+ lint guide](https://viteplus.dev/guide/lint), [Oxlint docs](https://oxc.rs/docs/guide/usage/linter).

**However, ESLint flat config remains the current, actively documented approach if the team prefers ESLint's larger plugin ecosystem** (relevant since jive-wiki likely wants React Compiler-aware hook rules and mature typescript-eslint type-checked rules that Oxlint's newer ruleset doesn't fully replace yet):

- **ESLint flat config** is the current default: config files must be named `eslint.config.js`/`.mjs`/`.cjs`/`.ts` — [ESLint docs: Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files). Legacy `.eslintrc` is absent from current docs entirely.
- **typescript-eslint** recommends composing flat config from its own presets, escalating from `recommended` to `strict` for new projects: `js.configs.recommended`, `tseslint.configs.recommended`, `tseslint.configs.strict`, `tseslint.configs.stylistic` — "strict: a superset of recommended that includes more opinionated rules which may also catch bugs" — [typescript-eslint: Getting Started](https://typescript-eslint.io/getting-started).
- **eslint-plugin-react-hooks** (maintained in the React repo itself) ships a flat-config preset directly usable in `eslint.config.js`:
  ```js
  import reactHooks from 'eslint-plugin-react-hooks';
  import { defineConfig } from 'eslint/config';
  export default defineConfig([ reactHooks.configs.flat.recommended ]);
  ```
  with `reactHooks.configs.flat['recommended-latest']` for the newer React-Compiler-aware rule set (`react-hooks/config`, `react-hooks/purity`, `react-hooks/immutability`, etc.) — [facebook/react eslint-plugin-react-hooks](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks).
- **TypeScript `strict`**: recommended default for new projects, enabling `alwaysStrict`, `strictNullChecks`, `strictBindCallApply`, `strictBuiltinIteratorReturn`, `strictFunctionTypes`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `useUnknownInCatchVariables` — [TypeScript docs: tsconfig `strict`](https://www.typescriptlang.org/tsconfig/#strict). The current `create-vite` `tsconfig.app.json` doesn't set `"strict"` explicitly in the visible block but does enable `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly` under its own "Linting" section, targeting `es2023`/bundler module resolution — [raw tsconfig.app.json](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/tsconfig.app.json).
- **Prettier + ESLint**: Prettier's own docs recommend pairing Prettier with `eslint-config-prettier` (which only disables conflicting formatting rules) rather than `eslint-plugin-prettier` (which runs Prettier as a lint rule), because the plugin approach is slower, adds "one layer of indirection where things may break," and produces noisy in-editor squiggles; the recommended pattern is to run `prettier --check .` as an independent CI step, separate from `eslint` — [Prettier docs: Integrating with linters](https://prettier.io/docs/integrating-with-linters).

**Recommended concrete setup for jive-wiki**, synthesizing the above: scaffold with `npm create vite@latest -- --template react-ts` (ships Oxlint by default now); either (a) keep Oxlint as the fast default linter and add `oxlint-tsgolint` for type-aware checks per the template's own README, or (b) if richer React-hooks/Compiler-aware and type-checked linting is wanted, add a flat `eslint.config.js` composing `tseslint.configs.strict` + `tseslint.configs.stylistic` + `reactHooks.configs.flat['recommended-latest']`, keep `tsc -b --noEmit` (already in the template's `build` script) as the typecheck gate, enable `"strict": true` in `tsconfig.app.json` explicitly, and run `prettier --check .` plus `eslint-config-prettier` as a separate CI step rather than an ESLint plugin — wire both into the same GitHub Actions job as the Playwright run.

Sources: [create-vite template-react-ts directory listing](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts), [package.json (raw)](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/package.json), [tsconfig.app.json (raw)](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/tsconfig.app.json), [tsconfig.json (raw)](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/tsconfig.json), [_oxlintrc.json (raw)](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/_oxlintrc.json), [template README (raw)](https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/README.md), [vitejs/vite#22025](https://github.com/vitejs/vite/issues/22025), [ESLint: Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files), [typescript-eslint: Getting Started](https://typescript-eslint.io/getting-started), [eslint-plugin-react-hooks](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks), [TypeScript tsconfig `strict`](https://www.typescriptlang.org/tsconfig/#strict), [Prettier: Integrating with linters](https://prettier.io/docs/integrating-with-linters).
