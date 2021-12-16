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

import { AstNode, DiagnosticInfo, MultiMap, ValidationAcceptor, ValidationCheck, ValidationRegistry } from 'langium';
import { StatesAstType, State, Transition, StateMachine } from './generated/ast';
import { StatesServices } from './states-module';

/**
 * Map AST node types to validation checks.
 */
type StatesChecks = { [type in StatesAstType]?: ValidationCheck | ValidationCheck[] }

/**
 * Registry for validation checks.
 */
export class StatesValidationRegistry extends ValidationRegistry {
    constructor(services: StatesServices) {
        super(services);
        const validator = services.validation.StatesValidator;
        const checks: StatesChecks = {
            State: validator.checkState,
            StateMachine: validator.checkUniqueNames
        };
        this.register(checks, validator);
    }
}

/**
 * Implementation of custom validations.
 */
export class StatesValidator {

    checkState(state: State, accept: ValidationAcceptor): void {
        const event2transition = new MultiMap<string, Transition>();
        for (const transition of state.transitions) {
            if (transition.event.ref?.name) {
                event2transition.add(transition.event.ref.name, transition);
            }
        }
        for (const name of event2transition.keys()) {
            const transitionsWithCommonName = event2transition.get(name);
            if (transitionsWithCommonName.length > 1) {
                for (const transition of transitionsWithCommonName) {
                    accept('error', `Multiple transitions on event ${name}`, { node: transition, property: 'event' })
                }
            }
        }
    }

    checkUniqueNames(sm: StateMachine, accept: ValidationAcceptor): void {
        this.genericUniqueCheck(sm.states, accept, 'states');
        this.genericUniqueCheck(sm.events, accept, 'events');
    }

    protected genericUniqueCheck<T extends AstNode & { name: string }>(nodes: T[], accept: ValidationAcceptor, what: string) {
        const name2node = new MultiMap<string, T>();
        for (const node of nodes) {
            if (node.name) {
                name2node.add(node.name, node);
            }
        }
        for (const name of name2node.keys()) {
            const nodesWithCommonName = name2node.get(name);
            if (nodesWithCommonName.length > 1) {
                for (const node of nodesWithCommonName) {
                    accept('error', `Multiple ${what} named '${name}'`, <DiagnosticInfo<T>>{ node: node, property: 'name' })
                }
            }
        }
    }

}
