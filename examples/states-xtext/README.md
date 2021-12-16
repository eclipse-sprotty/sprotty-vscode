# States example

This folder contains an example VS Code extension with an [Xtext](https://www.eclipse.org/Xtext/)-based language server and a Sprotty diagram for a simple domain-specific language for statemachines.

## Build

```bash
language-server/gradlew -p language-server/ build
yarn --cwd ..
```


## Publish to VS Code Marketplace

```
yarn --cwd extension publish
```
