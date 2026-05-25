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
exports.RetryQueue = exports.PayloadType = exports.RetryCategory = exports.QueueStatus = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
var QueueStatus;
(function (QueueStatus) {
    QueueStatus["PENDING"] = "pending";
    QueueStatus["PROCESSING"] = "processing";
    QueueStatus["SUCCESS"] = "success";
    QueueStatus["FAILED"] = "failed";
    QueueStatus["MANUAL"] = "manual";
    QueueStatus["CANCELLED"] = "cancelled";
})(QueueStatus || (exports.QueueStatus = QueueStatus = {}));
var RetryCategory;
(function (RetryCategory) {
    RetryCategory["NETWORK_ERROR"] = "network_error";
    RetryCategory["EXTERNAL_API_ERROR"] = "external_api_error";
    RetryCategory["DATA_VALIDATION_ERROR"] = "data_validation_error";
    RetryCategory["BUSINESS_RULE_ERROR"] = "business_rule_error";
    RetryCategory["SYSTEM_ERROR"] = "system_error";
    RetryCategory["UNKNOWN_ERROR"] = "unknown_error";
})(RetryCategory || (exports.RetryCategory = RetryCategory = {}));
var PayloadType;
(function (PayloadType) {
    PayloadType["BORROW_APPLICATION"] = "borrow_application";
    PayloadType["EXPRESS_ORDER"] = "express_order";
    PayloadType["COMPENSATION_RECORD"] = "compensation_record";
    PayloadType["FEE_CALCULATION"] = "fee_calculation";
    PayloadType["EXTERNAL_RECEIPT"] = "external_receipt";
})(PayloadType || (exports.PayloadType = PayloadType = {}));
let RetryQueue = class RetryQueue extends BaseEntity_1.BaseEntity {
};
exports.RetryQueue = RetryQueue;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RetryQueue.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: PayloadType
    }),
    __metadata("design:type", String)
], RetryQueue.prototype, "payloadType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], RetryQueue.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: QueueStatus,
        default: QueueStatus.PENDING
    }),
    __metadata("design:type", String)
], RetryQueue.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: RetryCategory,
        nullable: true
    }),
    __metadata("design:type", String)
], RetryQueue.prototype, "retryCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], RetryQueue.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 3 }),
    __metadata("design:type", Number)
], RetryQueue.prototype, "maxRetryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RetryQueue.prototype, "nextRetryTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 60 }),
    __metadata("design:type", Number)
], RetryQueue.prototype, "retryIntervalSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], RetryQueue.prototype, "errorDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RetryQueue.prototype, "lastProcessedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "externalReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], RetryQueue.prototype, "isFrozen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "frozenBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RetryQueue.prototype, "frozenAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "frozenReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "handler", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "manualOperator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], RetryQueue.prototype, "manualOperatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RetryQueue.prototype, "manualNote", void 0);
exports.RetryQueue = RetryQueue = __decorate([
    (0, typeorm_1.Entity)()
], RetryQueue);
