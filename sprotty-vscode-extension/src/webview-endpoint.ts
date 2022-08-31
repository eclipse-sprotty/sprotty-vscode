/********************************************************************************
 * Copyright (c) 2022 TypeFox and others.
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

import { Action, ActionMessage, isActionMessage } from 'sprotty-protocol';
import { isWebviewReadyMessage, SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';
import * as vscode from 'vscode';
import type { Message } from 'vscode-jsonrpc/lib/common/messages';

export type WebviewContainer = vscode.WebviewPanel | vscode.WebviewView;

export function isWebviewPanel(container: WebviewContainer): container is vscode.WebviewPanel {
    return typeof (container as vscode.WebviewPanel).onDidChangeViewState === 'function';
}

export function isWebviewView(container: WebviewContainer): container is vscode.WebviewView {
    return typeof (container as vscode.WebviewView).onDidChangeVisibility === 'function';
}

export interface IWebviewEndpointManager {
    openDiagram(uri: vscode.Uri, options?: { diagramType?: string, reveal?: boolean }): Promise<WebviewEndpoint | undefined>
    findActiveWebview(): WebviewEndpoint | undefined
}

export interface WebviewEndpointOptions {
    webviewContainer: WebviewContainer
    diagramServer?: ActionAcceptor
    diagramServerFactory?: DiagramServerFactory
    identifier?: SprottyDiagramIdentifier
}

export interface ActionAcceptor {
    accept(action: Action): Promise<void>
}

export type DiagramServerFactory = (dispatch: <A extends Action>(action: A) => Promise<void>) => ActionAcceptor;

/**
 * Wrapper class around a webview panel or webview view. This service takes care of the communication between the webview
 * and the host extension.
 */
export class WebviewEndpoint {

    readonly webviewContainer: WebviewContainer;
    readonly diagramServer?: ActionAcceptor;
    diagramIdentifier?: SprottyDiagramIdentifier;

    protected readonly actionHandlers: Map<string, ActionHandler[]> = new Map();
    protected readonly disposables: vscode.Disposable[] = [];
    protected messageQueue: (ActionMessage | SprottyDiagramIdentifier | Message)[] = [];

    constructor(options: WebviewEndpointOptions) {
        this.webviewContainer = options.webviewContainer;
        this.diagramIdentifier = options.identifier;
        if (options.diagramServer) {
            this.diagramServer = options.diagramServer;
        } else if (options.diagramServerFactory) {
            const dispatch = <A extends Action>(action: A) => this.sendAction(action);
            this.diagramServer = options.diagramServerFactory(dispatch);
        }
        this.connect();
    }

    private resolveWebviewReady: () => void;
    private readonly webviewReady = new Promise<void>(resolve => this.resolveWebviewReady = resolve);

    get ready(): Promise<void> {
        return this.webviewReady;
    }

    protected connect(): void {
        this.disposables.push(
            this.webviewContainer.onDidDispose(() => {
                this.disposables.forEach(disposable => disposable.dispose());
            })
        );
        this.disposables.push(
            this.webviewContainer.webview.onDidReceiveMessage(message => this.receiveFromWebview(message))
        );
        if (isWebviewPanel(this.webviewContainer)) {
            this.disposables.push(
                this.webviewContainer.onDidChangeViewState(event => {
                    if (this.webviewContainer.visible) {
                        this.messageQueue.forEach(message => this.sendToWebview(message));
                        this.messageQueue = [];
                    }
                    this.setWebviewActiveContext(event.webviewPanel.active);
                })
            );
        } else if (isWebviewView(this.webviewContainer)) {
            this.disposables.push(
                this.webviewContainer.onDidChangeVisibility(() => {
                    if (this.webviewContainer.visible) {
                        this.messageQueue.forEach(message => this.sendToWebview(message));
                        this.messageQueue = [];
                    }
                })
            );
        }
    }

    /**
     * Process a raw message received from the webview.
     */
    protected receiveFromWebview(message: any): Promise<void> {
        if (isActionMessage(message)) {
            return this.receiveAction(message.action);
        } else if (isWebviewReadyMessage(message)) {
            this.resolveWebviewReady();
            this.sendDiagramIdentifier();
        }
        return Promise.resolve();
    }

    /**
     * Enable or disable a context variable to be used in UI contributions in the package.json file.
     */
    protected setWebviewActiveContext(isActive: boolean) {
        if (this.diagramIdentifier) {
            vscode.commands.executeCommand('setContext', this.diagramIdentifier.diagramType + '-focused', isActive);
        }
    }

    /**
     * Trigger loading of new content in the webview. The content is identified by the URI and diagram type.
     */
    async reloadContent(newIdentifier: SprottyDiagramIdentifier): Promise<void> {
        if (!this.diagramIdentifier || newIdentifier.diagramType !== this.diagramIdentifier.diagramType || newIdentifier.uri !== this.diagramIdentifier.uri) {
            this.diagramIdentifier = newIdentifier;
            await this.sendDiagramIdentifier();
        }
    }

    protected async sendDiagramIdentifier(): Promise<void> {
        await this.ready;
        if (this.diagramIdentifier) {
            await this.sendToWebview(this.diagramIdentifier);
        }
    }

    /**
     * Send an action to the webview to be processed by the Sprotty frontend.
     */
    async sendAction<A extends Action>(action: A): Promise<void> {
        if (this.diagramIdentifier) {
            await this.sendToWebview({
                clientId: this.diagramIdentifier.clientId,
                action
            });
        }
    }

    async sendToWebview(message: ActionMessage | SprottyDiagramIdentifier | Message): Promise<void> {
        if (isActionMessage(message)) {
            const handlers = this.actionHandlers.get(message.action.kind);
            if (handlers && handlers.length > 0) {
                return Promise.all(handlers.map(handler => handler(message.action))) as any;
            }
        }
        if (this.webviewContainer.visible) {
            await this.webviewContainer.webview.postMessage(message);
        } else {
            this.messageQueue.push(message);
        }
    }

    /**
     * Process an action received from the webview.
     */
    receiveAction(action: Action): Promise<void> {
        const handlers = this.actionHandlers.get(action.kind);
        if (handlers && handlers.length > 0) {
            return Promise.all(handlers.map(handler => handler(action))) as any;
        }
        if (this.diagramServer) {
            return this.diagramServer.accept(action);
        }
        return Promise.resolve();
    }

    /**
     * Add an action handler for actions that are sent or received. If one or more handlers are registered for an
     * action kind, the corresponding actions are sent to those handlers and are not propagated further.
     */
    addActionHandler(kind: string, handler: ActionHandler): void {
        const handlers = this.actionHandlers.get(kind);
        if (handlers) {
            handlers.push(handler);
        } else {
            this.actionHandlers.set(kind, [handler]);
        }
    }

    /**
     * Remove a previously registered action handler.
     */
    removeActionHandler(kind: string, handler: ActionHandler): void {
        const handlers = this.actionHandlers.get(kind);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index >= 0) {
                handlers.splice(index, 1);
            }
        }
    }

}

type ActionHandler = (action: Action) => void | Promise<void>;
