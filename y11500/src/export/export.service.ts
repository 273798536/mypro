import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parser } from 'json2csv';
import { Batch } from '../entities/batch.entity';
import { BatchStatus } from '../common/enums/batch-status.enum';

export interface ManagerViewData {
  batchId: string;
  batchNo: string;
  status: BatchStatus;
  statusBeforeFrozen?: BatchStatus;
  freezeReason?: string;
  manualReason?: string;
  totalAmount: number;
  totalRepairOrders: number;
  totalSparePartScans: number;
  totalDirtyRecords: number;
  reviewOpinion?: string;
  createdByName: string;
  createdAt: Date;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Batch)
    private batchRepository: Repository<Batch>,
  ) {}

  async getManagerView(): Promise<ManagerViewData[]> {
    const batches = await this.batchRepository.find({
      order: { createdAt: 'DESC' },
    });

    return batches.map(batch => ({
      batchId: batch.id,
      batchNo: batch.batchNo,
      status: batch.status,
      statusBeforeFrozen: batch.statusBeforeFrozen,
      freezeReason: batch.freezeReason,
      manualReason: batch.manualReason,
      totalAmount: batch.totalAmount,
      totalRepairOrders: batch.totalRepairOrders,
      totalSparePartScans: batch.totalSparePartScans,
      totalDirtyRecords: batch.totalDirtyRecords,
      reviewOpinion: batch.reviewOpinion,
      createdByName: batch.createdByName,
      createdAt: batch.createdAt,
    }));
  }

  async exportToCSV(): Promise<string> {
    const data = await this.getManagerView();
    
    const fields = [
      'batchNo',
      'status',
      'statusBeforeFrozen',
      'freezeReason',
      'manualReason',
      'totalAmount',
      'totalRepairOrders',
      'totalSparePartScans',
      'totalDirtyRecords',
      'reviewOpinion',
      'createdByName',
      'createdAt',
    ];

    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  }

  async getStatistics() {
    const batches = await this.batchRepository.find();
    
    const statusCounts: Record<string, number> = {};
    let totalAmount = 0;
    let totalFrozen = 0;

    for (const batch of batches) {
      statusCounts[batch.status] = (statusCounts[batch.status] || 0) + 1;
      totalAmount += Number(batch.totalAmount) || 0;
      if (batch.status === BatchStatus.FROZEN) {
        totalFrozen++;
      }
    }

    return {
      totalBatches: batches.length,
      statusCounts,
      totalAmount,
      totalFrozen,
    };
  }
}
