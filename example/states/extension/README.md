# A VSCode extension for a textual DSL with diagrams

![Screenshot](images/screenshot.png)

Features
* a textual DSL editor based on an Xtext LSP,
* diagrams based on Sprotty,
* animated automatic diagram updates on text changes,
* synchronized selection of text editor and diagram,
* SVG export (ALT-E), animated center selection (ALT-C), animated fit selection to screen (ALT-F).

## Build it

```bash
language-server/gradlew -p language-server build  # build the language server
yarn --cwd webview                                # build the bundle.js for the webview
yarn --cwd extension                              # build the extension
```

## Run it
* load the repo into VS Code,
* built it, and
* lanch the extension _states-extension_.

An example DSL file can be found [here](https://raw.githubusercontent.com/TypeFox/theia-xtext-sprotty-example/master/ws-theia/MrsGrantsSecretCompartment.sm).
