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
import { LspNotification, LspRequest } from 'sprotty-vscode-protocol/lib/lsp';
import { ResponseMessage } from 'vscode-jsonrpc/lib/common/messages';
import { LanguageClient } from 'vscode-languageclient/node';
import { WebviewEndpoint, WebviewEndpointOptions } from '../webview-endpoint';
import { acceptMessageType } from './protocol';

export interface LspWebviewEndpointOptions extends WebviewEndpointOptions {
    languageClient: LanguageClient
}

/**
 * A webview endpoint subclass that forwards messages from the webview to a language server
 * via the Language Server Protocol.
 */
export class LspWebviewEndpoint extends WebviewEndpoint {

    readonly languageClient: LanguageClient;

    constructor(options: LspWebviewEndpointOptions) {
        super(options);
        this.languageClient = options.languageClient;
    }

    protected override connect(): void {
        super.connect();
        this.disposables.push(
            this.messenger.onRequest(LspRequest,
                async request => {
                    const result: any = request.params === undefined
                        ? await this.languageClient.sendRequest(request.method)
                        : await this.languageClient.sendRequest(request.method, request.params);
                    const response: ResponseMessage = {
                        jsonrpc: '2.0',
                        id: request.id,
                        result
                    };
                    return response;
                },
                { sender: this.messageParticipant }
            )
        );
        this.disposables.push(
            this.messenger.onNotification(LspNotification,
                notification => {
                    this.languageClient.sendNotification(notification.method, notification.params);
                },
                { sender: this.messageParticipant }
            )
        );
    }

    override async receiveAction(message: ActionMessage): Promise<void> {
        await super.receiveAction(message);
        await this.languageClient.sendNotification(acceptMessageType, message);
    }

}
