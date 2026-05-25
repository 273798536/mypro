import prisma from '../lib/prisma.js';
import type { DirtyDataType, DirtyDataStatus } from '../types/index.js';
import type { OrderData, IouData } from '../types/index.js';
import { toJson, fromJson } from '../utils/json.js';

export interface IDirtyDataDetector {
  shouldDetect(type: string): boolean;
  detect(material: any, relatedMaterials?: any[]): Promise<DirtyDataRecordInput[]>;
}

interface DirtyDataRecordInput {
  type: DirtyDataType;
  fieldName: string;
  originalValue: any;
  suggestedValue?: any;
}

export class MissingFieldDetector implements IDirtyDataDetector {
  shouldDetect(type: string): boolean {
    return ['ORDER', 'IOU', 'STATEMENT'].includes(type);
  }

  async detect(material: any): Promise<DirtyDataRecordInput[]> {
    const records: DirtyDataRecordInput[] = [];
    const data = material.parsedData as any;

    if (material.type === 'ORDER') {
      const requiredFields = ['orderNo', 'storeName', 'orderDate', 'items', 'totalAmount'];
      for (const field of requiredFields) {
        if (!data[field] || (Array.isArray(data[field]) && data[field].length === 0)) {
          records.push({
            type: 'MISSING_FIELD',
            fieldName: field,
            originalValue: data[field],
            suggestedValue: null,
          });
        }
      }
    }

    if (material.type === 'IOU') {
      const requiredFields = ['iouNo', 'storeName', 'signDate', 'items', 'totalAmount', 'signature'];
      for (const field of requiredFields) {
        if (!data[field]) {
          records.push({
            type: 'MISSING_FIELD',
            fieldName: field,
            originalValue: data[field],
            suggestedValue: null,
          });
        }
      }
    }

    return records;
  }
}

export class CrossDateDetector implements IDirtyDataDetector {
  shouldDetect(type: string): boolean {
    return type === 'IOU';
  }

  async detect(material: any, relatedMaterials: any[] = []): Promise<DirtyDataRecordInput[]> {
    const records: DirtyDataRecordInput[] = [];
    const iouData = material.parsedData as IouData;

    const orderMaterial = relatedMaterials.find(m => m.type === 'ORDER');
    if (orderMaterial) {
      const orderData = orderMaterial.parsedData as OrderData;
      const orderDate = new Date(orderData.orderDate);
      const signDate = new Date(iouData.signDate);
      const diffDays = Math.abs((signDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        records.push({
          type: 'CROSS_DATE',
          fieldName: 'date',
          originalValue: {
            orderDate: orderData.orderDate,
            signDate: iouData.signDate,
            diffDays,
          },
          suggestedValue: null,
        });
      }
    }

    return records;
  }
}

export class NameChangeDetector implements IDirtyDataDetector {
  shouldDetect(type: string): boolean {
    return true;
  }

  async detect(material: any, relatedMaterials: any[] = []): Promise<DirtyDataRecordInput[]> {
    const records: DirtyDataRecordInput[] = [];
    const data = material.parsedData as any;

    if (!data.items) return records;

    const itemNames = data.items.map((item: any) => item.productName);
    for (const related of relatedMaterials) {
      if (related.id === material.id) continue;
      const relatedData = related.parsedData as any;
      if (!relatedData.items) continue;

      for (let i = 0; i < Math.min(data.items.length, relatedData.items.length); i++) {
        const name1 = data.items[i].productName;
        const name2 = relatedData.items[i].productName;

        if (name1 !== name2 && !this.isAlias(name1, name2)) {
          records.push({
            type: 'NAME_CHANGE',
            fieldName: `items[${i}].productName`,
            originalValue: {
              [material.type]: name1,
              [related.type]: name2,
            },
            suggestedValue: this.suggestNormalizedName(name1, name2),
          });
        }
      }
    }

    return records;
  }

  private isAlias(name1: string, name2: string): boolean {
    const normalized1 = name1.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').toLowerCase();
    const normalized2 = name2.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').toLowerCase();
    return normalized1.includes(normalized2) || normalized2.includes(normalized1);
  }

  private suggestNormalizedName(name1: string, name2: string): string {
    return name2.length > name1.length ? name2 : name1;
  }
}

export class AmountConflictDetector implements IDirtyDataDetector {
  shouldDetect(type: string): boolean {
    return ['ORDER', 'IOU', 'STATEMENT'].includes(type);
  }

  async detect(material: any, relatedMaterials: any[] = []): Promise<DirtyDataRecordInput[]> {
    const records: DirtyDataRecordInput[] = [];
    const data = material.parsedData as any;

    const amounts: Record<string, number> = {};
    amounts[material.type] = data.totalAmount;

    for (const related of relatedMaterials) {
      if (related.id === material.id) continue;
      if (!['ORDER', 'IOU', 'STATEMENT'].includes(related.type)) continue;
      const relatedData = related.parsedData as any;
      amounts[related.type] = relatedData.totalAmount;
    }

    const amountValues = Object.values(amounts);
    const hasConflict = amountValues.length > 1 && !amountValues.every(v => Math.abs(v - amountValues[0]) < 0.01);

    if (hasConflict) {
      records.push({
        type: 'AMOUNT_CONFLICT',
        fieldName: 'totalAmount',
        originalValue: amounts,
        suggestedValue: Math.min(...amountValues),
      });
    }

    return records;
  }
}

export class QuantityConflictDetector implements IDirtyDataDetector {
  shouldDetect(type: string): boolean {
    return ['ORDER', 'IOU', 'STATEMENT'].includes(type);
  }

  async detect(material: any, relatedMaterials: any[] = []): Promise<DirtyDataRecordInput[]> {
    const records: DirtyDataRecordInput[] = [];
    const data = material.parsedData as any;

    if (!data.items) return records;

    for (const related of relatedMaterials) {
      if (related.id === material.id) continue;
      if (!['ORDER', 'IOU', 'STATEMENT'].includes(related.type)) continue;
      const relatedData = related.parsedData as any;
      if (!relatedData.items) continue;

      for (let i = 0; i < Math.min(data.items.length, relatedData.items.length); i++) {
        const qty1 = data.items[i].quantity;
        const qty2 = relatedData.items[i].quantity;

        if (qty1 !== qty2) {
          records.push({
            type: 'QUANTITY_CONFLICT',
            fieldName: `items[${i}].quantity`,
            originalValue: {
              [material.type]: qty1,
              [related.type]: qty2,
            },
            suggestedValue: Math.min(qty1, qty2),
          });
        }
      }
    }

    return records;
  }
}

export class DirtyDataService {
  private detectors: IDirtyDataDetector[] = [
    new MissingFieldDetector(),
    new CrossDateDetector(),
    new NameChangeDetector(),
    new AmountConflictDetector(),
    new QuantityConflictDetector(),
  ];

  async detectAndCreate(material: any, relatedMaterials: any[] = []) {
    const allRecords: DirtyDataRecordInput[] = [];

    const materialWithParsedData = {
      ...material,
      parsedData: fromJson(material.parsedData) || {},
    };

    const relatedWithParsedData = relatedMaterials.map(m => ({
      ...m,
      parsedData: fromJson(m.parsedData) || {},
    }));

    for (const detector of this.detectors) {
      if (detector.shouldDetect(material.type)) {
        const records = await detector.detect(materialWithParsedData, relatedWithParsedData);
        allRecords.push(...records);
      }
    }

    for (const record of allRecords) {
      await prisma.dirtyDataRecord.create({
        data: {
          materialId: material.id,
          type: record.type,
          fieldName: record.fieldName,
          originalValue: toJson(record.originalValue),
          suggestedValue: record.suggestedValue ? toJson(record.suggestedValue) : null,
          status: 'PENDING',
        },
      });
    }

    return allRecords;
  }

  async getDirtyDataList(status?: DirtyDataStatus, type?: DirtyDataType) {
    return prisma.dirtyDataRecord.findMany({
      where: {
        ...(status && { status }),
        ...(type && { type }),
      },
      include: {
        material: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async fixDirtyData(
    id: string,
    finalValue: any,
    fixNote: string,
    operatorId: string,
    operatorName: string,
  ) {
    const record = await prisma.dirtyDataRecord.findUnique({
      where: { id },
      include: { material: true },
    });

    if (!record) {
      throw new Error('Dirty data record not found');
    }

    await prisma.fixHistory.create({
      data: {
        dirtyDataId: id,
        beforeValue: record.originalValue,
        afterValue: toJson(finalValue),
        reason: fixNote,
        operatorId,
        operatorName,
      },
    });

    const material = record.material;
    const parsedData = fromJson(material.parsedData) || {};

    if (record.type === 'MISSING_FIELD') {
      const fieldName = record.fieldName;
      if (fieldName === 'items' && Array.isArray(finalValue)) {
        parsedData.items = finalValue;
        parsedData.totalAmount = finalValue.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      } else if (fieldName === 'totalAmount') {
        parsedData.totalAmount = Number(finalValue);
      } else {
        (parsedData as any)[fieldName] = finalValue;
      }
    } else if (record.type === 'AMOUNT_CONFLICT') {
      if (finalValue && typeof finalValue === 'object' && finalValue.amount !== undefined) {
        parsedData.totalAmount = Number(finalValue.amount);
      } else if (typeof finalValue === 'number') {
        parsedData.totalAmount = Number(finalValue);
      } else if (typeof finalValue === 'string') {
        parsedData.totalAmount = Number(finalValue);
      }
    } else if (record.type === 'QUANTITY_CONFLICT') {
      if (finalValue && typeof finalValue === 'object' && finalValue.quantity !== undefined) {
        const match = record.fieldName.match(/items\[(\d+)\]\.quantity/);
        if (match && parsedData.items) {
          const idx = Number(match[1]);
          parsedData.items[idx].quantity = Number(finalValue.quantity);
          parsedData.items[idx].amount = Number(parsedData.items[idx].quantity) * Number(parsedData.items[idx].price || 0);
          parsedData.totalAmount = parsedData.items.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
        }
      }
    } else if (record.type === 'NAME_CHANGE') {
      if (finalValue && typeof finalValue === 'object' && finalValue.productName !== undefined) {
        const match = record.fieldName.match(/items\[(\d+)\]\.productName/);
        if (match && parsedData.items) {
          const idx = Number(match[1]);
          parsedData.items[idx].productName = finalValue.productName;
        }
      }
    } else if (record.type === 'CROSS_DATE') {
      if (finalValue && typeof finalValue === 'string') {
        const match = record.fieldName;
        if (match === 'date') {
          parsedData.signDate = finalValue;
        }
      }
    }

    await prisma.material.update({
      where: { id: material.id },
      data: { parsedData: toJson(parsedData) },
    });

    const updatedRecord = await prisma.dirtyDataRecord.update({
      where: { id },
      data: {
        finalValue: toJson(finalValue),
        fixNote,
        status: 'FIXED',
        fixedAt: new Date(),
      },
    });

    if (material.chainId) {
      const chainMaterials = await prisma.material.findMany({
        where: { chainId: material.chainId, isLatest: true },
      });
      const newTotalAmount = chainMaterials.reduce((sum, m) => {
        const pd = fromJson(m.parsedData) || {};
        return sum + (pd.totalAmount || 0);
      }, 0);
      await prisma.chain.update({
        where: { id: material.chainId },
        data: {
          totalAmount: newTotalAmount,
          status: 'REVIEW_REQUIRED',
          summaryData: toJson({
            materialCount: chainMaterials.length,
            materialTypes: [...new Set(chainMaterials.map(m => m.type))],
            note: '脏数据修正后自动重新汇总',
          }),
        },
      });
    }

    return updatedRecord;
  }

  async ignoreDirtyData(
    id: string,
    fixNote: string,
    operatorId: string,
    operatorName: string,
  ) {
    const record = await prisma.dirtyDataRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new Error('Dirty data record not found');
    }

    await prisma.fixHistory.create({
      data: {
        dirtyDataId: id,
        beforeValue: record.originalValue,
        afterValue: record.originalValue,
        reason: fixNote,
        operatorId,
        operatorName,
      },
    });

    return prisma.dirtyDataRecord.update({
      where: { id },
      data: {
        finalValue: record.originalValue,
        fixNote,
        status: 'IGNORED',
        fixedAt: new Date(),
      },
    });
  }
}

export const dirtyDataService = new DirtyDataService();
