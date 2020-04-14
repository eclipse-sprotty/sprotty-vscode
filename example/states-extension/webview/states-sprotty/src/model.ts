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
import { injectable } from 'inversify';
import {
    Action,
    CreateElementAction,
    CreatingOnDrag,
    creatingOnDragFeature,
    EdgePlacement,
    EditableLabel,
    editLabelFeature,
    hoverFeedbackFeature,
    ManhattanEdgeRouter,
    popupFeature,
    RectangularNode,
    RectangularPort,
    SChildElement,
    SEdge,
    SGraph,
    SGraphFactory,
    SLabel,
    SModelElementSchema,
    SParentElement,
    SRoutableElement,
} from 'sprotty';


@injectable()
export class StatesModelFactory extends SGraphFactory {

    protected initializeChild(child: SChildElement, schema: SModelElementSchema, parent?: SParentElement): SChildElement {
        super.initializeChild(child, schema, parent);
        if (child instanceof SEdge) {
            child.routerKind = ManhattanEdgeRouter.KIND;
            child.targetAnchorCorrection = Math.sqrt(5);
        } else if (child instanceof SLabel) {
            child.edgePlacement = <EdgePlacement> {
                rotate: true,
                position: 0.6
            };
        }
        return child;
    }
}

export class StatesDiagram extends SGraph {
    hasFeature(feature: symbol): boolean {
        return feature === hoverFeedbackFeature || feature === popupFeature || super.hasFeature(feature);
    }
}

export class StatesNode extends RectangularNode {
    canConnect(routable: SRoutableElement, role: string) {
        return true;
    }
}

export class CreateTransitionPort extends RectangularPort implements CreatingOnDrag {
    createAction(id: string): Action {
        return new CreateElementAction(this.root.id, <SModelElementSchema> {
            id, type: 'edge', sourceId: this.parent.id, targetId: this.id
        });
    }

    hasFeature(feature: symbol): boolean {
        return feature === popupFeature || feature === creatingOnDragFeature || super.hasFeature(feature);
    }
}

export class StatesLabel extends SLabel implements EditableLabel {
    hasFeature(feature: symbol): boolean {
        return feature === editLabelFeature || super.hasFeature(feature);
    }
}
