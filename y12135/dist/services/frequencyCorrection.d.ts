import { CableArchive, MonitoringDetail } from '../types';
export interface CorrectionResult {
    corrected_frequency: number | null;
    temperature_correction: number | null;
    wind_effect_estimate: number | null;
    deviation_from_design: number | null;
}
export declare function correctFrequency(rawFrequency: number | null, rawTemperature: number | null, windSpeed: number | null, cableArchive?: CableArchive): CorrectionResult;
export declare function detectTemperatureDrift(records: Array<{
    record_time: string;
    temperature: number | null;
}>, currentRecord: {
    record_time: string;
    temperature: number | null;
}): {
    isDrift: boolean;
    driftRate: number;
    explanation: string;
};
export declare function detectSensorBreak(currentRecord: {
    frequency: number | null;
    temperature: number | null;
}, previousRecord?: {
    frequency: number | null;
    temperature: number | null;
}): {
    isBreak: boolean;
    explanation: string;
};
export declare function detectWindMissing(windSpeed: number | null): {
    isMissing: boolean;
    explanation: string;
};
export declare function analyzeTrend(currentDetail: MonitoringDetail, historicalDetails: MonitoringDetail[]): {
    trend: string;
    comparison: string;
};
