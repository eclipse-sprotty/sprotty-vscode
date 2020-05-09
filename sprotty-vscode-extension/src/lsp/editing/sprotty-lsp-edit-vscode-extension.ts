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
import { SprottyLspVscodeExtension } from '../sprotty-lsp-vscode-extension';
import { Action } from 'sprotty-vscode-protocol';
import { DeleteWithWorkspaceEditAction } from 'sprotty-vscode-protocol/lib/lsp/editing';

export abstract class SprottyLspEditVscodeExtension extends SprottyLspVscodeExtension {
    protected registerCommands() {
        super.registerCommands();
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.delete', (...commandArgs: any) => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: DeleteWithWorkspaceEditAction.KIND
                    } as Action);
            }));
    }
}
