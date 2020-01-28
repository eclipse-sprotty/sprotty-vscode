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
import { Action, SprottyDiagramIdentifier } from './protocol';
import { SprottyWebview } from './sprotty-webview';

export abstract class SprottyVscodeExtension {

    protected webviewMap = new Map<string, SprottyWebview>();

    constructor(readonly extensionPrefix: string, readonly context: vscode.ExtensionContext) {
        this.registerCommands();
    }

    protected registerCommands() {
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.open', (...commandArgs: any) => {
                const identifier = this.createDiagramIdentifier(commandArgs);
                if (identifier) {
                    const key = this.getKey(identifier);
                    const webView = this.webviewMap.get(key);
                    if (webView)
                        webView.diagramPanel.reveal(webView.diagramPanel.viewColumn);
                    else
                        this.webviewMap.set(key, this.createWebView(identifier));
                }
            }));
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.fit', (...commandArgs: any) => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'fit',
                        elementIds: [],
                        animate: true
                    } as Action);
            }));
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.center', (...commandArgs: any) => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'center',
                        elementIds: [],
                        animate: true
                    } as Action);
            }));
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.export', (...commandArgs: any) => {
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
    }

    protected getKey(identifier: SprottyDiagramIdentifier) {
        return JSON.stringify({
            diagramType: identifier.diagramType,
            uri: identifier.uri
        });
    }

    protected abstract createWebView(diagramIdentifier: SprottyDiagramIdentifier): SprottyWebview;

    protected createDiagramIdentifier(commandArgs: any[]): SprottyDiagramIdentifier | undefined {
        const uri = this.getURI(commandArgs);
        const diagramType = this.getDiagramType(commandArgs);
        if (!uri || !diagramType)
            return undefined;
        const clientId = diagramType + '_' + SprottyWebview.viewCount++;
        return {
            diagramType,
            uri: uri.toString(),
            clientId
        };
    }

    protected abstract getDiagramType(commandArgs: any[]): string | undefined;

    protected getURI(commandArgs: any[]): vscode.Uri | undefined {
        if (commandArgs.length > 0) {
            if (commandArgs[0] instanceof vscode.Uri) {
                return commandArgs[0];
            }
        }
        if (vscode.window.activeTextEditor)
            return vscode.window.activeTextEditor.document.uri;
        return undefined;
    }

    resourceUri(...segments: string[]): vscode.Uri {
        return vscode.Uri
            .file(path.join(this.context.extensionPath, ...segments))
            .with({ scheme: 'vscode-resource' });
    }
}
