import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type {
  SeatRecord,
  GisPoint,
  MaterialAttachment,
  HistoryEntry,
  ExceptionItem,
} from '../../shared/types.js';

const now = new Date();
const daysAgo = (days: number, hours = 0, minutes = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
};

interface RecordData {
  record: Omit<SeatRecord, 'points' | 'attachments'>;
  points: GisPoint[];
  attachments: MaterialAttachment[];
}

function createMockRecords(): RecordData[] {
  const records: RecordData[] = [];

  const r1Id = uuidv4();
  const r1Batch1 = 'batch-20260616-001';
  const r1Batch2 = 'batch-20260617-002';
  records.push({
    record: {
      id: r1Id,
      code: 'GY-2026-001',
      locationName: '和平街心花园',
      street: '和平里街道',
      status: 'suspected_duplicate',
      materialCompleteness: 85,
      createdAt: daysAgo(2, 3),
      updatedAt: daysAgo(0, 5),
    },
    points: [
      {
        id: uuidv4(),
        lng: 116.4215,
        lat: 39.9528,
        source: 'survey-2026-q2',
        batchId: r1Batch1,
        importedAt: daysAgo(2, 3),
      },
      {
        id: uuidv4(),
        lng: 116.4216,
        lat: 39.9529,
        source: 'community-report',
        batchId: r1Batch2,
        importedAt: daysAgo(1, 8),
      },
    ],
    attachments: [
      {
        id: uuidv4(),
        name: '和平街心花园现场照.jpg',
        type: 'image/jpeg',
        uploadedAt: daysAgo(2, 3),
        batchId: r1Batch1,
        note: '座椅正面拍摄',
      },
      {
        id: uuidv4(),
        name: '和平街心花园测量数据.pdf',
        type: 'application/pdf',
        uploadedAt: daysAgo(2, 3),
        batchId: r1Batch1,
      },
    ],
  });

  const r2Id = uuidv4();
  const r2Batch1 = 'batch-20260616-003';
  const r2Batch2 = 'batch-20260617-004';
  records.push({
    record: {
      id: r2Id,
      code: 'GY-2026-002',
      locationName: '和平社区小公园',
      street: '和平里街道',
      status: 'pending',
      materialCompleteness: 70,
      createdAt: daysAgo(2, 5),
      updatedAt: daysAgo(2, 5),
    },
    points: [
      {
        id: uuidv4(),
        lng: 116.4217,
        lat: 39.9530,
        source: 'survey-2026-q2',
        batchId: r2Batch1,
        importedAt: daysAgo(2, 5),
      },
      {
        id: uuidv4(),
        lng: 116.4218,
        lat: 39.9531,
        source: 'gps-mobile',
        batchId: r2Batch2,
        importedAt: daysAgo(1, 4),
      },
      {
        id: uuidv4(),
        lng: 116.4219,
        lat: 39.9527,
        source: 'gps-mobile',
        batchId: r2Batch2,
        importedAt: daysAgo(1, 4),
      },
    ],
    attachments: [
      {
        id: uuidv4(),
        name: '社区公园现场图.jpg',
        type: 'image/jpeg',
        uploadedAt: daysAgo(2, 5),
        batchId: r2Batch1,
      },
    ],
  });

  const r3Id = uuidv4();
  const r3Batch1 = 'batch-20260615-001';
  const r3Batch2 = 'batch-20260616-005';
  records.push({
    record: {
      id: r3Id,
      code: 'GY-2026-003',
      locationName: '东单公园座椅点',
      street: '东华门街道',
      status: 'approved',
      materialCompleteness: 100,
      latestJudgment: 'approved',
      latestJudgmentReason: '材料完整，坐标准确，符合公示标准',
      latestJudgmentAt: daysAgo(1, 6),
      latestJudgmentBy: '张审核员',
      createdAt: daysAgo(3, 2),
      updatedAt: daysAgo(1, 6),
    },
    points: [
      {
        id: uuidv4(),
        lng: 116.4179,
        lat: 39.9139,
        source: 'official-survey',
        batchId: r3Batch1,
        importedAt: daysAgo(3, 2),
      },
      {
        id: uuidv4(),
        lng: 116.4180,
        lat: 39.9140,
        source: 'official-survey',
        batchId: r3Batch1,
        importedAt: daysAgo(3, 2),
      },
      {
        id: uuidv4(),
        lng: 116.4178,
        lat: 39.9138,
        source: 'community-verify',
        batchId: r3Batch2,
        importedAt: daysAgo(2, 10),
      },
    ],
    attachments: [
      {
        id: uuidv4(),
        name: '东单公园全景.jpg',
        type: 'image/jpeg',
        uploadedAt: daysAgo(3, 2),
        batchId: r3Batch1,
      },
      {
        id: uuidv4(),
        name: '座椅材质检测报告.pdf',
        type: 'application/pdf',
        uploadedAt: daysAgo(3, 2),
        batchId: r3Batch1,
        note: '防腐木材质，符合标准',
      },
      {
        id: uuidv4(),
        name: '复核确认单.pdf',
        type: 'application/pdf',
        uploadedAt: daysAgo(2, 10),
        batchId: r3Batch2,
      },
    ],
  });

  const r4Id = uuidv4();
  const r4Batch1 = 'batch-20260615-002';
  records.push({
    record: {
      id: r4Id,
      code: 'GY-2026-004',
      locationName: '西单文化广场',
      street: '西长安街街道',
      status: 'approved',
      materialCompleteness: 92,
      latestJudgment: 'approved',
      latestJudgmentReason: '核心区点位，所有资料齐全',
      latestJudgmentAt: daysAgo(0, 12),
      latestJudgmentBy: '李主管',
      createdAt: daysAgo(3, 8),
      updatedAt: daysAgo(0, 12),
    },
    points: [
      {
        id: uuidv4(),
        lng: 116.3758,
        lat: 39.9106,
        source: 'official-survey',
        batchId: r4Batch1,
        importedAt: daysAgo(3, 8),
      },
      {
        id: uuidv4(),
        lng: 116.3759,
        lat: 39.9107,
        source: 'official-survey',
        batchId: r4Batch1,
        importedAt: daysAgo(3, 8),
      },
    ],
    attachments: [
      {
        id: uuidv4(),
        name: '西单广场座椅照片.png',
        type: 'image/png',
        uploadedAt: daysAgo(3, 8),
        batchId: r4Batch1,
      },
      {
        id: uuidv4(),
        name: '广场规划图.pdf',
        type: 'application/pdf',
        uploadedAt: daysAgo(3, 8),
        batchId: r4Batch1,
        note: '座椅位置标注清晰',
      },
    ],
  });

  const r5Id = uuidv4();
  const r5Batch1 = 'batch-20260616-006';
  const r5Batch2 = 'batch-20260617-007';
  records.push({
    record: {
      id: r5Id,
      code: 'GY-2026-005',
      locationName: '景山前街小憩区',
      street: '景山街道',
      status: 'exception',
      materialCompleteness: 55,
      latestJudgment: 'exception',
      latestJudgmentReason: '坐标偏移至相邻街道，需重新核实',
      latestJudgmentAt: daysAgo(0, 8),
      latestJudgmentBy: '王审核员',
      createdAt: daysAgo(2, 7),
      updatedAt: daysAgo(0, 8),
    },
    points: [
      {
        id: uuidv4(),
        lng: 116.3974,
        lat: 39.9255,
        source: 'survey-2026-q2',
        batchId: r5Batch1,
        importedAt: daysAgo(2, 7),
        isAbnormal: true,
        abnormalNote: '坐标偏移至景山后街，距离实际位置约200米',
      },
      {
        id: uuidv4(),
        lng: 116.3960,
        lat: 39.9240,
        source: 'community-report',
        batchId: r5Batch2,
        importedAt: daysAgo(1, 3),
        isAbnormal: true,
        abnormalNote: '坐标偏移至五四大街区域',
      },
      {
        id: uuidv4(),
        lng: 116.3968,
        lat: 39.9248,
        source: 'gps-mobile',
        batchId: r5Batch2,
        importedAt: daysAgo(1, 3),
      },
    ],
    attachments: [
      {
        id: uuidv4(),
        name: '景山前街照片.jpg',
        type: 'image/jpeg',
        uploadedAt: daysAgo(2, 7),
        batchId: r5Batch1,
      },
    ],
  });

  const r6Id = uuidv4();
  const r6Batch1 = 'batch-20260616-008';
  records.push({
    record: {
      id: r6Id,
      code: 'GY-2026-006',
      locationName: '朝阳门南小街绿地',
      street: '朝阳门街道',
      status: 'need_evidence',
      materialCompleteness: 40,
      latestJudgment: 'need_evidence',
      latestJudgmentReason: '材料不完整，缺少坐标复核数据和材质证明',
      latestJudgmentAt: daysAgo(0, 4),
      latestJudgmentBy: '张审核员',
      createdAt: daysAgo(2, 10),
      updatedAt: daysAgo(0, 4),
    },
    points: [
      {
        id: uuidv4(),
        lng: 116.4321,
        lat: 39.9225,
        source: 'community-report',
        batchId: r6Batch1,
        importedAt: daysAgo(2, 10),
      },
      {
        id: uuidv4(),
        lng: 116.4322,
        lat: 39.9226,
        source: 'community-report',
        batchId: r6Batch1,
        importedAt: daysAgo(2, 10),
      },
    ],
    attachments: [
      {
        id: uuidv4(),
        name: '绿地现场图.jpg',
        type: 'image/jpeg',
        uploadedAt: daysAgo(2, 10),
        batchId: r6Batch1,
        note: '仅一张远景图',
      },
    ],
  });

  const r7Id = uuidv4();
  const r7Batch1 = 'batch-20260617-009';
  const r7Batch2 = 'batch-20260618-010';
  records.push({
    record: {
      id: r7Id,
      code: 'GY-2026-007',
      locationName: '北河沿大街口袋公园',
      street: '东华门街道',
      status: 'pending',
      materialCompleteness: 78,
      createdAt: daysAgo(1, 6),
      updatedAt: daysAgo(0, 2),
    },
    points: [
      {
        id: uuidv4(),
        lng: 116.4189,
        lat: 39.9245,
        source: 'survey-2026-q2',
        batchId: r7Batch1,
        importedAt: daysAgo(1, 6),
      },
      {
        id: uuidv4(),
        lng: 116.4190,
        lat: 39.9246,
        source: 'gps-mobile',
        batchId: r7Batch2,
        importedAt: daysAgo(0, 2),
      },
      {
        id: uuidv4(),
        lng: 116.4188,
        lat: 39.9244,
        source: 'gps-mobile',
        batchId: r7Batch2,
        importedAt: daysAgo(0, 2),
      },
      {
        id: uuidv4(),
        lng: 116.4191,
        lat: 39.9243,
        source: 'gps-mobile',
        batchId: r7Batch2,
        importedAt: daysAgo(0, 2),
      },
    ],
    attachments: [
      {
        id: uuidv4(),
        name: '口袋公园实景.jpg',
        type: 'image/jpeg',
        uploadedAt: daysAgo(1, 6),
        batchId: r7Batch1,
      },
      {
        id: uuidv4(),
        name: '补充测量图.png',
        type: 'image/png',
        uploadedAt: daysAgo(0, 2),
        batchId: r7Batch2,
      },
    ],
  });

  const r8Id = uuidv4();
  const r8Batch1 = 'batch-20260617-011';
  records.push({
    record: {
      id: r8Id,
      code: 'GY-2026-008',
      locationName: '美术馆东街休闲区',
      street: '景山街道',
      status: 'pending',
      materialCompleteness: 65,
      createdAt: daysAgo(1, 10),
      updatedAt: daysAgo(1, 10),
    },
    points: [
      {
        id: uuidv4(),
        lng: 116.4156,
        lat: 39.9278,
        source: 'survey-2026-q2',
        batchId: r8Batch1,
        importedAt: daysAgo(1, 10),
      },
      {
        id: uuidv4(),
        lng: 116.4157,
        lat: 39.9279,
        source: 'survey-2026-q2',
        batchId: r8Batch1,
        importedAt: daysAgo(1, 10),
      },
    ],
    attachments: [
      {
        id: uuidv4(),
        name: '休闲区座椅照片.jpg',
        type: 'image/jpeg',
        uploadedAt: daysAgo(1, 10),
        batchId: r8Batch1,
      },
      {
        id: uuidv4(),
        name: '美术馆区域说明.pdf',
        type: 'application/pdf',
        uploadedAt: daysAgo(1, 10),
        batchId: r8Batch1,
      },
      {
        id: uuidv4(),
        name: '初步核查记录.docx',
        type: 'application/docx',
        uploadedAt: daysAgo(1, 10),
        batchId: r8Batch1,
        note: '等待街道复核',
      },
    ],
  });

  return records;
}

function createMockHistories(records: RecordData[]): HistoryEntry[] {
  const histories: HistoryEntry[] = [];

  const r1 = records[0].record;
  histories.push({
    id: uuidv4(),
    recordId: r1.id,
    operationType: 'create',
    operator: '系统导入',
    operatedAt: r1.createdAt,
    beforeState: null,
    afterState: { status: r1.status, locationName: r1.locationName },
    note: '材料批量导入创建记录',
  });
  histories.push({
    id: uuidv4(),
    recordId: r1.id,
    operationType: 'exception_detected',
    operator: '异常检测引擎',
    operatedAt: daysAgo(0, 5),
    beforeState: { status: 'pending' },
    afterState: { status: 'suspected_duplicate' },
    note: '检测到与"和平社区小公园"坐标距离仅约28米，疑似同地异名',
  });

  const r3 = records[2].record;
  histories.push({
    id: uuidv4(),
    recordId: r3.id,
    operationType: 'create',
    operator: '系统导入',
    operatedAt: r3.createdAt,
    beforeState: null,
    afterState: { status: 'pending' },
    note: '材料批量导入创建记录',
  });
  histories.push({
    id: uuidv4(),
    recordId: r3.id,
    operationType: 'judgment_change',
    operator: r3.latestJudgmentBy!,
    operatedAt: r3.latestJudgmentAt!,
    beforeState: { status: 'pending' },
    afterState: { status: 'approved' },
    note: r3.latestJudgmentReason,
  });

  const r5 = records[4].record;
  histories.push({
    id: uuidv4(),
    recordId: r5.id,
    operationType: 'create',
    operator: '系统导入',
    operatedAt: r5.createdAt,
    beforeState: null,
    afterState: { status: 'pending' },
    note: '材料批量导入创建记录',
  });
  histories.push({
    id: uuidv4(),
    recordId: r5.id,
    operationType: 'exception_detected',
    operator: '异常检测引擎',
    operatedAt: daysAgo(1, 2),
    beforeState: { status: 'pending' },
    afterState: { status: 'pending' },
    note: '检测到GIS坐标偏移异常，点位偏离景山前街基准范围',
  });
  histories.push({
    id: uuidv4(),
    recordId: r5.id,
    operationType: 'judgment_change',
    operator: r5.latestJudgmentBy!,
    operatedAt: r5.latestJudgmentAt!,
    beforeState: { status: 'pending' },
    afterState: { status: 'exception' },
    note: r5.latestJudgmentReason,
  });

  return histories;
}

function createMockExceptions(records: RecordData[]): ExceptionItem[] {
  const r1 = records[0].record;
  const r2 = records[1].record;
  const r5 = records[4].record;
  const r8 = records[7].record;

  return [
    {
      id: uuidv4(),
      type: 'duplicate_location',
      relatedRecordIds: [r1.id, r2.id],
      detectedAt: daysAgo(0, 5),
      status: 'open',
      description: '疑似同地异名："和平街心花园"与"和平社区小公园"坐标距离仅约28米，可能为同一地点',
      comparisonData: {
        before: { id: r1.id, locationName: r1.locationName, lng: 116.4215, lat: 39.9528 },
        after: { id: r2.id, locationName: r2.locationName, lng: 116.4217, lat: 39.9530 },
        changedFields: ['locationName'],
      },
    },
    {
      id: uuidv4(),
      type: 'coordinate_offset',
      relatedRecordIds: [r5.id],
      detectedAt: daysAgo(1, 2),
      status: 'open',
      description: '坐标偏移：景山前街小憩区的GIS点位偏移至景山后街和五四大街区域，超出街道基准范围约200米',
      comparisonData: {
        before: { expectedStreet: '景山街道', expectedRange: '景山前街沿线' },
        after: { actualLng: 116.3974, actualLat: 39.9255, actualStreet: '景山后街' },
      },
    },
    {
      id: uuidv4(),
      type: 'late_attachment',
      relatedRecordIds: [r8.id],
      detectedAt: daysAgo(0, 1),
      status: 'reviewed',
      description: '晚到附件：美术馆东街休闲区有一批附件在记录创建后24小时以上补录，需确认完整性',
      comparisonData: {
        before: { attachmentsCount: 2 },
        after: { attachmentsCount: 3, lateAttachment: '初步核查记录.docx' },
      },
      resolvedNote: '已核实为街道办补送的正式复核文件',
      resolvedAt: daysAgo(0, 0, 30),
    },
  ];
}

export function initMockData(db: Database.Database): void {
  const records = createMockRecords();
  const histories = createMockHistories(records);
  const exceptions = createMockExceptions(records);

  const insertRecord = db.prepare(`
    INSERT INTO seat_record (
      id, code, location_name, street, status, material_completeness,
      latest_judgment, latest_judgment_reason, latest_judgment_at, latest_judgment_by,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPoint = db.prepare(`
    INSERT INTO gis_point (
      id, record_id, lng, lat, source, batch_id, imported_at,
      is_abnormal, abnormal_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAttachment = db.prepare(`
    INSERT INTO material_attachment (
      id, record_id, name, type, uploaded_at, batch_id, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO history_entry (
      id, record_id, operation_type, operator, operated_at,
      before_state, after_state, note, evidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertException = db.prepare(`
    INSERT INTO exception_item (
      id, type, related_record_ids, detected_at, status, description,
      comparison_data, resolved_note, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const rd of records) {
      insertRecord.run(
        rd.record.id,
        rd.record.code,
        rd.record.locationName,
        rd.record.street,
        rd.record.status,
        rd.record.materialCompleteness,
        rd.record.latestJudgment ?? null,
        rd.record.latestJudgmentReason ?? null,
        rd.record.latestJudgmentAt ?? null,
        rd.record.latestJudgmentBy ?? null,
        rd.record.createdAt,
        rd.record.updatedAt,
      );

      for (const p of rd.points) {
        insertPoint.run(
          p.id,
          rd.record.id,
          p.lng,
          p.lat,
          p.source,
          p.batchId,
          p.importedAt,
          p.isAbnormal ? 1 : 0,
          p.abnormalNote ?? null,
        );
      }

      for (const a of rd.attachments) {
        insertAttachment.run(
          a.id,
          rd.record.id,
          a.name,
          a.type,
          a.uploadedAt,
          a.batchId,
          a.note ?? null,
        );
      }
    }

    for (const h of histories) {
      insertHistory.run(
        h.id,
        h.recordId,
        h.operationType,
        h.operator,
        h.operatedAt,
        h.beforeState !== undefined && h.beforeState !== null ? JSON.stringify(h.beforeState) : null,
        h.afterState !== undefined && h.afterState !== null ? JSON.stringify(h.afterState) : null,
        h.note ?? null,
        h.evidence ?? null,
      );
    }

    for (const e of exceptions) {
      insertException.run(
        e.id,
        e.type,
        JSON.stringify(e.relatedRecordIds),
        e.detectedAt,
        e.status,
        e.description,
        e.comparisonData ? JSON.stringify(e.comparisonData) : null,
        e.resolvedNote ?? null,
        e.resolvedAt ?? null,
      );
    }
  });

  tx();
}

export default initMockData;
