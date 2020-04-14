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

import '../css/diagram.css';
import 'sprotty/css/sprotty.css';

import { Container, ContainerModule } from 'inversify';
import {
    boundsModule,
    buttonModule,
    configureCommand,
    configureModelElement,
    ConsoleLogger,
    CreateElementCommand,
    decorationModule,
    defaultModule,
    edgeLayoutModule,
    expandModule,
    exportModule,
    fadeModule,
    hoverModule,
    HtmlRoot,
    HtmlRootView,
    labelEditModule,
    LogLevel,
    ManhattanEdgeRouter,
    modelSourceModule,
    moveModule,
    openModule,
    overrideViewerOptions,
    PreRenderedElement,
    PreRenderedView,
    RectangularNodeView,
    routingModule,
    SEdge,
    selectModule,
    SGraphView,
    SLabelView,
    SModelRoot,
    SRoutingHandle,
    SRoutingHandleView,
    TYPES,
    undoRedoModule,
    updateModule,
    viewportModule,
    zorderModule,
    commandPaletteModule,
    edgeEditModule,
} from 'sprotty';

import { CustomRouter } from './custom-edge-router';
import { CreateTransitionPort, StatesDiagram, StatesLabel, StatesModelFactory, StatesNode } from './model';
import { PolylineArrowEdgeView, TriangleButtonView } from './views';

const statesDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
    rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
    rebind(TYPES.IModelFactory).to(StatesModelFactory);
    unbind(ManhattanEdgeRouter);
    bind(ManhattanEdgeRouter).to(CustomRouter).inSingletonScope();

    const context = { bind, unbind, isBound, rebind };
    configureModelElement(context, 'graph', StatesDiagram, SGraphView);
    configureModelElement(context, 'node', StatesNode, RectangularNodeView);
    configureModelElement(context, 'label', StatesLabel, SLabelView);
    configureModelElement(context, 'label:xref', StatesLabel, SLabelView);
    configureModelElement(context, 'edge', SEdge, PolylineArrowEdgeView);
    configureModelElement(context, 'html', HtmlRoot, HtmlRootView);
    configureModelElement(context, 'pre-rendered', PreRenderedElement, PreRenderedView);
    configureModelElement(context, 'palette', SModelRoot, HtmlRootView);
    configureModelElement(context, 'routing-point', SRoutingHandle, SRoutingHandleView);
    configureModelElement(context, 'volatile-routing-point', SRoutingHandle, SRoutingHandleView);
    configureModelElement(context, 'port', CreateTransitionPort, TriangleButtonView);

    configureCommand(context, CreateElementCommand);
});

export function createStateDiagramContainer(widgetId: string): Container {
    const container = new Container();
    container.load(defaultModule, selectModule, moveModule, boundsModule, undoRedoModule, viewportModule,
        hoverModule, fadeModule, exportModule, expandModule, openModule, buttonModule, modelSourceModule,
        decorationModule, updateModule, routingModule, zorderModule, edgeEditModule,
        edgeLayoutModule, labelEditModule, commandPaletteModule, statesDiagramModule);
    overrideViewerOptions(container, {
        needsClientLayout: true,
        needsServerLayout: true,
        baseDiv: widgetId,
        hiddenDiv: widgetId + '_hidden'
    });
    return container;
}
