import { Repository, QueryRunner } from 'typeorm';
import { DirtyRecord } from '../entities/dirty-record.entity';
import { RepairOrder } from '../entities/repair-order.entity';
import { SparePartScan } from '../entities/spare-part-scan.entity';
import { ScanDetail } from '../entities/scan-detail.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
export declare class DirtyRecordService {
    private dirtyRecordRepository;
    private repairOrderRepository;
    private sparePartScanRepository;
    private scanDetailRepository;
    constructor(dirtyRecordRepository: Repository<DirtyRecord>, repairOrderRepository: Repository<RepairOrder>, sparePartScanRepository: Repository<SparePartScan>, scanDetailRepository: Repository<ScanDetail>);
    analyzeAndCreateDirtyRecords(batchId: string, queryRunner?: QueryRunner): Promise<void>;
    private analyzeRepairOrder;
    private analyzeSparePartScan;
    private analyzeScanDetail;
    private checkCrossDay;
    private checkNameChanged;
    private checkConflicts;
    private createDirtyRecord;
    findByBatchId(batchId: string): Promise<DirtyRecord[]>;
    resolve(id: string, user: CurrentUser, handlingOpinion: string, resolvedContent: string): Promise<DirtyRecord>;
}
