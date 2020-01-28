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
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';
import { SprottyDiagramIdentifier, SprottyVscodeLanguageExtension, SprottyWebview, SprottyLanguageWebview } from "sprotty-vscode/lib";

export class StatesLanguageExtension extends SprottyVscodeLanguageExtension {

    constructor(context: vscode.ExtensionContext) {
        super('states', context);
    }

    protected getDiagramType(commandArgs: any[]): string {
        return 'states-diagram';
    }

    createWebView(identifier: SprottyDiagramIdentifier): SprottyWebview {
        return new SprottyLanguageWebview({
            extension: this,
            identifier,
            localResourceRoots: [
                'webview/states-sprotty-vscode/pack'
            ],
            scriptPath: 'webview/states-sprotty-vscode/pack/bundle.js'
        });
    }

    protected activateLanguageClient(context: vscode.ExtensionContext): LanguageClient {
        const executable = process.platform === 'win32' ? 'states-language-server.bat' : 'states-language-server';
        const languageServerPath =  path.join('server', 'states-language-server', 'bin', executable);
        const serverLauncher = context.asAbsolutePath(languageServerPath);
        const serverOptions: ServerOptions = {
            run: {
                command: serverLauncher,
                args: ['-trace']
            },
            debug: {
                command: serverLauncher
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
