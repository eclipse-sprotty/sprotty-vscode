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
import { Container } from 'inversify';
import { TYPES, configureCommand, CreateElementCommand } from 'sprotty';
import { SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';

import { IRootPopupModelProvider } from '../../root-popup-model-provider';
import { CodeActionPopupPaletteProvider, PaletteMouseListener } from './code-action-popup-palette';
import { CodeActionProvider } from './code-action-provider';
import { EditDiagramLocker } from './edit-diagram-locker';
import { LanguageClientProxy } from './language-client-proxy';
import { SprottyStarter } from '../../sprotty-starter';
import { VscodeDiagramServer } from '../../vscode-diagram-server';
import { VscodeLspEditDiagramServer } from './vscode-lsp-edit-diagram-server';
import { DeleteWithWorkspaceEditCommand } from './delete-with-workspace-edit';

export abstract class SprottyLspEditStarter extends SprottyStarter {
    protected addVscodeBindings(container: Container, diagramIdentifier: SprottyDiagramIdentifier) {
        super.addVscodeBindings(container, diagramIdentifier);
        container.rebind(VscodeDiagramServer).to(VscodeLspEditDiagramServer);
        container.bind(EditDiagramLocker).toSelf().inSingletonScope();
        container.rebind(TYPES.IDiagramLocker).toService(EditDiagramLocker);
        container.bind(LanguageClientProxy).toSelf().inSingletonScope();
        container.bind(CodeActionProvider).toSelf().inSingletonScope();
        container.bind(CodeActionPopupPaletteProvider).toSelf().inSingletonScope();
        container.bind(IRootPopupModelProvider).toService(CodeActionPopupPaletteProvider);
        container.bind(PaletteMouseListener).toSelf().inSingletonScope();
        container.rebind(TYPES.PopupMouseListener).to(PaletteMouseListener);
        configureCommand(container, CreateElementCommand);
        configureCommand(container, DeleteWithWorkspaceEditCommand);
    }
}
