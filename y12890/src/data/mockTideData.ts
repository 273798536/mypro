import { TideRecord, TideUnit } from '../types/tide';
import { DataStatus } from '../types/common';
import { MONITORING_POINTS } from './mockMapData';

function generateId(prefix: string, i: number): string {
  return `${prefix}_${String(i).padStart(3, '0')}`;
}

export function generateMockTideData(taskId: string): TideRecord[] {
  const records: TideRecord[] = [];
  const startDate = new Date('2026-06-01T00:00:00');
  const mainPoint = MONITORING_POINTS[0];

  for (let i = 0; i < 72; i++) {
    const time = new Date(startDate.getTime() + i * 3600 * 1000);
    const phase = (i / 12.42) * Math.PI * 2;
    const m2Tide = 1.2 * Math.sin(phase);
    const s2Tide = 0.5 * Math.sin((i / 12) * Math.PI * 2);
    const noise = (Math.random() - 0.5) * 0.1;
    let tideLevel = Math.round((1.0 + m2Tide + s2Tide + noise) * 100) / 100;

    if (tideLevel < 0) tideLevel = 0;
    if (tideLevel > 3) tideLevel = 2.9;

    let timezone = 'Asia/Shanghai';
    let unit: TideUnit = TideUnit.METER;
    let status: DataStatus = DataStatus.AVAILABLE;
    let note: string | undefined = undefined;
    let isDuplicate = false;
    let duplicateOf: string | undefined = undefined;

    if (i === 10) tideLevel = null as unknown as number;
    if (i === 25) tideLevel = null as unknown as number;
    if (i === 48) tideLevel = null as unknown as number;

    if (i === 15) {
      timezone = 'Asia/Tokyo';
    }

    if (i === 30) {
      isDuplicate = true;
      duplicateOf = generateId('tide', 29);
    }

    if (i === 55) {
      note = '可能有误差？待确认';
    }

    if (i === 35) {
      tideLevel = 5.5;
    }

    if (i === 10 || i === 25 || i === 48) status = DataStatus.PENDING;
    if (i === 15) status = DataStatus.PENDING;
    if (i === 30) status = DataStatus.PENDING;
    if (i === 35) status = DataStatus.RECOLLECT;
    if (i === 55) status = DataStatus.NEED_REVIEW;

    records.push({
      id: generateId('tide', i),
      taskId,
      pointId: mainPoint.id,
      recordTime: time,
      tideLevel,
      unit,
      timezone,
      originalTimezone: timezone,
      source: '水下机器人压力传感器',
      status,
      note,
      isDuplicate,
      duplicateOf,
    });
  }

  records.push({
    id: generateId('tide', 72),
    taskId,
    pointId: MONITORING_POINTS[5].id,
    recordTime: new Date('2026-06-03T14:00:00'),
    tideLevel: records.find(r => r.id === generateId('tide', 62))?.tideLevel ?? 1.5,
    unit: TideUnit.METER,
    timezone: 'Asia/Shanghai',
    originalTimezone: 'Asia/Shanghai',
    source: '水下机器人压力传感器',
    status: DataStatus.PENDING,
    isDuplicate: true,
    duplicateOf: generateId('tide', 62),
  });

  return records;
}

export const MOCK_TIDE_DATA = generateMockTideData('task_001');
