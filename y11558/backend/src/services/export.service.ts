import prisma from '../lib/prisma.js';
import { auditService } from './audit.service.js';
import type { ExportFormat } from '@prisma/client';
import { toJson, fromJson } from '../utils/json.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export class ExportService {
  private exportDir = path.join(process.cwd(), 'exports');

  constructor() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async generateExport(
    chainIds: string[],
    format: ExportFormat,
    operatorId: string,
    operatorName: string,
  ) {
    const exportTask = await prisma.exportTask.create({
      data: {
        format,
        status: 'RUNNING',
        snapshotData: {},
        createdBy: operatorId,
      },
    });

    const chains = await Promise.all(
      chainIds.map(id => prisma.chain.findUnique({
        where: { id },
        include: {
          materials: { where: { isLatest: true } },
          reconciliation: { orderBy: { createdAt: 'desc' }, take: 1 },
          statusHistory: true,
        },
      })),
    );

    const snapshotData = { chains, exportedAt: new Date().toISOString() };

    await prisma.exportTask.update({
      where: { id: exportTask.id },
      data: { snapshotData },
    });

    let filePath: string;
    let fileName: string;

    if (format === 'EXCEL') {
      fileName = `对账报表_${new Date().toISOString().split('T')[0]}.xlsx`;
      filePath = path.join(this.exportDir, fileName);
      this.generateExcel(chains, filePath);
    } else if (format === 'CSV') {
      fileName = `对账报表_${new Date().toISOString().split('T')[0]}.csv`;
      filePath = path.join(this.exportDir, fileName);
      this.generateCsv(chains, filePath);
    } else {
      fileName = `对账报表_${new Date().toISOString().split('T')[0]}.json`;
      filePath = path.join(this.exportDir, fileName);
      this.generateJson(snapshotData, filePath);
    }

    const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

    const exportFile = await prisma.exportFile.create({
      data: {
        exportTaskId: exportTask.id,
        fileName,
        fileUrl: `/exports/${fileName}`,
        fileSize: BigInt(fileSize),
      },
    });

    await prisma.exportTask.update({
      where: { id: exportTask.id },
      data: {
        status: 'COMPLETED',
        filePath,
        chains: { connect: chainIds.map(id => ({ id })) },
      },
    });

    for (const chainId of chainIds) {
      await auditService.logStatusChange(
        chainId,
        null,
        'EXPORTED',
        `导出报表: ${fileName}`,
        operatorId,
        operatorName,
      );
    }

    return { task: exportTask, file: exportFile };
  }

  private generateExcel(chains: any[], filePath: string) {
    const headers = [
      '链路编号',
      '门店名称',
      '业务日期',
      '状态',
      '订单金额',
      '欠条金额',
      '对账单金额',
      '最终金额',
      '差异数',
      '创建时间',
    ];

    const rows = chains.map(chain => {
      const recon = chain.reconciliation[0];
      return [
        chain.chainNo,
        chain.storeName,
        chain.businessDate.toISOString().split('T')[0],
        this.getStatusText(chain.status),
        recon?.orderAmount || 0,
        recon?.iouAmount || 0,
        recon?.statementAmount || '',
        recon?.finalAmount || chain.totalAmount,
        recon?.differences?.length || 0,
        chain.createdAt.toISOString().split('T')[0],
      ];
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '对账汇总');

    const detailHeaders = [
      '链路编号',
      '材料类型',
      '商品名称',
      '数量',
      '单价',
      '金额',
      '版本',
    ];

    const detailRows: any[] = [];
    chains.forEach(chain => {
      chain.materials.forEach((material: any) => {
        const parsedData = fromJson(material.parsedData) || {};
        const items = (parsedData as any).items || [];
        items.forEach((item: any) => {
          detailRows.push([
            chain.chainNo,
            material.type,
            item.productName,
            item.quantity,
            item.price,
            item.amount,
            material.version,
          ]);
        });
      });
    });

    const detailWs = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    XLSX.utils.book_append_sheet(wb, detailWs, '商品明细');

    XLSX.writeFile(wb, filePath);
  }

  private generateCsv(chains: any[], filePath: string) {
    const headers = [
      '链路编号',
      '门店名称',
      '业务日期',
      '状态',
      '订单金额',
      '欠条金额',
      '最终金额',
    ];

    const rows = chains.map(chain => {
      const recon = chain.reconciliation[0];
      return [
        chain.chainNo,
        chain.storeName,
        chain.businessDate.toISOString().split('T')[0],
        this.getStatusText(chain.status),
        recon?.orderAmount || 0,
        recon?.iouAmount || 0,
        recon?.finalAmount || chain.totalAmount,
      ].join(',');
    });

    const content = [headers.join(','), ...rows].join('\n');
    fs.writeFileSync(filePath, '\ufeff' + content, 'utf8');
  }

  private generateJson(data: any, filePath: string) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: '待处理',
      PROCESSING: '处理中',
      EXCEPTION: '异常',
      RECONCILING: '对账中',
      REVIEW_REQUIRED: '待复核',
      RECONCILED: '已对账',
      EXPORTED: '已导出',
    };
    return statusMap[status] || status;
  }

  async getExportTasks(page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      prisma.exportTask.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { files: true },
      }),
      prisma.exportTask.count(),
    ]);

    return { items, total, page, pageSize };
  }

  async getExportFilePath(taskId: string) {
    const task = await prisma.exportTask.findUnique({
      where: { id: taskId },
    });
    return task?.filePath;
  }
}

export const exportService = new ExportService();
