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

import { DeleteWithWorkspaceEditAction } from 'sprotty-vscode-protocol/lib/lsp/editing';
import * as vscode from 'vscode';
import { IWebviewEndpointManager } from './webview-endpoint';

/**
 * Register default commands for a webview panel manager, editor provider or view provider:
 *  - Open in Diagram (can be shown in context menu of file explorer and text editor)
 *  - Fit to screen (active when diagram is open)
 *  - Center diagram (active when diagram is open)
 *  - Export as SVG (active when diagram is open)
 */
export function registerDefaultCommands(manager: IWebviewEndpointManager, context: vscode.ExtensionContext, options: { extensionPrefix: string }): void {
    function getURI(commandArgs: any[]): vscode.Uri | undefined {
        if (commandArgs.length > 0 && commandArgs[0] instanceof vscode.Uri) {
            return commandArgs[0];
        }
        if (vscode.window.activeTextEditor) {
            return vscode.window.activeTextEditor.document.uri;
        }
        return undefined;
    }
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + '.diagram.open', async (...commandArgs: any[]) => {
            const uri = getURI(commandArgs);
            if (uri) {
                manager.openDiagram(uri, { reveal: true });
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + '.diagram.fit', () => {
            const activeWebview = manager.findActiveWebview();
            if (activeWebview) {
                activeWebview.sendAction({
                    kind: 'fit',
                    elementIds: [],
                    animate: true
                });
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + '.diagram.center', () => {
            const activeWebview = manager.findActiveWebview();
            if (activeWebview) {
                activeWebview.sendAction({
                    kind: 'center',
                    elementIds: [],
                    animate: true
                });
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + '.diagram.export', () => {
            const activeWebview = manager.findActiveWebview();
            if (activeWebview) {
                activeWebview.sendAction({
                    kind: 'requestExportSvg'
                });
            }
        })
    );
}

/**
 * Register a listener to active text editor switching. After every switch, the diagram view attempts to
 * open the text editor's document.
 */
export function registerTextEditorSync(manager: IWebviewEndpointManager, context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async editor => {
            if (editor) {
                manager.openDiagram(editor.document.uri);
            }
        })
    );
}

/**
 * Register commands for editing based on the Language Server Protocol:
 *  - Delete element (using a workspace edit)
 */
export function registerLspEditCommands(manager: IWebviewEndpointManager, context: vscode.ExtensionContext, options: { extensionPrefix: string }): void {
    context.subscriptions.push(
        vscode.commands.registerCommand(options.extensionPrefix + '.diagram.delete', () => {
            const activeWebview = manager.findActiveWebview();
            if (activeWebview) {
                activeWebview.sendAction({
                    kind: DeleteWithWorkspaceEditAction.KIND
                });
            }
        })
    );
}
