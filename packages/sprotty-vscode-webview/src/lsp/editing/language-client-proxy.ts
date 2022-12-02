/********************************************************************************
 * Copyright (c) 2020-2022 TypeFox and others.
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

import { injectable, inject } from 'inversify';
import { NotificationType, NotificationType0, RequestType, RequestType0 } from 'vscode-jsonrpc';
import { CancellationToken, NotificationMessage, RequestMessage, MessageSignature } from 'vscode-languageserver-protocol';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import { LspNotification, LspRequest } from 'sprotty-vscode-protocol/lib/lsp';
import { VsCodeMessenger } from '../../services';
import { SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';

@injectable()
export class LanguageClientProxy {

    @inject(VsCodeMessenger) messenger: Messenger;
    @inject(SprottyDiagramIdentifier) diagramIdentifier: SprottyDiagramIdentifier;

    private nextRequestNumber = 0;

    async sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
    async sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
    async sendRequest<R>(signature: MessageSignature, ...params: any[]): Promise<R> {
        if (CancellationToken.is(params[params.length - 1])) {
            params.pop();
        }
        const message: RequestMessage = {
            jsonrpc: '2.0',
            method: signature.method,
            id: `${this.diagramIdentifier.clientId}-${this.nextRequestNumber++}`,
            params: params[0]
        };
        const response = await this.messenger.sendRequest(LspRequest, HOST_EXTENSION, message);
        if (response.error) {
            throw new Error(String(response.error));
        }
        return response.result as unknown as R;
    }

    sendNotification(type: NotificationType0): void;
    sendNotification<P>(type: NotificationType<P>, params?: P): void;
    sendNotification<P>(signature: MessageSignature, params?: P): void {
        const message: NotificationMessage = {
            jsonrpc: '2.0',
            method: signature.method,
            params: params as any
        };
        this.messenger.sendNotification(LspNotification, HOST_EXTENSION, message);
    }

}
