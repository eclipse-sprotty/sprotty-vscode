/********************************************************************************
 * Copyright (c) 2021 TypeFox and others.
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

import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { addDiagramHandler, addDiagramSelectionHandler, addHoverPopupHandler, addTextSelectionHandler } from 'langium-sprotty';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';
import { createStatesServices } from './states-module.js';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the language services
const { shared, states } = createStatesServices({ connection, ...NodeFileSystem });

// Start the language server with the language-specific services
startLanguageServer(shared);
addDiagramHandler(connection, shared);

addDiagramSelectionHandler(states);
addTextSelectionHandler(states, { fitToScreen: 'none' });
addHoverPopupHandler(states);
