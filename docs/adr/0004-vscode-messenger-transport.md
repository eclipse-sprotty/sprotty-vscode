---
status: accepted
date: 2022-12-22
---

# ADR-0004: Webview transport is delegated to vscode-messenger

*Rescued record: decided in [PR #77](https://github.com/eclipse-sprotty/sprotty-vscode/pull/77) (merged 2022-12-22), released as v0.5.0 (Dec. 2022) — see `packages/sprotty-vscode/CHANGELOG.md`; library rationale in the [vscode-messenger post](https://www.typefox.io/blog/vs-code-messenger/).*

## Context

Before v0.5.0, sprotty-vscode hand-rolled the extension↔webview channel on VS Code's raw `postMessage` API: untyped messages, custom routing for multiple webviews, and boilerplate that every custom message had to extend.

## Options considered

1. **Keep the hand-rolled relay** — no new dependency, but every custom message re-implements typing and routing, and multi-webview schemes (view↔view, broadcast) stay hard.
2. **Adopt [vscode-messenger](https://github.com/TypeFox/vscode-messenger)** — a typed JSON-RPC-style layer with participant routing and lifecycle management, at the cost of three coupled dependencies (`vscode-messenger`, `-webview`, `-common`).

## Decision

We use vscode-messenger. sprotty-vscode declares its message types as `NotificationType` constants in the protocol package and does no manual `postMessage` handling anywhere.

## Consequences

- Custom messages are cheap and typed; hosts with several webviews can use messenger routing directly.
- The three messenger packages must stay version-aligned across the three sprotty-vscode packages and the downstream extension — a silent wire break otherwise.
- Messenger behavior leaks into ours: messages to hidden webview *views* are dropped unless `ignoreHiddenViews: false` is passed (the States example does this in view mode).
