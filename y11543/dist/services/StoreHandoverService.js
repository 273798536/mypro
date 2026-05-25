"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeHandoverService = exports.StoreHandoverService = void 0;
const entities_1 = require("../entities");
const data_source_1 = require("../database/data-source");
const AuditLogService_1 = require("./AuditLogService");
const BatchService_1 = require("./BatchService");
class StoreHandoverService {
    constructor() {
        this.repository = data_source_1.AppDataSource.getRepository(entities_1.StoreHandover);
    }
    async addHandover(batchId, input, operator) {
        const batch = await BatchService_1.batchService.getById(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        if (batch.frozen) {
            throw new Error('批次已冻结，无法添加交接记录');
        }
        const handover = new entities_1.StoreHandover();
        handover.batchId = batchId;
        handover.materialId = input.materialId;
        handover.storeId = input.storeId;
        handover.storeName = input.storeName;
        handover.handoverDate = input.handoverDate;
        handover.receiver = input.receiver || null;
        handover.handoverContent = input.handoverContent || null;
        handover.isConfirmed = false;
        handover.confirmedAt = null;
        const result = await this.repository.insert(handover);
        const saved = await this.repository.findOneBy({ id: result.identifiers[0].id });
        if (!saved) {
            throw new Error('交接记录保存失败');
        }
        await AuditLogService_1.auditLogService.log('store_handover_added', {
            batchId,
            materialId: input.materialId,
            operator,
            fieldName: 'storeHandover',
            newValue: JSON.stringify(input)
        });
        return saved;
    }
    async getByBatchId(batchId) {
        return await this.repository.find({
            where: { batchId },
            order: { handoverDate: 'DESC', createdAt: 'DESC' }
        });
    }
    async getByMaterialId(materialId, batchId) {
        const where = { materialId };
        if (batchId)
            where.batchId = batchId;
        return await this.repository.find({
            where,
            order: { handoverDate: 'DESC', createdAt: 'DESC' }
        });
    }
    async getById(id) {
        return await this.repository.findOne({ where: { id } });
    }
    async confirmHandover(id, operator) {
        const handover = await this.getById(id);
        if (!handover) {
            throw new Error('交接记录不存在');
        }
        if (handover.isConfirmed) {
            throw new Error('交接记录已确认');
        }
        handover.isConfirmed = true;
        handover.confirmedAt = new Date();
        const saved = await this.repository.save(handover);
        await AuditLogService_1.auditLogService.log('store_handover_confirmed', {
            batchId: handover.batchId,
            materialId: handover.materialId,
            operator,
            fieldName: 'storeHandover',
            oldValue: 'unconfirmed',
            newValue: 'confirmed'
        });
        return saved;
    }
    async getBatchHandoversSummary(batchId) {
        const handovers = await this.getByBatchId(batchId);
        const materials = await data_source_1.AppDataSource.getRepository('Material').find({
            where: { batchId }
        });
        const materialMap = new Map(materials.map((m) => [m.materialId, m]));
        const confirmedCount = handovers.filter(h => h.isConfirmed).length;
        const details = handovers.map(h => {
            const material = materialMap.get(h.materialId);
            return {
                ...h,
                materialName: material?.name
            };
        });
        return {
            batchId,
            totalCount: handovers.length,
            confirmedCount,
            unconfirmedCount: handovers.length - confirmedCount,
            details
        };
    }
}
exports.StoreHandoverService = StoreHandoverService;
exports.storeHandoverService = new StoreHandoverService();
