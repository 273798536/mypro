import { BaseRepository } from './BaseRepository.js';
import type { ResidualTable } from '../../shared/types/index.js';

export class ResidualRepository extends BaseRepository<ResidualTable> {
  protected tableName = 'residual_table';

  protected toModel(row: Record<string, unknown>): ResidualTable {
    const model = this.convertRowToModel(row);
    return {
      id: model.id as string,
      vin: model.vin as string,
      residualValue: model.residualValue as number,
      residualDate: model.residualDate as string,
      expiryDate: model.expiryDate as string,
      valuationCompany: model.valuationCompany as string,
      isExpired: Boolean(model.isExpired),
      createdAt: model.createdAt as string,
      updatedAt: model.updatedAt as string,
      importBatchId: model.importBatchId as string,
    };
  }

  protected toDatabase(model: Partial<ResidualTable>): Record<string, unknown> {
    return {
      id: model.id,
      vin: model.vin,
      residual_value: model.residualValue,
      residual_date: model.residualDate,
      expiry_date: model.expiryDate,
      valuation_company: model.valuationCompany,
      is_expired: model.isExpired ? 1 : 0,
      import_batch_id: model.importBatchId,
    };
  }

  findByVin(vin: string): ResidualTable[] {
    return this.findAll({ where: { vin }, orderBy: 'residualDate', orderDirection: 'DESC' });
  }

  findLatestByVin(vin: string): ResidualTable | null {
    return this.findOne({ where: { vin }, orderBy: 'residualDate', orderDirection: 'DESC' });
  }

  findExpired(): ResidualTable[] {
    return this.findAll({ where: { isExpired: 1 } });
  }

  findExpiringSoon(days: number = 30): ResidualTable[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE expiry_date <= date('now', '+${days} days')
      AND is_expired = 0
      ORDER BY expiry_date ASC
    `;
    const rows = this.query(sql);
    return rows.map(row => this.toModel(row));
  }

  findByValuationCompany(company: string): ResidualTable[] {
    return this.findAll({ where: { valuationCompany: company } });
  }
}

export default ResidualRepository;
