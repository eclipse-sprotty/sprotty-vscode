---
status: accepted
date: 2022-11-21
---

# ADR-0003: Manager/provider classes with options objects replace `SprottyVscodeExtension`

*Rescued record: decided in [PR #73](https://github.com/eclipse-sprotty/sprotty-vscode/pull/73) (merged 2022-11-21), released as v0.5.0 (Dec. 2022) — see `packages/sprotty-vscode/CHANGELOG.md`.*

## Context

Until v0.4.0 the main entry point was a `SprottyVscodeExtension` base class that downstream extensions subclassed. It hard-wired the freestyle-panel integration, while VS Code had grown two further webview APIs (custom editors, webview views) that fit diagram use cases better in many extensions.

## Options considered

1. **Keep growing the base class** — every new integration mode and option multiplies subclass contracts; downstream code overrides ever more protected methods.
2. **One class per VS Code integration mode, configured by an options object** — `WebviewPanelManager`, `SprottyEditorProvider`, `SprottyViewProvider` (plus `Lsp*` variants taking a `LanguageClient` by composition), sharing `WebviewEndpoint` and the `IWebviewEndpointManager` interface.

## Decision

We use option 2. Extension points are primarily options callbacks (`createWebviewHtml`, `configureEndpoint`, `localResourceRoots`, …); subclassing remains available through `protected` factory methods but is not the default path.

## Consequences

- Downstream picks exactly one integration mode per diagram type; the States example demos all three.
- All pre-0.5.0 documentation (blog posts, old READMEs) references removed classes (`SprottyVscodeExtension`, `SprottyLspVscodeExtension`) — do not copy code from those sources.
- New configuration should be added as options, not as new abstract/protected members, to keep downstream migration cost low.
