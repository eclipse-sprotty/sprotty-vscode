# Sprotty Diagrams in VS Code Webviews

This library helps you to implement a [VS Code webview](https://code.visualstudio.com/api/extension-guides/webview) that displays a [Sprotty](https://www.npmjs.com/package/sprotty) diagram. You can use [sprotty-vscode](https://www.npmjs.com/package/sprotty-vscode) to integrate such a webview in a VS Code extension.

# Getting Started

The diagram itself is implemented with the Sprotty API. See the [Sprotty Wiki](https://github.com/eclipse/sprotty/wiki), the [states example](https://github.com/eclipse/sprotty-vscode/tree/master/example/states/webview) and the [Sprotty examples](https://github.com/eclipse/sprotty/tree/master/examples) for reference.

The next step is to implement a subclass of `SprottyStarter` and instantiate it in your entry module as shown below.

```typescript
export class ExampleSprottyStarter extends SprottyStarter {
    createContainer(diagramIdentifier: SprottyDiagramIdentifier) {
        return createExampleDiagramContainer(diagramIdentifier.clientId);
    }
}

new ExampleSprottyStarter();
```

The function `createExampleDiagramContainer` should create an [InversifyJS](https://www.npmjs.com/package/inversify) container with all necessary [Sprotty configuration](https://github.com/eclipse/sprotty/wiki/Dependency-Injection). The passed `clientId` should be used in the `baseDiv` and `hiddenDiv` ids in Sprotty's ViewerOptions.

In case you are connecting your diagram with a [language server](https://microsoft.github.io/language-server-protocol/), e.g. using [Xtext](http://xtext.org), you should use `SprottyLspEditStarter` as superclass.
