"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateMachine = exports.StateMachine = void 0;
const types_1 = require("../types");
const ALLOWED_TRANSITIONS = [
    { from: null, to: types_1.MaterialStatus.DRAFT, allowedRoles: ['operator', 'admin'] },
    { from: types_1.MaterialStatus.DRAFT, to: types_1.MaterialStatus.SUBMITTED, allowedRoles: ['operator', 'admin'] },
    { from: types_1.MaterialStatus.SUBMITTED, to: types_1.MaterialStatus.REJECTED, allowedRoles: ['reviewer', 'manager', 'admin'] },
    { from: types_1.MaterialStatus.SUBMITTED, to: types_1.MaterialStatus.SECONDARY_CONFIRMED, allowedRoles: ['reviewer', 'manager', 'admin'] },
    { from: types_1.MaterialStatus.REJECTED, to: types_1.MaterialStatus.DRAFT, allowedRoles: ['operator', 'admin'] },
    { from: types_1.MaterialStatus.REJECTED, to: types_1.MaterialStatus.SUBMITTED, allowedRoles: ['operator', 'admin'] },
    { from: types_1.MaterialStatus.SECONDARY_CONFIRMED, to: types_1.MaterialStatus.AUDIT_ONLY, allowedRoles: ['auditor', 'admin'] },
    { from: types_1.MaterialStatus.AUDIT_ONLY, to: types_1.MaterialStatus.EXPORTED, allowedRoles: ['auditor', 'admin'] },
    { from: types_1.MaterialStatus.SECONDARY_CONFIRMED, to: types_1.MaterialStatus.EXPORTED, allowedRoles: ['auditor', 'admin'] },
];
class StateMachine {
    canTransition(from, to, role) {
        return ALLOWED_TRANSITIONS.some(t => t.from === from && t.to === to && t.allowedRoles.includes(role));
    }
    getValidTransitions(currentStatus, role) {
        return ALLOWED_TRANSITIONS
            .filter(t => t.from === currentStatus && t.allowedRoles.includes(role))
            .map(t => t.to);
    }
    isTerminalStatus(status) {
        return status === types_1.MaterialStatus.EXPORTED;
    }
    validateTransition(from, to, role) {
        if (!this.canTransition(from, to, role)) {
            throw new Error(`Invalid state transition: ${from || 'null'} -> ${to} for role ${role}`);
        }
    }
}
exports.StateMachine = StateMachine;
exports.stateMachine = new StateMachine();
//# sourceMappingURL=stateMachine.js.map