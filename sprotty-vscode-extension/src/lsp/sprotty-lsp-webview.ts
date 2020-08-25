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
import { isActionMessage } from 'sprotty-vscode-protocol';
import { isNotificationMessage, isRequestMessage, ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { LanguageClient } from 'vscode-languageclient';

import { acceptMessageType } from './protocol';
import { SprottyLspVscodeExtension } from './sprotty-lsp-vscode-extension';
import { SprottyWebview, SprottyWebviewOptions } from '../sprotty-webview';


export class SprottyLspWebview extends SprottyWebview {

    static viewCount = 0;

    readonly extension: SprottyLspVscodeExtension;

    constructor(protected options: SprottyWebviewOptions) {
        super(options);
        if (!(options.extension instanceof SprottyLspVscodeExtension))
            throw new Error('SprottyLspWebview must be initialized with a SprottyLspVscodeExtension');
    }

    protected ready(): Promise<void> {
        return Promise.all([super.ready(), this.languageClient.onReady()]) as any;
    }

    protected get languageClient(): LanguageClient {
        return this.extension.languageClient;
    }

    protected async connect() {
        super.connect();
        this.languageClient.onReady().then(() => {
            this.disposables.push(this.extension.onAcceptFromLanguageServer(message => this.sendToWebview(message)));
        });
    }

    protected async receiveFromWebview(message: any): Promise<boolean> {
        const shouldPropagate = await super.receiveFromWebview(message);
        if (shouldPropagate) {
            if (isActionMessage(message)) {
                this.languageClient.sendNotification(acceptMessageType, message);
            } else if (isRequestMessage(message)) {
                const result = (message.params)
                    ? await this.languageClient.sendRequest(message.method, message.params)
                    : await this.languageClient.sendRequest(message.method);
                this.sendToWebview(<ResponseMessage> {
                    jsonrpc: 'response',
                    id: message.id,
                    result: result
                });
            } else if (isNotificationMessage(message)) {
                this.languageClient.sendNotification(message.method, message.params);
            }
        }
        return false;
    }
}
