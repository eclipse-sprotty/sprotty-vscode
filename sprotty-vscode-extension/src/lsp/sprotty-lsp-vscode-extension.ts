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

import * as vscode from 'vscode';
import { Emitter, LanguageClient } from 'vscode-languageclient';
import { acceptMessageType, didCloseMessageType, OpenInTextEditorMessage, openInTextEditorMessageType } from './protocol';
import { ActionMessage, SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';
import { SprottyVscodeExtension } from '../sprotty-vscode-extension';

export abstract class SprottyLspVscodeExtension extends SprottyVscodeExtension {
    readonly languageClient: LanguageClient;

    protected acceptFromLanguageServerEmitter = new Emitter<ActionMessage>();

    constructor(extensionPrefix: string, context: vscode.ExtensionContext) {
        super(extensionPrefix, context);
        this.languageClient = this.activateLanguageClient(context);
        this.languageClient.onReady().then(() => {
            this.languageClient.onNotification(acceptMessageType, message => this.acceptFromLanguageServerEmitter.fire(message));
            this.languageClient.onNotification(openInTextEditorMessageType, message => this.openInTextEditor(message));
        });
    }

    onAcceptFromLanguageServer(listener: (message: ActionMessage) => void): vscode.Disposable {
        return this.acceptFromLanguageServerEmitter.event(listener);
    }

    didCloseWebview(identifier: SprottyDiagramIdentifier): void {
        super.didCloseWebview(identifier);
        try {
            this.languageClient.sendNotification(didCloseMessageType, identifier.clientId);
        } catch (err) {
            // Ignore the error and proceed
        }
    }

    protected abstract activateLanguageClient(context: vscode.ExtensionContext): LanguageClient;

    deactivateLanguageClient(): Thenable<void> {
        if (!this.languageClient)
            return Promise.resolve(undefined);
        return this.languageClient.stop();
    }

    protected openInTextEditor(message: OpenInTextEditorMessage): void {
        const editor = vscode.window.visibleTextEditors.find(visibleEditor => visibleEditor.document.uri.toString() === message.location.uri);
        if (editor) {
            const start = this.toPosition(message.location.range.start);
            const end = this.toPosition(message.location.range.end);
            editor.selection = new vscode.Selection(start, end);
            editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
        } else if (message.forceOpen) {
            vscode.window.showTextDocument(vscode.Uri.parse(message.location.uri), {
                selection: new vscode.Range(this.toPosition(message.location.range.start),
                                            this.toPosition(message.location.range.end)),
                viewColumn: vscode.ViewColumn.One
            });
        }
    }

    protected toPosition(p: { character: number, line: number }): vscode.Position {
        return new vscode.Position(p.line, p.character);
    }
}
