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
exports.BorrowApplication = exports.BorrowType = exports.BorrowStatus = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const ExpressOrder_1 = require("./ExpressOrder");
const CompensationRecord_1 = require("./CompensationRecord");
const SupervisorComment_1 = require("./SupervisorComment");
var BorrowStatus;
(function (BorrowStatus) {
    BorrowStatus["PENDING"] = "pending";
    BorrowStatus["SUBMITTED"] = "submitted";
    BorrowStatus["PROCESSING"] = "processing";
    BorrowStatus["SHIPPED"] = "shipped";
    BorrowStatus["RECEIVED"] = "received";
    BorrowStatus["RETURNED"] = "returned";
    BorrowStatus["COMPLETED"] = "completed";
    BorrowStatus["CANCELLED"] = "cancelled";
    BorrowStatus["WITHDRAWN"] = "withdrawn";
    BorrowStatus["FAILED"] = "failed";
})(BorrowStatus || (exports.BorrowStatus = BorrowStatus = {}));
var BorrowType;
(function (BorrowType) {
    BorrowType["INTER_LIBRARY"] = "inter_library";
    BorrowType["DOCUMENT_DELIVERY"] = "document_delivery";
})(BorrowType || (exports.BorrowType = BorrowType = {}));
let BorrowApplication = class BorrowApplication extends BaseEntity_1.BaseEntity {
};
exports.BorrowApplication = BorrowApplication;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], BorrowApplication.prototype, "applicationNo", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BorrowApplication.prototype, "readerId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BorrowApplication.prototype, "readerName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BorrowApplication.prototype, "bookTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BorrowApplication.prototype, "isbn", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BorrowApplication.prototype, "sourceLibrary", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BorrowApplication.prototype, "targetLibrary", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: BorrowType,
        default: BorrowType.INTER_LIBRARY
    }),
    __metadata("design:type", String)
], BorrowApplication.prototype, "borrowType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: BorrowStatus,
        default: BorrowStatus.PENDING
    }),
    __metadata("design:type", String)
], BorrowApplication.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], BorrowApplication.prototype, "borrowDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], BorrowApplication.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], BorrowApplication.prototype, "returnDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], BorrowApplication.prototype, "renewalCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BorrowApplication.prototype, "isOverdue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BorrowApplication.prototype, "isDamaged", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BorrowApplication.prototype, "overdueFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BorrowApplication.prototype, "damageFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BorrowApplication.prototype, "shippingFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BorrowApplication.prototype, "totalFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BorrowApplication.prototype, "externalReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], BorrowApplication.prototype, "rawData", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BorrowApplication.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], BorrowApplication.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ExpressOrder_1.ExpressOrder, order => order.application),
    __metadata("design:type", Array)
], BorrowApplication.prototype, "expressOrders", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CompensationRecord_1.CompensationRecord, record => record.application),
    __metadata("design:type", Array)
], BorrowApplication.prototype, "compensationRecords", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SupervisorComment_1.SupervisorComment, comment => comment.application),
    __metadata("design:type", Array)
], BorrowApplication.prototype, "supervisorComments", void 0);
exports.BorrowApplication = BorrowApplication = __decorate([
    (0, typeorm_1.Entity)()
], BorrowApplication);
