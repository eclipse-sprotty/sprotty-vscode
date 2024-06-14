/********************************************************************************
 * Copyright (c) 2023 TypeFox and others.
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

import { LangiumDocument, MaybePromise, URI } from 'langium';
import { CodeActionProvider } from 'langium/lsp';
import { CodeActionParams, Command, CodeAction, Position, WorkspaceEdit } from 'vscode-languageserver';
import { StateMachine } from './generated/ast.js';

const CREATE_STATE_KIND = 'sprotty.create.state';
const CREATE_EVENT_KIND = 'sprotty.create.event';

export class StatesCodeActionProvider implements CodeActionProvider {

    getCodeActions(document: LangiumDocument<StateMachine>, params: CodeActionParams): MaybePromise<(Command | CodeAction)[] | undefined> {
        const sm = document.parseResult.value;
        const result: CodeAction[] = [];
        const endOfDocument = document.textDocument.positionAt(document.textDocument.getText().length);
        if (matchesContext(CREATE_STATE_KIND, params)) {
            result.push({
                kind: CREATE_STATE_KIND,
                title: 'new State',
                edit: createInsertWorkspaceEdit(
                    document.uri,
                    endOfDocument,
                    '\n' + 'state ' + getNewName('state', sm.states.map(s => s.name))
                )
            });
        }
        if (matchesContext(CREATE_EVENT_KIND, params)) {
            result.push({
                kind: CREATE_EVENT_KIND,
                title: 'new Event',
                edit: createInsertWorkspaceEdit(
                    document.uri,
                    endOfDocument,
                    '\n' + 'event '+ getNewName('event', sm.events.map(e => e.name))
                )
            });
        }
        return result;
    }

}

function matchesContext(kind: string, params: CodeActionParams): boolean {
    if (!params.context?.only) {
        return true;
    } else {
        return params.context.only.some(k => kind.startsWith(k));
    }
}

function getNewName(prefix: string, siblings: string[]): string {
	for (let i = 0;; i++) {
        const currentName = prefix + i;
        if (!siblings.some(s => s === currentName)) {
            return currentName;
        }
    }
}

function createInsertWorkspaceEdit(uri: URI, position: Position, text: string): WorkspaceEdit {
    return {
        changes: {
            [uri.toString()]: [
                {
                    range: {
                        start: position,
                        end: position
                    },
                    newText: text
                }
            ]
        }
    };
}
