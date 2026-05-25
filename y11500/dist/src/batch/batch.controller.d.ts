import { BatchService } from './batch.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { StateMachineService } from '../state-machine/state-machine.service';
import { DirtyRecordService } from '../dirty-record/dirty-record.service';
export declare class BatchController {
    private readonly batchService;
    private readonly stateMachineService;
    private readonly dirtyRecordService;
    constructor(batchService: BatchService, stateMachineService: StateMachineService, dirtyRecordService: DirtyRecordService);
    create(createBatchDto: CreateBatchDto, user: any): Promise<import("../entities/batch.entity").Batch>;
    findAll(user: any): Promise<import("../entities/batch.entity").Batch[]>;
    findOne(id: string): Promise<import("../entities/batch.entity").Batch>;
    submitForReview(id: string, user: any): Promise<import("../entities/batch.entity").Batch>;
    approve(id: string, user: any, opinion?: string): Promise<import("../entities/batch.entity").Batch>;
    reject(id: string, user: any, reason: string): Promise<import("../entities/batch.entity").Batch>;
    freeze(id: string, user: any, reason: string): Promise<import("../entities/batch.entity").Batch>;
    unfreeze(id: string, user: any, reason: string): Promise<import("../entities/batch.entity").Batch>;
    settle(id: string, user: any): Promise<import("../entities/batch.entity").Batch>;
    cancel(id: string, user: any, reason: string): Promise<import("../entities/batch.entity").Batch>;
    archive(id: string, user: any): Promise<import("../entities/batch.entity").Batch>;
    getStatusLogs(id: string): Promise<import("../entities/status-log.entity").StatusLog[]>;
    getDirtyRecords(id: string): Promise<import("../entities/dirty-record.entity").DirtyRecord[]>;
    getRepairOrders(id: string): Promise<import("../entities/repair-order.entity").RepairOrder[]>;
    getSparePartScans(id: string): Promise<import("../entities/spare-part-scan.entity").SparePartScan[]>;
    getCustomerSignPhotos(id: string): Promise<import("../entities/customer-sign-photo.entity").CustomerSignPhoto[]>;
    getScanDetails(id: string): Promise<import("../entities/scan-detail.entity").ScanDetail[]>;
    resolveDirtyRecord(id: string, user: any, handlingOpinion: string, resolvedContent: string): Promise<import("../entities/dirty-record.entity").DirtyRecord>;
}
