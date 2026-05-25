"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationLog = exports.EntityType = exports.OperationType = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
var OperationType;
(function (OperationType) {
    OperationType["CREATE"] = "create";
    OperationType["UPDATE"] = "update";
    OperationType["DELETE"] = "delete";
    OperationType["SUBMIT"] = "submit";
    OperationType["WITHDRAW"] = "withdraw";
    OperationType["RETRY"] = "retry";
    OperationType["MANUAL_DECISION"] = "manual_decision";
    OperationType["FREEZE"] = "freeze";
    OperationType["UNFREEZE"] = "unfreeze";
    OperationType["CLOSE"] = "close";
    OperationType["COMPENSATE"] = "compensate";
    OperationType["EXPORT"] = "export";
    OperationType["IMPORT"] = "import";
    OperationType["STATUS_CHANGE"] = "status_change";
    OperationType["FEE_ADJUST"] = "fee_adjust";
})(OperationType || (exports.OperationType = OperationType = {}));
var EntityType;
(function (EntityType) {
    EntityType["BORROW_APPLICATION"] = "borrow_application";
    EntityType["EXPRESS_ORDER"] = "express_order";
    EntityType["COMPENSATION_RECORD"] = "compensation_record";
    EntityType["SUPERVISOR_COMMENT"] = "supervisor_comment";
    EntityType["RETRY_QUEUE"] = "retry_queue";
    EntityType["DEAD_LETTER"] = "dead_letter";
})(EntityType || (exports.EntityType = EntityType = {}));
let OperationLog = class OperationLog extends BaseEntity_1.BaseEntity {
};
exports.OperationLog = OperationLog;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OperationLog.prototype, "operationType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OperationLog.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OperationLog.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "entityNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], OperationLog.prototype, "beforeData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], OperationLog.prototype, "afterData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], OperationLog.prototype, "changes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "operatorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "operatorName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], OperationLog.prototype, "requestContext", void 0);
exports.OperationLog = OperationLog = __decorate([
    (0, typeorm_1.Entity)()
], OperationLog);
