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
import {
    SprottyDiagramIdentifier, WebviewContainer, WebviewEndpoint, createFileUri, createWebviewHtml as doCreateWebviewHtml,
    registerDefaultCommands, registerLspEditCommands, registerTextEditorSync
} from 'sprotty-vscode';
import { LspSprottyEditorProvider, LspSprottyViewProvider, LspWebviewEndpoint, LspWebviewPanelManager } from 'sprotty-vscode/lib/lsp';
import { addLspLabelEditActionHandler, addWorkspaceEditActionHandler } from 'sprotty-vscode/lib/lsp/editing';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { Messenger } from 'vscode-messenger';

let languageClient: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    const diagramMode = process.env.DIAGRAM_MODE || 'panel';
    if (!['panel', 'editor', 'view'].includes(diagramMode)) {
        throw new Error("The environment variable 'DIAGRAM_MODE' must be set to 'panel', 'editor' or 'view'.");
    }

    languageClient = createLanguageClient(context);
    const extensionPath = context.extensionUri.fsPath;
    const localResourceRoots = [createFileUri(extensionPath, 'pack', 'diagram')];
    const createWebviewHtml = (identifier: SprottyDiagramIdentifier, container: WebviewContainer) => doCreateWebviewHtml(identifier, container, {
        scriptUri: createFileUri(extensionPath, 'pack', 'diagram', 'main.js'),
        cssUri: createFileUri(extensionPath, 'pack', 'diagram', 'main.css')
    });
    const configureEndpoint = (endpoint: WebviewEndpoint) => {
        addWorkspaceEditActionHandler(endpoint as LspWebviewEndpoint);
        addLspLabelEditActionHandler(endpoint as LspWebviewEndpoint);
    };

    if (diagramMode === 'panel') {
        // Set up webview panel manager for freestyle webviews
        const webviewPanelManager = new LspWebviewPanelManager({
            extensionUri: context.extensionUri,
            defaultDiagramType: 'states',
            languageClient,
            supportedFileExtensions: ['.sm'],
            localResourceRoots,
            createWebviewHtml,
            configureEndpoint
        });
        registerDefaultCommands(webviewPanelManager, context, { extensionPrefix: 'states' });
        registerLspEditCommands(webviewPanelManager, context, { extensionPrefix: 'states' });
    }

    if (diagramMode === 'editor') {
        // Set up webview editor associated with file type
        const webviewEditorProvider = new LspSprottyEditorProvider({
            extensionUri: context.extensionUri,
            viewType: 'states',
            languageClient,
            supportedFileExtensions: ['.sm'],
            localResourceRoots,
            createWebviewHtml,
            configureEndpoint
        });
        context.subscriptions.push(
            vscode.window.registerCustomEditorProvider('states', webviewEditorProvider, {
                webviewOptions: { retainContextWhenHidden: true }
            })
        );
        registerDefaultCommands(webviewEditorProvider, context, { extensionPrefix: 'states' });
        registerLspEditCommands(webviewEditorProvider, context, { extensionPrefix: 'states' });
    }

    if (diagramMode === 'view') {
        // Set up webview view shown in the side panel
        const webviewViewProvider = new LspSprottyViewProvider({
            extensionUri: context.extensionUri,
            viewType: 'states',
            languageClient,
            supportedFileExtensions: ['.sm'],
            openActiveEditor: true,
            messenger: new Messenger({ignoreHiddenViews: false}),
            localResourceRoots,
            createWebviewHtml
        });
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('states', webviewViewProvider, {
                webviewOptions: { retainContextWhenHidden: true }
            })
        );
        registerDefaultCommands(webviewViewProvider, context, { extensionPrefix: 'states' });
        registerTextEditorSync(webviewViewProvider, context);
    }
}

function createLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('pack', 'language-server', 'src', 'main.cjs'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.sm');
    context.subscriptions.push(fileSystemWatcher);

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'states' }],
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher
        }
    };

    // Create the language client and start the client.
    const languageClient = new LanguageClient(
        'states',
        'States',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    languageClient.start();
    return languageClient;
}

export async function deactivate(): Promise<void> {
    if (languageClient) {
        await languageClient.stop();
    }
}
