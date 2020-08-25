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
import { Container } from 'inversify';
import { DiagramServer, KeyTool, TYPES } from 'sprotty';
import { isDiagramIdentifier, SprottyDiagramIdentifier, WebviewReadyMessage } from 'sprotty-vscode-protocol';
import { DisabledKeyTool } from './disabled-keytool';
import { vscodeApi } from './vscode-api';
import { VscodeDiagramServer } from './vscode-diagram-server';
import { VscodeDiagramWidget, VscodeDiagramWidgetFactory } from './vscode-diagram-widget';

export abstract class SprottyStarter {

    protected container?: Container;

    constructor() {
        this.sendReadyMessage();
        this.acceptDiagramIdentifier();
    }

    protected sendReadyMessage(): void {
        vscodeApi.postMessage({ readyMessage: 'Sprotty Webview ready' } as WebviewReadyMessage);
    }

    protected acceptDiagramIdentifier(): void {
        console.log('Waiting for diagram identifier...');
        const eventListener = (message: any) => {
            if (isDiagramIdentifier(message.data)) {
                if (this.container) {
                    const oldIdentifier = this.container.get<SprottyDiagramIdentifier>(SprottyDiagramIdentifier);
                    const newIdentifier = message.data as SprottyDiagramIdentifier;
                    oldIdentifier.diagramType = newIdentifier.diagramType;
                    oldIdentifier.uri = newIdentifier.uri;
                    const diagramWidget = this.container.get(VscodeDiagramWidget);
                    diagramWidget.requestModel();
                } else {
                    console.log(`...received...`, message);
                    const diagramIdentifier = message.data as SprottyDiagramIdentifier;
                    this.container = this.createContainer(diagramIdentifier);
                    this.addVscodeBindings(this.container, diagramIdentifier);
                    this.container.get(VscodeDiagramWidget);
                }
            }
        };
        window.addEventListener('message', eventListener);
    }

    protected abstract createContainer(diagramIdentifier: SprottyDiagramIdentifier): Container;

    protected addVscodeBindings(container: Container, diagramIdentifier: SprottyDiagramIdentifier): void {
        container.bind(VscodeDiagramWidget).toSelf().inSingletonScope();
        container.bind(VscodeDiagramWidgetFactory).toFactory(context => {
            return () => context.container.get<VscodeDiagramWidget>(VscodeDiagramWidget);
        });
        container.bind(SprottyDiagramIdentifier).toConstantValue(diagramIdentifier);
        container.bind(VscodeDiagramServer).toSelf().inSingletonScope();
        container.bind(TYPES.ModelSource).toService(VscodeDiagramServer);
        container.bind(DiagramServer).toService(VscodeDiagramServer);
        container.rebind(KeyTool).to(DisabledKeyTool);
    }
}
