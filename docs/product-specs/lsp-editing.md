# Diagram editing via LSP

**Intent** — how an editing gesture on the diagram (rename a state, create an element, delete a selection, drag a new transition) becomes a change to the source file. The design commitment behind every flow: **the diagram is never edited directly — each editing feature produces LSP text edits on the text document, and the diagram catches up through re-parse → regenerate → re-render**. The language server contributes editing semantics exclusively through standard LSP requests (code actions, rename, completion); the only custom wire method involved is the generic `diagram/accept` tunnel (ADR-0002). This spec exists because the flows span four codebases (this repo, sprotty, langium-sprotty, the example's language server) and no single one of them shows the whole picture.

Verification status: the repo has no test suite, so nothing here is enforced by a test. Every statement was derived by reading the code on 2026-08-25 against sprotty-vscode master, sprotty / sprotty-protocol 1.4.0, and langium-sprotty 4.3.0 (the versions resolved in `yarn.lock` / pinned by the example); none was confirmed by running the example in that session.

## Cast — who runs where

| Piece | Source | Runs in |
|---|---|---|
| `SprottyLspEditStarter`, `VscodeLspEditDiagramServer`, `CodeActionProvider`, `CodeActionPopupPaletteProvider` + `PaletteMouseListener`, `DeleteWithWorkspaceEditCommand`, `EditDiagramLocker`, `LanguageClientProxy`, `traceable.ts` | `packages/sprotty-vscode-webview/src/lsp/editing/` | webview |
| `LspWebviewEndpoint`, `addWorkspaceEditActionHandler`, `addLspLabelEditActionHandler`, `registerLspEditCommands`, `lsp-utils.ts` conversions | `packages/sprotty-vscode/src/` | extension host |
| The three editing action types: `LspLabelEditAction` (`languageLabelEdit`), `WorkspaceEditAction` (`workspaceEdit`), `DeleteWithWorkspaceEditAction` (`deleteWithWorkspaceEdit`) | `packages/sprotty-vscode-protocol/src/lsp/editing/editing.ts` | both |
| Editing gestures: `EditLabelAction` (kind `EditLabel`, double-click/F2), edge-in-progress + `ReconnectAction` (`reconnect`), `CreatingOnDrag`, `CreateElementCommand`; `DiagramServerProxy` forwarding | sprotty repo, packages `sprotty` + `sprotty-protocol` | webview |
| `DiagramServer` (action dispatch, revision tracking, bounds/layout round trip), `ServerActionHandlerRegistry` | sprotty repo, package `sprotty-protocol` | language server |
| `DefaultDiagramServerManager` (rebuild trigger), `LangiumDiagramGenerator`, `DefaultTraceProvider`, `addDiagramSelectionHandler` / `addTextSelectionHandler` | langium repo, package `langium-sprotty` | language server |
| `StatesCodeActionProvider` (`sprotty.create.*` code actions), `traceProvider.trace(...)` calls in the generator | `examples/states-langium/language-server/src/` | language server |

## Traces — the contract that makes an element editable

Every editing feature is gated on the element carrying a `trace` property (`isTraceable` in `packages/sprotty-vscode-webview/src/lsp/editing/traceable.ts`): a **string of the form `<documentUri>?<startLine>:<startChar>-<endLine>:<endChar>#<astNodePath>`** (positions are 0-based LSP positions). This is a cross-repo compatibility surface:

- Produced in the language server by `DefaultTraceProvider.trace(target, astNode, property?)` (langium-sprotty `src/trace-provider.ts`) from the AST node's CST range — the whole node, or one property's range (e.g. the `name`). The generator must call it explicitly per element; the example traces root, nodes, edges, and both label kinds (`examples/states-langium/language-server/src/diagram-generator.ts`).
- Consumed in the webview by `getRange` / `getURI` (`traceable.ts`), which read only the URI and the query part. The `#astNodePath` fragment is used server-side only (`TraceProvider.getSource` resolves the AST node by path, ignoring the recorded range — which is why traces survive re-parses).
- An element without a trace is invisible to editing: not deletable, its label not translated into an edit action, the palette not shown for an untraced root.

## The shared round trip

All editing features converge on the same tail. A webview editing service ends up dispatching a `WorkspaceEditAction` (edit computed in the webview) or an `LspLabelEditAction` (edit to be computed on the host); from there:

1. `VscodeLspEditDiagramServer` has registered these kinds (`vscode-lsp-edit-diagram-server.ts`), so sprotty's `DiagramServerProxy.handle` forwards them as an `ActionMessage` over vscode-messenger to the host (`handleLocally` forwards any action not received from the server).
2. On the host, `WebviewEndpoint.receiveAction` runs the action handlers registered for the kind — `addWorkspaceEditActionHandler` converts the LSP `WorkspaceEdit` (`convertWorkspaceEdit` in `lsp-utils.ts`, supporting `changes`, `documentChanges`, and file create/delete/rename) and calls `vscode.workspace.applyEdit`; `addLspLabelEditActionHandler` runs the rename/completion dialogs (below) and then applies the resulting edit. **Neither handler is registered by the library** — the downstream extension wires both via the `configureEndpoint` option (`examples/states-langium/extension/src/states-extension.ts`).
3. `applyEdit` changes the text document; `vscode-languageclient` sends `textDocument/didChange`; Langium re-parses and rebuilds.
4. langium-sprotty's `DefaultDiagramServerManager` buffers changed URIs (`DocumentBuilder.onUpdate`) and on build phase `DocumentState.Validated` regenerates the diagram for every `DiagramServer` whose `state.options.sourceUri` matches a changed document — **skipped entirely while the document has lexer or parser errors**, so a syntactically broken intermediate state leaves the last good diagram on screen (`shouldUpdateDiagram`, langium-sprotty `src/diagram-server-manager.ts`).
5. `DiagramServer.updateModel` bumps the revision and runs the layout round trip: `RequestBoundsAction` → webview measures in the hidden viewer → `ComputedBoundsAction` → server-side `ModelLayoutEngine` (ELK in the example, since the example sets `needsServerLayout: true`) → `UpdateModelAction` over `diagram/accept`.
6. The host's LSP manager routes the message to the endpoint with the matching `clientId`; the webview's `VscodeDiagramServer` filters by `clientId`, tags the action as received-from-server (which stops re-forwarding), and dispatches it — sprotty animates the update.

Consequences that hold for every feature:

- There is no optimistic client-side model change for create/delete/rename — the diagram changes only after the full text round trip. New element ids are whatever the regenerated model produces.
- Undo/redo of any diagram edit is the **text editor's** undo. `DeleteWithWorkspaceEditCommand.undo/redo` are deliberate no-ops; the diagram follows the text via step 4.
- Host action handlers consume an action *instead of* the endpoint's local fallback, but `LspWebviewEndpoint.receiveAction` still tunnels **every** webview action to the language server afterwards — so each `workspaceEdit` / `languageLabelEdit` also reaches the `DiagramServer`, which logs `Unhandled action from client: <kind>`. Expected console noise, not a bug.

## The editing features

### 1. Rename (label edit on a name)

Double-click on a label with sprotty's `editLabelFeature` → `EditLabelMouseListener` (sprotty `labelEditModule`) dispatches `EditLabelAction`. `VscodeLspEditDiagramServer.handleLocally` intercepts it: if the element's basic type is `label` and it is traceable, it forwards `LspLabelEditAction { location: <from trace>, editKind, initialText }` to the host instead (`editKind` is `xref` when the label's subtype is `xref` — e.g. type `label:xref` — else `name`). On the host, `addLspLabelEditActionHandler` sends `textDocument/prepareRename`; if allowed, shows an input box prefilled with the label text, sends `textDocument/rename`, and applies the returned `WorkspaceEdit` → shared round trip. Because it is a real LSP rename, all cross-references update with the declaration.

The in-diagram text editor is not used: the downstream container must load sprotty with `loadDefaultModules(container, { exclude: [labelEditUiModule] })` (the example does, `examples/states-langium/webview/src/di.config.ts`). `SprottyLspEditStarter` does **not** exclude it for you; if it stays loaded, its `EditLabelActionHandler` runs *in addition* to the interception (sprotty's dispatcher runs all handlers for a kind) and opens the overlay editor too.

### 2. Re-target a cross-reference (label edit on an xref)

Same entry as rename, but `editKind: 'xref'` → the host sends `textDocument/completion` at the label range's start, keeps only items of kind `Reference`, and shows them in a quick pick. The picked item's `textEdit.newText` replaces the label's traced range (the completion item's own edit range is ignored) → `applyEdit` → shared round trip.

### 3. Create an element (code-action popup palette)

Hovering the diagram background (the root has sprotty's `popupFeature`) raises `RequestPopupModelAction`; `VscodeDiagramServer` intercepts it for the root element and asks the `IRootPopupModelProvider` — bound by `SprottyLspEditStarter` to `CodeActionPopupPaletteProvider`. That provider sends `textDocument/codeAction` with `context.only: ['sprotty.create']` over the root's traced range — through the webview→host→LS tunnel (`LanguageClientProxy` → `LspRequest` → `LspWebviewEndpoint` relays to the `LanguageClient`). Each returned code action becomes a button (type `button:create`, root type `palette` — both must be configured with views by the downstream container, see `examples/states-langium/webview/src/main.ts` and `di.config.ts`). On click, `PaletteMouseListener` (rebound as `TYPES.PopupMouseListener`) re-requests the code actions with `only: [<that button's kind>]` and dispatches the first returned `CodeAction.edit` as a `WorkspaceEditAction` → shared round trip. The edits fetched when the popup opened are not used by the buttons.

Contract with the language server: creation code actions use kind strings under the **`sprotty.create.` prefix**, and the server must match `context.only` entries by prefix (the example's `StatesCodeActionProvider` implements both, `examples/states-langium/language-server/src/code-actions.ts`; it inserts `state <fresh-name>` / `event <fresh-name>` at the end of the document). `CodeActionContextMenuProvider` is a context-menu variant of the same idea — exported, but not bound by the starter; it applies the initially fetched edit directly.

### 4. Delete the selection

`registerLspEditCommands` registers the VS Code command `<extensionPrefix>.diagram.delete`, which sends `DeleteWithWorkspaceEditAction` to the active webview (the example binds it to the Delete key gated on `states-focused`). In the webview, `DeleteWithWorkspaceEditCommand` (configured by `SprottyLspEditStarter`) collects every selected traceable element **plus every traceable edge whose source or target (or one of their ancestors) is being deleted**, deduplicates ranges by containment, and builds one `WorkspaceEdit` replacing each surviving range with the empty string, keyed by the elements' trace URIs → `WorkspaceEditAction` → shared round trip. Surrounding whitespace/newlines are not cleaned up.

### 5. Create a transition by drag — incomplete on master

The example marks a port on each node with sprotty's `creatingOnDragFeature`; on mouse-down sprotty calls `CreateTransitionPort.createAction`, which returns a `CreateElementAction` for a temporary edge (handled by `CreateElementCommand` — registered by `SprottyLspEditStarter`, not by sprotty's default modules), and puts it in edit mode as the `edge-in-progress`. Dropping the dangling end on a connectable node makes sprotty's `MoveMouseListener` dispatch `ReconnectAction` (kind `reconnect`); dropping anywhere else deletes the temporary edge.

`VscodeLspEditDiagramServer` registers `reconnect` so the action is forwarded host→LS, but **on master nothing turns it into a text edit**: neither langium-sprotty nor the example registers a server-side handler, so the `DiagramServer` logs `Unhandled action from client: reconnect` and the text never changes. Client-side, `ReconnectCommand` has already connected the temporary edge locally, so the diagram shows a transition that does not exist in the text until the next rebuild discards it. Experimental server-side handling exists on the `dhuebner/reconnect-command` branch ("Experimental command driven editing", 2025-10). The intended semantics are an open maintainer decision — see the AX roadmap's open questions.

### Selection sync (same trace machinery, read-only)

Not an edit, but part of the same contract. Diagram→text: `VscodeDiagramServer` forwards `SelectAction`; langium-sprotty's opt-in `addDiagramSelectionHandler` resolves a single selected element's trace back to its AST node (`TraceProvider.getSource`) and sends `diagram/openInTextEditor` with the name node's range and `forceOpen: false` — the host reveals it only in an already-visible editor (`openInTextEditor` in `lsp-utils.ts`). Text→diagram: `addTextSelectionHandler` tracks the cursor (via a document-highlight-request hack) and pushes `SelectAllAction` + `SelectAction` (+ optional `FitToScreenAction`) through `diagram/accept`. The example wires both (`examples/states-langium/language-server/src/main.ts`). `TraceableMouseListener` (double-click → `OpenAction`) is exported but bound nowhere; the Langium stack has no server handler for `OpenAction` either.

## Wiring checklist — what a downstream extension assembles

Editing is off unless all of these are in place (the example is the reference):

1. Webview: subclass `SprottyLspEditStarter`; exclude `labelEditUiModule`; enable `editLabelFeature` on label types (subtype `xref` for reference labels), `popupFeature` on the root; configure views for `palette` and `button:create`.
2. Host: use the LSP manager/provider variants; call `addWorkspaceEditActionHandler` + `addLspLabelEditActionHandler` in `configureEndpoint`; call `registerLspEditCommands`; contribute keybindings/menus gated on `<diagramType>-focused` yourself.
3. Language server: call `addDiagramHandler`; trace every element the user should be able to edit; provide `sprotty.create.*` code actions with prefix matching of `context.only`; standard rename and completion support (Langium's defaults) do the rest.
4. Keyboard: `SprottyStarter` rebinds sprotty's `KeyTool` to `DisabledKeyTool`, so **no sprotty key listener fires in a webview** (no F2 label edit, no Ctrl+Space palette). All keyboard entry points must be VS Code keybindings on commands.

## Deliberately not promised

- Persistence of drag-created transitions (see feature 5) — currently not implemented on master.
- Any semantics of `EditDiagramLocker.allowEdit`: the locker is bound as sprotty's `IDiagramLocker` and, when `allowEdit` is false, blocks all but a fixed allowlist of non-edit actions and hides the palette — but no code in the packages ever sets it to `false`. It is an extension point (the class comment suggests locking on fatal server status), not a behaviour.
- Graceful behaviour when an edit races a rebuild (e.g. deleting while a regeneration is in flight) — revisions guard the bounds round trip, nothing guards text edits computed against a stale model.
- Cleanup of whitespace, separators, or now-dangling references after a delete — the language server's diagnostics report what the raw text deletion breaks.
- The `sprotty.create.` prefix as a registered LSP `CodeActionKind` — it is a convention between this library and the language server, invisible to other LSP clients.

## Surface

- `sprotty-vscode-protocol/lib/lsp/editing`: `LspLabelEditAction`, `WorkspaceEditAction`, `DeleteWithWorkspaceEditAction`
- `sprotty-vscode-webview/lib/lsp/editing`: `SprottyLspEditStarter`, `VscodeLspEditDiagramServer`, `CodeActionProvider`, `CodeActionPopupPaletteProvider`, `PaletteButton`, `PaletteButtonSchema`, `PaletteMouseListener`, `CodeActionContextMenuProvider`, `DeleteWithWorkspaceEditCommand`, `EditDiagramLocker`, `LanguageClientProxy`. Note the trace helpers (`Traceable`, `isTraceable`, `getRange`, `getURI`, `TraceableMouseListener`) are **not** in that barrel — `lsp/editing/index.ts` omits `traceable.ts`, so they are reachable only via the deep import `sprotty-vscode-webview/lib/lsp/editing/traceable`
- `sprotty-vscode/lib/lsp/editing`: `addWorkspaceEditActionHandler`, `addLspLabelEditActionHandler`; `sprotty-vscode`: `registerLspEditCommands`
- langium-sprotty (external): `addDiagramHandler`, `addDiagramSelectionHandler`, `addTextSelectionHandler`, `LangiumDiagramGenerator`, `TraceProvider`

## Pointers

- ADR-0002 (single `diagram/accept` tunnel); `webview-protocol.md` (the wire contract these flows ride on)
- The *view-model doctrine* design doc in the sprotty repo (docs/design-docs there) — the why behind "text is the single source of truth"
- langium-sprotty: <https://github.com/eclipse-langium/langium/tree/main/packages/langium-sprotty>
- `examples/AGENTS.md` — build/run wiring of the reference implementation
