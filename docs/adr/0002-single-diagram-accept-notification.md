---
status: accepted
date: 2020-01-28
---

# ADR-0002: All diagram traffic tunnels through one `diagram/accept` LSP notification

*Rescued record: the design originates in the Xtext-era Sprotty language-server integration, described in [Extending a language server with Sprotty diagrams](https://www.typefox.io/blog/extending-a-language-server-with-sprotty-diagrams/) (2017); this repo implements it in `packages/sprotty-vscode/src/lsp/protocol.ts` since the initial commit.*

## Context

Sprotty diagrams synchronized with a language server need a wire channel between the webview-hosted client and the diagram server inside the language server. LSP is JSON-RPC and extensible, so diagram messages can ride the existing connection — the question is the method granularity.

## Options considered

1. **One JSON-RPC method per diagram feature** — the standard LSP style; every new feature or downstream custom action requires new RPC plumbing on both endpoints.
2. **A single generic notification carrying a polymorphic `ActionMessage`** — sprotty actions are already plain serializable data with a `kind` discriminator, so the action layer *is* the protocol.

## Decision

We use one notification, `diagram/accept`, in both directions, plus two auxiliary notifications (`diagram/didClose`, `diagram/openInTextEditor`). Downstream projects extend the protocol by defining new action kinds, never new RPC methods.

## Consequences

- Custom actions cost nothing at the transport layer; the same actions work in non-LSP setups.
- Request/response semantics are not available at the RPC level — correlation uses sprotty's request/response actions (`requestId`), see the sprotty repo's ADR on request/response actions.
- The method strings are a cross-repo compatibility contract with langium-sprotty (`addDiagramHandler` in `eclipse-langium/langium`, `packages/langium-sprotty`) and any other diagram-server implementation — changing them is a breaking protocol change. The contract is specified in `docs/product-specs/webview-protocol.md`.
