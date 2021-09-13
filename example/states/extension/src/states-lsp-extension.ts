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

import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';
import { LspLabelEditActionHandler, WorkspaceEditActionHandler, SprottyLspEditVscodeExtension } from "sprotty-vscode/lib/lsp/editing";
import { SprottyDiagramIdentifier, SprottyLspWebview } from 'sprotty-vscode/lib/lsp';
import { SprottyWebview } from 'sprotty-vscode/lib/sprotty-webview';

export class StatesLspVscodeExtension extends SprottyLspEditVscodeExtension {

    constructor(context: vscode.ExtensionContext) {
        super('states', context);
    }

    protected getDiagramType(commandArgs: any[]): string | undefined {
        if (commandArgs.length === 0
            || commandArgs[0] instanceof vscode.Uri && commandArgs[0].path.endsWith('.sm')) {
            return 'states-diagram';
        }
    }

    createWebView(identifier: SprottyDiagramIdentifier): SprottyWebview {
        const webview = new SprottyLspWebview({
            extension: this,
            identifier,
            localResourceRoots: [
                this.getExtensionFileUri('pack')
            ],
            scriptUri: this.getExtensionFileUri('pack', 'webview.js'),
            singleton: false // Change this to `true` to enable a singleton view
        });
        webview.addActionHandler(WorkspaceEditActionHandler);
        webview.addActionHandler(LspLabelEditActionHandler);
        return webview;
    }

    protected activateLanguageClient(context: vscode.ExtensionContext): LanguageClient {
        const executable = process.platform === 'win32' ? 'states-language-server.bat' : 'states-language-server';
        const languageServerPath = path.join('server', 'states-language-server', 'bin', executable);
        const serverLauncher = context.asAbsolutePath(languageServerPath);
        const serverOptions: ServerOptions = {
            run: {
                command: serverLauncher,
                args: ['-trace']
            },
            debug: {
                command: serverLauncher,
                args: ['-trace']
            }
        };
        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: 'file', language: 'states' }],
        };
        const languageClient = new LanguageClient('statesLanguageClient', 'States Language Server', serverOptions, clientOptions);
        languageClient.start();
        return languageClient;
    }
}
