"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.now = exports.genId = exports.store = void 0;
exports.store = {
    wrongQuestions: [],
    judgments: [],
    notes: [],
    extrapolationAlerts: [],
    recalculationResults: [],
    auditLog: [],
};
const genId = (prefix) => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};
exports.genId = genId;
const now = () => new Date().toISOString();
exports.now = now;
//# sourceMappingURL=store.js.map