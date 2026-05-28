import { PendingItemRepository } from '../repositories/PendingItemRepository.js';
import { VehicleRepository } from '../repositories/VehicleRepository.js';
import { ContractRepository } from '../repositories/ContractRepository.js';
import { ResidualRepository } from '../repositories/ResidualRepository.js';
import type { PendingItem, PendingType, VehicleRecord, LoanContract, ResidualTable } from '../../shared/types/index.js';

export class PendingService {
  private pendingItemRepository: PendingItemRepository;
  private vehicleRepository: VehicleRepository;
  private contractRepository: ContractRepository;
  private residualRepository: ResidualRepository;

  constructor() {
    this.pendingItemRepository = new PendingItemRepository();
    this.vehicleRepository = new VehicleRepository();
    this.contractRepository = new ContractRepository();
    this.residualRepository = new ResidualRepository();
  }

  detectAnomalies(vehicle: VehicleRecord, contract: LoanContract, residual?: ResidualTable): PendingItem[] {
    const anomalies: PendingItem[] = [];
    const now = new Date();

    if (residual) {
      const expiryDate = new Date(residual.expiryDate);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        anomalies.push({
          id: '',
          type: 'residual_expired',
          relatedRecordId: residual.id,
          relatedRecordType: 'residual',
          title: '残值报告已过期',
          description: `车辆 VIN: ${vehicle.vin} 的残值报告已过期，请重新评估`,
          level: 'high',
          remainingDays: diffDays,
          createdAt: now.toISOString(),
          status: 'pending',
        });
      } else if (diffDays <= 7) {
        anomalies.push({
          id: '',
          type: 'residual_expired',
          relatedRecordId: residual.id,
          relatedRecordType: 'residual',
          title: '残值报告即将过期',
          description: `车辆 VIN: ${vehicle.vin} 的残值报告将于${diffDays}天后过期`,
          level: 'medium',
          remainingDays: diffDays,
          createdAt: now.toISOString(),
          status: 'pending',
        });
      }
    }

    if (contract.isVehicleReplaced) {
      anomalies.push({
        id: '',
        type: 'contract_replaced',
        relatedRecordId: contract.id,
        relatedRecordType: 'contract',
        title: '合同车辆已置换',
        description: `合同 ${contract.contractNo} 客户已置换新车，暂不能进行残值试算`,
        level: 'medium',
        createdAt: now.toISOString(),
        status: 'pending',
      });
    }

    if (contract.subsidyClawbackRequired && (contract.clawbackAmount || 0) > 0) {
      anomalies.push({
        id: '',
        type: 'subsidy_clawback',
        relatedRecordId: contract.id,
        relatedRecordType: 'contract',
        title: '补贴需追回',
        description: `合同 ${contract.contractNo} 需追回补贴 ¥${contract.clawbackAmount}`,
        level: 'high',
        createdAt: now.toISOString(),
        status: 'pending',
      });
    }

    return anomalies;
  }

  getPendingItems(filters?: {
    status?: PendingItem['status'];
    type?: PendingType;
    level?: PendingItem['level'];
  }): PendingItem[] {
    let items: PendingItem[];

    if (filters?.status) {
      items = this.pendingItemRepository.findByStatus(filters.status);
    } else if (filters?.type) {
      items = this.pendingItemRepository.findByType(filters.type);
    } else {
      items = this.pendingItemRepository.findPending();
    }

    if (filters?.level) {
      items = items.filter(item => item.level === filters.level);
    }

    return items;
  }

  confirmItem(id: string, operator: string, note?: string): PendingItem | null {
    return this.pendingItemRepository.confirm(id, operator, note);
  }

  batchConfirm(ids: string[], operator: string, note?: string): number {
    return this.pendingItemRepository.batchConfirm(ids, operator, note);
  }

  createPendingItem(data: Omit<PendingItem, 'id' | 'createdAt'>): PendingItem {
    return this.pendingItemRepository.create(data);
  }

  getPendingItemsForCalculation(vin: string): PendingItem[] {
    const vehicle = this.vehicleRepository.findByVin(vin);
    const contract = this.contractRepository.findByVin(vin);
    const residual = this.residualRepository.findLatestByVin(vin);

    if (!vehicle || !contract) {
      return [];
    }

    const anomalies = this.detectAnomalies(vehicle, contract, residual || undefined);

    const existingPending = this.pendingItemRepository.findPending();
    const existingAnomalies = existingPending.filter(
      p => p.relatedRecordId === vehicle.id ||
           p.relatedRecordId === contract.id ||
           (residual && p.relatedRecordId === residual.id)
    );

    const newAnomalies = anomalies.filter(anomaly => {
      return !existingAnomalies.some(
        existing => existing.type === anomaly.type &&
                    existing.relatedRecordId === anomaly.relatedRecordId
      );
    });

    for (const anomaly of newAnomalies) {
      this.pendingItemRepository.create(anomaly);
    }

    return [...existingAnomalies, ...newAnomalies];
  }
}

export default PendingService;
