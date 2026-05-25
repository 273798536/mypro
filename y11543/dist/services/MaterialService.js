"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materialService = exports.MaterialService = void 0;
const entities_1 = require("../entities");
const data_source_1 = require("../database/data-source");
const AuditLogService_1 = require("./AuditLogService");
const BatchService_1 = require("./BatchService");
class MaterialService {
    constructor() {
        this.materialRepository = data_source_1.AppDataSource.getRepository(entities_1.Material);
        this.auditRepository = data_source_1.AppDataSource.getRepository(entities_1.AuditResult);
        this.costRepository = data_source_1.AppDataSource.getRepository(entities_1.CostDaily);
        this.mappingRepository = data_source_1.AppDataSource.getRepository(entities_1.MaterialMapping);
        this.remarkRepository = data_source_1.AppDataSource.getRepository(entities_1.CustomerRemark);
    }
    async getById(id) {
        return await this.materialRepository.findOne({
            where: { id }
        });
    }
    async getByMaterialId(materialId, batchId) {
        const where = { materialId };
        if (batchId)
            where.batchId = batchId;
        return await this.materialRepository.find({
            where
        });
    }
    async addAuditResult(batchId, input, operator) {
        const materials = await this.getByMaterialId(input.materialId, batchId);
        if (materials.length === 0) {
            throw new Error(`素材 ${input.materialId} 在批次中不存在`);
        }
        const material = materials[0];
        const previousAudit = await this.auditRepository.findOne({
            where: { materialRecordId: material.id },
            order: { createdAt: 'DESC' }
        });
        const version = previousAudit ? (previousAudit.version || 1) + 1 : 1;
        const audit = new entities_1.AuditResult();
        audit.materialId = input.materialId;
        audit.status = input.status;
        audit.reason = input.reason || null;
        audit.auditor = input.auditor || operator || null;
        audit.isManual = input.isManual || false;
        audit.previousStatus = previousAudit ? previousAudit.status : null;
        audit.version = version;
        audit.materialRecordId = material.id;
        const result = await this.auditRepository.insert(audit);
        const saved = await this.auditRepository.findOneBy({ id: result.identifiers[0].id });
        if (!saved) {
            throw new Error('审核结果保存失败');
        }
        let newStatus = material.status;
        if (input.status === 'approved') {
            newStatus = 'approved';
        }
        else if (input.status === 'rejected') {
            newStatus = 'rejected';
        }
        else if (input.status === 'needs_review') {
            newStatus = 'auditing';
        }
        if (newStatus !== material.status) {
            const oldStatus = material.status;
            material.status = newStatus;
            material.completedAt = new Date();
            await this.materialRepository.save(material);
            await AuditLogService_1.auditLogService.log('audit_result_added', {
                batchId,
                materialId: input.materialId,
                operator,
                fieldName: 'status',
                oldValue: oldStatus,
                newValue: newStatus
            });
        }
        await BatchService_1.batchService.updateBatchStats(batchId);
        return saved;
    }
    async manualOverride(batchId, materialId, newStatus, reason, operator) {
        const materials = await this.getByMaterialId(materialId, batchId);
        if (materials.length === 0) {
            throw new Error(`素材 ${materialId} 在批次中不存在`);
        }
        const material = materials[0];
        const previousAudit = await this.auditRepository.findOne({
            where: { materialRecordId: material.id },
            order: { createdAt: 'DESC' }
        });
        const version = previousAudit ? (previousAudit.version || 1) + 1 : 1;
        const audit = new entities_1.AuditResult();
        audit.materialId = materialId;
        audit.status = newStatus;
        audit.reason = reason;
        audit.auditor = operator;
        audit.isManual = true;
        audit.previousStatus = previousAudit ? previousAudit.status : null;
        audit.version = version;
        audit.materialRecordId = material.id;
        const saved = await this.auditRepository.save(audit);
        const oldStatus = material.status;
        material.status = 'manual_override';
        material.completedAt = new Date();
        await this.materialRepository.save(material);
        await AuditLogService_1.auditLogService.log('manual_override', {
            batchId,
            materialId,
            operator,
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: 'manual_override',
            reason
        });
        await BatchService_1.batchService.updateBatchStats(batchId);
        return saved;
    }
    async addCostDaily(batchId, input, operator) {
        const materials = await this.getByMaterialId(input.materialId, batchId);
        if (materials.length === 0) {
            throw new Error(`素材 ${input.materialId} 在批次中不存在`);
        }
        const material = materials[0];
        const existing = await this.costRepository.findOne({
            where: {
                materialRecordId: material.id,
                reportDate: input.reportDate
            }
        });
        if (existing) {
            existing.cost = input.cost;
            existing.impressions = input.impressions || 0;
            existing.clicks = input.clicks || 0;
            existing.conversionValue = input.conversionValue || 0;
            existing.platform = input.platform || null;
            const saved = await this.costRepository.save(existing);
            await AuditLogService_1.auditLogService.log('cost_added', {
                batchId,
                materialId: input.materialId,
                operator,
                fieldName: `cost_${input.reportDate}`,
                oldValue: JSON.stringify(existing),
                newValue: JSON.stringify(input)
            });
            return saved;
        }
        const cost = new entities_1.CostDaily();
        cost.materialId = input.materialId;
        cost.reportDate = input.reportDate;
        cost.cost = input.cost;
        cost.impressions = input.impressions || 0;
        cost.clicks = input.clicks || 0;
        cost.conversionValue = input.conversionValue || 0;
        cost.platform = input.platform || null;
        cost.materialRecordId = material.id;
        const saved = await this.costRepository.save(cost);
        await AuditLogService_1.auditLogService.log('cost_added', {
            batchId,
            materialId: input.materialId,
            operator,
            newValue: JSON.stringify(input)
        });
        return saved;
    }
    async addMapping(batchId, materialId, input, operator) {
        const materials = await this.getByMaterialId(materialId, batchId);
        if (materials.length === 0) {
            throw new Error(`素材 ${materialId} 在批次中不存在`);
        }
        const material = materials[0];
        const mapping = new entities_1.MaterialMapping();
        mapping.canonicalMaterialId = input.canonicalMaterialId;
        mapping.platformMaterialId = input.platformMaterialId;
        mapping.platform = input.platform;
        mapping.platformMaterialName = input.platformMaterialName || null;
        mapping.mappingReason = input.mappingReason || null;
        mapping.materialRecordId = material.id;
        const saved = await this.mappingRepository.save(mapping);
        await AuditLogService_1.auditLogService.log('mapping_created', {
            batchId,
            materialId,
            operator,
            newValue: JSON.stringify(input)
        });
        return saved;
    }
    async addRemark(batchId, input, operator) {
        const materials = await this.getByMaterialId(input.materialId, batchId);
        if (materials.length === 0) {
            throw new Error(`素材 ${input.materialId} 在批次中不存在`);
        }
        const material = materials[0];
        const remark = new entities_1.CustomerRemark();
        remark.materialId = input.materialId;
        remark.content = input.content;
        remark.operator = input.operator || operator || null;
        remark.source = input.source || null;
        remark.materialRecordId = material.id;
        const saved = await this.remarkRepository.save(remark);
        await AuditLogService_1.auditLogService.log('remark_added', {
            batchId,
            materialId: input.materialId,
            operator: input.operator || operator,
            newValue: input.content
        });
        return saved;
    }
    async reconcileCosts(materialId, batchId) {
        const materials = await this.getByMaterialId(materialId, batchId);
        const allCosts = [];
        for (const material of materials) {
            const costs = await this.costRepository.find({
                where: { materialRecordId: material.id }
            });
            allCosts.push(...costs);
        }
        const totalCost = allCosts.reduce((sum, c) => sum + Number(c.cost), 0);
        return { totalCost, records: allCosts };
    }
    async getMergedView(materialId, batchId) {
        const allMappings = await this.mappingRepository.find({
            where: { canonicalMaterialId: materialId }
        });
        const platformMaterialIds = allMappings.map(m => m.platformMaterialId);
        let allMaterials = [];
        if (batchId) {
            const mainMaterials = await this.materialRepository.find({
                where: { materialId, batchId }
            });
            allMaterials.push(...mainMaterials);
            const aliasMaterials = await this.materialRepository.find({
                where: { originalMaterialId: materialId, batchId }
            });
            allMaterials.push(...aliasMaterials);
            for (const pid of platformMaterialIds) {
                const mappedMaterials = await this.materialRepository.find({
                    where: { materialId: pid, batchId }
                });
                allMaterials.push(...mappedMaterials);
            }
        }
        else {
            const mainMaterials = await this.materialRepository.find({
                where: { materialId }
            });
            allMaterials.push(...mainMaterials);
            const aliasMaterials = await this.materialRepository.find({
                where: { originalMaterialId: materialId }
            });
            allMaterials.push(...aliasMaterials);
            for (const pid of platformMaterialIds) {
                const mappedMaterials = await this.materialRepository.find({
                    where: { materialId: pid }
                });
                allMaterials.push(...mappedMaterials);
            }
        }
        const seen = new Set();
        allMaterials = allMaterials.filter(m => {
            if (seen.has(m.id))
                return false;
            seen.add(m.id);
            return true;
        });
        const allCosts = [];
        const allAudits = [];
        const allRemarks = [];
        for (const material of allMaterials) {
            const costs = await this.costRepository.find({
                where: { materialRecordId: material.id }
            });
            allCosts.push(...costs);
            const audits = await this.auditRepository.find({
                where: { materialRecordId: material.id },
                order: { createdAt: 'DESC' }
            });
            allAudits.push(...audits);
            const remarks = await this.remarkRepository.find({
                where: { materialRecordId: material.id },
                order: { createdAt: 'DESC' }
            });
            allRemarks.push(...remarks);
        }
        const totalCost = allCosts.reduce((sum, c) => sum + Number(c.cost), 0);
        const totalImpressions = allCosts.reduce((sum, c) => sum + c.impressions, 0);
        const totalClicks = allCosts.reduce((sum, c) => sum + c.clicks, 0);
        return {
            materialId,
            aliases: allMaterials.map(m => ({
                materialId: m.materialId,
                name: m.name,
                platform: m.platform,
                batchId: m.batchId
            })),
            mappings: allMappings.map(m => ({
                platform: m.platform,
                platformMaterialId: m.platformMaterialId,
                platformMaterialName: m.platformMaterialName
            })),
            latestAudit: allAudits[0] || null,
            auditHistory: allAudits,
            totalCost,
            totalImpressions,
            totalClicks,
            costBreakdown: allCosts,
            remarks: allRemarks
        };
    }
}
exports.MaterialService = MaterialService;
exports.materialService = new MaterialService();
