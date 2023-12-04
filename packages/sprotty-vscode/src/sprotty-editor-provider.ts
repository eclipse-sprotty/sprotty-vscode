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
import { isWebviewPanel, IWebviewEndpointManager, OpenDiagramOptions, WebviewContainer, WebviewEndpoint } from './webview-endpoint';
import { createFileUri, createWebviewHtml, getExtname, serializeUri } from './webview-utils';

export interface SprottyEditorProviderOptions {
    extensionUri: vscode.Uri
    viewType: string
    messenger?: Messenger
    supportedFileExtensions?: string[]
    createWebviewHtml?: (identifier: SprottyDiagramIdentifier, container: WebviewContainer) => string
    localResourceRoots?: vscode.Uri[]
}

export type CustomDocumentChangeEvent = vscode.CustomDocumentEditEvent<vscode.CustomDocument> | vscode.CustomDocumentContentChangeEvent<vscode.CustomDocument>;

/**
 * Custom editor provider for rendering diagrams. This must be registered in the package.json with a `customEditors` contribution.
 * The default implementation is not able to save, revert or backup the document. If you need such functionality, implement it in
 * a subclass.
 */
export class SprottyEditorProvider implements vscode.CustomEditorProvider, IWebviewEndpointManager {

    protected static viewCount = 0;

    protected readonly changeEmitter = new vscode.EventEmitter<CustomDocumentChangeEvent>();

    get onDidChangeCustomDocument(): vscode.Event<CustomDocumentChangeEvent> {
        return this.changeEmitter.event;
    }

    readonly documents: SprottyDocument[] = [];
    readonly messenger: Messenger;

    constructor(readonly options: SprottyEditorProviderOptions) {
        this.messenger = options.messenger ?? new Messenger();
    }

    /**
     * Find the webview endpoint of a custom editor that is currently active.
     */
    findActiveWebview(): WebviewEndpoint | undefined {
        for (const document of this.documents) {
            if (document.endpoint && isWebviewPanel(document.endpoint.webviewContainer) && document.endpoint.webviewContainer.active) {
                return document.endpoint;
            }
        }
        return undefined;
    }

    /**
     * Open a custom editor for the given URI.
     */
    async openDiagram(uri: vscode.Uri, options?: OpenDiagramOptions): Promise<WebviewEndpoint | undefined> {
        await vscode.commands.executeCommand('vscode.openWith', uri, this.options.viewType);
        // We can't access the resulting webview endpoint from here.
        return undefined;
    }

    openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext,
                       cancelToken: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
        const document: SprottyDocument = {
            uri,
            dispose: () => this.disposeDocument(document)
        };
        this.documents.push(document);
        return document;
    }

    protected disposeDocument(document: SprottyDocument): void {
        const index = this.documents.indexOf(document);
        if (index >= 0) {
            this.documents.splice(index, 1);
        }
    }

    async resolveCustomEditor(document: SprottyDocument, webviewPanel: vscode.WebviewPanel, cancelToken: vscode.CancellationToken): Promise<void> {
        const identifier = await this.createDiagramIdentifier(document);
        if (!identifier) {
            throw new Error(`Document type not supported: ${document.uri.toString(true)}`);
        }
        document.endpoint = this.createEndpoint(identifier, webviewPanel);
        await this.configureWebview(document, webviewPanel, cancelToken);
    }

    protected createEndpoint(identifier: SprottyDiagramIdentifier, webviewContainer: vscode.WebviewPanel): WebviewEndpoint {
        const participant = this.messenger.registerWebviewPanel(webviewContainer);
        return new WebviewEndpoint({
            webviewContainer,
            messenger: this.messenger,
            messageParticipant: participant,
            identifier
        });
    }

    /**
     * Configure the given webview panel. The default implementation sets `localResourceRoots` to the `pack` subfolder of the extension host
     * and `scriptUri` to `pack/webview.js`. Please configure your bundler to generate such an output file from the Sprotty webview frontend.
     * In case you need to use different settings or change the HTML content, you can override this functionality in a subclass.
     */
    protected configureWebview(document: SprottyDocument, webviewPanel: vscode.WebviewPanel, cancelToken: vscode.CancellationToken): Promise<void> | void {
        const extensionPath = this.options.extensionUri.fsPath;
        webviewPanel.webview.options = {
            localResourceRoots: this.options.localResourceRoots ?? [ createFileUri(extensionPath, 'pack') ],
            enableScripts: true
        };
        const identifier = document.endpoint?.diagramIdentifier;
        if (identifier) {
            if (this.options.createWebviewHtml) {
                webviewPanel.webview.html = this.options.createWebviewHtml(identifier, webviewPanel);
            } else {
                const scriptUri = createFileUri(extensionPath, 'pack', 'webview.js');
                webviewPanel.webview.html = createWebviewHtml(identifier, webviewPanel, { scriptUri });
            }
        }
    }

    protected async createDiagramIdentifier(document: SprottyDocument, diagramType?: string): Promise<SprottyDiagramIdentifier | undefined> {
        if (!diagramType) {
            diagramType = await this.getDiagramType(document.uri);
            if (!diagramType) {
                return undefined;
            }
        }
        const clientId = diagramType + '_' + SprottyEditorProvider.viewCount++;
        return {
            diagramType,
            uri: serializeUri(document.uri),
            clientId
        };
    }

    /**
     * Determine a diagram type from the given URI. The default implementation returns the `viewType` of the custom
     * editor if the URI matches the `supportedFileExtensions` or no file extensions were provided.
     */
    protected getDiagramType(uri: vscode.Uri): Promise<string | undefined> | string | undefined {
        const extname = getExtname(uri);
        if (!this.options.supportedFileExtensions || this.options.supportedFileExtensions.includes(extname)) {
            return this.options.viewType;
        }
    }

    saveCustomDocument(document: SprottyDocument, cancellation: vscode.CancellationToken): Promise<void> {
        // Default: read-only diagram view, so no changes to save
        return Promise.resolve();
    }

    revertCustomDocument(document: SprottyDocument, cancelToken: vscode.CancellationToken): Promise<void> {
        // Default: read-only diagram view, so no changes to revert
        return Promise.resolve();
    }

    saveCustomDocumentAs(document: SprottyDocument, destination: vscode.Uri, cancelToken: vscode.CancellationToken): Promise<void> {
        return Promise.reject('Operation not supported.');
    }

    backupCustomDocument(document: SprottyDocument, context: vscode.CustomDocumentBackupContext, cancelToken: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
        return Promise.reject('Operation not supported.');
    }

}

export interface SprottyDocument extends vscode.CustomDocument {
    endpoint?: WebviewEndpoint
}
