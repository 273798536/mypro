import { MonitoringRepository } from '../repositories/monitoringRepository';
import { detectAnomaly, reanalyzeWithCableArchive } from './anomalyDetection';
import {
  Sensor,
  TemperatureRecord,
  CableArchive,
  MonitoringDetail,
  ImportPhase1Data,
  ImportPhase2Data,
  ChangeLog
} from '../types';

export class MonitoringService {
  constructor(private repository: MonitoringRepository) {}

  async importPhase1(data: ImportPhase1Data, importedBy: string = 'system'): Promise<{
    sensors: Sensor[];
    temperatureRecords: TemperatureRecord[];
    details: MonitoringDetail[];
    summary: {
      totalSensors: number;
      totalRecords: number;
      anomalies: number;
      phase1Comparison: {
        before: { anomalyCount: number; message: string };
        after: { anomalyCount: number; message: string };
      };
    };
  }> {
    const sensorBatch = await this.repository.createImportBatch(
      'sensor_sequence',
      1,
      data.sensors.length,
      importedBy
    );

    const sensors: Sensor[] = [];
    for (const sensorData of data.sensors) {
      const existingSensor = await this.repository.getSensorByCode(sensorData.sensor_code);
      if (existingSensor) {
        sensors.push(existingSensor);
      } else {
        const sensor = await this.repository.insertSensor(sensorData);
        sensors.push(sensor);
      }
    }

    const sensorCodeToId: Record<string, string> = {};
    sensors.forEach(s => { sensorCodeToId[s.sensor_code] = s.id; });

    const recordsWithSensorId = data.temperatureRecords.map(r => ({
      ...r,
      sensor_id: sensorCodeToId[r.sensor_id] || r.sensor_id
    }));

    const recordBatch = await this.repository.createImportBatch(
      'temperature_records',
      1,
      recordsWithSensorId.length,
      importedBy
    );

    const temperatureRecords: TemperatureRecord[] = [];
    for (const recordData of recordsWithSensorId) {
      const record = await this.repository.insertTemperatureRecord(recordData, recordBatch.id);
      temperatureRecords.push(record);
    }

    const allRecords = await this.repository.getTemperatureRecords();
    const allDetails = await this.repository.getMonitoringDetails();

    const details: MonitoringDetail[] = [];
    const sortedRecords = [...temperatureRecords].sort((a, b) =>
      new Date(a.record_time).getTime() - new Date(b.record_time).getTime()
    );

    for (let i = 0; i < sortedRecords.length; i++) {
      const record = sortedRecords[i];
      const previousRecord = i > 0 ? sortedRecords[i - 1] : undefined;

      const { detail, detectionResult } = detectAnomaly(
        record,
        {
          allRecords,
          allDetails: [...allDetails, ...details],
          previousRecord
        },
        1
      );

      const savedDetail = await this.repository.insertMonitoringDetail(detail);
      details.push(savedDetail);

      detectionResult.detail_id = savedDetail.id;
      await this.repository.insertAnomalyDetectionResult(detectionResult);
    }

    const anomalyCount = details.filter(d => d.is_anomaly).length;

    return {
      sensors,
      temperatureRecords,
      details,
      summary: {
        totalSensors: sensors.length,
        totalRecords: temperatureRecords.length,
        anomalies: anomalyCount,
        phase1Comparison: {
          before: {
            anomalyCount: 0,
            message: '导入前无监测数据'
          },
          after: {
            anomalyCount,
            message: `第一阶段导入完成，共检测到 ${anomalyCount} 条异常记录。由于缺少桥索档案，暂无法进行精确的温度校正和设计频率对比。`
          }
        }
      }
    };
  }

  async importPhase2(data: ImportPhase2Data, importedBy: string = 'system'): Promise<{
    cableArchives: CableArchive[];
    affectedDetails: MonitoringDetail[];
    changeLogs: ChangeLog[];
    summary: {
      totalArchives: number;
      affectedDetails: number;
      reanalyzedDetails: number;
      phase2Comparison: {
        before: { anomalyCount: number; warningCount: number; criticalCount: number; message: string };
        after: { anomalyCount: number; warningCount: number; criticalCount: number; message: string };
        changes: string[];
      };
    };
  }> {
    const existingDetails = await this.repository.getMonitoringDetails();
    const beforeStats = {
      anomalyCount: existingDetails.filter(d => d.is_anomaly).length,
      warningCount: existingDetails.filter(d => d.status === 'warning').length,
      criticalCount: existingDetails.filter(d => d.status === 'critical').length,
    };

    const batch = await this.repository.createImportBatch(
      'cable_archive',
      2,
      data.cableArchives.length,
      importedBy
    );

    const cableArchives: CableArchive[] = [];
    for (const archiveData of data.cableArchives) {
      const existingArchive = await this.repository.getCableArchiveByCode(archiveData.cable_code);
      if (existingArchive) {
        cableArchives.push(existingArchive);
      } else {
        const archive = await this.repository.insertCableArchive(archiveData, batch.id);
        cableArchives.push(archive);
      }
    }

    const allRecords = await this.repository.getTemperatureRecords();
    const allDetails = await this.repository.getMonitoringDetails();
    const allSensors = await this.repository.getSensors();

    const sensorIdToSensor: Record<string, Sensor> = {};
    allSensors.forEach(s => { sensorIdToSensor[s.id] = s; });

    const affectedDetails: MonitoringDetail[] = [];
    const allChangeLogs: ChangeLog[] = [];

    function extractCableNumber(text: string): string | null {
      const match = text.match(/(\d+)(?:#|号)/);
      return match ? match[1] : null;
    }

    for (const archive of cableArchives) {
      const archiveCableNum = extractCableNumber(archive.cable_name);
      const phase1Details = allDetails.filter(d => {
        if (d.import_phase !== 1 || d.cable_id) return false;
        const sensor = sensorIdToSensor[d.sensor_id];
        if (!sensor) return false;
        const sensorCableNum = extractCableNumber(sensor.location || '');
        return archiveCableNum === sensorCableNum;
      });

      for (const detail of phase1Details) {
        try {
          const { updatedDetail, newDetectionResult, changes } = reanalyzeWithCableArchive(
            detail,
            archive,
            allRecords,
            allDetails
          );

          if (changes.length > 0) {
            await this.repository.updateMonitoringDetail(updatedDetail as any);
            await this.repository.insertAnomalyDetectionResult(newDetectionResult);

            for (const change of changes) {
              const log = await this.repository.insertChangeLog(
                detail.id,
                change.field,
                change.oldValue,
                change.newValue,
                change.reason
              );
              allChangeLogs.push(log);
            }

            const updatedFullDetail = await this.repository.getMonitoringDetailById(detail.id);
            if (updatedFullDetail) {
              affectedDetails.push(updatedFullDetail);
            }
          }
        } catch (e) {
          console.error(`重新分析明细 ${detail.id} 时出错:`, e);
        }
      }
    }

    const updatedAllDetails = await this.repository.getMonitoringDetails();
    const afterStats = {
      anomalyCount: updatedAllDetails.filter(d => d.is_anomaly).length,
      warningCount: updatedAllDetails.filter(d => d.status === 'warning').length,
      criticalCount: updatedAllDetails.filter(d => d.status === 'critical').length,
    };

    const changes: string[] = [];
    if (afterStats.anomalyCount !== beforeStats.anomalyCount) {
      const diff = afterStats.anomalyCount - beforeStats.anomalyCount;
      changes.push(`异常记录数 ${diff >= 0 ? '增加' : '减少'} ${Math.abs(diff)} 条`);
    }
    if (afterStats.criticalCount !== beforeStats.criticalCount) {
      const diff = afterStats.criticalCount - beforeStats.criticalCount;
      changes.push(`严重异常数 ${diff >= 0 ? '增加' : '减少'} ${Math.abs(diff)} 条`);
    }
    if (afterStats.warningCount !== beforeStats.warningCount) {
      const diff = afterStats.warningCount - beforeStats.warningCount;
      changes.push(`预警数 ${diff >= 0 ? '增加' : '减少'} ${Math.abs(diff)} 条`);
    }
    changes.push(`${affectedDetails.length} 条明细被桥索档案更新影响并重新分析`);

    return {
      cableArchives,
      affectedDetails,
      changeLogs: allChangeLogs,
      summary: {
        totalArchives: cableArchives.length,
        affectedDetails: affectedDetails.length,
        reanalyzedDetails: affectedDetails.length,
        phase2Comparison: {
          before: {
            ...beforeStats,
            message: `补录桥索档案前：异常 ${beforeStats.anomalyCount} 条，预警 ${beforeStats.warningCount} 条，严重 ${beforeStats.criticalCount} 条`
          },
          after: {
            ...afterStats,
            message: `补录桥索档案后：异常 ${afterStats.anomalyCount} 条，预警 ${afterStats.warningCount} 条，严重 ${afterStats.criticalCount} 条`
          },
          changes
        }
      }
    };
  }

  async getDetailWithHistory(id: string): Promise<{
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
  }> {
    const detail = await this.repository.getMonitoringDetailById(id);
    if (!detail) {
      throw new Error('监测明细不存在');
    }

    const detectionResults = await this.repository.getAnomalyDetectionResults(id);
    const changeLogs = await this.repository.getChangeLogs(id);

    return {
      detail,
      detectionHistory: detectionResults.map(r => ({
        version: r.detection_version,
        is_anomaly: r.is_anomaly,
        anomaly_score: r.anomaly_score,
        anomaly_type: r.anomaly_type,
        cause_explanation: r.cause_explanation,
        trend_analysis: r.trend_analysis,
        confidence: r.confidence,
        created_at: r.created_at
      })),
      changeLogs
    };
  }

  async updateDetailStatus(id: string, status: MonitoringDetail['status'], reason: string): Promise<{
    detail: MonitoringDetail;
    changeLog: ChangeLog;
  }> {
    const existingDetail = await this.repository.getMonitoringDetailById(id);
    if (!existingDetail) {
      throw new Error('监测明细不存在');
    }

    const oldStatus = existingDetail.status;
    await this.repository.updateMonitoringDetailStatus(id, status);

    const changeLog = await this.repository.insertChangeLog(
      id,
      'status',
      oldStatus,
      status,
      reason
    );

    const updatedDetail = await this.repository.getMonitoringDetailById(id);
    if (!updatedDetail) {
      throw new Error('更新后明细不存在');
    }

    return {
      detail: updatedDetail,
      changeLog
    };
  }

  async exportResults(params?: {
    sensorId?: string;
    isAnomaly?: boolean;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Record<string, string>[]> {
    const details = await this.repository.getMonitoringDetails(params);
    const sensors = await this.repository.getSensors();
    const archives = await this.repository.getCableArchives();

    const sensorMap: Record<string, string> = {};
    sensors.forEach(s => { sensorMap[s.id] = s.sensor_code; });

    const archiveMap: Record<string, string> = {};
    archives.forEach(a => { archiveMap[a.id] = a.cable_code; });

    return details.map(d => {
      const record: Record<string, string> = {};
      record['记录时间'] = d.record_time;
      record['传感器编号'] = sensorMap[d.sensor_id] || d.sensor_id;
      record['桥索编号'] = d.cable_id ? (archiveMap[d.cable_id] || d.cable_id) : '未关联';
      record['原始频率(Hz)'] = d.raw_frequency !== null ? d.raw_frequency.toFixed(3) : '缺失';
      record['环境温度(°C)'] = d.raw_temperature !== null ? d.raw_temperature.toFixed(1) : '缺失';
      record['风速(m/s)'] = d.wind_speed !== null ? d.wind_speed.toFixed(1) : '缺失';
      record['校正后频率(Hz)'] = d.corrected_frequency !== null ? d.corrected_frequency.toFixed(3) : '未计算';
      record['温度校正量(Hz)'] = d.temperature_correction !== null ? d.temperature_correction.toFixed(4) : '未计算';
      record['风致振动影响(Hz)'] = d.wind_effect_estimate !== null ? d.wind_effect_estimate.toFixed(4) : '未计算';
      record['与设计值偏差(%)'] = d.deviation_from_design !== null ? `${d.deviation_from_design.toFixed(2)}%` : '未计算';
      record['异常评分'] = d.anomaly_score.toFixed(0);
      record['是否异常'] = d.is_anomaly ? '是' : '否';
      record['异常原因'] = d.anomaly_cause || '无';
      record['状态'] = this.getStatusLabel(d.status);
      record['导入阶段'] = `第${d.import_phase}阶段`;
      record['受桥索档案影响'] = d.affected_by_cable_archive ? '是' : '否';
      record['检测版本'] = `v${d.detection_version}`;
      record['趋势分析'] = d.trend_comparison || '无';
      return record;
    });
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待处理',
      normal: '正常',
      warning: '预警',
      critical: '严重',
      resolved: '已处理'
    };
    return labels[status] || status;
  }

  async getStatistics(): Promise<{
    totalSensors: number;
    totalRecords: number;
    totalAnomalies: number;
    statusBreakdown: Record<string, number>;
    anomalyTypeBreakdown: Record<string, number>;
    affectedByArchive: number;
    phase1Details: number;
    phase2Details: number;
  }> {
    const sensors = await this.repository.getSensors();
    const records = await this.repository.getTemperatureRecords();
    const details = await this.repository.getMonitoringDetails();
    const archives = await this.repository.getCableArchives();

    const statusBreakdown: Record<string, number> = {
      pending: 0,
      normal: 0,
      warning: 0,
      critical: 0,
      resolved: 0
    };
    details.forEach(d => { statusBreakdown[d.status]++; });

    const anomalyTypeBreakdown: Record<string, number> = {};
    const anomalyDetails = details.filter(d => d.is_anomaly);
    
    for (const d of anomalyDetails) {
      const results = await this.repository.getAnomalyDetectionResults(d.id);
      const latest = results[results.length - 1];
      if (latest) {
        anomalyTypeBreakdown[latest.anomaly_type] = (anomalyTypeBreakdown[latest.anomaly_type] || 0) + 1;
      }
    }

    return {
      totalSensors: sensors.length,
      totalRecords: records.length,
      totalAnomalies: anomalyDetails.length,
      statusBreakdown,
      anomalyTypeBreakdown,
      affectedByArchive: details.filter(d => d.affected_by_cable_archive).length,
      phase1Details: details.filter(d => d.import_phase === 1).length,
      phase2Details: details.filter(d => d.import_phase === 2).length
    };
  }
}
