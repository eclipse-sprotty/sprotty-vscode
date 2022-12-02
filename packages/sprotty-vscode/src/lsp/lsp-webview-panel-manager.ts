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

import { ActionMessage } from 'sprotty-protocol';
import { SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';
import { LanguageClient } from 'vscode-languageclient/node';
import { WebviewEndpoint } from '../webview-endpoint';
import { WebviewPanelManager, WebviewPanelManagerOptions } from '../webview-panel-manager';
import { openInTextEditor } from './lsp-utils';
import { LspWebviewEndpoint } from './lsp-webview-endpoint';
import { acceptMessageType, didCloseMessageType, openInTextEditorMessageType } from './protocol';

export interface LspWebviewPanelManagerOptions extends WebviewPanelManagerOptions {
    languageClient: LanguageClient
}

/**
 * A webview panel manager to be connected with a language server to provide diagram contents.
 */
export class LspWebviewPanelManager extends WebviewPanelManager {

    constructor(options: LspWebviewPanelManagerOptions) {
        super(options);
        options.languageClient.onNotification(acceptMessageType, message => this.acceptFromLanguageServer(message));
        options.languageClient.onNotification(openInTextEditorMessageType, message => openInTextEditor(message));
    }

    get languageClient(): LanguageClient {
        return (this.options as LspWebviewPanelManagerOptions).languageClient;
    }

    protected override createEndpoint(identifier: SprottyDiagramIdentifier): LspWebviewEndpoint {
        const webviewContainer = this.createWebview(identifier);
        const participant = this.messenger.registerWebviewPanel(webviewContainer);
        return new LspWebviewEndpoint({
            languageClient: this.languageClient,
            webviewContainer,
            messenger: this.messenger,
            messageParticipant: participant,
            identifier
        });
    }

    protected override didCloseWebview(endpoint: WebviewEndpoint): void {
        super.didCloseWebview(endpoint);
        try {
            this.languageClient.sendNotification(didCloseMessageType, endpoint.diagramIdentifier?.clientId);
        } catch (err) {
            // Ignore the error and proceed
        }
    }

    protected acceptFromLanguageServer(message: ActionMessage): void {
        for (const endpoint of this.endpoints) {
            if (endpoint.diagramIdentifier && endpoint.diagramIdentifier.clientId === message.clientId) {
                endpoint.sendAction(message);
            }
        }
    }

}
