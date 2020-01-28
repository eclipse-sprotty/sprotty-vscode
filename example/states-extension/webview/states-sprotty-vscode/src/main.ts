import "reflect-metadata";
import { createStateDiagramContainer } from 'states-sprotty/lib/di.config';
import { SprottyDiagramIdentifier, SprottyStarter } from 'sprotty-vscode-webview/lib';
import 'sprotty-vscode-webview/css/sprotty-vscode.css';

export class StatesSprottyStarter extends SprottyStarter {

    createContainer(diagramIdentifier: SprottyDiagramIdentifier) {
        return createStateDiagramContainer(diagramIdentifier.clientId + '_sprotty');
    }
}

new StatesSprottyStarter();