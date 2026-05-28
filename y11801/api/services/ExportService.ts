import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { ExportTaskRepository } from '../repositories/ExportTaskRepository.js';
import { CalculationResultRepository } from '../repositories/CalculationResultRepository.js';
import { VehicleRepository } from '../repositories/VehicleRepository.js';
import { ContractRepository } from '../repositories/ContractRepository.js';
import { ResidualRepository } from '../repositories/ResidualRepository.js';
import type { ExportTask, CalculationResult } from '../../shared/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_DIR = path.join(__dirname, '..', '..', 'exports');

function ensureExportDir(): void {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

export class ExportService {
  private exportTaskRepository: ExportTaskRepository;
  private calculationResultRepository: CalculationResultRepository;
  private vehicleRepository: VehicleRepository;
  private contractRepository: ContractRepository;
  private residualRepository: ResidualRepository;

  constructor() {
    this.exportTaskRepository = new ExportTaskRepository();
    this.calculationResultRepository = new CalculationResultRepository();
    this.vehicleRepository = new VehicleRepository();
    this.contractRepository = new ContractRepository();
    this.residualRepository = new ResidualRepository();
  }

  async generateExcel(recordIds: string[], taskName: string, operator: string): Promise<ExportTask> {
    ensureExportDir();

    const task = this.exportTaskRepository.create({
      taskName,
      exportType: 'excel',
      recordIds,
      status: 'processing',
      createdBy: operator,
    });

    setImmediate(async () => {
      try {
        const filePath = path.join(EXPORT_DIR, `${task.id}.xlsx`);
        await this.createExcelFile(recordIds, filePath);

        const stats = fs.statSync(filePath);
        this.exportTaskRepository.updateStatus(
          task.id,
          'completed',
          new Date().toISOString(),
          `/api/export/download/${task.id}`,
          stats.size
        );
      } catch (error) {
        this.exportTaskRepository.updateStatus(
          task.id,
          'failed',
          new Date().toISOString()
        );
      }
    });

    return task;
  }

  async generatePDF(recordIds: string[], taskName: string, operator: string): Promise<ExportTask> {
    ensureExportDir();

    const task = this.exportTaskRepository.create({
      taskName,
      exportType: 'pdf',
      recordIds,
      status: 'processing',
      createdBy: operator,
    });

    setImmediate(async () => {
      try {
        const filePath = path.join(EXPORT_DIR, `${task.id}.pdf`);
        await this.createPdfFile(recordIds, filePath);

        const stats = fs.statSync(filePath);
        this.exportTaskRepository.updateStatus(
          task.id,
          'completed',
          new Date().toISOString(),
          `/api/export/download/${task.id}`,
          stats.size
        );
      } catch (error) {
        this.exportTaskRepository.updateStatus(
          task.id,
          'failed',
          new Date().toISOString()
        );
      }
    });

    return task;
  }

  private async createExcelFile(recordIds: string[], filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('残值试算结果');

    worksheet.columns = [
      { header: 'VIN', key: 'vin', width: 25 },
      { header: '车牌号', key: 'plateNumber', width: 15 },
      { header: '品牌', key: 'brand', width: 15 },
      { header: '型号', key: 'model', width: 20 },
      { header: '门店收车价', key: 'storePrice', width: 15 },
      { header: '贷款余额', key: 'remainingBalance', width: 15 },
      { header: '残值', key: 'residualValue', width: 15 },
      { header: '补贴抵扣', key: 'subsidyDeduction', width: 15 },
      { header: '补贴追回', key: 'subsidyClawback', width: 15 },
      { header: '应退', key: 'finalPayable', width: 15 },
      { header: '应补', key: 'finalReceivable', width: 15 },
      { header: '状态', key: 'status', width: 15 },
      { header: '状态说明', key: 'statusReason', width: 30 },
      { header: '计算时间', key: 'calculatedAt', width: 25 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1e3a5f' },
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    for (const recordId of recordIds) {
      const result = this.calculationResultRepository.findById(recordId);
      if (!result) continue;

      const vehicle = this.vehicleRepository.findById(result.vehicleId);
      const contract = this.contractRepository.findById(result.contractId);
      const residual = result.residualId
        ? this.residualRepository.findById(result.residualId)
        : null;

      const statusText = {
        ready: '可直接用',
        need_confirm: '需确认',
        cannot_calculate: '暂不能算',
      }[result.status];

      worksheet.addRow({
        vin: result.vin,
        plateNumber: vehicle?.plateNumber || '',
        brand: vehicle?.brand || '',
        model: vehicle?.model || '',
        storePrice: result.storePrice,
        remainingBalance: result.remainingBalance,
        residualValue: result.residualValue,
        subsidyDeduction: result.subsidyDeduction,
        subsidyClawback: result.subsidyClawback,
        finalPayable: result.finalPayable,
        finalReceivable: result.finalReceivable,
        status: statusText,
        statusReason: result.statusReason,
        calculatedAt: result.calculatedAt,
      });
    }

    await workbook.xlsx.writeFile(filePath);
  }

  private async createPdfFile(recordIds: string[], filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc
        .fontSize(18)
        .text('新能源车贷残值试算报告', { align: 'center' })
        .moveDown();

      doc.fontSize(12).text(`生成时间: ${new Date().toLocaleString()}`).moveDown();

      const tableTop = 150;
      const colWidths = [120, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80];
      const colHeaders = [
        'VIN',
        '品牌',
        '门店价',
        '贷款余额',
        '残值',
        '补贴抵扣',
        '补贴追回',
        '应退',
        '应补',
        '状态',
        '计算时间',
      ];

      doc.fontSize(10);

      colHeaders.forEach((header, i) => {
        doc.text(header, 50 + i * colWidths[i], tableTop, {
          width: colWidths[i],
        });
      });

      let yPosition = tableTop + 20;

      for (const recordId of recordIds) {
        const result = this.calculationResultRepository.findById(recordId);
        if (!result) continue;

        const vehicle = this.vehicleRepository.findById(result.vehicleId);

        const statusText = {
          ready: '可直接用',
          need_confirm: '需确认',
          cannot_calculate: '暂不能算',
        }[result.status];

        const rowData = [
          result.vin.substring(0, 12) + '...',
          vehicle?.brand || '',
          result.storePrice.toFixed(2),
          result.remainingBalance.toFixed(2),
          result.residualValue.toFixed(2),
          result.subsidyDeduction.toFixed(2),
          result.subsidyClawback.toFixed(2),
          result.finalPayable.toFixed(2),
          result.finalReceivable.toFixed(2),
          statusText,
          result.calculatedAt.substring(0, 10),
        ];

        rowData.forEach((data, i) => {
          doc.text(String(data), 50 + i * colWidths[i], yPosition, {
            width: colWidths[i],
          });
        });

        yPosition += 20;

        if (yPosition > 550) {
          doc.addPage();
          yPosition = 50;
        }
      }

      doc.end();

      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  getExportTasks(): ExportTask[] {
    return this.exportTaskRepository.findAllOrdered();
  }

  getDownloadPath(taskId: string): {
    filePath: string;
    fileName: string;
  } | null {
    const task = this.exportTaskRepository.findById(taskId);
    if (!task || task.status !== 'completed') {
      return null;
    }

    const ext = task.exportType === 'excel' ? 'xlsx' : 'pdf';
    const filePath = path.join(EXPORT_DIR, `${taskId}.${ext}`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const safeTaskName = task.taskName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
    const fileName = `${safeTaskName}.${ext}`;

    return { filePath, fileName };
  }
}

export default ExportService;
