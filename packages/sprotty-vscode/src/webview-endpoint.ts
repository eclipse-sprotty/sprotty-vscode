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
import { ActionNotification, DiagramIdentifierNotification, SprottyDiagramIdentifier, WebviewReadyNotification } from 'sprotty-vscode-protocol';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { MessageParticipant } from 'vscode-messenger-common';

export type WebviewContainer = vscode.WebviewPanel | vscode.WebviewView;

export function isWebviewPanel(container: WebviewContainer): container is vscode.WebviewPanel {
    return typeof (container as vscode.WebviewPanel).onDidChangeViewState === 'function';
}

export function isWebviewView(container: WebviewContainer): container is vscode.WebviewView {
    return typeof (container as vscode.WebviewView).onDidChangeVisibility === 'function';
}

export interface OpenDiagramOptions {
    diagramType?: string
    reveal?: boolean
}

export interface IWebviewEndpointManager {
    openDiagram(uri: vscode.Uri, options?: OpenDiagramOptions): Promise<WebviewEndpoint | undefined>
    findActiveWebview(): WebviewEndpoint | undefined
}

export interface WebviewEndpointOptions {
    webviewContainer: WebviewContainer
    messenger: Messenger
    messageParticipant: MessageParticipant
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
    readonly messenger: Messenger;
    readonly messageParticipant: MessageParticipant;
    readonly diagramServer?: ActionAcceptor;
    diagramIdentifier?: SprottyDiagramIdentifier;

    protected readonly actionHandlers: Map<string, ActionHandler<any>[]> = new Map();
    protected readonly disposables: vscode.Disposable[] = [];

    constructor(options: WebviewEndpointOptions) {
        this.webviewContainer = options.webviewContainer;
        this.messenger = options.messenger;
        this.messageParticipant = options.messageParticipant;
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
        if (isWebviewPanel(this.webviewContainer)) {
            this.disposables.push(
                this.webviewContainer.onDidChangeViewState(event => {
                    this.setWebviewActiveContext(event.webviewPanel.active);
                })
            );
        }
        this.disposables.push(
            this.messenger.onNotification(ActionNotification,
                message => this.receiveAction(message),
                { sender: this.messageParticipant }
            )
        );
        this.disposables.push(
            this.messenger.onNotification(WebviewReadyNotification,
                message => {
                    this.resolveWebviewReady();
                    this.sendDiagramIdentifier();
                },
                { sender: this.messageParticipant }
            )
        );
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
        if (this.diagramIdentifier) {
            this.diagramIdentifier.uri = newIdentifier.uri;
            this.diagramIdentifier.diagramType = newIdentifier.diagramType;
        } else {
            this.diagramIdentifier = newIdentifier;
        }
        await this.sendDiagramIdentifier();
    }

    protected async sendDiagramIdentifier(): Promise<void> {
        await this.ready;
        if (this.diagramIdentifier) {
            this.messenger.sendNotification(DiagramIdentifierNotification, this.messageParticipant, this.diagramIdentifier);
        }
    }

    /**
     * Send an action to the webview to be processed by the Sprotty frontend.
     */
    async sendAction<A extends Action>(action: A | ActionMessage): Promise<void> {
        const message = isActionMessage(action) ? action : {
            clientId: this.diagramIdentifier?.clientId,
            action
        };
        const handlers = this.actionHandlers.get(message.action.kind);
        if (handlers && handlers.length > 0) {
            return Promise.all(handlers.map(handler => handler(message.action))) as any;
        }
        this.messenger.sendNotification(ActionNotification, this.messageParticipant, message);
    }

    /**
     * Process an action received from the webview.
     */
    receiveAction(message: ActionMessage): Promise<void> {
        const action = message.action;
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
    addActionHandler<A extends Action>(kind: string, handler: ActionHandler<A>): void {
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
    removeActionHandler<A extends Action>(kind: string, handler: ActionHandler<A>): void {
        const handlers = this.actionHandlers.get(kind);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index >= 0) {
                handlers.splice(index, 1);
            }
        }
    }

}

export type ActionHandler<A extends Action = Action> = (action: A) => void | Promise<void>;
