import prisma from '../utils/prisma';
import { DetectedException, UserContext, ExceptionType, ExceptionStatus, AuditAction } from '../types';
import { AuditService } from './audit.service';
import { toJsonString } from '../utils/json';

export class AuditDetectionService {
  static async runAudit(batchId: string, context: UserContext) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        invoices: true,
        travelApps: true,
        payments: true,
      },
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    const exceptions: DetectedException[] = [];

    exceptions.push(...await this.detectDuplicateInvoices(batchId));
    exceptions.push(...await this.detectDuplicateAccommodation(batchId));
    exceptions.push(...await this.detectDuplicateTransportation(batchId));
    exceptions.push(...await this.detectMultiplePersonShare(batchId));
    exceptions.push(...await this.detectDateOverlap(batchId));

    const createdExceptions = await this.saveExceptions(batchId, exceptions, context);

    await AuditService.log(AuditAction.EXCEPTION_DETECT, context, batchId, {
      totalDetected: exceptions.length,
      exceptionTypes: Object.entries(
        exceptions.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([type, count]) => ({ type, count })),
    });

    return {
      batchId,
      totalDetected: exceptions.length,
      exceptions: createdExceptions,
    };
  }

  private static async detectDuplicateInvoices(batchId: string): Promise<DetectedException[]> {
    const exceptions: DetectedException[] = [];

    const invoices = await prisma.invoice.findMany({
      where: { batchId },
      orderBy: { invoiceNo: 'asc' },
    });

    const invoiceGroups: Record<string, typeof invoices> = {};
    for (const inv of invoices) {
      if (!invoiceGroups[inv.invoiceNo]) {
        invoiceGroups[inv.invoiceNo] = [];
      }
      invoiceGroups[inv.invoiceNo].push(inv);
    }

    for (const [invoiceNo, group] of Object.entries(invoiceGroups)) {
      if (group.length > 1) {
        exceptions.push({
          type: ExceptionType.DUPLICATE_INVOICE,
          severity: 3,
          description: `发票号码 ${invoiceNo} 重复出现 ${group.length} 次，涉及金额合计 ${group.reduce((sum, i) => sum + i.totalAmount, 0).toFixed(2)} 元`,
          invoiceIds: group.map(i => i.id),
          details: {
            invoiceNo,
            count: group.length,
            totalAmount: group.reduce((sum, i) => sum + i.totalAmount, 0),
            sources: group.map(i => ({
              invoiceId: i.id,
              sourceFileId: i.sourceFileId,
              sourceRowNo: i.sourceRowNo,
              amount: i.totalAmount,
            })),
          },
        });
      }
    }

    return exceptions;
  }

  private static async detectDuplicateAccommodation(batchId: string): Promise<DetectedException[]> {
    const exceptions: DetectedException[] = [];

    const accommodationInvoices = await prisma.invoice.findMany({
      where: {
        batchId,
        OR: [
          { invoiceType: { contains: '住宿' } },
          { hotelName: { not: null } },
        ],
      },
    });

    const dateGroups: Record<string, typeof accommodationInvoices> = {};

    for (const inv of accommodationInvoices) {
      if (inv.checkInDate && inv.checkOutDate) {
        const start = inv.checkInDate;
        const end = inv.checkOutDate;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split('T')[0];
          if (!dateGroups[dateKey]) {
            dateGroups[dateKey] = [];
          }
          dateGroups[dateKey].push(inv);
        }
      }
    }

    for (const [date, group] of Object.entries(dateGroups)) {
      if (group.length > 1) {
        const uniqueInvoices = [...new Set(group.map(i => i.id))];
        if (uniqueInvoices.length > 1) {
          exceptions.push({
            type: ExceptionType.DUPLICATE_ACCOMMODATION,
            severity: 2,
            description: `${date} 存在 ${uniqueInvoices.length} 张住宿发票重叠，可能存在重复报销`,
            invoiceIds: uniqueInvoices,
            details: {
              date,
              invoiceCount: uniqueInvoices.length,
              invoices: uniqueInvoices.map(id => {
                const inv = group.find(i => i.id === id)!;
                return {
                  invoiceId: id,
                  invoiceNo: inv.invoiceNo,
                  hotelName: inv.hotelName,
                  checkIn: inv.checkInDate?.toISOString().split('T')[0],
                  checkOut: inv.checkOutDate?.toISOString().split('T')[0],
                  amount: inv.totalAmount,
                };
              }),
            },
          });
        }
      }
    }

    return exceptions;
  }

  private static async detectDuplicateTransportation(batchId: string): Promise<DetectedException[]> {
    const exceptions: DetectedException[] = [];

    const transportInvoices = await prisma.invoice.findMany({
      where: {
        batchId,
        invoiceType: { contains: '交通' },
      },
    });

    const routeGroups: Record<string, typeof transportInvoices> = {};

    for (const inv of transportInvoices) {
      const key = `${inv.invoiceDate.toISOString().split('T')[0]}_${inv.totalAmount}`;
      if (!routeGroups[key]) {
        routeGroups[key] = [];
      }
      routeGroups[key].push(inv);
    }

    for (const [key, group] of Object.entries(routeGroups)) {
      if (group.length > 1) {
        const [date, amount] = key.split('_');
        exceptions.push({
          type: ExceptionType.DUPLICATE_TRANSPORTATION,
          severity: 2,
          description: `${date} 存在 ${group.length} 张金额为 ${amount} 元的交通发票，可能存在重复报销`,
          invoiceIds: group.map(i => i.id),
          details: {
            date,
            amount: parseFloat(amount),
            count: group.length,
            invoices: group.map(i => ({
              invoiceId: i.id,
              invoiceNo: i.invoiceNo,
              sellerName: i.sellerName,
            })),
          },
        });
      }
    }

    return exceptions;
  }

  private static async detectMultiplePersonShare(batchId: string): Promise<DetectedException[]> {
    const exceptions: DetectedException[] = [];

    const invoices = await prisma.invoice.findMany({
      where: {
        batchId,
        guestNames: { not: null },
      },
    });

    for (const inv of invoices) {
      if (inv.guestNames) {
        const guestCount = inv.guestNames.split(/[,，、\s]+/).filter(n => n.trim()).length;
        if (guestCount > 1) {
          exceptions.push({
            type: ExceptionType.MULTIPLE_PERSON_SHARE,
            severity: 2,
            description: `发票 ${inv.invoiceNo} 涉及 ${guestCount} 人共用，需确认费用分摊情况`,
            invoiceIds: [inv.id],
            details: {
              invoiceNo: inv.invoiceNo,
              guestNames: inv.guestNames,
              guestCount,
              totalAmount: inv.totalAmount,
              perPersonAmount: (inv.totalAmount / guestCount).toFixed(2),
            },
          });
        }
      }
    }

    return exceptions;
  }

  private static async detectDateOverlap(batchId: string): Promise<DetectedException[]> {
    const exceptions: DetectedException[] = [];

    const travelApps = await prisma.travelApplication.findMany({
      where: { batchId },
    });

    for (let i = 0; i < travelApps.length; i++) {
      for (let j = i + 1; j < travelApps.length; j++) {
        const app1 = travelApps[i];
        const app2 = travelApps[j];

        if (app1.applicant === app2.applicant) {
          const overlap = this.dateOverlap(
            app1.travelStart, app1.travelEnd,
            app2.travelStart, app2.travelEnd
          );

          if (overlap.overlapping) {
            exceptions.push({
              type: ExceptionType.DATE_OVERLAP,
              severity: 3,
              description: `申请人 ${app1.applicant} 的差旅申请 ${app1.appNo} 和 ${app2.appNo} 日期重叠 ${overlap.overlapDays} 天`,
              invoiceIds: [],
              details: {
                applicant: app1.applicant,
                app1: {
                  appNo: app1.appNo,
                  start: app1.travelStart.toISOString().split('T')[0],
                  end: app1.travelEnd.toISOString().split('T')[0],
                },
                app2: {
                  appNo: app2.appNo,
                  start: app2.travelStart.toISOString().split('T')[0],
                  end: app2.travelEnd.toISOString().split('T')[0],
                },
                overlapDays: overlap.overlapDays,
              },
            });
          }
        }
      }
    }

    return exceptions;
  }

  private static dateOverlap(
    start1: Date, end1: Date,
    start2: Date, end2: Date
  ): { overlapping: boolean; overlapDays: number } {
    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

    if (overlapStart <= overlapEnd) {
      const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { overlapping: true, overlapDays };
    }

    return { overlapping: false, overlapDays: 0 };
  }

  private static async saveExceptions(
    batchId: string,
    exceptions: DetectedException[],
    context: UserContext
  ) {
    const created = [];

    for (const exp of exceptions) {
      const exception = await prisma.auditException.create({
        data: {
          batchId,
          exceptionType: exp.type,
          status: ExceptionStatus.DETECTED,
          severity: exp.severity,
          description: exp.description,
          detectedBy: context.userId,
          invoices: {
            create: exp.invoiceIds.map(id => ({
              invoiceId: id,
              reason: exp.details ? toJsonString(exp.details) : undefined,
            })),
          },
        },
        include: {
          invoices: {
            include: {
              invoice: true,
            },
          },
        },
      });

      created.push(exception);
    }

    return created;
  }

  static async confirmException(
    exceptionId: string,
    context: UserContext,
    note?: string
  ) {
    const exception = await prisma.auditException.update({
      where: { id: exceptionId },
      data: {
        status: ExceptionStatus.CONFIRMED,
        confirmedBy: context.userId,
        confirmedAt: new Date(),
        confirmedNote: note,
      },
      include: {
        batch: true,
      },
    });

    await AuditService.log(AuditAction.EXCEPTION_CONFIRM, context, exception.batchId, {
      exceptionId,
      note,
    });

    return exception;
  }

  static async overruleException(
    exceptionId: string,
    context: UserContext,
    reason: string
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('改判理由不能为空且至少5个字符');
    }

    const exception = await prisma.auditException.update({
      where: { id: exceptionId },
      data: {
        status: ExceptionStatus.OVERRULED,
        overruledBy: context.userId,
        overruledAt: new Date(),
        overruleReason: reason,
      },
      include: {
        batch: true,
      },
    });

    await AuditService.log(AuditAction.EXCEPTION_OVERRULE, context, exception.batchId, {
      exceptionId,
      reason,
    });

    return exception;
  }

  static async dismissException(
    exceptionId: string,
    context: UserContext,
    reason: string
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('驳回理由不能为空且至少5个字符');
    }

    const exception = await prisma.auditException.update({
      where: { id: exceptionId },
      data: {
        status: ExceptionStatus.DISMISSED,
        dismissedBy: context.userId,
        dismissedAt: new Date(),
        dismissReason: reason,
      },
      include: {
        batch: true,
      },
    });

    await AuditService.log(AuditAction.EXCEPTION_DISMISS, context, exception.batchId, {
      exceptionId,
      reason,
    });

    return exception;
  }

  static async getBatchExceptions(batchId: string, status?: string) {
    const where: any = { batchId };
    if (status) where.status = status;

    return prisma.auditException.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { detectedAt: 'desc' },
      ],
      include: {
        invoices: {
          include: {
            invoice: {
              include: {
                sourceFile: {
                  select: {
                    fileName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
