import { Repository, In } from 'typeorm';
import { StoreHandover } from '../entities';
import { AppDataSource } from '../database/data-source';
import { auditLogService } from './AuditLogService';
import { batchService } from './BatchService';

export interface StoreHandoverInput {
  materialId: string;
  storeId: string;
  storeName: string;
  handoverDate: string;
  receiver?: string;
  handoverContent?: string;
}

export class StoreHandoverService {
  private repository: Repository<StoreHandover>;

  constructor() {
    this.repository = AppDataSource.getRepository(StoreHandover);
  }

  async addHandover(
    batchId: string,
    input: StoreHandoverInput,
    operator?: string
  ): Promise<StoreHandover> {
    const batch = await batchService.getById(batchId);
    if (!batch) {
      throw new Error('批次不存在');
    }

    if (batch.frozen) {
      throw new Error('批次已冻结，无法添加交接记录');
    }

    const handover = new StoreHandover();
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

    await auditLogService.log('store_handover_added', {
      batchId,
      materialId: input.materialId,
      operator,
      fieldName: 'storeHandover',
      newValue: JSON.stringify(input)
    });

    return saved;
  }

  async getByBatchId(batchId: string): Promise<StoreHandover[]> {
    return await this.repository.find({
      where: { batchId },
      order: { handoverDate: 'DESC', createdAt: 'DESC' }
    });
  }

  async getByMaterialId(materialId: string, batchId?: string): Promise<StoreHandover[]> {
    const where: any = { materialId };
    if (batchId) where.batchId = batchId;

    return await this.repository.find({
      where,
      order: { handoverDate: 'DESC', createdAt: 'DESC' }
    });
  }

  async getById(id: string): Promise<StoreHandover | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async confirmHandover(
    id: string,
    operator?: string
  ): Promise<StoreHandover> {
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

    await auditLogService.log('store_handover_confirmed', {
      batchId: handover.batchId,
      materialId: handover.materialId,
      operator,
      fieldName: 'storeHandover',
      oldValue: 'unconfirmed',
      newValue: 'confirmed'
    });

    return saved;
  }

  async getBatchHandoversSummary(batchId: string): Promise<any> {
    const handovers = await this.getByBatchId(batchId);
    const materials = await AppDataSource.getRepository('Material').find({
      where: { batchId }
    } as any);

    const materialMap = new Map(materials.map((m: any) => [m.materialId, m]));
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

export const storeHandoverService = new StoreHandoverService();
