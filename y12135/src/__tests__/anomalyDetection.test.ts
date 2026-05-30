import { detectAnomaly, reanalyzeWithCableArchive } from '../services/anomalyDetection';
import {
  TemperatureRecord,
  CableArchive,
  MonitoringDetail
} from '../types';

describe('异常检测算法', () => {
  const baseTime = new Date('2026-05-01T00:00:00Z');

  const createTestRecord = (
    hour: number,
    freq: number | null,
    temp: number | null,
    wind: number | null,
    sensorId: string = 's-1'
  ): TemperatureRecord => ({
    id: `rec-${hour}`,
    sensor_id: sensorId,
    record_time: new Date(baseTime.getTime() + hour * 3600000).toISOString(),
    temperature: temp,
    frequency: freq,
    wind_speed: wind,
    is_valid: freq !== null && temp !== null,
    import_batch_id: 'batch-1',
    created_at: new Date().toISOString()
  });

  const testCable: CableArchive = {
    id: 'cable-1',
    cable_code: 'CABLE-001',
    cable_name: '测试拉索',
    design_frequency: 3.52,
    material: 'steel',
    length: 125.5,
    tension: 2850000,
    diameter: 0.12,
    temperature_coefficient: 0.000012,
    reference_temperature: 20,
    installation_date: '2020-01-01T00:00:00Z',
    import_batch_id: 'batch-2',
    created_at: new Date().toISOString()
  };

  describe('detectAnomaly', () => {
    it('正常数据检测为无异常', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(i, 3.5 + Math.sin(i / 6) * 0.05, 20 + i * 0.3, 5 + Math.random() * 3));
      }

      const currentRecord = records[9];
      const previousRecord = records[8];

      const { detail, detectionResult } = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: [],
          previousRecord
        },
        1
      );

      expect(detail.is_anomaly).toBe(false);
      expect(detectionResult.is_anomaly).toBe(false);
      expect(detectionResult.anomaly_type).toBe('normal');
      expect(detail.status).toBe('normal');
      expect(detail.anomaly_score).toBeLessThan(30);
    });

    it('温度漂移检测正确标记异常', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 15; i++) {
        records.push(createTestRecord(i, 3.5, 20 + Math.random() * 2, 5));
      }
      records.push(createTestRecord(15, 3.5, 50, 5));

      const currentRecord = records[15];
      const previousRecord = records[14];

      const { detail, detectionResult } = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: [],
          previousRecord
        },
        1
      );

      expect(detail.is_anomaly).toBe(true);
      expect(detectionResult.anomaly_type).toBe('temperature_drift');
      expect(detail.anomaly_cause).toContain('温度漂移');
    });

    it('传感器断点检测正确标记异常', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(i, 3.5, 20, 5));
      }
      records.push(createTestRecord(10, null, null, 5));

      const currentRecord = records[10];
      const previousRecord = records[9];

      const { detail, detectionResult } = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: [],
          previousRecord
        },
        1
      );

      expect(detail.is_anomaly).toBe(true);
      expect(detectionResult.anomaly_type).toBe('sensor_break');
      expect(detail.status).toBe('critical');
      expect(detail.anomaly_score).toBeGreaterThanOrEqual(80);
    });

    it('风速缺测检测正确标记异常', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(i, 3.5, 20, 5));
      }
      records.push(createTestRecord(10, 3.5, 20, null));

      const currentRecord = records[10];
      const previousRecord = records[9];

      const { detail, detectionResult } = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: [],
          previousRecord
        },
        1
      );

      expect(detail.is_anomaly).toBe(true);
      expect(detectionResult.anomaly_type).toBe('wind_missing');
      expect(detail.anomaly_cause).toContain('风速数据缺失');
    });

    it('结构损伤（大偏差）检测正确', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(i, 3.5, 20, 5));
      }
      records.push(createTestRecord(10, 2.8, 20, 5));

      const currentRecord = records[10];
      const previousRecord = records[9];

      const { detail, detectionResult } = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: [],
          previousRecord
        },
        1
      );

      expect(detail.is_anomaly).toBe(true);
      expect(detectionResult.anomaly_type).toBe('structural_damage');
      expect(detail.status).toBe('critical');
      expect(detail.anomaly_score).toBeGreaterThan(70);
    });

    it('无桥索档案时置信度降低', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(i, 3.5, 20, 5));
      }

      const currentRecord = records[9];

      const { detectionResult: resultWithoutArchive } = detectAnomaly(
        currentRecord,
        {
          allRecords: records,
          allDetails: [],
          previousRecord: records[8]
        },
        1
      );

      const { detectionResult: resultWithArchive } = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: [],
          previousRecord: records[8]
        },
        1
      );

      expect(resultWithoutArchive.confidence).toBeLessThan(resultWithArchive.confidence);
      expect(resultWithArchive.confidence - resultWithoutArchive.confidence).toBe(25);
    });

    it('重复检测返回相同结果（确定性）', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(i, 3.52, 20, 8));
      }

      const currentRecord = records[9];

      const result1 = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: [],
          previousRecord: records[8]
        },
        1
      );

      const result2 = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: [],
          previousRecord: records[8]
        },
        1
      );

      expect(result1.detail.anomaly_score).toBe(result2.detail.anomaly_score);
      expect(result1.detail.is_anomaly).toBe(result2.detail.is_anomaly);
      expect(result1.detectionResult.anomaly_type).toBe(result2.detectionResult.anomaly_type);
    });

    it('异常原因随检测条件变化而变化', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(i, 3.5, 20, 5));
      }

      const currentRecord = createTestRecord(10, 3.72, 20, 15);

      const resultWithoutWind = detectAnomaly(
        { ...currentRecord, wind_speed: null },
        {
          cableArchive: testCable,
          allRecords: [...records, currentRecord],
          allDetails: []
        },
        1
      );

      const resultWithWind = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: [...records, currentRecord],
          allDetails: []
        },
        1
      );

      expect(resultWithoutWind.detectionResult.anomaly_type).toBe('wind_missing');
      expect(resultWithWind.detectionResult.anomaly_type).not.toBe('wind_missing');
      expect(resultWithoutWind.detail.anomaly_cause).not.toBe(resultWithWind.detail.anomaly_cause);
    });

    it('趋势对比随检测条件变化而变化', () => {
      const baseFreq = 3.5;
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push(createTestRecord(i, baseFreq + i * 0.01, 20, 5));
      }

      const currentRecord = createTestRecord(10, 3.7, 20, 5);

      const stableDetails: MonitoringDetail[] = [];
      for (let i = 0; i < 5; i++) {
        stableDetails.push({
          id: `detail-${i}`,
          temperature_record_id: `rec-${i}`,
          sensor_id: 's-1',
          record_time: records[i].record_time,
          raw_frequency: records[i].frequency,
          raw_temperature: records[i].temperature,
          wind_speed: records[i].wind_speed,
          corrected_frequency: 3.5 + i * 0.005,
          temperature_correction: 0,
          wind_effect_estimate: 0.1,
          deviation_from_design: 0,
          anomaly_score: 0,
          is_anomaly: false,
          anomaly_cause: '',
          trend_comparison: '',
          status: 'normal',
          import_phase: 1,
          affected_by_cable_archive: false,
          detection_version: 1,
          created_at: '',
          updated_at: ''
        });
      }

      const risingDetails: MonitoringDetail[] = [];
      for (let i = 0; i < 5; i++) {
        risingDetails.push({
          id: `detail-${i}`,
          temperature_record_id: `rec-${i}`,
          sensor_id: 's-1',
          record_time: records[i].record_time,
          raw_frequency: records[i].frequency,
          raw_temperature: records[i].temperature,
          wind_speed: records[i].wind_speed,
          corrected_frequency: 3.5 + i * 0.05,
          temperature_correction: 0,
          wind_effect_estimate: 0.1,
          deviation_from_design: 0,
          anomaly_score: 0,
          is_anomaly: false,
          anomaly_cause: '',
          trend_comparison: '',
          status: 'normal',
          import_phase: 1,
          affected_by_cable_archive: false,
          detection_version: 1,
          created_at: '',
          updated_at: ''
        });
      }

      const result1 = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: stableDetails
        },
        1
      );

      const result2 = detectAnomaly(
        currentRecord,
        {
          cableArchive: testCable,
          allRecords: records,
          allDetails: risingDetails
        },
        1
      );

      expect(result1.detail.trend_comparison).not.toBe(result2.detail.trend_comparison);
    });
  });

  describe('reanalyzeWithCableArchive', () => {
    it('补录桥索档案后正确更新明细', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 5; i++) {
        records.push(createTestRecord(i, 3.5, 25, 8));
      }

      const phase1Detail: MonitoringDetail = {
        id: 'detail-1',
        temperature_record_id: records[4].id,
        sensor_id: 's-1',
        record_time: records[4].record_time,
        raw_frequency: 3.5,
        raw_temperature: 25,
        wind_speed: 8,
        corrected_frequency: 3.5,
        temperature_correction: null,
        wind_effect_estimate: 0.015,
        deviation_from_design: null,
        anomaly_score: 10,
        is_anomaly: false,
        anomaly_cause: '无异常',
        trend_comparison: '稳定：...',
        status: 'normal',
        import_phase: 1,
        affected_by_cable_archive: false,
        detection_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { updatedDetail, newDetectionResult, changes } = reanalyzeWithCableArchive(
        phase1Detail,
        testCable,
        records,
        []
      );

      expect(updatedDetail.cable_id).toBe(testCable.id);
      expect(updatedDetail.temperature_correction).not.toBeNull();
      expect(updatedDetail.deviation_from_design).not.toBeNull();
      expect(updatedDetail.import_phase).toBe(2);
      expect(updatedDetail.affected_by_cable_archive).toBe(true);
      expect(updatedDetail.detection_version).toBe(2);

      expect(newDetectionResult.detection_version).toBe(2);
      expect(newDetectionResult.detail_id).toBe('detail-1');

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some(c => c.field === 'cable_id')).toBe(true);
      expect(changes.some(c => c.field === 'temperature_correction')).toBe(true);
      expect(changes.some(c => c.field === 'deviation_from_design')).toBe(true);
    });

    it('补录桥索档案后异常状态可能改变', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 5; i++) {
        records.push(createTestRecord(i, 3.5, 20, 5));
      }
      records.push(createTestRecord(5, 2.9, 20, 5));

      const phase1Detail: MonitoringDetail = {
        id: 'detail-2',
        temperature_record_id: records[5].id,
        sensor_id: 's-1',
        record_time: records[5].record_time,
        raw_frequency: 2.9,
        raw_temperature: 20,
        wind_speed: 5,
        corrected_frequency: 2.9,
        temperature_correction: null,
        wind_effect_estimate: 0.01,
        deviation_from_design: null,
        anomaly_score: 20,
        is_anomaly: false,
        anomaly_cause: '无异常',
        status: 'normal',
        import_phase: 1,
        affected_by_cable_archive: false,
        detection_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { updatedDetail, changes } = reanalyzeWithCableArchive(
        phase1Detail,
        testCable,
        records,
        []
      );

      expect(updatedDetail.is_anomaly).toBe(true);
      expect(changes.some(c => c.field === 'is_anomaly' && c.oldValue === '否' && c.newValue === '是')).toBe(true);
      expect(changes.some(c => c.field === 'status' && c.oldValue === 'normal')).toBe(true);
    });

    it('多次重复补录操作结果一致', () => {
      const records: TemperatureRecord[] = [];
      for (let i = 0; i < 5; i++) {
        records.push(createTestRecord(i, 3.5, 25, 8));
      }

      const phase1Detail: MonitoringDetail = {
        id: 'detail-3',
        temperature_record_id: records[4].id,
        sensor_id: 's-1',
        record_time: records[4].record_time,
        raw_frequency: 3.5,
        raw_temperature: 25,
        wind_speed: 8,
        corrected_frequency: 3.5,
        temperature_correction: null,
        wind_effect_estimate: null,
        deviation_from_design: null,
        anomaly_score: 10,
        is_anomaly: false,
        status: 'normal',
        import_phase: 1,
        affected_by_cable_archive: false,
        detection_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result1 = reanalyzeWithCableArchive(phase1Detail, testCable, records, []);
      const result2 = reanalyzeWithCableArchive(phase1Detail, testCable, records, []);

      expect(result1.updatedDetail.anomaly_score).toBe(result2.updatedDetail.anomaly_score);
      expect(result1.updatedDetail.is_anomaly).toBe(result2.updatedDetail.is_anomaly);
      expect(result1.changes.length).toBe(result2.changes.length);
      expect(result1.newDetectionResult.anomaly_type).toBe(result2.newDetectionResult.anomaly_type);
    });

    it('正确标记受桥索档案影响的字段变更原因', () => {
      const records: TemperatureRecord[] = [createTestRecord(0, 3.5, 25, 8)];

      const phase1Detail: MonitoringDetail = {
        id: 'detail-4',
        temperature_record_id: records[0].id,
        sensor_id: 's-1',
        record_time: records[0].record_time,
        raw_frequency: 3.5,
        raw_temperature: 25,
        wind_speed: 8,
        corrected_frequency: 3.5,
        temperature_correction: null,
        wind_effect_estimate: null,
        deviation_from_design: null,
        anomaly_score: 10,
        is_anomaly: false,
        status: 'normal',
        import_phase: 1,
        affected_by_cable_archive: false,
        detection_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { changes } = reanalyzeWithCableArchive(phase1Detail, testCable, records, []);

      const cableIdChange = changes.find(c => c.field === 'cable_id');
      expect(cableIdChange?.reason).toContain('补录桥索档案');

      const tempCorrectionChange = changes.find(c => c.field === 'temperature_correction');
      expect(tempCorrectionChange?.reason).toContain('温度系数');

      const deviationChange = changes.find(c => c.field === 'deviation_from_design');
      expect(deviationChange?.reason).toContain('设计频率');
    });
  });
});
