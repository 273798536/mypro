import { Repository, In } from 'typeorm';
import { Material, MaterialStatus, AuditResult, AuditStatus, CostDaily, MaterialMapping, CustomerRemark } from '../entities';
import { AppDataSource } from '../database/data-source';
import { auditLogService } from './AuditLogService';
import { batchService } from './BatchService';

export interface AuditResultInput {
  materialId: string;
  status: AuditStatus;
  reason?: string;
  auditor?: string;
  isManual?: boolean;
}

export interface CostDailyInput {
  materialId: string;
  reportDate: string;
  cost: number;
  impressions?: number;
  clicks?: number;
  conversionValue?: number;
  platform?: string;
}

export interface MaterialMappingInput {
  canonicalMaterialId: string;
  platformMaterialId: string;
  platform: string;
  platformMaterialName?: string;
  mappingReason?: string;
}

export interface RemarkInput {
  materialId: string;
  content: string;
  operator?: string;
  source?: string;
}

export class MaterialService {
  private materialRepository: Repository<Material>;
  private auditRepository: Repository<AuditResult>;
  private costRepository: Repository<CostDaily>;
  private mappingRepository: Repository<MaterialMapping>;
  private remarkRepository: Repository<CustomerRemark>;

  constructor() {
    this.materialRepository = AppDataSource.getRepository(Material);
    this.auditRepository = AppDataSource.getRepository(AuditResult);
    this.costRepository = AppDataSource.getRepository(CostDaily);
    this.mappingRepository = AppDataSource.getRepository(MaterialMapping);
    this.remarkRepository = AppDataSource.getRepository(CustomerRemark);
  }

  async getById(id: string): Promise<Material | null> {
    return await this.materialRepository.findOne({
      where: { id }
    });
  }

  async getByMaterialId(materialId: string, batchId?: string): Promise<Material[]> {
    const where: any = { materialId };
    if (batchId) where.batchId = batchId;
    
    return await this.materialRepository.find({
      where
    });
  }

  async addAuditResult(
    batchId: string,
    input: AuditResultInput,
    operator?: string
  ): Promise<AuditResult> {
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

    const audit = new AuditResult();
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

    let newStatus: MaterialStatus = material.status;
    if (input.status === 'approved') {
      newStatus = 'approved';
    } else if (input.status === 'rejected') {
      newStatus = 'rejected';
    } else if (input.status === 'needs_review') {
      newStatus = 'auditing';
    }

    if (newStatus !== material.status) {
      const oldStatus = material.status;
      material.status = newStatus;
      material.completedAt = new Date();
      await this.materialRepository.save(material);

      await auditLogService.log('audit_result_added', {
        batchId,
        materialId: input.materialId,
        operator,
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: newStatus
      });
    }

    await batchService.updateBatchStats(batchId);
    return saved;
  }

  async manualOverride(
    batchId: string,
    materialId: string,
    newStatus: AuditStatus,
    reason: string,
    operator: string
  ): Promise<AuditResult> {
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

    const audit = new AuditResult();
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

    await auditLogService.log('manual_override', {
      batchId,
      materialId,
      operator,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: 'manual_override',
      reason
    });

    await batchService.updateBatchStats(batchId);
    return saved;
  }

  async addCostDaily(
    batchId: string,
    input: CostDailyInput,
    operator?: string
  ): Promise<CostDaily> {
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
      
      await auditLogService.log('cost_added', {
        batchId,
        materialId: input.materialId,
        operator,
        fieldName: `cost_${input.reportDate}`,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(input)
      });
      
      return saved;
    }

    const cost = new CostDaily();
    cost.materialId = input.materialId;
    cost.reportDate = input.reportDate;
    cost.cost = input.cost;
    cost.impressions = input.impressions || 0;
    cost.clicks = input.clicks || 0;
    cost.conversionValue = input.conversionValue || 0;
    cost.platform = input.platform || null;
    cost.materialRecordId = material.id;

    const saved = await this.costRepository.save(cost);

    await auditLogService.log('cost_added', {
      batchId,
      materialId: input.materialId,
      operator,
      newValue: JSON.stringify(input)
    });

    return saved;
  }

  async addMapping(
    batchId: string,
    materialId: string,
    input: MaterialMappingInput,
    operator?: string
  ): Promise<MaterialMapping> {
    const materials = await this.getByMaterialId(materialId, batchId);
    if (materials.length === 0) {
      throw new Error(`素材 ${materialId} 在批次中不存在`);
    }

    const material = materials[0];

    const mapping = new MaterialMapping();
    mapping.canonicalMaterialId = input.canonicalMaterialId;
    mapping.platformMaterialId = input.platformMaterialId;
    mapping.platform = input.platform;
    mapping.platformMaterialName = input.platformMaterialName || null;
    mapping.mappingReason = input.mappingReason || null;
    mapping.materialRecordId = material.id;

    const saved = await this.mappingRepository.save(mapping);

    await auditLogService.log('mapping_created', {
      batchId,
      materialId,
      operator,
      newValue: JSON.stringify(input)
    });

    return saved;
  }

  async addRemark(
    batchId: string,
    input: RemarkInput,
    operator?: string
  ): Promise<CustomerRemark> {
    const materials = await this.getByMaterialId(input.materialId, batchId);
    if (materials.length === 0) {
      throw new Error(`素材 ${input.materialId} 在批次中不存在`);
    }

    const material = materials[0];

    const remark = new CustomerRemark();
    remark.materialId = input.materialId;
    remark.content = input.content;
    remark.operator = input.operator || operator || null;
    remark.source = input.source || null;
    remark.materialRecordId = material.id;

    const saved = await this.remarkRepository.save(remark);

    await auditLogService.log('remark_added', {
      batchId,
      materialId: input.materialId,
      operator: input.operator || operator,
      newValue: input.content
    });

    return saved;
  }

  async reconcileCosts(materialId: string, batchId?: string): Promise<{ totalCost: number; records: CostDaily[] }> {
    const materials = await this.getByMaterialId(materialId, batchId);
    const allCosts: CostDaily[] = [];

    for (const material of materials) {
      const costs = await this.costRepository.find({
        where: { materialRecordId: material.id }
      });
      allCosts.push(...costs);
    }

    const totalCost = allCosts.reduce((sum, c) => sum + Number(c.cost), 0);

    return { totalCost, records: allCosts };
  }

  async getMergedView(materialId: string, batchId?: string): Promise<any> {
    const materials = await this.getByMaterialId(materialId, batchId);
    const allMappings = await this.mappingRepository.find({
      where: { canonicalMaterialId: materialId }
    });

    const allCosts: CostDaily[] = [];
    const allAudits: AuditResult[] = [];
    const allRemarks: CustomerRemark[] = [];

    for (const material of materials) {
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
      aliases: materials.map(m => ({ name: m.name, platform: m.platform, batchId: m.batchId })),
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

export const materialService = new MaterialService();
