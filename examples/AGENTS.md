# Sprotty VS Code examples

`states-langium/` is the one live example: a state-machine DSL (`.sm` files) with a Langium language server and a Sprotty diagram. The Langium/LSP setup is this example's choice — the sprotty-vscode libraries themselves visualize any kind of data, with or without a language server. It is three workspace packages — `extension`, `language-server`, `webview` — but **one build**: `states-langium/extension/esbuild.mjs` bundles all three (extension → `pack/extension/src/states-extension.cjs`, language server → `pack/language-server/src/main.cjs`, webview → `pack/diagram/main.js` + `main.css`).

## Commands

```sh
yarn workspace states-extension-langium run build          # esbuild bundle of all three parts, no type checking
yarn workspace states-extension-langium run watch          # rebuild on change
yarn workspace states-language-server run build            # tsc --noEmit — type-check only, emits nothing
yarn workspace states-language-server run langium:generate # regenerate AST + TextMate grammar after editing states.langium, <1 s
```

Run it: F5 from the repo root (`DIAGRAM_MODE` env in the launch config selects panel / editor / view), then open a `.sm` file from `examples/workspace` and use "Open in Diagram" (panel), "Reopen Editor With… → States Editor" (editor), or the States activity-bar icon (view).

## Traps

- **esbuild does not type-check.** The extension sources are only type-checked by your IDE; the language server by its `tsc --noEmit` build. The webview's `states-langium/webview/webpack.config.js` is not part of any build script — its remaining value is that `ts-loader` type-checks the webview sources if you run it manually.
- Generated code is **committed**: `states-langium/language-server/src/generated/` (`ast.ts`, `grammar.ts`, `module.ts`) and `states-langium/extension/syntaxes/states.tmLanguage.json`. Never hand-edit; regenerate. After a grammar change, also update the diagram generator to match the new AST.
- The `type` strings produced in `states-langium/language-server/src/diagram-generator.ts` (`graph`, `node`, `label`, `label:xref`, `edge`, `port`, …) are matched against `configureModelElement` calls in `states-langium/webview/src/di.config.ts` **at runtime only** — a typo yields an invisible element, not a compile error.
- `langium`, `langium-sprotty`, and `langium-cli` are pinned exactly (4.3.0) and must stay on the same version.
- The `process.env.DIAGRAM_MODE` switch in `states-langium/extension/src/states-extension.ts` is demo scaffolding to show all three integration modes — a real extension picks one class and deletes the branching.
- `reflect-metadata` must stay the first import of `states-langium/webview/src/main.ts` (inversify decorators).
- `states-webview/` (if present on your disk) is leftover build litter from the removed Xtext-era example — not part of the repo.
- Dragging a new transition from a node's triangle port only changes the diagram locally: nothing on master handles the resulting `reconnect` action in the language server, so no text edit is produced and the edge vanishes on the next rebuild (see `docs/product-specs/lsp-editing.md`, feature 5).

Everything else (architecture, protocol, extension points) is in `docs/ARCHITECTURE.md` at the repo root.
