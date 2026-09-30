# Extension ↔ webview ↔ language server protocol

**Intent** — the wire contract that lets a Sprotty client in a webview talk to its host extension and, optionally, to a diagram server embedded in a language server. It is a cross-repo compatibility surface: langium-sprotty (`eclipse-langium/langium`, `packages/langium-sprotty`) implements the server half, the sprotty repo's client-server spec links here, and downstream extensions build on the method strings — which makes every change semver-relevant.

No automated test enforces this contract yet (the repo has no test suite); every bullet is therefore marked (unverified) with its defining source file. These bullets are the priority list for the first tests.

## Behaviour contract

Webview transport (vscode-messenger methods, defined in `packages/sprotty-vscode-protocol/src/handshake.ts`; applies with or without a language server):

- The webview announces readiness with notification method `WebviewReadyMessage`; the host responds with `SprottyDiagramIdentifier`; diagram content then flows as `ActionMessage` notifications in both directions — (unverified)
- A diagram identifier sent before the webview is ready is queued, not lost (`WebviewEndpoint.sendDiagramIdentifier` awaits the ready promise) — (unverified)
- An `ActionMessage` carries `{ clientId, action }`; receivers ignore messages whose `clientId` does not match theirs (filtering in sprotty's `DiagramServerProxy`), so several diagrams can share one messenger — (unverified)
- Host-side action handlers registered for an action kind consume the action on **both** send and receive paths; unhandled received actions fall through to the endpoint's diagram server — (unverified, `WebviewEndpoint.sendAction`/`receiveAction`)

LSP tunnel (defined in `packages/sprotty-vscode/src/lsp/protocol.ts`):

- All diagram traffic between extension and language server uses the single notification `diagram/accept` carrying an `ActionMessage`, in both directions (ADR-0002) — (unverified)
- Closing a diagram sends `diagram/didClose` with the `clientId` — (unverified)
- The language server may request source navigation with `diagram/openInTextEditor` (`{ location, forceOpen }`) — (unverified)
- The webview may send arbitrary LSP traffic through the extension via `LspNotification` / `LspRequest` (`packages/sprotty-vscode-protocol/src/lsp/messages.ts`); the extension relays them to the language client verbatim — (unverified)

## Deliberately not promised

- The shape of the HTML the host generates for the webview, the CSP it emits, and the default asset paths (`pack/webview.js`) — override points, not contract.
- Which sprotty action kinds flow through the channel — the tunnel is generic by design; action semantics are sprotty's (see the sprotty repo's client-server spec).
- Ordering guarantees beyond what vscode-messenger provides.
- Behaviour when the three `vscode-messenger` package versions are mixed across host, webview, and protocol package.

## Surface

- `WebviewReadyNotification`, `DiagramIdentifierNotification`, `ActionNotification`, `SprottyDiagramIdentifier`
- `acceptMessageType` (`diagram/accept`), `didCloseMessageType` (`diagram/didClose`), `openInTextEditorMessageType` (`diagram/openInTextEditor`), `OpenInTextEditorMessage`
- `LspNotification`, `LspRequest`
- `WebviewEndpoint`, `LspWebviewEndpoint`, `VscodeDiagramServer`

## Pointers

- ADR-0002 (single notification tunnel), ADR-0004 (vscode-messenger transport)
- The *client-server protocol* spec in the sprotty repo (docs/product-specs in that repo) — layout negotiation and action semantics (single source; not repeated here)
- https://github.com/TypeFox/vscode-messenger — transport library
