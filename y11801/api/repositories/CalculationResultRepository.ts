import { BaseRepository } from './BaseRepository.js';
import type { CalculationResult, ResultStatus } from '../../shared/types/index.js';
import { VehicleRepository } from './VehicleRepository.js';
import { ContractRepository } from './ContractRepository.js';
import { ResidualRepository } from './ResidualRepository.js';
import { PendingItemRepository } from './PendingItemRepository.js';

export class CalculationResultRepository extends BaseRepository<CalculationResult> {
  protected tableName = 'calculation_result';

  private vehicleRepository: VehicleRepository;
  private contractRepository: ContractRepository;
  private residualRepository: ResidualRepository;
  private pendingItemRepository: PendingItemRepository;

  constructor() {
    super();
    this.vehicleRepository = new VehicleRepository();
    this.contractRepository = new ContractRepository();
    this.residualRepository = new ResidualRepository();
    this.pendingItemRepository = new PendingItemRepository();
  }

  protected toModel(row: Record<string, unknown>): CalculationResult {
    const model = this.convertRowToModel(row);
    return {
      id: model.id as string,
      vin: model.vin as string,
      vehicleId: model.vehicleId as string,
      contractId: model.contractId as string,
      residualId: model.residualId as string | undefined,
      vehicle: {} as never,
      contract: {} as never,
      residual: undefined,
      storePrice: model.storePrice as number,
      remainingBalance: model.remainingBalance as number,
      residualValue: model.residualValue as number,
      subsidyDeduction: model.subsidyDeduction as number,
      subsidyClawback: model.subsidyClawback as number,
      finalPayable: model.finalPayable as number,
      finalReceivable: model.finalReceivable as number,
      status: model.status as ResultStatus,
      statusReason: model.statusReason as string,
      pendingItems: [],
      calculatedAt: model.calculatedAt as string,
      recalculatedCount: model.recalculatedCount as number,
      lastRecalculatedAt: model.lastRecalculatedAt as string | undefined,
      lastRecalculatedBy: model.lastRecalculatedBy as string | undefined,
    };
  }

  protected toDatabase(model: Partial<CalculationResult>): Record<string, unknown> {
    return {
      id: model.id,
      vin: model.vin,
      vehicle_id: model.vehicleId,
      contract_id: model.contractId,
      residual_id: model.residualId,
      store_price: model.storePrice,
      remaining_balance: model.remainingBalance,
      residual_value: model.residualValue,
      subsidy_deduction: model.subsidyDeduction,
      subsidy_clawback: model.subsidyClawback,
      final_payable: model.finalPayable,
      final_receivable: model.finalReceivable,
      status: model.status,
      status_reason: model.statusReason,
      calculated_at: model.calculatedAt,
      recalculated_count: model.recalculatedCount,
      last_recalculated_at: model.lastRecalculatedAt,
      last_recalculated_by: model.lastRecalculatedBy,
    };
  }

  private hydrate(result: CalculationResult): CalculationResult {
    const vehicle = this.vehicleRepository.findById(result.vehicleId);
    const contract = this.contractRepository.findById(result.contractId);
    const residual = result.residualId ? this.residualRepository.findById(result.residualId) : undefined;
    const pendingItems = this.pendingItemRepository.findByRelatedRecordIds([
      result.vehicleId,
      result.contractId,
      result.residualId,
    ].filter(Boolean) as string[]);

    return {
      ...result,
      vehicle: vehicle!,
      contract: contract!,
      residual,
      pendingItems,
    };
  }

  findByIdWithRelations(id: string): CalculationResult | null {
    const result = this.findById(id);
    return result ? this.hydrate(result) : null;
  }

  findAllWithRelations(): CalculationResult[] {
    const results = this.findAll();
    return results.map(result => this.hydrate(result));
  }

  findByVin(vin: string): CalculationResult | null {
    return this.findOne({ where: { vin } });
  }

  findByVinWithRelations(vin: string): CalculationResult | null {
    const result = this.findByVin(vin);
    return result ? this.hydrate(result) : null;
  }

  findByStatus(status: ResultStatus): CalculationResult[] {
    return this.findAll({ where: { status }, orderBy: 'calculatedAt', orderDirection: 'DESC' });
  }

  findByStatusWithRelations(status: ResultStatus): CalculationResult[] {
    const results = this.findByStatus(status);
    return results.map(result => this.hydrate(result));
  }

  findByStoreId(storeId: string): CalculationResult[] {
    const sql = `
      SELECT cr.* FROM ${this.tableName} cr
      INNER JOIN vehicle_record vr ON cr.vehicle_id = vr.id
      WHERE vr.store_id = ?
      ORDER BY cr.calculated_at DESC
    `;
    const rows = this.query(sql, storeId);
    return rows.map(row => this.hydrate(this.toModel(row)));
  }

  findByFilters(filters: {
    status?: ResultStatus;
    storeId?: string;
    brand?: string;
    startDate?: string;
    endDate?: string;
  }, pagination?: {
    page?: number;
    pageSize?: number;
  }): { data: CalculationResult[]; total: number; page: number; pageSize: number } {
    let sql = `
      SELECT cr.* FROM ${this.tableName} cr
      INNER JOIN vehicle_record vr ON cr.vehicle_id = vr.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (filters.status) {
      sql += ` AND cr.status = ?`;
      params.push(filters.status);
    }
    if (filters.storeId) {
      sql += ` AND vr.store_id = ?`;
      params.push(filters.storeId);
    }
    if (filters.brand) {
      sql += ` AND vr.brand = ?`;
      params.push(filters.brand);
    }
    if (filters.startDate) {
      sql += ` AND cr.calculated_at >= ?`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ` AND cr.calculated_at <= ?`;
      params.push(filters.endDate);
    }

    const countSql = sql.replace('SELECT cr.*', 'SELECT COUNT(*) as count');
    const countResult = this.queryOne(countSql, ...params) as { count: number } | null;
    const total = countResult?.count || 0;

    sql += ` ORDER BY cr.calculated_at DESC`;

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || total;

    if (pagination?.page !== undefined && pagination?.pageSize !== undefined) {
      const offset = (page - 1) * pageSize;
      sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
    }

    const rows = this.query(sql, ...params);
    const data = rows.map(row => this.hydrate(this.toModel(row)));

    return { data, total, page, pageSize };
  }

  getSummary(): {
    readyCount: number;
    needConfirmCount: number;
    cannotCalculateCount: number;
    totalReceivable: number;
    totalPayable: number;
  } {
    const sql = `
      SELECT
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_count,
        SUM(CASE WHEN status = 'need_confirm' THEN 1 ELSE 0 END) as need_confirm_count,
        SUM(CASE WHEN status = 'cannot_calculate' THEN 1 ELSE 0 END) as cannot_calculate_count,
        SUM(final_receivable) as total_receivable,
        SUM(final_payable) as total_payable
      FROM ${this.tableName}
    `;
    const result = this.queryOne(sql) as Record<string, number> | null;
    return {
      readyCount: result?.ready_count || 0,
      needConfirmCount: result?.need_confirm_count || 0,
      cannotCalculateCount: result?.cannot_calculate_count || 0,
      totalReceivable: result?.total_receivable || 0,
      totalPayable: result?.total_payable || 0,
    };
  }

  incrementRecalculate(id: string, operator: string): number {
    const sql = `
      UPDATE ${this.tableName}
      SET recalculated_count = recalculated_count + 1,
          last_recalculated_at = CURRENT_TIMESTAMP,
          last_recalculated_by = ?
      WHERE id = ?
    `;
    const result = this.run(sql, operator, id);
    return result.changes;
  }
}

export default CalculationResultRepository;
