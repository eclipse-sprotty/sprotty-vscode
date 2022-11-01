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

import {
    CreateElementAction, CreatingOnDrag, EdgePlacement, ManhattanEdgeRouter, RectangularNode,
    RectangularPort, SEdge, SLabel, SRoutableElement
} from 'sprotty';
import { Action, SEdge as SEdgeSchema } from 'sprotty-protocol';

export class StatesEdge extends SEdge {
    override routerKind = ManhattanEdgeRouter.KIND;
    override targetAnchorCorrection = Math.sqrt(5);
}

export class StatesEdgeLabel extends SLabel {
    override edgePlacement = <EdgePlacement> {
        rotate: true,
        position: 0.6
    };
}

export class StatesNode extends RectangularNode {
    override canConnect(routable: SRoutableElement, role: string) {
        return true;
    }
}

export class CreateTransitionPort extends RectangularPort implements CreatingOnDrag {
    createAction(id: string): Action {
        const edge: SEdgeSchema = {
            id,
            type: 'edge',
            sourceId: this.parent.id,
            targetId: this.id
        };
        return CreateElementAction.create(edge, { containerId: this.root.id });
    }
}
