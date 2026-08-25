# sprotty-vscode

Glue libraries for embedding [Sprotty](https://github.com/eclipse-sprotty/sprotty) diagrams in VS Code extensions, with or without a language server. Yarn 1 workspaces + Lerna monorepo, TypeScript ~6.0.3, three published npm packages (currently all 1.1.0): `sprotty-vscode` (extension host), `sprotty-vscode-webview` (webview), `sprotty-vscode-protocol` (shared types). A language server is optional — the libraries visualize any kind of data; `examples/states-langium`, the only example, happens to be a Langium-based DSL extension.

## Commands

```sh
yarn                                  # install + full build via lerna prepare, ~11 s warm
yarn build                            # all 6 workspaces (the 3 lib packages also lint), ~9 s warm
yarn lint                             # eslint, lib packages only (examples have no lint target), ~4 s
yarn workspace sprotty-vscode run build   # single package; ~2.5 s — same for the other two packages
yarn clean                            # remove build output
```

There is no test suite yet — verification is build (tsc strict) + lint; see the roadmap in `docs/exec-plans/active/`. To run the example: press F5 in VS Code (three launch configs for panel / custom-editor / view mode); build first — there is no `preLaunchTask`. Debug the language server with the "Attach to Language Server" config (port 6009).

## Why and where

- `packages/sprotty-vscode/` — extension-host library: webview lifecycle (`WebviewPanelManager`, `SprottyEditorProvider`, `SprottyViewProvider`), message relay (`WebviewEndpoint`), command registration; optional LSP integration under `src/lsp/`.
- `packages/sprotty-vscode-webview/` — webview library: `SprottyStarter` wires a Sprotty container to the host; LSP editing support under `src/lsp/editing/`.
- `packages/sprotty-vscode-protocol/` — the types that cross the extension↔webview boundary. **Must stay free of `vscode`, DOM, and Node APIs** — it is loaded on both sides.
- `examples/states-langium/` — reference implementation (extension + Langium language server + webview). Read `examples/AGENTS.md` before touching it.
- `examples/workspace/` — sample `.sm` files opened by the launch configs.
- `configs/` — shared `base.tsconfig.json` and eslint config. Note: `configs/.eslintrc.js` is a flat-config array despite its legacy filename; packages reference it explicitly via `eslint -c`.

## Conventions

- Actions are plain data: `interface` extending `Action` plus a namespace with `KIND` and `is()` — never classes (same rule as in sprotty).
- Configuration enters classes as a single `<ClassName>Options` constructor argument. Prefer adding option callbacks (`createWebviewHtml`, `configureEndpoint`) over forcing downstream subclassing.
- The packages ship ESM-syntax JS without `"type": "module"` — downstream extensions must bundle (esbuild/webpack). Don't add code that only works when `require()`d unbundled.
- Every `.ts`/`.tsx`/`.css` file starts with the EPL-2.0/GPL-2.0 header block (lint enforces this in `packages/*`; copy it manually in `examples/`, which are unlinted).

## Boundaries and definition of done

- Never hand-edit `examples/states-langium/language-server/src/generated/**` or `examples/states-langium/extension/syntaxes/states.tmLanguage.json` — regenerate with `yarn workspace states-language-server run langium:generate` after grammar changes.
- Never edit build output: `packages/*/lib/`, `examples/**/pack/`, `examples/**/out/`.
- Don't bump package versions and don't edit `CHANGELOG.md` files per change — both happen at release time via the `publish:*` scripts.
- Done means: `yarn build` and `yarn lint` pass with 0 ESLint errors and warnings, output shown. (Yarn's `The engine "vscode" appears to be invalid` warning is expected noise, not a failure.)
- A change to behaviour promised in `docs/product-specs/` updates that spec in the same change.
- If reality contradicts this file or `docs/`, fix the doc as part of the change — never silently work around it.

## PR conventions

- Short sentence-case subjects, no `feat:`/`fix:` prefixes (observed from git history).
- External contributors need the Eclipse ECA and a `Signed-off-by` line — see `CONTRIBUTING.md`.

## Pointers

- `docs/ARCHITECTURE.md` — packages, message flow, LSP tunnel, integration modes, gotchas.
- `docs/adr/` — do not contradict accepted ADRs: 0001 protocol package split, 0002 `diagram/accept` tunnel, 0003 manager/provider API, 0004 vscode-messenger.
- `docs/product-specs/index.md` — behaviour contracts (extension↔webview↔LS wire protocol; LSP-based diagram editing).
- `docs/exec-plans/` — multi-session work gets a plan in `active/`; move it to `completed/` when done.
- Sprotty framework concepts (SModel, actions, DiagramServer, layout) are documented in the sprotty repo and at https://sprotty.org/docs/ — not here.
