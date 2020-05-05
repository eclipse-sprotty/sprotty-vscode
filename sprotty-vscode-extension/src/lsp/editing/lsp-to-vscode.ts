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
import * as lsp from 'vscode-languageclient';

export function convertWorkspaceEdit(workspaceEdit: lsp.WorkspaceEdit): vscode.WorkspaceEdit {
    const result = new vscode.WorkspaceEdit();
    const changes = workspaceEdit.changes;
    if (changes) {
        for (const uri in changes) {
            if (changes.hasOwnProperty(uri)) {
                const textEdits = changes[uri];
                result.set(convertUri(uri), textEdits.map(convertTextEdit));
            }
        }
    }
    workspaceEdit.documentChanges?.forEach(documentChange => {
        if (lsp.TextDocumentEdit.is(documentChange)) {
            result.set(convertUri(documentChange.textDocument.uri), documentChange.edits.map(convertTextEdit));
        } else if (lsp.CreateFile.is(documentChange)) {
            result.createFile(convertUri(documentChange.uri), documentChange.options);
        } else if (lsp.DeleteFile.is(documentChange)) {
            result.deleteFile(convertUri(documentChange.uri), documentChange.options);
        } else if (lsp.RenameFile.is(documentChange)) {
            result.renameFile(convertUri(documentChange.oldUri), convertUri(documentChange.newUri), documentChange.options);
        }
    });
    return result;
}

export function convertTextEdit(textEdit: lsp.TextEdit): vscode.TextEdit {
    return new vscode.TextEdit(convertRange(textEdit.range), textEdit.newText);
}

export function convertRange(range: lsp.Range): vscode.Range {
    return new vscode.Range(convertPosition(range.start), convertPosition(range.end));
}

export function convertPosition(position: lsp.Position): vscode.Position {
    return new vscode.Position(position.line, position.character);
}

export function convertUri(uri: string): vscode.Uri {
    return vscode.Uri.parse(uri);
}
