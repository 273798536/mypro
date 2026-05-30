import { Database } from 'sqlite3';
import { Sensor, TemperatureRecord, CableArchive, MonitoringDetail, AnomalyDetectionResult, ImportBatch, ChangeLog } from '../types';
export declare class MonitoringRepository {
    private db;
    constructor(db: Database);
    createImportBatch(batchType: ImportBatch['batch_type'], phase: number, recordCount: number, importedBy: string): Promise<ImportBatch>;
    insertSensor(sensor: Omit<Sensor, 'id' | 'created_at'>): Promise<Sensor>;
    insertTemperatureRecord(record: Omit<TemperatureRecord, 'id' | 'is_valid' | 'import_batch_id' | 'created_at'>, importBatchId: string): Promise<TemperatureRecord>;
    insertCableArchive(archive: Omit<CableArchive, 'id' | 'import_batch_id' | 'created_at'>, importBatchId: string): Promise<CableArchive>;
    insertMonitoringDetail(detail: Omit<MonitoringDetail, 'id' | 'created_at' | 'updated_at'>): Promise<MonitoringDetail>;
    insertAnomalyDetectionResult(result: Omit<AnomalyDetectionResult, 'id' | 'created_at'>): Promise<AnomalyDetectionResult>;
    insertChangeLog(detailId: string, fieldName: string, oldValue: string | undefined, newValue: string | undefined, changeReason: string): Promise<ChangeLog>;
    getSensors(): Promise<Sensor[]>;
    getSensorByCode(sensorCode: string): Promise<Sensor | undefined>;
    getTemperatureRecords(sensorId?: string): Promise<TemperatureRecord[]>;
    getCableArchives(): Promise<CableArchive[]>;
    getCableArchiveByCode(cableCode: string): Promise<CableArchive | undefined>;
    getMonitoringDetails(params?: {
        sensorId?: string;
        cableId?: string;
        isAnomaly?: boolean;
        status?: string;
        affectedByCableArchive?: boolean;
        startDate?: string;
        endDate?: string;
    }): Promise<MonitoringDetail[]>;
    getMonitoringDetailById(id: string): Promise<MonitoringDetail | undefined>;
    getAnomalyDetectionResults(detailId: string): Promise<AnomalyDetectionResult[]>;
    getChangeLogs(detailId: string): Promise<ChangeLog[]>;
    updateMonitoringDetailStatus(id: string, status: MonitoringDetail['status']): Promise<void>;
    updateMonitoringDetail(detail: Partial<MonitoringDetail> & {
        id: string;
    }): Promise<void>;
    getImportBatches(): Promise<ImportBatch[]>;
}
