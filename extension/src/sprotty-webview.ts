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

import * as vscode from 'vscode';
import { ActionMessage, isActionMessage, SprottyDiagramIdentifier, Action, isDiagramIdentifier, isWebviewReadyMessage, WebviewReadyMessage } from './protocol';
import { SprottyVscodeExtension } from './sprotty-vscode-extension';

export interface SprottyWebviewOptions {
    extension: SprottyVscodeExtension
    identifier: SprottyDiagramIdentifier
    localResourceRoots: string[]
    scriptPath: string
}

export class SprottyWebview {

    static viewCount = 0;

    readonly extension: SprottyVscodeExtension;
    readonly diagramIdentifier: SprottyDiagramIdentifier;
    readonly localResourceRoots: string[];
    readonly scriptPath: string;
    readonly title: any;
    readonly diagramPanel: vscode.WebviewPanel;

    protected resolveWebviewReady: (message: WebviewReadyMessage) => void;
    protected readonly webviewReady = new Promise<WebviewReadyMessage>((resolve) => this.resolveWebviewReady = resolve);
    protected messageQueue: (ActionMessage | SprottyDiagramIdentifier)[] = [];
    protected disposables: vscode.Disposable[] = [];

    constructor(protected options: SprottyWebviewOptions) {
        this.extension = options.extension;
        this.diagramIdentifier = options.identifier;
        this.localResourceRoots = options.localResourceRoots;
        this.scriptPath = options.scriptPath;
        this.title = this.createTitle();
        this.diagramPanel = this.createWebviewPanel();
        this.connect();
    }

    protected createTitle(): string {
        if (this.diagramIdentifier.uri)
            return this.diagramIdentifier.uri.substring(this.diagramIdentifier.uri.lastIndexOf('/') + 1);
        if (this.diagramIdentifier.diagramType)
            return this.diagramIdentifier.diagramType;
        else
            return 'Diagram';
    }

    protected createWebviewPanel(): vscode.WebviewPanel {
        const diagramPanel = vscode.window.createWebviewPanel(
            this.diagramIdentifier.diagramType || 'diagram',
            this.title,
            vscode.ViewColumn.Beside,
            {
                localResourceRoots: this.localResourceRoots.map(root =>
                    this.extension.resourceUri(root)
                ),
                enableScripts: true,
                retainContextWhenHidden: true
            });
        diagramPanel.webview.html = this.getWebViewContent();
        return diagramPanel;
    }

    protected getWebViewContent() {
        return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, height=device-height">
                <title>${this.title}</title>
                <link
                    rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css"
                    integrity="sha384-UHRtZLI+pbxtHCWp1t77Bi1L4ZtiqrqD80Kn4Z8NTSRyMA2Fd33n5dQ8lWUE00s/"
                    crossorigin="anonymous">
            </head>
            <body>
                <div id="${this.diagramIdentifier.clientId}" style="height: 100%;"></div>
                <script src="${this.extension.resourceUri(this.scriptPath).toString()}"></script>
            </body>
        </html>`;
    }

    protected async connect() {
        this.disposables.push(this.diagramPanel.onDidChangeViewState(event => {
            if (event.webviewPanel.visible) {
                this.messageQueue.forEach(message => this.sendToWebview(message));
                this.messageQueue = [];
            }
        }));
        this.disposables.push(this.diagramPanel.onDidDispose(() => {
            this.extension.didCloseWebview(this.diagramIdentifier);
            this.disposables.forEach(disposable => disposable.dispose());
        }));
        this.disposables.push(this.diagramPanel.webview.onDidReceiveMessage(message => this.receiveFromWebview(message)));
        this.sendDiagramIdentifier();
    }

    protected async sendDiagramIdentifier() {
        await this.webviewReady;
        this.sendToWebview(this.diagramIdentifier);
    }

    protected receiveFromWebview(message: any) {
        if (isActionMessage(message))
            this.accept(message.action);
        else if (isWebviewReadyMessage(message))
            this.resolveWebviewReady(message);
    }

    protected sendToWebview(message: any) {
        if (isActionMessage(message) || isDiagramIdentifier(message)) {
            if (this.diagramPanel.visible)
                this.diagramPanel.webview.postMessage(message);
            else
                this.messageQueue.push(message);
        }
    }

    dispatch(action: Action) {
        this.sendToWebview({
            clientId: this.diagramIdentifier.clientId,
            action
        });
    }

    accept(action: Action) {
    }
}
