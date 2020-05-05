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

import { SModelElement, SModelExtension, MouseListener, Action, findParent, OpenAction, SModelElementSchema } from "sprotty";
import { Range } from "vscode-languageserver-protocol";
import { URI } from 'vscode-uri';

export interface Traceable extends SModelExtension {
    trace: string
}

export function isTraceable<T extends SModelElement | SModelElementSchema>(element: T): element is Traceable & T {
   return !!(element as any).trace && !!getRange((element as any).trace);
}

export function getRange(traceable: Traceable): Range;
export function getRange(trace: string): Range | undefined;
export function getRange(trace: object): Range | undefined;
export function getRange(thing: string | Traceable | object): Range | undefined {
    const trace = typeof thing === 'string'
        ? thing
        : (thing as any).trace;
    if (!trace)
        return undefined;
    const query = URI.parse(trace).query;
    const numbers = query.split(/[:-]/).map(s => parseInt(s, 10));
    if (numbers.length !== 4 || numbers.find(isNaN) !== undefined)
        return undefined;
    return <Range> {
        start: {
            line: numbers[0],
            character: numbers[1]
        },
        end: {
            line: numbers[2],
            character: numbers[3]
        }
    };
}

export function getURI(traceable: Traceable): URI {
    return URI.parse(traceable.trace).with({
        query: null,
        fragment: null
    });
}

export class TraceableMouseListener extends MouseListener {
    doubleClick(target: SModelElement, event: WheelEvent): (Action | Promise<Action>)[] {
        const traceable = findParent(target, (element) => isTraceable(element));
        if (traceable)
            return [ new OpenAction(traceable.id) ];
        else
            return [];
    }
}
