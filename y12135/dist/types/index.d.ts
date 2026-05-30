export interface Sensor {
    id: string;
    sensor_code: string;
    cable_id?: string;
    installation_date: string;
    status: 'active' | 'inactive' | 'maintenance';
    location: string;
    created_at: string;
}
export interface TemperatureRecord {
    id: string;
    sensor_id: string;
    record_time: string;
    temperature: number | null;
    frequency: number | null;
    wind_speed: number | null;
    is_valid: boolean;
    import_batch_id: string;
    created_at: string;
}
export interface CableArchive {
    id: string;
    cable_code: string;
    cable_name: string;
    design_frequency: number;
    material: string;
    length: number;
    tension: number;
    diameter: number;
    temperature_coefficient: number;
    reference_temperature: number;
    installation_date: string;
    import_batch_id: string;
    created_at: string;
}
export interface MonitoringDetail {
    id: string;
    temperature_record_id: string;
    sensor_id: string;
    cable_id?: string;
    record_time: string;
    raw_frequency: number | null;
    raw_temperature: number | null;
    wind_speed: number | null;
    corrected_frequency: number | null;
    temperature_correction: number | null;
    wind_effect_estimate: number | null;
    deviation_from_design: number | null;
    anomaly_score: number;
    is_anomaly: boolean;
    anomaly_cause?: string;
    trend_comparison?: string;
    status: 'pending' | 'normal' | 'warning' | 'critical' | 'resolved';
    import_phase: number;
    affected_by_cable_archive: boolean;
    detection_version: number;
    created_at: string;
    updated_at: string;
}
export interface AnomalyDetectionResult {
    id: string;
    detail_id: string;
    detection_version: number;
    is_anomaly: boolean;
    anomaly_score: number;
    anomaly_type: 'temperature_drift' | 'sensor_break' | 'wind_missing' | 'wind_induced' | 'structural_damage' | 'normal';
    cause_explanation: string;
    trend_analysis: string;
    confidence: number;
    created_at: string;
}
export interface ImportBatch {
    id: string;
    batch_type: 'sensor_sequence' | 'temperature_records' | 'cable_archive';
    phase: number;
    record_count: number;
    imported_at: string;
    imported_by: string;
}
export interface ChangeLog {
    id: string;
    detail_id: string;
    field_name: string;
    old_value?: string;
    new_value?: string;
    change_reason: string;
    changed_at: string;
}
export type ImportPhase1Data = {
    sensors: Omit<Sensor, 'id' | 'created_at'>[];
    temperatureRecords: Omit<TemperatureRecord, 'id' | 'is_valid' | 'import_batch_id' | 'created_at'>[];
};
export type ImportPhase2Data = {
    cableArchives: Omit<CableArchive, 'id' | 'import_batch_id' | 'created_at'>[];
};
