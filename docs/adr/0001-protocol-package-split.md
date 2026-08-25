---
status: accepted
date: 2020-01-28
---

# ADR-0001: Shared types live in a dedicated `sprotty-vscode-protocol` package

*Rescued record: the decision predates ADRs in this repo. Evidence: the package exists since the initial commit (`fee0321`, 2020-01-28); the three-component decomposition is described in the [2019 announcement post](https://www.typefox.io/blog/using-sprotty-in-vs-code-extensions/); the current `packages/` layout dates to commit `951ade6` (2022-11-30, "Restructured packages for consistency with main sprotty repo").*

## Context

The extension host (Node, `vscode` API) and the webview (browser, DOM) are isolated runtimes that exchange JSON messages, yet both sides must agree on message and action types. Additionally, language servers built with langium-sprotty embed the diagram server in a plain Node process with neither `vscode` nor DOM available.

## Options considered

1. **Duplicate the types on both sides** — no extra package, but the copies drift and wire breakage surfaces only at runtime.
2. **Define shared types in `sprotty-vscode`** — makes the webview package depend on the `vscode` API's type space, which it must never load.
3. **A dedicated dependency-light package** — one more package to version and publish, but a hard, mechanically visible boundary.

## Decision

We keep everything that crosses the boundary in `sprotty-vscode-protocol`, which must stay free of `vscode`, DOM, and Node APIs. Its dependencies follow the same rule (`sprotty-protocol`, `vscode-messenger-common` — the shared halves of their respective stacks).

## Consequences

- Both runtime packages re-export the protocol package, so downstream imports stay stable.
- The LSP-specific parts are deliberately not in the protocol barrel (`sprotty-vscode-protocol/lib/lsp` is a deep import) — non-LSP consumers don't pay for them.
- The constraint is currently prose-only: no lint rule prevents adding a `vscode` import to the protocol package (sensor candidate, see the roadmap).
