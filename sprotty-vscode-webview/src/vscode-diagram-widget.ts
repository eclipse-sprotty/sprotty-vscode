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
import { inject, injectable, postConstruct } from 'inversify';
import {
    DiagramServer, IActionDispatcher, ModelSource, RequestModelAction, ServerStatusAction,
    TYPES, ViewerOptions,
} from 'sprotty';
import { SprottyDiagramIdentifier } from 'sprotty-vscode-protocol';

export const VscodeDiagramWidgetFactory = Symbol('VscodeDiagramWidgetFactory');
export type VscodeDiagramWidgetFactory = () => VscodeDiagramWidget;

@injectable()
export abstract class VscodeDiagramWidget {

    protected statusIconDiv: HTMLDivElement;
    protected statusMessageDiv: HTMLDivElement;

    @inject(SprottyDiagramIdentifier) diagramIdentifier: SprottyDiagramIdentifier;
    @inject(TYPES.IActionDispatcher) actionDispatcher: IActionDispatcher;
    @inject(TYPES.ModelSource) modelSource: ModelSource;
    @inject(TYPES.ViewerOptions) viewerOptions: ViewerOptions;

    constructor() {}

    @postConstruct()
    initialize(): void {
        this.initializeHtml();
        this.initializeSprotty();
    }

    protected initializeHtml(): void {
        const containerDiv = document.getElementById(this.diagramIdentifier.clientId + '_container');
        if (containerDiv) {
            const svgContainer = document.createElement("div");
            svgContainer.id = this.viewerOptions.baseDiv;
            containerDiv.appendChild(svgContainer);

            const hiddenContainer = document.createElement("div");
            hiddenContainer.id = this.viewerOptions.hiddenDiv;
            document.body.appendChild(hiddenContainer);

            const statusDiv = document.createElement("div");
            statusDiv.setAttribute('class', 'sprotty-status');
            containerDiv.appendChild(statusDiv);

            this.statusIconDiv = document.createElement("div");
            statusDiv.appendChild(this.statusIconDiv);

            this.statusMessageDiv = document.createElement("div");
            this.statusMessageDiv.setAttribute('class', 'sprotty-status-message');
            statusDiv.appendChild(this.statusMessageDiv);
        }
    }

    protected initializeSprotty(): void {
        if (this.modelSource instanceof DiagramServer)
            this.modelSource.clientId = this.diagramIdentifier.clientId;
        this.requestModel();
    }

    async requestModel(): Promise<void> {
        try {
            const response = await this.actionDispatcher.request(RequestModelAction.create({
                sourceUri: this.diagramIdentifier.uri,
                diagramType: this.diagramIdentifier.diagramType
            }));
            await this.actionDispatcher.dispatch(response);
        } catch (err) {
            const status = new ServerStatusAction();
            status.message = err instanceof Error ? err.message : err.toString();
            status.severity = 'FATAL';
            this.setStatus(status);
        }
    }

    setStatus(status: ServerStatusAction): void {
        this.statusMessageDiv.textContent = status.message;
        this.removeClasses(this.statusMessageDiv, 1);
        this.statusMessageDiv.classList.add(status.severity.toLowerCase());
        this.removeClasses(this.statusIconDiv, 0);
        const classes = this.statusIconDiv.classList;
        classes.add(status.severity.toLowerCase());
        switch (status.severity) {
            case 'FATAL':
                classes.add('fa');
                classes.add('fa-times-circle');
                break;
            case 'ERROR':
                classes.add('fa');
                classes.add('fa-exclamation-circle');
                break;
            case 'WARNING':
                classes.add('fa');
                classes.add('fa-exclamation-circle');
                break;
            case 'INFO':
                classes.add('fa');
                classes.add('fa-info-circle');
                break;
        }
    }

    protected removeClasses(element: Element, keep: number): void {
        const classes = element.classList;
        while (classes.length > keep) {
            const item = classes.item(classes.length - 1);
            if (item)
                classes.remove(item);
        }
    }
}
