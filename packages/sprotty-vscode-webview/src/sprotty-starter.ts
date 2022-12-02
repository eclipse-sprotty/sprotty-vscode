/********************************************************************************
 * Copyright (c) 2018-2022 TypeFox and others.
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
import { DiagramServerProxy, KeyTool, TYPES } from 'sprotty';
import { DiagramIdentifierNotification, SprottyDiagramIdentifier, WebviewReadyNotification } from 'sprotty-vscode-protocol';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import { DisabledKeyTool } from './disabled-keytool';
import { SprottyStarterServices, VsCodeApi, VsCodeMessenger } from './services';
import { VscodeDiagramServer } from './vscode-diagram-server';
import { VscodeDiagramWidget, VscodeDiagramWidgetFactory } from './vscode-diagram-widget';

declare function acquireVsCodeApi(): VsCodeApi;

/**
 * Main entry class for running Sprotty in a webview. Call the `start` method to begin sending and receiving messages
 * with the host extension.
 */
export abstract class SprottyStarter {

    readonly vscodeApi: VsCodeApi;
    readonly messenger: Messenger;

    protected container?: Container;

    private startTimeout: number | undefined;

    constructor(services: SprottyStarterServices = {}) {
        this.vscodeApi = services.vscodeApi ?? acquireVsCodeApi();
        this.messenger = services.messenger ?? new Messenger(this.vscodeApi);
        this.startTimeout = window.setTimeout(() => {
            console.error('The Sprotty webview has not started. Call the start() method of your SprottyStarter to initiate it.');
        }, 2000);
    }

    start(): void {
        window.clearTimeout(this.startTimeout);
        this.messenger.start();
        this.acceptDiagramIdentifier();
        this.sendReadyMessage();
    }

    protected sendReadyMessage(): void {
        this.messenger.sendNotification(WebviewReadyNotification, HOST_EXTENSION, { readyMessage: 'Sprotty Webview ready' });
    }

    protected acceptDiagramIdentifier(): void {
        console.log('Waiting for diagram identifier...');
        this.messenger.onNotification(DiagramIdentifierNotification, newIdentifier => {
            if (this.container) {
                const oldIdentifier = this.container.get<SprottyDiagramIdentifier>(SprottyDiagramIdentifier);
                oldIdentifier.diagramType = newIdentifier.diagramType;
                oldIdentifier.uri = newIdentifier.uri;
                const diagramWidget = this.container.get(VscodeDiagramWidget);
                diagramWidget.requestModel();
            } else {
                console.log('...received', newIdentifier);
                this.container = this.createContainer(newIdentifier);
                this.addVscodeBindings(this.container, newIdentifier);
                this.container.get(VscodeDiagramWidget);
            }
        });
    }

    protected abstract createContainer(diagramIdentifier: SprottyDiagramIdentifier): Container;

    protected addVscodeBindings(container: Container, diagramIdentifier: SprottyDiagramIdentifier): void {
        container.bind(VsCodeApi).toConstantValue(this.vscodeApi);
        container.bind(VsCodeMessenger).toConstantValue(this.messenger);
        container.bind(VscodeDiagramWidget).toSelf().inSingletonScope();
        container.bind(VscodeDiagramWidgetFactory).toFactory(context => {
            return () => context.container.get<VscodeDiagramWidget>(VscodeDiagramWidget);
        });
        container.bind(SprottyDiagramIdentifier).toConstantValue(diagramIdentifier);
        container.bind(VscodeDiagramServer).toSelf().inSingletonScope();
        container.bind(TYPES.ModelSource).toService(VscodeDiagramServer);
        container.bind(DiagramServerProxy).toService(VscodeDiagramServer);
        container.rebind(KeyTool).to(DisabledKeyTool);
    }
}
