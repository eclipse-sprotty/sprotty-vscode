# sprotty-vscode architecture

How the three packages integrate Sprotty diagrams into VS Code extensions, and what you need to know to change them safely. Sprotty framework concepts — the action cycle, SModel, DiagramServer, layout — are documented in the [sprotty repo](https://github.com/eclipse-sprotty/sprotty) (`docs/ARCHITECTURE.md` there) and at https://sprotty.org/docs/; this file covers only the VS Code integration layer.

## Packages

```
sprotty-vscode  ──►  sprotty-vscode-protocol  ◄──  sprotty-vscode-webview
(extension host)     (both runtimes)               (webview / browser)
```

| Package | Runtime | Depends on |
|---|---|---|
| `sprotty-vscode` | extension host (Node) | `sprotty-vscode-protocol`, `vscode-languageclient`, `vscode-messenger` |
| `sprotty-vscode-protocol` | both | `sprotty-protocol`, `vscode-languageserver-protocol`, `vscode-messenger-common` |
| `sprotty-vscode-webview` | webview (browser) | `sprotty`, `sprotty-vscode-protocol`, `vscode-messenger-webview`, `vscode-uri` |

The two runtime packages never depend on each other; both re-export all of `sprotty-vscode-protocol` from their barrels. The protocol package is the only code loaded on both sides of the webview boundary, so it must stay free of the `vscode` API, DOM types, and Node types — the shared halves of its dependencies (`sprotty-protocol`, `vscode-messenger-common`) obey the same constraint (see ADR-0001).

*Scope: a language server is optional.* The core classes visualize **any** data in a VS Code webview — supply your own `ActionAcceptor` via `WebviewEndpointOptions.diagramServer`/`diagramServerFactory`, or drive the webview directly with `sendAction`/`addActionHandler`. All LSP support is segregated into `lsp/` subpaths (deep imports, not in the barrels). The States example uses a Langium language server, but that is a property of the example, not of the libraries.

*Why a webview* — a VS Code webview is an isolated iframe that can only exchange JSON messages with the extension. For *language-server-backed* diagrams, a VS Code extension is also the only maintained way into Theia, since Theia deprecated `@theia/languages` in v1.4.0 (2020). Higher complexity for tool developers, sandboxing for end users — the trade-off is deliberate ([Textual and graphical languages for the cloud era](https://www.typefox.io/blog/textual-graphical-languages-cloud-era/), 2022).

## Extension host ↔ webview

All traffic uses [vscode-messenger](https://github.com/TypeFox/vscode-messenger) (ADR-0004). Three notification types are declared in `packages/sprotty-vscode-protocol/src/handshake.ts`:

| Method string | Direction | Payload |
|---|---|---|
| `WebviewReadyMessage` | webview → host | `WebviewReadyMessage` |
| `SprottyDiagramIdentifier` | host → webview | `SprottyDiagramIdentifier { clientId, diagramType, uri }` |
| `ActionMessage` | both | sprotty-protocol `ActionMessage { clientId, action }` |

Handshake: the host creates the webview HTML (`createWebviewHtml` in `webview-utils.ts`) and a `WebviewEndpoint`; the webview bundle runs `new MyStarter().start()` and sends `WebviewReadyMessage`; the host answers with the diagram identifier (queued until ready — `sendDiagramIdentifier` awaits the `ready` promise); on the first identifier the `SprottyStarter` builds the inversify container and the `VscodeDiagramWidget` requests the model. On subsequent identifiers the existing container is reused and the identifier object is mutated in place.

Action routing: `VscodeDiagramServer` (webview) extends sprotty's `DiagramServerProxy` and filters inbound messages by `clientId` — that is what keeps multiple open diagrams isolated. On the host, `WebviewEndpoint` consults its registered `ActionHandler`s **on both the send and the receive path**; if a handler matches an action kind, the action is swallowed and not forwarded. Register handlers via the `configureEndpoint` option.

## Extension host ↔ language server (optional)

The LSP variants (`sprotty-vscode/lib/lsp` — deep import, not in the barrel) wrap a `LanguageClient` by composition (`*Options.languageClient`). Custom LSP methods, declared in `packages/sprotty-vscode/src/lsp/protocol.ts`:

| Method | Direction | Payload |
|---|---|---|
| `diagram/accept` | both | `ActionMessage` |
| `diagram/didClose` | extension → LS | `clientId` string |
| `diagram/openInTextEditor` | LS → extension | `OpenInTextEditorMessage` |

*Why one generic method* — all diagram traffic tunnels through the single `diagram/accept` notification instead of per-feature RPC methods, so downstream projects add custom action kinds without touching JSON-RPC (ADR-0002). The server half of this contract is implemented by [langium-sprotty](https://github.com/eclipse-langium/langium) (`addDiagramHandler`), which embeds a sprotty-protocol `DiagramServer` inside the language server process. The full wire contract is specified in `docs/product-specs/webview-protocol.md`.

`LspWebviewEndpoint.receiveAction` forwards webview actions to the language server *in addition to* local handling. In the other direction, the LSP managers subscribe to `diagram/accept` and dispatch to the endpoint whose `clientId` matches. There is also a generic LSP tunnel for the webview (`LspNotification` / `LspRequest` in `sprotty-vscode-protocol/lib/lsp`): the webview can send arbitrary LSP requests through the extension — `LanguageClientProxy` on the webview side uses it for completion, rename, and code-action requests that implement diagram editing (label edit, create palette, delete). Diagram edits always become text edits via LSP operations; the doctrine behind that (text is the source of truth, never persist the SModel) is documented in the sprotty repo's *view-model doctrine* design doc (docs/design-docs in that repo).

## Three integration modes

Downstream extensions pick exactly one per diagram type (`examples/states-langium/extension/src/states-extension.ts` demos all three behind `DIAGRAM_MODE`):

| Mode | Class (LSP variant) | VS Code contribution required |
|---|---|---|
| panel | `WebviewPanelManager` (`LspWebviewPanelManager`) | none — freestyle panels |
| custom editor | `SprottyEditorProvider` (`LspSprottyEditorProvider`) | `customEditors`; registered via `registerCustomEditorProvider` |
| view | `SprottyViewProvider` (`LspSprottyViewProvider`) | `views` — the view id must equal the diagram type |

All three implement `IWebviewEndpointManager`. `registerDefaultCommands(manager, context, { extensionPrefix })` registers `<extensionPrefix>.diagram.open|fit|center|export`; `registerLspEditCommands` adds `<extensionPrefix>.diagram.delete`. There are **no** `sprotty.*` command ids — the prefix is caller-supplied (the example uses `states`). Menus/keybindings gate on the context key `<diagramType>-focused`, set by `WebviewEndpoint.setWebviewActiveContext`.

## Extension points

Preferred: options callbacks on the three `*Options` interfaces — `createWebviewHtml` (custom HTML/CSP/asset paths), `configureEndpoint` (register action handlers), `localResourceRoots`, `supportedFileExtensions`, `messenger`, plus `diagramServer`/`diagramServerFactory` on `WebviewEndpointOptions` for non-LSP model sources. Subclassing hooks are `protected` `create*`/`configure*`/`didClose*` methods on the managers and `SprottyStarter.createContainer` (abstract) / `addVscodeBindings` on the webview side.

`SprottyStarter.addVscodeBindings` binds `VscodeDiagramServer` as `TYPES.ModelSource`, the `VscodeDiagramWidget`, the diagram identifier, and rebinds `KeyTool` to `DisabledKeyTool` — it assumes the container already loaded sprotty's default modules. `SprottyLspEditStarter` additionally rebinds the diagram server to `VscodeLspEditDiagramServer` and installs the editing services (palette from `sprotty.create.*` code actions, workspace-edit command, diagram locker).

## Gotchas

- The libraries emit ESM-syntax JS without `"type": "module"` and use `moduleResolution: "bundler"` — they cannot be `require()`d unbundled; downstream must bundle (esbuild `format: 'cjs'` in the example).
- `inversify` is imported by `sprotty-vscode-webview` but **not declared** — it arrives via `sprotty`. Two inversify copies in a webview bundle break DI silently; the example pins resolution (webpack alias / tsconfig `paths`). `reflect-metadata` is likewise the downstream's responsibility and must be imported first in the webview entry.
- `vscode-jsonrpc` is imported in all three packages but declared in none (transitive via the LSP libraries).
- `sprotty` and `sprotty-protocol` are regular dependencies, not peer dependencies — downstream must keep its own sprotty version aligned manually. Same for the three `vscode-messenger` packages.
- Default webview asset convention: script `<extension>/pack/webview.js`, `localResourceRoots` `<extension>/pack`. Deviate (as the example does) only with `createWebviewHtml` + `localResourceRoots` together, or the CSP blocks the script.
- The generated CSP is `default-src 'none'; script-src …; style-src 'unsafe-inline' …` — no `img-src`, `font-src`, or `connect-src`. Images and icon fonts need a custom `createWebviewHtml`.
- `sprotty-vscode-webview/css/sprotty-vscode.css` is **not** injected automatically — import it in the webview entry or pass `cssUri`. `VscodeDiagramWidget.setStatus` also expects FontAwesome classes this CSS does not provide.
- The `<diagramType>-focused` context key is only updated for webview *panels* (`onDidChangeViewState`); in view mode it never fires (`webview-endpoint.ts`, `connect()`).
- For webview views, pass `new Messenger({ ignoreHiddenViews: false })` — otherwise messages to a hidden view are silently dropped.
- `WebviewPanelManager.getDiagramType` without `defaultDiagramType` falls back to the file extension minus the dot.
- `WebviewEndpoint.connect()` runs in the constructor — subclass fields are not yet assigned when it executes; only touch them inside the registered callbacks.
- `createWebviewPanel` in `webview-utils.ts` is deprecated — use `WebviewPanelManager`.

## Documentation map

| Topic | Where |
|---|---|
| Sprotty concepts (SModel, actions, DI, layout) | https://sprotty.org/docs/ and sprotty repo `docs/` |
| Wire contract of this layer | `docs/product-specs/webview-protocol.md` |
| Decisions | `docs/adr/` |
| The example's build wiring | `examples/AGENTS.md` |
| vscode-messenger API | https://github.com/TypeFox/vscode-messenger |
| Historical rationale (blog) | [2019 origin post](https://www.typefox.io/blog/using-sprotty-in-vs-code-extensions/) · [2022 cloud-era post](https://www.typefox.io/blog/textual-graphical-languages-cloud-era/) |
