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
exports.CompensationRecord = exports.CompensationStatus = exports.CompensationType = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const BorrowApplication_1 = require("./BorrowApplication");
var CompensationType;
(function (CompensationType) {
    CompensationType["OVERDUE"] = "overdue";
    CompensationType["DAMAGE"] = "damage";
    CompensationType["LOST"] = "lost";
    CompensationType["OTHER"] = "other";
})(CompensationType || (exports.CompensationType = CompensationType = {}));
var CompensationStatus;
(function (CompensationStatus) {
    CompensationStatus["PENDING"] = "pending";
    CompensationStatus["CONFIRMED"] = "confirmed";
    CompensationStatus["PAID"] = "paid";
    CompensationStatus["WAIVED"] = "waived";
    CompensationStatus["CANCELLED"] = "cancelled";
})(CompensationStatus || (exports.CompensationStatus = CompensationStatus = {}));
let CompensationRecord = class CompensationRecord extends BaseEntity_1.BaseEntity {
};
exports.CompensationRecord = CompensationRecord;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], CompensationRecord.prototype, "recordNo", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CompensationRecord.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BorrowApplication_1.BorrowApplication, application => application.compensationRecords),
    (0, typeorm_1.JoinColumn)({ name: 'applicationId' }),
    __metadata("design:type", BorrowApplication_1.BorrowApplication)
], CompensationRecord.prototype, "application", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: CompensationType
    }),
    __metadata("design:type", String)
], CompensationRecord.prototype, "compensationType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: CompensationStatus,
        default: CompensationStatus.PENDING
    }),
    __metadata("design:type", String)
], CompensationRecord.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], CompensationRecord.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CompensationRecord.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CompensationRecord.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CompensationRecord.prototype, "evidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], CompensationRecord.prototype, "confirmTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], CompensationRecord.prototype, "paidTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CompensationRecord.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CompensationRecord.prototype, "paymentReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], CompensationRecord.prototype, "rawData", void 0);
exports.CompensationRecord = CompensationRecord = __decorate([
    (0, typeorm_1.Entity)()
], CompensationRecord);
