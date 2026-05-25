"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
const typeorm_1 = require("typeorm");
const Ledger_1 = require("../entities/Ledger");
const PartScan_1 = require("../entities/PartScan");
const ReceiptPhoto_1 = require("../entities/ReceiptPhoto");
const ExternalReceipt_1 = require("../entities/ExternalReceipt");
const RepairOrder_1 = require("../entities/RepairOrder");
const FailedRecord_1 = require("../entities/FailedRecord");
const enums_1 = require("../types/enums");
const hash_1 = require("../utils/hash");
const validation_1 = require("../utils/validation");
const ChangeHistoryService_1 = require("./ChangeHistoryService");
const FailedRecordService_1 = require("./FailedRecordService");
const diff_1 = require("../utils/diff");
class LedgerService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.repository = dataSource.getRepository(Ledger_1.Ledger);
        this.repairOrderRepository = dataSource.getRepository(RepairOrder_1.RepairOrder);
        this.changeHistoryService = new ChangeHistoryService_1.ChangeHistoryService(dataSource);
        this.failedRecordService = new FailedRecordService_1.FailedRecordService(dataSource);
    }
    async autoRecordFailedData(manager, rawData, errors, sourceType, operator) {
        try {
            const failedRecord = manager.create(FailedRecord_1.FailedRecord, {
                recordType: sourceType,
                rawData,
                errorMessage: errors.map(e => `${e.field}: ${e.message}`).join('; '),
                errorDetails: { errors },
                sourceSystem: 'ledger-auto-validate',
                createdBy: operator?.id,
                updatedBy: operator?.id,
            });
            await manager.save(failedRecord);
        }
        catch (e) {
        }
    }
    validatePartScans(partScans) {
        const valid = [];
        const invalid = [];
        partScans.forEach((scan, index) => {
            const result = (0, validation_1.validatePartScan)(scan);
            if (result.isValid) {
                valid.push(scan);
            }
            else {
                invalid.push({ data: scan, errors: [...result.errors, ...result.warnings] });
            }
        });
        return { valid, invalid };
    }
    validateReceiptPhotos(receiptPhotos) {
        const valid = [];
        const invalid = [];
        receiptPhotos.forEach((photo) => {
            const result = (0, validation_1.validateReceiptPhoto)(photo);
            if (result.isValid) {
                valid.push(photo);
            }
            else {
                invalid.push({ data: photo, errors: [...result.errors, ...result.warnings] });
            }
        });
        return { valid, invalid };
    }
    validateExternalReceipts(externalReceipts) {
        const valid = [];
        const invalid = [];
        externalReceipts.forEach((receipt) => {
            const result = (0, validation_1.validateExternalReceipt)(receipt);
            if (result.isValid) {
                valid.push(receipt);
            }
            else {
                invalid.push({ data: receipt, errors: [...result.errors, ...result.warnings] });
            }
        });
        return { valid, invalid };
    }
    async createDraft(dto, operator) {
        return this.dataSource.transaction(async (manager) => {
            const ledgerNo = (0, hash_1.generateLedgerNo)();
            const ledgerData = {
                ledgerNo,
                status: enums_1.LedgerStatus.DRAFT,
                repairOrderId: dto.repairOrderId,
                engineerId: dto.engineerId,
                engineerName: dto.engineerName,
                changeReason: dto.changeReason,
                metadata: dto.metadata,
                createdBy: operator.id,
                updatedBy: operator.id,
            };
            const validation = (0, validation_1.validateLedgerData)(ledgerData);
            ledgerData.dataQuality = validation.quality;
            let hasInvalidData = false;
            if (validation.quality === enums_1.DataQuality.INVALID) {
                hasInvalidData = true;
                await this.autoRecordFailedData(manager, ledgerData, validation.errors.map(e => ({ field: e.field, message: e.message })), 'ledger-base', operator);
            }
            const ledger = manager.create(Ledger_1.Ledger, ledgerData);
            if (dto.partScans && dto.partScans.length > 0) {
                const { valid, invalid } = this.validatePartScans(dto.partScans);
                if (invalid.length > 0) {
                    hasInvalidData = true;
                    for (const item of invalid) {
                        await this.autoRecordFailedData(manager, item.data, item.errors.map(e => ({ field: e.field, message: e.message })), 'part-scan', operator);
                    }
                }
                if (valid.length > 0) {
                    ledger.partScans = valid.map((scan) => manager.create(PartScan_1.PartScan, scan));
                }
            }
            if (dto.receiptPhotos && dto.receiptPhotos.length > 0) {
                const { valid, invalid } = this.validateReceiptPhotos(dto.receiptPhotos);
                if (invalid.length > 0) {
                    hasInvalidData = true;
                    for (const item of invalid) {
                        await this.autoRecordFailedData(manager, item.data, item.errors.map(e => ({ field: e.field, message: e.message })), 'receipt-photo', operator);
                    }
                }
                if (valid.length > 0) {
                    ledger.receiptPhotos = valid.map((photo) => manager.create(ReceiptPhoto_1.ReceiptPhoto, photo));
                }
            }
            if (dto.externalReceipts && dto.externalReceipts.length > 0) {
                const { valid, invalid } = this.validateExternalReceipts(dto.externalReceipts);
                if (invalid.length > 0) {
                    hasInvalidData = true;
                    for (const item of invalid) {
                        await this.autoRecordFailedData(manager, item.data, item.errors.map(e => ({ field: e.field, message: e.message })), 'external-receipt', operator);
                    }
                }
                if (valid.length > 0) {
                    ledger.externalReceipts = valid.map((receipt) => manager.create(ExternalReceipt_1.ExternalReceipt, receipt));
                }
            }
            if (hasInvalidData && ledgerData.dataQuality === enums_1.DataQuality.VALID) {
                ledger.dataQuality = enums_1.DataQuality.SUSPICIOUS;
            }
            const savedLedger = await manager.save(ledger);
            savedLedger.dataHash = (0, hash_1.generateLedgerHash)(savedLedger);
            await manager.save(savedLedger);
            await this.changeHistoryService.recordChange(savedLedger.id, enums_1.ChangeAction.CREATE, null, this.serializeLedger(savedLedger), {
                fromStatus: undefined,
                toStatus: enums_1.LedgerStatus.DRAFT,
                reason: dto.changeReason || '创建草稿',
                operatorId: operator.id,
                operatorName: operator.name,
                operatorRole: operator.role,
                version: 1,
                metadata: { hasInvalidData, dataQuality: savedLedger.dataQuality }
            });
            return savedLedger;
        });
    }
    async updateDraft(id, dto, operator) {
        return this.dataSource.transaction(async (manager) => {
            const ledger = await manager.findOne(Ledger_1.Ledger, {
                where: { id },
                relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
            });
            if (!ledger) {
                throw new Error('Ledger not found');
            }
            if (ledger.status !== enums_1.LedgerStatus.DRAFT && ledger.status !== enums_1.LedgerStatus.REJECTED) {
                throw new Error('Can only edit draft or rejected ledgers');
            }
            const beforeData = this.serializeLedger(ledger);
            if (dto.repairOrderId !== undefined)
                ledger.repairOrderId = dto.repairOrderId;
            if (dto.engineerId !== undefined)
                ledger.engineerId = dto.engineerId;
            if (dto.engineerName !== undefined)
                ledger.engineerName = dto.engineerName;
            if (dto.changeReason !== undefined)
                ledger.changeReason = dto.changeReason;
            if (dto.metadata !== undefined)
                ledger.metadata = dto.metadata;
            ledger.updatedBy = operator.id;
            ledger.version += 1;
            let hasInvalidData = false;
            if (dto.partScans !== undefined) {
                const { valid, invalid } = this.validatePartScans(dto.partScans);
                if (invalid.length > 0) {
                    hasInvalidData = true;
                    for (const item of invalid) {
                        await this.autoRecordFailedData(manager, item.data, item.errors.map(e => ({ field: e.field, message: e.message })), 'part-scan', operator);
                    }
                }
                await manager.delete(PartScan_1.PartScan, { ledgerId: ledger.id });
                if (valid.length > 0) {
                    ledger.partScans = valid.map((scan) => manager.create(PartScan_1.PartScan, { ...scan, ledgerId: ledger.id }));
                }
                else {
                    ledger.partScans = [];
                }
            }
            if (dto.receiptPhotos !== undefined) {
                const { valid, invalid } = this.validateReceiptPhotos(dto.receiptPhotos);
                if (invalid.length > 0) {
                    hasInvalidData = true;
                    for (const item of invalid) {
                        await this.autoRecordFailedData(manager, item.data, item.errors.map(e => ({ field: e.field, message: e.message })), 'receipt-photo', operator);
                    }
                }
                await manager.delete(ReceiptPhoto_1.ReceiptPhoto, { ledgerId: ledger.id });
                if (valid.length > 0) {
                    ledger.receiptPhotos = valid.map((photo) => manager.create(ReceiptPhoto_1.ReceiptPhoto, { ...photo, ledgerId: ledger.id }));
                }
                else {
                    ledger.receiptPhotos = [];
                }
            }
            if (dto.externalReceipts !== undefined) {
                const { valid, invalid } = this.validateExternalReceipts(dto.externalReceipts);
                if (invalid.length > 0) {
                    hasInvalidData = true;
                    for (const item of invalid) {
                        await this.autoRecordFailedData(manager, item.data, item.errors.map(e => ({ field: e.field, message: e.message })), 'external-receipt', operator);
                    }
                }
                await manager.delete(ExternalReceipt_1.ExternalReceipt, { ledgerId: ledger.id });
                if (valid.length > 0) {
                    ledger.externalReceipts = valid.map((receipt) => manager.create(ExternalReceipt_1.ExternalReceipt, { ...receipt, ledgerId: ledger.id }));
                }
                else {
                    ledger.externalReceipts = [];
                }
            }
            const validation = (0, validation_1.validateLedgerData)(this.serializeLedger(ledger));
            ledger.dataQuality = validation.quality;
            if (hasInvalidData && ledger.dataQuality === enums_1.DataQuality.VALID) {
                ledger.dataQuality = enums_1.DataQuality.SUSPICIOUS;
            }
            ledger.dataHash = (0, hash_1.generateLedgerHash)(ledger);
            const savedLedger = await manager.save(ledger);
            const afterData = this.serializeLedger(savedLedger);
            if ((0, diff_1.hasChanges)(beforeData, afterData)) {
                await this.changeHistoryService.recordChange(savedLedger.id, enums_1.ChangeAction.UPDATE, beforeData, afterData, {
                    fromStatus: ledger.status,
                    toStatus: ledger.status,
                    reason: dto.changeReason || '更新草稿',
                    operatorId: operator.id,
                    operatorName: operator.name,
                    operatorRole: operator.role,
                    version: savedLedger.version,
                    metadata: { hasInvalidData, dataQuality: savedLedger.dataQuality }
                });
            }
            return savedLedger;
        });
    }
    async submit(id, dto, operator) {
        return this.dataSource.transaction(async (manager) => {
            const ledger = await manager.findOne(Ledger_1.Ledger, {
                where: { id },
                relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
            });
            if (!ledger) {
                throw new Error('Ledger not found');
            }
            if (ledger.status !== enums_1.LedgerStatus.DRAFT && ledger.status !== enums_1.LedgerStatus.REJECTED) {
                throw new Error('Can only submit draft or rejected ledgers');
            }
            const validation = (0, validation_1.validateLedgerData)(this.serializeLedger(ledger));
            if (!validation.isValid) {
                throw new Error(`Data validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }
            const beforeData = this.serializeLedger(ledger);
            const fromStatus = ledger.status;
            ledger.status = enums_1.LedgerStatus.SUBMITTED;
            ledger.submitTime = new Date();
            ledger.dataQuality = validation.quality;
            ledger.updatedBy = operator.id;
            ledger.version += 1;
            ledger.dataHash = (0, hash_1.generateLedgerHash)(ledger);
            const savedLedger = await manager.save(ledger);
            const afterData = this.serializeLedger(savedLedger);
            await this.changeHistoryService.recordChange(savedLedger.id, enums_1.ChangeAction.SUBMIT, beforeData, afterData, {
                fromStatus,
                toStatus: enums_1.LedgerStatus.SUBMITTED,
                reason: dto.changeReason || '提交台账',
                operatorId: operator.id,
                operatorName: operator.name,
                operatorRole: operator.role,
                version: savedLedger.version,
            });
            return savedLedger;
        });
    }
    async reject(id, dto, operator) {
        return this.dataSource.transaction(async (manager) => {
            const ledger = await manager.findOne(Ledger_1.Ledger, {
                where: { id },
                relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
            });
            if (!ledger) {
                throw new Error('Ledger not found');
            }
            if (ledger.status !== enums_1.LedgerStatus.SUBMITTED) {
                throw new Error('Can only reject submitted ledgers');
            }
            const beforeData = this.serializeLedger(ledger);
            ledger.status = enums_1.LedgerStatus.REJECTED;
            ledger.rejectReason = dto.rejectReason;
            ledger.rejectBy = operator.id;
            ledger.updatedBy = operator.id;
            ledger.version += 1;
            ledger.dataHash = (0, hash_1.generateLedgerHash)(ledger);
            const savedLedger = await manager.save(ledger);
            const afterData = this.serializeLedger(savedLedger);
            await this.changeHistoryService.recordChange(savedLedger.id, enums_1.ChangeAction.REJECT, beforeData, afterData, {
                fromStatus: enums_1.LedgerStatus.SUBMITTED,
                toStatus: enums_1.LedgerStatus.REJECTED,
                reason: dto.changeReason || dto.rejectReason,
                operatorId: operator.id,
                operatorName: operator.name,
                operatorRole: operator.role,
                version: savedLedger.version,
            });
            return savedLedger;
        });
    }
    async confirm(id, dto, operator) {
        return this.dataSource.transaction(async (manager) => {
            const ledger = await manager.findOne(Ledger_1.Ledger, {
                where: { id },
                relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
            });
            if (!ledger) {
                throw new Error('Ledger not found');
            }
            if (ledger.status !== enums_1.LedgerStatus.SUBMITTED) {
                throw new Error('Can only confirm submitted ledgers');
            }
            const beforeData = this.serializeLedger(ledger);
            ledger.status = enums_1.LedgerStatus.CONFIRMED;
            ledger.confirmTime = new Date();
            ledger.confirmBy = operator.id;
            ledger.updatedBy = operator.id;
            ledger.version += 1;
            ledger.dataHash = (0, hash_1.generateLedgerHash)(ledger);
            const savedLedger = await manager.save(ledger);
            const afterData = this.serializeLedger(savedLedger);
            await this.changeHistoryService.recordChange(savedLedger.id, enums_1.ChangeAction.CONFIRM, beforeData, afterData, {
                fromStatus: enums_1.LedgerStatus.SUBMITTED,
                toStatus: enums_1.LedgerStatus.CONFIRMED,
                reason: dto.changeReason || '二次确认通过',
                operatorId: operator.id,
                operatorName: operator.name,
                operatorRole: operator.role,
                version: savedLedger.version,
            });
            return savedLedger;
        });
    }
    async audit(id, dto, operator) {
        return this.dataSource.transaction(async (manager) => {
            const ledger = await manager.findOne(Ledger_1.Ledger, {
                where: { id },
                relations: ['partScans', 'receiptPhotos', 'externalReceipts', 'changeHistories'],
            });
            if (!ledger) {
                throw new Error('Ledger not found');
            }
            if (ledger.status !== enums_1.LedgerStatus.CONFIRMED) {
                throw new Error('Can only audit confirmed ledgers');
            }
            const beforeData = this.serializeLedger(ledger);
            ledger.status = enums_1.LedgerStatus.AUDITED;
            ledger.auditTime = new Date();
            ledger.auditBy = operator.id;
            ledger.updatedBy = operator.id;
            ledger.version += 1;
            ledger.dataHash = (0, hash_1.generateLedgerHash)(ledger);
            const savedLedger = await manager.save(ledger);
            const afterData = this.serializeLedger(savedLedger);
            await this.changeHistoryService.recordChange(savedLedger.id, enums_1.ChangeAction.AUDIT, beforeData, afterData, {
                fromStatus: enums_1.LedgerStatus.CONFIRMED,
                toStatus: enums_1.LedgerStatus.AUDITED,
                reason: dto.changeReason || '审计完成',
                operatorId: operator.id,
                operatorName: operator.name,
                operatorRole: operator.role,
                version: savedLedger.version,
            });
            return savedLedger;
        });
    }
    async getById(id, options = {}) {
        const relations = options.includeRelations
            ? ['partScans', 'receiptPhotos', 'externalReceipts', 'changeHistories', 'repairOrder']
            : [];
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations,
        });
    }
    async getByLedgerNo(ledgerNo) {
        return this.repository.findOne({
            where: { ledgerNo, isDeleted: false },
            relations: ['partScans', 'receiptPhotos', 'externalReceipts', 'changeHistories'],
        });
    }
    async list(options = {}) {
        const page = options.page || 1;
        const pageSize = options.pageSize || 20;
        const skip = (page - 1) * pageSize;
        const where = { isDeleted: false };
        if (options.status)
            where.status = options.status;
        if (options.engineerId)
            where.engineerId = options.engineerId;
        if (options.repairOrderId)
            where.repairOrderId = options.repairOrderId;
        if (options.dataQuality)
            where.dataQuality = options.dataQuality;
        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate)
                where.createdAt.$gte = options.startDate;
            if (options.endDate)
                where.createdAt.$lte = options.endDate;
        }
        const [ledgers, total] = await this.repository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip,
            take: pageSize,
            relations: ['partScans', 'receiptPhotos'],
        });
        return {
            ledgers,
            total,
            page,
            pageSize,
        };
    }
    async getStatistics() {
        const total = await this.repository.count({
            where: {
                isDeleted: false,
                dataQuality: (0, typeorm_1.Not)(enums_1.DataQuality.INVALID)
            }
        });
        const validTotal = await this.repository.count({
            where: {
                isDeleted: false,
                dataQuality: enums_1.DataQuality.VALID
            }
        });
        const invalidTotal = await this.repository.count({
            where: {
                isDeleted: false,
                dataQuality: enums_1.DataQuality.INVALID
            }
        });
        const byStatus = {};
        const statusResults = await this.repository
            .createQueryBuilder('ledger')
            .select('ledger.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('ledger.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('ledger.data_quality != :invalidQuality', { invalidQuality: enums_1.DataQuality.INVALID })
            .groupBy('ledger.status')
            .getRawMany();
        for (const result of statusResults) {
            byStatus[result.status] = parseInt(result.count, 10);
        }
        const byQuality = {};
        const qualityResults = await this.repository
            .createQueryBuilder('ledger')
            .select('ledger.data_quality', 'quality')
            .addSelect('COUNT(*)', 'count')
            .where('ledger.isDeleted = :isDeleted', { isDeleted: false })
            .groupBy('ledger.data_quality')
            .getRawMany();
        for (const result of qualityResults) {
            byQuality[result.quality] = parseInt(result.count, 10);
        }
        return {
            total,
            validTotal,
            invalidTotal,
            byStatus: byStatus,
            byQuality: byQuality,
        };
    }
    async validateLedger(id) {
        const ledger = await this.getById(id, { includeRelations: true });
        if (!ledger) {
            throw new Error('Ledger not found');
        }
        return (0, validation_1.validateLedgerData)(this.serializeLedger(ledger));
    }
    serializeLedger(ledger) {
        return {
            id: ledger.id,
            ledgerNo: ledger.ledgerNo,
            status: ledger.status,
            dataQuality: ledger.dataQuality,
            repairOrderId: ledger.repairOrderId,
            engineerId: ledger.engineerId,
            engineerName: ledger.engineerName,
            submitTime: ledger.submitTime,
            confirmTime: ledger.confirmTime,
            auditTime: ledger.auditTime,
            rejectReason: ledger.rejectReason,
            rejectBy: ledger.rejectBy,
            confirmBy: ledger.confirmBy,
            auditBy: ledger.auditBy,
            changeReason: ledger.changeReason,
            version: ledger.version,
            metadata: ledger.metadata,
            partScans: ledger.partScans?.map((p) => ({
                id: p.id,
                partCode: p.partCode,
                partName: p.partName,
                partType: p.partType,
                quantity: p.quantity,
                batchNo: p.batchNo,
            })) || [],
            receiptPhotos: ledger.receiptPhotos?.map((p) => ({
                id: p.id,
                photoUrl: p.photoUrl,
                photoHash: p.photoHash,
                photoSize: p.photoSize,
                description: p.description,
            })) || [],
            externalReceipts: ledger.externalReceipts?.map((r) => ({
                id: r.id,
                receiptNo: r.receiptNo,
                source: r.source,
                sourceSystem: r.sourceSystem,
                receivedAt: r.receivedAt,
                sender: r.sender,
                content: r.content,
            })) || [],
        };
    }
}
exports.LedgerService = LedgerService;
//# sourceMappingURL=LedgerService.js.map