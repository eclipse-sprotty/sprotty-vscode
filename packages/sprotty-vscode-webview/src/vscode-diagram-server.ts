/********************************************************************************
 * Copyright (c) 2018-2022 TypeFox and others.
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
    ActionHandlerRegistry, DiagramServerProxy, SelectCommand, ServerStatusAction
} from 'sprotty';
import { ActionMessage, RequestPopupModelAction, SetPopupModelAction, Action } from 'sprotty-protocol';
import { ActionNotification } from 'sprotty-vscode-protocol';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { Messenger } from 'vscode-messenger-webview';
import { VscodeDiagramWidgetFactory } from './vscode-diagram-widget';
import { IRootPopupModelProvider } from './root-popup-model-provider';
import { VsCodeMessenger } from './services';

export class VscodeDiagramServer extends DiagramServerProxy {

    @inject(VsCodeMessenger) messenger: Messenger;
    @inject(VscodeDiagramWidgetFactory) diagramWidgetFactory: VscodeDiagramWidgetFactory;
    @inject(IRootPopupModelProvider)@optional() protected rootPopupModelProvider: IRootPopupModelProvider;

    override initialize(registry: ActionHandlerRegistry) {
        super.initialize(registry);
        registry.register(SelectCommand.KIND, this);
        this.messenger.onNotification(ActionNotification, message => this.messageReceived(message));
    }

    protected sendMessage(message: ActionMessage): void {
        this.messenger.sendNotification(ActionNotification, HOST_EXTENSION, message);
    }

    override handleLocally(action: Action): boolean {
        if (action.kind === RequestPopupModelAction.KIND) {
            return this.handleRequestPopupModel(action as RequestPopupModelAction);
        } else {
            return super.handleLocally(action);
        }
    }

    protected override handleServerStateAction(status: ServerStatusAction): boolean {
        this.diagramWidgetFactory().setStatus(status);
        return false;
    }

    handleRequestPopupModel(action: RequestPopupModelAction): boolean {
        if (this.rootPopupModelProvider && action.elementId === this.currentRoot.id) {
            this.rootPopupModelProvider.getPopupModel(action, this.currentRoot).then(model => {
                if (model)
                    this.actionDispatcher.dispatch(SetPopupModelAction.create(model));
            });
            return false;
        } else {
            return true;
        }
    }
}
