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
import { injectable } from 'inversify';
import { NotificationType, NotificationType0, RequestType, RequestType0, MessageSignature } from 'vscode-jsonrpc';
import { isResponseMessage } from 'vscode-jsonrpc/lib/common/messages';
import { CancellationToken, NotificationMessage, RequestMessage, } from 'vscode-languageserver-protocol';
import { vscodeApi } from '../../vscode-api';

@injectable()
export class LanguageClientProxy {

    private currentNumber = 0;
    private openRequestsResolves = new Map<number, (value: any) => void>();
    private openRequestsRejects = new Map<number, (reason: any) => void>();

    constructor() {
        window.addEventListener('message', message => {
            if ('data' in message && isResponseMessage(message.data)) {
                const id = message.data.id;
                if (typeof id === 'number') {
                    if (message.data.error) {
                        const reject = this.openRequestsRejects.get(id);
                        if (reject)
                            reject(message.data.error);
                    } else {
                        const resolve = this.openRequestsResolves.get(id);
                        if (resolve)
                            resolve(message.data.result);
                    }
                    this.openRequestsResolves.delete(id);
                    this.openRequestsRejects.delete(id);
                }
            }
        });
    }

    async sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
    async sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
    async sendRequest<R>(type: MessageSignature, ...params: any[]): Promise<R> {
        if (CancellationToken.is(params[params.length - 1]))
            params.pop();
        vscodeApi.postMessage(<RequestMessage>{
            method: type.method,
            id: this.currentNumber,
            jsonrpc: 'request',
            params: params[0]
        });
        const promise = new Promise<R>((resolve, reject) => {
            this.openRequestsResolves.set(this.currentNumber, resolve);
            this.openRequestsRejects.set(this.currentNumber, reject);
        });
        ++this.currentNumber;
        return promise;
    }

    sendNotification(type: NotificationType0): void;
    sendNotification<P>(type: NotificationType<P>, params?: P): void;
    sendNotification<P>(type: MessageSignature, params?: P): void {
        vscodeApi.postMessage(<NotificationMessage>{
            method: type.method,
            jsonrpc: 'notify',
            params
        });
    }
}

