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
exports.BatchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const batch_entity_1 = require("../entities/batch.entity");
const repair_order_entity_1 = require("../entities/repair-order.entity");
const spare_part_scan_entity_1 = require("../entities/spare-part-scan.entity");
const customer_sign_photo_entity_1 = require("../entities/customer-sign-photo.entity");
const scan_detail_entity_1 = require("../entities/scan-detail.entity");
const dirty_record_entity_1 = require("../entities/dirty-record.entity");
const state_machine_service_1 = require("../state-machine/state-machine.service");
const batch_status_enum_1 = require("../common/enums/batch-status.enum");
const dirty_record_service_1 = require("../dirty-record/dirty-record.service");
let BatchService = class BatchService {
    constructor(batchRepository, repairOrderRepository, sparePartScanRepository, customerSignPhotoRepository, scanDetailRepository, dirtyRecordRepository, stateMachineService, dirtyRecordService, dataSource) {
        this.batchRepository = batchRepository;
        this.repairOrderRepository = repairOrderRepository;
        this.sparePartScanRepository = sparePartScanRepository;
        this.customerSignPhotoRepository = customerSignPhotoRepository;
        this.scanDetailRepository = scanDetailRepository;
        this.dirtyRecordRepository = dirtyRecordRepository;
        this.stateMachineService = stateMachineService;
        this.dirtyRecordService = dirtyRecordService;
        this.dataSource = dataSource;
    }
    generateBatchNo() {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `BATCH${dateStr}${random}`;
    }
    async create(createBatchDto, user) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const batchNo = createBatchDto.batchNo || this.generateBatchNo();
            const existingBatch = await this.batchRepository.findOne({ where: { batchNo } });
            if (existingBatch) {
                throw new common_1.BadRequestException('批次号已存在');
            }
            const batch = this.batchRepository.create({
                batchNo,
                description: createBatchDto.description,
                createdById: user.id,
                createdByName: user.name,
            });
            const savedBatch = await queryRunner.manager.save(batch);
            if (createBatchDto.repairOrders?.length) {
                const repairOrders = createBatchDto.repairOrders.map(ro => this.repairOrderRepository.create({
                    ...ro,
                    batchId: savedBatch.id,
                }));
                await queryRunner.manager.save(repairOrders);
                savedBatch.totalRepairOrders = repairOrders.length;
            }
            if (createBatchDto.sparePartScans?.length) {
                const sparePartScansData = createBatchDto.sparePartScans;
                const sparePartScans = sparePartScansData.map(sps => this.sparePartScanRepository.create({
                    ...sps,
                    partType: sps.partType,
                    batchId: savedBatch.id,
                }));
                await queryRunner.manager.save(sparePartScans);
                savedBatch.totalSparePartScans = sparePartScans.length;
                savedBatch.totalAmount = sparePartScansData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
            }
            if (createBatchDto.customerSignPhotos?.length) {
                const customerSignPhotos = createBatchDto.customerSignPhotos.map(csp => this.customerSignPhotoRepository.create({
                    ...csp,
                    batchId: savedBatch.id,
                }));
                await queryRunner.manager.save(customerSignPhotos);
                savedBatch.totalCustomerSignPhotos = customerSignPhotos.length;
            }
            if (createBatchDto.scanDetails?.length) {
                const scanDetails = createBatchDto.scanDetails.map(sd => this.scanDetailRepository.create({
                    ...sd,
                    partType: sd.partType,
                    batchId: savedBatch.id,
                }));
                await queryRunner.manager.save(scanDetails);
                savedBatch.totalScanDetails = scanDetails.length;
            }
            await queryRunner.manager.save(savedBatch);
            await this.dirtyRecordService.analyzeAndCreateDirtyRecords(savedBatch.id, queryRunner);
            await queryRunner.commitTransaction();
            return this.findOne(savedBatch.id);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async findAll(user) {
        return this.batchRepository.find({
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const batch = await this.batchRepository.findOne({
            where: { id },
            relations: ['repairOrders', 'sparePartScans', 'customerSignPhotos', 'scanDetails', 'dirtyRecords'],
        });
        if (!batch) {
            throw new common_1.NotFoundException('批次不存在');
        }
        return batch;
    }
    async submitForReview(id, user) {
        const batch = await this.findOne(id);
        const unresolvedDirtyCount = await this.dirtyRecordRepository.count({
            where: { batchId: id, isResolved: false },
        });
        if (unresolvedDirtyCount > 0) {
            throw new common_1.BadRequestException(`存在 ${unresolvedDirtyCount} 条未处理的脏记录，请先处理后再提交`);
        }
        const updatedBatch = await this.stateMachineService.transition(batch, batch_status_enum_1.BatchStatus.PENDING_REVIEW, user, '提交复核');
        return this.batchRepository.save(updatedBatch);
    }
    async approve(id, user, opinion) {
        const batch = await this.findOne(id);
        batch.reviewOpinion = opinion;
        const updatedBatch = await this.stateMachineService.transition(batch, batch_status_enum_1.BatchStatus.APPROVED, user, opinion || '复核通过');
        return this.batchRepository.save(updatedBatch);
    }
    async reject(id, user, reason) {
        const batch = await this.findOne(id);
        batch.reviewOpinion = reason;
        const updatedBatch = await this.stateMachineService.transition(batch, batch_status_enum_1.BatchStatus.REJECTED, user, reason);
        return this.batchRepository.save(updatedBatch);
    }
    async freeze(id, user, reason) {
        const batch = await this.findOne(id);
        batch.statusBeforeFrozen = batch.status;
        batch.freezeReason = reason;
        batch.manualReason = reason;
        const updatedBatch = await this.stateMachineService.transition(batch, batch_status_enum_1.BatchStatus.FROZEN, user, reason);
        return this.batchRepository.save(updatedBatch);
    }
    async unfreeze(id, user, reason) {
        const batch = await this.findOne(id);
        const targetStatus = batch.statusBeforeFrozen || batch_status_enum_1.BatchStatus.APPROVED;
        const updatedBatch = await this.stateMachineService.transition(batch, targetStatus, user, reason);
        return this.batchRepository.save(updatedBatch);
    }
    async findScanDetails(batchId) {
        await this.findOne(batchId);
        return this.scanDetailRepository.find({ where: { batchId } });
    }
    async findRepairOrders(batchId) {
        await this.findOne(batchId);
        return this.repairOrderRepository.find({ where: { batchId } });
    }
    async findSparePartScans(batchId) {
        await this.findOne(batchId);
        return this.sparePartScanRepository.find({ where: { batchId } });
    }
    async findCustomerSignPhotos(batchId) {
        await this.findOne(batchId);
        return this.customerSignPhotoRepository.find({ where: { batchId } });
    }
    async settle(id, user) {
        const batch = await this.findOne(id);
        const updatedBatch = await this.stateMachineService.transition(batch, batch_status_enum_1.BatchStatus.SETTLED, user, '结算完成');
        return this.batchRepository.save(updatedBatch);
    }
    async cancel(id, user, reason) {
        const batch = await this.findOne(id);
        const updatedBatch = await this.stateMachineService.transition(batch, batch_status_enum_1.BatchStatus.CANCELLED, user, reason);
        return this.batchRepository.save(updatedBatch);
    }
    async archive(id, user) {
        const batch = await this.findOne(id);
        const updatedBatch = await this.stateMachineService.transition(batch, batch_status_enum_1.BatchStatus.ARCHIVED, user, '归档完成');
        return this.batchRepository.save(updatedBatch);
    }
    async updateTotals(batchId) {
        const batch = await this.findOne(batchId);
        batch.totalRepairOrders = await this.repairOrderRepository.count({ where: { batchId } });
        batch.totalSparePartScans = await this.sparePartScanRepository.count({ where: { batchId } });
        batch.totalCustomerSignPhotos = await this.customerSignPhotoRepository.count({ where: { batchId } });
        batch.totalScanDetails = await this.scanDetailRepository.count({ where: { batchId } });
        const scans = await this.sparePartScanRepository.find({ where: { batchId } });
        batch.totalAmount = scans.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
        await this.batchRepository.save(batch);
    }
};
exports.BatchService = BatchService;
exports.BatchService = BatchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(batch_entity_1.Batch)),
    __param(1, (0, typeorm_1.InjectRepository)(repair_order_entity_1.RepairOrder)),
    __param(2, (0, typeorm_1.InjectRepository)(spare_part_scan_entity_1.SparePartScan)),
    __param(3, (0, typeorm_1.InjectRepository)(customer_sign_photo_entity_1.CustomerSignPhoto)),
    __param(4, (0, typeorm_1.InjectRepository)(scan_detail_entity_1.ScanDetail)),
    __param(5, (0, typeorm_1.InjectRepository)(dirty_record_entity_1.DirtyRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        state_machine_service_1.StateMachineService,
        dirty_record_service_1.DirtyRecordService,
        typeorm_2.DataSource])
], BatchService);
//# sourceMappingURL=batch.service.js.map