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
import { inject, optional } from 'inversify';
import {
    ActionHandlerRegistry,
    ActionMessage,
    DiagramServer,
    isActionMessage,
    SelectCommand,
    ServerStatusAction,
    RequestPopupModelAction,
    SetPopupModelAction,
    Action,
} from 'sprotty';

import { VscodeDiagramWidgetFactory } from './vscode-diagram-widget';
import { vscodeApi } from './vscode-api';
import { IRootPopupModelProvider } from './root-popup-model-provider';

export class VscodeDiagramServer extends DiagramServer {

    @inject(VscodeDiagramWidgetFactory) diagramWidgetFactory: VscodeDiagramWidgetFactory;
    @inject(IRootPopupModelProvider)@optional() protected rootPopupModelProvider: IRootPopupModelProvider;

    initialize(registry: ActionHandlerRegistry) {
        super.initialize(registry);
        registry.register(SelectCommand.KIND, this);
        window.addEventListener('message', message => {
            if ('data' in message && isActionMessage(message.data)) {
                this.messageReceived(message.data);
            }
        });
    }

    protected sendMessage(message: ActionMessage): void {
        vscodeApi.postMessage(message);
    }

    handleLocally(action: Action): boolean {
        if (action instanceof RequestPopupModelAction) {
            return this.handleRequestPopupModel(action);
        } else {
            return super.handleLocally(action);
        }
    }

    protected handleServerStateAction(status: ServerStatusAction): boolean {
        this.diagramWidgetFactory().setStatus(status);
        return false;
    }

    handleRequestPopupModel(action: RequestPopupModelAction): boolean {
        if (this.rootPopupModelProvider && action.elementId === this.currentRoot.id) {
            this.rootPopupModelProvider.getPopupModel(action, this.currentRoot).then(model => {
                if (model)
                    this.actionDispatcher.dispatch(new SetPopupModelAction(model));
            });
            return false;
        } else {
            return true;
        }
    }
}
