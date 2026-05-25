"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchService = exports.BatchService = void 0;
const typeorm_1 = require("typeorm");
const entities_1 = require("../entities");
const data_source_1 = require("../database/data-source");
const AuditLogService_1 = require("./AuditLogService");
class BatchService {
    constructor() {
        this.repository = data_source_1.AppDataSource.getRepository(entities_1.Batch);
        this.materialRepository = data_source_1.AppDataSource.getRepository(entities_1.Material);
    }
    async create(request) {
        const existing = await this.repository.findOne({
            where: { batchNo: request.batchNo }
        });
        if (existing) {
            throw new Error(`批次号 ${request.batchNo} 已存在`);
        }
        const batch = new entities_1.Batch();
        batch.batchNo = request.batchNo;
        batch.name = request.name;
        batch.operator = request.operator || null;
        batch.description = request.description || null;
        batch.duplicateStrategy = request.duplicateStrategy || 'ignore';
        batch.status = 'draft';
        const saved = await this.repository.save(batch);
        await AuditLogService_1.auditLogService.log('batch_created', {
            batchId: saved.id,
            operator: request.operator,
            newValue: JSON.stringify(request)
        });
        return saved;
    }
    async getById(id) {
        return await this.repository.findOne({
            where: { id }
        });
    }
    async getByBatchNo(batchNo) {
        return await this.repository.findOne({
            where: { batchNo }
        });
    }
    async list() {
        return await this.repository.find({
            order: { createdAt: 'DESC' }
        });
    }
    async addMaterials(batchId, materials, operator) {
        const batch = await this.getById(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        if (batch.frozen) {
            throw new Error('批次已冻结，无法添加素材');
        }
        const result = {
            added: [],
            skipped: [],
            duplicates: []
        };
        const existingMaterials = await this.materialRepository.find({
            where: {
                batchId,
                materialId: (0, typeorm_1.In)(materials.map(m => m.materialId))
            }
        });
        const existingMap = new Map(existingMaterials.map(m => [m.materialId, m]));
        for (const item of materials) {
            const existing = existingMap.get(item.materialId);
            if (existing) {
                switch (batch.duplicateStrategy) {
                    case 'ignore':
                        result.skipped.push(existing);
                        continue;
                    case 'overwrite':
                        existing.name = item.name;
                        existing.platform = item.platform || null;
                        existing.originalMaterialId = item.originalMaterialId || null;
                        const updated = await this.materialRepository.save(existing);
                        result.added.push(updated);
                        await AuditLogService_1.auditLogService.log('material_updated', {
                            batchId,
                            materialId: item.materialId,
                            operator,
                            fieldName: 'material',
                            oldValue: JSON.stringify(existing),
                            newValue: JSON.stringify(item)
                        });
                        continue;
                    case 'append':
                        const duplicate = new entities_1.Material();
                        duplicate.materialId = item.materialId;
                        duplicate.name = item.name;
                        duplicate.platform = item.platform || null;
                        duplicate.originalMaterialId = item.originalMaterialId || null;
                        duplicate.batchId = batchId;
                        duplicate.isDuplicate = true;
                        duplicate.status = 'pending';
                        const savedDup = await this.materialRepository.save(duplicate);
                        result.duplicates.push(savedDup);
                        result.added.push(savedDup);
                        await AuditLogService_1.auditLogService.log('material_added', {
                            batchId,
                            materialId: item.materialId,
                            operator,
                            newValue: JSON.stringify(item)
                        });
                        continue;
                }
            }
            const material = new entities_1.Material();
            material.materialId = item.materialId;
            material.name = item.name;
            material.platform = item.platform || null;
            material.originalMaterialId = item.originalMaterialId || null;
            material.batchId = batchId;
            material.status = 'pending';
            const saved = await this.materialRepository.save(material);
            result.added.push(saved);
            await AuditLogService_1.auditLogService.log('material_added', {
                batchId,
                materialId: item.materialId,
                operator,
                newValue: JSON.stringify(item)
            });
        }
        await this.updateBatchStats(batchId);
        return result;
    }
    async submit(batchId, operator) {
        const batch = await this.getById(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        if (batch.status !== 'draft') {
            throw new Error(`批次状态为 ${batch.status}，无法提交`);
        }
        if (batch.frozen) {
            throw new Error('批次已冻结，无法提交');
        }
        const oldStatus = batch.status;
        batch.status = 'submitted';
        const saved = await this.repository.save(batch);
        await AuditLogService_1.auditLogService.log('batch_submitted', {
            batchId,
            operator,
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: 'submitted'
        });
        return saved;
    }
    async withdraw(batchId, operator) {
        const batch = await this.getById(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        if (batch.status !== 'submitted' && batch.status !== 'processing') {
            throw new Error(`批次状态为 ${batch.status}，无法撤回`);
        }
        const oldStatus = batch.status;
        batch.status = 'withdrawn';
        const saved = await this.repository.save(batch);
        await AuditLogService_1.auditLogService.log('batch_withdrawn', {
            batchId,
            operator,
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: 'withdrawn'
        });
        return saved;
    }
    async resubmit(batchId, operator) {
        const batch = await this.getById(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        if (batch.status !== 'withdrawn') {
            throw new Error(`批次状态为 ${batch.status}，只能撤回后重新提交`);
        }
        if (batch.frozen) {
            throw new Error('批次已冻结，无法提交');
        }
        const oldStatus = batch.status;
        batch.status = 'submitted';
        const saved = await this.repository.save(batch);
        await AuditLogService_1.auditLogService.log('batch_submitted', {
            batchId,
            operator,
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: 'submitted',
            reason: '撤回后重新提交'
        });
        return saved;
    }
    async freeze(batchId, operator) {
        const batch = await this.getById(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        if (batch.frozen) {
            throw new Error('批次已冻结');
        }
        batch.frozen = true;
        batch.frozenAt = new Date();
        batch.frozenBy = operator || null;
        const saved = await this.repository.save(batch);
        await AuditLogService_1.auditLogService.log('batch_frozen', {
            batchId,
            operator,
            fieldName: 'frozen',
            oldValue: 'false',
            newValue: 'true'
        });
        return saved;
    }
    async unfreeze(batchId, operator) {
        const batch = await this.getById(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        if (!batch.frozen) {
            throw new Error('批次未冻结');
        }
        batch.frozen = false;
        batch.frozenAt = null;
        batch.frozenBy = null;
        const saved = await this.repository.save(batch);
        await AuditLogService_1.auditLogService.log('batch_unfrozen', {
            batchId,
            operator,
            fieldName: 'frozen',
            oldValue: 'true',
            newValue: 'false'
        });
        return saved;
    }
    async updateBatchStats(batchId) {
        const materials = await this.materialRepository.find({ where: { batchId } });
        const successCount = materials.filter(m => m.status === 'approved' || m.status === 'manual_override').length;
        const failedCount = materials.filter(m => m.status === 'rejected' || m.status === 'failed').length;
        await this.repository.update(batchId, {
            materialCount: materials.length,
            successCount,
            failedCount
        });
    }
    async updateStatus(batchId, status, operator) {
        const batch = await this.getById(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        const oldStatus = batch.status;
        batch.status = status;
        const saved = await this.repository.save(batch);
        await AuditLogService_1.auditLogService.log('batch_updated', {
            batchId,
            operator,
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: status
        });
        return saved;
    }
}
exports.BatchService = BatchService;
exports.batchService = new BatchService();
