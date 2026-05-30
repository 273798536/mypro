import { getDatabase, resetDatabase, closeDatabase } from '../db/database';
import { MonitoringRepository } from '../repositories/monitoringRepository';
import { MonitoringService } from '../services/monitoringService';
import { generateDeterministicPhase1Data, generateDeterministicPhase2Data } from '../services/sampleDataGenerator';
import { Database } from 'sqlite3';
import { MonitoringDetail } from '../types';

describe('两阶段导入集成测试', () => {
  let db: Database;
  let repository: MonitoringRepository;
  let service: MonitoringService;

  beforeEach(async () => {
    await resetDatabase();
    db = await getDatabase(true);
    repository = new MonitoringRepository(db);
    service = new MonitoringService(repository);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  describe('第一阶段导入（传感器 + 温度记录）', () => {
    it('成功导入传感器和温度记录', async () => {
      const data = generateDeterministicPhase1Data();
      const result = await service.importPhase1(data, 'test');

      expect(result.sensors.length).toBe(2);
      expect(result.temperatureRecords.length).toBe(48);
      expect(result.details.length).toBe(48);
      expect(result.summary.totalSensors).toBe(2);
      expect(result.summary.totalRecords).toBe(48);
    });

    it('第一阶段检测出温度漂移异常', async () => {
      const data = generateDeterministicPhase1Data();
      const result = await service.importPhase1(data, 'test');

      const tempDriftRecords = result.details.filter(d =>
        d.record_time === '2026-05-01T12:00:00.000Z' && d.raw_temperature === 50
      );

      expect(tempDriftRecords.length).toBeGreaterThan(0);
      expect(tempDriftRecords[0].is_anomaly).toBe(true);
      expect(tempDriftRecords[0].anomaly_cause).toContain('温度');
    });

    it('第一阶段检测出传感器断点', async () => {
      const data = generateDeterministicPhase1Data();
      const result = await service.importPhase1(data, 'test');

      const sensorBreakRecords = result.details.filter(d =>
        d.record_time === '2026-05-01T06:00:00.000Z' && d.raw_frequency === null
      );

      expect(sensorBreakRecords.length).toBeGreaterThan(0);
      expect(sensorBreakRecords[0].is_anomaly).toBe(true);
      expect(sensorBreakRecords[0].status).toBe('critical');
    });

    it('第一阶段检测出风速缺测', async () => {
      const data = generateDeterministicPhase1Data();
      const result = await service.importPhase1(data, 'test');

      const windMissingRecords = result.details.filter(d =>
        d.record_time === '2026-05-01T18:00:00.000Z' && d.wind_speed === null
      );

      expect(windMissingRecords.length).toBeGreaterThan(0);
      expect(windMissingRecords[0].is_anomaly).toBe(true);
      expect(windMissingRecords[0].anomaly_cause).toContain('风速');
    });

    it('第一阶段无桥索档案时 temperature_correction 为 null', async () => {
      const data = generateDeterministicPhase1Data();
      const result = await service.importPhase1(data, 'test');

      const normalRecords = result.details.filter(d => d.raw_frequency !== null && d.raw_temperature !== null);
      expect(normalRecords.length).toBeGreaterThan(0);
      normalRecords.forEach(r => {
        expect(r.temperature_correction).toBeNull();
        expect(r.deviation_from_design).toBeNull();
      });
    });

    it('第一阶段所有明细 import_phase 为 1', async () => {
      const data = generateDeterministicPhase1Data();
      const result = await service.importPhase1(data, 'test');

      result.details.forEach(d => {
        expect(d.import_phase).toBe(1);
      });
    });

    it('两次相同导入返回相同的异常数量（确定性）', async () => {
      const data = generateDeterministicPhase1Data();
      
      const result1 = await service.importPhase1(data, 'test');
      await closeDatabase();
      
      await resetDatabase();
      db = await getDatabase(true);
      repository = new MonitoringRepository(db);
      service = new MonitoringService(repository);
      
      const result2 = await service.importPhase1(data, 'test');

      expect(result1.summary.anomalies).toBe(result2.summary.anomalies);
      
      const sensorIdToCode1: Record<string, string> = {};
      result1.sensors.forEach(s => { sensorIdToCode1[s.id] = s.sensor_code; });
      const sensorIdToCode2: Record<string, string> = {};
      result2.sensors.forEach(s => { sensorIdToCode2[s.id] = s.sensor_code; });
      
      const result1AnomalyIds = result1.details
        .filter(d => d.is_anomaly)
        .map(d => `${sensorIdToCode1[d.sensor_id]}-${d.record_time}`)
        .sort();
      const result2AnomalyIds = result2.details
        .filter(d => d.is_anomaly)
        .map(d => `${sensorIdToCode2[d.sensor_id]}-${d.record_time}`)
        .sort();
      
      expect(result1AnomalyIds).toEqual(result2AnomalyIds);
    });
  });

  describe('第二阶段导入（补录桥索档案）', () => {
    it('补录桥索档案后自动重分析受影响明细', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      await service.importPhase1(phase1Data, 'test');

      const phase2Data = generateDeterministicPhase2Data();
      const result = await service.importPhase2(phase2Data, 'test');

      expect(result.cableArchives.length).toBe(1);
      expect(result.affectedDetails.length).toBeGreaterThan(0);
      expect(result.changeLogs.length).toBeGreaterThan(0);
    });

    it('补录后 temperature_correction 和 deviation_from_design 有值', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      const phase1Result = await service.importPhase1(phase1Data, 'test');

      const beforeCount = phase1Result.details.filter(
        d => d.temperature_correction !== null && d.deviation_from_design !== null
      ).length;
      expect(beforeCount).toBe(0);

      const phase2Data = generateDeterministicPhase2Data();
      await service.importPhase2(phase2Data, 'test');

      const allDetails = await repository.getMonitoringDetails();
      const afterCount = allDetails.filter(
        d => d.temperature_correction !== null && d.deviation_from_design !== null
      ).length;
      expect(afterCount).toBeGreaterThan(0);
    });

    it('补录后受影响明细标记 affected_by_cable_archive = true', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      await service.importPhase1(phase1Data, 'test');

      const phase2Data = generateDeterministicPhase2Data();
      const result = await service.importPhase2(phase2Data, 'test');

      result.affectedDetails.forEach(d => {
        expect(d.affected_by_cable_archive).toBe(true);
        expect(d.import_phase).toBe(2);
        expect(d.detection_version).toBe(2);
      });
    });

    it('补录前后异常数量变化可追踪', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      await service.importPhase1(phase1Data, 'test');

      const beforeStats = await service.getStatistics();

      const phase2Data = generateDeterministicPhase2Data();
      const result = await service.importPhase2(phase2Data, 'test');

      const afterStats = await service.getStatistics();

      expect(result.summary.phase2Comparison.before.anomalyCount).toBe(beforeStats.totalAnomalies);
      expect(result.summary.phase2Comparison.after.anomalyCount).toBe(afterStats.totalAnomalies);
      expect(result.summary.phase2Comparison.changes.length).toBeGreaterThan(0);
    });

    it('变更日志记录所有字段变化', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      await service.importPhase1(phase1Data, 'test');

      const phase2Data = generateDeterministicPhase2Data();
      const result = await service.importPhase2(phase2Data, 'test');

      result.changeLogs.forEach(log => {
        expect(log.detail_id).toBeDefined();
        expect(log.field_name).toBeDefined();
        expect(log.change_reason).toBeDefined();
        expect(log.change_reason).toContain('桥索档案');
      });

      const fieldNames = [...new Set(result.changeLogs.map(l => l.field_name))];
      expect(fieldNames).toContain('cable_id');
      expect(fieldNames).toContain('temperature_correction');
      expect(fieldNames).toContain('deviation_from_design');
    });

    it('异常原因和趋势对比随补录而变化', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      const phase1Result = await service.importPhase1(phase1Data, 'test');

      const testRecord = phase1Result.details.find(
        d => d.record_time === '2026-05-01T12:00:00.000Z' && d.raw_temperature === 50
      );
      expect(testRecord).toBeDefined();
      const phase1Cause = testRecord!.anomaly_cause;
      const phase1Trend = testRecord!.trend_comparison;

      const phase2Data = generateDeterministicPhase2Data();
      await service.importPhase2(phase2Data, 'test');

      const updatedDetail = await service.getDetailWithHistory(testRecord!.id);
      const phase2Cause = updatedDetail.detail.anomaly_cause;
      const phase2Trend = updatedDetail.detail.trend_comparison;

      expect(phase2Cause).not.toBe(phase1Cause);
      expect(phase2Trend).not.toBe(phase1Trend);
    });

    it('检测历史保留多个版本', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      const phase1Result = await service.importPhase1(phase1Data, 'test');

      const testDetail = phase1Result.details[0];

      const phase2Data = generateDeterministicPhase2Data();
      await service.importPhase2(phase2Data, 'test');

      const detailWithHistory = await service.getDetailWithHistory(testDetail.id);

      expect(detailWithHistory.detectionHistory.length).toBeGreaterThanOrEqual(2);
      expect(detailWithHistory.detectionHistory[0].version).toBe(1);
      expect(detailWithHistory.detectionHistory[1].version).toBe(2);
    });

    it('两次完整两阶段导入结果一致', async () => {
      async function runFullImport() {
        await resetDatabase();
        db = await getDatabase(true);
        repository = new MonitoringRepository(db);
        service = new MonitoringService(repository);

        const phase1Data = generateDeterministicPhase1Data();
        const phase1Result = await service.importPhase1(phase1Data, 'test');

        const phase2Data = generateDeterministicPhase2Data();
        const phase2Result = await service.importPhase2(phase2Data, 'test');

        const stats = await service.getStatistics();

        return {
          phase1Anomalies: phase1Result.summary.anomalies,
          phase2Affected: phase2Result.affectedDetails.length,
          phase2Changes: phase2Result.changeLogs.length,
          finalAnomalies: stats.totalAnomalies,
          finalAffected: stats.affectedByArchive
        };
      }

      const result1 = await runFullImport();
      await closeDatabase();

      const result2 = await runFullImport();
      await closeDatabase();

      expect(result1).toEqual(result2);
    });
  });

  describe('明细查询和状态更新', () => {
    it('按异常状态筛选明细', async () => {
      const data = generateDeterministicPhase1Data();
      await service.importPhase1(data, 'test');

      const allDetails = await repository.getMonitoringDetails();
      const anomalyDetails = await repository.getMonitoringDetails({ isAnomaly: true });
      const normalDetails = await repository.getMonitoringDetails({ status: 'normal' });

      expect(anomalyDetails.length).toBeGreaterThan(0);
      expect(normalDetails.length).toBeGreaterThan(0);
      expect(anomalyDetails.length + normalDetails.length).toBeLessThanOrEqual(allDetails.length);
      anomalyDetails.forEach(d => expect(d.is_anomaly).toBe(true));
      normalDetails.forEach(d => expect(d.status).toBe('normal'));
    });

    it('按受桥索档案影响筛选明细', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      await service.importPhase1(phase1Data, 'test');

      const phase2Data = generateDeterministicPhase2Data();
      await service.importPhase2(phase2Data, 'test');

      const affectedDetails = await repository.getMonitoringDetails({ affectedByCableArchive: true });
      const unaffectedDetails = await repository.getMonitoringDetails({ affectedByCableArchive: false });

      expect(affectedDetails.length).toBeGreaterThan(0);
      expect(unaffectedDetails.length).toBeGreaterThan(0);
      affectedDetails.forEach(d => expect(d.affected_by_cable_archive).toBe(true));
      unaffectedDetails.forEach(d => expect(d.affected_by_cable_archive).toBe(false));
    });

    it('更新明细状态并记录变更', async () => {
      const data = generateDeterministicPhase1Data();
      const result = await service.importPhase1(data, 'test');

      const testDetail = result.details.find(d => d.is_anomaly);
      expect(testDetail).toBeDefined();

      const updateResult = await service.updateDetailStatus(
        testDetail!.id,
        'resolved',
        '工程师现场检查后确认无异常'
      );

      expect(updateResult.detail.status).toBe('resolved');
      expect(updateResult.changeLog.field_name).toBe('status');
      expect(updateResult.changeLog.old_value).toBe(testDetail!.status);
      expect(updateResult.changeLog.new_value).toBe('resolved');
      expect(updateResult.changeLog.change_reason).toBe('工程师现场检查后确认无异常');

      const detailWithHistory = await service.getDetailWithHistory(testDetail!.id);
      const statusChanges = detailWithHistory.changeLogs.filter(l => l.field_name === 'status');
      expect(statusChanges.length).toBeGreaterThan(0);
    });
  });

  describe('导出功能', () => {
    it('导出所有明细为JSON格式', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      await service.importPhase1(phase1Data, 'test');

      const phase2Data = generateDeterministicPhase2Data();
      await service.importPhase2(phase2Data, 'test');

      const exportData = await service.exportResults();

      expect(exportData.length).toBe(48);
      expect(exportData[0]).toHaveProperty('记录时间');
      expect(exportData[0]).toHaveProperty('传感器编号');
      expect(exportData[0]).toHaveProperty('校正后频率(Hz)');
      expect(exportData[0]).toHaveProperty('异常原因');
      expect(exportData[0]).toHaveProperty('受桥索档案影响');
    });

    it('按条件筛选导出', async () => {
      const phase1Data = generateDeterministicPhase1Data();
      await service.importPhase1(phase1Data, 'test');

      const allExport = await service.exportResults();
      const anomalyExport = await service.exportResults({ isAnomaly: true });

      expect(anomalyExport.length).toBeLessThan(allExport.length);
      anomalyExport.forEach(row => expect(row.是否异常).toBe('是'));
    });
  });
});
