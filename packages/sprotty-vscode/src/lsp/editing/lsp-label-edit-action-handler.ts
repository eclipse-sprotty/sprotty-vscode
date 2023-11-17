/********************************************************************************
 * Copyright (c) 2020-2023 TypeFox and others.
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

import { LspLabelEditAction } from 'sprotty-vscode-protocol/lib/lsp/editing';
import * as vscode from 'vscode';
import {
    CompletionItem, CompletionItemKind, CompletionRequest, PrepareRenameRequest, RenameParams,
    RenameRequest, TextDocumentPositionParams
} from 'vscode-languageclient/node';
import { convertPosition, convertUri, convertWorkspaceEdit, convertRange } from '../lsp-utils';
import { LspWebviewEndpoint } from '../lsp-webview-endpoint';

export function addLspLabelEditActionHandler(endpoint: LspWebviewEndpoint): void {
    const handler = async (action: LspLabelEditAction) => {
        switch (action.editKind) {
            case 'xref': return chooseCrossReference(action, endpoint);
            case 'name': return renameElement(action, endpoint);
        }
    };
    endpoint.addActionHandler(LspLabelEditAction.KIND, handler);
};

async function chooseCrossReference(action: LspLabelEditAction, endpoint: LspWebviewEndpoint): Promise<void> {
    const completions = await endpoint.languageClient.sendRequest(CompletionRequest.type, {
        textDocument: { uri: action.location.uri },
        position: convertPosition(action.location.range.start)
    });
    if (!completions) {
        return;
    }
    const completionItems = Array.isArray(completions) ? completions : completions.items;
    type QuickPickItem = vscode.QuickPickItem & { value: CompletionItem };
    const quickPickItems = filterCompletionItems(completionItems)
        .map(completionItem => <QuickPickItem> {
            label: completionItem.textEdit!.newText,
            value: completionItem
        });
    const pick = await vscode.window.showQuickPick(quickPickItems);
    if (pick && pick.value.textEdit) {
        const workspaceEdit = new vscode.WorkspaceEdit();
        const textEdit = vscode.TextEdit.replace(convertRange(action.location.range), pick.value.textEdit.newText);
        workspaceEdit.set(convertUri(action.location.uri), [ textEdit ]);
        await vscode.workspace.applyEdit(workspaceEdit);
    }
}

function filterCompletionItems(items: CompletionItem[]): CompletionItem[] {
    return items.filter(item => item.kind === CompletionItemKind.Reference);
}

async function renameElement(action: LspLabelEditAction, endpoint: LspWebviewEndpoint): Promise<void> {
    const canRename = await endpoint.languageClient.sendRequest(PrepareRenameRequest.type, <TextDocumentPositionParams> {
        textDocument: { uri: action.location.uri },
        position: action.location.range.start
    });
    if (!canRename) {
        return;
    }
    const newName = await vscode.window.showInputBox({
        prompt: 'Enter new name',
        placeHolder: 'new name',
        value: action.initialText
    });
    if (newName) {
        const workspaceEdit = await endpoint.languageClient.sendRequest(RenameRequest.type, <RenameParams> {
            textDocument: {
                uri: action.location.uri
            },
            position: action.location.range.start,
            newName
        });
        if (workspaceEdit) {
            await vscode.workspace.applyEdit(convertWorkspaceEdit(workspaceEdit));
        }
    }
}
