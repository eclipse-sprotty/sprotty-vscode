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

/////////////////////////////////////
// initial handshake

export interface WebviewReadyMessage {
    readyMessage: string
}

export function isWebviewReadyMessage(object: any): object is WebviewReadyMessage {
    return object !== undefined && object.hasOwnProperty('readyMessage');
}

export const SprottyDiagramIdentifier = Symbol('SprottyDiagramIdentifier');

export interface SprottyDiagramIdentifier {
    clientId: string,
    diagramType: string,
    uri: string
}

export function isDiagramIdentifier(object: any): object is SprottyDiagramIdentifier {
    return object !== undefined && object.hasOwnProperty('clientId') && object.hasOwnProperty('diagramType') && object.hasOwnProperty('uri');
}