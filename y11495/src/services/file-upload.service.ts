import * as fs from 'fs';
import * as path from 'path';
import prisma from '../utils/prisma';
import { FileParserService } from './file-parser.service';
import { UserContext, SourceFileType, SourceFileTypeType, AuditAction, BatchStatus } from '../types';
import { AuditService } from './audit.service';
import { toJsonString } from '../utils/json';

export class FileUploadService {
  static UPLOAD_DIR = path.join(process.cwd(), 'uploads');

  static ensureUploadDir() {
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
    return this.UPLOAD_DIR;
  }

  static async uploadFile(
    batchId: string,
    file: Express.Multer.File,
    fileType: SourceFileTypeType,
    context: UserContext
  ) {
    this.ensureUploadDir();

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    if (batch.status === BatchStatus.FROZEN || batch.status === BatchStatus.ARCHIVED) {
      throw new Error(`批次状态为 ${batch.status}，无法上传文件`);
    }

    const fileHash = await FileParserService.computeFileHash(file.path);

    const existingFile = await prisma.sourceFile.findFirst({
      where: {
        batchId,
        fileHash,
      },
    });

    if (existingFile) {
      throw new Error('该文件已在此批次中上传过');
    }

    const storagePath = path.join(this.UPLOAD_DIR, `${Date.now()}-${file.originalname}`);
    fs.copyFileSync(file.path, storagePath);

    const sourceFile = await prisma.sourceFile.create({
      data: {
        batchId,
        fileType,
        fileName: file.originalname,
        fileSize: file.size,
        fileHash,
        storagePath,
        uploadedBy: context.userId,
      },
    });

    let parsedCount = 0;
    const parseErrors: string[] = [];

    try {
      if (fileType === SourceFileType.INVOICE_PDF) {
        const invoices = await FileParserService.parseInvoicePDF(storagePath);
        for (let i = 0; i < invoices.length; i++) {
          const inv = invoices[i];
          await prisma.invoice.create({
            data: {
              batchId,
              sourceFileId: sourceFile.id,
              sourceRowNo: i + 1,
              invoiceNo: inv.invoiceNo,
              invoiceDate: inv.invoiceDate,
              amount: inv.amount,
              taxAmount: inv.taxAmount,
              totalAmount: inv.totalAmount,
              sellerName: inv.sellerName,
              sellerTaxNo: inv.sellerTaxNo,
              buyerName: inv.buyerName,
              buyerTaxNo: inv.buyerTaxNo,
              invoiceType: inv.invoiceType,
              hotelName: inv.hotelName,
              checkInDate: inv.checkInDate,
              checkOutDate: inv.checkOutDate,
              guestNames: inv.guestNames,
              travelDateStart: inv.travelDateStart,
              travelDateEnd: inv.travelDateEnd,
              rawData: toJsonString(inv.rawData),
              parsedBy: context.userId,
              parsedAt: new Date(),
            },
          });
          parsedCount++;
        }
      } else if (fileType === SourceFileType.TRAVEL_APPLICATION) {
        const apps = await FileParserService.parseTravelApplication(storagePath, fileType);
        for (let i = 0; i < apps.length; i++) {
          const app = apps[i];
          await prisma.travelApplication.create({
            data: {
              batchId,
              sourceFileId: sourceFile.id,
              sourceRowNo: i + 1,
              appNo: app.appNo,
              applicant: app.applicant,
              department: app.department,
              travelStart: app.travelStart,
              travelEnd: app.travelEnd,
              destination: app.destination,
              purpose: app.purpose,
              travelers: app.travelers,
              estimatedAccommodation: app.estimatedAccommodation,
              estimatedTransport: app.estimatedTransport,
              estimatedOther: app.estimatedOther,
              estimatedTotal: app.estimatedTotal,
              rawData: toJsonString(app.rawData),
            },
          });
          parsedCount++;
        }
      } else if (fileType === SourceFileType.PAYMENT_RECORD) {
        const payments = await FileParserService.parsePaymentRecord(storagePath);
        for (let i = 0; i < payments.length; i++) {
          const pay = payments[i];
          await prisma.paymentRecord.create({
            data: {
              batchId,
              sourceFileId: sourceFile.id,
              sourceRowNo: i + 1,
              paymentNo: pay.paymentNo,
              paymentDate: pay.paymentDate,
              payee: pay.payee,
              amount: pay.amount,
              paymentMethod: pay.paymentMethod,
              remark: pay.remark,
              relatedInvoiceNo: pay.relatedInvoiceNo,
              relatedAppNo: pay.relatedAppNo,
              rawData: toJsonString(pay.rawData),
            },
          });
          parsedCount++;
        }
      }
    } catch (error: any) {
      parseErrors.push(error.message);
    }

    await AuditService.log(AuditAction.FILE_UPLOAD, context, batchId, {
      fileId: sourceFile.id,
      fileName: file.originalname,
      fileType,
      parsedCount,
      parseErrors,
    });

    return {
      sourceFile,
      parsedCount,
      parseErrors,
    };
  }

  static async deleteFile(
    fileId: string,
    context: UserContext
  ) {
    const sourceFile = await prisma.sourceFile.findUnique({
      where: { id: fileId },
      include: { batch: true },
    });

    if (!sourceFile) {
      throw new Error('文件不存在');
    }

    if (sourceFile.batch.status === BatchStatus.FROZEN || 
        sourceFile.batch.status === BatchStatus.ARCHIVED) {
      throw new Error(`批次状态为 ${sourceFile.batch.status}，无法删除文件`);
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.invoice.deleteMany({
        where: { sourceFileId: fileId },
      });

      await tx.travelApplication.deleteMany({
        where: { sourceFileId: fileId },
      });

      await tx.paymentRecord.deleteMany({
        where: { sourceFileId: fileId },
      });

      await tx.sourceFile.delete({
        where: { id: fileId },
      });

      return true;
    });

    if (fs.existsSync(sourceFile.storagePath)) {
      fs.unlinkSync(sourceFile.storagePath);
    }

    await AuditService.log(AuditAction.FILE_DELETE, context, sourceFile.batchId, {
      fileId,
      fileName: sourceFile.fileName,
    });

    return result;
  }

  static async getBatchFiles(batchId: string) {
    return prisma.sourceFile.findMany({
      where: { batchId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            invoices: true,
            travelApps: true,
            payments: true,
          },
        },
      },
    });
  }
}
