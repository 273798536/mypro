import {
  correctFrequency,
  detectTemperatureDrift,
  detectSensorBreak,
  detectWindMissing,
  analyzeTrend
} from '../services/frequencyCorrection';
import { CableArchive, MonitoringDetail } from '../types';

describe('频率校正算法', () => {
  const testCable: CableArchive = {
    id: 'test-cable-1',
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
    import_batch_id: 'batch-1',
    created_at: '2026-01-01T00:00:00Z'
  };

  describe('correctFrequency', () => {
    it('基础频率校正：温度校正 + 风致振动校正', () => {
      const result = correctFrequency(3.55, 25, 10, testCable);
      
      expect(result.corrected_frequency).not.toBeNull();
      expect(result.temperature_correction).toBeLessThan(0);
      expect(result.wind_effect_estimate).toBeGreaterThan(0);
      expect(result.deviation_from_design).not.toBeNull();
    });

    it('无桥索档案时不进行温度校正和偏差计算', () => {
      const result = correctFrequency(3.55, 25, 10);
      
      expect(result.temperature_correction).toBeNull();
      expect(result.deviation_from_design).toBeNull();
      expect(result.wind_effect_estimate).not.toBeNull();
    });

    it('原始频率为null时返回空结果', () => {
      const result = correctFrequency(null, 25, 10, testCable);
      
      expect(result.corrected_frequency).toBeNull();
      expect(result.temperature_correction).toBeNull();
      expect(result.wind_effect_estimate).toBeNull();
      expect(result.deviation_from_design).toBeNull();
    });

    it('温度为null时跳过温度校正', () => {
      const result = correctFrequency(3.55, null, 10, testCable);
      
      expect(result.temperature_correction).toBeNull();
      expect(result.corrected_frequency).not.toBeNull();
      expect(result.deviation_from_design).not.toBeNull();
    });

    it('风速为null时跳过风致振动校正', () => {
      const result = correctFrequency(3.55, 25, null, testCable);
      
      expect(result.wind_effect_estimate).toBeNull();
      expect(result.temperature_correction).not.toBeNull();
    });

    it('重复调用返回相同结果（确定性）', () => {
      const result1 = correctFrequency(3.55, 25, 10, testCable);
      const result2 = correctFrequency(3.55, 25, 10, testCable);
      
      expect(result1).toEqual(result2);
    });

    it('低温下温度校正为正值', () => {
      const result = correctFrequency(3.55, 5, 10, testCable);
      
      expect(result.temperature_correction).toBeGreaterThan(0);
    });

    it('高温下温度校正为负值', () => {
      const result = correctFrequency(3.55, 35, 10, testCable);
      
      expect(result.temperature_correction).toBeLessThan(0);
    });
  });

  describe('detectTemperatureDrift', () => {
    it('检测温度漂移：超过3倍标准差', () => {
      const records = [];
      for (let i = 0; i < 20; i++) {
        records.push({
          record_time: new Date(i * 3600000).toISOString(),
          temperature: 20 + Math.random() * 2
        });
      }
      
      const currentRecord = {
        record_time: new Date(20 * 3600000).toISOString(),
        temperature: 50
      };

      const result = detectTemperatureDrift(records, currentRecord);
      
      expect(result.isDrift).toBe(true);
      expect(result.explanation).toContain('温度漂移');
    });

    it('正常温度波动不判定为漂移', () => {
      const records = [];
      for (let i = 0; i < 20; i++) {
        records.push({
          record_time: new Date(i * 3600000).toISOString(),
          temperature: 20 + Math.random() * 2
        });
      }
      
      const currentRecord = {
        record_time: new Date(20 * 3600000).toISOString(),
        temperature: 21
      };

      const result = detectTemperatureDrift(records, currentRecord);
      
      expect(result.isDrift).toBe(false);
    });

    it('数据不足时不判定漂移', () => {
      const records = [{ record_time: '2026-01-01', temperature: 20 }];
      const currentRecord = { record_time: '2026-01-02', temperature: 50 };

      const result = detectTemperatureDrift(records, currentRecord);
      
      expect(result.isDrift).toBe(false);
      expect(result.explanation).toContain('数据不足');
    });

    it('当前温度为null时不判定漂移', () => {
      const records = [];
      for (let i = 0; i < 10; i++) {
        records.push({
          record_time: new Date(i * 3600000).toISOString(),
          temperature: 20 + Math.random() * 2
        });
      }
      
      const currentRecord = {
        record_time: new Date(10 * 3600000).toISOString(),
        temperature: null
      };

      const result = detectTemperatureDrift(records, currentRecord);
      
      expect(result.isDrift).toBe(false);
    });
  });

  describe('detectSensorBreak', () => {
    it('频率和温度同时缺失判定为传感器断点', () => {
      const result = detectSensorBreak({ frequency: null, temperature: null });
      
      expect(result.isBreak).toBe(true);
      expect(result.explanation).toContain('传感器断点');
    });

    it('仅频率缺失判定为部分故障', () => {
      const result = detectSensorBreak({ frequency: null, temperature: 25 });
      
      expect(result.isBreak).toBe(true);
      expect(result.explanation).toContain('频率');
    });

    it('仅温度缺失判定为部分故障', () => {
      const result = detectSensorBreak({ frequency: 3.5, temperature: null });
      
      expect(result.isBreak).toBe(true);
      expect(result.explanation).toContain('温度');
    });

    it('频率突变超过50%判定为异常', () => {
      const previous = { frequency: 3.5, temperature: 25 };
      const current = { frequency: 1.5, temperature: 25 };

      const result = detectSensorBreak(current, previous);
      
      expect(result.isBreak).toBe(true);
      expect(result.explanation).toContain('频率突变');
    });

    it('正常数据不判定为断点', () => {
      const previous = { frequency: 3.5, temperature: 25 };
      const current = { frequency: 3.52, temperature: 25.5 };

      const result = detectSensorBreak(current, previous);
      
      expect(result.isBreak).toBe(false);
    });
  });

  describe('detectWindMissing', () => {
    it('风速为null判定为缺失', () => {
      const result = detectWindMissing(null);
      
      expect(result.isMissing).toBe(true);
      expect(result.explanation).toContain('风速数据缺失');
    });

    it('风速为undefined判定为缺失', () => {
      const result = detectWindMissing(undefined as any);
      
      expect(result.isMissing).toBe(true);
    });

    it('正常风速不判定为缺失', () => {
      const result = detectWindMissing(10.5);
      
      expect(result.isMissing).toBe(false);
    });

    it('零风速不判定为缺失', () => {
      const result = detectWindMissing(0);
      
      expect(result.isMissing).toBe(false);
    });
  });

  describe('analyzeTrend', () => {
    it('数据不足时返回数据不足提示', () => {
      const current: MonitoringDetail = {
        id: '1',
        temperature_record_id: 'tr-1',
        sensor_id: 's-1',
        record_time: '2026-01-01T10:00:00Z',
        raw_frequency: 3.5,
        raw_temperature: 25,
        wind_speed: 10,
        corrected_frequency: 3.48,
        temperature_correction: -0.0021,
        wind_effect_estimate: 0.018,
        deviation_from_design: -1.14,
        anomaly_score: 10,
        is_anomaly: false,
        status: 'normal',
        import_phase: 2,
        affected_by_cable_archive: false,
        detection_version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      };

      const history: MonitoringDetail[] = [];

      const result = analyzeTrend(current, history);
      
      expect(result.trend).toContain('数据不足');
      expect(result.comparison).toContain('历史数据不足');
    });

    it('频率上升时标记上升趋势', () => {
      const baseTime = new Date('2026-01-01T00:00:00Z');
      const history: MonitoringDetail[] = [];
      
      for (let i = 0; i < 10; i++) {
        history.push({
          id: `h-${i}`,
          temperature_record_id: `tr-${i}`,
          sensor_id: 's-1',
          record_time: new Date(baseTime.getTime() + i * 3600000).toISOString(),
          raw_frequency: 3.4 + i * 0.01,
          raw_temperature: 25,
          wind_speed: 10,
          corrected_frequency: 3.4 + i * 0.01,
          temperature_correction: 0,
          wind_effect_estimate: 0,
          deviation_from_design: 0,
          anomaly_score: 0,
          is_anomaly: false,
          status: 'normal',
          import_phase: 2,
          affected_by_cable_archive: false,
          detection_version: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z'
        });
      }

      const current: MonitoringDetail = {
        ...history[9],
        id: 'current',
        corrected_frequency: 3.6,
        record_time: new Date(baseTime.getTime() + 10 * 3600000).toISOString()
      };

      const result = analyzeTrend(current, history);
      
      expect(result.trend).toBe('上升趋势');
    });

    it('频率下降时标记下降趋势', () => {
      const baseTime = new Date('2026-01-01T00:00:00Z');
      const history: MonitoringDetail[] = [];
      
      for (let i = 0; i < 10; i++) {
        history.push({
          id: `h-${i}`,
          temperature_record_id: `tr-${i}`,
          sensor_id: 's-1',
          record_time: new Date(baseTime.getTime() + i * 3600000).toISOString(),
          raw_frequency: 3.5,
          raw_temperature: 25,
          wind_speed: 10,
          corrected_frequency: 3.5,
          temperature_correction: 0,
          wind_effect_estimate: 0,
          deviation_from_design: 0,
          anomaly_score: 0,
          is_anomaly: false,
          status: 'normal',
          import_phase: 2,
          affected_by_cable_archive: false,
          detection_version: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z'
        });
      }

      const current: MonitoringDetail = {
        ...history[9],
        id: 'current',
        corrected_frequency: 3.3,
        record_time: new Date(baseTime.getTime() + 10 * 3600000).toISOString()
      };

      const result = analyzeTrend(current, history);
      
      expect(result.trend).toBe('下降趋势');
    });

    it('重复调用返回相同结果（确定性）', () => {
      const baseTime = new Date('2026-01-01T00:00:00Z');
      const history: MonitoringDetail[] = [];
      
      for (let i = 0; i < 10; i++) {
        history.push({
          id: `h-${i}`,
          temperature_record_id: `tr-${i}`,
          sensor_id: 's-1',
          record_time: new Date(baseTime.getTime() + i * 3600000).toISOString(),
          raw_frequency: 3.5,
          raw_temperature: 25,
          wind_speed: 10,
          corrected_frequency: 3.5,
          temperature_correction: 0,
          wind_effect_estimate: 0,
          deviation_from_design: 0,
          anomaly_score: 0,
          is_anomaly: false,
          status: 'normal',
          import_phase: 2,
          affected_by_cable_archive: false,
          detection_version: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z'
        });
      }

      const current: MonitoringDetail = {
        ...history[9],
        id: 'current',
        corrected_frequency: 3.3
      };

      const result1 = analyzeTrend(current, history);
      const result2 = analyzeTrend(current, history);
      
      expect(result1).toEqual(result2);
    });
  });
});
