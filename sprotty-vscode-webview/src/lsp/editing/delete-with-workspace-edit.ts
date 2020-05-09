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

import { inject, injectable } from "inversify";
import { CommandExecutionContext, isSelectable, SChildElement, SEdge, Selectable, SModelElement, TYPES, Command, CommandReturn, IActionDispatcher } from "sprotty";
import { DeleteWithWorkspaceEditAction, WorkspaceEditAction } from 'sprotty-vscode-protocol/lib/lsp/editing';
import { Range, TextEdit, WorkspaceEdit } from 'vscode-languageserver-protocol';
import { getRange, getURI, isTraceable, Traceable } from "./traceable";

@injectable()
export class DeleteWithWorkspaceEditCommand extends Command {
    static readonly KIND = DeleteWithWorkspaceEditAction.KIND;

    @inject(TYPES.IActionDispatcher) actionDispatcher: IActionDispatcher;

    constructor(@inject(TYPES.Action) readonly action: DeleteWithWorkspaceEditAction) {
        super();
    }

    createWorkspaceEdit(context: CommandExecutionContext): WorkspaceEdit {
        const elements = new Set<SModelElement & Traceable>();
        const index = context.root.index;
        index.all().forEach(e => {
            if (e && this.shouldDelete(e))
                elements.add(e);
            else if (e instanceof SEdge && isTraceable(e)) {
                const source = index.getById(e.sourceId);
                const target = index.getById(e.targetId);
                if (this.shouldDeleteParent(source)
                    || this.shouldDeleteParent(target))
                    elements.add(e);
            }
        });
        const uri2ranges: Map<string, Range[]> = new Map();
        elements.forEach(element => {
            const uri = getURI(element).toString(true);
            const range = getRange(element);
            let ranges = uri2ranges.get(uri);
            if (!ranges) {
                ranges = [];
                uri2ranges.set(uri, ranges);
            }
            let mustAdd = true;
            for (let i = 0; i < ranges.length; ++i) {
                const r = ranges[i];
                if (this.containsRange(r, range)) {
                    mustAdd = false;
                    break;
                } else if (this.containsRange(range, r)) {
                    mustAdd = false;
                    ranges[i] = range;
                    break;
                }
            }
            if (mustAdd)
                ranges.push(range);
        });
        const changes = {};
        uri2ranges.forEach((ranges, uri) => {
            (changes as any)[uri] = ranges.map(range => {
                return <TextEdit> {
                    range,
                    newText: ''
                };
            });
        });
        const workspaceEdit: WorkspaceEdit = {
            changes
        };
        return workspaceEdit;
    }

    protected containsRange(range: Range, otherRange: Range): boolean {
        if (otherRange.start.line < range.start.line || otherRange.end.line < range.start.line) {
            return false;
        }
        if (otherRange.start.line > range.end.line || otherRange.end.line > range.end.line) {
            return false;
        }
        if (otherRange.start.line === range.start.line && otherRange.start.character < range.start.character) {
            return false;
        }
        if (otherRange.end.line === range.end.line && otherRange.end.character > range.end.character) {
            return false;
        }
        return true;
    }

    protected shouldDelete<T extends SModelElement>(e: T): e is (Traceable & Selectable & T) {
        return isSelectable(e) && e.selected && isTraceable(e);
    }

    protected shouldDeleteParent(source: SModelElement | undefined): boolean {
        while (source) {
            if (this.shouldDelete(source)) {
                return true;
            }
            source = (source instanceof SChildElement) ? source.parent : undefined;
        }
        return false;
    }

    execute(context: CommandExecutionContext): CommandReturn {
        this.actionDispatcher.dispatch(<WorkspaceEditAction> {
            kind: WorkspaceEditAction.KIND,
            workspaceEdit: this.createWorkspaceEdit(context)
        });
        return context.root;
    }

    undo(context: CommandExecutionContext): CommandReturn {
        return context.root;
    }

    redo(context: CommandExecutionContext): CommandReturn {
        return context.root;
    }
}

