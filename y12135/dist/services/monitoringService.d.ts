import { MonitoringRepository } from '../repositories/monitoringRepository';
import { Sensor, TemperatureRecord, CableArchive, MonitoringDetail, ImportPhase1Data, ImportPhase2Data, ChangeLog } from '../types';
export declare class MonitoringService {
    private repository;
    constructor(repository: MonitoringRepository);
    importPhase1(data: ImportPhase1Data, importedBy?: string): Promise<{
        sensors: Sensor[];
        temperatureRecords: TemperatureRecord[];
        details: MonitoringDetail[];
        summary: {
            totalSensors: number;
            totalRecords: number;
            anomalies: number;
            phase1Comparison: {
                before: {
                    anomalyCount: number;
                    message: string;
                };
                after: {
                    anomalyCount: number;
                    message: string;
                };
            };
        };
    }>;
    importPhase2(data: ImportPhase2Data, importedBy?: string): Promise<{
        cableArchives: CableArchive[];
        affectedDetails: MonitoringDetail[];
        changeLogs: ChangeLog[];
        summary: {
            totalArchives: number;
            affectedDetails: number;
            reanalyzedDetails: number;
            phase2Comparison: {
                before: {
                    anomalyCount: number;
                    warningCount: number;
                    criticalCount: number;
                    message: string;
                };
                after: {
                    anomalyCount: number;
                    warningCount: number;
                    criticalCount: number;
                    message: string;
                };
                changes: string[];
            };
        };
    }>;
    getDetailWithHistory(id: string): Promise<{
        detail: MonitoringDetail;
        detectionHistory: Array<{
            version: number;
            is_anomaly: boolean;
            anomaly_score: number;
            anomaly_type: string;
            cause_explanation: string;
            trend_analysis: string;
            confidence: number;
            created_at: string;
        }>;
        changeLogs: ChangeLog[];
    }>;
    updateDetailStatus(id: string, status: MonitoringDetail['status'], reason: string): Promise<{
        detail: MonitoringDetail;
        changeLog: ChangeLog;
    }>;
    exportResults(params?: {
        sensorId?: string;
        isAnomaly?: boolean;
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<Record<string, string>[]>;
    private getStatusLabel;
    getStatistics(): Promise<{
        totalSensors: number;
        totalRecords: number;
        totalAnomalies: number;
        statusBreakdown: Record<string, number>;
        anomalyTypeBreakdown: Record<string, number>;
        affectedByArchive: number;
        phase1Details: number;
        phase2Details: number;
    }>;
}
