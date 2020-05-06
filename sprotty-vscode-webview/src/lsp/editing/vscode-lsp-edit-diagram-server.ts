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
import {
    Action,
    ActionHandlerRegistry,
    EditLabelAction,
    getBasicType,
    getSubType,
    SModelElementSchema,
    SModelIndex,
} from 'sprotty';
import { LspLabelEditAction, WorkspaceEditAction } from 'sprotty-vscode-protocol/lib/lsp/editing';

import { VscodeDiagramServer } from '../../vscode-diagram-server';
import { getRange, getURI, isTraceable } from './traceable';

export class VscodeLspEditDiagramServer extends VscodeDiagramServer {

    initialize(registry: ActionHandlerRegistry) {
        super.initialize(registry);
        registry.register(EditLabelAction.KIND, this);
        registry.register(WorkspaceEditAction.KIND, this);
        registry.register("reconnect", this);
    }

    handleLocally(action: Action): boolean {
        if (action.kind === EditLabelAction.KIND) {
            const label = this.getElement((action as EditLabelAction).labelId);
            if (label && getBasicType(label) === 'label' && isTraceable(label)) {
                const editKind = (getSubType(label) === 'xref') ? 'xref' : 'name';
                this.forwardToServer(<LspLabelEditAction> {
                    kind: LspLabelEditAction.KIND,
                    initialText: (label as any).text,
                    location: {
                        uri: getURI(label).toString(),
                        range: getRange(label)
                    },
                    editKind
                });
                return false;
            }
        }
        return super.handleLocally(action);
    }

    protected getElement(elementId: string): SModelElementSchema | undefined {
        const index = new SModelIndex();
        index.add(this.currentRoot);
        return index.getById(elementId);
    }
}
