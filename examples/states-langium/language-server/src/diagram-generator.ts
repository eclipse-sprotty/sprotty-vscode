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

import { GeneratorContext, LangiumDiagramGenerator } from 'langium-sprotty';
import { SEdge, SLabel, SModelRoot, SNode, SPort, EdgeLayoutable } from 'sprotty-protocol';
import { State, StateMachine, Transition } from './generated/ast.js';

export class StatesDiagramGenerator extends LangiumDiagramGenerator {

    protected generateRoot(args: GeneratorContext<StateMachine>): SModelRoot {
        const { document } = args;
        const sm = document.parseResult.value;
        const graph = {
            type: 'graph',
            id: sm.name ?? 'root',
            children: [
                ...sm.states.map(s => this.generateNode(s, args)),
                ...sm.states.flatMap(s => s.transitions).map(t => this.generateEdge(t, args))
            ]
        };
        this.traceProvider.trace(graph, sm);
        return graph;
    }

    protected generateNode(state: State, ctx: GeneratorContext<StateMachine>): SNode {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(state.name, state);
        const node = {
            type: 'node',
            id: nodeId,
            children: [
                <SLabel>{
                    type: 'label',
                    id: idCache.uniqueId(nodeId + '.label'),
                    text: state.name
                },
                <SPort>{
                    type: 'port',
                    id: idCache.uniqueId(nodeId + '.newTransition')
                }
            ],
            layout: 'stack',
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddingLeft: 10.0,
                paddingRight: 10.0
            }
        };
        this.traceProvider.trace(node, state);
        this.markerProvider.addDiagnosticMarker(node, state, ctx);
        return node;
    }

    protected generateEdge(transition: Transition, ctx: GeneratorContext<StateMachine>): SEdge {
        const { idCache } = ctx;
        const sourceId = idCache.getId(transition.$container);
        const targetId = idCache.getId(transition.state?.ref);
        const edgeId = idCache.uniqueId(`${sourceId}:${transition.event?.ref?.name}:${targetId}`, transition);
        const edge = {
            type: 'edge',
            id: edgeId,
            sourceId: sourceId!,
            targetId: targetId!,
            children: [
                <SLabel & EdgeLayoutable>{
                    type: 'label:xref',
                    id: idCache.uniqueId(edgeId + '.label'),
                    text: transition.event?.ref?.name,
                    edgePlacement:  {
                        position: 0.5,
                        offset: 4,
                        side: 'left',
                        rotate: true
                    }
                }
            ]
        };
        this.traceProvider.trace(edge, transition);
        this.markerProvider.addDiagnosticMarker(edge, transition, ctx);
        return edge;
    }

}
