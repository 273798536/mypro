import { AppDataSource } from '../config/database';
import { StatusHistory } from '../entities/StatusHistory';
import { CompensationStatus, OperationType } from '../types/enums';

export class StatusHistoryService {
  private historyRepository = AppDataSource.getRepository(StatusHistory);

  async createHistory(
    recordId: string,
    fromStatus: CompensationStatus,
    toStatus: CompensationStatus,
    operationType: OperationType,
    reason: string,
    operatorId: string,
    operatorName: string,
    extraData?: Record<string, any>
  ): Promise<StatusHistory> {
    const history = this.historyRepository.create({
      recordId,
      fromStatus,
      toStatus,
      operationType,
      reason,
      operatorId,
      operatorName,
      extraData,
      operatedAt: new Date()
    });

    return await this.historyRepository.save(history);
  }

  async getHistoriesByRecordId(recordId: string): Promise<StatusHistory[]> {
    return await this.historyRepository.find({
      where: { recordId },
      order: { operatedAt: 'DESC' }
    });
  }
}
