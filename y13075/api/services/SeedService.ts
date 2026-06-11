import type { SensorRecord, Anomaly, DetectionReason } from '../../shared/types.js';

function pad(n: number, len = 2) {
  return String(n).padStart(len, '0');
}

export interface SeedData {
  records: SensorRecord[];
  anomalies: Anomaly[];
}

const MOCK_FILE_NAME = 'dc_sensors_2026Q2.csv';
const IMPORT_TIME = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

function temp(base: number, jitter = 1.2) {
  return +(base + (Math.random() - 0.5) * jitter * 2).toFixed(1);
}

function hum(base: number, jitter = 4) {
  return +(base + (Math.random() - 0.5) * jitter * 2).toFixed(0);
}

export function generateSeed(): SeedData {
  const records: SensorRecord[] = [];
  let lineNo = 1; // header = 1

  // A 区：3 行 × 12 列
  const zones = [
    { prefix: 'A', rows: 3, cols: 12, tBase: 23.5, hBase: 48 },
    { prefix: 'B', rows: 2, cols: 10, tBase: 24.2, hBase: 46 },
  ];

  let recIndex = 0;

  for (const zone of zones) {
    for (let r = 1; r <= zone.rows; r++) {
      for (let c = 1; c <= zone.cols; c++) {
        recIndex++;
        lineNo++;
        const pointId = `${zone.prefix}-${pad(r)}-${pad(c)}`;
        const rawVals: Record<string, any> = {
          '区域编号': zone.prefix,
          '点位编号': pointId,
          '行号': String(r),
          '列号': String(c),
          '温度(℃)': '',
          '湿度(%)': '',
          '采集时间': IMPORT_TIME,
          '采集器SN': `SNS${pad(recIndex, 5)}`,
        };

        let temperature: number | null = temp(zone.tBase);
        let humidity: number | null = hum(zone.hBase);
        let is_dirty = false;
        let dirty_reason: string | undefined;

        // 故意制造脏数据 / 缺失值
        if (pointId === 'A-01-05') {
          // 缺失温度
          temperature = null;
          rawVals['温度(℃)'] = 'N/A';
          is_dirty = true;
          dirty_reason = '温度字段缺失（原始值为 N/A）';
        } else if (pointId === 'B-02-08') {
          // 湿度格式异常（字符串）
          rawVals['湿度(%)'] = '异常';
          humidity = null;
          is_dirty = true;
          dirty_reason = '湿度格式异常（非数字）';
        } else {
          rawVals['温度(℃)'] = String(temperature);
          rawVals['湿度(%)'] = String(humidity);
        }

        // B-01-06 故意大温差（与 A-01-07 相邻检测无关，留作区域温差）
        if (pointId === 'A-01-08') {
          temperature = 32.1;
          rawVals['温度(℃)'] = '32.1';
        }

        records.push({
          id: `rec_${pad(recIndex, 4)}`,
          point_id: pointId,
          row: r,
          col: c,
          temperature,
          humidity,
          raw_source: {
            file_name: MOCK_FILE_NAME,
            import_time: IMPORT_TIME,
            line_number: lineNo,
            raw_values: rawVals,
          },
          is_dirty,
          dirty_reason,
        });
      }
    }
  }

  // 制造编号缺口：删除 A-01-04（col=4），制造 gap
  const idxA104 = records.findIndex(r => r.point_id === 'A-01-04');
  if (idxA104 >= 0) records.splice(idxA104, 1);

  // 制造重复编号：添加一条重复的 A-02-03
  const orig = records.find(r => r.point_id === 'A-02-03')!;
  const dup: SensorRecord = {
    ...orig,
    id: `rec_dup_001`,
    temperature: 26.7,
    humidity: 52,
    raw_source: {
      ...orig.raw_source,
      line_number: 999,
      file_name: 'dc_sensors_extra.csv',
      import_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      raw_values: {
        ...orig.raw_source.raw_values,
        '温度(℃)': '26.7',
        '湿度(%)': '52',
        '备注': '重复采集',
      }
    },
    is_dirty: false,
  };
  records.push(dup);

  // 预生成异常（基于上述故意制造的问题）
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();

  // 1) A-01-05 数值缺失
  const recMissing = records.find(r => r.point_id === 'A-01-05')!;
  anomalies.push(makeAnomaly(
    'anm_001', recMissing,
    { type: 'missing_value', description: '温度字段缺失，原始值为 N/A', detail: { field: 'temperature', raw_value: 'N/A' } },
    ['A-01-04', 'A-01-05', 'A-01-06'],
    now,
  ));

  // 2) A-01-08 温差过大（与邻点）
  const recTemp = records.find(r => r.point_id === 'A-01-08')!;
  anomalies.push(makeAnomaly(
    'anm_002', recTemp,
    { type: 'temp_delta', description: '与左邻点 A-01-07 温差 8.3℃，超出阈值 5℃', detail: { delta: 8.3, threshold: 5, neighbor: 'A-01-07' } },
    ['A-01-06', 'A-01-07', 'A-01-08', 'A-01-09'],
    now,
  ));

  // 3) A-01 行编号缺口（缺 04）
  const recGap = records.find(r => r.point_id === 'A-01-03')!;
  anomalies.push(makeAnomaly(
    'anm_003', recGap,
    { type: 'gap', description: '同一行 A-01 中列号不连续（A-01-03 之后是 A-01-05，缺 04）', detail: { missing_cols: [4] } },
    ['A-01-02', 'A-01-03', 'A-01-05', 'A-00-06'],
    now,
  ));

  // 4) A-02-03 重复编号
  anomalies.push(makeAnomaly(
    'anm_004', orig,
    { type: 'duplicate', description: `点位编号 A-02-03 出现 ${2} 条记录（来自不同文件）`, detail: { count: 2, file_1: MOCK_FILE_NAME, file_2: 'dc_sensors_extra.csv' } },
    ['A-02-02', 'A-02-03', 'A-02-04'],
    now,
  ));

  return { records, anomalies };
}

function makeAnomaly(
  id: string,
  record: SensorRecord,
  reason: DetectionReason,
  affected: string[],
  now: string,
): Anomaly {
  return {
    id,
    sensor_record_id: record.id,
    point_id: record.point_id,
    status: 'pending',
    detection_reason: reason,
    affected_points: affected,
    remark: '',
    operation_logs: [
      { time: now, action: 'create', operator: 'system', detail: `自动检测：${reason.type}` },
    ],
    created_at: now,
    updated_at: now,
  };
}
