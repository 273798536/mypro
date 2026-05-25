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
exports.Batch = void 0;
const typeorm_1 = require("typeorm");
const batch_status_enum_1 = require("../common/enums/batch-status.enum");
const repair_order_entity_1 = require("./repair-order.entity");
const spare_part_scan_entity_1 = require("./spare-part-scan.entity");
const customer_sign_photo_entity_1 = require("./customer-sign-photo.entity");
const scan_detail_entity_1 = require("./scan-detail.entity");
const dirty_record_entity_1 = require("./dirty-record.entity");
const user_entity_1 = require("./user.entity");
let Batch = class Batch {
};
exports.Batch = Batch;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Batch.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Batch.prototype, "batchNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Batch.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: batch_status_enum_1.BatchStatus,
        default: batch_status_enum_1.BatchStatus.DRAFT,
    }),
    __metadata("design:type", String)
], Batch.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], Batch.prototype, "statusBeforeFrozen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Batch.prototype, "freezeReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "totalRepairOrders", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "totalSparePartScans", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "totalCustomerSignPhotos", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "totalScanDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "totalDirtyRecords", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Batch.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Batch.prototype, "reviewOpinion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Batch.prototype, "manualReason", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", user_entity_1.User)
], Batch.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Batch.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Batch.prototype, "createdByName", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => repair_order_entity_1.RepairOrder, repairOrder => repairOrder.batch),
    __metadata("design:type", Array)
], Batch.prototype, "repairOrders", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => spare_part_scan_entity_1.SparePartScan, sparePartScan => sparePartScan.batch),
    __metadata("design:type", Array)
], Batch.prototype, "sparePartScans", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => customer_sign_photo_entity_1.CustomerSignPhoto, customerSignPhoto => customerSignPhoto.batch),
    __metadata("design:type", Array)
], Batch.prototype, "customerSignPhotos", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => scan_detail_entity_1.ScanDetail, scanDetail => scanDetail.batch),
    __metadata("design:type", Array)
], Batch.prototype, "scanDetails", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => dirty_record_entity_1.DirtyRecord, dirtyRecord => dirtyRecord.batch),
    __metadata("design:type", Array)
], Batch.prototype, "dirtyRecords", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Batch.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Batch.prototype, "updatedAt", void 0);
exports.Batch = Batch = __decorate([
    (0, typeorm_1.Entity)('batches')
], Batch);
//# sourceMappingURL=batch.entity.js.map