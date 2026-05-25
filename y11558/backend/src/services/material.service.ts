import prisma from '../lib/prisma.js';
import type { MaterialType, HandleMode } from '../types/index.js';
import { auditService } from './audit.service.js';
import { dirtyDataService } from './dirty-data.service.js';
import { toJson, fromJson } from '../utils/json.js';

export class MaterialService {
  private generateBatchKey(parsedData: any, type: MaterialType): string {
    let storeName = '';
    let date = '';
    let no = '';

    if (type === 'ORDER') {
      storeName = parsedData.storeName || '';
      date = parsedData.orderDate || '';
      no = parsedData.orderNo || '';
    } else if (type === 'IOU') {
      storeName = parsedData.storeName || '';
      date = parsedData.signDate || '';
      no = parsedData.iouNo || '';
    } else if (type === 'STATEMENT') {
      storeName = parsedData.supplierName || '';
      date = parsedData.statementDate || '';
      no = parsedData.statementNo || '';
    } else if (type === 'TRACK') {
      storeName = parsedData.truckNo || '';
      date = parsedData.startTime?.split('T')[0] || '';
      no = parsedData.trackNo || '';
    } else if (type === 'EMAIL') {
      storeName = parsedData.from || '';
      date = parsedData.date?.split('T')[0] || '';
      no = parsedData.emailId || '';
    }

    return `${type}:${storeName}:${date}:${no}`.replace(/\s+/g, '_');
  }

  async checkDuplicate(batchKey: string): Promise<{ exists: boolean; version: number }> {
    const existing = await prisma.material.findFirst({
      where: { batchKey, isLatest: true },
      orderBy: { version: 'desc' },
    });

    if (existing) {
      return { exists: true, version: existing.version };
    }
    return { exists: false, version: 0 };
  }

  async markOldVersions(batchKey: string) {
    await prisma.material.updateMany({
      where: { batchKey, isLatest: true },
      data: { isLatest: false },
    });
  }

  async importMaterial(
    type: MaterialType,
    rawContent: any,
    parsedData: any,
    sourceFile?: string,
    handleMode: HandleMode = 'IGNORE',
    operatorId: string = 'system',
    operatorName: string = '系统',
  ) {
    const batchKey = this.generateBatchKey(parsedData, type);
    const { exists, version: existingVersion } = await this.checkDuplicate(batchKey);

    let version = 1;
    let actualHandleMode: HandleMode | null = null;

    if (exists) {
      if (handleMode === 'IGNORE') {
        return {
          duplicate: true,
          handleMode: 'IGNORE',
          existingVersion,
        };
      }
      await this.markOldVersions(batchKey);
      version = existingVersion + 1;
      actualHandleMode = 'OVERWRITE';
    }

    const material = await prisma.material.create({
      data: {
        type,
        sourceFile,
        rawContent: toJson(rawContent),
        parsedData: toJson(parsedData),
        batchKey,
        version,
        isLatest: true,
        handleMode: actualHandleMode,
        createdBy: operatorId,
      },
    });

    const relatedMaterials = await prisma.material.findMany({
      where: {
        OR: [
          { parsedData: { contains: `"storeName":"${parsedData.storeName}"` } },
          { parsedData: { contains: `"supplierName":"${parsedData.supplierName}"` } },
        ],
        isLatest: true,
      },
    });

    await dirtyDataService.detectAndCreate(material, relatedMaterials);

    return {
      duplicate: false,
      material,
      version,
    };
  }

  async getMaterial(id: string) {
    return prisma.material.findUnique({
      where: { id },
      include: {
        dirtyDataRecords: true,
      },
    });
  }

  async getMaterials(params: {
    type?: MaterialType;
    storeName?: string;
    isLatest?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const { type, storeName, isLatest = true, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (type) where.type = type;
    if (isLatest !== undefined) where.isLatest = isLatest;

    if (storeName) {
      where.OR = [
        { parsedData: { contains: `"storeName":"${storeName}"` } },
        { parsedData: { contains: `"supplierName":"${storeName}"` } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.material.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateMaterial(id: string, parsedData: any, operatorId: string, operatorName: string) {
    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new Error('Material not found');
    }

    await prisma.material.update({
      where: { id },
      data: {
        parsedData: toJson(parsedData),
      },
    });

    await prisma.dirtyDataRecord.updateMany({
      where: { materialId: id, status: 'FIXED' },
      data: { status: 'PENDING' },
    });

    const relatedMaterials = await prisma.material.findMany({
      where: {
        chainId: material.chainId || undefined,
        isLatest: true,
      },
    });

    const updatedMaterial = await prisma.material.findUnique({ where: { id } });
    if (updatedMaterial) {
      await dirtyDataService.detectAndCreate(updatedMaterial, relatedMaterials);
    }

    return this.getMaterial(id);
  }
}

export const materialService = new MaterialService();
