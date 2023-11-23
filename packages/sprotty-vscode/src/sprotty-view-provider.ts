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

import { SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { isWebviewView, IWebviewEndpointManager, OpenDiagramOptions, WebviewContainer, WebviewEndpoint } from './webview-endpoint';
import { createFileUri, createWebviewHtml, getExtname, serializeUri } from './webview-utils';

export interface SprottyViewProviderOptions {
    extensionUri: vscode.Uri
    viewType: string
    messenger?: Messenger
    supportedFileExtensions?: string[]
    openActiveEditor?: boolean
    createWebviewHtml?: (identifier: SprottyDiagramIdentifier, container: WebviewContainer) => string
    localResourceRoots?: vscode.Uri[]
}

export interface OpenViewOptions extends OpenDiagramOptions {
    preserveFocus?: boolean
    quiet?: boolean
}

/**
 * View provider for rendering diagrams. This must be registered in the package.json with a `views` contribution.
 */
export class SprottyViewProvider implements vscode.WebviewViewProvider, IWebviewEndpointManager {

    protected static viewCount = 0;

    protected readonly clientId: string;
    protected endpoint?: WebviewEndpoint;
    readonly messenger: Messenger;

    constructor(readonly options: SprottyViewProviderOptions) {
        this.clientId = options.viewType + '_' + SprottyViewProvider.viewCount++;
        this.messenger = options.messenger ?? new Messenger();
    }

    /**
     * Returns the webview endpoint of the created view if it is already opened.
     */
    findActiveWebview(): WebviewEndpoint | undefined {
        return this.endpoint;
    }

    /**
     * Open the given URI in the view if it is already opened. There is currently no way to open the view
     * programmatically, so this method shows an error message if the view is not opened. The message can
     * be suppressed with the `quiet` option.
     */
    async openDiagram(uri: vscode.Uri, options: OpenViewOptions = {} ): Promise<WebviewEndpoint | undefined> {
        const identifier = await this.createDiagramIdentifier(uri, options.diagramType);
        if (!identifier) {
            return undefined;
        }
        const endpoint = this.endpoint;
        if (endpoint) {
            endpoint.reloadContent(identifier);
            if (options.reveal && isWebviewView(endpoint.webviewContainer)) {
                endpoint.webviewContainer.show(options.preserveFocus);
            }
        } else {
            vscode.commands.executeCommand(`${identifier.diagramType}.focus`);
        }
        return endpoint;
    }

    async resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, cancelToken: vscode.CancellationToken): Promise<void> {
        if (this.endpoint) {
            console.warn('Warning: Sprotty webview-view is already resolved.');
        }
        let identifier: SprottyDiagramIdentifier | undefined;
        if (this.options.openActiveEditor) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                identifier = await this.createDiagramIdentifier(editor.document.uri);
            }
        }
        const endpoint = this.createEndpoint(webviewView, identifier);
        this.configureWebview(webviewView, endpoint, cancelToken);
        this.endpoint = endpoint;
        webviewView.onDidDispose(() => this.didCloseWebview(endpoint));
    }

    protected createEndpoint(webviewContainer: vscode.WebviewView, identifier?: SprottyDiagramIdentifier): WebviewEndpoint {
        const participant = this.messenger.registerWebviewView(webviewContainer);
        return new WebviewEndpoint({
            webviewContainer,
            messenger: this.messenger,
            messageParticipant: participant,
            identifier
        });
    }

    /**
     * Configure the given webview view. The default implementation sets `localResourceRoots` to the `pack` subfolder of the extension host
     * and `scriptUri` to `pack/webview.js`. Please configure your bundler to generate such an output file from the Sprotty webview frontend.
     * In case you need to use different settings or change the HTML content, you can override this functionality in a subclass.
     */
    protected configureWebview(webviewView: vscode.WebviewView, endpoint: WebviewEndpoint, cancelToken: vscode.CancellationToken): Promise<void> | void {
        const extensionPath = this.options.extensionUri.fsPath;
        webviewView.webview.options = {
            localResourceRoots: this.options.localResourceRoots ?? [ createFileUri(extensionPath, 'pack') ],
            enableScripts: true
        };
        let identifier = endpoint.diagramIdentifier;
        if (!identifier) {
            // Create a preliminary diagram identifier to fill the webview's HTML content
            identifier = { clientId: this.clientId, diagramType: this.options.viewType, uri: '' };
        }
        if (this.options.createWebviewHtml) {
            webviewView.webview.html = this.options.createWebviewHtml(identifier, webviewView);
        } else {
            const scriptUri = createFileUri(extensionPath, 'pack', 'webview.js');
            webviewView.webview.html = createWebviewHtml(identifier, webviewView, { scriptUri });
        }
    }

    protected async createDiagramIdentifier(uri: vscode.Uri, diagramType?: string): Promise<SprottyDiagramIdentifier | undefined> {
        if (!diagramType) {
            diagramType = await this.getDiagramType(uri);
            if (!diagramType) {
                return undefined;
            }
        }
        return {
            diagramType,
            uri: serializeUri(uri),
            clientId: this.clientId
        };
    }

    /**
     * Determine a diagram type from the given URI. The default implementation returns the `viewType` of the view
     * if the URI matches the `supportedFileExtensions` or no file extensions were provided.
     */
    protected getDiagramType(uri: vscode.Uri): Promise<string | undefined> | string | undefined {
        const extname = getExtname(uri);
        if (!this.options.supportedFileExtensions || this.options.supportedFileExtensions.includes(extname)) {
            return this.options.viewType;
        }
    }

    protected didCloseWebview(endpoint: WebviewEndpoint): void {
        if (this.endpoint === endpoint) {
            this.endpoint = undefined;
        }
    }

}
