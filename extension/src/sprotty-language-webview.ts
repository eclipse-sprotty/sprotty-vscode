/********************************************************************************
 * Copyright (c) 2018 TypeFox and others.
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

import { acceptMessageType, isActionMessage } from './protocol';
import { SprottyVscodeLanguageExtension } from './sprotty-vscode-language-extension';
import { SprottyWebview, SprottyWebviewOptions } from './sprotty-webview';

export class SprottyLanguageWebview extends SprottyWebview {

    static viewCount = 0;

    readonly extension: SprottyVscodeLanguageExtension;

    constructor(protected options: SprottyWebviewOptions) {
        super(options);
        if (!(options.extension instanceof SprottyVscodeLanguageExtension))
            throw new Error('SprottyLanguageWebview must be initialized with a SprottyVscodeLanguageExtension');
    }

    protected async connect() {
        super.connect();
        this.extension.languageClient.onReady().then(() => {
            this.disposables.push(this.extension.onAcceptFromLanguageServer(message => this.sendToWebview(message)));
            super.sendDiagramIdentifier();
        });
    }

    protected async sendDiagramIdentifier() {
        // defer first message until language client is ready
    }

    protected receiveFromWebview(message: any) {
        super.receiveFromWebview(message);
        if (isActionMessage(message))
            this.extension.languageClient.sendNotification(acceptMessageType, message);
    }
}
