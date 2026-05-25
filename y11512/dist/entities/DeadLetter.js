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
exports.DeadLetter = exports.DeadLetterStatus = exports.DeadLetterReason = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const RetryQueue_1 = require("./RetryQueue");
var DeadLetterReason;
(function (DeadLetterReason) {
    DeadLetterReason["MAX_RETRY_EXCEEDED"] = "max_retry_exceeded";
    DeadLetterReason["MANUAL_MOVE"] = "manual_move";
    DeadLetterReason["FATAL_ERROR"] = "fatal_error";
    DeadLetterReason["BUSINESS_REJECTED"] = "business_rejected";
})(DeadLetterReason || (exports.DeadLetterReason = DeadLetterReason = {}));
var DeadLetterStatus;
(function (DeadLetterStatus) {
    DeadLetterStatus["OPEN"] = "open";
    DeadLetterStatus["RESOLVED"] = "resolved";
    DeadLetterStatus["DISCARDED"] = "discarded";
    DeadLetterStatus["REQUEUED"] = "requeued";
})(DeadLetterStatus || (exports.DeadLetterStatus = DeadLetterStatus = {}));
let DeadLetter = class DeadLetter extends BaseEntity_1.BaseEntity {
};
exports.DeadLetter = DeadLetter;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], DeadLetter.prototype, "deadLetterId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DeadLetter.prototype, "originalTaskId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DeadLetter.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: RetryQueue_1.PayloadType
    }),
    __metadata("design:type", String)
], DeadLetter.prototype, "payloadType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], DeadLetter.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: DeadLetterReason
    }),
    __metadata("design:type", String)
], DeadLetter.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: RetryQueue_1.RetryCategory,
        nullable: true
    }),
    __metadata("design:type", String)
], DeadLetter.prototype, "retryCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: DeadLetterStatus,
        default: DeadLetterStatus.OPEN
    }),
    __metadata("design:type", String)
], DeadLetter.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeadLetter.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], DeadLetter.prototype, "errorDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], DeadLetter.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeadLetter.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], DeadLetter.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeadLetter.prototype, "resolutionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeadLetter.prototype, "requeuedTaskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], DeadLetter.prototype, "tags", void 0);
exports.DeadLetter = DeadLetter = __decorate([
    (0, typeorm_1.Entity)()
], DeadLetter);
