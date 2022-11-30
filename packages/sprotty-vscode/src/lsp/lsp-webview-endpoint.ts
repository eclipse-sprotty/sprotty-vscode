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

import { isActionMessage } from 'sprotty-protocol';
import { Message, ResponseMessage } from 'vscode-jsonrpc/lib/common/messages';
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

    protected override async receiveFromWebview(message: any): Promise<void> {
        await super.receiveFromWebview(message);
        if (isActionMessage(message)) {
            this.languageClient.sendNotification(acceptMessageType, message);
        } else if (Message.isRequest(message)) {
            const result = message.params === undefined
                ? await this.languageClient.sendRequest(message.method)
                : await this.languageClient.sendRequest(message.method, message.params);
            this.sendToWebview(<ResponseMessage> {
                jsonrpc: '2.0',
                id: message.id,
                result
            });
        } else if (Message.isNotification(message)) {
            this.languageClient.sendNotification(message.method, message.params);
        }
    }

}
