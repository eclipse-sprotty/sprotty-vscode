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
import { isWebviewPanel, IWebviewEndpointManager, WebviewEndpoint } from './webview-endpoint';
import { createFileUri, createWebviewPanel, getExtname, serializeUri } from './webview-utils';

export interface WebviewPanelManagerOptions {
    extensionUri: vscode.Uri
    defaultDiagramType?: string
    supportedFileExtensions?: string[]
    singleton?: boolean
}

/**
 * This class manages freestyle webview panels. In contrast to custom editor webviews or webview views,
 * VS Code does not prescribe a specific lifecycle to webview panels, so this service provides a means
 * to keep track of the opened diagram webviews.
 */
export class WebviewPanelManager implements IWebviewEndpointManager {

    protected static viewCount = 0;

    protected readonly endpointMap = new Map<string, WebviewEndpoint>();
    protected singleton?: WebviewEndpoint;

    constructor(readonly options: WebviewPanelManagerOptions) {
    }

    /**
     * The singleton webview endpoint. This is only valid if the `singleton` option was enabled for this panel manager.
     */
    get singletonInstance(): WebviewEndpoint | undefined {
        return this.singleton;
    }

    /**
     * Find the webview endpoint of a webview panel that is currently active.
     */
    findActiveWebview(): WebviewEndpoint | undefined {
        if (this.singleton && isWebviewPanel(this.singleton.webviewContainer) && this.singleton.webviewContainer.active) {
            return this.singleton;
        }
        for (const endpoint of this.endpointMap.values()) {
            if (isWebviewPanel(endpoint.webviewContainer) && endpoint.webviewContainer.active) {
                return endpoint;
            }
        }
        return undefined;
    }

    /**
     * Open a webview panel for the given URI. Depending on the `singleton` option, this either replaces a
     * previously opened diagram or creates a new panel.
     */
    async openDiagram(uri: vscode.Uri, options: { diagramType?: string, reveal?: boolean, preserveFocus?: boolean } = {}): Promise<WebviewEndpoint | undefined> {
        const identifier = await this.createDiagramIdentifier(uri, options.diagramType);
        if (!identifier) {
            return undefined;
        }
        const key = this.getKey(identifier);
        let endpoint = this.singleton ?? this.endpointMap.get(key);
        if (endpoint) {
            endpoint.reloadContent(identifier);
            if (options.reveal && isWebviewPanel(endpoint.webviewContainer)) {
                endpoint.webviewContainer.reveal(endpoint.webviewContainer.viewColumn, options.preserveFocus);
            }
        } else {
            endpoint = this.createEndpoint(identifier);
            endpoint.webviewContainer.onDidDispose(() => this.didCloseWebview(endpoint!));
            if (this.options.singleton) {
                this.singleton = endpoint;
            } else {
                this.endpointMap.set(key, endpoint);
            }
        }
        return endpoint;
    }

    protected createEndpoint(identifier: SprottyDiagramIdentifier): WebviewEndpoint {
        const webviewContainer = this.createWebview(identifier);
        return new WebviewEndpoint({ webviewContainer, identifier });
    }

    /**
     * Create and configure a webview panel. The default implementation sets `localResourceRoots` to the `pack` subfolder of the extension
     * host and `scriptUri` to `pack/webview.js`. Please configure your bundler to generate such an output file from the Sprotty webview
     * frontend. In case you need to use different settings or change the HTML content, you can override this functionality in a subclass.
     */
    protected createWebview(identifier: SprottyDiagramIdentifier): vscode.WebviewPanel {
        const extensionPath = this.options.extensionUri.fsPath;
        return createWebviewPanel(identifier, {
            localResourceRoots: [ createFileUri(extensionPath, 'pack') ],
            scriptUri: createFileUri(extensionPath, 'pack', 'webview.js')
        });
    }

    protected async createDiagramIdentifier(uri: vscode.Uri, diagramType?: string): Promise<SprottyDiagramIdentifier | undefined> {
        if (!diagramType) {
            diagramType = await this.getDiagramType(uri);
            if (!diagramType) {
                return undefined;
            }
        }
        const clientId = diagramType + '_' + WebviewPanelManager.viewCount++;
        return {
            diagramType,
            uri: serializeUri(uri),
            clientId
        };
    }

    /**
     * Determine a diagram type from the given URI. The default implementation returns the `defaultDiagramType` option
     * if the URI matches the `supportedFileExtensions` or no file extensions were provided. If no default diagram type
     * was provided, the file extension is used instead.
     */
    protected getDiagramType(uri: vscode.Uri): Promise<string | undefined> | string | undefined {
        const extname = getExtname(uri);
        if (!this.options.supportedFileExtensions || this.options.supportedFileExtensions.includes(extname)) {
            if (this.options.defaultDiagramType) {
                return this.options.defaultDiagramType;
            }
            if (extname.length >= 2) {
                // Fallback: use the file extension after the '.' as diagram type
                return extname.substring(1);
            }
        }
    }

    protected getKey(identifier: SprottyDiagramIdentifier) {
        return `${identifier.diagramType}>>${identifier.uri}`;
    }

    protected didCloseWebview(endpoint: WebviewEndpoint): void {
        if (this.singleton === endpoint) {
            this.singleton = undefined;
        } else {
            const entry = Array.from(this.endpointMap.entries()).find(([key, value]) => value === endpoint);
            if (entry) {
                this.endpointMap.delete(entry[0]);
            }
        }
    }

}
