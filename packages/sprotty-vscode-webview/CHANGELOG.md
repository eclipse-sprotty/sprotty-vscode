## Eclipse Sprotty Change Log (VS Code Webview)

This change log covers only the VS Code webview integration of Sprotty. See also the change log of [sprotty](https://github.com/eclipse/sprotty/blob/master/packages/sprotty/CHANGELOG.md).

### v0.5.0 (Dec. 2022)

This release introduces the usage of the [vscode-messenger](https://github.com/TypeFox/vscode-messenger) library to handle communication between webviews and the host extension ([#77](https://github.com/eclipse/sprotty-vscode/pull/77)). This removes the complexity of handling low-level message objects from sprotty-vscode and delegates it to a dedicated library.
In addition, the change greatly simplifies the process to add additional custom messages and respective message handlers. Adding more custom messages can be useful in large extensions with multiple webview types: using vscode-messenger, it's easy to implement various communication schemes, e.g. send a request or notification from one webview to another, or broadcast from the host extension to all webviews.

**Important breaking change:** You now have to call the `start()` method of your `SprottyStarter` in order to initiate the communication to the host extension. This is to separate the instantiation of the `SprottyStarter` from the actual diagram initialization.

-----

### v0.4.0 (Nov. 2022)

 * Updated `vscode-languageclient` to v8.0.2

-----

### v0.3.0 (Jun. 2022)

 * Updated `sprotty` to v0.12.0
 * Fixed [#28](https://github.com/eclipse/sprotty-vscode/issues/28) by enabling to acquire the vscode API independently of this package.

Breaking changes:
 * Deleted `vscode-api.ts` which called the `acquireVsCodeApi` function at module resolution time.

-----

### v0.2.0 (Dec. 2021)

This version is mainly about dependency updates:
 * Updated `sprotty` to v0.11.1
 * Added dependency to `sprotty-protocol` and updated imports
 * Removed dependency to `reflect-metadata`

Breaking changes:
 * If you previously relied on `reflect-metadata` being provided as transitive dependency, you should add it explicitly to your webview package.
