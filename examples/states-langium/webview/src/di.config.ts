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

import 'sprotty/css/sprotty.css';
import '../css/diagram.css';
import '../css/popup.css';

import { Container, ContainerModule } from 'inversify';
import {
    configureCommand, configureModelElement, ConsoleLogger, CreateElementCommand, HtmlRootImpl,
    HtmlRootView, LogLevel, ManhattanEdgeRouter, overrideViewerOptions, PreRenderedElementImpl,
    PreRenderedView, RectangularNodeView, SGraphView, SLabelView, SModelRootImpl,
    SRoutingHandleImpl, SRoutingHandleView, TYPES, loadDefaultModules, SGraphImpl, SLabelImpl,
    hoverFeedbackFeature, popupFeature, creatingOnDragFeature, editLabelFeature, labelEditUiModule,
    moveFeature, editFeature
} from 'sprotty';
import { CustomRouter } from './custom-edge-router';
import { CreateTransitionPort, StatesEdge, StatesNode } from './model';
import { PolylineArrowEdgeView, TriangleButtonView } from './views';

const statesDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
    rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
    rebind(ManhattanEdgeRouter).to(CustomRouter).inSingletonScope();

    const context = { bind, unbind, isBound, rebind };
    configureModelElement(context, 'graph', SGraphImpl, SGraphView, {
        enable: [hoverFeedbackFeature, popupFeature]
    });
    configureModelElement(context, 'node', StatesNode, RectangularNodeView, {
        disable: [moveFeature]
    });
    configureModelElement(context, 'label', SLabelImpl, SLabelView, {
        enable: [editLabelFeature]
    });
    configureModelElement(context, 'label:xref', SLabelImpl, SLabelView, {
        enable: [editLabelFeature]
    });
    configureModelElement(context, 'edge', StatesEdge, PolylineArrowEdgeView, {
        enable: [editFeature]
    });
    configureModelElement(context, 'html', HtmlRootImpl, HtmlRootView);
    configureModelElement(context, 'pre-rendered', PreRenderedElementImpl, PreRenderedView);
    configureModelElement(context, 'palette', SModelRootImpl, HtmlRootView);
    configureModelElement(context, 'routing-point', SRoutingHandleImpl, SRoutingHandleView);
    configureModelElement(context, 'volatile-routing-point', SRoutingHandleImpl, SRoutingHandleView);
    configureModelElement(context, 'port', CreateTransitionPort, TriangleButtonView, {
        enable: [popupFeature, creatingOnDragFeature]
    });

    configureCommand(context, CreateElementCommand);
});

export function createStateDiagramContainer(widgetId: string): Container {
    const container = new Container();
    loadDefaultModules(container, { exclude: [ labelEditUiModule ] });
    container.load(statesDiagramModule);
    overrideViewerOptions(container, {
        needsClientLayout: true,
        needsServerLayout: true,
        baseDiv: widgetId,
        hiddenDiv: widgetId + '_hidden'
    });
    return container;
}
