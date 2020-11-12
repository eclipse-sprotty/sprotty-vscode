/********************************************************************************
 * Copyright (c) 2020 TypeFox and others.
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
import {
    Action, ActionMessage, isActionMessage, isDiagramIdentifier, isWebviewReadyMessage, SprottyDiagramIdentifier
} from 'sprotty-vscode-protocol';
import * as vscode from 'vscode';

import { ActionHandler } from './action-handler';
import { SprottyVscodeExtension, serializeUri } from './sprotty-vscode-extension';
import { isResponseMessage, ResponseMessage } from 'vscode-jsonrpc/lib/messages';

export interface SprottyWebviewOptions {
    extension: SprottyVscodeExtension
    identifier: SprottyDiagramIdentifier
    localResourceRoots: vscode.Uri[]
    scriptUri: vscode.Uri
    singleton?: boolean
}

export class SprottyWebview {

    static viewCount = 0;

    readonly extension: SprottyVscodeExtension;
    readonly diagramIdentifier: SprottyDiagramIdentifier;
    readonly localResourceRoots: vscode.Uri[];
    readonly scriptUri: vscode.Uri;
    readonly diagramPanel: vscode.WebviewPanel;
    readonly actionHandlers = new Map<string, ActionHandler>();

    protected messageQueue: (ActionMessage | SprottyDiagramIdentifier | ResponseMessage)[] = [];
    protected disposables: vscode.Disposable[] = [];

    private resolveWebviewReady: () => void;
    private readonly webviewReady = new Promise<void>((resolve) => this.resolveWebviewReady = resolve);

    constructor(protected options: SprottyWebviewOptions) {
        this.extension = options.extension;
        this.diagramIdentifier = options.identifier;
        this.localResourceRoots = options.localResourceRoots;
        this.scriptUri = options.scriptUri;
        this.diagramPanel = this.createWebviewPanel();
        this.connect();
    }

    get singleton(): boolean {
        return !!this.options.singleton;
    }

    protected ready(): Promise<void> {
        return this.webviewReady;
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
        const title = this.createTitle();
        const diagramPanel = vscode.window.createWebviewPanel(
            this.diagramIdentifier.diagramType || 'diagram',
            title,
            vscode.ViewColumn.Beside,
            {
                localResourceRoots: this.localResourceRoots,
                enableScripts: true,
                retainContextWhenHidden: true
            });
        this.initializeWebview(diagramPanel.webview, title);
        return diagramPanel;
    }

    protected initializeWebview(webview: vscode.Webview, title?: string) {
        webview.html = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, height=device-height">
                    <title>${title}</title>
                    <link
                        rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css"
                        integrity="sha384-UHRtZLI+pbxtHCWp1t77Bi1L4ZtiqrqD80Kn4Z8NTSRyMA2Fd33n5dQ8lWUE00s/"
                        crossorigin="anonymous">
                </head>
                <body>
                    <div id="${this.diagramIdentifier.clientId}_container" style="height: 100%;"></div>
                    <script src="${webview.asWebviewUri(this.scriptUri).toString()}"></script>
                </body>
            </html>`;
    }

    protected async connect() {
        this.disposables.push(this.diagramPanel.onDidChangeViewState(event => {
            if (event.webviewPanel.visible) {
                this.messageQueue.forEach(message => this.sendToWebview(message));
                this.messageQueue = [];
            }
            this.setWebviewActiveContext(event.webviewPanel.active);
        }));
        this.disposables.push(this.diagramPanel.onDidDispose(() => {
            this.extension.didCloseWebview(this.diagramIdentifier);
            this.disposables.forEach(disposable => disposable.dispose());
        }));
        this.disposables.push(this.diagramPanel.webview.onDidReceiveMessage(message => this.receiveFromWebview(message)));
        if (this.singleton) {
            this.disposables.push(vscode.window.onDidChangeActiveTextEditor(async editor => {
                if (editor) {
                    const uri = editor.document.uri;
                    const diagramType = await this.extension.getDiagramTypeForUri(uri);
                    if (diagramType) {
                        this.reloadContent({
                            diagramType,
                            uri: serializeUri(uri),
                            clientId: this.diagramIdentifier.clientId
                        });
                    }
                }
            }));
        }
        await this.ready();
    }

    async reloadContent(newId: SprottyDiagramIdentifier): Promise<void> {
        if (newId.diagramType !== this.diagramIdentifier.diagramType || newId.uri !== this.diagramIdentifier.uri) {
            this.diagramIdentifier.diagramType = newId.diagramType;
            this.diagramIdentifier.uri = newId.uri;
            this.sendDiagramIdentifier();
            this.diagramPanel.title = this.createTitle();
        }
    }

    protected setWebviewActiveContext(isActive: boolean) {
        vscode.commands.executeCommand('setContext', this.diagramIdentifier.diagramType + '-focused', isActive);
    }

    protected async sendDiagramIdentifier() {
        await this.ready();
        this.sendToWebview(this.diagramIdentifier);
    }

    /**
     * @return true if the message should be propagated, e.g. to a language server
     */
    protected receiveFromWebview(message: any): Thenable<boolean> {
        if (isActionMessage(message))
            return this.accept(message.action);
        else if (isWebviewReadyMessage(message)) {
            this.resolveWebviewReady();
            this.sendDiagramIdentifier();
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    protected sendToWebview(message: any) {
        if (isActionMessage(message) || isDiagramIdentifier(message) || isResponseMessage(message)) {
            if (this.diagramPanel.visible) {
                if (isActionMessage(message)) {
                    const actionHandler = this.actionHandlers.get(message.action.kind);
                    if (actionHandler && !actionHandler.handleAction(message.action))
                        return;
                }
                this.diagramPanel.webview.postMessage(message);
            } else {
                this.messageQueue.push(message);
            }
        }
    }

    dispatch(action: Action) {
        this.sendToWebview({
            clientId: this.diagramIdentifier.clientId,
            action
        });
    }

    accept(action: Action): Thenable<boolean> {
        const actionHandler = this.actionHandlers.get(action.kind);
        if (actionHandler)
            return actionHandler.handleAction(action);
        return Promise.resolve(true);
    }

    addActionHandler(actionHandlerConstructor: new(webview: SprottyWebview) => ActionHandler) {
        const actionHandler = new actionHandlerConstructor(this);
        this.actionHandlers.set(actionHandler.kind, actionHandler);
    }
}
