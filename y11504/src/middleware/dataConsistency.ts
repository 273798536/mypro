import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { DataSource } from 'typeorm';
import { Ledger } from '../entities/Ledger';
import { generateLedgerHash } from '../utils/hash';

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
        const currentHash = generateLedgerHash(ledger);
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
