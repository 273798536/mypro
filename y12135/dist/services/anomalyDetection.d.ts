import { MonitoringDetail, AnomalyDetectionResult, CableArchive, TemperatureRecord } from '../types';
export interface DetectionContext {
    cableArchive?: CableArchive;
    allRecords: TemperatureRecord[];
    allDetails: MonitoringDetail[];
    previousRecord?: TemperatureRecord;
}
export declare function detectAnomaly(temperatureRecord: TemperatureRecord, context: DetectionContext, detectionVersion?: number): {
    detail: Omit<MonitoringDetail, 'id' | 'created_at' | 'updated_at'>;
    detectionResult: Omit<AnomalyDetectionResult, 'id' | 'created_at'>;
};
export declare function reanalyzeWithCableArchive(existingDetail: MonitoringDetail, cableArchive: CableArchive, allRecords: TemperatureRecord[], allDetails: MonitoringDetail[]): {
    updatedDetail: Partial<MonitoringDetail>;
    newDetectionResult: Omit<AnomalyDetectionResult, 'id' | 'created_at'>;
    changes: Array<{
        field: string;
        oldValue: string;
        newValue: string;
        reason: string;
    }>;
};
