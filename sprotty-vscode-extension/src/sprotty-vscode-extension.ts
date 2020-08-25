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

import * as path from 'path';
import * as vscode from 'vscode';
import { Action, SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';
import { SprottyWebview } from './sprotty-webview';

export abstract class SprottyVscodeExtension {

    protected readonly webviewMap = new Map<string, SprottyWebview>();
    protected singleton?: SprottyWebview;

    constructor(readonly extensionPrefix: string, readonly context: vscode.ExtensionContext) {
        this.registerCommands();
    }

    protected registerCommands() {
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.open', async (...commandArgs: any[]) => {
                const identifier = await this.createDiagramIdentifier(commandArgs);
                if (identifier) {
                    const key = this.getKey(identifier);
                    let webView = this.singleton || this.webviewMap.get(key);
                    if (webView) {
                        webView.reloadContent(identifier);
                        webView.diagramPanel.reveal(webView.diagramPanel.viewColumn);
                    } else {
                        webView = this.createWebView(identifier);
                        this.webviewMap.set(key, webView);
                        if (webView.singleton) {
                            this.singleton = webView;
                        }
                    }
                }
            }));
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.fit', () => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'fit',
                        elementIds: [],
                        animate: true
                    } as Action);
            }));
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.center', () => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'center',
                        elementIds: [],
                        animate: true
                    } as Action);
            }));
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.export', () => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'requestExportSvg'
                    } as Action);
            }));
    }

    protected findActiveWebview(): SprottyWebview | undefined {
        for (const webview of this.webviewMap.values()) {
            if (webview.diagramPanel.active)
                return webview;
        }
        return undefined;
    }

    didCloseWebview(identifier: SprottyDiagramIdentifier): void {
        this.webviewMap.delete(this.getKey(identifier));
        if (this.singleton) {
            this.singleton = undefined;
        }
    }

    protected getKey(identifier: SprottyDiagramIdentifier) {
        return JSON.stringify({
            diagramType: identifier.diagramType,
            uri: identifier.uri
        });
    }

    protected abstract createWebView(diagramIdentifier: SprottyDiagramIdentifier): SprottyWebview;

    protected async createDiagramIdentifier(commandArgs: any[]): Promise<SprottyDiagramIdentifier | undefined> {
        const uri = await this.getURI(commandArgs);
        const diagramType = await this.getDiagramType(commandArgs);
        if (!uri || !diagramType)
            return undefined;
        const clientId = diagramType + '_' + SprottyWebview.viewCount++;
        return {
            diagramType,
            uri: serializeUri(uri),
            clientId
        };
    }

    protected abstract getDiagramType(commandArgs: any[]): Promise<string | undefined> | string | undefined;

    getDiagramTypeForUri(uri: vscode.Uri): Promise<string | undefined> | string | undefined {
        return this.getDiagramType([uri]);
    }

    protected async getURI(commandArgs: any[]): Promise<vscode.Uri | undefined> {
        if (commandArgs.length > 0) {
            if (commandArgs[0] instanceof vscode.Uri) {
                return commandArgs[0];
            }
        }
        if (vscode.window.activeTextEditor)
            return vscode.window.activeTextEditor.document.uri;
        return undefined;
    }

    getExtensionFileUri(...segments: string[]): vscode.Uri {
        return vscode.Uri
            .file(path.join(this.context.extensionPath, ...segments));
    }
}

export function serializeUri(uri: vscode.Uri): string {
    let uriString = uri.toString();
    const match = uriString.match(/file:\/\/\/([a-z])%3A/i);
    if (match) {
        uriString = 'file:///' + match[1] + ':' + uriString.substring(match[0].length);
    }
    return uriString;
}
