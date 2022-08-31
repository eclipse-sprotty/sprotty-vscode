/********************************************************************************
 * Copyright (c) 2018-2022 TypeFox and others.
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
import { registerDefaultCommands, registerLspEditCommands, SprottyDiagramIdentifier } from 'sprotty-vscode';
import { LspWebviewEndpoint, LspWebviewPanelManager } from 'sprotty-vscode/lib/lsp';
import { addLspLabelEditActionHandler, addWorkspaceEditActionHandler } from 'sprotty-vscode/lib/lsp/editing';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let languageClient: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    languageClient = createLanguageClient(context);
    const webviewPanelManager = new StatesWebviewPanelManager({
        extensionUri: context.extensionUri,
        defaultDiagramType: 'states-diagram',
        languageClient,
        supportedFileExtensions: ['.sm']
    });
    registerDefaultCommands(webviewPanelManager, context, { extensionPrefix: 'states' });
    registerLspEditCommands(webviewPanelManager, context, { extensionPrefix: 'states' });
}

function createLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const executable = process.platform === 'win32' ? 'states-language-server.bat' : 'states-language-server';
        const languageServerPath =  path.join('server', 'states-language-server', 'bin', executable);
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

class StatesWebviewPanelManager extends LspWebviewPanelManager {
    protected override createEndpoint(identifier: SprottyDiagramIdentifier): LspWebviewEndpoint {
        const endpoint = super.createEndpoint(identifier);
        addWorkspaceEditActionHandler(endpoint);
        addLspLabelEditActionHandler(endpoint);
        return endpoint;
    }
}

export async function deactivate(): Promise<void> {
    if (languageClient) {
        await languageClient.stop();
    }
}
