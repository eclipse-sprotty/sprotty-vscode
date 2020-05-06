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
import { Action } from 'sprotty-vscode-protocol';
import { LspLabelEditAction } from 'sprotty-vscode-protocol/lib/lsp/editing';
import { QuickPickItem, window, workspace, WorkspaceEdit, TextEdit } from 'vscode';
import {
    CompletionItem,
    CompletionItemKind,
    CompletionList,
    CompletionRequest,
    LanguageClient,
    PrepareRenameRequest,
    RenameParams,
    RenameRequest,
    TextDocumentPositionParams,
} from 'vscode-languageclient';

import { ActionHandler } from '../../action-handler';
import { SprottyLspVscodeExtension } from '../sprotty-lsp-vscode-extension';
import { SprottyWebview } from '../../sprotty-webview';
import { convertPosition, convertUri, convertWorkspaceEdit, convertRange } from './lsp-to-vscode';

export class LspLabelEditActionHandler implements ActionHandler {

    readonly kind = LspLabelEditAction.KIND;

    constructor(readonly webview: SprottyWebview) {
        if (!(webview.extension instanceof SprottyLspVscodeExtension))
            throw new Error('LspLabelEditActionHandler must be initialized wit a SprottyLspWebview');
    }

    async handleAction(action: Action): Promise<boolean> {
        if (LspLabelEditAction.is(action)) {
            switch (action.editKind) {
                case 'xref': return this.chooseCrossReference(action);
                case 'name': return this.renameElement(action);
            }
        }
        return false;
    }

    protected get languageClient(): LanguageClient {
        return (this.webview.extension as SprottyLspVscodeExtension).languageClient;
    }

    async chooseCrossReference(action: LspLabelEditAction): Promise<boolean> {
        const completions = await this.languageClient.sendRequest(CompletionRequest.type, {
            textDocument: { uri: action.location.uri },
            position: convertPosition(action.location.range.start)
        });
        if (completions) {
            const completionItems = ((completions as any)["items"])
                ? (completions as CompletionList).items
                : completions as CompletionItem[];

            const quickPickItems = this.filterCompletionItems(completionItems)
                .map(completionItem => { return <QuickPickItem> {
                    label: completionItem.textEdit!.newText,
                    value: completionItem
                };
            });
            const pick = await window.showQuickPick(quickPickItems);
            if (pick) {
                const pickedCompletionItem = (pick as any).value as CompletionItem;
                if (pickedCompletionItem.textEdit) {
                    const workspaceEdit = new WorkspaceEdit();
                    const textEdit = TextEdit.replace(convertRange(action.location.range), pickedCompletionItem.textEdit.newText);
                    workspaceEdit.set(convertUri(action.location.uri), [ textEdit ]);
                    return workspace.applyEdit(workspaceEdit);
                }
            }
        }
        return false;
    }

    protected filterCompletionItems(items: CompletionItem[]): CompletionItem[] {
        return items.filter(item => item.kind === CompletionItemKind.Reference);
    }

    async renameElement(action: LspLabelEditAction): Promise<boolean> {
        const canRename = await this.languageClient.sendRequest(PrepareRenameRequest.type, <TextDocumentPositionParams> {
            textDocument: {
                uri: action.location.uri
            },
            position: action.location.range.start
        });
        if (canRename) {
            const newName = await window.showInputBox({
                prompt: 'Enter new name',
                placeHolder: 'new name',
                value: action.initialText
            });
            if (newName) {
                const workspaceEdit = await this.languageClient.sendRequest(RenameRequest.type, <RenameParams> {
                    textDocument: {
                        uri: action.location.uri
                    },
                    position: action.location.range.start,
                    newName
                });
                if (workspaceEdit)
                    return workspace.applyEdit(convertWorkspaceEdit(workspaceEdit));
            }
        }
        return false;
    }
}
