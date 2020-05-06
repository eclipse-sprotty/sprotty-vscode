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
import { inject, injectable } from 'inversify';
import {
    Action,
    HtmlRootSchema,
    IContextMenuItemProvider,
    MenuItem,
    Point,
    PopupHoverMouseListener,
    RequestPopupModelAction,
    SButton,
    SButtonSchema,
    SModelElement,
    SModelElementSchema,
    SModelRoot,
    SModelRootSchema,
    SetPopupModelAction,
    EMPTY_ROOT,
} from 'sprotty';
import { WorkspaceEditAction } from 'sprotty-vscode-protocol/lib/lsp/editing';
import { CodeAction, Range } from 'vscode-languageserver-protocol';

import { CodeActionProvider } from './code-action-provider';
import { EditDiagramLocker } from './edit-diagram-locker';
import { getRange } from './traceable';
import { IRootPopupModelProvider } from '../../root-popup-model-provider';

/**
 * A popup-palette based on code actions.
 */
@injectable()
export class CodeActionPopupPaletteProvider implements IRootPopupModelProvider {

    @inject(CodeActionProvider) codeActionProvider: CodeActionProvider;
    @inject(EditDiagramLocker) editDiagramLocker: EditDiagramLocker;

    async getPopupModel(action: RequestPopupModelAction, rootElement: SModelRootSchema): Promise<SModelElementSchema | undefined> {
        const range = getRange(rootElement);
        if (this.editDiagramLocker.allowEdit && range !== undefined) {
            const codeActions = await this.codeActionProvider.getCodeActions(range, 'sprotty.create');
            if (codeActions) {
                const buttons: PaletteButtonSchema[] = [];
                codeActions.forEach(codeAction => {
                    if (CodeAction.is(codeAction)) {
                        buttons.push(<PaletteButtonSchema>{
                            id: codeAction.title,
                            type: 'button:create',
                            codeActionKind: codeAction.kind,
                            range
                        });
                    }
                });
                return <HtmlRootSchema>{
                    id: "palette",
                    type: "palette",
                    classes: ['sprotty-palette'],
                    children: buttons,
                    canvasBounds: action.bounds
                };
            }
        }
        return undefined;
    }
}

export interface PaletteButtonSchema extends SButtonSchema {
    codeActionKind: string;
    range: Range;
}

export class PaletteButton extends SButton {
    codeActionKind: string;
    range: Range;
}

@injectable()
export class PaletteMouseListener extends PopupHoverMouseListener {

    @inject(CodeActionProvider) codeActionProvider: CodeActionProvider;

    mouseDown(target: SModelElement, event: MouseEvent): (Action | Promise<Action>)[] {
        if (target instanceof PaletteButton) {
            return [this.getWorkspaceEditAction(target)];
        }
        return [];
    }

    async getWorkspaceEditAction(target: PaletteButton): Promise<Action> {
        const codeActions = await this.codeActionProvider.getCodeActions(target.range, target.codeActionKind);
        if (codeActions) {
            for (const codeAction of codeActions) {
                if (CodeAction.is(codeAction) && codeAction.edit)
                    return <WorkspaceEditAction> {
                        kind: WorkspaceEditAction.KIND,
                        workspaceEdit: codeAction.edit
                    };
            }
        }
        return new SetPopupModelAction(EMPTY_ROOT);
    }
}

/**
 * A command-palette based on code actions.
 */
@injectable()
export class CodeActionContextMenuProvider implements IContextMenuItemProvider {

    @inject(CodeActionProvider) codeActionProvider: CodeActionProvider;
    @inject(EditDiagramLocker) editDiagramLocker: EditDiagramLocker;

    async getItems(root: Readonly<SModelRoot>, lastMousePosition?: Point | undefined): Promise<MenuItem[]> {
        const items: MenuItem[] = [];
        const range = getRange(root);
        if (this.editDiagramLocker.allowEdit && range !== undefined) {
            const codeActions = await this.codeActionProvider.getCodeActions(range, 'sprotty.create');
            if (codeActions) {
                codeActions.forEach(codeAction => {
                    if (CodeAction.is(codeAction) && codeAction.edit) {
                        items.push(<MenuItem> {
                            id: codeAction.title,
                            label: codeAction.title,
                            group: 'edit',
                            actions: [
                                <WorkspaceEditAction> {
                                    kind: WorkspaceEditAction.KIND,
                                    workspaceEdit: codeAction.edit
                                }
                            ]
                        });
                    }
                });
            }
        }
        return items;
    }
}
