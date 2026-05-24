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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirtyRecordService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const dirty_record_entity_1 = require("../entities/dirty-record.entity");
const repair_order_entity_1 = require("../entities/repair-order.entity");
const spare_part_scan_entity_1 = require("../entities/spare-part-scan.entity");
const scan_detail_entity_1 = require("../entities/scan-detail.entity");
const batch_entity_1 = require("../entities/batch.entity");
const dirty_type_enum_1 = require("../common/enums/dirty-type.enum");
let DirtyRecordService = class DirtyRecordService {
    constructor(dirtyRecordRepository, repairOrderRepository, sparePartScanRepository, scanDetailRepository) {
        this.dirtyRecordRepository = dirtyRecordRepository;
        this.repairOrderRepository = repairOrderRepository;
        this.sparePartScanRepository = sparePartScanRepository;
        this.scanDetailRepository = scanDetailRepository;
    }
    async analyzeAndCreateDirtyRecords(batchId, queryRunner) {
        const manager = queryRunner?.manager || this.dirtyRecordRepository.manager;
        const repairOrders = await manager.find(repair_order_entity_1.RepairOrder, { where: { batchId } });
        for (const ro of repairOrders) {
            await this.analyzeRepairOrder(ro, batchId, manager);
        }
        const sparePartScans = await manager.find(spare_part_scan_entity_1.SparePartScan, { where: { batchId } });
        for (const sps of sparePartScans) {
            await this.analyzeSparePartScan(sps, batchId, manager);
        }
        const scanDetails = await manager.find(scan_detail_entity_1.ScanDetail, { where: { batchId } });
        for (const sd of scanDetails) {
            await this.analyzeScanDetail(sd, batchId, manager);
        }
        await this.checkCrossDay(batchId, manager);
        await this.checkNameChanged(batchId, manager);
        await this.checkConflicts(batchId, manager);
        const count = await manager.count(dirty_record_entity_1.DirtyRecord, { where: { batchId, isResolved: false } });
        const batch = await manager.findOne(batch_entity_1.Batch, { where: { id: batchId } });
        if (batch) {
            batch.totalDirtyRecords = count;
            await manager.save(batch);
        }
    }
    async analyzeRepairOrder(ro, batchId, manager) {
        const missingFields = [];
        if (!ro.orderNo)
            missingFields.push('orderNo');
        if (!ro.customerName)
            missingFields.push('customerName');
        if (!ro.repairDate)
            missingFields.push('repairDate');
        if (missingFields.length > 0) {
            await this.createDirtyRecord(batchId, 'repair_order', ro.id, dirty_type_enum_1.DirtyType.MISSING_FIELD, JSON.stringify(ro), missingFields, manager);
            ro.isDirty = true;
            await manager.save(ro);
        }
    }
    async analyzeSparePartScan(sps, batchId, manager) {
        const missingFields = [];
        if (!sps.scanNo)
            missingFields.push('scanNo');
        if (!sps.partCode)
            missingFields.push('partCode');
        if (!sps.partName)
            missingFields.push('partName');
        if (!sps.quantity)
            missingFields.push('quantity');
        if (!sps.unitPrice)
            missingFields.push('unitPrice');
        if (missingFields.length > 0) {
            await this.createDirtyRecord(batchId, 'spare_part_scan', sps.id, dirty_type_enum_1.DirtyType.MISSING_FIELD, JSON.stringify(sps), missingFields, manager);
            sps.isDirty = true;
            await manager.save(sps);
        }
    }
    async analyzeScanDetail(sd, batchId, manager) {
        const missingFields = [];
        if (!sd.detailNo)
            missingFields.push('detailNo');
        if (!sd.barcode)
            missingFields.push('barcode');
        if (missingFields.length > 0) {
            await this.createDirtyRecord(batchId, 'scan_detail', sd.id, dirty_type_enum_1.DirtyType.MISSING_FIELD, JSON.stringify(sd), missingFields, manager);
            sd.isDirty = true;
            await manager.save(sd);
        }
    }
    async checkCrossDay(batchId, manager) {
        const scanDetails = await manager.find(scan_detail_entity_1.ScanDetail, { where: { batchId } });
        if (scanDetails.length < 2)
            return;
        const dates = new Set(scanDetails
            .filter(sd => sd.scanTime)
            .map(sd => sd.scanTime.toISOString().slice(0, 10)));
        if (dates.size > 1) {
            await this.createDirtyRecord(batchId, 'scan_detail', 'cross_day_check', dirty_type_enum_1.DirtyType.CROSS_DAY, JSON.stringify({ dates: Array.from(dates) }), ['scanTime'], manager);
        }
    }
    async checkNameChanged(batchId, manager) {
        const sparePartScans = await manager.find(spare_part_scan_entity_1.SparePartScan, { where: { batchId } });
        const partMap = new Map();
        for (const sps of sparePartScans) {
            if (!partMap.has(sps.partCode)) {
                partMap.set(sps.partCode, new Set());
            }
            partMap.get(sps.partCode).add(sps.partName);
        }
        for (const [partCode, names] of partMap) {
            if (names.size > 1) {
                await this.createDirtyRecord(batchId, 'spare_part_scan', partCode, dirty_type_enum_1.DirtyType.NAME_CHANGED, JSON.stringify({ partCode, names: Array.from(names) }), ['partName'], manager);
            }
        }
    }
    async checkConflicts(batchId, manager) {
        const sparePartScans = await manager.find(spare_part_scan_entity_1.SparePartScan, { where: { batchId } });
        const scanDetails = await manager.find(scan_detail_entity_1.ScanDetail, { where: { batchId } });
        for (const sps of sparePartScans) {
            const relatedDetails = scanDetails.filter(sd => sd.partCode === sps.partCode);
            if (relatedDetails.length === 0)
                continue;
            const totalQty = relatedDetails.reduce((sum, sd) => sum + (sd.quantity || 0), 0);
            if (totalQty !== sps.quantity) {
                await this.createDirtyRecord(batchId, 'spare_part_scan', sps.id, dirty_type_enum_1.DirtyType.QUANTITY_CONFLICT, JSON.stringify({ spsQty: sps.quantity, detailsQty: totalQty }), ['quantity'], manager);
            }
            const totalAmount = relatedDetails.reduce((sum, sd) => sum + (sd.totalAmount || 0), 0);
            if (Math.abs(totalAmount - sps.totalAmount) > 0.01) {
                await this.createDirtyRecord(batchId, 'spare_part_scan', sps.id, dirty_type_enum_1.DirtyType.AMOUNT_CONFLICT, JSON.stringify({ spsAmount: sps.totalAmount, detailsAmount: totalAmount }), ['totalAmount'], manager);
            }
        }
    }
    async createDirtyRecord(batchId, sourceType, sourceId, dirtyType, originalContent, conflictFields, manager) {
        const existing = await manager.findOne(dirty_record_entity_1.DirtyRecord, {
            where: { batchId, sourceType, sourceId, dirtyType },
        });
        if (existing)
            return;
        const dirtyRecord = manager.create(dirty_record_entity_1.DirtyRecord, {
            batchId,
            sourceType,
            sourceId,
            dirtyType,
            originalContent,
            conflictFields,
        });
        await manager.save(dirtyRecord);
    }
    async findByBatchId(batchId) {
        return this.dirtyRecordRepository.find({
            where: { batchId },
            order: { createdAt: 'DESC' },
        });
    }
    async resolve(id, user, handlingOpinion, resolvedContent) {
        const dirtyRecord = await this.dirtyRecordRepository.findOne({ where: { id } });
        if (!dirtyRecord) {
            throw new common_1.NotFoundException('脏记录不存在');
        }
        dirtyRecord.isResolved = true;
        dirtyRecord.handlingOpinion = handlingOpinion;
        dirtyRecord.resolvedContent = resolvedContent;
        dirtyRecord.resolvedBy = user.name;
        dirtyRecord.resolvedAt = new Date();
        return this.dirtyRecordRepository.save(dirtyRecord);
    }
};
exports.DirtyRecordService = DirtyRecordService;
exports.DirtyRecordService = DirtyRecordService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(dirty_record_entity_1.DirtyRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(repair_order_entity_1.RepairOrder)),
    __param(2, (0, typeorm_1.InjectRepository)(spare_part_scan_entity_1.SparePartScan)),
    __param(3, (0, typeorm_1.InjectRepository)(scan_detail_entity_1.ScanDetail)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DirtyRecordService);
//# sourceMappingURL=dirty-record.service.js.map