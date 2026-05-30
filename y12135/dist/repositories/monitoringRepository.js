"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringRepository = void 0;
const uuid_1 = require("uuid");
function convertSqliteBooleans(row) {
    const converted = { ...row };
    if ('is_anomaly' in converted) {
        converted.is_anomaly = converted.is_anomaly === 1;
    }
    if ('affected_by_cable_archive' in converted) {
        converted.affected_by_cable_archive = converted.affected_by_cable_archive === 1;
    }
    return converted;
}
class MonitoringRepository {
    constructor(db) {
        this.db = db;
    }
    async createImportBatch(batchType, phase, recordCount, importedBy) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const batch = {
            id,
            batch_type: batchType,
            phase,
            record_count: recordCount,
            imported_at: now,
            imported_by: importedBy
        };
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO import_batches (id, batch_type, phase, record_count, imported_at, imported_by)
         VALUES (?, ?, ?, ?, ?, ?)`, [id, batchType, phase, recordCount, now, importedBy], (err) => {
                if (err)
                    reject(err);
                else
                    resolve(batch);
            });
        });
    }
    async insertSensor(sensor) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const fullSensor = { ...sensor, id, created_at: now };
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO sensors (id, sensor_code, cable_id, installation_date, status, location, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, sensor.sensor_code, sensor.cable_id || null, sensor.installation_date, sensor.status, sensor.location, now], (err) => {
                if (err)
                    reject(err);
                else
                    resolve(fullSensor);
            });
        });
    }
    async insertTemperatureRecord(record, importBatchId) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const isValid = record.frequency !== null && record.temperature !== null;
        const fullRecord = {
            ...record,
            id,
            is_valid: isValid,
            import_batch_id: importBatchId,
            created_at: now
        };
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO temperature_records (id, sensor_id, record_time, temperature, frequency, wind_speed, is_valid, import_batch_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, record.sensor_id, record.record_time, record.temperature, record.frequency, record.wind_speed, isValid ? 1 : 0, importBatchId, now], (err) => {
                if (err)
                    reject(err);
                else
                    resolve(fullRecord);
            });
        });
    }
    async insertCableArchive(archive, importBatchId) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const fullArchive = {
            ...archive,
            id,
            import_batch_id: importBatchId,
            created_at: now
        };
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO cable_archives (id, cable_code, cable_name, design_frequency, material, length, tension, diameter, temperature_coefficient, reference_temperature, installation_date, import_batch_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, archive.cable_code, archive.cable_name, archive.design_frequency, archive.material, archive.length, archive.tension, archive.diameter, archive.temperature_coefficient, archive.reference_temperature, archive.installation_date, importBatchId, now], (err) => {
                if (err)
                    reject(err);
                else
                    resolve(fullArchive);
            });
        });
    }
    async insertMonitoringDetail(detail) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const fullDetail = {
            ...detail,
            id,
            created_at: now,
            updated_at: now
        };
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO monitoring_details (
          id, temperature_record_id, sensor_id, cable_id, record_time,
          raw_frequency, raw_temperature, wind_speed, corrected_frequency,
          temperature_correction, wind_effect_estimate, deviation_from_design,
          anomaly_score, is_anomaly, anomaly_cause, trend_comparison, status,
          import_phase, affected_by_cable_archive, detection_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id, detail.temperature_record_id, detail.sensor_id, detail.cable_id || null, detail.record_time,
                detail.raw_frequency, detail.raw_temperature, detail.wind_speed, detail.corrected_frequency,
                detail.temperature_correction, detail.wind_effect_estimate, detail.deviation_from_design,
                detail.anomaly_score, detail.is_anomaly ? 1 : 0, detail.anomaly_cause || null, detail.trend_comparison || null, detail.status,
                detail.import_phase, detail.affected_by_cable_archive ? 1 : 0, detail.detection_version, now, now
            ], (err) => {
                if (err)
                    reject(err);
                else
                    resolve(fullDetail);
            });
        });
    }
    async insertAnomalyDetectionResult(result) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const fullResult = {
            ...result,
            id,
            created_at: now
        };
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO anomaly_detection_results (
          id, detail_id, detection_version, is_anomaly, anomaly_score,
          anomaly_type, cause_explanation, trend_analysis, confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id, result.detail_id, result.detection_version, result.is_anomaly ? 1 : 0, result.anomaly_score,
                result.anomaly_type, result.cause_explanation, result.trend_analysis, result.confidence, now
            ], (err) => {
                if (err)
                    reject(err);
                else
                    resolve(fullResult);
            });
        });
    }
    async insertChangeLog(detailId, fieldName, oldValue, newValue, changeReason) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const log = {
            id,
            detail_id: detailId,
            field_name: fieldName,
            old_value: oldValue,
            new_value: newValue,
            change_reason: changeReason,
            changed_at: now
        };
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO change_logs (id, detail_id, field_name, old_value, new_value, change_reason, changed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, detailId, fieldName, oldValue || null, newValue || null, changeReason, now], (err) => {
                if (err)
                    reject(err);
                else
                    resolve(log);
            });
        });
    }
    async getSensors() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM sensors ORDER BY sensor_code`, [], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async getSensorByCode(sensorCode) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM sensors WHERE sensor_code = ?`, [sensorCode], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    async getTemperatureRecords(sensorId) {
        const sql = sensorId
            ? `SELECT * FROM temperature_records WHERE sensor_id = ? ORDER BY record_time`
            : `SELECT * FROM temperature_records ORDER BY record_time`;
        const params = sensorId ? [sensorId] : [];
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async getCableArchives() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM cable_archives ORDER BY cable_code`, [], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async getCableArchiveByCode(cableCode) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM cable_archives WHERE cable_code = ?`, [cableCode], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    async getMonitoringDetails(params) {
        let sql = `SELECT * FROM monitoring_details WHERE 1=1`;
        const queryParams = [];
        if (params?.sensorId) {
            sql += ` AND sensor_id = ?`;
            queryParams.push(params.sensorId);
        }
        if (params?.cableId) {
            sql += ` AND cable_id = ?`;
            queryParams.push(params.cableId);
        }
        if (params?.isAnomaly !== undefined) {
            sql += ` AND is_anomaly = ?`;
            queryParams.push(params.isAnomaly ? 1 : 0);
        }
        if (params?.status) {
            sql += ` AND status = ?`;
            queryParams.push(params.status);
        }
        if (params?.affectedByCableArchive !== undefined) {
            sql += ` AND affected_by_cable_archive = ?`;
            queryParams.push(params.affectedByCableArchive ? 1 : 0);
        }
        if (params?.startDate) {
            sql += ` AND record_time >= ?`;
            queryParams.push(params.startDate);
        }
        if (params?.endDate) {
            sql += ` AND record_time <= ?`;
            queryParams.push(params.endDate);
        }
        sql += ` ORDER BY record_time DESC`;
        return new Promise((resolve, reject) => {
            this.db.all(sql, queryParams, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows.map(convertSqliteBooleans));
            });
        });
    }
    async getMonitoringDetailById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM monitoring_details WHERE id = ?`, [id], (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row ? convertSqliteBooleans(row) : undefined);
            });
        });
    }
    async getAnomalyDetectionResults(detailId) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM anomaly_detection_results WHERE detail_id = ? ORDER BY detection_version`, [detailId], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async getChangeLogs(detailId) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM change_logs WHERE detail_id = ? ORDER BY changed_at`, [detailId], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async updateMonitoringDetailStatus(id, status) {
        const now = new Date().toISOString();
        return new Promise((resolve, reject) => {
            this.db.run(`UPDATE monitoring_details SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async updateMonitoringDetail(detail) {
        const now = new Date().toISOString();
        const fields = [];
        const params = [];
        if (detail.cable_id !== undefined) {
            fields.push('cable_id = ?');
            params.push(detail.cable_id);
        }
        if (detail.corrected_frequency !== undefined) {
            fields.push('corrected_frequency = ?');
            params.push(detail.corrected_frequency);
        }
        if (detail.temperature_correction !== undefined) {
            fields.push('temperature_correction = ?');
            params.push(detail.temperature_correction);
        }
        if (detail.wind_effect_estimate !== undefined) {
            fields.push('wind_effect_estimate = ?');
            params.push(detail.wind_effect_estimate);
        }
        if (detail.deviation_from_design !== undefined) {
            fields.push('deviation_from_design = ?');
            params.push(detail.deviation_from_design);
        }
        if (detail.anomaly_score !== undefined) {
            fields.push('anomaly_score = ?');
            params.push(detail.anomaly_score);
        }
        if (detail.is_anomaly !== undefined) {
            fields.push('is_anomaly = ?');
            params.push(detail.is_anomaly ? 1 : 0);
        }
        if (detail.anomaly_cause !== undefined) {
            fields.push('anomaly_cause = ?');
            params.push(detail.anomaly_cause);
        }
        if (detail.trend_comparison !== undefined) {
            fields.push('trend_comparison = ?');
            params.push(detail.trend_comparison);
        }
        if (detail.status !== undefined) {
            fields.push('status = ?');
            params.push(detail.status);
        }
        if (detail.import_phase !== undefined) {
            fields.push('import_phase = ?');
            params.push(detail.import_phase);
        }
        if (detail.affected_by_cable_archive !== undefined) {
            fields.push('affected_by_cable_archive = ?');
            params.push(detail.affected_by_cable_archive ? 1 : 0);
        }
        if (detail.detection_version !== undefined) {
            fields.push('detection_version = ?');
            params.push(detail.detection_version);
        }
        fields.push('updated_at = ?');
        params.push(now);
        params.push(detail.id);
        return new Promise((resolve, reject) => {
            this.db.run(`UPDATE monitoring_details SET ${fields.join(', ')} WHERE id = ?`, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async getImportBatches() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM import_batches ORDER BY imported_at DESC`, [], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
}
exports.MonitoringRepository = MonitoringRepository;
//# sourceMappingURL=monitoringRepository.js.map