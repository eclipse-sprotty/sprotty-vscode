/********************************************************************************
 * Copyright (c) 2022 TypeFox and others.
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

import { NotificationMessage, RequestMessage, ResponseMessage } from 'vscode-jsonrpc';
import { NotificationType, RequestType } from 'vscode-messenger-common';

/**
 * Notification sent via vscode-messenger to the language server.
 */
export const LspNotification: NotificationType<NotificationMessage> = { method: 'LspNotification' };

/**
 * Request sent via vscode-messenger to the language server.
 */
export const LspRequest: RequestType<RequestMessage, ResponseMessage> = { method: 'LspRequest' };
