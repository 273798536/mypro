import { v4 as uuidv4 } from 'uuid';
import db from './db';
import type { RecordStatus } from './types';

interface MockRecord {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceX: number;
  deviceY: number;
  deviceZ: number;
  operator: string;
  status: RecordStatus;
  pointCount: number;
  normalDeviation: number;
  occlusionReason: string | null;
  occlusionDetected: number;
  occlusionSeverity: string | null;
  occlusionAffectedArea: string | null;
  occlusionDeviceRelation: string | null;
  createdAt: string;
  updatedAt: string;
}

function generateRandomPoint(): { x: number; y: number; z: number } {
  return {
    x: Math.round((Math.random() * 200 - 100) * 100) / 100,
    y: Math.round((Math.random() * 200 - 100) * 100) / 100,
    z: Math.round((Math.random() * 200 - 100) * 100) / 100,
  };
}

function generateRandomSliceData(): number[] {
  const data: number[] = [];
  for (let i = 0; i < 100; i++) {
    data.push(Math.round(Math.random() * 255));
  }
  return data;
}

export function seedDatabase() {
  const now = new Date().toISOString();
  const statuses: RecordStatus[] = ['passed', 'failed', 'review', 'pending', 'passed'];
  const deviceIds = ['DEV-001', 'DEV-002', 'DEV-003', 'DEV-001', 'DEV-002'];

  const insertRecordSql = `
    INSERT INTO normal_records (id, timestamp, device_id, device_x, device_y, device_z, operator, status, point_count, normal_deviation, occlusion_reason, occlusion_detected, occlusion_severity, occlusion_affected_area, occlusion_device_relation, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const insertVectorSql = `
    INSERT INTO normal_vectors (id, record_id, pos_x, pos_y, pos_z, dir_x, dir_y, dir_z, deviation, is_valid, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const insertScreenshotSql = `
    INSERT INTO screenshots (id, record_id, "order", url, timestamp, annotation, has_issue)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const insertSliceSql = `
    INSERT INTO point_cloud_slices (id, record_id, slice_index, data, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `;

  const insertHistorySql = `
    INSERT INTO history_items (id, record_id, action, user_id, user_name, version, timestamp, details, snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.exec('BEGIN TRANSACTION');

  try {
    const records: MockRecord[] = [];
    const operators = ['张工程师', '王技术员', '赵操作员', '李审核员', '陈检测员'];

    for (let i = 0; i < 5; i++) {
      const recordTime = new Date(Date.now() - (4 - i) * 3600000).toISOString();
      const coords = generateRandomPoint();
      const status = statuses[i];

      let normalDeviation = 0;
      let occlusionDetected = 0;
      let occlusionSeverity: string | null = null;
      let occlusionReason: string | null = null;
      let occlusionAffectedArea: string | null = null;
      let occlusionDeviceRelation: string | null = null;

      if (status === 'passed') {
        normalDeviation = Math.round((3 + Math.random() * 5) * 100) / 100;
      } else if (status === 'review') {
        normalDeviation = Math.round((10 + Math.random() * 8) * 100) / 100;
        occlusionDetected = 1;
        occlusionSeverity = 'medium';
        occlusionReason = '曲面边缘存在轻微透明区域反光，法线方向在局部有轻微偏移。需要人工复核确认是否影响整体评估。';
        occlusionDeviceRelation = '设备坐标靠近透明区域边界，存在误读风险。';
      } else if (status === 'failed') {
        normalDeviation = Math.round((20 + Math.random() * 15) * 100) / 100;
        occlusionDetected = 1;
        occlusionSeverity = 'high';
        occlusionReason = '透明材质反光导致法线计算出现明显偏差，在曲面拐角处产生误判。设备采集时光源角度不当，造成高光区域法线反转。';
        occlusionAffectedArea = JSON.stringify({ x: 120, y: 85, width: 200, height: 150 });
        occlusionDeviceRelation = '设备坐标处于已知的透明区域采集带，与预设的高风险区域重叠度达 78%';
      }

      const record: MockRecord = {
        id: uuidv4(),
        timestamp: recordTime,
        deviceId: deviceIds[i],
        deviceX: coords.x,
        deviceY: coords.y,
        deviceZ: coords.z,
        operator: operators[i],
        status: status,
        pointCount: 12000 + Math.floor(Math.random() * 13000),
        normalDeviation: normalDeviation,
        occlusionReason: occlusionReason,
        occlusionDetected: occlusionDetected,
        occlusionSeverity: occlusionSeverity,
        occlusionAffectedArea: occlusionAffectedArea,
        occlusionDeviceRelation: occlusionDeviceRelation,
        createdAt: recordTime,
        updatedAt: recordTime,
      };
      records.push(record);

      db.run(insertRecordSql, [
        record.id,
        record.timestamp,
        record.deviceId,
        record.deviceX,
        record.deviceY,
        record.deviceZ,
        record.operator,
        record.status,
        record.pointCount,
        record.normalDeviation,
        record.occlusionReason,
        record.occlusionDetected,
        record.occlusionSeverity,
        record.occlusionAffectedArea,
        record.occlusionDeviceRelation,
        record.createdAt,
        record.updatedAt,
      ]);

      const vectorCount = 3 + Math.floor(Math.random() * 3);
      for (let v = 0; v < vectorCount; v++) {
        const pos = generateRandomPoint();
        const dir = generateRandomPoint();
        db.run(insertVectorSql, [
          uuidv4(),
          record.id,
          pos.x,
          pos.y,
          pos.z,
          dir.x,
          dir.y,
          dir.z,
          Math.round(Math.random() * 100) / 100,
          v < vectorCount - 1 ? 1 : (statuses[i] === 'failed' ? 0 : 1),
          v < vectorCount - 1 ? '法向量检测正常' : (statuses[i] === 'failed' ? '检测到偏差超出阈值' : '法向量检测正常'),
        ]);
      }

      for (let s = 0; s < 3; s++) {
        const hasIssue = (status === 'failed' || status === 'review') && s === 1 ? 1 : 0;
        db.run(insertScreenshotSql, [
          uuidv4(),
          record.id,
          s + 1,
          `https://picsum.photos/seed/${record.id.slice(0, 8)}-${s}/800/600`,
          new Date(Date.parse(recordTime) + s * 1000).toISOString(),
          s === 1 ? '关键检测区域截图' : null,
          hasIssue,
        ]);
      }

      for (let sl = 0; sl < 5; sl++) {
        db.run(insertSliceSql, [
          uuidv4(),
          record.id,
          sl,
          JSON.stringify(generateRandomSliceData()),
          new Date(Date.parse(recordTime) + sl * 2000).toISOString(),
        ]);
      }

      const snapshotRecord = {
        id: record.id,
        timestamp: record.timestamp,
        deviceId: record.deviceId,
        deviceCoordinates: { x: record.deviceX, y: record.deviceY, z: record.deviceZ },
        operator: record.operator,
        status: record.status,
        pointCount: record.pointCount,
        normalDeviation: record.normalDeviation,
        normalData: [],
        occlusionReason: record.occlusionReason,
        occlusion: {
          detected: record.occlusionDetected === 1,
          reason: record.occlusionReason,
          severity: record.occlusionSeverity,
          affectedArea: record.occlusionAffectedArea ? JSON.parse(record.occlusionAffectedArea) : null,
          deviceCoordinateRelation: record.occlusionDeviceRelation,
        },
        screenshots: [],
        pointCloudSlices: [],
        history: [],
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };

      db.run(insertHistorySql, [
        uuidv4(),
        record.id,
        'created',
        'system',
        '系统',
        'v1.0',
        record.createdAt,
        '记录创建完成',
        JSON.stringify(snapshotRecord),
      ]);

      if (status !== 'pending') {
        db.run(insertHistorySql, [
          uuidv4(),
          record.id,
          status === 'passed' ? 'approved' : (status === 'failed' ? 'rejected' : 'review_requested'),
          'user-001',
          operators[i],
          'v1.1',
          new Date(Date.parse(recordTime) + 60000).toISOString(),
          status === 'passed' ? '审核通过' : (status === 'failed' ? '审核不通过' : '请求人工复核'),
          JSON.stringify(snapshotRecord),
        ]);
      }
    }

    db.exec('COMMIT');
    console.log('Database seeded successfully with 5 mock records.');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error('Failed to seed database:', e);
    throw e;
  }
}
