import { CalculationResultRepository } from '../repositories/CalculationResultRepository.js';
import { VehicleRepository } from '../repositories/VehicleRepository.js';
import { ContractRepository } from '../repositories/ContractRepository.js';
import { ResidualRepository } from '../repositories/ResidualRepository.js';
import { PendingService } from './PendingService.js';
import { AuditService } from './AuditService.js';
import type {
  CalculationResult,
  VehicleRecord,
  LoanContract,
  ResidualTable,
  ResultStatus,
  GetResultsFilters,
  PaginationParams,
  PaginatedResponse,
  PendingItem,
} from '../../shared/types/index.js';

export class CalculationService {
  private calculationResultRepository: CalculationResultRepository;
  private vehicleRepository: VehicleRepository;
  private contractRepository: ContractRepository;
  private residualRepository: ResidualRepository;
  private pendingService: PendingService;
  private auditService: AuditService;

  constructor() {
    this.calculationResultRepository = new CalculationResultRepository();
    this.vehicleRepository = new VehicleRepository();
    this.contractRepository = new ContractRepository();
    this.residualRepository = new ResidualRepository();
    this.pendingService = new PendingService();
    this.auditService = new AuditService();
  }

  calculateResidual(vehicleId: string, contractId: string, residualId?: string): CalculationResult {
    const vehicle = this.vehicleRepository.findById(vehicleId);
    const contract = this.contractRepository.findById(contractId);

    if (!vehicle || !contract) {
      throw new Error('车辆或合同记录不存在');
    }

    let residual: ResidualTable | null = null;
    if (residualId) {
      residual = this.residualRepository.findById(residualId);
    } else {
      residual = this.residualRepository.findLatestByVin(vehicle.vin);
    }

    const pendingItems = this.pendingService.getPendingItemsForCalculation(vehicle.vin);
    const classification = this.classifyResult({} as CalculationResult, pendingItems);

    const storePrice = vehicle.storePrice;
    const remainingBalance = contract.remainingPrincipal + contract.remainingInterest;
    const residualValue = residual?.residualValue || 0;
    const subsidyDeduction = classification.status === 'ready' ? contract.subsidyAmount : 0;
    const subsidyClawback = contract.subsidyClawbackRequired ? (contract.clawbackAmount || 0) : 0;

    let finalPayable = 0;
    let finalReceivable = 0;

    if (classification.status === 'ready') {
      const netValue = storePrice - remainingBalance - subsidyDeduction;
      if (netValue >= 0) {
        finalReceivable = netValue;
      } else {
        finalPayable = Math.abs(netValue);
      }
    }

    const result = this.calculationResultRepository.create({
      vin: vehicle.vin,
      vehicleId: vehicle.id,
      contractId: contract.id,
      residualId: residual?.id,
      storePrice,
      remainingBalance,
      residualValue,
      subsidyDeduction,
      subsidyClawback,
      finalPayable,
      finalReceivable,
      status: classification.status,
      statusReason: classification.reason,
    });

    return {
      ...result,
      vehicle,
      contract,
      residual: residual || undefined,
      pendingItems,
    };
  }

  recalculate(recordId: string, reason: string, operator: string): CalculationResult | null {
    const existingResult = this.calculationResultRepository.findById(recordId);
    if (!existingResult) {
      return null;
    }

    const vehicle = this.vehicleRepository.findById(existingResult.vehicleId);
    const contract = this.contractRepository.findById(existingResult.contractId);
    const residual = existingResult.residualId
      ? this.residualRepository.findById(existingResult.residualId)
      : null;

    if (!vehicle || !contract) {
      return null;
    }

    const pendingItems = this.pendingService.getPendingItemsForCalculation(vehicle.vin);
    const classification = this.classifyResult({} as CalculationResult, pendingItems);

    const storePrice = vehicle.storePrice;
    const remainingBalance = contract.remainingPrincipal + contract.remainingInterest;
    const residualValue = residual?.residualValue || 0;
    const subsidyDeduction = classification.status === 'ready' ? contract.subsidyAmount : 0;
    const subsidyClawback = contract.subsidyClawbackRequired ? (contract.clawbackAmount || 0) : 0;

    let finalPayable = 0;
    let finalReceivable = 0;

    if (classification.status === 'ready') {
      const netValue = storePrice - remainingBalance - subsidyDeduction;
      if (netValue >= 0) {
        finalReceivable = netValue;
      } else {
        finalPayable = Math.abs(netValue);
      }
    }

    this.calculationResultRepository.update(recordId, {
      storePrice,
      remainingBalance,
      residualValue,
      subsidyDeduction,
      subsidyClawback,
      finalPayable,
      finalReceivable,
      status: classification.status,
      statusReason: classification.reason,
    });

    this.calculationResultRepository.incrementRecalculate(recordId, operator);

    this.auditService.logChange(
      recordId,
      'calculation_result',
      'recalculation',
      existingResult.recalculatedCount,
      existingResult.recalculatedCount + 1,
      operator,
      reason
    );

    const updatedResult = this.calculationResultRepository.findById(recordId)!;

    return {
      ...updatedResult,
      vehicle,
      contract,
      residual: residual || undefined,
      pendingItems,
    };
  }

  getResults(filters: GetResultsFilters, pagination: PaginationParams): PaginatedResponse<CalculationResult> & {
    summary: {
      readyCount: number;
      needConfirmCount: number;
      cannotCalculateCount: number;
      totalReceivable: number;
      totalPayable: number;
    };
  } {
    const result = this.calculationResultRepository.findByFilters(filters, pagination);
    const summary = this.calculationResultRepository.getSummary();

    const dataWithDetails = result.data.map(item => {
      const vehicle = this.vehicleRepository.findById(item.vehicleId);
      const contract = this.contractRepository.findById(item.contractId);
      const residual = item.residualId ? this.residualRepository.findById(item.residualId) : null;
      const pendingItems = this.pendingService.getPendingItems()
        .filter(p => p.relatedRecordId === item.vehicleId ||
                     p.relatedRecordId === item.contractId ||
                     (item.residualId && p.relatedRecordId === item.residualId));

      return {
        ...item,
        vehicle: vehicle!,
        contract: contract!,
        residual: residual || undefined,
        pendingItems,
      };
    });

    return {
      ...result,
      data: dataWithDetails,
      summary,
    };
  }

  getResultDetail(id: string): CalculationResult | null {
    const result = this.calculationResultRepository.findById(id);
    if (!result) return null;

    const vehicle = this.vehicleRepository.findById(result.vehicleId);
    const contract = this.contractRepository.findById(result.contractId);
    const residual = result.residualId ? this.residualRepository.findById(result.residualId) : null;
    const pendingItems = this.pendingService.getPendingItems()
      .filter(p => p.relatedRecordId === result.vehicleId ||
                   p.relatedRecordId === result.contractId ||
                   (result.residualId && p.relatedRecordId === result.residualId));

    return {
      ...result,
      vehicle: vehicle!,
      contract: contract!,
      residual: residual || undefined,
      pendingItems,
    };
  }

  classifyResult(result: CalculationResult, pendingItems: PendingItem[]): {
    status: ResultStatus;
    reason: string;
  } {
    const pending = pendingItems.filter(p => p.status === 'pending');

    if (pending.some(p => p.type === 'contract_replaced')) {
      return {
        status: 'cannot_calculate',
        reason: '合同车辆已置换，暂不能计算',
      };
    }

    if (pending.length > 0) {
      const reasons = pending.map(p => {
        switch (p.type) {
          case 'residual_expired':
            return '残值报告已过期';
          case 'subsidy_clawback':
            return '补贴需追回';
          default:
            return '存在待确认事项';
        }
      });
      return {
        status: 'need_confirm',
        reason: reasons.join('；') + '，请确认后继续',
      };
    }

    return {
      status: 'ready',
      reason: '数据完整，可直接使用',
    };
  }

  recalculateAll(operator: string): number {
    const allResults = this.calculationResultRepository.findAll();
    let updatedCount = 0;

    for (const result of allResults) {
      if (this.recalculate(result.id, '批量重算', operator)) {
        updatedCount++;
      }
    }

    return updatedCount;
  }
}

export default CalculationService;
