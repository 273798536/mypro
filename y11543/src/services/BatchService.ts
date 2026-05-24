import { Repository, In } from 'typeorm';
import { Batch, BatchStatus, DuplicateStrategy, Material, MaterialStatus } from '../entities';
import { AppDataSource } from '../database/data-source';
import { auditLogService } from './AuditLogService';

export interface CreateBatchRequest {
  batchNo: string;
  name: string;
  operator?: string;
  description?: string;
  duplicateStrategy?: DuplicateStrategy;
}

export interface MaterialItem {
  materialId: string;
  name: string;
  platform?: string;
  originalMaterialId?: string;
}

export class BatchService {
  private repository: Repository<Batch>;
  private materialRepository: Repository<Material>;

  constructor() {
    this.repository = AppDataSource.getRepository(Batch);
    this.materialRepository = AppDataSource.getRepository(Material);
  }

  async create(request: CreateBatchRequest): Promise<Batch> {
    const existing = await this.repository.findOne({
      where: { batchNo: request.batchNo }
    });
    
    if (existing) {
      throw new Error(`批次号 ${request.batchNo} 已存在`);
    }

    const batch = this.repository.create({
      batchNo: request.batchNo,
      name: request.name,
      operator: request.operator,
      description: request.description,
      duplicateStrategy: request.duplicateStrategy || 'ignore',
      status: 'draft'
    });

    const saved = await this.repository.save(batch);
    
    await auditLogService.log('batch_created', {
      batchId: saved.id,
      operator: request.operator,
      newValue: JSON.stringify(request)
    });

    return saved;
  }

  async getById(id: string): Promise<Batch | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['materials', 'auditLogs']
    });
  }

  async getByBatchNo(batchNo: string): Promise<Batch | null> {
    return await this.repository.findOne({
      where: { batchNo },
      relations: ['materials']
    });
  }

  async list(): Promise<Batch[]> {
    return await this.repository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async addMaterials(
    batchId: string,
    materials: MaterialItem[],
    operator?: string
  ): Promise<{ added: Material[]; skipped: Material[]; duplicates: Material[] }> {
    const batch = await this.getById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    if (batch.frozen) {
      throw new Error('批次已冻结，无法添加素材');
    }

    const result: { added: Material[]; skipped: Material[]; duplicates: Material[] } = {
      added: [],
      skipped: [],
      duplicates: []
    };

    const existingMaterials = await this.materialRepository.find({
      where: {
        batchId,
        materialId: In(materials.map(m => m.materialId))
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
            Object.assign(existing, {
              name: item.name,
              platform: item.platform,
              originalMaterialId: item.originalMaterialId
            });
            const updated = await this.materialRepository.save(existing);
            result.added.push(updated);
            
            await auditLogService.log('material_updated', {
              batchId,
              materialId: item.materialId,
              operator,
              fieldName: 'material',
              oldValue: JSON.stringify(existing),
              newValue: JSON.stringify(item)
            });
            continue;
          case 'append':
            const duplicate = this.materialRepository.create({
              materialId: item.materialId,
              name: item.name,
              platform: item.platform,
              originalMaterialId: item.originalMaterialId,
              batchId,
              isDuplicate: true,
              status: 'pending'
            });
            const savedDup = await this.materialRepository.save(duplicate);
            result.duplicates.push(savedDup);
            result.added.push(savedDup);
            
            await auditLogService.log('material_added', {
              batchId,
              materialId: item.materialId,
              operator,
              newValue: JSON.stringify(item)
            });
            continue;
        }
      }

      const material = this.materialRepository.create({
        materialId: item.materialId,
        name: item.name,
        platform: item.platform,
        originalMaterialId: item.originalMaterialId,
        batchId,
        status: 'pending'
      });

      const saved = await this.materialRepository.save(material);
      result.added.push(saved);

      await auditLogService.log('material_added', {
        batchId,
        materialId: item.materialId,
        operator,
        newValue: JSON.stringify(item)
      });
    }

    await this.updateBatchStats(batchId);
    return result;
  }

  async submit(batchId: string, operator?: string): Promise<Batch> {
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

    await auditLogService.log('batch_submitted', {
      batchId,
      operator,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: 'submitted'
    });

    return saved;
  }

  async withdraw(batchId: string, operator?: string): Promise<Batch> {
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

    await auditLogService.log('batch_withdrawn', {
      batchId,
      operator,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: 'withdrawn'
    });

    return saved;
  }

  async resubmit(batchId: string, operator?: string): Promise<Batch> {
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

    await auditLogService.log('batch_submitted', {
      batchId,
      operator,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: 'submitted',
      reason: '撤回后重新提交'
    });

    return saved;
  }

  async freeze(batchId: string, operator?: string): Promise<Batch> {
    const batch = await this.getById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    if (batch.frozen) {
      throw new Error('批次已冻结');
    }

    batch.frozen = true;
    batch.frozenAt = new Date();
    batch.frozenBy = operator;
    const saved = await this.repository.save(batch);

    await auditLogService.log('batch_frozen', {
      batchId,
      operator,
      fieldName: 'frozen',
      oldValue: 'false',
      newValue: 'true'
    });

    return saved;
  }

  async unfreeze(batchId: string, operator?: string): Promise<Batch> {
    const batch = await this.getById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    if (!batch.frozen) {
      throw new Error('批次未冻结');
    }

    batch.frozen = false;
    batch.frozenAt = null as any;
    batch.frozenBy = null as any;
    const saved = await this.repository.save(batch);

    await auditLogService.log('batch_unfrozen', {
      batchId,
      operator,
      fieldName: 'frozen',
      oldValue: 'true',
      newValue: 'false'
    });

    return saved;
  }

  async updateBatchStats(batchId: string): Promise<void> {
    const materials = await this.materialRepository.find({ where: { batchId } });
    
    const successCount = materials.filter(m => 
      m.status === 'approved' || m.status === 'manual_override'
    ).length;
    
    const failedCount = materials.filter(m => 
      m.status === 'rejected' || m.status === 'failed'
    ).length;

    await this.repository.update(batchId, {
      materialCount: materials.length,
      successCount,
      failedCount
    });
  }

  async updateStatus(batchId: string, status: BatchStatus, operator?: string): Promise<Batch> {
    const batch = await this.getById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    const oldStatus = batch.status;
    batch.status = status;
    const saved = await this.repository.save(batch);

    await auditLogService.log('batch_updated', {
      batchId,
      operator,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: status
    });

    return saved;
  }
}

export const batchService = new BatchService();
