import { BaseRepository } from './BaseRepository.js';
import type { LoanContract } from '../../shared/types/index.js';

export class ContractRepository extends BaseRepository<LoanContract> {
  protected tableName = 'loan_contract';

  protected toModel(row: Record<string, unknown>): LoanContract {
    const model = this.convertRowToModel(row);
    return {
      id: model.id as string,
      contractNo: model.contractNo as string,
      vin: model.vin as string,
      customerName: model.customerName as string,
      loanAmount: model.loanAmount as number,
      loanTerm: model.loanTerm as number,
      interestRate: model.interestRate as number,
      monthlyPayment: model.monthlyPayment as number,
      remainingPrincipal: model.remainingPrincipal as number,
      remainingInterest: model.remainingInterest as number,
      startDate: model.startDate as string,
      endDate: model.endDate as string,
      isVehicleReplaced: Boolean(model.isVehicleReplaced),
      replacementReason: model.replacementReason as string | undefined,
      subsidyAmount: model.subsidyAmount as number,
      subsidyType: model.subsidyType as 'national' | 'local' | 'dealer',
      subsidyClawbackRequired: Boolean(model.subsidyClawbackRequired),
      clawbackAmount: model.clawbackAmount as number | undefined,
      createdAt: model.createdAt as string,
      updatedAt: model.updatedAt as string,
      importBatchId: model.importBatchId as string,
    };
  }

  protected toDatabase(model: Partial<LoanContract>): Record<string, unknown> {
    return {
      id: model.id,
      contract_no: model.contractNo,
      vin: model.vin,
      customer_name: model.customerName,
      loan_amount: model.loanAmount,
      loan_term: model.loanTerm,
      interest_rate: model.interestRate,
      monthly_payment: model.monthlyPayment,
      remaining_principal: model.remainingPrincipal,
      remaining_interest: model.remainingInterest,
      start_date: model.startDate,
      end_date: model.endDate,
      is_vehicle_replaced: model.isVehicleReplaced ? 1 : 0,
      replacement_reason: model.replacementReason,
      subsidy_amount: model.subsidyAmount,
      subsidy_type: model.subsidyType,
      subsidy_clawback_required: model.subsidyClawbackRequired ? 1 : 0,
      clawback_amount: model.clawbackAmount,
      import_batch_id: model.importBatchId,
    };
  }

  findByVin(vin: string): LoanContract | null {
    return this.findOne({ where: { vin } });
  }

  findByContractNo(contractNo: string): LoanContract | null {
    return this.findOne({ where: { contractNo } });
  }

  findReplacedContracts(): LoanContract[] {
    return this.findAll({ where: { isVehicleReplaced: 1 } });
  }

  findClawbackRequired(): LoanContract[] {
    return this.findAll({ where: { subsidyClawbackRequired: 1 } });
  }

  search(keyword: string): LoanContract[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE contract_no LIKE ? OR customer_name LIKE ? OR vin LIKE ?
    `;
    const searchTerm = `%${keyword}%`;
    const rows = this.query(sql, searchTerm, searchTerm, searchTerm);
    return rows.map(row => this.toModel(row));
  }

  rollbackSubsidy(id: string, rollbackAmount: number, operator: string, reason: string): LoanContract {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error('合同记录不存在');
    }

    const currentClawbackAmount = existing.clawbackAmount || 0;
    const newClawbackAmount = currentClawbackAmount + rollbackAmount;

    return this.update(id, {
      clawbackAmount: newClawbackAmount,
      subsidyClawbackRequired: true,
    })!;
  }
}

export default ContractRepository;
