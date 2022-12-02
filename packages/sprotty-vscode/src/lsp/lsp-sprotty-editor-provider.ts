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
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { SprottyDocument, SprottyEditorProvider, SprottyEditorProviderOptions } from '../sprotty-editor-provider';
import { WebviewEndpoint } from '../webview-endpoint';
import { openInTextEditor } from './lsp-utils';
import { LspWebviewEndpoint } from './lsp-webview-endpoint';
import { acceptMessageType, didCloseMessageType, openInTextEditorMessageType } from './protocol';

export interface LspSprottyEditorProviderOptions extends SprottyEditorProviderOptions {
    languageClient: LanguageClient
}

/**
 * A custom editor provider to be connected with a language server to provide diagram contents.
 */
export class LspSprottyEditorProvider extends SprottyEditorProvider {

    constructor(options: LspSprottyEditorProviderOptions) {
        super(options);
        options.languageClient.onNotification(acceptMessageType, message => this.acceptFromLanguageServer(message));
        options.languageClient.onNotification(openInTextEditorMessageType, message => openInTextEditor(message));
    }

    get languageClient(): LanguageClient {
        return (this.options as LspSprottyEditorProviderOptions).languageClient;
    }

    protected override createEndpoint(identifier: SprottyDiagramIdentifier, webviewContainer: vscode.WebviewPanel): WebviewEndpoint {
        const participant = this.messenger.registerWebviewPanel(webviewContainer);
        return new LspWebviewEndpoint({
            languageClient: this.languageClient,
            webviewContainer,
            messenger: this.messenger,
            messageParticipant: participant,
            identifier
        });
    }

    protected override disposeDocument(document: SprottyDocument): void {
        super.disposeDocument(document);
        try {
            this.languageClient.sendNotification(didCloseMessageType, document.endpoint?.diagramIdentifier?.clientId);
        } catch (err) {
            // Ignore the error and proceed
        }
    }

    protected acceptFromLanguageServer(message: ActionMessage): void {
        for (const document of this.documents) {
            const endpoint = document.endpoint;
            if (endpoint && endpoint.diagramIdentifier && endpoint.diagramIdentifier.clientId === message.clientId) {
                endpoint.sendAction(message);
            }
        }
    }

}
