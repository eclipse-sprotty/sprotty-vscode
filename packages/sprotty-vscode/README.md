# VS Code Integration for Sprotty

This library contains glue code for [Sprotty](https://www.npmjs.com/package/sprotty) diagrams in VS Code. The diagrams can optionally be backed by a [language server](https://microsoft.github.io/language-server-protocol/).

A complete example with an [Xtext](http://xtext.org) language server is available [here](https://github.com/eclipse/sprotty-vscode/tree/master/example).

## Getting Started

As first step, you need to implement a [webview](https://code.visualstudio.com/api/extension-guides/webview) that renders your diagrams using [sprotty-vscode-webview](https://www.npmjs.com/package/sprotty-vscode-webview). The webview package should bundle its code into a single JavaScript file (e.g. with [webpack](https://webpack.js.org)) and put it into your VS Code extension package. Our examples use a subfolder `pack` for this purpose.

Then you can create a subclass of `SprottyVscodeExtension` and instantiate it in your extension entry point:

```typescript
export function activate(context: vscode.ExtensionContext) {
    new MySprottyVscodeExtension(context);
}
```

In case you are backing your diagrams with a language server, you should use `SprottyLspVscodeExtension` as superclass. If you want to support editing operations between diagram and language server, use `SprottyLspEditVscodeExtension` (see [states example](https://github.com/eclipse/sprotty-vscode/tree/master/example/states/extension/src)).

Your subclass should implement at least the following methods:

```typescript
export class MySprottyVscodeExtension extends SprottyVscodeExtension {

    constructor(context: vscode.ExtensionContext) {
        // Provide a prefix for registered commands (see further below)
        super('example', context);
    }

    protected getDiagramType(args: any[]): string | undefined {
        if (args.length === 0
            // Check the file extension if the view is created for a source file
            || args[0] instanceof vscode.Uri && args[0].path.endsWith('.example')) {
            // Return a Sprotty diagram type (this info is passed to the Sprotty model source)
            return 'example-diagram';
        }
    }

    createWebView(identifier: SprottyDiagramIdentifier): SprottyWebview {
        return new SprottyWebview({
            extension: this,
            identifier,
            // Root paths from which the webview can load local resources using URIs
            localResourceRoots: [
                this.getExtensionFileUri('pack')
            ],
            // Path to the bundled webview implementation
            scriptUri: this.getExtensionFileUri('pack', 'webview.js'),
            // Change this to `true` to enable a singleton view
            singleton: false
        });
    }
}
```

## Adding Commands

This library registers a few default commands that you can either [execute programmatically](https://code.visualstudio.com/api/references/vscode-api#commands.executeCommand) or expose in the user interface with package.json entries as shown below. The first segment of each command id corresponds to what you have passed in the constructor of your `SprottyVscodeExtension` subclass. The `when` clauses ending with `-focused` start with the Sprotty diagram type returned in `getDiagramType`.

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
