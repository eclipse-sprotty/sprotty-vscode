/********************************************************************************
 * Copyright (c) 2025 TypeFox and others.
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

import { LangiumDefaultSharedCoreServices, LangiumDocuments, URI } from 'langium';
import { AbstractExecuteCommandHandler, ExecuteCommandAcceptor } from 'langium/lsp';
import { StateMachine } from './generated/ast.js';
import { TextEdit } from 'vscode-languageserver';

export class StatesCommandHandler extends AbstractExecuteCommandHandler {
    documents: LangiumDocuments;

    constructor(services: LangiumDefaultSharedCoreServices) {
        super();
        this.documents = services.workspace.LangiumDocuments;
    }

    registerCommands(acceptor: ExecuteCommandAcceptor): void {
        acceptor('workspace/createTransition', (args) => this.handleCreateTransition(args));
    }


    private async handleCreateTransition(args: any): Promise<any> {
        console.warn(`Creating transition with action: ${JSON.stringify(args)}`);
        const first = args[0];
        if (!first || typeof first !== 'object') {
            return { success: false, message: 'Invalid arguments' };
        }
        const doc = this.documents.getDocument(URI.parse(first.uri));
        if (!doc) {
            return { success: false, message: `Document not found: ${first.uri}` };
        }
        const model = doc.parseResult?.value as StateMachine;
        if (!model) {
            return { success: false, message: 'Could not parse document' };
        }
        const sourceState = model.states.find(state => state.name === first.newSourceId);
        const targetState = model.states.find(state => state.name === first.newTargetId);
        if (!sourceState || !targetState) {
            return { success: false, message: 'Invalid source or target state' };
        }
        if (sourceState.transitions.some(t => t.state.ref?.name === targetState.name)) {
            return { success: false, message: `Transition with name ${targetState.name} already exists` };
        }
        const offset = (sourceState.transitions.length > 0) ?
            sourceState.transitions[sourceState.transitions.length - 1].$cstNode?.range :
            sourceState.$cstNode?.range;
        if (!offset) {
            return { success: false, message: 'Could not determine insert position' };
        }
        const event = model.events.length > 0 ? model.events[0].name : 'event';
        return {
            success: true, message: 'Transition edit generated successfully', textEdit: <TextEdit>{
                newText: `\n    ${event} => ${targetState.name}\n`,
                range: {
                    start: offset.end,
                    end: offset.end
                }
            }
        };

    }
}
