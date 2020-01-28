/********************************************************************************
 * Copyright (c) 2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Container } from "inversify";
import { DiagramServer, TYPES } from "sprotty";
import { SprottyDiagramIdentifier, WebviewReadyMessage } from "./protocol";
import { VscodeDiagramServer } from "./vscode-diagram-server";
import { VscodeDiagramWidget, VscodeDiagramWidgetFactory } from "./vscode-diagram-widget";

export const vscodeApi = acquireVsCodeApi();

export abstract class SprottyStarter {

    constructor() {
        this.sendReadyMessage();
        this.acceptDiagramIdentifier();
    }

    protected sendReadyMessage() {
        vscodeApi.postMessage({ readyMessage: 'Sprotty Webview ready'} as WebviewReadyMessage);
    }

    protected acceptDiagramIdentifier() {
        console.log('Waiting for diagram identifier...');
        const eventListener = (message: any) => {
            console.log(`...received...`, message);
            const diagramIdentifier = message.data as SprottyDiagramIdentifier;
            const diContainer = this.createContainer(diagramIdentifier);
            this.addVscodeBindings(diContainer, diagramIdentifier);
            diContainer.get(VscodeDiagramWidget);
            window.removeEventListener('message', eventListener);
        };
        window.addEventListener('message', eventListener);
    }

    protected abstract createContainer(diagramIdentifier: SprottyDiagramIdentifier): Container;

    protected addVscodeBindings(container: Container, diagramIdentifier: SprottyDiagramIdentifier) {
        container.bind(VscodeDiagramWidget).toSelf().inSingletonScope();
        container.bind(VscodeDiagramWidgetFactory).toFactory(context => {
            return () => context.container.get<VscodeDiagramWidget>(VscodeDiagramWidget);
        });
        container.bind(SprottyDiagramIdentifier).toConstantValue(diagramIdentifier);
        container.bind(VscodeDiagramServer).toSelf().inSingletonScope();
        container.bind(TYPES.ModelSource).toService(VscodeDiagramServer);
        container.bind(DiagramServer).toService(VscodeDiagramServer);
    }
}
