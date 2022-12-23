## Eclipse Sprotty Change Log (VS Code Protocol)

This change log covers only the VS Code extension-to-webview protocol of Sprotty. See also the change log of [sprotty](https://github.com/eclipse/sprotty/blob/master/packages/sprotty/CHANGELOG.md).

### v0.5.0 (Dec. 2022)

This release introduces the usage of the [vscode-messenger](https://github.com/TypeFox/vscode-messenger) library to handle communication between webviews and the host extension ([#77](https://github.com/eclipse/sprotty-vscode/pull/77)). This removes the complexity of handling low-level message objects from sprotty-vscode and delegates it to a dedicated library.
In addition, the change greatly simplifies the process to add additional custom messages and respective message handlers. Adding more custom messages can be useful in large extensions with multiple webview types: using vscode-messenger, it's easy to implement various communication schemes, e.g. send a request or notification from one webview to another, or broadcast from the host extension to all webviews.

-----

### v0.4.0 (Nov. 2022)

 * Updated `vscode-languageserver-protocol` to v3.17.2

-----

### v0.3.0 (Jun. 2022)

 * Updated `sprotty-protocol` to v0.12.0

-----

### v0.2.0 (Dec. 2021)

This version is mainly about dependency updates:
 * Updated `vscode-languageserver-protocol` to v3.16.0
 * Added dependency to `sprotty-protocol` and updated imports
