## Eclipse Sprotty Change Log (VS Code Webview)

This change log covers only the VS Code webview integration of Sprotty. See also the change log of [sprotty](https://github.com/eclipse/sprotty/blob/master/packages/sprotty/CHANGELOG.md).

### v0.3.0 (Jun. 2022)

 * Updated `sprotty` to v0.12.0
 * Fixed [#28](https://github.com/eclipse/sprotty-vscode/issues/28) by enabling to acquire the vscode API independently of this package.

Breaking changes:
 * Deleted `vscode-api.ts` which called the `acquireVsCodeApi` function at module resolution time.

### v0.2.0 (Dec. 2021)

This version is mainly about dependency updates:
 * Updated `sprotty` to v0.11.1
 * Added dependency to `sprotty-protocol` and updated imports
 * Removed dependency to `reflect-metadata`

Breaking changes:
 * If you previously relied on `reflect-metadata` being provided as transitive dependency, you should add it explicitly to your webview package.
