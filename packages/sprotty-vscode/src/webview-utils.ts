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

import * as path from 'path';
import { SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';
import * as vscode from 'vscode';
import type { WebviewContainer } from './webview-endpoint';

export function serializeUri(uri: vscode.Uri): string {
    let uriString = uri.toString();
    const matchDrive = uriString.match(/^file:\/\/\/([a-z])%3A/i);
    if (matchDrive) {
        uriString = 'file:///' + matchDrive[1] + ':' + uriString.substring(matchDrive[0].length);
    }
    return uriString;
}

/** @deprecated */
export function createWebviewPanel(identifier: SprottyDiagramIdentifier,
    options: { localResourceRoots: vscode.Uri[], scriptUri: vscode.Uri, cssUri?: vscode.Uri; }): vscode.WebviewPanel {
    const title = createWebviewTitle(identifier);
    const diagramPanel = vscode.window.createWebviewPanel(
        identifier.diagramType || 'diagram',
        title,
        vscode.ViewColumn.Beside,
        {
            localResourceRoots: options.localResourceRoots,
            enableScripts: true,
            retainContextWhenHidden: true
        });
    diagramPanel.webview.html = createWebviewHtml(identifier, diagramPanel, {
        scriptUri: options.scriptUri,
        cssUri: options.cssUri,
        title,
    });
    return diagramPanel;
}

export function createWebviewTitle(identifier: SprottyDiagramIdentifier): string {
    if (identifier.uri) {
        const uri = vscode.Uri.parse(identifier.uri);
        return getBasename(uri);
    } else if (identifier.diagramType) {
        return identifier.diagramType.charAt(0).toUpperCase() + identifier.diagramType.substring(1);
    } else {
        return 'Diagram';
    }
}

export function createWebviewHtml(identifier: SprottyDiagramIdentifier, container: WebviewContainer,
    options: { scriptUri: vscode.Uri, cssUri?: vscode.Uri, title?: string; }): string {
    const transformUri = (uri: vscode.Uri) => container.webview.asWebviewUri(uri).toString();
    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, height=device-height">
        ${options.title ? `<title>${options.title}</title>` : ''}
        ${options.cssUri ? `<link rel="stylesheet" type="text/css" href="${transformUri(options.cssUri)}" />` : ''}
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${container.webview.cspSource}; style-src 'unsafe-inline' ${container.webview.cspSource};">
    </head>
    <body>
        <div id="${identifier.clientId}_container" style="height: 100%;"></div>
        <script src="${transformUri(options.scriptUri)}"></script>
    </body>
</html>`;
}

export function createFileUri(...segments: string[]): vscode.Uri {
    return vscode.Uri.file(path.join(...segments));
}

export function getBasename(uri: vscode.Uri): string {
    const slashIndex = uri.path.lastIndexOf('/');
    return uri.path.substring(slashIndex + 1);
}

export function getExtname(uri: vscode.Uri): string {
    const basename = getBasename(uri);
    const dotIndex = basename.lastIndexOf('.');
    if (dotIndex <= 0) {
        return '';
    }
    return basename.substring(dotIndex);
}
