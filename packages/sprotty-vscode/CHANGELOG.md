## Eclipse Sprotty Change Log (VS Code Extension)

This change log covers only the VS Code extension integration of Sprotty. See also the change log of [sprotty](https://github.com/eclipse/sprotty/blob/master/packages/sprotty/CHANGELOG.md).

### v0.5.0 (Dec. 2022)

This release brings a major redesign of the API of `sprotty-vscode` ([#73](https://github.com/eclipse/sprotty-vscode/pull/73)). The previous main entry point `SprottyVscodeExtension` is now deprecated. You can use the new `WebviewPanelManager` as a replacement for it. In addition, two more classes `SprottyViewProvider` and `SprottyEditorProvider` are provided, offering integration with the [webview views](https://code.visualstudio.com/api/extension-guides/webview) and [custom editors](https://code.visualstudio.com/api/extension-guides/custom-editors) APIs of VS Code. Example code for all three integration types is available with the [States example](https://github.com/eclipse/sprotty-vscode/blob/master/examples/states-langium/extension/src/states-extension.ts).

The second important change is the usage of the [vscode-messenger](https://github.com/TypeFox/vscode-messenger) library to handle communication between webviews and the host extension ([#77](https://github.com/eclipse/sprotty-vscode/pull/77)). This removes the complexity of handling low-level message objects from sprotty-vscode and delegates it to a dedicated library.
In addition, the change greatly simplifies the process to add additional custom messages and respective message handlers. Adding more custom messages can be useful in large extensions with multiple webview types: using vscode-messenger, it's easy to implement various communication schemes, e.g. send a request or notification from one webview to another, or broadcast from the host extension to all webviews.

-----

### v0.4.0 (Nov. 2022)

 * Updated `vscode-languageclient` to v8.0.2

-----

### v0.3.0 (Jun. 2022)

This release is to keep the package versions of `sprotty-vscode`, `sprotty-vscode-protocol` and `sprotty-vscode-webview` synchronized.

-----

### v0.2.0 (Dec. 2021)

This version is mainly about dependency updates:
 * Updated `sprotty` to v0.11.1
 * Updated `vscode-languageclient` to v7.0.0
 * Added dependency to `sprotty-protocol` and updated imports
 * Removed dependency to `vscode-languageserver`

Fixed issues: [sprotty-vscode/milestone/1](https://github.com/eclipse/sprotty-vscode/milestone/1?closed=1)
