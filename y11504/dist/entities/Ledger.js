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
exports.Ledger = void 0;
const typeorm_1 = require("typeorm");
const BaseEntity_1 = require("./BaseEntity");
const RepairOrder_1 = require("./RepairOrder");
const PartScan_1 = require("./PartScan");
const ReceiptPhoto_1 = require("./ReceiptPhoto");
const ExternalReceipt_1 = require("./ExternalReceipt");
const ChangeHistory_1 = require("./ChangeHistory");
const enums_1 = require("../types/enums");
let Ledger = class Ledger extends BaseEntity_1.BaseEntity {
    constructor() {
        super(...arguments);
        this.status = enums_1.LedgerStatus.DRAFT;
        this.dataQuality = enums_1.DataQuality.VALID;
        this.version = 1;
    }
};
exports.Ledger = Ledger;
__decorate([
    (0, typeorm_1.Column)({ name: 'ledger_no', unique: true }),
    __metadata("design:type", String)
], Ledger.prototype, "ledgerNo", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: enums_1.LedgerStatus,
        default: enums_1.LedgerStatus.DRAFT,
    }),
    __metadata("design:type", String)
], Ledger.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: enums_1.DataQuality,
        default: enums_1.DataQuality.VALID,
        name: 'data_quality',
    }),
    __metadata("design:type", String)
], Ledger.prototype, "dataQuality", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'repair_order_id', nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "repairOrderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => RepairOrder_1.RepairOrder, (order) => order.ledgers, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'repair_order_id' }),
    __metadata("design:type", RepairOrder_1.RepairOrder)
], Ledger.prototype, "repairOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'engineer_id', nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "engineerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'engineer_name', nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "engineerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'submit_time', nullable: true }),
    __metadata("design:type", Date)
], Ledger.prototype, "submitTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confirm_time', nullable: true }),
    __metadata("design:type", Date)
], Ledger.prototype, "confirmTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'audit_time', nullable: true }),
    __metadata("design:type", Date)
], Ledger.prototype, "auditTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reject_reason', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Ledger.prototype, "rejectReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reject_by', nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "rejectBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confirm_by', nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "confirmBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'audit_by', nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "auditBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'change_reason', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Ledger.prototype, "changeReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'version', default: 1 }),
    __metadata("design:type", Number)
], Ledger.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], Ledger.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'data_hash', nullable: true }),
    __metadata("design:type", String)
], Ledger.prototype, "dataHash", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PartScan_1.PartScan, (scan) => scan.ledger, { cascade: true }),
    __metadata("design:type", Array)
], Ledger.prototype, "partScans", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ReceiptPhoto_1.ReceiptPhoto, (photo) => photo.ledger, { cascade: true }),
    __metadata("design:type", Array)
], Ledger.prototype, "receiptPhotos", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ExternalReceipt_1.ExternalReceipt, (receipt) => receipt.ledger, { cascade: true }),
    __metadata("design:type", Array)
], Ledger.prototype, "externalReceipts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ChangeHistory_1.ChangeHistory, (history) => history.ledger, { cascade: true }),
    __metadata("design:type", Array)
], Ledger.prototype, "changeHistories", void 0);
exports.Ledger = Ledger = __decorate([
    (0, typeorm_1.Entity)('ledgers')
], Ledger);
//# sourceMappingURL=Ledger.js.map