const { v4: uuidv4 } = require('uuid');
const { getDb, runQuery, getQuery, allQuery } = require('./database');
const DataCleaner = require('./dataCleaner');
const AnomalyAnalyzer = require('./anomalyAnalyzer');
const HeatLoadAnalyzer = require('./heatLoadAnalyzer');

class AnalysisService {
  constructor() {
    this.db = getDb();
    this.dataCleaner = new DataCleaner();
    this.anomalyAnalyzer = new AnomalyAnalyzer();
  }

  async runAnalysis(coldStorageId, rawData, config = {}) {
    const sessionId = uuidv4();
    const analysisTime = new Date().toISOString();

    await runQuery('BEGIN');

    try {
      await runQuery(`
        INSERT INTO analysis_sessions (id, cold_storage_id, analysis_time, status, metadata)
        VALUES (?, ?, ?, ?, ?)
      `, [sessionId, coldStorageId, analysisTime, 'processing', JSON.stringify(config)]);

      const cleanedData = this.cleanAndStoreDataSync(sessionId, rawData);

      const anomalies = this.analyzeAnomalies(cleanedData);
      await this.storeAnomalies(sessionId, anomalies);

      const heatLoadSlots = this.analyzeHeatLoad(cleanedData, config);
      await this.storeHeatLoadEstimates(sessionId, heatLoadSlots);

      const updatedAnomalies = new HeatLoadAnalyzer(config)
        .updateAttributionWithHeatLoad(anomalies, heatLoadSlots);
      await this.updateAnomalyAttributions(sessionId, updatedAnomalies);

      const energySummary = this.calculateEnergyConsumption(cleanedData);
      await this.storeEnergyConsumption(sessionId, energySummary);

      const analysisResult = {
        session_id: sessionId,
        cold_storage_id: coldStorageId,
        analysis_time: analysisTime,
        summary: {
          total_defrosts: cleanedData.defrostRecords.length,
          total_anomalies: anomalies.length,
          anomaly_breakdown: this.getAnomalyBreakdown(anomalies),
          total_energy_kwh: energySummary.total_energy_kwh,
          defrost_energy_ratio: energySummary.defrost_energy_ratio,
          data_quality_warnings: cleanedData.warnings
        },
        anomalies: anomalies.map(a => ({
          ...a,
          attribution: JSON.parse(a.attribution),
          correction_suggestions: JSON.parse(a.correction_suggestions),
          related_records: JSON.parse(a.related_records)
        })),
        heat_load: {
          slots: heatLoadSlots,
          trend: new HeatLoadAnalyzer(config).analyzeTrend(heatLoadSlots)
        },
        energy: energySummary
      };

      await runQuery(`
        INSERT INTO analysis_results (session_id, result_type, result_data, confidence)
        VALUES (?, ?, ?, ?)
      `, [sessionId, 'full_analysis', JSON.stringify(analysisResult), 0.85]);

      await runQuery(`
        UPDATE analysis_sessions SET status = 'completed' WHERE id = ?
      `, [sessionId]);

      await runQuery('COMMIT');

      return analysisResult;
    } catch (error) {
      await runQuery('ROLLBACK');
      throw error;
    }
  }

  cleanAndStoreDataSync(sessionId, rawData) {
    const allWarnings = [];

    const defrostRecords = this.dataCleaner.cleanDefrostRecords(
      rawData.defrost_records || []
    );
    allWarnings.push(...this.dataCleaner.getWarnings());

    const temperatureReadings = this.dataCleaner.cleanTemperatureReadings(
      rawData.temperature_readings || []
    );
    allWarnings.push(...this.dataCleaner.getWarnings());

    const fanRecords = this.dataCleaner.cleanFanStatusRecords(
      rawData.fan_status || [],
      defrostRecords[0]?.start_time
    );
    allWarnings.push(...this.dataCleaner.getWarnings());

    const doorRecords = this.dataCleaner.cleanDoorStatusRecords(
      rawData.door_status || []
    );
    allWarnings.push(...this.dataCleaner.getWarnings());

    this.storeCleanedDataSync(sessionId, {
      defrostRecords,
      temperatureReadings,
      fanRecords,
      doorRecords
    });

    return {
      defrostRecords,
      temperatureReadings,
      fanRecords,
      doorRecords,
      warnings: allWarnings
    };
  }

  storeCleanedDataSync(sessionId, data) {
    const stmt = this.db.prepare(`
      INSERT INTO defrost_records (
        session_id, record_id, start_time, end_time, duration_seconds,
        energy_consumption, evaporator_temp_before, evaporator_temp_after,
        status, fan_status, remarks, is_manual, data_quality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    data.defrostRecords.forEach(r => {
      stmt.run(
        sessionId, r.record_id, r.start_time, r.end_time, r.duration_seconds,
        r.energy_consumption, r.evaporator_temp_before, r.evaporator_temp_after,
        r.status, r.fan_status, r.remarks, r.is_manual ? 1 : 0, r.data_quality
      );
    });

    const tempStmt = this.db.prepare(`
      INSERT INTO temperature_readings (
        session_id, probe_id, reading_time, temperature, remarks, is_offline, data_quality
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    data.temperatureReadings.forEach(r => {
      tempStmt.run(
        sessionId, r.probe_id, r.reading_time, r.temperature,
        r.remarks, r.is_offline ? 1 : 0, r.data_quality
      );
    });

    const fanStmt = this.db.prepare(`
      INSERT INTO fan_status_records (
        session_id, fan_id, status_time, status, speed_percent, delay_seconds
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    data.fanRecords.forEach(r => {
      fanStmt.run(
        sessionId, r.fan_id, r.status_time, r.status,
        r.speed_percent, r.delay_seconds
      );
    });

    const doorStmt = this.db.prepare(`
      INSERT INTO door_status_records (
        session_id, door_id, event_time, is_open, duration_seconds
      ) VALUES (?, ?, ?, ?, ?)
    `);

    data.doorRecords.forEach(r => {
      doorStmt.run(
        sessionId, r.door_id, r.event_time, r.is_open ? 1 : 0, r.duration_seconds
      );
    });
  }

  analyzeAnomalies(cleanedData) {
    this.anomalyAnalyzer.clearAnomalies();

    const overlaps = this.anomalyAnalyzer.detectDefrostOverlap(cleanedData.defrostRecords);
    const offline = this.anomalyAnalyzer.detectProbeOffline(cleanedData.temperatureReadings);
    const doorAnomalies = this.anomalyAnalyzer.detectDoorOpenTooLong(cleanedData.doorRecords);
    const energyAnomalies = this.anomalyAnalyzer.detectAbnormalDefrostEnergy(cleanedData.defrostRecords);
    const fanDelays = this.anomalyAnalyzer.detectFanDelay(cleanedData.fanRecords, cleanedData.defrostRecords);

    return this.anomalyAnalyzer.getAllAnomalies();
  }

  async storeAnomalies(sessionId, anomalies) {
    const stmt = this.db.prepare(`
      INSERT INTO anomaly_records (
        session_id, anomaly_type, severity, start_time, end_time,
        description, attribution, correction_suggestions, related_records
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    anomalies.forEach(a => {
      stmt.run(
        sessionId, a.anomaly_type, a.severity, a.start_time, a.end_time,
        a.description, a.attribution, a.correction_suggestions, a.related_records
      );
    });
  }

  async updateAnomalyAttributions(sessionId, anomalies) {
    const stmt = this.db.prepare(`
      UPDATE anomaly_records 
      SET attribution = ?
      WHERE session_id = ? AND anomaly_type = ? AND start_time = ?
    `);

    anomalies.forEach(a => {
      stmt.run(a.attribution, sessionId, a.anomaly_type, a.start_time);
    });
  }

  analyzeHeatLoad(cleanedData, config) {
    const heatLoadAnalyzer = new HeatLoadAnalyzer(config);

    if (cleanedData.defrostRecords.length === 0) {
      return [];
    }

    const startTime = cleanedData.defrostRecords[0].start_time;
    const endTime = cleanedData.defrostRecords[cleanedData.defrostRecords.length - 1].end_time;

    return heatLoadAnalyzer.analyzeTimeSlots(startTime, endTime, cleanedData);
  }

  async storeHeatLoadEstimates(sessionId, slots) {
    const stmt = this.db.prepare(`
      INSERT INTO heat_load_estimates (
        session_id, time_slot, start_time, end_time, total_heat_load_kw,
        door_infiltration, defrost_heat, product_heat, ambient_heat,
        fan_heat, lighting_heat
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    slots.forEach(s => {
      stmt.run(
        sessionId, s.time_slot, s.start_time, s.end_time, s.total_heat_load_kw,
        s.door_infiltration, s.defrost_heat, s.product_heat, s.ambient_heat,
        s.fan_heat, s.lighting_heat
      );
    });
  }

  calculateEnergyConsumption(cleanedData) {
    const totalDefrostEnergy = cleanedData.defrostRecords.reduce(
      (sum, r) => sum + (r.energy_consumption || 0), 0
    );

    const analysisDurationHours = cleanedData.defrostRecords.length > 1 ?
      (new Date(cleanedData.defrostRecords[cleanedData.defrostRecords.length - 1].end_time) -
       new Date(cleanedData.defrostRecords[0].start_time)) / 3600000 : 24;

    const coolingEnergy = analysisDurationHours * 5;
    const fanEnergy = analysisDurationHours * 1.5;
    const totalEnergy = totalDefrostEnergy + coolingEnergy + fanEnergy;

    return {
      period_start: cleanedData.defrostRecords[0]?.start_time,
      period_end: cleanedData.defrostRecords[cleanedData.defrostRecords.length - 1]?.end_time,
      total_energy_kwh: parseFloat(totalEnergy.toFixed(2)),
      defrost_energy_kwh: parseFloat(totalDefrostEnergy.toFixed(2)),
      cooling_energy_kwh: parseFloat(coolingEnergy.toFixed(2)),
      fan_energy_kwh: parseFloat(fanEnergy.toFixed(2)),
      defrost_energy_ratio: parseFloat((totalDefrostEnergy / totalEnergy * 100).toFixed(1))
    };
  }

  async storeEnergyConsumption(sessionId, summary) {
    await runQuery(`
      INSERT INTO energy_consumption (
        session_id, period_start, period_end, total_energy_kwh,
        defrost_energy_kwh, cooling_energy_kwh, fan_energy_kwh,
        defrost_energy_ratio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessionId, summary.period_start, summary.period_end,
      summary.total_energy_kwh, summary.defrost_energy_kwh,
      summary.cooling_energy_kwh, summary.fan_energy_kwh,
      summary.defrost_energy_ratio
    ]);
  }

  getAnomalyBreakdown(anomalies) {
    const breakdown = {};
    anomalies.forEach(a => {
      breakdown[a.anomaly_type] = (breakdown[a.anomaly_type] || 0) + 1;
    });
    return breakdown;
  }

  async getAnalysisSession(sessionId) {
    const session = await getQuery(`
      SELECT * FROM analysis_sessions WHERE id = ?
    `, [sessionId]);

    if (!session) return null;

    const result = await getQuery(`
      SELECT * FROM analysis_results WHERE session_id = ? AND result_type = 'full_analysis'
    `, [sessionId]);

    if (result) {
      return JSON.parse(result.result_data);
    }

    return session;
  }

  async listSessions(coldStorageId, limit = 20, offset = 0) {
    let query = 'SELECT * FROM analysis_sessions';
    const params = [];

    if (coldStorageId) {
      query += ' WHERE cold_storage_id = ?';
      params.push(coldStorageId);
    }

    query += ' ORDER BY analysis_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await allQuery(query, params);
  }

  async compareSessions(baseSessionId, modifiedSessionId) {
    const baseResult = await getQuery(`
      SELECT result_data FROM analysis_results 
      WHERE session_id = ? AND result_type = 'full_analysis'
    `, [baseSessionId]);

    const modifiedResult = await getQuery(`
      SELECT result_data FROM analysis_results 
      WHERE session_id = ? AND result_type = 'full_analysis'
    `, [modifiedSessionId]);

    if (!baseResult || !modifiedResult) {
      throw new Error('One or both sessions not found');
    }

    const base = JSON.parse(baseResult.result_data);
    const modified = JSON.parse(modifiedResult.result_data);

    const comparison = this.generateComparison(base, modified);

    const comparisonId = uuidv4();
    await runQuery(`
      INSERT INTO version_comparisons (id, base_session_id, modified_session_id, comparison_data)
      VALUES (?, ?, ?, ?)
    `, [comparisonId, baseSessionId, modifiedSessionId, JSON.stringify(comparison)]);

    return {
      comparison_id: comparisonId,
      ...comparison
    };
  }

  generateComparison(base, modified) {
    const changes = {
      anomalies: {
        added: [],
        removed: [],
        modified: []
      },
      energy: {},
      heat_load: {}
    };

    const baseAnomalyKeys = base.anomalies.map(a => 
      `${a.anomaly_type}_${a.start_time}`
    );
    const modifiedAnomalyKeys = modified.anomalies.map(a => 
      `${a.anomaly_type}_${a.start_time}`
    );

    modified.anomalies.forEach(a => {
      const key = `${a.anomaly_type}_${a.start_time}`;
      if (!baseAnomalyKeys.includes(key)) {
        changes.anomalies.added.push(a);
      }
    });

    base.anomalies.forEach(a => {
      const key = `${a.anomaly_type}_${a.start_time}`;
      if (!modifiedAnomalyKeys.includes(key)) {
        changes.anomalies.removed.push(a);
      }
    });

    changes.energy = {
      base_total: base.energy.total_energy_kwh,
      modified_total: modified.energy.total_energy_kwh,
      change_percent: ((modified.energy.total_energy_kwh - base.energy.total_energy_kwh) / 
                       base.energy.total_energy_kwh * 100).toFixed(1),
      defrost_ratio_change: (modified.energy.defrost_energy_ratio - 
                             base.energy.defrost_energy_ratio).toFixed(1)
    };

    changes.heat_load = {
      base_avg: base.heat_load.trend?.average_kw,
      modified_avg: modified.heat_load.trend?.average_kw,
      trend_change: modified.heat_load.trend?.trend !== base.heat_load.trend?.trend ?
        `${base.heat_load.trend?.trend} -> ${modified.heat_load.trend?.trend}` : null
    };

    changes.summary = {
      total_anomalies_base: base.summary.total_anomalies,
      total_anomalies_modified: modified.summary.total_anomalies,
      anomaly_change: modified.summary.total_anomalies - base.summary.total_anomalies,
      has_significant_changes: changes.anomalies.added.length > 0 || 
                               changes.anomalies.removed.length > 0 ||
                               Math.abs(parseFloat(changes.energy.change_percent)) > 5
    };

    return changes;
  }
}

module.exports = AnalysisService;
