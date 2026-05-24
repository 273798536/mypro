import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { DataSource } from 'typeorm';
import { Ledger } from '../entities/Ledger';
import { generateDataHash } from '../utils/hash';

export class DataConsistencyMiddleware {
  constructor(private dataSource: DataSource) {}

  verifyLedgerHash = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const ledgerId = req.params.id;
    if (!ledgerId) {
      next();
      return;
    }

    try {
      const ledger = await this.dataSource.getRepository(Ledger).findOne({
        where: { id: ledgerId, isDeleted: false },
        relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
      });

      if (ledger && ledger.dataHash) {
        const currentHash = this.calculateLedgerHash(ledger);
        if (currentHash !== ledger.dataHash) {
          res.setHeader('X-Data-Consistency', 'warning');
          res.setHeader('X-Data-Hash-Mismatch', 'true');
        } else {
          res.setHeader('X-Data-Consistency', 'verified');
        }
      }
    } catch (error) {
    }

    next();
  };

  private calculateLedgerHash(ledger: Ledger): string {
    const data = {
      id: ledger.id,
      ledgerNo: ledger.ledgerNo,
      status: ledger.status,
      dataQuality: ledger.dataQuality,
      repairOrderId: ledger.repairOrderId,
      engineerId: ledger.engineerId,
      engineerName: ledger.engineerName,
      submitTime: ledger.submitTime,
      confirmTime: ledger.confirmTime,
      auditTime: ledger.auditTime,
      rejectReason: ledger.rejectReason,
      rejectBy: ledger.rejectBy,
      confirmBy: ledger.confirmBy,
      auditBy: ledger.auditBy,
      changeReason: ledger.changeReason,
      version: ledger.version,
      partScans: ledger.partScans?.map((p) => ({
        partCode: p.partCode,
        partName: p.partName,
        partType: p.partType,
        quantity: p.quantity,
        batchNo: p.batchNo,
      })) || [],
      receiptPhotos: ledger.receiptPhotos?.map((p) => ({
        photoUrl: p.photoUrl,
        photoHash: p.photoHash,
      })) || [],
      externalReceipts: ledger.externalReceipts?.map((r) => ({
        receiptNo: r.receiptNo,
        source: r.source,
        sourceSystem: r.sourceSystem,
      })) || [],
    };

    return generateDataHash(data);
  }
}

export const addVersionHeader = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Data-Source', 'ledger-primary');
  next();
};
