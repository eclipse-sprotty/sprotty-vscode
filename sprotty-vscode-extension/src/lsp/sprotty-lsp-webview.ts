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

import { isActionMessage } from 'sprotty-protocol';
import { Message, ResponseMessage } from 'vscode-jsonrpc/lib/common/messages';
import { LanguageClient } from 'vscode-languageclient/node';

import { acceptMessageType } from './protocol';
import { SprottyLspVscodeExtension } from './sprotty-lsp-vscode-extension';
import { SprottyWebview, SprottyWebviewOptions } from '../sprotty-webview';


/**
 * @deprecated Use `LspWebviewEndpoint` in conjunction with `LspWebviewPanelManager` instead.
 */
export class SprottyLspWebview extends SprottyWebview {

    static override viewCount = 0;

    override readonly extension: SprottyLspVscodeExtension;

    constructor(protected override options: SprottyWebviewOptions) {
        super(options);
        if (!(options.extension instanceof SprottyLspVscodeExtension))
            throw new Error('SprottyLspWebview must be initialized with a SprottyLspVscodeExtension');
    }

    protected get languageClient(): LanguageClient {
        return this.extension.languageClient;
    }

    protected override async connect() {
        super.connect();
        this.disposables.push(this.extension.onAcceptFromLanguageServer(message => this.sendToWebview(message)));
    }

    protected override async receiveFromWebview(message: any): Promise<boolean> {
        const shouldPropagate = await super.receiveFromWebview(message);
        if (shouldPropagate) {
            if (isActionMessage(message)) {
                this.languageClient.sendNotification(acceptMessageType, message);
            } else if (Message.isRequest(message)) {
                const result = (message.params)
                    ? await this.languageClient.sendRequest(message.method, message.params)
                    : await this.languageClient.sendRequest(message.method);
                this.sendToWebview(<ResponseMessage> {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: result
                });
            } else if (Message.isNotification(message)) {
                this.languageClient.sendNotification(message.method, message.params);
            }
        }
        return false;
    }
}
