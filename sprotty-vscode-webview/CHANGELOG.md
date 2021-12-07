## Eclipse Sprotty Change Log (VS Code Webview)

This change log covers only the VS Code webview integration of Sprotty. See also the change log of [sprotty](https://github.com/eclipse/sprotty/blob/master/packages/sprotty/CHANGELOG.md).

### v0.2.0 (Dec. 2021)

This version is mainly about dependency updates:
 * Updated `sprotty` to v0.11.1
 * Added dependency to `sprotty-protocol` and updated imports
 * Removed dependency to `reflect-metadata`

Breaking changes:
 * If you previously relied on `reflect-metadata` being provided as transitive dependency, you should add it explicitly to your webview package.
