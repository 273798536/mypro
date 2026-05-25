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
exports.FailedRecord = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
let FailedRecord = class FailedRecord extends BaseEntity_1.BaseEntity {
    constructor() {
        super(...arguments);
        this.retryCount = 0;
        this.isResolved = false;
    }
};
exports.FailedRecord = FailedRecord;
__decorate([
    (0, typeorm_1.Column)({ name: 'record_type' }),
    __metadata("design:type", String)
], FailedRecord.prototype, "recordType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json' }),
    __metadata("design:type", Object)
], FailedRecord.prototype, "rawData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], FailedRecord.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], FailedRecord.prototype, "errorDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_system', nullable: true }),
    __metadata("design:type", String)
], FailedRecord.prototype, "sourceSystem", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'batch_id', nullable: true }),
    __metadata("design:type", String)
], FailedRecord.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_count', default: 0 }),
    __metadata("design:type", Number)
], FailedRecord.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_retry_at', nullable: true }),
    __metadata("design:type", Date)
], FailedRecord.prototype, "lastRetryAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_resolved', default: false }),
    __metadata("design:type", Boolean)
], FailedRecord.prototype, "isResolved", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolved_at', nullable: true }),
    __metadata("design:type", Date)
], FailedRecord.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolved_by', nullable: true }),
    __metadata("design:type", String)
], FailedRecord.prototype, "resolvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], FailedRecord.prototype, "metadata", void 0);
exports.FailedRecord = FailedRecord = __decorate([
    (0, typeorm_1.Entity)('failed_records')
], FailedRecord);
//# sourceMappingURL=FailedRecord.js.map