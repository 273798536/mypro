import type { MotorTorqueRecord, TorqueUnit } from '../types';

function generateId(): string {
  return `REC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const DEVICE_NAMES = [
  '电机A-1号', '电机B-2号', '电机C-3号', '电机A-1号',
  '电机D-4号', '电机E-5号', '电机B-2号', '电机F-6号',
  '电机G-7号', '电机H-8号', '电机C-3号', '电机I-9号'
];

const DEVICE_IDS = [
  'DEV001', 'DEV002', 'DEV003', 'DEV001',
  'DEV004', 'DEV005', 'DEV002', 'DEV006',
  'DEV007', 'DEV008', 'DEV003', 'DEV009'
];

const MAINTENANCE_NOTES = [
  '正常运行，无异常',
  '扭矩偏高，需关注轴承磨损情况',
  '振动明显，建议停机检查',
  '#######',
  '温度过高，冷却系统异常',
  '',
  '@@@###$$$',
  '定期维护记录，运行状态良好',
  '异常噪音，可能齿轮磨损',
  '   ',
  '更换润滑油后恢复正常',
  '电流波动，检查电源稳定性',
  '!!!警告：扭矩过载!!!',
  '正常，已校准',
  '数据缺失，待补录'
];

const UNITS: TorqueUnit[] = ['N·m', 'kg·m', 'lb·ft'];

export function generateMockData(count: number = 50): MotorTorqueRecord[] {
  const records: MotorTorqueRecord[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const deviceIndex = i % DEVICE_IDS.length;
    const timestamp = now - (count - i) * 3600000;

    let torqueValue = 100 + Math.random() * 200;
    const isExtreme = Math.random() < 0.1;
    if (isExtreme) {
      torqueValue = Math.random() < 0.5
        ? 5 + Math.random() * 10
        : 450 + Math.random() * 200;
    }

    const unit = UNITS[Math.floor(Math.random() * UNITS.length)];
    const ratedTorque = 300;

    records.push({
      id: generateId(),
      timestamp: new Date(timestamp).toISOString(),
      device_id: DEVICE_IDS[deviceIndex],
      device_name: DEVICE_NAMES[deviceIndex],
      torque_value: Number(torqueValue.toFixed(2)),
      torque_unit: unit,
      rated_torque: ratedTorque,
      speed: Number((1000 + Math.random() * 2000).toFixed(0)),
      current: Number((5 + Math.random() * 20).toFixed(2)),
      temperature: Number((25 + Math.random() * 50).toFixed(1)),
      maintenance_note_raw: MAINTENANCE_NOTES[i % MAINTENANCE_NOTES.length],
      is_data_dirty: false,
      is_device_duplicate: false,
      is_outlier: false,
      data_source: Math.random() < 0.7 ? 'auto_import' : 'manual',
      created_at: new Date(timestamp + 60000).toISOString(),
      tags: isExtreme ? ['异常', '需检查'] : ['正常']
    });
  }

  return records;
}

export function importFromJson(jsonString: string): MotorTorqueRecord[] {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) {
      throw new Error('数据格式错误：需要数组格式');
    }
    return data.map((item: unknown, index: number) => ({
      id: (item as MotorTorqueRecord).id || generateId(),
      timestamp: (item as MotorTorqueRecord).timestamp || new Date().toISOString(),
      device_id: (item as MotorTorqueRecord).device_id || `UNKNOWN_${index}`,
      device_name: (item as MotorTorqueRecord).device_name || '未知设备',
      torque_value: Number((item as MotorTorqueRecord).torque_value) || 0,
      torque_unit: ((item as MotorTorqueRecord).torque_unit as TorqueUnit) || 'N·m',
      rated_torque: Number((item as MotorTorqueRecord).rated_torque) || 300,
      speed: Number((item as MotorTorqueRecord).speed) || 0,
      current: Number((item as MotorTorqueRecord).current) || 0,
      temperature: Number((item as MotorTorqueRecord).temperature) || 0,
      maintenance_note_raw: (item as MotorTorqueRecord).maintenance_note_raw || '',
      is_data_dirty: false,
      is_device_duplicate: false,
      is_outlier: false,
      data_source: (item as MotorTorqueRecord).data_source || 'manual',
      created_at: (item as MotorTorqueRecord).created_at || new Date().toISOString(),
      tags: (item as MotorTorqueRecord).tags || []
    }));
  } catch (error) {
    throw new Error(`导入失败：${(error as Error).message}`);
  }
}
