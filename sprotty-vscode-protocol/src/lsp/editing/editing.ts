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

import { Action } from "../../sprotty";
import { Location, WorkspaceEdit } from 'vscode-languageserver-protocol';

export namespace LspLabelEditAction {
    export const KIND = "languageLabelEdit";

    export function is(action: Action): action is LspLabelEditAction {
        return action.kind === KIND;
    }
}

export interface LspLabelEditAction extends Action {
    location: Location
    editKind: "xref" | "name"
    initialText: string
}

export namespace WorkspaceEditAction {
    export const KIND = "workspaceEdit";

    export function is(action: Action): action is WorkspaceEditAction {
        return action.kind === KIND;
    }
}

export interface WorkspaceEditAction extends Action {
    workspaceEdit: WorkspaceEdit
}

export namespace DeleteWithWorkspaceEditAction {
    export const KIND = 'deleteWithWorkspaceEdit';

    export function is(action: Action): action is DeleteWithWorkspaceEditAction {
        return action.kind === KIND;
    }
}

export interface DeleteWithWorkspaceEditAction extends Action {
}

