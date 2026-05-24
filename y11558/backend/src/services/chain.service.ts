import prisma from '../lib/prisma.js';
import { auditService } from './audit.service.js';
import { toJson, fromJson, safeParse } from '../utils/json.js';

export class ChainService {
  generateChainNo(storeName: string, date: string): string {
    const dateStr = date.replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const storeCode = storeName.substring(0, 2).toUpperCase();
    return `CL-${storeCode}-${dateStr}-${random}`;
  }

  async generateChain(
    storeName: string,
    businessDate: string,
    materialIds: string[],
    operatorId: string,
    operatorName: string,
  ) {
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
    });

    if (materials.length === 0) {
      throw new Error('No materials found');
    }

    const totalAmount = materials.reduce((sum, m) => {
      const parsed = m.parsedData as any;
      return sum + (parsed.totalAmount || 0);
    }, 0) / materials.filter(m => (m.parsedData as any).totalAmount).length;

    const chainNo = this.generateChainNo(storeName, businessDate);

    const chain = await prisma.chain.create({
      data: {
        chainNo,
        storeId: `store-${storeName}`,
        storeName,
        businessDate: new Date(businessDate),
        status: 'PROCESSING',
        totalAmount,
        summaryData: toJson({
          materialCount: materials.length,
          materialTypes: [...new Set(materials.map(m => m.type))],
        }),
        createdBy: operatorId,
        materials: {
          connect: materialIds.map(id => ({ id })),
        },
      },
      include: {
        materials: true,
      },
    });

    await auditService.logStatusChange(
      chain.id,
      null,
      'PROCESSING',
      '创建配送验收链路',
      operatorId,
      operatorName,
    );

    return chain;
  }

  async getChainList(params: {
    storeName?: string;
    status?: ChainStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { storeName, status, startDate, endDate, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (storeName) {
      where.storeName = { contains: storeName };
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      where.businessDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [items, total] = await Promise.all([
      prisma.chain.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { materials: true },
          },
        },
      }),
      prisma.chain.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getChainDetail(id: string, includeTechView = false) {
    const chain = await prisma.chain.findUnique({
      where: { id },
      include: {
        materials: {
          where: { isLatest: true },
          include: {
            dirtyDataRecords: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
        reconciliation: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        ...(includeTechView && {
          httpLogs: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          sqlLogs: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        }),
      },
    });

    if (!chain) {
      return null;
    }

    const timeline = chain.statusHistory.map(h => ({
      timestamp: h.createdAt.toISOString(),
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      operator: h.operatorName,
      reason: h.reason,
    }));

    const dirtyData = chain.materials.flatMap(m =>
      m.dirtyDataRecords.map(d => ({
        id: d.id,
        type: d.type,
        fieldName: d.fieldName,
        status: d.status,
        materialType: m.type,
      })),
    );

    return {
      id: chain.id,
      chainNo: chain.chainNo,
      storeName: chain.storeName,
      businessDate: chain.businessDate.toISOString().split('T')[0],
      status: chain.status,
      totalAmount: Number(chain.totalAmount),
      materials: chain.materials.map(m => ({
        id: m.id,
        type: m.type,
        sourceFile: m.sourceFile,
        version: m.version,
        isLatest: m.isLatest,
        parsedData: fromJson(m.parsedData),
      })),
      timeline,
      dirtyData,
      reconciliation: chain.reconciliation[0]
        ? {
            isPassed: chain.reconciliation[0].isPassed,
            differences: fromJson(chain.reconciliation[0].differences),
            confirmedAt: chain.reconciliation[0].confirmedAt?.toISOString() || null,
          }
        : null,
      ...(includeTechView && {
        techView: {
          httpRequests: chain.httpLogs,
          sqlStatements: chain.sqlLogs,
        },
      }),
    };
  }

  async updateChainStatus(
    id: string,
    newStatus: ChainStatus,
    reason: string,
    operatorId: string,
    operatorName: string,
  ) {
    const chain = await prisma.chain.findUnique({ where: { id } });
    if (!chain) {
      throw new Error('Chain not found');
    }

    await prisma.chain.update({
      where: { id },
      data: { status: newStatus },
    });

    await auditService.logStatusChange(
      id,
      chain.status,
      newStatus,
      reason,
      operatorId,
      operatorName,
    );

    return this.getChainDetail(id);
  }

  async getDashboardStats() {
    const [totalChains, pendingChains, exceptionChains, reconciledChains] = await Promise.all([
      prisma.chain.count(),
      prisma.chain.count({ where: { status: 'PENDING' } }),
      prisma.chain.count({ where: { status: 'EXCEPTION' } }),
      prisma.chain.count({ where: { status: 'RECONCILED' } }),
    ]);

    const dirtyDataCount = await prisma.dirtyDataRecord.count({
      where: { status: 'PENDING' },
    });

    const recentChains = await prisma.chain.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        _count: { select: { materials: true } },
      },
    });

    return {
      totalChains,
      pendingChains,
      exceptionChains,
      reconciledChains,
      dirtyDataCount,
      recentChains,
    };
  }
}

export const chainService = new ChainService();
