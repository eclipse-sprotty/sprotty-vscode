# VS Code Integration for Sprotty

This library contains glue code for [Sprotty](https://www.npmjs.com/package/sprotty) diagrams in VS Code. The diagrams can optionally be backed by a [language server](https://microsoft.github.io/language-server-protocol/).

A complete example with a [Langium](https://langium.org) language server is available [here](https://github.com/eclipse/sprotty-vscode/tree/master/examples/states-langium).

## Getting Started

As first step, you need to implement a [webview](https://code.visualstudio.com/api/extension-guides/webview) that renders your diagrams using [sprotty-vscode-webview](https://www.npmjs.com/package/sprotty-vscode-webview). The webview package should bundle its code into a single JavaScript file (e.g. with [Webpack](https://webpack.js.org)) and put it into your VS Code extension package. The default implementation assumes that the webview code is available at the path `pack/webview.js` relative to the extension folder.

Then you can instantiate a `WebviewPanelManager` in the `activate` hook of your extension:

```typescript
export function activate(context: vscode.ExtensionContext) {
    const webviewPanelManager = new WebviewPanelManager({
        extensionUri: context.extensionUri,
        defaultDiagramType: 'mydiagram',
        supportedFileExtensions: ['.mydiagram']
    });
}
```

This service manages webviews created as _webview panels_ in the main editor area of VS Code. Alternatively, you can use `SprottyEditorProvider` to get a _custom editor provider_ that can be directly associated with a file type, or `SprottyViewProvider` to get a _webview view provider_ that can render diagrams in the view areas of VS Code, i.e. the bottom or side panels.

In case you are backing your diagrams with a language server, you should use `LspWebviewPanelManager` as superclass, or respectively `LspSprottyEditorProvider` or `LspSprottyViewProvider`. In this case you need to provide a _language client_ configured to communicate with your language server.

## Adding Commands

This library registers a few default commands that you can either [execute programmatically](https://code.visualstudio.com/api/references/vscode-api#commands.executeCommand) or expose in the user interface with package.json entries as shown below. The registration happens by calling this function:

```typescript
registerDefaultCommands(webviewPanelManager, context, { extensionPrefix: 'example' });
```

The first segment of each command id corresponds to the `extensionPrefix` option. The `when` clauses ending with `-focused` start with the Sprotty diagram type, which is usually determined by the `defaultDiagramType` option for `WebviewPanelManager` or the `viewType` option for `SprottyEditorProvider` and `SprottyViewProvider`.

```json
{
  "contributes": {
    "commands": [
      {
        "command": "example.diagram.open",
        "title": "Open in Diagram",
        "category": "Example Diagram"
      },
      {
        "command": "example.diagram.fit",
        "title": "Fit to Screen",
        "category": "Example Diagram"
      },
      {
        "command": "example.diagram.center",
        "title": "Center selection",
        "category": "Example Diagram"
      },
      {
        "command": "example.diagram.export",
        "title": "Export diagram to SVG",
        "category": "Example Diagram"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "example.diagram.open",
          "when": "editorLangId == 'example'"
        },
        {
          "command": "example.diagram.fit",
          "when": "example-diagram-focused"
        },
        {
          "command": "example.diagram.center",
          "when": "example-diagram-focused"
        },
        {
          "command": "example.diagram.export",
          "when": "example-diagram-focused"
        }
      ]
    }
  }
}
```

In addition to these command palette items, you can expose the commands in [menus](https://code.visualstudio.com/api/references/contribution-points#contributes.menus) and [keybindings](https://code.visualstudio.com/api/references/contribution-points#contributes.keybindings).
